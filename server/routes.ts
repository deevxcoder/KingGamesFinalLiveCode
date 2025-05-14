import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, requireRole } from "./auth";
import { storage } from "./storage";
import { db } from "./db";
import { z } from "zod";

import { 
  GameOutcome, 
  GameType,
  MarketType, 
  SatamatkaGameMode,
  TeamMatchResult,
  MatchCategory,
  insertGameSchema, 
  insertTransactionSchema, 
  insertSatamatkaMarketSchema,
  insertTeamMatchSchema,
  UserRole,
  games
} from "@shared/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import * as schema from "@shared/schema";
import { setupWalletRoutes, setupDepositCommissions } from "./wallet-system";
import { setupUploadRoutes } from "./upload-routes";
import { setupDepositCommissionEndpoints } from "./deposit-commission-endpoint";
import depositDiscountRouter from "./deposit-discount-endpoint";
import cricketTossRoutes from "./cricket-toss-api";
import resetSystemRoutes from "./reset-system";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Setup wallet routes for deposits and withdrawals
  setupWalletRoutes(app);
  
  // Setup deposit commission management routes
  setupDepositCommissions(app);
  
  // Setup file upload routes
  setupUploadRoutes(app);
  
  // Setup deposit commission endpoint for specific subadmin
  setupDepositCommissionEndpoints(app);
  
  // Setup reset system routes
  app.use("/api/admin", resetSystemRoutes);
  
  // Setup cricket toss routes - registered later in the file
  // (see line ~3277 where it's properly registered)
  
  // Endpoint to manually seed demo Satamatka markets
  app.post("/api/admin/seed-satamatka-markets", requireRole(UserRole.ADMIN), async (req, res, next) => {
    try {
      await storage.seedDemoSatamatkaMarkets();
      res.status(200).json({ message: "Demo Satamatka markets seeded successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Game routes
  app.post("/api/games", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (req.user!.isBlocked) {
        return res.status(403).json({ message: "Your account is blocked" });
      }

      const gameData = insertGameSchema.parse({
        userId: req.user!.id,
        gameType: req.body.gameType || GameType.COIN_FLIP,
        betAmount: req.body.betAmount,
        prediction: req.body.prediction,
        result: req.body.result,
        payout: req.body.payout,
        marketId: req.body.marketId,
        gameMode: req.body.gameMode,
      });

      // Verify user has enough balance
      const user = await storage.getUser(req.user!.id);
      if (!user || user.balance < gameData.betAmount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Update user balance based on the payout
      const newBalance = user.balance - gameData.betAmount + gameData.payout;
      await storage.updateUserBalance(user.id, newBalance);

      // Record the game
      const game = await storage.createGame(gameData);
      res.status(201).json(game);
    } catch (err) {
      next(err);
    }
  });

  // Helper function to format game type for display
function formatGameType(gameType: string): string {
  switch(gameType) {
    case 'coin_flip': return 'Coin Flip';
    case 'satamatka': return 'Satamatka';
    case 'team_match': return 'Team Match';
    case 'cricket_toss': return 'Cricket Toss';
    default: return gameType.replace(/_/g, ' ');
  }
}

// New endpoint to get top winners from all games
app.get("/api/games/top-winners", async (req, res, next) => {
  try {
    // This endpoint is public - no authentication required
    
    // Query games with positive payouts and join with user data
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const games = await db.query.games.findMany({
      where: (games, { gt }) => gt(games.payout, 0),
      with: {
        user: {
          columns: {
            username: true
          }
        }
      },
      orderBy: (games, { desc }) => [desc(games.payout)],
      limit
    });
    
    // Transform into the expected format for the client
    const winners = games.map(game => ({
      id: game.id,
      username: game.user.username,
      game: formatGameType(game.gameType),
      amount: game.betAmount,
      payout: game.payout,
      createdAt: game.createdAt
    }));
    
    res.json(winners);
  } catch (err) {
    next(err);
  }
});

// Endpoint to get leaderboard data
app.get("/api/leaderboard", async (req, res, next) => {
  try {
    // This endpoint is public - no authentication required
    
    // Get query parameters
    const timeFrame = req.query.timeFrame as string || 'all-time';
    const sortBy = req.query.sortBy as string || 'totalWinnings';
    const gameType = req.query.gameType as string || null;
    
    // Define time range based on timeFrame
    let startDate: Date | null = null;
    const now = new Date();
    
    if (timeFrame === 'today') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (timeFrame === 'this-week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
    } else if (timeFrame === 'this-month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    // Get all games with appropriate filters
    let gamesQuery = db.select({
      userId: schema.games.userId,
      username: schema.users.username,
      betAmount: schema.games.betAmount,
      payout: schema.games.payout,
      gameType: schema.games.gameType,
      result: schema.games.result,
      createdAt: schema.games.createdAt
    })
    .from(schema.games)
    .innerJoin(schema.users, eq(schema.games.userId, schema.users.id));
    
    if (startDate) {
      gamesQuery = gamesQuery.where(gte(schema.games.createdAt, startDate));
    }
    
    if (gameType) {
      gamesQuery = gamesQuery.where(eq(schema.games.gameType, gameType));
    }
    
    const games = await gamesQuery;
    
    // Aggregate data by user
    const userStats: Record<number, {
      userId: number,
      username: string,
      totalBets: number,
      totalWins: number,
      winRate: number,
      totalWinnings: number,
      avatar: string
    }> = {};
    
    games.forEach(game => {
      if (!userStats[game.userId]) {
        userStats[game.userId] = {
          userId: game.userId,
          username: game.username,
          totalBets: 0,
          totalWins: 0,
          winRate: 0,
          totalWinnings: 0,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${game.username}`
        };
      }
      
      userStats[game.userId].totalBets += 1;
      
      if (game.payout > 0) {
        userStats[game.userId].totalWins += 1;
        userStats[game.userId].totalWinnings += (game.payout - game.betAmount);
      }
    });
    
    // Calculate win rates
    Object.values(userStats).forEach(user => {
      user.winRate = user.totalBets > 0 ? parseFloat(((user.totalWins / user.totalBets) * 100).toFixed(1)) : 0;
    });
    
    // Sort according to the requested parameter
    let leaderboardData = Object.values(userStats);

    if (sortBy === 'totalWinnings') {
      leaderboardData = leaderboardData.sort((a, b) => b.totalWinnings - a.totalWinnings);
    } else if (sortBy === 'winRate') {
      leaderboardData = leaderboardData.sort((a, b) => b.winRate - a.winRate);
    } else {
      leaderboardData = leaderboardData.sort((a, b) => b.totalWins - a.totalWins);
    }
    
    // Return only the top 10 users
    res.json(leaderboardData.slice(0, 10));
    
  } catch (err) {
    next(err);
  }
});

app.get("/api/games/my-history", async (req, res, next) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

      let games = await storage.getGamesByUserId(req.user!.id);
      
      // Enhance team match games with team data if needed
      games = games.map(game => {
        // For team_match games, ensure we include proper team data in gameData
        if (game.gameType === 'team_match' && game.match && !game.gameData) {
          return {
            ...game,
            gameData: {
              teamA: game.match.teamA,
              teamB: game.match.teamB
            }
          };
        }
        return game;
      });

      res.json(games);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/games/play", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (req.user!.isBlocked) {
        return res.status(403).json({ message: "Your account is blocked" });
      }

      const { betAmount, prediction } = req.body;
      
      // Validate input
      if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ message: "Invalid bet amount" });
      }

      if (!prediction || (prediction !== GameOutcome.HEADS && prediction !== GameOutcome.TAILS)) {
        return res.status(400).json({ message: "Invalid prediction" });
      }

      // Check user balance
      const user = await storage.getUser(req.user!.id);
      if (!user || user.balance < betAmount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Import our dynamic probability system
      const { calculateWinProbability, updateUserSessionStats, DEFAULT_HOUSE_EDGE_WIN_RATE } = await import('./game-probability');
      
      // Calculate win probability based on user's history and session stats
      let userWinProbability = await calculateWinProbability(user.id);
      
      // Critical adjustment: Force house edge after seeing game logs
      // This is a temporary adjustment to ensure the house maintains an edge
      // The user has been winning too frequently, so we'll lower the probability temporarily
      // The player has won too many times in a row, adjust probability downward
      const MAX_WIN_PROBABILITY = 0.35; // Limit maximum win probability to 35% temporarily
      
      // Get user's recent games to check winning streak
      const recentGames = await storage.getRecentGames(user.id, 5);
      let winStreak = 0;
      
      // Count consecutive wins
      for (const game of recentGames) {
        if (game.payout > 0) {
          winStreak++;
        } else {
          break; // Stop counting at first loss
        }
      }
      
      // Apply stricter probability if user is on a winning streak
      if (winStreak >= 3) {
        // Cap at a much lower probability for users on a win streak
        userWinProbability = Math.min(userWinProbability, 0.25);
        console.log(`Win streak detected (${winStreak}), applying stricter probability: ${userWinProbability.toFixed(2)}`);
      } else {
        // Standard adjustment - cap at MAX_WIN_PROBABILITY
        userWinProbability = Math.min(userWinProbability, MAX_WIN_PROBABILITY);
      }
      
      // Determine if user wins based on dynamic probability
      const userWins = Math.random() < userWinProbability;
      
      // Set result based on user's prediction and whether they win
      // If user prediction is HEADS and they win, result is HEADS
      // If user prediction is HEADS and they lose, result is TAILS
      // And vice versa
      const result = userWins ? prediction : 
                    (prediction === GameOutcome.HEADS ? GameOutcome.TAILS : GameOutcome.HEADS);
      
      // Get appropriate multiplier from game odds settings
      // First check if user is assigned to a subadmin
      let multiplier = 1.95; // Default fallback if no odds are configured
      
      // Try to get user's assigned subadmin
      const userData = await storage.getUser(user.id);
      const subadminId = userData?.assignedTo;
      
      try {
        if (subadminId) {
          // User is assigned to a subadmin, check for subadmin-specific odds
          const subadminOdds = await storage.getGameOddsBySubadmin(subadminId, 'coin_flip');
          if (subadminOdds.length > 0) {
            // Use subadmin odds
            multiplier = subadminOdds[0].oddValue / 100; // Convert from stored integer (195) to decimal (1.95)
          } else {
            // No subadmin-specific odds, check admin odds
            const adminOdds = await storage.getGameOdds('coin_flip');
            const adminOdd = adminOdds.find(odd => odd.setByAdmin === true);
            if (adminOdd) {
              multiplier = adminOdd.oddValue / 100;
            }
          }
        } else {
          // User not assigned to a subadmin, use admin odds directly
          const adminOdds = await storage.getGameOdds('coin_flip');
          const adminOdd = adminOdds.find(odd => odd.setByAdmin === true);
          if (adminOdd) {
            multiplier = adminOdd.oddValue / 100;
          }
        }
      } catch (error) {
        console.error("Error getting odds settings:", error);
        // Use default multiplier if there's an error
      }
      
      const payout = userWins ? Math.floor(betAmount * multiplier) : 0;
      
      // Update user balance
      const newBalance = user.balance - betAmount + payout;
      await storage.updateUserBalance(user.id, newBalance);
      
      // Update user session stats for future probability calculations
      updateUserSessionStats(user.id, userWins);

      // Log internal game stats (only visible in server logs, not to clients)
      console.log(`Coin Flip: User=${user.username}, WinProb=${userWinProbability.toFixed(2)}, Wins=${userWins}, Payout=${payout}`);

      // Record the game
      const game = await storage.createGame({
        userId: user.id,
        gameType: GameType.COIN_FLIP,
        betAmount,
        prediction,
        result,
        payout,
        balanceAfter: newBalance, // Track the balance after this game
      });

      // Return game result with updated user info
      res.json({
        game,
        user: {
          ...user,
          balance: newBalance,
          password: undefined,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // User management routes
  app.get("/api/users", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      let users;
      
      // If the assignedTo query param is provided, filter by this parameter (for showing users of a specific subadmin)
      const assignedToId = req.query.assignedTo ? parseInt(req.query.assignedTo as string) : null;
      
      if (assignedToId && req.user!.role === UserRole.ADMIN) {
        // Admin can request players assigned to a specific subadmin
        users = await storage.getUsersByAssignedTo(assignedToId);
      } else if (req.user!.role === UserRole.ADMIN) {
        // Admins can see all users by default
        users = await storage.getAllUsers();
      } else {
        // Subadmins can only see users assigned to them
        users = await storage.getUsersByAssignedTo(req.user!.id);
      }

      // Remove passwords from response
      const sanitizedUsers = users.map((user) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      res.json(sanitizedUsers);
    } catch (err) {
      next(err);
    }
  });
  
  // Get a single user by ID
  app.get("/api/users/:id", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Validate ID format
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      // Get the user
      const user = await storage.getUser(userId);
      
      // Check if user exists
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if current user has permission to view this user
      // Admins can view any user, subadmins can only view users assigned to them
      if (req.user!.role === UserRole.SUBADMIN && 
          user.role !== UserRole.PLAYER && 
          user.id !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to view this user" });
      }
      
      if (req.user!.role === UserRole.SUBADMIN && 
          user.role === UserRole.PLAYER && 
          user.assignedTo !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to view this user" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      // Return the user data
      res.json(userWithoutPassword);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/users/:id/block", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      const userId = Number(req.params.id);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check permissions
      if (req.user!.role === UserRole.SUBADMIN && user.assignedTo !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to modify this user" });
      }

      // Block user and store who blocked them
      const updatedUser = await storage.blockUser(userId, req.user!.id);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/users/:id/unblock", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      const userId = Number(req.params.id);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user was blocked by an admin when a subadmin is trying to unblock
      if (req.user!.role === UserRole.SUBADMIN) {
        if (user.blockedBy) {
          const blockedByUser = await storage.getUser(user.blockedBy);
          if (blockedByUser && blockedByUser.role === UserRole.ADMIN) {
            return res.status(403).json({ 
              message: "This user was blocked by an admin. Please contact your admin to unblock this user." 
            });
          }
        }
        
        // Also check assignments for subadmins
        if (user.assignedTo !== req.user!.id) {
          return res.status(403).json({ message: "You don't have permission to modify this user" });
        }
      }

      // Unblock user
      const updatedUser = await storage.unblockUser(userId);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/users/:id/balance", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    // Initialize this variable at function level to avoid duplicate declarations
    let discountBonusAmount = 0;
    
    try {
      const userId = Number(req.params.id);
      const { amount, description } = req.body;

      if (typeof amount !== 'number') {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check permissions
      if (req.user!.role === UserRole.SUBADMIN && user.assignedTo !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to modify this user" });
      }

      // For admins and subadmins interacting with user funds
      if (req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUBADMIN) {
        const adminOrSubadmin = await storage.getUser(req.user!.id);
        
        if (!adminOrSubadmin) {
          return res.status(404).json({ message: `${req.user!.role} account not found` });
        }
        
        // When adding funds, check if admin/subadmin has enough balance
        if (amount > 0) {
          // For admin self-funding, don't check balance
          const isAdminSelfFunding = req.user!.role === UserRole.ADMIN && userId === req.user!.id;
          
          // Check if the recipient is a subadmin - we need to apply commission logic
          const isRecipientSubadmin = user.role === UserRole.SUBADMIN;
          // Check if the recipient is a player - we need to apply deposit discount logic
          const isRecipientPlayer = user.role === UserRole.PLAYER;
          
          // Calculate deduction amount based on commission (if target is subadmin)
          let deductionAmount = amount;
          
          if (req.user!.role === UserRole.ADMIN && isRecipientSubadmin) {
            try {
              // Import the function from wallet-system.ts
              const { getSubadminDepositCommission } = await import('./wallet-system');
              
              // Get the commission rate for this subadmin (e.g., 50% = 5000)
              const commissionRate = await getSubadminDepositCommission(userId);
              
              // Calculate the amount to deduct from admin (only the commission percentage)
              // Only deduct the commission percentage from admin's wallet, not the full amount
              deductionAmount = Math.floor((amount * commissionRate) / 10000);
              
              // Calculate the commission amount (the difference between full amount and what admin pays)
              const commissionAmount = amount - deductionAmount;
              
              console.log(`Transfer to subadmin ${userId}: Total: ${amount}, Commission rate: ${commissionRate/100}%, Admin deduction: ${deductionAmount}, Commission saved: ${commissionAmount}`);
            } catch (error) {
              console.error('Error calculating commission rate:', error);
              // If there's an error, use default behavior (deduct full amount)
              deductionAmount = amount;
            }
          }
          
          // Apply deposit discount if user is a player and transferrer is a subadmin
          if (req.user!.role === UserRole.SUBADMIN && isRecipientPlayer) {
            try {
              // Import deposit discount helper functions
              const { getPlayerDepositDiscount, calculateDepositBonus } = await import('./deposit-discount-helper');
              
              // Get the discount rate for this player
              const discountRate = await getPlayerDepositDiscount(userId, req.user!.id);
              
              if (discountRate > 0) {
                // Calculate bonus amount based on discount rate
                discountBonusAmount = calculateDepositBonus(amount, discountRate);
                
                console.log(`Transfer to player ${userId}: Amount: ${amount}, Discount rate: ${discountRate/100}%, Bonus amount: ${discountBonusAmount}`);
              }
            } catch (error) {
              console.error('Error calculating deposit discount:', error);
              // If there's an error, no bonus will be added
              discountBonusAmount = 0;
            }
          }
          
          if (!isAdminSelfFunding && adminOrSubadmin.balance < deductionAmount) {
            return res.status(400).json({ 
              message: "Insufficient balance in your account. Please add funds to your wallet first."
            });
          }
          
          // Skip deduction if it's admin self-funding
          if (!isAdminSelfFunding) {
            // Deduct the calculated amount from admin/subadmin's balance
            await storage.updateUserBalance(adminOrSubadmin.id, adminOrSubadmin.balance - deductionAmount);
            
            // Record transaction for admin/subadmin (negative amount = deduction)
            let description = '';
            if (isRecipientSubadmin) {
              const commissionAmount = amount - deductionAmount;
              description = `Funds transferred to ${user.username} (${deductionAmount} of ${amount} - commission rate applied, commission: ${commissionAmount})`;
            } else if (discountBonusAmount > 0) {
              description = `Funds transferred to ${user.username} (Deposit discount applied: +${discountBonusAmount})`;
            } else {
              description = `Funds transferred to ${user.username}`;
            }
                
            await storage.createTransaction({
              userId: adminOrSubadmin.id,
              amount: -deductionAmount,
              performedBy: adminOrSubadmin.id,
              description,
            });
          }
        } 
        // When deducting funds, add to admin/subadmin's balance
        else if (amount < 0) {
          // Skip addition if it's admin self-deduction
          const isAdminSelfDeduction = req.user!.role === UserRole.ADMIN && userId === req.user!.id;
          
          // Check if the source is a subadmin - we need to apply commission logic
          const isSourceSubadmin = user.role === UserRole.SUBADMIN;
          
          // Calculate addition amount based on commission (if source is subadmin)
          let additionAmount = Math.abs(amount);
          
          if (req.user!.role === UserRole.ADMIN && isSourceSubadmin) {
            try {
              // Import the function from wallet-system.ts
              const { getSubadminDepositCommission } = await import('./wallet-system');
              
              // Get the commission rate for this subadmin (e.g., 50% = 5000)
              const commissionRate = await getSubadminDepositCommission(userId);
              
              // Calculate the amount to add to admin (only the commission percentage)
              // Only add the commission percentage to admin's wallet, not the full amount
              additionAmount = Math.floor((Math.abs(amount) * commissionRate) / 10000);
              
              console.log(`Withdrawal from subadmin ${userId}: Total: ${Math.abs(amount)}, Commission rate: ${commissionRate/100}%, Admin addition: ${additionAmount}`);
            } catch (error) {
              console.error('Error calculating commission rate:', error);
              // If there's an error, use default behavior (add full amount)
              additionAmount = Math.abs(amount);
            }
          }
          
          if (!isAdminSelfDeduction) {
            // Add the calculated amount to admin/subadmin's balance
            await storage.updateUserBalance(adminOrSubadmin.id, adminOrSubadmin.balance + additionAmount);
            
            // Record transaction for admin/subadmin (positive amount = addition)
            let description = '';
            if (isSourceSubadmin) {
              const commissionAmount = additionAmount - Math.abs(amount);
              description = `Funds recovered from ${user.username} (${additionAmount} of ${Math.abs(amount)} - commission rate applied, commission: ${commissionAmount})`;
            } else {
              description = `Funds recovered from ${user.username}`;
            }
              
            await storage.createTransaction({
              userId: adminOrSubadmin.id,
              amount: additionAmount,
              performedBy: adminOrSubadmin.id,
              description,
            });
          }
        }
      }

      // Add bonus amount from deposit discount if applicable
      let totalAmount = amount;
      let bonusDescription = "";
      
      // Apply bonus only if it's a deposit (positive amount) and there's a bonus to add
      if (amount > 0 && discountBonusAmount > 0) {
        totalAmount += discountBonusAmount;
        bonusDescription = ` (includes ${discountBonusAmount} bonus)`;
      }
      
      // Prevent negative balance for the player
      const newBalance = user.balance + totalAmount;
      if (newBalance < 0) {
        return res.status(400).json({ message: "Cannot reduce balance below zero" });
      }

      // Update player's balance
      const updatedUser = await storage.updateUserBalance(userId, newBalance);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Determine a default description if none provided
      const transactionDesc = description || (amount > 0 
        ? `Funds added by ${req.user!.username}` 
        : `Funds deducted by ${req.user!.username}`);
        
      // If a bonus was added, create two separate transaction records
      if (amount > 0 && discountBonusAmount > 0) {
        // First transaction for the original deposit
        await storage.createTransaction({
          userId,
          amount,
          performedBy: req.user!.id,
          description: transactionDesc
        });
        
        // Second transaction for the bonus amount
        await storage.createTransaction({
          userId,
          amount: discountBonusAmount,
          performedBy: req.user!.id,
          description: `Deposit bonus (${(discountBonusAmount * 100 / amount).toFixed(2)}% of ${amount})`
        });
      } else {
        // Regular transaction (no bonus or withdrawal)
        await storage.createTransaction({
          userId,
          amount,
          performedBy: req.user!.id,
          description: transactionDesc
        });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/users/:id/assign", requireRole(UserRole.ADMIN), async (req, res, next) => {
    try {
      const userId = Number(req.params.id);
      const { adminId } = req.body;

      if (typeof adminId !== 'number') {
        return res.status(400).json({ message: "Invalid admin ID" });
      }

      // Verify target user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify admin/subadmin exists
      const admin = await storage.getUser(adminId);
      if (!admin || (admin.role !== UserRole.ADMIN && admin.role !== UserRole.SUBADMIN)) {
        return res.status(400).json({ message: "Invalid admin/subadmin ID" });
      }

      // Assign user
      const updatedUser = await storage.assignUserToAdmin(userId, adminId);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (err) {
      next(err);
    }
  });
  
  // Edit user (username/password)
  app.patch("/api/users/:id/edit", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      const userId = Number(req.params.id);
      const { username, password } = req.body;
      
      // Subadmins can only change passwords, not usernames
      if (req.user!.role === UserRole.SUBADMIN && username) {
        return res.status(403).json({ message: "Subadmins can only change passwords, not usernames" });
      }
      
      // Verify at least one field is provided
      if (!username && !password) {
        return res.status(400).json({ message: "No updates provided" });
      }
      
      // Get the user to verify permissions
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check permissions - subadmins can only update their assigned users
      if (req.user!.role === UserRole.SUBADMIN && user.assignedTo !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to modify this user" });
      }
      
      // If username is provided, check if it's already taken
      if (username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Username already taken" });
        }
      }
      
      // Prepare the update data
      const updateData: { username?: string; password?: string } = {};
      
      // Only include username if provided (and user is admin)
      if (username && req.user!.role === UserRole.ADMIN) {
        updateData.username = username;
      }
      
      // Only include password if provided
      if (password) {
        updateData.password = password;
      }
      
      // Update the user with prepared data
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password: pwd, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (err) {
      console.error("Error updating user:", err);
      next(err);
    }
  });

  // Get user statistics
  app.get("/api/users/stats", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // For player role, we need to fix a permission issue
      if (req.user!.role === UserRole.PLAYER) {
        const userId = req.user!.id;
        const games = await storage.getGamesByUserId(userId);
        
        // Calculate basic statistics
        const totalBets = games.length;
        const totalWins = games.filter(game => game.payout > 0).length;
        const winRate = totalBets > 0 ? Math.round((totalWins / totalBets) * 100) : 0;
        
        // Calculate more advanced statistics
        const totalWagered = games.reduce((sum, game) => sum + game.betAmount, 0);
        const totalWon = games.reduce((sum, game) => sum + game.payout, 0);
        const netProfit = totalWon - totalWagered;
        
        // Get game type distribution
        const gameTypes = games.reduce((acc, game) => {
          acc[game.gameType] = (acc[game.gameType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        // Get recent activity trend - last 10 games
        const recentGames = games
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10);
        
        const recentWinRate = recentGames.length > 0 
          ? Math.round((recentGames.filter(g => g.payout > 0).length / recentGames.length) * 100)
          : 0;
        
        // Return enhanced stats
        res.json({
          totalBets,
          winRate,
          recentWinRate,
          totalWagered,
          totalWon,
          netProfit,
          gameTypeDistribution: gameTypes,
          favoriteGame: Object.entries(gameTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || null
        });
      } else {
        // For admin/subadmin role
        const userId = parseInt(req.query.userId as string);
        
        // Validate ID format
        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID format" });
        }
        
        // Check permissions - admins can view any user's stats, subadmins only their assigned users
        if (req.user!.role === UserRole.SUBADMIN) {
          const assignedUsers = await storage.getUsersByAssignedTo(req.user!.id);
          const isUserAssigned = assignedUsers.some(u => u.id === userId);
          
          if (!isUserAssigned) {
            return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
          }
        }
        
        const games = await storage.getGamesByUserId(userId);
        
        // Calculate basic statistics
        const totalBets = games.length;
        const totalWins = games.filter(game => game.payout > 0).length;
        const winRate = totalBets > 0 ? Math.round((totalWins / totalBets) * 100) : 0;
        
        res.json({
          totalBets,
          winRate,
        });
      }
    } catch (err) {
      next(err);
    }
  });
  
  // API endpoint for subadmin dashboard statistics
  app.get("/api/subadmin/stats", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Only allow admin and subadmin to access this endpoint
      if (req.user!.role !== UserRole.SUBADMIN && req.user!.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const subadminId = req.user!.id;
      let assignedTo = subadminId;
      
      // If admin is viewing a specific subadmin's stats
      if (req.user!.role === UserRole.ADMIN && req.query.subadminId) {
        assignedTo = Number(req.query.subadminId);
      }
      
      // Get all users assigned to this subadmin
      const users = await storage.getUsersByAssignedTo(assignedTo);
      
      if (!users || users.length === 0) {
        return res.json({
          totalProfit: 0,
          totalDeposits: 0,
          totalUsers: 0,
          activeUsers: 0
        });
      }
      
      // Get all user IDs assigned to this subadmin
      const userIds = users.map(user => user.id);
      let totalProfit = 0;
      let totalDeposits = 0;
      
      // Calculate total deposits from transactions
      const transactions = await storage.getWalletTransactionsByUserIds(userIds);
      if (transactions && transactions.length > 0) {
        // Sum deposits (positive amounts with deposit description)
        totalDeposits = transactions
          .filter(tx => tx.amount > 0 && tx.description && (
            tx.description.includes('Deposit') || 
            tx.description.includes('Added by admin') || 
            tx.description.includes('Funds added')
          ))
          .reduce((sum, tx) => sum + tx.amount, 0);
      }
      
      // Calculate profit/loss from games
      const games = await storage.getGamesByUserIds(userIds);
      if (games && games.length > 0) {
        // Calculate profit (positive when house wins, negative when player wins)
        totalProfit = games.reduce((sum, game) => {
          // For player-won games, result will be "win" or "heads"/"tails" matching their prediction
          const playerWon = game.result === 'win' || 
                           (game.result && game.prediction && game.result === game.prediction);
          
          // For house-won games, result will be "loss" or different from player's prediction
          const houseWon = game.result === 'loss' ||
                          (game.result && game.prediction && game.result !== game.prediction && 
                           game.result !== 'pending' && game.result !== 'win');
                          
          if (playerWon) {
            // House loss (negative profit): payout - betAmount
            return sum - ((game.payout || 0) - (game.betAmount || game.bet_amount || 0));
          } else if (houseWon) {
            // House win (positive profit): betAmount
            return sum + (game.betAmount || game.bet_amount || 0);
          }
          // Pending games don't affect profit calculation
          return sum;
        }, 0);
      }
      
      // Count active users (users who played at least one game)
      const activeUserIds = games.length > 0 ? 
        [...new Set(games.map(game => game.userId || game.user_id))] : [];
      const activeUsers = activeUserIds.length;
      
      res.json({
        totalProfit,
        totalDeposits,
        totalUsers: users.length,
        activeUsers
      });
    } catch (err) {
      next(err);
    }
  });

  // Recent games across all users (for admin dashboard)
  app.get("/api/games/recent", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      // Get recent games limited to 10
      const games = await storage.getAllGames(10);
      res.json(games);
    } catch (err) {
      next(err);
    }
  });

  // Get all games (for admins and subadmins) or user's games
  app.get("/api/games", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      let games;
      
      if (req.user!.role === UserRole.ADMIN) {
        // Admins can see all games
        games = await storage.getAllGames();
      } else if (req.user!.role === UserRole.SUBADMIN) {
        // Subadmins can only see games from users assigned to them
        const assignedUsers = await storage.getUsersByAssignedTo(req.user!.id);
        const userIds = assignedUsers.map(user => user.id);
        
        // Also include the subadmin's own games
        userIds.push(req.user!.id);
        
        // Get all games and filter by user IDs
        const allGames = await storage.getAllGames();
        games = allGames.filter(game => userIds.includes(game.userId));
      } else {
        // Regular users can only see their own games
        games = await storage.getGamesByUserId(req.user!.id);
      }
      
      res.json(games);
    } catch (err) {
      next(err);
    }
  });
  
  // Get games for a specific user (admin/subadmin only)
  app.get("/api/games/:userId", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);
      
      // Get the user to verify permissions
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check permissions - subadmins can only view their assigned users
      if (req.user!.role === UserRole.SUBADMIN && targetUser.assignedTo !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to view this user's data" });
      }
      
      const games = await storage.getGamesByUserId(userId);
      res.json(games);
    } catch (err) {
      next(err);
    }
  });

  // Get all transactions (for admins and subadmins) or user's transactions
  app.get("/api/transactions", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      let transactions;
      
      if (req.user!.role === UserRole.ADMIN) {
        // Admins can see all transactions
        transactions = await storage.getAllTransactions();
      } else if (req.user!.role === UserRole.SUBADMIN) {
        // Subadmins can only see transactions from users assigned to them
        const assignedUsers = await storage.getUsersByAssignedTo(req.user!.id);
        const userIds = assignedUsers.map(user => user.id);
        
        // Also include the subadmin's own transactions
        userIds.push(req.user!.id);
        
        // Get all transactions and filter by user IDs
        const allTransactions = await storage.getAllTransactions();
        transactions = allTransactions.filter(transaction => userIds.includes(transaction.userId));
      } else {
        // Regular users can only see their own transactions
        transactions = await storage.getTransactionsByUserId(req.user!.id);
      }
      
      res.json(transactions);
    } catch (err) {
      next(err);
    }
  });
  
  // Get transactions for a specific user (admin/subadmin only)
  app.get("/api/transactions/:userId", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);
      
      // Get the user to verify permissions
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check permissions - subadmins can only view their assigned users
      if (req.user!.role === UserRole.SUBADMIN && targetUser.assignedTo !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to view this user's data" });
      }
      
      const transactions = await storage.getTransactionsByUserId(userId);
      res.json(transactions);
    } catch (err) {
      next(err);
    }
  });

  // Satamatka Market Routes
  
  // Get all satamatka markets
  app.get("/api/satamatka/markets", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const markets = await storage.getAllSatamatkaMarkets();
      res.json(markets);
    } catch (err) {
      next(err);
    }
  });

  // Get active satamatka markets (open for betting)
  app.get("/api/satamatka/markets/active", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const markets = await storage.getActiveSatamatkaMarkets();
      res.json(markets);
    } catch (err) {
      next(err);
    }
  });

  // Get a specific satamatka market
  app.get("/api/satamatka/markets/:id", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const marketId = Number(req.params.id);
      const market = await storage.getSatamatkaMarket(marketId);
      
      if (!market) {
        return res.status(404).json({ message: "Market not found" });
      }
      
      res.json(market);
    } catch (err) {
      next(err);
    }
  });

  // Get all games for a specific market
  app.get("/api/satamatka/markets/:id/games", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const marketId = Number(req.params.id);
      const market = await storage.getSatamatkaMarket(marketId);
      
      if (!market) {
        return res.status(404).json({ message: "Market not found" });
      }
      
      const games = await storage.getSatamatkaGamesByMarketId(marketId);
      res.json(games);
    } catch (err) {
      next(err);
    }
  });

  // Admin routes for managing markets
  app.post("/api/satamatka/markets", requireRole([UserRole.ADMIN]), async (req, res, next) => {
    try {
      // Add proper date handling for string timestamps
      const formData = req.body;
      
      // Convert string dates to Date objects if they're strings
      if (formData.openTime && typeof formData.openTime === 'string') {
        formData.openTime = new Date(formData.openTime);
      }
      
      if (formData.closeTime && typeof formData.closeTime === 'string') {
        formData.closeTime = new Date(formData.closeTime);
      }
      
      if (formData.resultTime && typeof formData.resultTime === 'string') {
        formData.resultTime = new Date(formData.resultTime);
      }
      
      // Parse with schema validation after date conversion
      const marketData = insertSatamatkaMarketSchema.parse(formData);
      
      // Log data for debugging
      console.log("Creating market with data:", {
        ...marketData,
        openTime: marketData.openTime ? marketData.openTime.toISOString() : null,
        closeTime: marketData.closeTime ? marketData.closeTime.toISOString() : null
      });
      
      // Handle recurring market flag
      if (marketData.isRecurring) {
        const market = await storage.createRecurringSatamatkaMarket(marketData);
        res.status(201).json(market);
      } else {
        const market = await storage.createSatamatkaMarket(marketData);
        res.status(201).json(market);
      }
    } catch (err) {
      console.error("Error creating market:", err);
      next(err);
    }
  });
  
  // Create a recurring market (new API endpoint)
  app.post("/api/satamatka/markets/recurring", requireRole([UserRole.ADMIN]), async (req, res, next) => {
    try {
      // Add proper date handling for string timestamps
      const formData = req.body;
      
      // Convert string dates to Date objects if they're strings
      if (formData.openTime && typeof formData.openTime === 'string') {
        formData.openTime = new Date(formData.openTime);
      }
      
      if (formData.closeTime && typeof formData.closeTime === 'string') {
        formData.closeTime = new Date(formData.closeTime);
      }
      
      if (formData.resultTime && typeof formData.resultTime === 'string') {
        formData.resultTime = new Date(formData.resultTime);
      }
      
      // Parse with schema validation
      const marketData = insertSatamatkaMarketSchema.parse(formData);
      
      // Force this to be a recurring market
      marketData.isRecurring = true;
      
      // Log data for debugging
      console.log("Creating recurring market with data:", {
        ...marketData,
        openTime: marketData.openTime ? marketData.openTime.toISOString() : null,
        closeTime: marketData.closeTime ? marketData.closeTime.toISOString() : null
      });
      
      const market = await storage.createRecurringSatamatkaMarket(marketData);
      res.status(201).json(market);
    } catch (err) {
      console.error("Error creating recurring market:", err);
      next(err);
    }
  });

  // Update market status
  app.patch("/api/satamatka/markets/:id/status", requireRole([UserRole.ADMIN]), async (req, res, next) => {
    try {
      const marketId = Number(req.params.id);
      const { status } = req.body;
      
      // Updated to include the "waiting" status for the proper workflow sequence
      if (!status || !["waiting", "open", "closed", "resulted"].includes(status)) {
        return res.status(400).json({ 
          message: "Invalid status. Must be one of: waiting, open, closed, resulted" 
        });
      }
      
      // Check the current market status before allowing transition
      const existingMarket = await storage.getSatamatkaMarket(marketId);
      if (!existingMarket) {
        return res.status(404).json({ message: "Market not found" });
      }
      
      // Get the current market to check if status transition is valid
      if (status === "resulted" && existingMarket.status !== "closed") {
        return res.status(400).json({ 
          message: "Market can only be set to 'resulted' from 'closed' status" 
        });
      }
      
      const market = await storage.updateSatamatkaMarketStatus(marketId, status);
      
      if (!market) {
        return res.status(404).json({ message: "Market not found" });
      }
      
      res.json(market);
    } catch (err) {
      next(err);
    }
  });
  
  // Update market details (without changing status)
  app.patch("/api/satamatka/markets/:id", requireRole([UserRole.ADMIN]), async (req, res, next) => {
    try {
      const marketId = Number(req.params.id);
      const formData = req.body;
      
      // Get the existing market to make sure it exists
      const existingMarket = await storage.getSatamatkaMarket(marketId);
      if (!existingMarket) {
        return res.status(404).json({ message: "Market not found" });
      }
      
      // Convert string dates to Date objects if they're strings
      if (formData.openTime && typeof formData.openTime === 'string') {
        formData.openTime = new Date(formData.openTime);
      }
      
      if (formData.closeTime && typeof formData.closeTime === 'string') {
        formData.closeTime = new Date(formData.closeTime);
      }
      
      if (formData.resultTime && typeof formData.resultTime === 'string') {
        formData.resultTime = new Date(formData.resultTime);
      }
      
      // Update the market details (this method explicitly excludes status to maintain workflow)
      const market = await storage.updateSatamatkaMarket(marketId, formData);
      
      if (!market) {
        return res.status(500).json({ message: "Failed to update market" });
      }
      
      // Return updated market
      res.json(market);
    } catch (err) {
      next(err);
    }
  });

  // Update market results
  app.patch("/api/satamatka/markets/:id/results", requireRole([UserRole.ADMIN]), async (req, res, next) => {
    try {
      const marketId = Number(req.params.id);
      const { openResult, closeResult } = req.body;
      
      // Get the current market to check its status
      const existingMarket = await storage.getSatamatkaMarket(marketId);
      if (!existingMarket) {
        return res.status(404).json({ message: "Market not found" });
      }
      
      // Ensure the market is in the correct status before allowing result declaration
      if (existingMarket.status !== "closed") {
        return res.status(400).json({ 
          message: "Results can only be declared for markets in 'closed' status. Please close the market first." 
        });
      }
      
      if (openResult === undefined && closeResult === undefined) {
        return res.status(400).json({ message: "Either openResult or closeResult must be provided" });
      }
      
      // Validate results are two-digit numbers (00-99)
      const validateResult = (result: string | undefined) => {
        if (result === undefined) return true;
        return /^[0-9]{2}$/.test(result);
      };
      
      if (!validateResult(openResult) || !validateResult(closeResult)) {
        return res.status(400).json({ message: "Results must be two-digit numbers (00-99)" });
      }
      
      // Update market results
      const market = await storage.updateSatamatkaMarketResults(marketId, openResult, closeResult);
      
      if (!market) {
        return res.status(404).json({ message: "Failed to update market results" });
      }
      
      // Process all bets for this market if closeResult is provided (final result)
      if (closeResult) {
        try {
          // Get all games for this market
          const marketGames = await storage.getSatamatkaGamesByMarketId(marketId);
          
          // Process each game
          for (const game of marketGames) {
            // Skip already processed games
            if (game.result !== "pending") continue;
            
            // Get user info
            const user = await storage.getUser(game.userId);
            if (!user) continue;
            
            // Determine if the bet won based on game mode and prediction
            let isWinner = false;
            let payout = 0;
            
            // Get appropriate odds for this player and game mode from the database
            const getOddsValue = async (gameMode: string): Promise<number> => {
              const gameTypeMap = {
                [SatamatkaGameMode.JODI]: 'satamatka_jodi',
                [SatamatkaGameMode.HARF]: 'satamatka_harf',
                [SatamatkaGameMode.CROSSING]: 'satamatka_crossing',
                [SatamatkaGameMode.ODD_EVEN]: 'satamatka_odd_even'
              };
              
              const gameType = gameTypeMap[gameMode as keyof typeof gameTypeMap];
              if (!gameType) {
                console.warn(`Unknown game mode: ${gameMode}, using default odds`);
                return 0;
              }
              
              // Get odds configured in the database based on player's relation to subadmins
              return await storage.getOddsForPlayer(game.userId, gameType);
            };
            
            // Game mode specific win conditions
            if (game.gameMode === SatamatkaGameMode.JODI && game.prediction === closeResult) {
              // For Jodi mode, prediction must match closeResult exactly
              isWinner = true;
              const oddValue = await getOddsValue(game.gameMode);
              payout = game.betAmount * (oddValue / 100); // Apply configured odds
            } 
            else if (game.gameMode === SatamatkaGameMode.HARF) {
              // For Harf, check if digit matches position
              const firstDigit = closeResult[0]; 
              const secondDigit = closeResult[1];
              
              if (
                (game.prediction === firstDigit) || 
                (game.prediction === secondDigit) ||
                (game.prediction === `L${firstDigit}`) ||
                (game.prediction === `R${secondDigit}`)
              ) {
                isWinner = true;
                const oddValue = await getOddsValue(game.gameMode);
                payout = game.betAmount * (oddValue / 100); // Apply configured odds
              }
            }
            else if (game.gameMode === SatamatkaGameMode.CROSSING) {
              // For Crossing, check if any digit in prediction matches either digit in result
              const digits = game.prediction.replace(/[^0-9,]/g, '').split(',');
              if (digits.includes(closeResult[0]) || digits.includes(closeResult[1])) {
                isWinner = true;
                const oddValue = await getOddsValue(game.gameMode);
                payout = game.betAmount * (oddValue / 100); // Apply configured odds
              }
            }
            else if (game.gameMode === SatamatkaGameMode.ODD_EVEN) {
              // For Odd-Even, check if prediction matches the result's parity
              const resultNumber = parseInt(closeResult, 10);
              const isResultOdd = resultNumber % 2 !== 0;
              
              if ((game.prediction === "odd" && isResultOdd) || 
                  (game.prediction === "even" && !isResultOdd)) {
                isWinner = true;
                const oddValue = await getOddsValue(game.gameMode);
                payout = game.betAmount * (oddValue / 100); // Apply configured odds
              }
            }
            
            // Set game result
            const result = isWinner ? "win" : "loss";
            
            // We do NOT need to update the balanceAfter field for each game individually
            // as it was already correctly set when the bet was placed.
            // We only need to add the payout to the running balance for win cases.
            
            // Update game result and payout in database
            await storage.updateGameResult(game.id, result, payout);
            
            // Only update user balance if they won
            if (isWinner) {
              // Update user's actual balance in the database
              const updatedBalance = user.balance + payout;
              await storage.updateUserBalance(user.id, updatedBalance);
              
              // For winning games, update the balanceAfter to reflect the addition of the payout
              await db.update(games)
                .set({ balanceAfter: game.balanceAfter! + payout })
                .where(eq(games.id, game.id));
            }
          }
        } catch (err) {
          console.error("Error processing market bets:", err);
          // Don't return error as the market result update was successful
        }
      }
      
      res.json(market);
    } catch (err) {
      next(err);
    }
  });
  
  // Delete a market (used for removing market templates)
  app.delete("/api/satamatka/markets/:id", requireRole([UserRole.ADMIN]), async (req, res, next) => {
    try {
      const marketId = Number(req.params.id);
      
      // Check if there are any games associated with this market
      const games = await storage.getSatamatkaGamesByMarketId(marketId);
      
      if (games.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete market with existing games. This market has been used for betting and cannot be removed."
        });
      }
      
      // Delete the market
      const deletedMarket = await storage.deleteSatamatkaMarket(marketId);
      
      if (!deletedMarket) {
        return res.status(404).json({ message: "Market not found" });
      }
      
      res.json({ 
        message: "Market template removed successfully", 
        id: marketId 
      });
    } catch (err) {
      next(err);
    }
  });

  // Play Satamatka game
  app.post("/api/satamatka/play", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (req.user!.isBlocked) {
        return res.status(403).json({ message: "Your account is blocked" });
      }

      const { marketId, betAmount, gameMode, prediction } = req.body;
      
      // Validate input
      if (!marketId || !betAmount || betAmount <= 0 || !gameMode || !prediction) {
        return res.status(400).json({ message: "Invalid input parameters" });
      }

      // Validate game mode
      if (!Object.values(SatamatkaGameMode).includes(gameMode)) {
        return res.status(400).json({ message: "Invalid game mode" });
      }

      // Check if market exists and is open
      const market = await storage.getSatamatkaMarket(marketId);
      if (!market) {
        return res.status(404).json({ message: "Market not found" });
      }

      if (market.status !== "open") {
        // Provide a more specific error message based on the actual market status
        const statusMessages = {
          "waiting": "Market is not yet active for betting",
          "closed": "Market is in 'Waiting Results' status and closed for betting",
          "resulted": "Market results have been declared",
          "settled": "Market has been settled"
        };
        
        const message = statusMessages[market.status as keyof typeof statusMessages] || 
                       "Market is not available for betting";
        
        return res.status(400).json({ message });
      }

      // Validate prediction based on game mode
      const validatePrediction = () => {
        switch (gameMode) {
          case SatamatkaGameMode.JODI:
            // For Jodi, prediction should be a two-digit number
            return /^[0-9]{2}$/.test(prediction);
          case SatamatkaGameMode.HARF:
            // For Harf, prediction can be:
            // - A single digit (original implementation)
            // - L followed by a digit (left/first position)
            // - R followed by a digit (right/second position)
            return /^[0-9]$/.test(prediction) || // Original format
                   /^L[0-9]$/.test(prediction) || // Left digit format
                   /^R[0-9]$/.test(prediction);   // Right digit format
          case SatamatkaGameMode.CROSSING:
            // For Crossing, prediction can now be:
            // - A single digit (original implementation)
            // - A string representing multiple digits to create combinations
            // - A format like "2,3,5" indicating selected digits for combination
            return /^[0-9]$/.test(prediction) || // Original format (single digit)
                   /^[0-9]+(,[0-9]+)+$/.test(prediction) || // Comma-separated digits
                   /^Combinations of [0-9,]+$/.test(prediction) || // Text description format
                   /^[0-9]+ digits \([0-9]+ combinations\)$/.test(prediction); // Summary format
          case SatamatkaGameMode.ODD_EVEN:
            // For Odd-Even, prediction should be "odd" or "even"
            return prediction === "odd" || prediction === "even";
          default:
            return false;
        }
      };

      if (!validatePrediction()) {
        return res.status(400).json({ message: "Invalid prediction for selected game mode" });
      }

      // Check user balance
      const user = await storage.getUser(req.user!.id);
      
      // Convert bet amount to paisa for balance comparison (user.balance is in paisa)
      const betAmountInPaisa = betAmount * 100;
      if (!user || user.balance < betAmountInPaisa) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // For now, we'll record the game but not determine the result yet
      // Results will be determined when the market results are published
      // For simplicity, we'll use a placeholder for the result
      const result = "pending";
      const payout = 0; // Will be calculated when results are published
      
      // Update user balance (deduct bet amount in paisa)
      const newBalance = user.balance - betAmountInPaisa;
      await storage.updateUserBalance(user.id, newBalance);

      // Record the game, storing the bet amount in paisa for consistency
      const game = await storage.createGame({
        userId: user.id,
        gameType: GameType.SATAMATKA,
        betAmount: betAmountInPaisa,  // Store in paisa like other game types
        prediction,
        result,
        payout,
        marketId,
        gameMode,
        balanceAfter: newBalance, // Track balance after this bet
      });

      // Return game info with updated user balance
      res.json({
        game: {
          ...game,
          // For frontend display, return the bet amount in rupees
          betAmount: betAmount
        },
        user: {
          ...user,
          balance: newBalance,
          password: undefined,
        },
      });
    } catch (err) {
      next(err);
    }
  });
  
  // Play multiple Satamatka bets at once (bulk betting)
  app.post("/api/satamatka/play-multiple", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (req.user!.isBlocked) {
        return res.status(403).json({ message: "Your account is blocked" });
      }

      const { marketId, gameMode, bets } = req.body;
      
      // Validate input
      if (!marketId || !gameMode || !bets || !Array.isArray(bets) || bets.length === 0) {
        return res.status(400).json({ message: "Invalid input parameters" });
      }

      // Validate game mode
      if (!Object.values(SatamatkaGameMode).includes(gameMode)) {
        return res.status(400).json({ message: "Invalid game mode" });
      }

      // Check if market exists and is open
      const market = await storage.getSatamatkaMarket(marketId);
      if (!market) {
        return res.status(404).json({ message: "Market not found" });
      }

      if (market.status !== "open") {
        // Provide a more specific error message based on the actual market status
        const statusMessages = {
          "waiting": "Market is not yet active for betting",
          "closed": "Market is in 'Waiting Results' status and closed for betting",
          "resulted": "Market results have been declared",
          "settled": "Market has been settled"
        };
        
        const message = statusMessages[market.status as keyof typeof statusMessages] || 
                       "Market is not available for betting";
        
        return res.status(400).json({ message });
      }
      
      // Validate each bet and calculate total amount
      let totalBetAmount = 0;
      const validatedBets = [];
      
      for (const bet of bets) {
        const { prediction, betAmount } = bet;
        
        if (!prediction || !betAmount || betAmount <= 0) {
          return res.status(400).json({ 
            message: "Invalid bet parameters", 
            detail: `Bet on ${prediction} with amount ${betAmount} is invalid`
          });
        }
        
        // Validate prediction based on game mode
        const isValidPrediction = (() => {
          switch (gameMode) {
            case SatamatkaGameMode.JODI:
              return /^[0-9]{2}$/.test(prediction);
            case SatamatkaGameMode.HARF:
              return /^[0-9]$/.test(prediction) || 
                     /^L[0-9]$/.test(prediction) || 
                     /^R[0-9]$/.test(prediction);
            case SatamatkaGameMode.CROSSING:
              return /^[0-9]$/.test(prediction) || 
                     /^[0-9][0-9]$/.test(prediction) ||
                     /^[0-9]+(,[0-9]+)+$/.test(prediction) || 
                     /^Combinations of [0-9,]+$/.test(prediction) || 
                     /^[0-9]+ digits \([0-9]+ combinations\)$/.test(prediction);
            case SatamatkaGameMode.ODD_EVEN:
              return prediction === "odd" || prediction === "even";
            default:
              return false;
          }
        })();
        
        if (!isValidPrediction) {
          return res.status(400).json({ 
            message: "Invalid prediction for selected game mode",
            detail: `Prediction '${prediction}' is not valid for game mode '${gameMode}'`
          });
        }
        
        // Add bet amount to total (ensuring all amounts are in paisa)
        totalBetAmount += betAmount;
        validatedBets.push({ prediction, betAmount });
      }
      
      // For total bet amount, we need to make sure we're using paisa consistently
      const totalBetAmountInPaisa = totalBetAmount;
      
      // Check user balance against the TOTAL amount for all bets
      const user = await storage.getUser(req.user!.id);
      if (!user || user.balance < totalBetAmountInPaisa) {
        return res.status(400).json({ 
          message: "Insufficient balance",
          detail: `Total bet amount ₹${totalBetAmountInPaisa / 100} exceeds available balance ₹${user?.balance ? user.balance / 100 : 0}`
        });
      }
      
      // Update user balance (deduct TOTAL bet amount in paisa)
      const newBalance = user.balance - totalBetAmountInPaisa;
      await storage.updateUserBalance(user.id, newBalance);
      
      // Record each game
      const createdGames = [];
      
      // Track decreasing balance for each individual bet
      let currentBalance = user.balance;
      
      for (const bet of validatedBets) {
        // Bet amounts are already in paisa from the client side
        const betAmountInPaisa = bet.betAmount;
        
        // Deduct this specific bet from the running balance
        currentBalance -= betAmountInPaisa;
        
        const game = await storage.createGame({
          userId: user.id,
          gameType: GameType.SATAMATKA,
          betAmount: betAmountInPaisa,  // Store in paisa like other game types
          prediction: bet.prediction,
          result: "pending",
          payout: 0,  // Will be calculated when results are published
          marketId,
          gameMode,
          balanceAfter: currentBalance, // Track balance after EACH bet is placed
        });
        
        // Add to list of created games (for response)
        createdGames.push({
          ...game,
          betAmount: betAmountInPaisa  // Return bet amount in paisa for consistency
        });
      }
      
      // Return all games with updated user balance
      res.json({
        games: createdGames,
        user: {
          ...user,
          balance: newBalance,
          password: undefined,
        },
        totalBetAmount: totalBetAmountInPaisa  // In paisa for consistency
      });
    } catch (err) {
      next(err);
    }
  });

  // Team Match Routes

  // Get all team matches
  app.get("/api/team-matches", async (req, res, next) => {
    try {
      const matches = await storage.getAllTeamMatches();
      res.json(matches);
    } catch (err) {
      next(err);
    }
  });

  // Get active team matches
  app.get("/api/team-matches/active", async (req, res, next) => {
    try {
      const matches = await storage.getActiveTeamMatches();
      res.json(matches);
    } catch (err) {
      next(err);
    }
  });

  // Get matches by category
  app.get("/api/team-matches/category/:category", async (req, res, next) => {
    try {
      const category = req.params.category;
      if (!Object.values(MatchCategory).includes(category as any)) {
        return res.status(400).json({ message: "Invalid category" });
      }
      
      const matches = await storage.getTeamMatchesByCategory(category);
      res.json(matches);
    } catch (err) {
      next(err);
    }
  });

  // Get a specific match
  app.get("/api/team-matches/:id", async (req, res, next) => {
    try {
      const matchId = Number(req.params.id);
      const match = await storage.getTeamMatch(matchId);
      
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      res.json(match);
    } catch (err) {
      next(err);
    }
  });

  // Create a new team match (admin only)
  app.post("/api/team-matches", requireRole(UserRole.ADMIN), async (req, res, next) => {
    try {
      console.log("Received match data:", JSON.stringify(req.body));
      
      // Parse and validate the input data directly from req.body
      const matchData = insertTeamMatchSchema.parse(req.body);
      console.log("Parsed match data:", JSON.stringify(matchData));
      
      const match = await storage.createTeamMatch(matchData);
      res.status(201).json(match);
    } catch (err) {
      console.error("Error creating match:", err);
      next(err);
    }
  });

  // Update match status
  app.patch("/api/team-matches/:id/status", requireRole(UserRole.ADMIN), async (req, res, next) => {
    try {
      const matchId = Number(req.params.id);
      const { status } = req.body;
      
      if (!status || !["open", "closed", "resulted"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const match = await storage.updateTeamMatchStatus(matchId, status);
      
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      res.json(match);
    } catch (err) {
      next(err);
    }
  });

  // Update match result
  app.patch("/api/team-matches/:id/result", requireRole(UserRole.ADMIN), async (req, res, next) => {
    try {
      const matchId = Number(req.params.id);
      const { result } = req.body;
      
      if (!result || !Object.values(TeamMatchResult).includes(result as any)) {
        return res.status(400).json({ message: "Invalid result" });
      }
      
      // Cannot set result to "pending"
      if (result === TeamMatchResult.PENDING) {
        return res.status(400).json({ message: "Cannot set result to pending" });
      }
      
      // Verify match exists
      const match = await storage.getTeamMatch(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      // Update match result
      const updatedMatch = await storage.updateTeamMatchResult(matchId, result);
      
      // Process all bets on this match
      const matchGames = await storage.getTeamMatchGamesByMatchId(matchId);
      for (const game of matchGames) {
        const user = await storage.getUser(game.userId);
        if (!user) continue;
        
        let payout = 0;
        
        // Check if prediction matches result
        if (game.prediction === result) {
          // Calculate payout based on odds
          let odds = 0;
          if (result === TeamMatchResult.TEAM_A) {
            odds = match.oddTeamA / 100; // Convert from integer (200) to decimal (2.00)
          } else if (result === TeamMatchResult.TEAM_B) {
            odds = match.oddTeamB / 100;
          } else if (result === TeamMatchResult.DRAW) {
            odds = match.oddDraw ? match.oddDraw / 100 : 3.00; // Default to 3.00 if not set
          }
          
          payout = Math.floor(game.betAmount * odds);
        }
        
        // Only add payout to user balance if they won (payout > 0)
        if (payout > 0) {
          // Calculate new user balance after applying payout
          const updatedBalance = user.balance + payout;
          
          // Update game payout, result, and balanceAfter in the games table
          await db.update(games)
            .set({ 
              payout,
              result, // Update the result in the games table to reflect the match result
              balanceAfter: game.balanceAfter! + payout // Add payout to the stored balance
            })
            .where(eq(games.id, game.id));
          
          // Update user balance
          await storage.updateUserBalance(user.id, updatedBalance);
        } else {
          // Just update the game result and payout, keep the original balanceAfter
          await db.update(games)
            .set({ 
              payout,
              result // Update the result in the games table to reflect the match result
            })
            .where(eq(games.id, game.id));
        }
      }
      
      res.json(updatedMatch);
    } catch (err) {
      next(err);
    }
  });

  // Update a team match
  app.patch("/api/team-matches/:id", requireRole(UserRole.ADMIN), async (req, res, next) => {
    try {
      const matchId = Number(req.params.id);
      
      // Verify match exists
      const match = await storage.getTeamMatch(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      // Create a partial schema for updates
      const updateMatchSchema = insertTeamMatchSchema.partial();
      
      // Validate and transform the update data
      const updateData = updateMatchSchema.parse(req.body);
      
      // Update the match
      const updatedMatch = await storage.updateTeamMatch(matchId, updateData);
      
      return res.json(updatedMatch);
    } catch (err) {
      next(err);
    }
  });

  // Place a bet on a team match
  app.post("/api/team-matches/:id/play", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (req.user!.isBlocked) {
        return res.status(403).json({ message: "Your account is blocked" });
      }
      
      const matchId = Number(req.params.id);
      const { prediction, betAmount } = req.body;
      
      // Validate input
      if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ message: "Invalid bet amount" });
      }
      
      if (!prediction || !["team_a", "team_b", "draw"].includes(prediction)) {
        return res.status(400).json({ message: "Invalid prediction" });
      }
      
      // Get the match
      const match = await storage.getTeamMatch(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      // Check if match is still open for betting
      if (match.status !== "open") {
        // Provide a more specific error message based on the actual match status
        const statusMessages = {
          "waiting": "Match is not yet active for betting",
          "closed": "Match is closed for betting",
          "resulted": "Match results have been declared"
        };
        
        const message = statusMessages[match.status as keyof typeof statusMessages] || 
                       "Match is not available for betting";
        
        return res.status(400).json({ message });
      }
      
      // Check if match time is in the future
      const now = new Date();
      if (new Date(match.matchTime) <= now) {
        return res.status(400).json({ message: "Match has already started" });
      }
      
      // Check user balance
      const user = await storage.getUser(req.user!.id);
      if (!user || user.balance < betAmount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }
      
      // Deduct bet amount from user balance
      const newBalance = user.balance - betAmount;
      await storage.updateUserBalance(user.id, newBalance);
      
      // Record the game (payout will be processed when result is set)
      const game = await storage.createGame({
        userId: user.id,
        gameType: GameType.TEAM_MATCH,
        betAmount,
        prediction,
        result: TeamMatchResult.PENDING, // Result will be updated when match ends
        payout: 0, // Payout will be updated when result is set
        matchId,
        balanceAfter: newBalance, // Track balance after this bet
      });
      
      // Return game info with updated user balance
      res.json({
        game,
        match,
        user: {
          ...user,
          balance: newBalance,
          password: undefined,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // Get games for a specific match
  app.get("/api/team-matches/:id/games", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      const matchId = Number(req.params.id);
      
      // Verify match exists
      const match = await storage.getTeamMatch(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      const games = await storage.getTeamMatchGamesByMatchId(matchId);
      res.json(games);
    } catch (err) {
      next(err);
    }
  });
  
  // Play toss on a team match
  app.post("/api/team-matches/:id/play-toss", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (req.user!.isBlocked) {
        return res.status(403).json({ message: "Your account is blocked" });
      }

      const matchId = Number(req.params.id);
      
      // Validate request body
      const playSchema = z.object({
        betAmount: z.number().min(10, "Minimum bet amount is 10"),
        betOn: z.enum([TeamMatchResult.TEAM_A, TeamMatchResult.TEAM_B], {
          errorMap: () => ({ message: "Bet must be on either team_a or team_b" })
        })
      });
      
      // Handle potential parsing errors (client may send string instead of number)
      const parsedBody = {
        ...req.body,
        betAmount: typeof req.body.betAmount === 'string' 
          ? parseInt(req.body.betAmount, 10)
          : req.body.betAmount
      };
      
      const validationResult = playSchema.safeParse(parsedBody);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid bet amount or prediction" 
        });
      }
      
      const { betAmount, betOn } = validationResult.data;
      
      // Get the team match
      const match = await storage.getTeamMatch(matchId);
      
      if (!match) {
        return res.status(404).json({ message: "Team match not found" });
      }
      
      if (match.status !== 'open') {
        // Provide a more specific error message based on the actual match status
        const statusMessages = {
          "waiting": "Match is not yet active for betting",
          "closed": "Match is closed for betting",
          "resulted": "Match results have been declared"
        };
        
        const message = statusMessages[match.status as keyof typeof statusMessages] || 
                       "Match is not available for betting";
        
        return res.status(400).json({ message });
      }
      
      // Check if user has sufficient balance
      const user = await storage.getUser(req.user!.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.balance < betAmount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }
      
      // Deduct the bet amount from user's balance
      await storage.updateUserBalance(user.id, user.balance - betAmount);
      
      // Calculate potential payout based on odds
      const odds = betOn === TeamMatchResult.TEAM_A ? match.oddTeamA : match.oddTeamB;
      const potentialPayout = Math.floor((betAmount * odds) / 100);
      
      // Calculate the new balance
      const newBalance = user.balance - betAmount;
      
      // Create a new game entry for this user's bet
      const userBet = {
        userId: user.id,
        gameType: GameType.CRICKET_TOSS,
        matchId: match.id,
        betAmount,
        prediction: betOn,
        gameData: {
          teamA: match.teamA,
          teamB: match.teamB,
          matchId: match.id,
          oddTeamA: match.oddTeamA,
          oddTeamB: match.oddTeamB,
          matchTime: match.matchTime,
          status: 'pending'
        },
        result: "pending",
        payout: potentialPayout,
        balanceAfter: newBalance // Track balance after this bet
      };
      
      const createdBet = await storage.createGame(userBet);
      
      res.status(201).json({
        message: "Bet placed successfully",
        game: createdBet,
        user: {
          ...user,
          balance: newBalance,
          password: undefined,
        }
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Cricket Toss Betting Statistics
  app.get("/api/cricket-toss-stats", async (req, res) => {
    try {
      console.log("==== Starting Cricket Toss Stats API ====");
      
      // Manually construct hardcoded stats for testing/development
      // Get real cricket toss games from the database
      console.log("Getting cricket toss games from database");
      
      const sql = `
        SELECT g.*, 
               u.username as user_username 
        FROM games g
        JOIN users u ON g.user_id = u.id
        WHERE g.game_type = 'cricket_toss'
        ORDER BY g.id
      `;
      
      const result = await db.execute(sql);
      console.log(`Found ${result.rows.length} cricket toss games in DB`);
      
      // Look at the data structure
      if (result.rows.length > 0) {
        console.log("First cricket toss row structure:", 
          JSON.stringify(result.rows[0], null, 2));
      }
      
      // Group games by match ID
      const matchesMap = new Map();
      
      // First, create entries for each unique match
      for (const game of result.rows) {
        try {
          // Parse the game_data column
          const gameData = typeof game.game_data === 'string' 
            ? JSON.parse(game.game_data) 
            : game.game_data;
          
          if (!gameData) continue;
          
          const matchId = gameData.matchId || null;
          if (!matchId) continue;
          
          // Skip if we've already processed this match
          if (matchesMap.has(matchId)) continue;
          
          matchesMap.set(matchId, {
            matchId,
            matchName: `${gameData.teamA || 'Team A'} vs ${gameData.teamB || 'Team B'}`,
            startTime: gameData.matchTime || new Date().toISOString(),
            status: gameData.status || 'unknown',
            teamA: gameData.teamA || 'Team A',
            teamB: gameData.teamB || 'Team B',
            teamAGames: [],
            teamBGames: [],
            drawGames: []
          });
          
          console.log(`Added match ${matchId}: ${gameData.teamA} vs ${gameData.teamB}`);
        } catch (e) {
          console.log(`Error parsing game data for game ${game.id}:`, e);
          continue;
        }
      }
      
      console.log(`Created ${matchesMap.size} unique cricket matches`);
      
      // Now assign bets to the appropriate teams
      for (const game of result.rows) {
        try {
          // Skip games with zero bet amount (templates)
          if (game.bet_amount === 0) continue;
          
          // Parse the game_data column
          const gameData = typeof game.game_data === 'string' 
            ? JSON.parse(game.game_data) 
            : game.game_data;
          
          if (!gameData) continue;
          
          const matchId = gameData.matchId || null;
          if (!matchId || !matchesMap.has(matchId)) continue;
          
          const match = matchesMap.get(matchId);
          
          // Process the bet
          console.log(`Processing bet for game ${game.id}, prediction: ${game.prediction}`);
          
          // Simplified game object for storing
          const simplifiedGame = {
            id: game.id,
            userId: game.user_id,
            username: game.user_username,
            betAmount: game.bet_amount,
            prediction: game.prediction,
            payout: game.payout,
            result: game.result
          };
          
          // Add to appropriate team based on prediction
          const prediction = game.prediction || "";
          if (prediction === "team_a") {
            match.teamAGames.push(simplifiedGame);
            console.log(`Added game ${game.id} to team A (${match.teamA})`);
          } else if (prediction === "team_b") {
            match.teamBGames.push(simplifiedGame);
            console.log(`Added game ${game.id} to team B (${match.teamB})`);
          } else if (prediction === "draw") {
            match.drawGames.push(simplifiedGame);
            console.log(`Added game ${game.id} to Draw option`);
          } else {
            console.log(`Unknown prediction "${prediction}" for game ${game.id}`);
          }
        } catch (e) {
          console.log(`Error processing bet for game ${game.id}:`, e);
          continue;
        }
      }
      
      // Filter for subadmin (commented out for testing)
      // if (req.user?.role === UserRole.SUBADMIN) {
      //   const assignedUsers = await storage.getUsersByAssignedTo(req.user.id);
      //   const assignedUserIds = assignedUsers.map(user => user.id);
      //   
      //   for (const [matchId, match] of matchesMap.entries()) {
      //     match.teamAGames = match.teamAGames.filter(game => assignedUserIds.includes(game.userId));
      //     match.teamBGames = match.teamBGames.filter(game => assignedUserIds.includes(game.userId));
      //     match.drawGames = match.drawGames.filter(game => assignedUserIds.includes(game.userId));
      //   }
      // }
      
      // Format the results for the client
      const matchStats = [];
      
      for (const [_, match] of matchesMap.entries()) {
        // Calculate team A stats
        const teamAUniqueUsers = new Set(match.teamAGames.map(game => game.userId)).size;
        const teamATotalBets = match.teamAGames.length;
        const teamATotalAmount = match.teamAGames.reduce((sum, game) => sum + (game.betAmount || 0), 0);
        const teamAPotentialWinAmount = match.teamAGames.reduce((sum, game) => sum + (game.payout || 0), 0);
        
        // Calculate team B stats
        const teamBUniqueUsers = new Set(match.teamBGames.map(game => game.userId)).size;
        const teamBTotalBets = match.teamBGames.length;
        const teamBTotalAmount = match.teamBGames.reduce((sum, game) => sum + (game.betAmount || 0), 0);
        const teamBPotentialWinAmount = match.teamBGames.reduce((sum, game) => sum + (game.payout || 0), 0);
        
        // Create the stats object
        const matchStat = {
          matchId: match.matchId,
          matchName: match.matchName,
          startTime: match.startTime,
          status: match.status,
          teams: [
            {
              teamName: match.teamA,
              totalBets: teamATotalBets,
              totalAmount: teamATotalAmount,
              potentialWinAmount: teamAPotentialWinAmount,
              uniqueUsers: teamAUniqueUsers
            },
            {
              teamName: match.teamB,
              totalBets: teamBTotalBets,
              totalAmount: teamBTotalAmount,
              potentialWinAmount: teamBPotentialWinAmount,
              uniqueUsers: teamBUniqueUsers
            }
          ]
        };
        
        // Add draw stats if any
        if (match.drawGames.length > 0) {
          const drawUniqueUsers = new Set(match.drawGames.map(game => game.userId)).size;
          const drawTotalAmount = match.drawGames.reduce((sum, game) => sum + (game.betAmount || 0), 0);
          const drawPotentialWinAmount = match.drawGames.reduce((sum, game) => sum + (game.payout || 0), 0);
          
          matchStat.teams.push({
            teamName: "Draw",
            totalBets: match.drawGames.length,
            totalAmount: drawTotalAmount,
            potentialWinAmount: drawPotentialWinAmount,
            uniqueUsers: drawUniqueUsers
          });
        }
        
        // Only include matches that have bets
        if (teamATotalBets > 0 || teamBTotalBets > 0 || match.drawGames.length > 0) {
          matchStats.push(matchStat);
        }
      }
      
      console.log(`Returning ${matchStats.length} cricket matches with betting activity`);
      
      res.json(matchStats);
    } catch (err) {
      console.error("Error in cricket toss stats API:", err);
      // Return empty array instead of error
      res.json([]);
    }
  });
  
  // Sports Match Betting Statistics
  app.get("/api/sports/stats", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      // Get active team matches for sports
      const matches = await storage.getActiveTeamMatches();
      
      // Filter matches for sports categories (e.g., "football", "basketball", "ipl")
      const sportsMatches = matches.filter(match => 
        match.category !== "cricket" && match.category !== undefined
      );
      
      // For each match, get games and calculate stats
      const matchStats = await Promise.all(sportsMatches.map(async (match) => {
        const games = await storage.getTeamMatchGamesByMatchId(match.id);
        
        // If subadmin, filter only their assigned users' games
        let filteredGames = games;
        if (req.user?.role === UserRole.SUBADMIN) {
          const assignedUsers = await storage.getUsersByAssignedTo(req.user!.id);
          const assignedUserIds = assignedUsers.map(user => user.id);
          filteredGames = games.filter(game => assignedUserIds.includes(game.userId));
        }
        
        // Count games for each team
        const teamA = match.teamA;
        const teamB = match.teamB;
        
        const teamAGames = filteredGames.filter(game => game.prediction === teamA);
        const teamBGames = filteredGames.filter(game => game.prediction === teamB);
        
        // Get unique users
        const teamAUniqueUsers = new Set(teamAGames.map(game => game.userId)).size;
        const teamBUniqueUsers = new Set(teamBGames.map(game => game.userId)).size;
        
        // Calculate totals
        const teamATotalBets = teamAGames.length;
        const teamBTotalBets = teamBGames.length;
        
        const teamATotalAmount = teamAGames.reduce((sum, game) => sum + game.betAmount, 0);
        const teamBTotalAmount = teamBGames.reduce((sum, game) => sum + game.betAmount, 0);
        
        const teamAPotentialWinAmount = teamAGames.reduce((sum, game) => sum + (game.payout || 0), 0);
        const teamBPotentialWinAmount = teamBGames.reduce((sum, game) => sum + (game.payout || 0), 0);
        
        return {
          matchId: match.id,
          matchName: `${match.teamA} vs ${match.teamB}`,
          category: match.category,
          startTime: match.matchTime,
          teams: [
            {
              teamName: match.teamA,
              totalBets: teamATotalBets,
              totalAmount: teamATotalAmount,
              potentialWinAmount: teamAPotentialWinAmount,
              uniqueUsers: teamAUniqueUsers
            },
            {
              teamName: match.teamB,
              totalBets: teamBTotalBets,
              totalAmount: teamBTotalAmount,
              potentialWinAmount: teamBPotentialWinAmount,
              uniqueUsers: teamBUniqueUsers
            }
          ]
        };
      }));
      
      res.json(matchStats);
    } catch (err) {
      next(err);
    }
  });
  
  // Jantri Management Routes
  app.get("/api/jantri/stats", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      // Get active markets
      const markets = await storage.getActiveSatamatkaMarkets();
      console.log("Number of active markets found:", markets.length);
      
      // Generate all numbers from 00 to 99
      const allNumbers = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));
      
      let jantriStats = [];
      
      // For each market, get games and calculate stats
      if (markets.length > 0) {
        jantriStats = await Promise.all(markets.map(async (market) => {
          const games = await storage.getSatamatkaGamesByMarketId(market.id);
          console.log(`Market ${market.id} (${market.name}): Found ${games.length} games`);
          
          // If subadmin, filter only their assigned users' games
          let filteredGames = games;
          if (req.user?.role === UserRole.SUBADMIN) {
            const assignedUsers = await storage.getUsersByAssignedTo(req.user!.id);
            const assignedUserIds = assignedUsers.map(user => user.id);
            filteredGames = games.filter(game => assignedUserIds.includes(game.userId));
          }
          
          // Calculate stats for each number
          const numberStats = allNumbers.map(number => {
            // Filter games for this number
            const numberGames = filteredGames.filter(game => {
              const matchesPrediction = game.prediction === number;
              const matchesGameType = game.gameType === "satamatka" || game.gameType.includes("satamatka");
              return matchesPrediction && matchesGameType;
            });
            
            // Group games by gameMode
            const gameModeGroups: Record<string, typeof numberGames> = {};
            
            // Default to "jodi" for backward compatibility if gameMode is not set
            numberGames.forEach(game => {
              const gameMode = game.gameMode || SatamatkaGameMode.JODI;
              if (!gameModeGroups[gameMode]) {
                gameModeGroups[gameMode] = [];
              }
              gameModeGroups[gameMode].push(game);
            });
            
            // Get unique users across all game modes
            const uniqueUsers = new Set(numberGames.map(game => game.userId)).size;
            
            // Calculate totals
            const totalBets = numberGames.length;
            const totalAmount = numberGames.reduce((sum, game) => sum + game.betAmount, 0);
            const potentialWinAmount = numberGames.reduce((sum, game) => sum + game.payout, 0);
            
            // Determine the most common gameMode for this number
            let dominantGameMode = SatamatkaGameMode.JODI; // Default
            let maxGamesCount = 0;
            
            Object.entries(gameModeGroups).forEach(([mode, games]) => {
              if (games.length > maxGamesCount) {
                maxGamesCount = games.length;
                dominantGameMode = mode;
              }
            });
            
            return {
              number,
              totalBets,
              totalAmount,
              potentialWinAmount,
              uniqueUsers,
              gameMode: dominantGameMode // Add gameMode to the response
            };
          });
          
          return {
            marketId: market.id,
            marketName: market.name,
            numbers: numberStats
          };
        }));
      }
      
      // If there are no markets or all responses are empty, create a default response with 00-99 numbers
      if (jantriStats.length === 0) {
        console.log("No active markets found, creating default Jantri stats with empty values");
        
        // Create a default market with empty stats for all numbers
        const defaultNumberStats = allNumbers.map(number => ({
          number,
          totalBets: 0,
          totalAmount: 0,
          potentialWinAmount: 0,
          uniqueUsers: 0,
          gameMode: SatamatkaGameMode.JODI
        }));
        
        jantriStats = [{
          marketId: 0, // Default market ID
          marketName: "No Active Markets",
          numbers: defaultNumberStats
        }];
      }
      
      console.log("===== JANTRI STATS RESPONSE =====");
      console.log("Number of markets returned:", jantriStats.length);
      console.log("Numbers count in first market:", jantriStats[0].numbers.length);
      console.log("Numbers with bets:", jantriStats[0].numbers.filter(n => n.totalBets > 0).length);
      
      res.json(jantriStats);
    } catch (err) {
      console.error("Error in /api/jantri/stats:", err);
      next(err);
    }
  });

  // Settings routes
  // System Settings
  app.get("/api/settings", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      const settingType = req.query.type as string;
      
      if (!settingType) {
        return res.status(400).json({ message: "Setting type is required" });
      }
      
      const settings = await storage.getSystemSettingsByType(settingType);
      res.json(settings);
    } catch (err) {
      next(err);
    }
  });
  
  app.post("/api/settings", requireRole([UserRole.ADMIN]), async (req, res, next) => {
    try {
      const { settingType, settingKey, settingValue } = req.body;
      
      if (!settingType || !settingKey || !settingValue) {
        return res.status(400).json({ message: "settingType, settingKey, and settingValue are required" });
      }
      
      const setting = await storage.upsertSystemSetting(settingType, settingKey, settingValue);
      res.json(setting);
    } catch (err) {
      next(err);
    }
  });
  
  // Game Odds Settings
  app.get("/api/game-odds", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      const gameType = req.query.gameType as string;
      
      if (!gameType) {
        return res.status(400).json({ message: "Game type is required" });
      }
      
      const odds = await storage.getGameOdds(gameType);
      res.json(odds);
    } catch (err) {
      next(err);
    }
  });
  
  // Get player-specific game odds endpoint
  // This returns the odds applicable to a player based on their assigned subadmin
  app.get("/api/game-odds/player", async (req, res, next) => {
    try {
      // Must be logged in to use this endpoint
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const gameType = req.query.gameType as string || '';
      
      if (!gameType) {
        return res.status(400).json({ message: "Game type is required" });
      }
      
      // Get the requesting user's details
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      let odds;
      
      // If player is assigned to a subadmin, get custom odds if available
      if (user.assignedTo) {
        // First try to get subadmin-specific odds
        const subadminOdds = await storage.getGameOddsBySubadmin(user.assignedTo, gameType);
        
        if (subadminOdds && subadminOdds.length > 0) {
          // Found subadmin-specific odds
          odds = subadminOdds;
          console.log(`Using subadmin (${user.assignedTo}) odds for player ${userId}, gameType ${gameType}:`, odds);
        } else {
          // Fall back to admin odds
          odds = await storage.getGameOdds(gameType);
          console.log(`Using admin odds for player ${userId}, gameType ${gameType} (subadmin ${user.assignedTo} has no custom odds):`, odds);
        }
      } else {
        // If player is not assigned to any subadmin, use regular platform odds
        odds = await storage.getGameOdds(gameType);
        console.log(`Using platform odds for player ${userId}, gameType ${gameType} (not assigned to any subadmin):`, odds);
      }
      
      res.json(odds);
    } catch (err) {
      console.error("Error fetching player odds:", err);
      next(err);
    }
  });
  
  // Get admin odds endpoint
  // This array should include 'team_match_draw' for the draw multiplier feature
const DEFAULT_GAME_TYPES = [
  'team_match',
  'team_match_draw',
  'cricket_toss',
  'coin_flip',
  'satamatka_jodi',
  'satamatka_harf',
  'satamatka_odd_even',
  'satamatka_crossing'
];

app.get("/api/odds/admin", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      // Fetch all admin odds
      const adminOdds = [];
      
      for (const gameType of DEFAULT_GAME_TYPES) {
        const odds = await storage.getGameOdds(gameType);
        const adminOdd = odds.find(odd => odd.setByAdmin === true);
        
        if (adminOdd) {
          // Convert from integer (stored as * 100) to decimal for display
          adminOdds.push({
            ...adminOdd,
            oddValue: adminOdd.oddValue / 100
          });
        } else {
          // Add default odds if no admin odds are set
          adminOdds.push({
            gameType,
            oddValue: gameType.includes('satamatka_jodi') ? 90 : (gameType.includes('satamatka_harf') ? 9 : (gameType.includes('satamatka_crossing') ? 95 : 1.9)),
            setByAdmin: true
          });
        }
      }
      
      res.json(adminOdds);
    } catch (err) {
      next(err);
    }
  });
  
  // Post endpoint for subadmin odds
  app.post("/api/odds/subadmin/:subadminId", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      const subadminId = parseInt(req.params.subadminId);
      const { odds } = req.body;
      
      if (!Array.isArray(odds)) {
        return res.status(400).json({ message: "odds must be an array of odds settings" });
      }

      // Check if the user is authorized to access this resource
      if (req.user.role === UserRole.SUBADMIN && req.user.id !== subadminId) {
        return res.status(403).json({ message: "Unauthorized: You can only update your own odds settings" });
      }
      
      // Verify the subadmin exists and is actually a subadmin
      const subadmin = await storage.getUser(subadminId);
      if (!subadmin || subadmin.role !== UserRole.SUBADMIN) {
        return res.status(400).json({ message: "Invalid subadmin ID" });
      }
      
      const results = await Promise.all(
        odds.map(async (odd) => {
          if (!odd.gameType || odd.oddValue === undefined) {
            return { error: "gameType and oddValue are required", gameType: odd.gameType };
          }
          
          // Convert decimal odds to integer by multiplying by 100 for storage
          return storage.upsertGameOdd(
            odd.gameType,
            odd.oddValue * 100, // Multiply by 100 to store as integer
            false, // Not set by admin, but by subadmin
            subadminId
          );
        })
      );
      
      res.json({ 
        success: true, 
        message: "Odds settings updated successfully",
        results 
      });
    } catch (err) {
      next(err);
    }
  });
  
  // Get subadmin odds endpoint
  app.get("/api/odds/subadmin/:subadminId?", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      // If subadminId is not provided in path, use the current user's ID (if subadmin)
      let subadminId = req.params.subadminId ? Number(req.params.subadminId) : 
                        req.user.role === UserRole.SUBADMIN ? req.user.id : null;
                        
      if (!subadminId) {
        return res.status(400).json({ message: "Subadmin ID is required" });
      }
      
      // Check if the user is authorized to access this resource
      if (req.user.role === UserRole.SUBADMIN && req.user.id !== subadminId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Define default game types
      const gameTypes = [
        'team_match',
        'cricket_toss',
        'coin_flip',
        'satamatka_jodi',
        'satamatka_harf',
        'satamatka_odd_even',
        'satamatka_crossing'
      ];
      
      // Get the subadmin odds
      const subadminOddsFromDB = await storage.getGameOddsBySubadmin(subadminId);
      
      // Get admin odds for fallback
      const adminOddsResponse = await storage.getGameOdds('');
      const adminOdds = adminOddsResponse.filter(odd => odd.setByAdmin === true);
      
      // Create a complete set of odds using subadmin specific odds where available, falling back to admin odds
      const completeOdds = [];
      
      // Use the default game types array
      const gameTypesToUse = DEFAULT_GAME_TYPES;
      
      for (const gameType of gameTypesToUse) {
        // Check if subadmin has specific odds for this game type
        const subadminOdd = subadminOddsFromDB.find(odd => odd.gameType === gameType);
        
        if (subadminOdd) {
          // Use subadmin specific odds, but convert from integer (stored as * 100) to decimal
          completeOdds.push({
            ...subadminOdd,
            oddValue: subadminOdd.oddValue / 100
          });
        } else {
          // Try to use admin odds as fallback
          const adminOdd = adminOdds.find(odd => odd.gameType === gameType);
          
          if (adminOdd) {
            // Use admin odds, but mark it as belonging to this subadmin
            // Convert from integer (stored as * 100) to decimal
            completeOdds.push({
              gameType: adminOdd.gameType,
              oddValue: adminOdd.oddValue / 100,
              setByAdmin: false,
              subadminId
            });
          } else {
            // No admin odds either, use default values
            completeOdds.push({
              gameType,
              oddValue: gameType.includes('satamatka_jodi') ? 90 : (gameType.includes('satamatka_harf') ? 9 : (gameType.includes('satamatka_crossing') ? 95 : 1.9)),
              setByAdmin: false,
              subadminId
            });
          }
        }
      }
      
      res.json(completeOdds);
    } catch (err) {
      next(err);
    }
  });
  
  app.get("/api/game-odds/subadmin/:subadminId", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      const subadminId = Number(req.params.subadminId);
      const gameType = req.query.gameType as string;
      
      // Check if the user is authorized to access this resource
      if (req.user.role === UserRole.SUBADMIN && req.user.id !== subadminId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const odds = await storage.getGameOddsBySubadmin(subadminId, gameType);
      res.json(odds);
    } catch (err) {
      next(err);
    }
  });
  
  app.post("/api/game-odds", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      const { gameType, oddValue, setByAdmin, subadminId } = req.body;
      
      if (!gameType || oddValue === undefined) {
        return res.status(400).json({ message: "gameType and oddValue are required" });
      }
      
      // Admin can set odds for anyone, subadmin can only set their own odds
      if (req.user.role === UserRole.SUBADMIN) {
        if (setByAdmin === true) {
          return res.status(403).json({ message: "Subadmins cannot set admin odds" });
        }
        
        if (subadminId && subadminId !== req.user.id) {
          return res.status(403).json({ message: "Subadmins can only set their own odds" });
        }
      }
      
      // Convert decimal to integer by multiplying by 100 for storage
      const odds = await storage.upsertGameOdd(
        gameType, 
        oddValue * 100, // Multiply by 100 to store as integer
        req.user.role === UserRole.ADMIN ? (setByAdmin || true) : false,
        req.user.role === UserRole.ADMIN ? subadminId : req.user.id
      );
      
      res.json(odds);
    } catch (err) {
      next(err);
    }
  });
  
  // Subadmin Commission routes
  app.get("/api/commissions/subadmin/:subadminId?", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      // If subadminId is not provided in path, use the current user's ID (if subadmin)
      let subadminId = req.params.subadminId ? Number(req.params.subadminId) : 
                        req.user.role === UserRole.SUBADMIN ? req.user.id : null;
                        
      if (!subadminId) {
        return res.status(400).json({ message: "Subadmin ID is required" });
      }
      
      // Check if the user is authorized to access this resource
      if (req.user.role === UserRole.SUBADMIN && req.user.id !== subadminId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      // Define default game types
      const gameTypes = [
        'team_match',
        'cricket_toss',
        'coin_flip',
        'satamatka_jodi',
        'satamatka_harf',
        'satamatka_odd_even',
        'satamatka_crossing'
      ];
      
      // Get the subadmin commissions from the database
      const commissionsFromDB = await storage.getSubadminCommissions(subadminId);
      
      // Create a complete set of commissions, using defaults where needed
      const completeCommissions = [];
      
      // Get platform default commission rates from system settings
      const platformDefaultSettings = await Promise.all(
        gameTypes.map(gameType => 
          storage.getSystemSetting('commission_default', gameType)
        )
      );
      
      // Map the settings to a more usable format
      const platformDefaultRates: {[key: string]: number} = {};
      platformDefaultSettings.forEach((setting, index) => {
        if (setting) {
          platformDefaultRates[gameTypes[index]] = parseInt(setting.settingValue);
        }
      });
      
      // Fallback default commission rates if no system settings exist
      const fallbackDefaultRates = {
        'team_match': 10,
        'cricket_toss': 10,
        'coin_flip': 10,
        'satamatka_jodi': 8,
        'satamatka_harf': 8,
        'satamatka_odd_even': 10,
        'satamatka_crossing': 8
      };
      
      for (const gameType of gameTypes) {
        // Check if subadmin has specific commission for this game type
        const commission = commissionsFromDB.find(c => c.gameType === gameType);
        
        if (commission) {
          // Use existing commission
          completeCommissions.push(commission);
        } else {
          // Use platform default commission or fallback if not set
          const defaultRate = platformDefaultRates[gameType] !== undefined
            ? platformDefaultRates[gameType]
            : fallbackDefaultRates[gameType as keyof typeof fallbackDefaultRates] || 10;
            
          completeCommissions.push({
            gameType,
            subadminId,
            commissionRate: defaultRate
          });
        }
      }
      
      res.json(completeCommissions);
    } catch (err) {
      next(err);
    }
  });
  
  // Create a subadmin with commission settings in one operation
  app.post("/api/subadmin/create-with-commissions", requireRole([UserRole.ADMIN]), async (req, res, next) => {
    try {
      const { username, password, commissions } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // First create the subadmin
      const hashPassword = require('./auth').hashPassword;
      const hashedPassword = await hashPassword(password);
      
      const newSubadmin = await storage.createUser({
        username,
        password: hashedPassword,
        role: UserRole.SUBADMIN,
      });
      
      // If commission settings are provided, set them up for the newly created subadmin
      if (commissions) {
        const subadminId = newSubadmin.id;
        
        // Set up commission rates for different game types
        const commissionPromises = [];
        
        if (commissions.satamatka_jodi) {
          commissionPromises.push(
            storage.upsertSubadminCommission(
              subadminId, 
              "satamatka_jodi", 
              Math.round(parseFloat(commissions.satamatka_jodi) * 100)
            )
          );
        }
        
        if (commissions.satamatka_harf) {
          commissionPromises.push(
            storage.upsertSubadminCommission(
              subadminId, 
              "satamatka_harf", 
              Math.round(parseFloat(commissions.satamatka_harf) * 100)
            )
          );
        }
        
        if (commissions.satamatka_crossing) {
          commissionPromises.push(
            storage.upsertSubadminCommission(
              subadminId, 
              "satamatka_crossing", 
              Math.round(parseFloat(commissions.satamatka_crossing) * 100)
            )
          );
        }
        
        if (commissions.satamatka_odd_even) {
          commissionPromises.push(
            storage.upsertSubadminCommission(
              subadminId, 
              "satamatka_odd_even", 
              Math.round(parseFloat(commissions.satamatka_odd_even) * 100)
            )
          );
        }
        
        await Promise.all(commissionPromises);
      }
      
      // Remove password from response
      const { password: _, ...subadminWithoutPassword } = newSubadmin;
      
      res.status(201).json({
        ...subadminWithoutPassword,
        message: "Subadmin created successfully with commission settings"
      });
    } catch (err) {
      next(err);
    }
  });
  
  // Set individual subadmin commission
  app.post("/api/commissions/subadmin", requireRole([UserRole.ADMIN]), async (req, res, next) => {
    try {
      const { subadminId, gameType, commissionRate } = req.body;
      
      if (!subadminId || !gameType || commissionRate === undefined) {
        return res.status(400).json({ message: "subadminId, gameType, and commissionRate are required" });
      }
      
      // Verify the subadmin exists and is actually a subadmin
      const subadmin = await storage.getUser(subadminId);
      if (!subadmin || subadmin.role !== UserRole.SUBADMIN) {
        return res.status(400).json({ message: "Invalid subadmin ID" });
      }
      
      const commission = await storage.upsertSubadminCommission(subadminId, gameType, commissionRate);
      res.json(commission);
    } catch (err) {
      next(err);
    }
  });
  
  // Get platform-wide default commission rates
  app.get("/api/commissions/default", requireRole([UserRole.ADMIN]), async (req, res, next) => {
    try {
      // Define default game types
      const gameTypes = [
        'team_match',
        'cricket_toss',
        'coin_flip',
        'satamatka_jodi',
        'satamatka_harf',
        'satamatka_odd_even',
        'satamatka_crossing'
      ];
      
      // Get platform default commission rates from system settings
      const platformDefaultSettings = await Promise.all(
        gameTypes.map(gameType => 
          storage.getSystemSetting('commission_default', gameType)
        )
      );
      
      // Map the settings to a more usable format
      const defaultRates: {[key: string]: number} = {};
      platformDefaultSettings.forEach((setting, index) => {
        if (setting) {
          // Convert from integer (stored value) to decimal percentage for client display
          defaultRates[gameTypes[index]] = parseInt(setting.settingValue) / 100;
        }
      });
      
      // Fallback default commission rates if no system settings exist
      const fallbackDefaultRates = {
        'team_match': 10,
        'cricket_toss': 10,
        'coin_flip': 10,
        'satamatka_jodi': 8,
        'satamatka_harf': 8,
        'satamatka_odd_even': 10,
        'satamatka_crossing': 8
      };
      
      // Merge the found settings with fallbacks where needed
      const completeDefaultRates: {[key: string]: number} = {};
      
      for (const gameType of gameTypes) {
        completeDefaultRates[gameType] = defaultRates[gameType] !== undefined
          ? defaultRates[gameType]
          : fallbackDefaultRates[gameType as keyof typeof fallbackDefaultRates] / 100;
      }
      
      res.json(completeDefaultRates);
    } catch (err) {
      next(err);
    }
  });
  
  // Set platform-wide default commission rates for all subadmins
  app.post("/api/commissions/default", requireRole([UserRole.ADMIN]), async (req, res, next) => {
    try {
      const { defaultRates } = req.body;
      
      if (!defaultRates || typeof defaultRates !== 'object') {
        return res.status(400).json({ message: "defaultRates object is required with game types and rates" });
      }
      
      const results = [];
      
      // Save each default commission rate as a system setting
      for (const [gameType, rate] of Object.entries(defaultRates)) {
        if (rate === undefined) continue;
        
        // Convert rate to integer (store as integer for precision)
        const rateAsInt = Math.round(parseFloat(rate as string) * 100);
        
        const setting = await storage.upsertSystemSetting(
          "commission_default", 
          gameType,
          rateAsInt.toString()
        );
        
        results.push({
          gameType,
          rate: rateAsInt / 100,
          setting
        });
      }
      
      res.json({ 
        success: true, 
        message: "Default commission rates saved successfully",
        results 
      });
    } catch (err) {
      next(err);
    }
  });
  
  // Update multiple commission settings for a subadmin at once
  app.post("/api/commissions/subadmin/:subadminId", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      const subadminId = parseInt(req.params.subadminId);
      const { commissions } = req.body;
      
      if (!Array.isArray(commissions)) {
        return res.status(400).json({ message: "commissions must be an array of commission settings" });
      }

      // Check if the user is authorized to access this resource
      if (req.user.role === UserRole.SUBADMIN && req.user.id !== subadminId) {
        return res.status(403).json({ message: "Unauthorized: You can only update your own commission settings" });
      }
      
      // Verify the subadmin exists and is actually a subadmin
      const subadmin = await storage.getUser(subadminId);
      if (!subadmin || subadmin.role !== UserRole.SUBADMIN) {
        return res.status(400).json({ message: "Invalid subadmin ID" });
      }
      
      const results = await Promise.all(
        commissions.map(async (commission) => {
          if (!commission.gameType || commission.commissionRate === undefined) {
            return { error: "gameType and commissionRate are required", gameType: commission.gameType };
          }
          
          // Convert rate to integer (store as integer for precision)
          const rateAsInt = Math.round(parseFloat(commission.commissionRate) * 100);
          
          return storage.upsertSubadminCommission(
            subadminId,
            commission.gameType,
            rateAsInt
          );
        })
      );
      
      res.json({ 
        success: true, 
        message: "Commission settings updated successfully",
        results 
      });
    } catch (err) {
      next(err);
    }
  });
  
  // User Discount routes
  app.get("/api/discounts/user/:userId", requireRole([UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      const userId = Number(req.params.userId);
      const subadminId = req.user.id;
      
      // Verify the user is assigned to this subadmin
      const user = await storage.getUser(userId);
      if (!user || user.assignedTo !== subadminId) {
        return res.status(403).json({ message: "User is not assigned to you" });
      }
      
      const discounts = await storage.getUserDiscounts(userId, subadminId);
      res.json(discounts);
    } catch (err) {
      next(err);
    }
  });
  
  app.post("/api/discounts/user", requireRole([UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      const { userId, gameType, discountRate } = req.body;
      const subadminId = req.user.id;
      
      if (!userId || !gameType || discountRate === undefined) {
        return res.status(400).json({ message: "userId, gameType, and discountRate are required" });
      }
      
      // Verify the user is assigned to this subadmin
      const user = await storage.getUser(userId);
      if (!user || user.assignedTo !== subadminId) {
        return res.status(403).json({ message: "User is not assigned to you" });
      }
      
      const discount = await storage.upsertUserDiscount(subadminId, userId, gameType, discountRate);
      res.json(discount);
    } catch (err) {
      next(err);
    }
  });
  
  // Admin endpoint to manually seed cricket toss games
  app.post("/api/admin/seed-cricket-toss", requireRole([UserRole.ADMIN]), async (req, res, next) => {
    try {
      // Call seedCricketTossGames directly from storage
      await storage.seedCricketTossGames();
      res.json({ message: "Cricket toss games seeded successfully" });
    } catch (err) {
      next(err);
    }
  });

  // Register cricket toss API routes
  await import('./cricket-toss-api').then((module) => {
    app.use('/api/cricket-toss', module.default);
  });

  // Register wallet system routes
  await import('./wallet-system').then(({ setupWalletRoutes }) => {
    setupWalletRoutes(app);
  });
  
  // Register deposit discount routes
  app.use('/api/subadmin', depositDiscountRouter);
  
  // Serve login test page for debugging
  app.get("/login-test", (_req, res) => {
    res.sendFile("login-test.html", { root: process.cwd() });
  });
  
  // System reset endpoint (admin only)
  app.post("/api/admin/reset-system", requireRole([UserRole.ADMIN]), async (req, res) => {
    try {
      const { resetType, confirmationCode } = req.body;
      
      // Verify confirmation code
      if (confirmationCode !== "RESET_CONFIRM") {
        return res.status(400).json({ message: "Invalid confirmation code. Type RESET_CONFIRM to proceed." });
      }
      
      // Execute system reset based on type
      if (resetType === "all") {
        // Reset all data including balances
        await db.delete(schema.transactions);
        await db.delete(schema.games);
        await db.delete(schema.satamatkaMarkets);
        await db.delete(schema.teamMatches);
        await db.delete(schema.walletRequests);
        await db.delete(schema.gameOdds);
        
        // Reset user balances to 0 except admin
        const allUsers = await storage.getAllUsers();
        for (const user of allUsers) {
          if (user.role !== UserRole.ADMIN) {
            await storage.updateUserBalance(user.id, 0);
          }
        }
        
        console.log("Full system reset completed");
        return res.json({ message: "Full system reset completed successfully" });
      } 
      else if (resetType === "games") {
        // Reset only game data
        await db.delete(schema.games);
        await db.delete(schema.satamatkaMarkets);
        await db.delete(schema.teamMatches);
        
        console.log("Game data reset completed");
        return res.json({ message: "Game data reset completed successfully" });
      }
      else if (resetType === "transactions") {
        // Reset only transactions
        await db.delete(schema.transactions);
        await db.delete(schema.walletRequests);
        
        // Reset user balances to 0 except admin
        const allUsers = await storage.getAllUsers();
        for (const user of allUsers) {
          if (user.role !== UserRole.ADMIN) {
            await storage.updateUserBalance(user.id, 0);
          }
        }
        
        console.log("Transactions reset completed");
        return res.json({ message: "Transactions reset completed successfully" });
      }
      else if (resetType === "balance") {
        // Reset only balances
        const allUsers = await storage.getAllUsers();
        for (const user of allUsers) {
          if (user.role !== UserRole.ADMIN) {
            await storage.updateUserBalance(user.id, 0);
          }
        }
        
        console.log("User balances reset completed");
        return res.json({ message: "User balances reset completed successfully" });
      }
      else {
        return res.status(400).json({ message: "Invalid reset type" });
      }
    } catch (err) {
      console.error("Error during system reset:", err);
      return res.status(500).json({ message: "An error occurred during system reset" });
    }
  });
  
  // Admin dashboard statistics
  app.get("/api/admin/stats", requireRole(UserRole.ADMIN), async (req, res) => {
    try {
      let totalProfitLoss = 0;
      
      // 1. Get all users to determine which ones are direct admin players
      const allUsers = await storage.getAllUsers();
      const directAdminPlayerIds = allUsers
        .filter(user => user.role === UserRole.PLAYER && (!user.assignedTo || user.assignedTo === req.user!.id))
        .map(user => user.id);
      
      console.log(`Direct admin player IDs: ${directAdminPlayerIds.join(', ')}`);
      
      // 2. Get games from direct admin players only
      const games = await storage.getAllGames();
      
      for (const game of games) {
        // Only count games from players directly under admin
        if (directAdminPlayerIds.includes(game.userId)) {
          // For each game, the platform profit is the bet amount minus any payout
          // A positive value means the platform made money (player lost)
          const gameProfit = game.betAmount - (game.payout || 0);
          totalProfitLoss += gameProfit;
          console.log(`Counting game profit from direct player ${game.userId}: ${gameProfit}`);
        }
      }
      
      // 3. Calculate profit/losses from all sources
      // This includes both games from direct players and commission profits/losses from subadmins
      
      // Track profit from direct player games (already calculated above)
      let commissionProfit = 0;
      
      // Get all transactions - we need these for both commission profit and deposit calculation
      const transactions = await storage.getAllTransactions();
      
      // Look for transactions with commission in the description
      for (const tx of transactions) {
        if (tx.description && tx.description.includes('commission:')) {
          // Extract the commission amount from the description
          // Format is "..., commission: X)"
          const match = tx.description.match(/commission: (\d+)/);
          
          if (match && match[1]) {
            const commissionAmount = parseInt(match[1], 10);
            if (!isNaN(commissionAmount)) {
              // Check that we're only counting positive transactions for subadmin deposits
              // We don't want to double count withdrawals
              if (tx.amount > 0 || (tx.description && tx.description.includes('transferred to'))) {
                console.log(`Found commission transaction: ${tx.description}, amount: ${commissionAmount}`);
                // Add the commission as profit
                commissionProfit += commissionAmount;
              }
            }
          }
        }
      }
      
      console.log(`Profit breakdown: Direct games profit: ${totalProfitLoss}, Commission profit: ${commissionProfit}`);
      // Add commission profit to total profit/loss
      totalProfitLoss += commissionProfit;
      
      // Calculate total deposits properly:
      // 1. For direct admin players, count the full deposit amount
      // 2. For subadmin transactions, only count the actual amount deducted from admin (commission amount)
      // 3. Include regular player deposits (players not assigned to any subadmin)
      
      // Track admin total deposit calculation
      let totalDeposits = 0;
      
      // Get all direct players (players with no subadmin assigned or assigned to admin)
      const directPlayers = allUsers
        .filter(user => user.role === UserRole.PLAYER && (!user.assignedTo || user.assignedTo === req.user!.id))
        .map(user => user.id);
      
      console.log(`Direct players to admin: ${directPlayers.join(', ')}`);
      
      // Process each transaction - using the transactions array we already loaded above
      for (const tx of transactions) {
        // For direct players, count deposit amounts
        if (directPlayers.includes(tx.userId) && tx.amount > 0 && tx.description && tx.description.includes('Deposit')) {
          totalDeposits += tx.amount;
          console.log(`Counting direct player deposit: userId=${tx.userId}, amount=${tx.amount}`);
        }
        
        // For subadmin-related transactions, look for commission information in the description
        if (tx.description && tx.description.includes('commission rate applied')) {
          // Extract the actual deduction amount (what admin paid) from the transaction description
          // Format: "Funds transferred to subadmin (X of Y - commission rate applied, commission: Z)"
          const match = tx.description.match(/\((\d+) of (\d+) - commission rate applied/);
          
          if (match && match[1] && match[2]) {
            // Only count the actual amount deducted from admin (match[1]), not the full amount (match[2])
            const actualDeduction = parseInt(match[1], 10);
            if (!isNaN(actualDeduction)) {
              totalDeposits += actualDeduction;
              console.log(`Counting subadmin transaction: ${tx.description}, actual deduction: ${actualDeduction}`);
            }
          }
        }
      }
      
      // Get active bet amount (sum of all bet amounts for games with status "pending") - only from direct admin players
      const activeGames = await storage.getActiveGames();
      const filteredActiveGames = activeGames.filter(game => directAdminPlayerIds.includes(game.userId));
      const activeBetAmount = filteredActiveGames.reduce((sum, game) => sum + game.betAmount, 0);
      
      // Calculate potential payout (maximum possible payout from all active games) - only from direct admin players
      const potentialPayout = filteredActiveGames.reduce((sum, game) => {
        // Calculate the maximum possible payout based on game type and odds
        let maxPayout = 0;
        
        if (game.gameType === GameType.COIN_FLIP) {
          // Typically 2x the bet amount for coin flip
          maxPayout = game.betAmount * 2;
        } else if (game.gameType === GameType.SATAMATKA) {
          // Could be up to 9x or more depending on the specific game
          maxPayout = game.betAmount * 9;
        } else if (game.gameType === GameType.CRICKET_TOSS) {
          // Typically 2x the bet amount for cricket toss
          maxPayout = game.betAmount * 2;
        } else if (game.gameType === GameType.TEAM_MATCH) {
          // Depends on the odds, typically around 2x
          maxPayout = game.betAmount * 2;
        }
        
        return sum + maxPayout;
      }, 0);
      
      // Get recent transactions
      const recentTransactions = await storage.getRecentTransactions(10);
      
      res.json({
        totalProfitLoss,
        totalDeposits,
        activeBetAmount,
        potentialPayout,
        recentTransactions: recentTransactions.map(tx => ({
          id: tx.id,
          username: tx.username || 'Unknown',
          type: tx.type,
          amount: tx.amount,
          createdAt: tx.createdAt
        }))
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

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
import { setupCricketTossRoutes } from "./cricket-toss";
import { setupCricketTossApiRoutes } from "./cricket-toss-api";
import { setupWalletRoutes } from "./wallet-system";
import { setupUploadRoutes } from "./upload-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);
  
  // Setup Cricket Toss game routes
  setupCricketTossRoutes(app);
  
  // Setup Cricket Toss API for admin management
  setupCricketTossApiRoutes(app);
  
  // Setup wallet routes for deposits and withdrawals
  setupWalletRoutes(app);
  
  // Setup file upload routes
  setupUploadRoutes(app);
  
  // Endpoint to manually seed cricket toss games
  app.post("/api/admin/seed-cricket-toss", requireRole(UserRole.ADMIN), async (req, res, next) => {
    try {
      await (storage as any).seedCricketTossGames();
      res.status(200).json({ message: "Cricket toss games seeded successfully" });
    } catch (error) {
      next(error);
    }
  });
  
  // Endpoint to manually seed open cricket toss games for immediate betting
  app.post("/api/admin/seed-open-cricket-toss", requireRole(UserRole.ADMIN), async (req, res, next) => {
    try {
      // Current time
      const currentTime = new Date();
      const tossTime = new Date(currentTime.getTime() + 6 * 60 * 60 * 1000).toISOString(); // 6 hours in future
      
      const tossGames = [
        {
          userId: req.user!.id,
          gameType: "cricket_toss",
          prediction: "pending",
          betAmount: 0,
          result: null,
          status: "open",
          payout: null,
          gameData: {
            teamA: "England",
            teamB: "New Zealand",
            description: "T20 Series 2025 - Live Betting",
            tossTime: tossTime,
            oddTeamA: 160,
            oddTeamB: 140,
            imageUrl: "/images/england-vs-nz.svg",
            status: "open"
          },
          createdAt: new Date()
        },
        {
          userId: req.user!.id,
          gameType: "cricket_toss",
          prediction: "pending",
          betAmount: 0,
          result: null,
          status: "open",
          payout: null,
          gameData: {
            teamA: "Pakistan",
            teamB: "South Africa",
            description: "ODI Series 2025 - Live Betting",
            tossTime: tossTime,
            oddTeamA: 130,
            oddTeamB: 190,
            imageUrl: "/images/pakistan-vs-sa.svg",
            status: "open"
          },
          createdAt: new Date()
        }
      ];
      
      let createdGamesCount = 0;
      for (const game of tossGames) {
        // Check if a similar game already exists
        const existingGames = await storage.getAllGames();
        const exists = existingGames.some(g => 
          g.gameType === game.gameType && 
          g.gameData && 
          (g.gameData as any).teamA === (game.gameData as any).teamA &&
          (g.gameData as any).teamB === (game.gameData as any).teamB
        );
        
        if (!exists) {
          await storage.createGame(game);
          createdGamesCount++;
        }
      }
      
      res.status(200).json({ 
        message: "Open cricket toss games seeded successfully", 
        createdGamesCount 
      });
    } catch (error) {
      next(error);
    }
  });
  
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

      // Determine outcome (random)
      const result = Math.random() < 0.5 ? GameOutcome.HEADS : GameOutcome.TAILS;
      
      // Calculate payout (1.95x if win, 0 if loss)
      const multiplier = 1.95;
      const isWin = prediction === result;
      const payout = isWin ? Math.floor(betAmount * multiplier) : 0;
      
      // Update user balance
      const newBalance = user.balance - betAmount + payout;
      await storage.updateUserBalance(user.id, newBalance);

      // Record the game
      const game = await storage.createGame({
        userId: user.id,
        gameType: GameType.COIN_FLIP,
        betAmount,
        prediction,
        result,
        payout,
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
      
      if (req.user!.role === UserRole.ADMIN) {
        // Admins can see all users
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

      // For subadmins adding funds to players, check if subadmin has enough balance
      if (req.user!.role === UserRole.SUBADMIN && amount > 0) {
        const subadmin = await storage.getUser(req.user!.id);
        if (!subadmin || subadmin.balance < amount) {
          return res.status(400).json({ 
            message: "Insufficient balance in your account. Please make a deposit request to add funds to your wallet first."
          });
        }
        
        // Deduct the amount from subadmin's balance
        await storage.updateUserBalance(subadmin.id, subadmin.balance - amount);
        
        // Record transaction for subadmin (negative amount = deduction)
        await storage.createTransaction({
          userId: subadmin.id,
          amount: -amount,
          performedBy: subadmin.id,
          description: `Funds transferred to ${user.username}`,
        });
      }

      // Prevent negative balance for the player
      const newBalance = user.balance + amount;
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

      // Record transaction for the player
      await storage.createTransaction({
        userId,
        amount,
        performedBy: req.user!.id,
        description: transactionDesc
      });

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
      
      // Update the user
      const updatedUser = await storage.updateUser(userId, { username, password });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password: pwd, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (err) {
      next(err);
    }
  });

  // Get user statistics
  app.get("/api/users/stats", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const games = await storage.getGamesByUserId(req.user!.id);
      
      // Calculate statistics
      const totalBets = games.length;
      const totalWins = games.filter(game => game.payout > 0).length;
      const winRate = totalBets > 0 ? Math.round((totalWins / totalBets) * 100) : 0;
      
      res.json({
        totalBets,
        winRate,
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
      const marketData = insertSatamatkaMarketSchema.parse(req.body);
      
      // Handle recurring market flag
      if (marketData.isRecurring) {
        const market = await storage.createRecurringSatamatkaMarket(marketData);
        res.status(201).json(market);
      } else {
        const market = await storage.createSatamatkaMarket(marketData);
        res.status(201).json(market);
      }
    } catch (err) {
      next(err);
    }
  });
  
  // Create a recurring market (new API endpoint)
  app.post("/api/satamatka/markets/recurring", requireRole([UserRole.ADMIN]), async (req, res, next) => {
    try {
      const marketData = insertSatamatkaMarketSchema.parse(req.body);
      
      // Force this to be a recurring market
      marketData.isRecurring = true;
      
      const market = await storage.createRecurringSatamatkaMarket(marketData);
      res.status(201).json(market);
    } catch (err) {
      next(err);
    }
  });

  // Update market status
  app.patch("/api/satamatka/markets/:id/status", requireRole([UserRole.ADMIN]), async (req, res, next) => {
    try {
      const marketId = Number(req.params.id);
      const { status } = req.body;
      
      if (!status || !["open", "closed", "resulted"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
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

  // Update market results
  app.patch("/api/satamatka/markets/:id/results", requireRole([UserRole.ADMIN]), async (req, res, next) => {
    try {
      const marketId = Number(req.params.id);
      const { openResult, closeResult } = req.body;
      
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
      
      const market = await storage.updateSatamatkaMarketResults(marketId, openResult, closeResult);
      
      if (!market) {
        return res.status(404).json({ message: "Market not found" });
      }
      
      res.json(market);
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
        return res.status(400).json({ message: "Market is closed for betting" });
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
        return res.status(400).json({ message: "Market is closed for betting" });
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
      for (const bet of validatedBets) {
        // Bet amounts are already in paisa from the client side
        const betAmountInPaisa = bet.betAmount;
        
        const game = await storage.createGame({
          userId: user.id,
          gameType: GameType.SATAMATKA,
          betAmount: betAmountInPaisa,  // Store in paisa like other game types
          prediction: bet.prediction,
          result: "pending",
          payout: 0,  // Will be calculated when results are published
          marketId,
          gameMode,
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
        
        // Update game payout
        await db.update(games)
          .set({ payout })
          .where(eq(games.id, game.id));
        
        // Update user balance
        await storage.updateUserBalance(user.id, user.balance + payout);
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
        return res.status(400).json({ message: "Match is not open for betting" });
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
        return res.status(400).json({ message: "Match is not open for betting" });
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
        payout: potentialPayout
      };
      
      const createdBet = await storage.createGame(userBet);
      
      res.status(201).json({
        message: "Bet placed successfully",
        game: createdBet,
        user: {
          ...user,
          balance: user.balance - betAmount,
          password: undefined,
        }
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Cricket Toss Betting Statistics
  app.get("/api/cricket-toss/stats", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      // Get active cricket toss matches
      const matches = await storage.getActiveTeamMatches();
      
      // Filter matches for cricket category
      const cricketMatches = matches.filter(match => match.category === "cricket");
      
      // For each match, get games and calculate stats
      const matchStats = await Promise.all(cricketMatches.map(async (match) => {
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
      
      // Generate all numbers from 00 to 99
      const allNumbers = Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, '0'));
      
      // For each market, get games and calculate stats
      const jantriStats = await Promise.all(markets.map(async (market) => {
        const games = await storage.getSatamatkaGamesByMarketId(market.id);
        
        // If subadmin, filter only their assigned users' games
        let filteredGames = games;
        if (req.user?.role === UserRole.SUBADMIN) {
          const assignedUsers = await storage.getUsersByAssignedTo(req.user!.id);
          const assignedUserIds = assignedUsers.map(user => user.id);
          filteredGames = games.filter(game => assignedUserIds.includes(game.userId));
        }
        
        // Calculate stats for each number
        const numberStats = allNumbers.map(number => {
          // Find games with this number as prediction
          const numberGames = filteredGames.filter(game => 
            game.prediction === number && game.gameType === "satamatka"
          );
          
          // Get unique users
          const uniqueUsers = new Set(numberGames.map(game => game.userId)).size;
          
          // Calculate totals
          const totalBets = numberGames.length;
          const totalAmount = numberGames.reduce((sum, game) => sum + game.betAmount, 0);
          const potentialWinAmount = numberGames.reduce((sum, game) => sum + game.payout, 0);
          
          return {
            number,
            totalBets,
            totalAmount,
            potentialWinAmount,
            uniqueUsers
          };
        });
        
        return {
          marketId: market.id,
          marketName: market.name,
          numbers: numberStats
        };
      }));
      
      res.json(jantriStats);
    } catch (err) {
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
      
      const odds = await storage.upsertGameOdd(
        gameType, 
        oddValue,
        req.user.role === UserRole.ADMIN ? (setByAdmin || true) : false,
        req.user.role === UserRole.ADMIN ? subadminId : req.user.id
      );
      
      res.json(odds);
    } catch (err) {
      next(err);
    }
  });
  
  // Subadmin Commission routes
  app.get("/api/commissions/subadmin/:subadminId", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
    try {
      const subadminId = Number(req.params.subadminId);
      
      // Check if the user is authorized to access this resource
      if (req.user.role === UserRole.SUBADMIN && req.user.id !== subadminId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const commissions = await storage.getSubadminCommissions(subadminId);
      res.json(commissions);
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

  // Register wallet system routes
  await import('./wallet-system').then(({ setupWalletRoutes }) => {
    setupWalletRoutes(app);
  });
  
  // Serve login test page for debugging
  app.get("/login-test", (_req, res) => {
    res.sendFile("login-test.html", { root: process.cwd() });
  });

  const httpServer = createServer(app);
  return httpServer;
}

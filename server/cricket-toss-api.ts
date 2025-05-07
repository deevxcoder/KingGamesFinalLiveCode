import express from "express";
import { db } from "./db";
import { z } from "zod";
import { 
  GameType, 
  TeamMatchResult, 
  users, 
  games, 
  teamMatches,
  type TeamMatch
} from "../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireRole } from "./auth";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Setup multer for image uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
const cricketTossUploadsDir = path.join(uploadsDir, 'cricket-toss');

// Ensure uploads directory exists
if (!fs.existsSync(cricketTossUploadsDir)) {
  fs.mkdirSync(cricketTossUploadsDir, { recursive: true });
}

// Configure storage for cricket toss team images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, cricketTossUploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `cricket-toss-${uniqueSuffix}${ext}`);
  }
});

// File filter to accept only images
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB max file size
  },
  fileFilter: fileFilter
});

// Schema for creating a cricket toss match
const createCricketTossMatchSchema = z.object({
  teamA: z.string().min(1, "Team A name is required"),
  teamB: z.string().min(1, "Team B name is required"),
  description: z.string().optional(),
  matchTime: z.string().transform(val => new Date(val)),
  oddTeamA: z.number().min(100, "Odds must be at least 1.00"),
  oddTeamB: z.number().min(100, "Odds must be at least 1.00"),
  teamAImage: z.string().optional(),
  teamBImage: z.string().optional(),
});

// Schema for placing a bet
const placeBetSchema = z.object({
  matchId: z.number(),
  betAmount: z.number().positive("Bet amount must be positive"),
  prediction: z.enum(["team_a", "team_b"], { 
    errorMap: () => ({ message: "Prediction must be either team_a or team_b" })
  }),
});

// Schema for declaring a result
const declareResultSchema = z.object({
  result: z.enum(["team_a", "team_b"], { 
    errorMap: () => ({ message: "Result must be either team_a or team_b" }) 
  }),
});

// Get all cricket toss matches
router.get("/matches", requireRole(["admin", "subadmin"]), async (req, res) => {
  try {
    const matches = await db.select()
      .from(teamMatches)
      .where(eq(teamMatches.category, "cricket_toss"))
      .orderBy(desc(teamMatches.id));
    
    res.json(matches);
  } catch (error) {
    console.error("Error fetching cricket toss matches:", error);
    res.status(500).json({ message: "Failed to fetch cricket toss matches" });
  }
});

// Get all open cricket toss matches (for players)
router.get("/open-matches", async (req, res) => {
  try {
    const now = new Date();
    const matches = await db.select()
      .from(teamMatches)
      .where(
        and(
          eq(teamMatches.category, "cricket_toss"),
          eq(teamMatches.status, "open")
        )
      )
      .orderBy(desc(teamMatches.matchTime));
    
    res.json(matches);
  } catch (error) {
    console.error("Error fetching open cricket toss matches:", error);
    res.status(500).json({ message: "Failed to fetch open cricket toss matches" });
  }
});

// Create a new cricket toss match
router.post("/matches", requireRole(["admin", "subadmin"]), upload.fields([
  { name: 'teamAImage', maxCount: 1 },
  { name: 'teamBImage', maxCount: 1 }
]), async (req, res) => {
  try {
    // Handle form-data
    const teamA = req.body.teamA;
    const teamB = req.body.teamB;
    const description = req.body.description;
    const matchTime = req.body.matchTime;
    // Use fixed odds of 2.00 for both teams
    const oddTeamA = 200;
    const oddTeamB = 200;
    
    // Process any team images if they were uploaded
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    // Add team image paths if provided
    let teamAImage: string | undefined;
    let teamBImage: string | undefined;
    
    if (files && files.teamAImage && files.teamAImage.length > 0) {
      teamAImage = `/uploads/cricket-toss/${files.teamAImage[0].filename}`;
    }
    
    if (files && files.teamBImage && files.teamBImage.length > 0) {
      teamBImage = `/uploads/cricket-toss/${files.teamBImage[0].filename}`;
    }
    
    // Validate the data
    if (!teamA || !teamB || !matchTime) {
      return res.status(400).json({ message: "Missing required fields: teamA, teamB, or matchTime" });
    }
    
    // Create object for insertion
    const matchData = {
      teamA,
      teamB,
      description,
      matchTime: new Date(matchTime),
      oddTeamA,
      oddTeamB,
      oddDraw: null, // No draw option for cricket toss
      category: "cricket_toss", // This is the key difference from regular team matches
      result: TeamMatchResult.PENDING,
      status: "open",
      teamAImage,
      teamBImage
    };

    const insertedMatch = await db.insert(teamMatches).values(matchData).returning();
    
    res.status(201).json(insertedMatch[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: error.errors[0].message });
    } else {
      console.error("Error creating cricket toss match:", error);
      res.status(500).json({ message: "Failed to create cricket toss match" });
    }
  }
});

// Close betting for a match
router.post("/matches/:id/close", requireRole(["admin", "subadmin"]), async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    if (isNaN(matchId)) {
      return res.status(400).json({ message: "Invalid match ID" });
    }
    
    // First check if the match exists and is still open
    const match = await db.select()
      .from(teamMatches)
      .where(
        and(
          eq(teamMatches.id, matchId),
          eq(teamMatches.category, "cricket_toss"),
          eq(teamMatches.status, "open")
        )
      )
      .limit(1);
    
    if (match.length === 0) {
      return res.status(404).json({ 
        message: "Match not found or already closed" 
      });
    }
    
    // Close the match
    const updatedMatch = await db.update(teamMatches)
      .set({ status: "closed" })
      .where(eq(teamMatches.id, matchId))
      .returning();
    
    res.json(updatedMatch[0]);
  } catch (error) {
    console.error("Error closing cricket toss match:", error);
    res.status(500).json({ message: "Failed to close cricket toss match" });
  }
});

// Declare result for a match
router.post("/matches/:id/result", requireRole(["admin", "subadmin"]), async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    if (isNaN(matchId)) {
      return res.status(400).json({ message: "Invalid match ID" });
    }
    
    const validatedData = declareResultSchema.parse(req.body);
    
    // First check if the match exists and is closed
    const match = await db.select()
      .from(teamMatches)
      .where(
        and(
          eq(teamMatches.id, matchId),
          eq(teamMatches.category, "cricket_toss"),
          eq(teamMatches.status, "closed")
        )
      )
      .limit(1);
    
    if (match.length === 0) {
      return res.status(404).json({ 
        message: "Match not found or not in closed state" 
      });
    }
    
    const matchData = match[0];
    
    // Update the match with the result
    const updatedMatch = await db.update(teamMatches)
      .set({ 
        status: "resulted",
        result: validatedData.result
      })
      .where(eq(teamMatches.id, matchId))
      .returning();
    
    // Process all bets for this match
    const bets = await db.select()
      .from(games)
      .where(
        and(
          eq(games.matchId, matchId),
          eq(games.gameType, GameType.CRICKET_TOSS)
          // We'll filter unresolved bets after the query
        )
      );
    
    // For each bet, determine win/loss and update user balance
    for (const bet of bets) {
      // Skip bets that already have a result
      if (bet.result !== null) continue;
      
      let payout = 0;
      const win = bet.prediction === validatedData.result;
      
      if (win) {
        // Calculate payout based on which team was predicted
        const odds = bet.prediction === "team_a" ? matchData.oddTeamA : matchData.oddTeamB;
        payout = Math.floor(bet.betAmount * (odds / 100));
      }
      
      // Get current user balance
      const userResult = await db.select({ balance: users.balance })
        .from(users)
        .where(eq(users.id, bet.userId))
        .limit(1);
      
      if (userResult.length === 0) {
        console.error(`User ${bet.userId} not found when processing bet ${bet.id}`);
        continue;
      }
      
      const currentBalance = userResult[0].balance;
      const newBalance = currentBalance + payout;
      
      // Update user balance
      if (payout > 0) {
        await db.update(users)
          .set({ balance: newBalance })
          .where(eq(users.id, bet.userId));
      }
      
      // Update bet with result and payout
      await db.update(games)
        .set({
          result: validatedData.result,
          payout: payout,
          balanceAfter: newBalance
        })
        .where(eq(games.id, bet.id));
    }
    
    res.json({
      match: updatedMatch[0],
      processedBets: bets.length
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: error.errors[0].message });
    } else {
      console.error("Error declaring cricket toss result:", error);
      res.status(500).json({ message: "Failed to declare cricket toss result" });
    }
  }
});

// Place a bet on a cricket toss match
router.post("/bet", async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "You must be logged in to place a bet" });
    }
    
    const validatedData = placeBetSchema.parse(req.body);
    
    // Check if the match exists and is open for betting
    const match = await db.select()
      .from(teamMatches)
      .where(
        and(
          eq(teamMatches.id, validatedData.matchId),
          eq(teamMatches.category, "cricket_toss"),
          eq(teamMatches.status, "open")
        )
      )
      .limit(1);
    
    if (match.length === 0) {
      return res.status(404).json({ 
        message: "Match not found or not open for betting" 
      });
    }
    
    const matchData = match[0] as TeamMatch;
    
    // Check if the user has enough balance
    const userResult = await db.select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);
    
    if (userResult.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const currentBalance = userResult[0].balance;
    
    if (currentBalance < validatedData.betAmount) {
      return res.status(400).json({ 
        message: "Insufficient balance to place this bet" 
      });
    }
    
    // Calculate potential payout
    const odds = validatedData.prediction === "team_a" 
      ? matchData.oddTeamA 
      : matchData.oddTeamB;
    
    const potentialWin = Math.floor(validatedData.betAmount * (odds / 100));
    
    // Deduct bet amount from user balance
    const newBalance = currentBalance - validatedData.betAmount;
    
    await db.update(users)
      .set({ balance: newBalance })
      .where(eq(users.id, req.user.id));
    
    // Create the bet record
    const gameData = {
      teamA: matchData.teamA,
      teamB: matchData.teamB,
      teamAImage: matchData.teamAImage,
      teamBImage: matchData.teamBImage,
      matchId: matchData.id,
      oddTeamA: matchData.oddTeamA,
      oddTeamB: matchData.oddTeamB,
      matchTime: matchData.matchTime,
      status: matchData.status,
    };
    
    const createdBet = await db.insert(games)
      .values({
        userId: req.user.id,
        gameType: GameType.CRICKET_TOSS,
        matchId: validatedData.matchId,
        betAmount: validatedData.betAmount,
        prediction: validatedData.prediction,
        gameData: gameData,
        balanceAfter: newBalance,
      })
      .returning();
    
    res.status(201).json({
      bet: createdBet[0],
      currentBalance: newBalance,
      potentialWin: potentialWin
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: error.errors[0].message });
    } else {
      console.error("Error placing cricket toss bet:", error);
      res.status(500).json({ message: "Failed to place bet" });
    }
  }
});

// Get betting history for the current user
router.get("/my-bets", async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "You must be logged in to view your bets" });
    }
    
    const bets = await db.select()
      .from(games)
      .where(
        and(
          eq(games.userId, req.user.id),
          eq(games.gameType, GameType.CRICKET_TOSS)
        )
      )
      .orderBy(desc(games.createdAt));
    
    res.json(bets);
  } catch (error) {
    console.error("Error fetching user cricket toss bets:", error);
    res.status(500).json({ message: "Failed to fetch your betting history" });
  }
});

// Get all bets for a specific match (admin/subadmin only)
router.get("/bets/:matchId", requireRole(["admin", "subadmin"]), async (req, res) => {
  try {
    const matchId = parseInt(req.params.matchId);
    if (isNaN(matchId)) {
      return res.status(400).json({ message: "Invalid match ID" });
    }
    
    // Join games with users to get usernames
    const bets = await db.select({
      id: games.id,
      userId: games.userId,
      username: users.username,
      betAmount: games.betAmount,
      prediction: games.prediction,
      result: games.result,
      payout: games.payout,
      createdAt: games.createdAt,
      gameData: games.gameData,
    })
    .from(games)
    .innerJoin(users, eq(games.userId, users.id))
    .where(
      and(
        eq(games.matchId, matchId),
        eq(games.gameType, GameType.CRICKET_TOSS)
      )
    )
    .orderBy(desc(games.createdAt));
    
    // Calculate potential win for each bet
    const betsWithPotential = bets.map(bet => {
      const gameData = bet.gameData as any;
      const odds = bet.prediction === 'team_a' ? gameData.oddTeamA : gameData.oddTeamB;
      const potential = Math.floor(bet.betAmount * (odds / 100));
      
      return {
        ...bet,
        potential
      };
    });
    
    res.json(betsWithPotential);
  } catch (error) {
    console.error(`Error fetching bets for match ${req.params.matchId}:`, error);
    res.status(500).json({ message: "Failed to fetch bets for this match" });
  }
});

export default router;
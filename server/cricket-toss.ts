import express, { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { GameType, TeamMatchResult } from '@shared/schema';

export function setupCricketTossRoutes(app: express.Express) {
  // Place a bet on a cricket toss
  app.post("/api/cricket-toss/:id/play", async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (req.user!.isBlocked) {
        return res.status(403).json({ message: "Your account is blocked" });
      }

      const matchId = Number(req.params.id);
      const { betAmount, prediction } = req.body;

      // Validate input
      if (!betAmount || betAmount <= 0 || !prediction) {
        return res.status(400).json({ message: "Invalid bet amount or prediction" });
      }

      // Check if the prediction is valid (team_a or team_b only)
      if (prediction !== TeamMatchResult.TEAM_A && prediction !== TeamMatchResult.TEAM_B) {
        return res.status(400).json({ message: "Invalid prediction. Must be either team_a or team_b" });
      }

      // Verify match exists and is open
      const match = await storage.getTeamMatch(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if (match.status !== "open") {
        return res.status(400).json({ message: "Match is closed for betting" });
      }

      // Verify user has enough balance
      const user = await storage.getUser(req.user!.id);
      if (!user || user.balance < betAmount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Create cricket toss game record
      const game = await storage.createGame({
        userId: user.id,
        gameType: GameType.CRICKET_TOSS,
        betAmount,
        prediction,
        matchId,
        payout: 0, // Will be calculated when the match is resulted
      });

      // Update user balance
      await storage.updateUserBalance(user.id, user.balance - betAmount);

      res.status(201).json({
        id: game.id,
        betAmount: game.betAmount,
        prediction: game.prediction,
      });
    } catch (error) {
      next(error);
    }
  });
}
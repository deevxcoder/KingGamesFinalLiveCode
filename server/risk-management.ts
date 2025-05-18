import { Request, Response } from "express";
import { storage } from "./storage";
import { UserRole, GameType } from "../shared/schema";

/**
 * Types for risk management data
 */
interface RiskSummary {
  totalBetAmount: number;
  potentialLiability: number;
  potentialProfit: number;
  exposureAmount: number;
  activeBets: number;
  totalBets: number;
  highRiskBets: number;
  gameType: string;
  gameTypeFormatted: string;
}

interface DetailedRiskData {
  userExposure: { [userId: number]: number };
  marketExposure: { [marketId: number]: number };
  gameData: any[];
}

interface RiskManagementResponse {
  summaries: RiskSummary[];
  detailedData: DetailedRiskData;
  message?: string;
}

/**
 * Get risk management data for admins (platform-wide risk analysis)
 */
export async function getAdminRiskManagement(req: Request, res: Response) {
  try {
    // Admin gets platform-wide risk management data
    const marketGameRiskData = await getMarketGameRiskData();
    const cricketTossRiskData = await getCricketTossRiskData();
    
    const response: RiskManagementResponse = {
      summaries: [
        {
          ...marketGameRiskData.summary,
          gameType: GameType.SATAMATKA,
          gameTypeFormatted: "Market Game"
        },
        {
          ...cricketTossRiskData.summary,
          gameType: GameType.CRICKET_TOSS,
          gameTypeFormatted: "Cricket Toss"
        }
      ],
      detailedData: {
        userExposure: {
          ...marketGameRiskData.userExposure,
          ...cricketTossRiskData.userExposure
        },
        marketExposure: marketGameRiskData.marketExposure,
        gameData: [
          ...marketGameRiskData.games,
          ...cricketTossRiskData.games
        ]
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error in admin risk management:", error);
    return res.status(500).json({ message: "Failed to get risk management data" });
  }
}

/**
 * Get risk management data for subadmins (data only for their assigned players)
 */
export async function getSubadminRiskManagement(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== UserRole.SUBADMIN) {
      return res.status(403).json({ message: "Unauthorized access" });
    }
    
    const subadminId = req.user.id;
    
    // Get all users assigned to this subadmin
    const assignedUsers = await storage.getUsersByAssignedTo(subadminId);
    if (!assignedUsers.length) {
      return res.status(200).json({
        summaries: [
          {
            totalBetAmount: 0,
            potentialLiability: 0,
            potentialProfit: 0,
            exposureAmount: 0,
            activeBets: 0,
            totalBets: 0,
            highRiskBets: 0,
            gameType: GameType.SATAMATKA,
            gameTypeFormatted: "Market Game"
          },
          {
            totalBetAmount: 0,
            potentialLiability: 0,
            potentialProfit: 0,
            exposureAmount: 0,
            activeBets: 0,
            totalBets: 0,
            highRiskBets: 0,
            gameType: GameType.CRICKET_TOSS,
            gameTypeFormatted: "Cricket Toss"
          }
        ],
        detailedData: {
          userExposure: {},
          marketExposure: {},
          gameData: []
        },
        message: "No assigned players found"
      });
    }
    
    const userIds = assignedUsers.map(user => user.id);
    
    // Get odds for this subadmin
    const marketGameOdd = await storage.getGameOddBySubadminAndType(subadminId, GameType.SATAMATKA);
    const cricketTossOdd = await storage.getGameOddBySubadminAndType(subadminId, GameType.CRICKET_TOSS);
    
    // If subadmin hasn't set odds, use admin odds
    const defaultMarketOdd = !marketGameOdd ? 
      await storage.getGameOddByType(GameType.SATAMATKA) : 
      marketGameOdd;
      
    const defaultCricketOdd = !cricketTossOdd ? 
      await storage.getGameOddByType(GameType.CRICKET_TOSS) : 
      cricketTossOdd;
    
    // Get games for assigned users
    const allGames = await storage.getGamesByUserIds(userIds);
    
    // Filter by game type
    const marketGames = allGames.filter(game => game.gameType === GameType.SATAMATKA);
    const cricketTossGames = allGames.filter(game => game.gameType === GameType.CRICKET_TOSS);
    
    // Calculate risk data for each game type
    const marketRiskData = calculateRiskData(
      marketGames, 
      defaultMarketOdd?.oddValue || 90
    );
    
    const cricketRiskData = calculateRiskData(
      cricketTossGames,
      defaultCricketOdd?.oddValue || 90
    );
    
    const response: RiskManagementResponse = {
      summaries: [
        {
          ...marketRiskData.summary,
          gameType: GameType.SATAMATKA,
          gameTypeFormatted: "Market Game"
        },
        {
          ...cricketRiskData.summary,
          gameType: GameType.CRICKET_TOSS,
          gameTypeFormatted: "Cricket Toss"
        }
      ],
      detailedData: {
        userExposure: {
          ...marketRiskData.userExposure,
          ...cricketRiskData.userExposure
        },
        marketExposure: marketRiskData.marketExposure,
        gameData: [
          ...marketRiskData.games,
          ...cricketRiskData.games
        ]
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error in subadmin risk management:", error);
    return res.status(500).json({ message: "Failed to get risk management data" });
  }
}

/**
 * Get risk management data for market games
 */
async function getMarketGameRiskData() {
  // Get all market games
  const games = await storage.getGamesByType(GameType.SATAMATKA);
  
  // Get market game odds set by admin
  const marketOdds = await storage.getGameOddByType(GameType.SATAMATKA);
  const oddValue = marketOdds?.oddValue || 90; // Default to 90 if not set
  
  return calculateRiskData(games, oddValue);
}

/**
 * Get risk management data for cricket toss games
 */
async function getCricketTossRiskData() {
  // Get all cricket toss games
  const games = await storage.getGamesByType(GameType.CRICKET_TOSS);
  
  // Get cricket toss odds set by admin
  const cricketOdds = await storage.getGameOddByType(GameType.CRICKET_TOSS);
  const oddValue = cricketOdds?.oddValue || 90; // Default to 90 if not set
  
  return calculateRiskData(games, oddValue);
}

/**
 * Calculate risk metrics from game data
 */
function calculateRiskData(games: any[], oddValue: number) {
  // Consider games with no result OR with result='pending' as active bets
  const activeBets = games.filter(game => !game.result || game.result === 'pending').length;
  const totalBets = games.length;
  
  // Calculate exposure by user
  const userExposure: { [userId: number]: number } = {};
  // Calculate exposure by market (for market games)
  const marketExposure: { [marketId: number]: number } = {};
  
  let totalBetAmount = 0;
  let potentialLiability = 0;
  let highRiskBets = 0;
  
  // Calculate total bet amount and potential liability
  games.forEach(game => {
    // Only count active bets for liability calculations (null result OR 'pending' result)
    if (!game.result || game.result === 'pending') {
      const betAmount = game.betAmount;
      const potentialPayout = betAmount * (oddValue / 100);
      
      totalBetAmount += betAmount;
      potentialLiability += potentialPayout;
      
      // Track high risk bets (bets over ₹1000)
      if (betAmount > 1000) {
        highRiskBets++;
      }
      
      // Track exposure by user
      if (!userExposure[game.userId]) {
        userExposure[game.userId] = 0;
      }
      userExposure[game.userId] += potentialPayout;
      
      // Track exposure by market (for market games)
      if (game.marketId && !marketExposure[game.marketId]) {
        marketExposure[game.marketId] = 0;
      }
      if (game.marketId) {
        marketExposure[game.marketId] += potentialPayout;
      }
    }
  });
  
  // Calculate potential profit (house edge)
  const potentialProfit = totalBetAmount - potentialLiability;
  
  // Calculate maximum exposure amount (worst-case scenario)
  const exposureAmount = Math.max(...Object.values(userExposure), 0);
  
  return {
    summary: {
      totalBetAmount,
      potentialLiability,
      potentialProfit,
      exposureAmount,
      activeBets,
      totalBets,
      highRiskBets
    },
    userExposure,
    marketExposure,
    games
  };
}
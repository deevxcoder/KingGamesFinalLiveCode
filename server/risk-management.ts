import { Router } from "express";
import { requireRole } from "./auth";
import { storage } from "./storage";
import { GameType, UserRole } from "@shared/schema";
import { db } from "./db";

const router = Router();

// Satamatka risk management endpoint
router.get("/satamatka", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
  try {
    const { role, id } = req.user!;
    const isAdmin = role === UserRole.ADMIN;
    
    // Get active Satamatka markets
    const markets = await storage.getActiveSatamatkaMarkets();
    
    // Get all Satamatka games for these markets
    const riskDataPromises = markets.map(async (market) => {
      // Get all games for this market
      let games = await storage.getSatamatkaGamesByMarketId(market.id);
      
      // If subadmin, filter to only show games by assigned players
      if (!isAdmin) {
        const assignedUserIds = (await storage.getUsersByAssignedTo(id)).map(user => user.id);
        games = games.filter(game => assignedUserIds.includes(game.userId));
        
        // If no games for this subadmin's players, skip this market
        if (games.length === 0) return null;
      }
      
      // Group games by game mode
      const gamesByMode: { [key: string]: any[] } = {};
      
      for (const game of games) {
        // Extract game mode from game data
        const gameData = typeof game.gameData === 'string' 
          ? JSON.parse(game.gameData) 
          : game.gameData;
        
        if (!gameData || !gameData.gameMode) continue;
        
        const gameMode = gameData.gameMode;
        
        if (!gamesByMode[gameMode]) {
          gamesByMode[gameMode] = [];
        }
        
        gamesByMode[gameMode].push(game);
      }
      
      // Create a risk data entry for each game mode
      const riskEntries = await Promise.all(
        Object.entries(gamesByMode).map(async ([gameMode, gameModeGames]) => {
          // Calculate totals and get player details
          const totalAmount = gameModeGames.reduce((sum, game) => sum + game.betAmount, 0);
          const highestBet = Math.max(...gameModeGames.map(game => game.betAmount));
          
          // Get unique player IDs
          const playerIds = Array.from(new Set(gameModeGames.map(game => game.userId)));
          
          // Get player details and calculate potential payouts
          const players = await Promise.all(
            playerIds.map(async (playerId) => {
              const player = await storage.getUser(playerId);
              if (!player) return null;
              
              // Get all games for this player in this mode
              const playerGames = gameModeGames.filter(g => g.userId === playerId);
              
              // Calculate total bet amount for this player
              const betAmount = playerGames.reduce((sum, g) => sum + g.betAmount, 0);
              
              // Determine the applicable odds for the player
              let oddValue = 0;
              
              // First check if the player is assigned to a subadmin with custom odds
              if (player.assignedTo) {
                const customOdds = await storage.getGameOddBySubadminAndType(player.assignedTo, gameTypeFromGameMode(gameMode));
                if (customOdds) {
                  oddValue = customOdds.oddValue;
                }
              }
              
              // If no custom odds, use admin odds
              if (!oddValue) {
                const adminOdds = await storage.getGameOddByType(gameTypeFromGameMode(gameMode));
                if (adminOdds) {
                  oddValue = adminOdds.oddValue;
                } else {
                  // Default odds based on game mode
                  switch (gameMode) {
                    case 'jodi':
                      oddValue = 9000; // 90x
                      break;
                    case 'harf':
                      oddValue = 900; // 9x
                      break;
                    case 'crossing':
                      oddValue = 900; // 9x
                      break;
                    case 'odd_even':
                      oddValue = 180; // 1.8x
                      break;
                    default:
                      oddValue = 200; // 2x default
                  }
                }
              }
              
              // Calculate potential win based on odds
              // We assume the odds are stored as integer (e.g. 180 = 1.8x)
              const potentialWin = (betAmount * oddValue) / 100;
              
              // Combine the bet details for all games of this player
              const playerPredictions = playerGames.map(g => {
                const gData = typeof g.gameData === 'string' ? JSON.parse(g.gameData) : g.gameData;
                return gData?.number || g.prediction || 'Unknown';
              }).join(', ');
              
              return {
                playerId,
                playerUsername: player.username,
                betAmount,
                potentialWin,
                gameType: gameTypeFromGameMode(gameMode),
                prediction: playerPredictions,
                assignedTo: player.assignedTo
              };
            })
          );
          
          // Filter out null entries and calculate potential liability
          const validPlayers = players.filter(p => p !== null) as any[];
          const potentialLiability = validPlayers.reduce((sum, player) => sum + player.potentialWin, 0);
          
          // Determine risk level based on potential liability
          let riskLevel = 'low';
          if (potentialLiability > 500000) { // 5,000 * 100 (stored in cents)
            riskLevel = 'high';
          } else if (potentialLiability > 100000) { // 1,000 * 100 (stored in cents)
            riskLevel = 'medium';
          }
          
          return {
            gameType: gameTypeFromGameMode(gameMode),
            marketId: market.id,
            marketName: market.name,
            totalBets: gameModeGames.length,
            totalAmount,
            potentialLiability,
            highestBet,
            playerCount: validPlayers.length,
            riskLevel,
            players: validPlayers
          };
        })
      );
      
      // Filter out any null entries
      return riskEntries.filter(entry => entry !== null);
    });
    
    // Flatten the array of arrays and filter out null entries
    const results = (await Promise.all(riskDataPromises))
      .filter(item => item !== null)
      .flat();
    
    res.json(results);
  } catch (err) {
    console.error("Error in Satamatka risk API:", err);
    next(err);
  }
});

// Cricket Toss risk management endpoint
router.get("/cricket-toss", requireRole([UserRole.ADMIN, UserRole.SUBADMIN]), async (req, res, next) => {
  try {
    const { role, id } = req.user!;
    const isAdmin = role === UserRole.ADMIN;
    
    // Get all cricket toss games
    let cricketTossGames = await storage.getGamesByType(GameType.CRICKET_TOSS);
    
    // Filter to include only active (pending) games
    cricketTossGames = cricketTossGames.filter(game => 
      game.result === "pending" || game.result === null || game.result === ""
    );
    
    // If subadmin, filter to only show games by assigned players
    if (!isAdmin) {
      const assignedUserIds = (await storage.getUsersByAssignedTo(id)).map(user => user.id);
      cricketTossGames = cricketTossGames.filter(game => assignedUserIds.includes(game.userId));
    }
    
    // Group games by match ID
    const gamesByMatch: { [key: string]: any[] } = {};
    
    for (const game of cricketTossGames) {
      // Extract match data
      const gameData = typeof game.gameData === 'string' 
        ? JSON.parse(game.gameData) 
        : game.gameData;
      
      if (!gameData) continue;
      
      // Use matchId if available, otherwise create a synthetic key
      const matchKey = gameData.matchId || `match_${gameData.teamA}_${gameData.teamB}`;
      
      if (!gamesByMatch[matchKey]) {
        gamesByMatch[matchKey] = [];
      }
      
      gamesByMatch[matchKey].push(game);
    }
    
    // Create risk data for each match
    const riskData = await Promise.all(
      Object.entries(gamesByMatch).map(async ([matchKey, matchGames]) => {
        // Get sample game to extract match details
        const sampleGame = matchGames[0];
        const sampleGameData = typeof sampleGame.gameData === 'string' 
          ? JSON.parse(sampleGame.gameData) 
          : sampleGame.gameData;
        
        // Calculate totals
        const totalAmount = matchGames.reduce((sum, game) => sum + game.betAmount, 0);
        const highestBet = Math.max(...matchGames.map(game => game.betAmount));
        
        // Get unique player IDs
        const playerIds = Array.from(new Set(matchGames.map(game => game.userId)));
        
        // Get player details and calculate potential payouts
        const players = await Promise.all(
          playerIds.map(async (playerId) => {
            const player = await storage.getUser(playerId);
            if (!player) return null;
            
            // Get all games for this player in this match
            const playerGames = matchGames.filter(g => g.userId === playerId);
            
            // Calculate total bet amount for this player
            const betAmount = playerGames.reduce((sum, g) => sum + g.betAmount, 0);
            
            // Determine the applicable odds for cricket toss
            let oddValue = 0;
            
            // First check if the player is assigned to a subadmin with custom odds
            if (player.assignedTo) {
              const customOdds = await storage.getGameOddBySubadminAndType(player.assignedTo, 'cricket_toss');
              if (customOdds) {
                oddValue = customOdds.oddValue;
              }
            }
            
            // If no custom odds, use admin odds
            if (!oddValue) {
              const adminOdds = await storage.getGameOddByType('cricket_toss');
              if (adminOdds) {
                oddValue = adminOdds.oddValue;
              } else {
                // Default odds for cricket toss is 1.9x
                oddValue = 190;
              }
            }
            
            // Calculate potential win based on odds
            const potentialWin = (betAmount * oddValue) / 100;
            
            // Get the prediction details
            const playerPredictions = playerGames.map(g => {
              const gData = typeof g.gameData === 'string' ? JSON.parse(g.gameData) : g.gameData;
              return g.prediction === 'team_a' ? gData?.teamA : g.prediction === 'team_b' ? gData?.teamB : g.prediction;
            }).join(', ');
            
            return {
              playerId,
              playerUsername: player.username,
              betAmount,
              potentialWin,
              gameType: 'cricket_toss',
              prediction: playerPredictions,
              assignedTo: player.assignedTo
            };
          })
        );
        
        // Filter out null entries and calculate potential liability
        const validPlayers = players.filter(p => p !== null) as any[];
        const potentialLiability = validPlayers.reduce((sum, player) => sum + player.potentialWin, 0);
        
        // Determine risk level based on potential liability
        let riskLevel = 'low';
        if (potentialLiability > 500000) { // 5,000 * 100 (stored in cents)
          riskLevel = 'high';
        } else if (potentialLiability > 100000) { // 1,000 * 100 (stored in cents)
          riskLevel = 'medium';
        }
        
        // Create the risk data object
        return {
          gameType: 'cricket_toss',
          matchId: sampleGameData.matchId || null,
          matchName: `${sampleGameData.teamA} vs ${sampleGameData.teamB}`,
          totalBets: matchGames.length,
          totalAmount,
          potentialLiability,
          highestBet,
          playerCount: validPlayers.length,
          riskLevel,
          players: validPlayers
        };
      })
    );
    
    res.json(riskData);
  } catch (err) {
    console.error("Error in Cricket Toss risk API:", err);
    next(err);
  }
});

// Helper function to convert game mode to game type
function gameTypeFromGameMode(gameMode: string): string {
  const modeToType: { [key: string]: string } = {
    'jodi': 'satamatka_jodi',
    'harf': 'satamatka_harf',
    'crossing': 'satamatka_crossing',
    'odd_even': 'satamatka_odd_even'
  };
  
  return modeToType[gameMode] || gameMode;
}

export default router;
import { db } from './server/db';
import { games, satamatkaMarkets, MarketType, GameType } from './shared/schema';

async function setupRiskManagementData() {
  try {
    console.log('Setting up sample data for risk management testing...');
    
    const adminId = 1; // The admin user we created

    // Create sample satamatka markets first
    console.log('Creating sample satamatka markets...');
    const markets = [];
    for (let i = 1; i <= 5; i++) {
      const [market] = await db.insert(satamatkaMarkets).values({
        name: `Test Market ${i}`,
        openDate: new Date(),
        closeDate: new Date(Date.now() + 3600000), // 1 hour from now
        type: i % 2 === 0 ? MarketType.DAILY : MarketType.WEEKLY,
        status: 'active',
        result: null,
        resultDate: null,
        createdBy: adminId
      }).returning();
      
      markets.push(market);
      console.log(`Created market ${i}: ${market.name} (ID: ${market.id})`);
    }
    
    // Create test market games (satamatka)
    console.log('\nCreating sample market games...');
    for (let i = 1; i <= 10; i++) {
      const isActive = i % 3 !== 0; // Some games will be active, some completed
      const marketId = markets[i % markets.length].id;
      
      const [game] = await db.insert(games).values({
        userId: adminId,
        gameType: GameType.SATAMATKA,
        betAmount: 1000 * (i % 5 + 1),
        prediction: i % 2 === 0 ? 'jodi' : 'single',
        result: isActive ? null : (i % 2 === 0 ? 'win' : 'loss'),
        payout: isActive ? 0 : (i % 2 === 0 ? 1000 * (i % 5 + 1) * 1.9 : 0),
        marketId: marketId,
        gameMode: 'regular'
      }).returning();
      
      console.log(`Created market game ${i} (ID: ${game.id})`);
    }
    
    // Create test cricket toss games
    console.log('\nCreating sample cricket toss games...');
    for (let i = 1; i <= 8; i++) {
      const isActive = i % 4 !== 0; // Some games will be active, some completed
      
      const [game] = await db.insert(games).values({
        userId: adminId,
        gameType: GameType.CRICKET_TOSS,
        betAmount: 500 * (i % 3 + 1),
        prediction: i % 2 === 0 ? 'team_a' : 'team_b',
        result: isActive ? null : (i % 2 === 0 ? 'win' : 'loss'),
        payout: isActive ? 0 : (i % 2 === 0 ? 500 * (i % 3 + 1) * 1.8 : 0),
        matchId: i % 3 + 1,
        gameMode: 'regular'
      }).returning();
      
      console.log(`Created cricket toss game ${i} (ID: ${game.id})`);
    }
    
    console.log('\nSample data for risk management created successfully!');
    
  } catch (error) {
    console.error('Error creating risk management data:', error);
  }
}

// Run the function
setupRiskManagementData()
  .then(() => console.log('Done!'))
  .catch(err => console.error('Failed:', err));
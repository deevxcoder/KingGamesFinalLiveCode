// Script to create an admin user for testing
import pg from 'pg';
import bcrypt from 'bcrypt';

const { Pool } = pg;

// Create a PostgreSQL client
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createAdmin() {
  const client = await pool.connect();
  
  try {
    console.log('Creating admin user for testing...');
    
    // Hash password
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert admin user
    const adminResult = await client.query(
      `INSERT INTO users (username, password, email, mobile, role, balance, "isBlocked")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, role, balance`,
      ['testadmin', hashedPassword, 'testadmin@example.com', '1234567890', 'admin', 1000000, false]
    );
    
    const admin = adminResult.rows[0];
    console.log('Created admin:', admin);
    
    // Insert subadmin
    const subadminResult = await client.query(
      `INSERT INTO users (username, password, email, mobile, role, balance, "isBlocked", "assignedTo")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, username, role, balance`,
      ['testsubadmin', hashedPassword, 'testsubadmin@example.com', '9876543210', 'subadmin', 500000, false, admin.id]
    );
    
    const subadmin = subadminResult.rows[0];
    console.log('Created subadmin:', subadmin);
    
    // Create test players
    for (let i = 1; i <= 5; i++) {
      const assignedTo = i % 2 === 0 ? admin.id : subadmin.id;
      const playerResult = await client.query(
        `INSERT INTO users (username, password, email, mobile, role, balance, "isBlocked", "assignedTo")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, username, role, balance, "assignedTo"`,
        [`player${i}`, hashedPassword, `player${i}@example.com`, `555000${i}`, 'player', 10000 * i, false, assignedTo]
      );
      
      console.log(`Created player${i}:`, playerResult.rows[0]);
    }
    
    // Create sample market games for risk data
    for (let i = 1; i <= 10; i++) {
      const userId = i % 5 + 1; // Use player IDs 1-5
      const gameType = i % 2 === 0 ? 'satamatka' : 'cricket_toss';
      const betAmount = 1000 * (i % 5 + 1);
      const prediction = i % 3 === 0 ? 'team_a' : (i % 3 === 1 ? 'team_b' : 'draw');
      const marketId = i % 4 + 1;
      
      await client.query(
        `INSERT INTO games (user_id, game_type, bet_amount, prediction, market_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, gameType, betAmount, prediction, marketId]
      );
    }
    
    console.log('Created test accounts and sample games successfully!');
    console.log('\nLogin credentials:');
    console.log('Admin: testadmin / admin123');
    console.log('Subadmin: testsubadmin / admin123');
    console.log('Players: player1-5 / admin123');
    
  } catch (error) {
    console.error('Error creating test accounts:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createAdmin().catch(console.error);
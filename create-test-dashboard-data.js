/**
 * This script creates test data to verify dashboard statistics functionality:
 * 1. Creates admin-to-player direct deposit - should count 100% to deposit total
 * 2. Creates admin-to-subadmin deposit with commission - should count only commission amount to deposit total
 * 3. Creates player game with win/loss - should affect profit/loss total
 * 
 * Use this for testing dashboard statistics calculation logic
 */

import pg from 'pg';
const { Pool } = pg;

async function createTestData() {
  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Connected to database. Starting test data creation...');
    
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get admin user
      const adminResult = await client.query('SELECT id FROM users WHERE role = \'admin\' LIMIT 1');
      if (adminResult.rows.length === 0) {
        throw new Error('Admin user not found!');
      }
      const adminId = adminResult.rows[0].id;
      
      // 1. Create a player and deposit directly - should count 100% to deposit total
      console.log('Creating direct player and deposit...');
      
      // Create player
      const insertPlayerResult = await client.query(
        'INSERT INTO users (username, password, role, balance) VALUES ($1, $2, $3, $4) RETURNING id',
        ['test_direct_player', '$2b$10$abcdefghijklmnopqrstuv', 'player', 0]
      );
      const directPlayerId = insertPlayerResult.rows[0].id;
      
      // Direct deposit to player (10,000)
      const directDeposit = 10000;
      await client.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [directDeposit, directPlayerId]
      );
      
      // Record transaction
      await client.query(
        'INSERT INTO transactions ("userId", amount, "transactionType", description, "createdAt") VALUES ($1, $2, $3, $4, $5)',
        [directPlayerId, directDeposit, 'deposit', 'Direct deposit from admin', new Date()]
      );
      
      console.log(`Created direct player (ID: ${directPlayerId}) with ${directDeposit} deposit`);
      
      // 2. Create subadmin and deposit with commission - should count only commission % to deposit total
      console.log('Creating subadmin and deposit with commission...');
      
      // Create subadmin
      const insertSubadminResult = await client.query(
        'INSERT INTO users (username, password, role, balance) VALUES ($1, $2, $3, $4) RETURNING id',
        ['test_subadmin', '$2b$10$abcdefghijklmnopqrstuv', 'subadmin', 0]
      );
      const subadminId = insertSubadminResult.rows[0].id;
      
      // Deposit to subadmin (50,000) with 20% commission (10,000)
      const subadminDeposit = 50000;
      const commissionRate = 0.2; // 20%
      const commissionAmount = Math.floor(subadminDeposit * commissionRate);
      
      // Subadmin gets full amount
      await client.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [subadminDeposit, subadminId]
      );
      
      // Admin balance deducted by commission only
      await client.query(
        'UPDATE users SET balance = balance - $1 WHERE id = $2',
        [commissionAmount, adminId]
      );
      
      // Record transaction
      await client.query(
        'INSERT INTO transactions ("userId", amount, "transactionType", description, "createdAt") VALUES ($1, $2, $3, $4, $5)',
        [subadminId, subadminDeposit, 'deposit', `Funds transferred to subadmin (${commissionAmount} of ${subadminDeposit} - commission rate applied, commission: ${commissionAmount})`, new Date()]
      );
      
      console.log(`Created subadmin (ID: ${subadminId}) with ${subadminDeposit} deposit and ${commissionAmount} commission`);
      
      // 3. Create player games with win/loss - should affect profit/loss total
      console.log('Creating player games...');
      
      // First game: player loses 5,000 (admin wins)
      const gameLoss = 5000;
      await client.query(
        'INSERT INTO games ("userId", "betAmount", payout, "gameType", prediction, result, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [directPlayerId, gameLoss, 0, 'coinflip', 'heads', 'tails', new Date()]
      );
      
      // Update player balance after loss
      await client.query(
        'UPDATE users SET balance = balance - $1 WHERE id = $2',
        [gameLoss, directPlayerId]
      );
      
      console.log(`Created game where direct player lost ${gameLoss}`);
      
      // Second game: player wins 2,000 (admin loses)
      const gameBet = 1000;
      const gameWin = 2000;
      await client.query(
        'INSERT INTO games ("userId", "betAmount", payout, "gameType", prediction, result, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [directPlayerId, gameBet, gameWin, 'coinflip', 'heads', 'heads', new Date()]
      );
      
      // Update player balance after win
      await client.query(
        'UPDATE users SET balance = balance + $1 - $2 WHERE id = $3',
        [gameWin, gameBet, directPlayerId]
      );
      
      console.log(`Created game where direct player won ${gameWin} on a ${gameBet} bet`);
      
      await client.query('COMMIT');
      console.log('Test data creation complete!');
      
      // Calculate expected totals for verification
      const expectedProfitLoss = (gameLoss - gameBet) + commissionAmount; // Admin profit from games + commission
      const expectedDeposits = directDeposit + commissionAmount; // Direct deposit + commission amount
      
      console.log(`Expected admin dashboard values:
- Total Profit/Loss: ${expectedProfitLoss}
- Total Deposits: ${expectedDeposits}`);
      
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error during test data creation:', err);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await pool.end();
  }
}

// Execute the function
createTestData().catch(err => {
  console.error('Failed to create test data:', err);
  process.exit(1);
});
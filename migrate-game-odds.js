/**
 * This script creates the game_odds table in the database
 * Run this to fix the game odds error in subadmin management
 */
import 'dotenv/config';
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function createGameOddsTable() {
  try {
    console.log('Creating game_odds table...');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS game_odds (
        id SERIAL PRIMARY KEY,
        game_type TEXT NOT NULL,
        odd_value INTEGER NOT NULL,
        set_by_admin BOOLEAN NOT NULL DEFAULT true,
        subadmin_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('game_odds table created successfully!');

    // Adding default game odds
    console.log('Setting up default game odds...');
    
    // Default game types and their odds
    const defaultOdds = [
      { gameType: 'coin_flip', oddValue: 19500 }, // 1.95
      { gameType: 'cricket_toss', oddValue: 19000 }, // 1.90
      { gameType: 'satamatka_jodi', oddValue: 900000 }, // 90.00
      { gameType: 'satamatka_harf', oddValue: 90000 }, // 9.00
      { gameType: 'satamatka_odd_even', oddValue: 19000 }, // 1.90
      { gameType: 'satamatka_crossing', oddValue: 950000 }, // 95.00
    ];
    
    for (const odd of defaultOdds) {
      await db.execute(sql`
        INSERT INTO game_odds (game_type, odd_value, set_by_admin)
        VALUES (${odd.gameType}, ${odd.oddValue}, true)
        ON CONFLICT (game_type) WHERE set_by_admin = true 
        DO UPDATE SET odd_value = ${odd.oddValue}, updated_at = NOW()
      `);
    }
    
    console.log('Default game odds set up successfully!');
    
  } catch (error) {
    console.error('Error creating game_odds table:', error);
  }
}

createGameOddsTable();
import { users, games, transactions, User, InsertUser, Game, InsertGame, Transaction, InsertTransaction, UserRole } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, and, desc } from "drizzle-orm";

// Connect to PostgreSQL for session storage
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUsersByAssignedTo(assignedToId: number): Promise<User[]>;
  updateUserBalance(userId: number, newBalance: number): Promise<User | undefined>;
  updateUser(userId: number, data: {username?: string; password?: string}): Promise<User | undefined>;
  blockUser(userId: number): Promise<User | undefined>;
  unblockUser(userId: number): Promise<User | undefined>;
  assignUserToAdmin(userId: number, adminId: number): Promise<User | undefined>;
  
  // Game methods
  createGame(game: InsertGame): Promise<Game>;
  getGamesByUserId(userId: number): Promise<Game[]>;
  getAllGames(limit?: number): Promise<Game[]>;

  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUserId(userId: number): Promise<Transaction[]>;
  getAllTransactions(limit?: number): Promise<Transaction[]>;

  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
    
    // Seed the database with initial test data
    this.seedInitialData();
  }

  /**
   * Seed the database with initial test data if needed
   */
  private async seedInitialData() {
    try {
      // Check if there are any users in the database
      const existingUsers = await db.select().from(users);
      
      if (existingUsers.length === 0) {
        const { hashPassword } = await import('./auth');
        
        console.log("Seeding initial test data...");
        
        // Admin user
        const admin = await this.createUser({
          username: "admin",
          password: await hashPassword("admin123"),
          role: UserRole.ADMIN,
          assignedTo: null,
        });
        
        // Subadmin user
        const subadmin = await this.createUser({
          username: "subadmin",
          password: await hashPassword("subadmin123"),
          role: UserRole.SUBADMIN,
          assignedTo: admin.id,
        });
        
        // Player users
        const player1 = await this.createUser({
          username: "player1",
          password: await hashPassword("player123"),
          role: UserRole.PLAYER,
          assignedTo: admin.id,
        });
        
        const player2 = await this.createUser({
          username: "player2",
          password: await hashPassword("player123"),
          role: UserRole.PLAYER,
          assignedTo: subadmin.id,
        });
        
        // Seed some games for player1
        await this.seedGamesForUser(player1.id, 10);
        
        // Seed some games for player2
        await this.seedGamesForUser(player2.id, 5);
        
        console.log("Test users and data seeded successfully!");
        console.log("----------------------------------------");
        console.log("Test Accounts:");
        console.log("- Admin: username=admin, password=admin123");
        console.log("- Subadmin: username=subadmin, password=subadmin123");
        console.log("- Player 1: username=player1, password=player123");
        console.log("- Player 2: username=player2, password=player123");
        console.log("----------------------------------------");
      }
    } catch (error) {
      console.error("Error seeding initial data:", error);
    }
  }
  
  /**
   * Seed random games for a user
   */
  private async seedGamesForUser(userId: number, count: number) {
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
      const betAmount = Math.floor(Math.random() * 1000) + 100; // Random between 100-1100
      const prediction = Math.random() > 0.5 ? "heads" : "tails";
      const result = Math.random() > 0.5 ? "heads" : "tails";
      const isWin = prediction === result;
      const payout = isWin ? Math.floor(betAmount * 1.95) : 0;
      
      // Create game with timestamp slightly in the past
      const pastTime = new Date(now.getTime() - (i * 15 * 60 * 1000)); // 15 minutes between games
      
      await db.insert(games).values({
        userId,
        betAmount,
        prediction,
        result,
        payout,
        createdAt: pastTime,
      });
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUsersByAssignedTo(assignedToId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.assignedTo, assignedToId));
  }

  async updateUserBalance(userId: number, newBalance: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ balance: newBalance })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  async updateUser(userId: number, data: {username?: string; password?: string}): Promise<User | undefined> {
    // Only update fields that are provided
    const updateData: any = {};
    if (data.username) updateData.username = data.username;
    if (data.password) {
      const { hashPassword } = await import('./auth');
      updateData.password = await hashPassword(data.password);
    }
    
    if (Object.keys(updateData).length === 0) return this.getUser(userId);
    
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async blockUser(userId: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isBlocked: true })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async unblockUser(userId: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isBlocked: false })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async assignUserToAdmin(userId: number, adminId: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ assignedTo: adminId })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Game methods
  async createGame(insertGame: InsertGame): Promise<Game> {
    const [game] = await db.insert(games).values(insertGame).returning();
    return game;
  }

  async getGamesByUserId(userId: number): Promise<Game[]> {
    return await db
      .select()
      .from(games)
      .where(eq(games.userId, userId))
      .orderBy(desc(games.createdAt));
  }

  async getAllGames(limit?: number): Promise<Game[]> {
    const query = db.select().from(games).orderBy(desc(games.createdAt));
    
    if (limit) {
      query.limit(limit);
    }
    
    return await query;
  }

  // Transaction methods
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    return transaction;
  }

  async getTransactionsByUserId(userId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }
  
  async getAllTransactions(limit?: number): Promise<Transaction[]> {
    const query = db.select().from(transactions).orderBy(desc(transactions.createdAt));
    
    if (limit) {
      query.limit(limit);
    }
    
    return await query;
  }
}

export const storage = new DatabaseStorage();
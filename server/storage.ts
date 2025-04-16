import { 
  users, 
  games, 
  satamatkaMarkets,
  teamMatches,
  systemSettings,
  subadminCommissions,
  userDiscounts,
  gameOdds,
  User, 
  InsertUser, 
  Game, 
  InsertGame, 
  UserRole, 
  SatamatkaMarket,
  InsertSatamatkaMarket,
  TeamMatch,
  InsertTeamMatch,
  SystemSetting,
  InsertSystemSetting,
  SubadminCommission,
  InsertSubadminCommission,
  UserDiscount,
  InsertUserDiscount,
  GameOdd,
  InsertGameOdd
} from "@shared/schema";

// Temporary solution until we update the schema
const transactions = { id: 0 };
type Transaction = any;
type InsertTransaction = any;
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, and, desc, gte, lte } from "drizzle-orm";

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

  // Satamatka Market methods
  createSatamatkaMarket(market: InsertSatamatkaMarket): Promise<SatamatkaMarket>;
  getSatamatkaMarket(id: number): Promise<SatamatkaMarket | undefined>;
  getAllSatamatkaMarkets(): Promise<SatamatkaMarket[]>;
  getActiveSatamatkaMarkets(): Promise<SatamatkaMarket[]>;
  updateSatamatkaMarketResults(id: number, openResult?: string, closeResult?: string): Promise<SatamatkaMarket | undefined>;
  updateSatamatkaMarketStatus(id: number, status: string): Promise<SatamatkaMarket | undefined>;
  getSatamatkaGamesByMarketId(marketId: number): Promise<Game[]>;

  // Team Match methods
  createTeamMatch(match: InsertTeamMatch): Promise<TeamMatch>;
  getTeamMatch(id: number): Promise<TeamMatch | undefined>;
  getAllTeamMatches(): Promise<TeamMatch[]>;
  getActiveTeamMatches(): Promise<TeamMatch[]>;
  updateTeamMatchResult(id: number, result: string): Promise<TeamMatch | undefined>;
  updateTeamMatchStatus(id: number, status: string): Promise<TeamMatch | undefined>;
  getTeamMatchesByCategory(category: string): Promise<TeamMatch[]>; 
  getTeamMatchGamesByMatchId(matchId: number): Promise<Game[]>;

  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUserId(userId: number): Promise<Transaction[]>;
  getAllTransactions(limit?: number): Promise<Transaction[]>;

  // System Settings methods
  getSystemSetting(settingType: string, settingKey: string): Promise<SystemSetting | undefined>;
  upsertSystemSetting(settingType: string, settingKey: string, settingValue: string): Promise<SystemSetting>;
  getSystemSettingsByType(settingType: string): Promise<SystemSetting[]>;
  
  // Subadmin Commission methods
  getSubadminCommissions(subadminId: number): Promise<SubadminCommission[]>;
  upsertSubadminCommission(subadminId: number, gameType: string, commissionRate: number): Promise<SubadminCommission>;
  
  // User Discount methods
  getUserDiscounts(userId: number, subadminId: number): Promise<UserDiscount[]>;
  upsertUserDiscount(subadminId: number, userId: number, gameType: string, discountRate: number): Promise<UserDiscount>;
  
  // Game Odds methods
  getGameOdds(gameType: string): Promise<GameOdd[]>;
  getGameOddsBySubadmin(subadminId: number, gameType?: string): Promise<GameOdd[]>;
  upsertGameOdd(gameType: string, oddValue: number, setByAdmin: boolean, subadminId?: number): Promise<GameOdd>;

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
    
    // Check if Satamatka markets exist and seed them if not
    this.checkAndSeedSatamatkaMarkets();
  }
  
  /**
   * Check if Satamatka markets exist and seed them if not
   */
  private async checkAndSeedSatamatkaMarkets() {
    try {
      const existingMarkets = await db.select().from(satamatkaMarkets);
      
      if (existingMarkets.length === 0) {
        console.log("Seeding Satamatka markets...");
        await this.seedSatamatkaMarkets();
        console.log("Satamatka markets seeded successfully!");
      }
    } catch (error) {
      console.error("Error checking/seeding Satamatka markets:", error);
    }
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
        
        // Seed Satamatka markets
        await this.seedSatamatkaMarkets();
        
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
   * Seed Satamatka markets
   */
  private async seedSatamatkaMarkets() {
    const now = new Date();
    const markets = [
      {
        name: "Dishawar Morning",
        type: "dishawar",
        openTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0), // 9:00 AM
        closeTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30), // 10:30 AM
        status: "open",
      },
      {
        name: "Gali Day",
        type: "gali",
        openTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0), // 11:00 AM
        closeTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 30), // 12:30 PM
        status: "open",
      },
      {
        name: "Mumbai Afternoon",
        type: "mumbai",
        openTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0), // 2:00 PM
        closeTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 30), // 3:30 PM
        status: "open",
      },
      {
        name: "Kalyan Evening",
        type: "kalyan",
        openTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0), // 5:00 PM
        closeTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 30), // 6:30 PM
        status: "open",
      },
      {
        name: "Dishawar Night",
        type: "dishawar",
        openTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0), // 8:00 PM
        closeTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 30), // 9:30 PM
        status: "open",
      },
    ];
    
    for (const market of markets) {
      await this.createSatamatkaMarket(market as InsertSatamatkaMarket);
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
        gameType: "coin_flip", // explicitly set game type for existing games
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

  // Satamatka Market methods
  async createSatamatkaMarket(market: InsertSatamatkaMarket): Promise<SatamatkaMarket> {
    const [createdMarket] = await db.insert(satamatkaMarkets).values(market).returning();
    return createdMarket;
  }

  async getSatamatkaMarket(id: number): Promise<SatamatkaMarket | undefined> {
    const [market] = await db.select().from(satamatkaMarkets).where(eq(satamatkaMarkets.id, id));
    return market;
  }

  async getAllSatamatkaMarkets(): Promise<SatamatkaMarket[]> {
    return await db.select().from(satamatkaMarkets).orderBy(desc(satamatkaMarkets.createdAt));
  }

  async getActiveSatamatkaMarkets(): Promise<SatamatkaMarket[]> {
    const now = new Date();
    return await db
      .select()
      .from(satamatkaMarkets)
      .where(
        and(
          gte(satamatkaMarkets.closeTime, now), // Market's close time is in the future
          eq(satamatkaMarkets.status, "open")
        )
      )
      .orderBy(satamatkaMarkets.closeTime);
  }

  async updateSatamatkaMarketResults(id: number, openResult?: string, closeResult?: string): Promise<SatamatkaMarket | undefined> {
    const updateData: any = {};
    if (openResult !== undefined) updateData.openResult = openResult;
    if (closeResult !== undefined) updateData.closeResult = closeResult;
    
    if (Object.keys(updateData).length === 0) return this.getSatamatkaMarket(id);
    
    // If close result is being set, automatically update status to "resulted"
    if (closeResult !== undefined) {
      updateData.status = "resulted";
    }
    
    const [market] = await db
      .update(satamatkaMarkets)
      .set(updateData)
      .where(eq(satamatkaMarkets.id, id))
      .returning();
    
    return market;
  }

  async updateSatamatkaMarketStatus(id: number, status: string): Promise<SatamatkaMarket | undefined> {
    const [market] = await db
      .update(satamatkaMarkets)
      .set({ status })
      .where(eq(satamatkaMarkets.id, id))
      .returning();
    
    return market;
  }

  async getSatamatkaGamesByMarketId(marketId: number): Promise<Game[]> {
    return await db
      .select()
      .from(games)
      .where(eq(games.marketId, marketId))
      .orderBy(desc(games.createdAt));
  }

  // Team Match methods
  async createTeamMatch(match: InsertTeamMatch): Promise<TeamMatch> {
    const [createdMatch] = await db.insert(teamMatches).values(match).returning();
    return createdMatch;
  }

  async getTeamMatch(id: number): Promise<TeamMatch | undefined> {
    const [match] = await db.select().from(teamMatches).where(eq(teamMatches.id, id));
    return match;
  }

  async getAllTeamMatches(): Promise<TeamMatch[]> {
    return await db.select().from(teamMatches).orderBy(desc(teamMatches.createdAt));
  }

  async getActiveTeamMatches(): Promise<TeamMatch[]> {
    const now = new Date();
    return await db
      .select()
      .from(teamMatches)
      .where(
        and(
          gte(teamMatches.matchTime, now), // Match time is in the future
          eq(teamMatches.status, "open")
        )
      )
      .orderBy(teamMatches.matchTime);
  }

  async updateTeamMatchResult(id: number, result: string): Promise<TeamMatch | undefined> {
    // When setting result, also update status to "resulted"
    const [match] = await db
      .update(teamMatches)
      .set({ 
        result,
        status: "resulted" 
      })
      .where(eq(teamMatches.id, id))
      .returning();
    
    return match;
  }

  async updateTeamMatchStatus(id: number, status: string): Promise<TeamMatch | undefined> {
    const [match] = await db
      .update(teamMatches)
      .set({ status })
      .where(eq(teamMatches.id, id))
      .returning();
    
    return match;
  }

  async getTeamMatchesByCategory(category: string): Promise<TeamMatch[]> {
    return await db
      .select()
      .from(teamMatches)
      .where(eq(teamMatches.category, category))
      .orderBy(desc(teamMatches.createdAt));
  }

  async getTeamMatchGamesByMatchId(matchId: number): Promise<Game[]> {
    return await db
      .select()
      .from(games)
      .where(eq(games.matchId, matchId))
      .orderBy(desc(games.createdAt));
  }
}

export const storage = new DatabaseStorage();
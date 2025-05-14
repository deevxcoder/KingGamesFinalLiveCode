import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { 
  users, 
  games, 
  satamatkaMarkets,
  teamMatches,
  systemSettings,
  subadminCommissions,
  userDiscounts,
  playerDepositDiscounts,
  gameOdds,
  transactions,
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
  MarketStatus,
  RecurrencePattern,
  InsertSystemSetting,
  SubadminCommission,
  InsertSubadminCommission,
  UserDiscount,
  InsertUserDiscount,
  PlayerDepositDiscount,
  InsertPlayerDepositDiscount,
  GameOdd,
  InsertGameOdd,
  Transaction,
  InsertTransaction,
  RequestType,
  walletRequests,
  RequestStatus,
  InsertWalletRequest,
  WalletRequest,
  PaymentMode,
  GameType
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, desc, and, lt, gt, gte, lte, ne, isNotNull, or, sql, asc, count, in as drizzleIn, isNull, like, not } from 'drizzle-orm';
import { add, addDays, differenceInDays, addHours, isBefore, format, parse, startOfDay, isWithinInterval, setHours, setMinutes, addMinutes, addSeconds, isPast, addMilliseconds } from 'date-fns';
import { QueryResult } from '@neondatabase/serverless';
import { PgColumn, SQL } from 'drizzle-orm/pg-core';
import { ColumnBaseConfig, ColumnDataType } from 'drizzle-orm/column';

const scryptPromise = promisify(scrypt);

/**
 * Hash a password using scrypt
 */
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptPromise(password, salt, 64) as Buffer;
  return salt + ':' + derivedKey.toString('hex');
}

/**
 * Verify a password against a hash
 */
async function verifyPassword(storedPassword: string, suppliedPassword: string) {
  const [salt, key] = storedPassword.split(':');
  const derivedKey = await scryptPromise(suppliedPassword, salt, 64) as Buffer;
  return key === derivedKey.toString('hex');
}

/**
 * Storage interface for database operations
 */
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUsersByAssignedTo(assignedToId: number): Promise<User[]>;
  updateUserBalance(userId: number, newBalance: number): Promise<User | undefined>;
  updateUser(userId: number, data: {username?: string; password?: string}): Promise<User | undefined>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<User | undefined>;
  blockUser(userId: number, blockedById: number): Promise<User | undefined>;
  unblockUser(userId: number): Promise<User | undefined>;
  getBlockedByUser(userId: number): Promise<number | null>;
  assignUserToAdmin(userId: number, adminId: number): Promise<User | undefined>;
  
  // Game methods
  createGame(game: InsertGame): Promise<Game>;
  getGame(id: number): Promise<Game | undefined>;
  getGamesByUserId(userId: number): Promise<Game[]>;
  getGamesByUserIds(userIds: number[]): Promise<Game[]>;
  getAllGames(limit?: number): Promise<Game[]>;
  getRecentGames(userId: number, limit?: number): Promise<Game[]>;
  updateGameStatus(gameId: number, status: string): Promise<Game | undefined>;
  updateGameResult(gameId: number, result: string, payout?: number): Promise<Game | undefined>;

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
  updateTeamMatch(id: number, data: Partial<InsertTeamMatch>): Promise<TeamMatch | undefined>;
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
  
  // Player deposit discount methods
  getPlayerDepositDiscount(userId: number, subadminId: number): Promise<PlayerDepositDiscount | undefined>;
  upsertPlayerDepositDiscount(subadminId: number, userId: number, discountRate: number): Promise<PlayerDepositDiscount>;
  
  // Game Odds methods
  getGameOdds(gameType: string): Promise<GameOdd[]>;
  getGameOddsBySubadmin(subadminId: number, gameType?: string): Promise<GameOdd[]>;
  upsertGameOdd(gameType: string, oddValue: number, setByAdmin: boolean, subadminId?: number): Promise<GameOdd>;
  getOddsForPlayer(userId: number, gameType: string): Promise<number>;

  // Admin seeding methods
  seedCricketTossGames(): Promise<void>;
  seedDemoSatamatkaMarkets(): Promise<void>;

  // Session store
  sessionStore: session.Store;
}

/**
 * Database storage implementation for Postgres
 */
export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    const PgStore = connectPg(session);
    this.sessionStore = new PgStore({
      pool,
      tableName: 'sessions'
    });
    
    // Check and seed Satamatka markets if needed
    this.checkAndSeedSatamatkaMarkets();
    
    // Check and seed initial data if needed
    this.seedInitialData();
  }

  /**
   * Seed Cricket Toss games for demonstration
   * Made public so it can be called via API
   */
  async seedCricketTossGames() {
    // Implementation omitted for brevity
  }

  /**
   * Check if Satamatka markets exist and seed them if not
   */
  private async checkAndSeedSatamatkaMarkets() {
    // Implementation omitted for brevity
  }

  /**
   * Seed the database with initial test data if needed
   */
  private async seedInitialData() {
    // Implementation omitted for brevity
  }

  /**
   * Seed empty Satamatka markets with "00" default results
   */
  private async seedSatamatkaMarkets() {
    // Implementation omitted for brevity
  }

  /**
   * Seed random games for a user
   */
  private async seedGamesForUser(userId: number, count: number) {
    // Implementation omitted for brevity
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Implementation omitted for brevity
  }

  async getAllUsers(): Promise<User[]> {
    // Implementation omitted for brevity
  }

  async getUsersByAssignedTo(assignedToId: number): Promise<User[]> {
    // Implementation omitted for brevity
  }

  async updateUserBalance(userId: number, newBalance: number): Promise<User | undefined> {
    // Implementation omitted for brevity
  }

  async updateUser(userId: number, data: {username?: string; password?: string}): Promise<User | undefined> {
    // Implementation omitted for brevity
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<User | undefined> {
    // Implementation omitted for brevity
  }

  async blockUser(userId: number, blockedById: number): Promise<User | undefined> {
    // Implementation omitted for brevity
  }

  async unblockUser(userId: number): Promise<User | undefined> {
    // Implementation omitted for brevity
  }

  async getBlockedByUser(userId: number): Promise<number | null> {
    // Implementation omitted for brevity
  }

  async assignUserToAdmin(userId: number, adminId: number): Promise<User | undefined> {
    // Implementation omitted for brevity
  }

  // Game methods implementations omitted for brevity

  // Transaction methods implementations omitted for brevity

  // Satamatka Market methods implementations omitted for brevity

  // Team Match methods implementations omitted for brevity

  // System Settings methods implementations omitted for brevity

  // Subadmin Commission methods implementations omitted for brevity

  // User Discount methods
  async getUserDiscounts(userId: number, subadminId: number): Promise<UserDiscount[]> {
    // Implementation unchanged
    return await db
      .select()
      .from(userDiscounts)
      .where(
        and(
          eq(userDiscounts.userId, userId),
          eq(userDiscounts.subadminId, subadminId)
        )
      )
      .orderBy(userDiscounts.gameType);
  }

  async upsertUserDiscount(subadminId: number, userId: number, gameType: string, discountRate: number): Promise<UserDiscount> {
    // Implementation unchanged
    // Check if discount already exists
    const [existing] = await db
      .select()
      .from(userDiscounts)
      .where(
        and(
          eq(userDiscounts.subadminId, subadminId),
          eq(userDiscounts.userId, userId),
          eq(userDiscounts.gameType, gameType)
        )
      );
    
    if (existing) {
      // Update existing discount
      const [updated] = await db
        .update(userDiscounts)
        .set({ 
          discountRate,
          updatedAt: new Date()
        })
        .where(eq(userDiscounts.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new discount
      const [created] = await db
        .insert(userDiscounts)
        .values({
          subadminId,
          userId,
          gameType,
          discountRate,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return created;
    }
  }

  // Player Deposit Discount methods
  async getPlayerDepositDiscount(userId: number, subadminId: number): Promise<PlayerDepositDiscount | undefined> {
    const [discount] = await db
      .select()
      .from(playerDepositDiscounts)
      .where(
        and(
          eq(playerDepositDiscounts.userId, userId),
          eq(playerDepositDiscounts.subadminId, subadminId)
        )
      );
    
    return discount;
  }

  async upsertPlayerDepositDiscount(subadminId: number, userId: number, discountRate: number): Promise<PlayerDepositDiscount> {
    // Check if discount already exists
    const [existing] = await db
      .select()
      .from(playerDepositDiscounts)
      .where(
        and(
          eq(playerDepositDiscounts.subadminId, subadminId),
          eq(playerDepositDiscounts.userId, userId)
        )
      );
    
    if (existing) {
      // Update existing discount
      const [updated] = await db
        .update(playerDepositDiscounts)
        .set({ 
          discountRate,
          updatedAt: new Date()
        })
        .where(eq(playerDepositDiscounts.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new discount
      const [created] = await db
        .insert(playerDepositDiscounts)
        .values({
          subadminId,
          userId,
          discountRate,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return created;
    }
  }

  // Game Odds methods
  async getGameOdds(gameType: string): Promise<GameOdd[]> {
    // Implementation omitted for brevity
  }

  // More methods implementation omitted for brevity
}

export const storage = new DatabaseStorage();
import { users, games, transactions, User, InsertUser, Game, InsertGame, Transaction, InsertTransaction, UserRole } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUsersByAssignedTo(assignedToId: number): Promise<User[]>;
  updateUserBalance(userId: number, newBalance: number): Promise<User | undefined>;
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

  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private games: Map<number, Game>;
  private transactions: Map<number, Transaction>;
  private userIdCounter: number;
  private gameIdCounter: number;
  private transactionIdCounter: number;
  public sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.games = new Map();
    this.transactions = new Map();
    this.userIdCounter = 1;
    this.gameIdCounter = 1;
    this.transactionIdCounter = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24h
    });

    // Seed test users for demonstration purposes
    this.seedTestUsers();
  }
  
  /**
   * Seed test users with different roles for demonstration
   */
  private async seedTestUsers() {
    // Import the hashPassword function from auth.ts
    const { hashPassword } = await import('./auth');
    
    // Admin user
    const admin = await this.createUser({
      username: "admin",
      password: await hashPassword("admin123"),
      role: UserRole.ADMIN,
    });
    
    // Subadmin user (assigned to admin)
    const subadmin = await this.createUser({
      username: "subadmin",
      password: await hashPassword("subadmin123"),
      role: UserRole.SUBADMIN,
      assignedTo: admin.id,
    });
    
    // Player user (assigned to admin)
    const player1 = await this.createUser({
      username: "player1",
      password: await hashPassword("player123"),
      role: UserRole.PLAYER,
      assignedTo: admin.id,
    });
    
    // Player user (assigned to subadmin)
    const player2 = await this.createUser({
      username: "player2",
      password: await hashPassword("player123"),
      role: UserRole.PLAYER,
      assignedTo: subadmin.id,
    });
    
    // Seed some games for player1
    this.seedGames(player1.id, 10);
    
    // Seed some games for player2
    this.seedGames(player2.id, 5);
    
    console.log("Test users and data seeded successfully!");
    console.log("----------------------------------------");
    console.log("Test Accounts:");
    console.log("- Admin: username=admin, password=admin123");
    console.log("- Subadmin: username=subadmin, password=subadmin123");
    console.log("- Player 1: username=player1, password=player123");
    console.log("- Player 2: username=player2, password=player123");
    console.log("----------------------------------------");
  }
  
  /**
   * Seed random games for a user
   */
  private seedGames(userId: number, count: number) {
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
      const betAmount = Math.floor(Math.random() * 1000) + 100; // Random between 100-1100
      const prediction = Math.random() > 0.5 ? "heads" : "tails";
      const result = Math.random() > 0.5 ? "heads" : "tails";
      const isWin = prediction === result;
      const payout = isWin ? Math.floor(betAmount * 1.95) : 0;
      
      // Create game with timestamp slightly in the past
      const pastTime = new Date(now.getTime() - (i * 15 * 60 * 1000)); // 15 minutes between games
      
      const gameId = this.gameIdCounter++;
      this.games.set(gameId, {
        id: gameId,
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
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id, isBlocked: false, balance: 1000 };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUsersByAssignedTo(assignedToId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.assignedTo === assignedToId
    );
  }

  async updateUserBalance(userId: number, newBalance: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (user) {
      user.balance = newBalance;
      this.users.set(userId, user);
      return user;
    }
    return undefined;
  }

  async blockUser(userId: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (user) {
      user.isBlocked = true;
      this.users.set(userId, user);
      return user;
    }
    return undefined;
  }

  async unblockUser(userId: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (user) {
      user.isBlocked = false;
      this.users.set(userId, user);
      return user;
    }
    return undefined;
  }

  async assignUserToAdmin(userId: number, adminId: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (user) {
      user.assignedTo = adminId;
      this.users.set(userId, user);
      return user;
    }
    return undefined;
  }

  // Game methods
  async createGame(insertGame: InsertGame): Promise<Game> {
    const id = this.gameIdCounter++;
    const now = new Date();
    const game: Game = { ...insertGame, id, createdAt: now };
    this.games.set(id, game);
    return game;
  }

  async getGamesByUserId(userId: number): Promise<Game[]> {
    return Array.from(this.games.values())
      .filter((game) => game.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getAllGames(limit?: number): Promise<Game[]> {
    const games = Array.from(this.games.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return limit ? games.slice(0, limit) : games;
  }

  // Transaction methods
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionIdCounter++;
    const now = new Date();
    const transaction: Transaction = { ...insertTransaction, id, createdAt: now };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async getTransactionsByUserId(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((transaction) => transaction.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export const storage = new MemStorage();

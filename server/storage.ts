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

    // Create initial admin user for testing
    this.createUser({
      username: "admin",
      password: "admin123", // This will be hashed in auth.ts
      role: UserRole.ADMIN,
    });
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

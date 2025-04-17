import { pgTable, text, serial, integer, boolean, timestamp, foreignKey, json, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User roles
export const UserRole = {
  ADMIN: "admin",
  SUBADMIN: "subadmin",
  PLAYER: "player",
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// Game outcomes
export const GameOutcome = {
  HEADS: "heads",
  TAILS: "tails",
} as const;

export type GameOutcomeType = typeof GameOutcome[keyof typeof GameOutcome];

// Game types
export const GameType = {
  COIN_FLIP: "coin_flip",
  SATAMATKA: "satamatka",
  TEAM_MATCH: "team_match",
  CRICKET_TOSS: "cricket_toss",
} as const;

export type GameTypeValue = typeof GameType[keyof typeof GameType];

// Team Match results
export const TeamMatchResult = {
  TEAM_A: "team_a",
  TEAM_B: "team_b",
  DRAW: "draw",
  PENDING: "pending",
} as const;

export type TeamMatchResultValue = typeof TeamMatchResult[keyof typeof TeamMatchResult];

// Match categories
export const MatchCategory = {
  CRICKET: "cricket",
  FOOTBALL: "football",
  BASKETBALL: "basketball",
  OTHER: "other",
} as const;

export type MatchCategoryValue = typeof MatchCategory[keyof typeof MatchCategory];

// Market types
export const MarketType = {
  DISHAWAR: "dishawar",
  GALI: "gali",
  MUMBAI: "mumbai",
  KALYAN: "kalyan",
} as const;

export type MarketTypeValue = typeof MarketType[keyof typeof MarketType];

// Satamatka Game Modes for Dishawar/Gali markets
export const SatamatkaGameMode = {
  JODI: "jodi", // Bet on two-digit number (00-99)
  HARF: "harf", // Bet on a single digit in a specific position (left or right)
  CROSSING: "crossing", // Cross betting
  ODD_EVEN: "odd_even", // Bet on whether the result will be odd or even
} as const;

export type SatamatkaGameModeValue = typeof SatamatkaGameMode[keyof typeof SatamatkaGameMode];

// Payment Method Enums
export const PaymentMode = {
  UPI: 'upi',
  BANK: 'bank',
  CASH: 'cash',
} as const;

export type PaymentModeType = typeof PaymentMode[keyof typeof PaymentMode];

export const RequestStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type RequestStatusType = typeof RequestStatus[keyof typeof RequestStatus];

export const RequestType = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
} as const;

export type RequestTypeValue = typeof RequestType[keyof typeof RequestType];

// Tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default(UserRole.PLAYER), // admin, subadmin, player
  balance: integer("balance").notNull().default(0),
  assignedTo: integer("assigned_to").references(() => users.id),
  isBlocked: boolean("is_blocked").notNull().default(false),
});

export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
    role: true,
    assignedTo: true,
  })
  .extend({
    role: z.enum([UserRole.ADMIN, UserRole.SUBADMIN, UserRole.PLAYER]),
  })
  .partial({
    assignedTo: true,
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  gameType: text("game_type").notNull().default(GameType.COIN_FLIP), // coin_flip, satamatka, team_match
  betAmount: integer("bet_amount").notNull(),
  prediction: text("prediction").notNull(), // For coin flip: "heads" or "tails", for satamatka: "0" to "9" or "00" to "99"
  result: text("result"), // For coin flip: "heads" or "tails", for satamatka: "0" to "9" or "00" to "99"
  payout: integer("payout").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  marketId: integer("market_id").references(() => satamatkaMarkets.id),
  matchId: integer("match_id").references(() => teamMatches.id),
  gameMode: text("game_mode"), // For satamatka: "single", "jodi", "patti"
});

export const insertGameSchema = createInsertSchema(games)
  .pick({
    userId: true,
    gameType: true,
    betAmount: true,
    prediction: true,
    result: true,
    payout: true,
    marketId: true,
    matchId: true,
    gameMode: true,
  })
  .extend({
    gameType: z.enum([GameType.COIN_FLIP, GameType.SATAMATKA, GameType.TEAM_MATCH, GameType.CRICKET_TOSS]),
    gameMode: z.enum([
      SatamatkaGameMode.JODI,
      SatamatkaGameMode.HARF,
      SatamatkaGameMode.CROSSING, 
      SatamatkaGameMode.ODD_EVEN
    ]).optional(),
  })
  .partial({
    result: true,
    marketId: true,
    matchId: true,
    gameMode: true,
  });

export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

export const satamatkaMarkets = pgTable("satamatka_markets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // dishawar, gali, mumbai, kalyan
  openTime: timestamp("open_time").notNull(),
  closeTime: timestamp("close_time").notNull(),
  openResult: text("open_result"),
  closeResult: text("close_result"),
  status: text("status").notNull().default("open"), // open, closed, resulted
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSatamatkaMarketSchema = createInsertSchema(satamatkaMarkets)
  .pick({
    name: true,
    type: true,
    openTime: true,
    closeTime: true,
    openResult: true,
    closeResult: true,
    status: true,
  })
  .extend({
    type: z.enum([MarketType.DISHAWAR, MarketType.GALI, MarketType.MUMBAI, MarketType.KALYAN]),
    coverImage: z.string().optional(),
    status: z.enum(["open", "closed", "resulted"]).default("open"),
  });

export type InsertSatamatkaMarket = z.infer<typeof insertSatamatkaMarketSchema>;
export type SatamatkaMarket = typeof satamatkaMarkets.$inferSelect;

// Wallet Request Schema
export const walletRequests = pgTable("wallet_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  amount: integer("amount").notNull(), // in cents
  requestType: text("request_type").notNull(), // 'deposit' or 'withdrawal'
  paymentMode: text("payment_mode").notNull(), // 'upi', 'bank', 'cash'
  paymentDetails: json("payment_details").notNull(),
  status: text("status").notNull().default(RequestStatus.PENDING), // 'pending', 'approved', 'rejected'
  proofImageUrl: text("proof_image_url"),
  notes: text("notes"),
  reviewedBy: integer("reviewed_by").references(() => users.id), // ID of admin/subadmin who reviewed this request
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Transaction Schema
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  amount: integer("amount").notNull(), // positive for deposit, negative for withdrawal
  performedBy: integer("performed_by")
    .notNull()
    .references(() => users.id), // ID of admin/subadmin who performed this action
  requestId: integer("request_id").references(() => walletRequests.id), // Reference to the wallet request if applicable
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertTransactionSchema = createInsertSchema(transactions)
  .pick({
    userId: true,
    amount: true,
    performedBy: true,
    requestId: true,
  })
  .partial({
    requestId: true,
  });

export const insertWalletRequestSchema = createInsertSchema(walletRequests)
  .pick({
    userId: true,
    amount: true,
    requestType: true,
    paymentMode: true,
    paymentDetails: true,
    proofImageUrl: true,
    notes: true,
  })
  .extend({
    requestType: z.enum([RequestType.DEPOSIT, RequestType.WITHDRAWAL]),
    paymentMode: z.enum([PaymentMode.UPI, PaymentMode.BANK, PaymentMode.CASH]),
  })
  .partial({
    proofImageUrl: true,
    notes: true,
  });

export type InsertWalletRequest = z.infer<typeof insertWalletRequestSchema>;
export type WalletRequest = typeof walletRequests.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Team Matches Schema
export const teamMatches = pgTable("team_matches", {
  id: serial("id").primaryKey(),
  teamA: text("team_a").notNull(),
  teamB: text("team_b").notNull(),
  category: text("category").notNull().default(MatchCategory.CRICKET), // cricket, football, basketball, other
  description: text("description"),
  matchTime: timestamp("match_time").notNull(),
  result: text("result").notNull().default(TeamMatchResult.PENDING), // team_a, team_b, draw, pending
  oddTeamA: integer("odd_team_a").notNull().default(200), // 2.00 decimal odds represented as integer (200)
  oddTeamB: integer("odd_team_b").notNull().default(200), // 2.00 decimal odds
  oddDraw: integer("odd_draw").default(300), // 3.00 decimal odds
  status: text("status").notNull().default("open"), // open, closed, resulted
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTeamMatchSchema = createInsertSchema(teamMatches)
  .pick({
    teamA: true,
    teamB: true,
    category: true,
    description: true,
    matchTime: true,
    result: true,
    oddTeamA: true,
    oddTeamB: true,
    oddDraw: true,
    status: true,
  })
  .extend({
    category: z.enum([
      MatchCategory.CRICKET,
      MatchCategory.FOOTBALL,
      MatchCategory.BASKETBALL,
      MatchCategory.OTHER
    ]).default(MatchCategory.CRICKET),
    result: z.enum([
      TeamMatchResult.TEAM_A,
      TeamMatchResult.TEAM_B,
      TeamMatchResult.DRAW,
      TeamMatchResult.PENDING
    ]).default(TeamMatchResult.PENDING),
    status: z.enum(["open", "closed", "resulted"]).default("open"),
  });

export type InsertTeamMatch = z.infer<typeof insertTeamMatchSchema>;
export type TeamMatch = typeof teamMatches.$inferSelect;

// Define relations after all tables are defined
export const usersRelations = relations(users, ({ one, many }) => ({
  // Self-relation for assignedTo
  assignedToUser: one(users, {
    fields: [users.assignedTo],
    references: [users.id],
    relationName: "assignedToUser",
  }),
  // Inverse of assignedTo relation
  assignedUsers: many(users, { relationName: "assignedToUser" }),
  // Relation to games
  games: many(games),
  // Relation to transactions
  transactions: many(transactions, { relationName: "userTransactions" }),
  // Relation to transactions performed by this user
  performedTransactions: many(transactions, { relationName: "performedByTransactions" }),
  // Relation to wallet requests
  walletRequests: many(walletRequests),
}));

export const gamesRelations = relations(games, ({ one }) => ({
  user: one(users, {
    fields: [games.userId],
    references: [users.id],
  }),
  market: one(satamatkaMarkets, {
    fields: [games.marketId],
    references: [satamatkaMarkets.id],
    relationName: "marketGames",
  }),
  match: one(teamMatches, {
    fields: [games.matchId],
    references: [teamMatches.id],
    relationName: "teamMatchGames",
  }),
}));

export const satamatkaMarketsRelations = relations(satamatkaMarkets, ({ many }) => ({
  games: many(games, { relationName: "marketGames" }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  // User who this transaction affects
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
    relationName: "userTransactions",
  }),
  // User who performed this transaction
  performer: one(users, {
    fields: [transactions.performedBy],
    references: [users.id],
    relationName: "performedByTransactions",
  }),
  // Relation to wallet request
  request: one(walletRequests, {
    fields: [transactions.requestId],
    references: [walletRequests.id],
  }),
}));

export const walletRequestsRelations = relations(walletRequests, ({ one, many }) => ({
  // User who made this request
  user: one(users, {
    fields: [walletRequests.userId],
    references: [users.id],
  }),
  // Admin/subadmin who reviewed this request
  reviewer: one(users, {
    fields: [walletRequests.reviewedBy],
    references: [users.id],
  }),
  // Transactions related to this request
  transactions: many(transactions),
}));

export const teamMatchesRelations = relations(teamMatches, ({ many }) => ({
  games: many(games, { relationName: "teamMatchGames" }),
}));

// System Settings Schema
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  settingType: text("setting_type").notNull(), // payment, odds, commission, etc.
  settingKey: text("setting_key").notNull(),
  settingValue: text("setting_value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings);
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;

// SubAdmin Commission Schema
export const subadminCommissions = pgTable("subadmin_commissions", {
  id: serial("id").primaryKey(),
  subadminId: integer("subadmin_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  gameType: text("game_type").notNull(), // satamatka_single, satamatka_jodi, etc.
  commissionRate: integer("commission_rate").notNull(), // percentage (stored as integer, e.g. 525 = 5.25%)
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSubadminCommissionSchema = createInsertSchema(subadminCommissions);
export type InsertSubadminCommission = z.infer<typeof insertSubadminCommissionSchema>;
export type SubadminCommission = typeof subadminCommissions.$inferSelect;

// User Discount Schema (set by subadmin)
export const userDiscounts = pgTable("user_discounts", {
  id: serial("id").primaryKey(),
  subadminId: integer("subadmin_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  gameType: text("game_type").notNull(), // satamatka_single, satamatka_jodi, etc.
  discountRate: integer("discount_rate").notNull(), // percentage (stored as integer, e.g. 525 = 5.25%)
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserDiscountSchema = createInsertSchema(userDiscounts);
export type InsertUserDiscount = z.infer<typeof insertUserDiscountSchema>;
export type UserDiscount = typeof userDiscounts.$inferSelect;

// Game Odds Schema
export const gameOdds = pgTable("game_odds", {
  id: serial("id").primaryKey(),
  gameType: text("game_type").notNull(), // satamatka_single, satamatka_jodi, etc.
  oddValue: integer("odd_value").notNull(), // multiplier (stored as integer, e.g. 250 = 2.50x)
  setByAdmin: boolean("set_by_admin").default(true).notNull(), // true if set by admin, false if by subadmin
  subadminId: integer("subadmin_id").references(() => users.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGameOddSchema = createInsertSchema(gameOdds);
export type InsertGameOdd = z.infer<typeof insertGameOddSchema>;
export type GameOdd = typeof gameOdds.$inferSelect;

// Relations
export const subadminCommissionsRelations = relations(subadminCommissions, ({ one }) => ({
  subadmin: one(users, { fields: [subadminCommissions.subadminId], references: [users.id] }),
}));

export const userDiscountsRelations = relations(userDiscounts, ({ one }) => ({
  subadmin: one(users, { fields: [userDiscounts.subadminId], references: [users.id] }),
  user: one(users, { fields: [userDiscounts.userId], references: [users.id] }),
}));

export const gameOddsRelations = relations(gameOdds, ({ one }) => ({
  subadmin: one(users, { fields: [gameOdds.subadminId], references: [users.id] }),
}));
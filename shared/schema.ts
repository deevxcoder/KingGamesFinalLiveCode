import { pgTable, text, serial, integer, boolean, timestamp, foreignKey } from "drizzle-orm/pg-core";
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

// Satamatka Market types
export const MarketType = {
  DISHAWAR: "dishawar",
  GALI: "gali",
  MUMBAI: "mumbai",
  KALYAN: "kalyan",
} as const;

export type MarketTypeValue = typeof MarketType[keyof typeof MarketType];

// Satamatka Game modes
export const SatamatkaGameMode = {
  JODI: "jodi",
  HURF: "hurf",
  CROSS: "cross",
  ODD_EVEN: "odd_even",
} as const;

export type SatamatkaGameModeValue = typeof SatamatkaGameMode[keyof typeof SatamatkaGameMode];

// User Schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default(UserRole.PLAYER),
  balance: integer("balance").notNull().default(1000), // Starting balance of 1000 cents ($10.00)
  assignedTo: integer("assigned_to").references(() => users.id), // ID of admin/subadmin this user is assigned to
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
    role: z.enum([UserRole.ADMIN, UserRole.SUBADMIN, UserRole.PLAYER]).default(UserRole.PLAYER),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Game Records Schema
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  gameType: text("game_type").notNull().default(GameType.COIN_FLIP), // coin_flip, satamatka, or team_match
  betAmount: integer("bet_amount").notNull(), // in cents
  prediction: text("prediction").notNull(), // heads/tails or number for satamatka or team_a/team_b/draw for team_match
  result: text("result").notNull(), // heads/tails or number for satamatka or team_a/team_b/draw for team_match
  payout: integer("payout").notNull(), // in cents
  createdAt: timestamp("created_at").defaultNow(),
  // For Satamatka games
  marketId: integer("market_id").references(() => satamatkaMarkets.id),
  gameMode: text("game_mode"), // jodi, hurf, cross, odd_even for satamatka
  // For Team Match games
  matchId: integer("match_id").references(() => teamMatches.id),
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
    gameMode: true,
    matchId: true,
  })
  .extend({
    gameType: z.enum([GameType.COIN_FLIP, GameType.SATAMATKA, GameType.TEAM_MATCH]).default(GameType.COIN_FLIP),
  });

export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

// Satamatka Markets Schema
export const satamatkaMarkets = pgTable("satamatka_markets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // dishawar, gali, mumbai, kalyan
  coverImage: text("cover_image"), // URL or path to cover image
  marketDate: timestamp("market_date").notNull(), // Date of the market
  openTime: timestamp("open_time").notNull(),
  closeTime: timestamp("close_time").notNull(),
  resultTime: timestamp("result_time").notNull(), // Time when result will be declared
  openResult: text("open_result"), // Two-digit number (00-99)
  closeResult: text("close_result"), // Two-digit number (00-99)
  status: text("status").notNull().default("open"), // open, closed, resulted
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSatamatkaMarketSchema = createInsertSchema(satamatkaMarkets)
  .pick({
    name: true,
    type: true,
    coverImage: true,
    marketDate: true,
    openTime: true,
    closeTime: true,
    resultTime: true,
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

// Fund Transaction Schema
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  amount: integer("amount").notNull(), // positive for deposit, negative for withdrawal
  performedBy: integer("performed_by")
    .notNull()
    .references(() => users.id), // ID of admin/subadmin who performed this action
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions)
  .pick({
    userId: true,
    amount: true,
    performedBy: true,
  });

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

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
}));

export const teamMatchesRelations = relations(teamMatches, ({ many }) => ({
  games: many(games, { relationName: "teamMatchGames" }),
}));

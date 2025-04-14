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
  betAmount: integer("bet_amount").notNull(), // in cents
  prediction: text("prediction").notNull(), // heads or tails
  result: text("result").notNull(), // heads or tails
  payout: integer("payout").notNull(), // in cents
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGameSchema = createInsertSchema(games)
  .pick({
    userId: true,
    betAmount: true,
    prediction: true,
    result: true,
    payout: true,
  })
  .extend({
    prediction: z.enum([GameOutcome.HEADS, GameOutcome.TAILS]),
    result: z.enum([GameOutcome.HEADS, GameOutcome.TAILS]),
  });

export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

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
}));

import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  assignedTo: integer("assigned_to"), // ID of admin/subadmin this user is assigned to
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
  userId: integer("user_id").notNull(),
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
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(), // positive for deposit, negative for withdrawal
  performedBy: integer("performed_by").notNull(), // ID of admin/subadmin who performed this action
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

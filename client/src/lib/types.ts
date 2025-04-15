// User Roles
export const UserRole = {
  ADMIN: "admin",
  SUBADMIN: "subadmin",
  PLAYER: "player",
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

// Game types and outcomes
export const GameType = {
  COIN_FLIP: "coin_flip",
  SATAMATKA: "satamatka",
  TEAM_MATCH: "team_match",
} as const;

export type GameType = typeof GameType[keyof typeof GameType];

export const GameOutcome = {
  HEADS: "heads",
  TAILS: "tails",
} as const;

export type GameOutcome = typeof GameOutcome[keyof typeof GameOutcome];

// Satamatka Game Modes
export const SatamatkaGameMode = {
  SINGLE: "single",
  JODI: "jodi",
  PATTI: "patti",
} as const;

export type SatamatkaGameMode = typeof SatamatkaGameMode[keyof typeof SatamatkaGameMode];

// Market types
export const MarketType = {
  DISHAWAR: "dishawar",
  GALI: "gali",
  MUMBAI: "mumbai",
  KALYAN: "kalyan",
} as const;

export type MarketType = typeof MarketType[keyof typeof MarketType];

// Team Match results
export const TeamMatchResult = {
  TEAM_A: "team_a",
  TEAM_B: "team_b",
  DRAW: "draw",
  PENDING: "pending",
} as const;

export type TeamMatchResult = typeof TeamMatchResult[keyof typeof TeamMatchResult];

// Match categories
export const MatchCategory = {
  CRICKET: "cricket",
  FOOTBALL: "football",
  BASKETBALL: "basketball",
  OTHER: "other",
} as const;

export type MatchCategory = typeof MatchCategory[keyof typeof MatchCategory];

// Payment Methods
export const PaymentMode = {
  UPI: "upi",
  BANK: "bank",
  CASH: "cash",
} as const;

export type PaymentMode = typeof PaymentMode[keyof typeof PaymentMode];

// Request Types
export const RequestType = {
  DEPOSIT: "deposit",
  WITHDRAWAL: "withdrawal",
} as const;

export type RequestType = typeof RequestType[keyof typeof RequestType];

// Request Status
export const RequestStatus = {
  PENDING: "pending", 
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type RequestStatus = typeof RequestStatus[keyof typeof RequestStatus];

// User interface
export interface User {
  id: number;
  username: string;
  role: UserRole;
  balance: number;
  assignedTo: number | null;
  isBlocked: boolean;
}

// Game interface
export interface Game {
  id: number;
  userId: number;
  gameType: GameType;
  betAmount: number;
  prediction: string;
  result: string;
  payout: number;
  createdAt: string;
  marketId?: number;
  matchId?: number;
  gameMode?: SatamatkaGameMode;
}

// Wallet Request interface
export interface WalletRequest {
  id: number;
  userId: number;
  amount: number;
  requestType: RequestType;
  paymentMode: PaymentMode;
  paymentDetails: {
    upiId?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    handlerName?: string;
    handlerId?: string;
    utrNumber?: string;
    transactionId?: string;
  };
  status: RequestStatus;
  proofImageUrl?: string;
  notes?: string;
  reviewNotes?: string;
  reviewedBy?: number;
  createdAt: string;
  updatedAt: string;
}

// Transaction interface
export interface Transaction {
  id: number;
  userId: number;
  amount: number;
  performedBy: number;
  requestId?: number;
  createdAt: string;
}

// Satamatka Market interface
export interface SatamatkaMarket {
  id: number;
  name: string;
  type: MarketType;
  openTime: string;
  closeTime: string;
  openResult?: string;
  closeResult?: string;
  status: string;
  createdAt: string;
}

// Team Match interface 
export interface TeamMatch {
  id: number;
  teamA: string;
  teamB: string;
  category: MatchCategory;
  description?: string;
  matchTime: string;
  result: TeamMatchResult;
  oddTeamA: number;
  oddTeamB: number;
  oddDraw?: number;
  status: string;
  createdAt: string;
}
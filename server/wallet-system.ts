import { db } from './db';
import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole, walletRequests, users, transactions, systemSettings } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';

// Payment Modes
export const PaymentMode = {
  UPI: 'upi',
  BANK: 'bank',
  CASH: 'cash',
} as const;

// Request Status
export const RequestStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

// Request Type
export const RequestType = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
} as const;

// Validation schemas
export const walletRequestSchema = z.object({
  userId: z.number(),
  amount: z.number().positive(),
  requestType: z.enum([RequestType.DEPOSIT, RequestType.WITHDRAWAL]),
  paymentMode: z.enum([PaymentMode.UPI, PaymentMode.BANK, PaymentMode.CASH]),
  paymentDetails: z.object({
    upiId: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    handlerName: z.string().optional(),
    handlerId: z.string().optional(),
    utrNumber: z.string().optional(),
    transactionId: z.string().optional(),
  }),
  proofImageUrl: z.string().optional(),
  notes: z.string().optional(),
});

export const adminRequestReviewSchema = z.object({
  requestId: z.number(),
  status: z.enum([RequestStatus.APPROVED, RequestStatus.REJECTED]),
  notes: z.string().optional(),
});

// Wallet Request Types
export type WalletRequest = {
  id: number;
  userId: number;
  amount: number;
  requestType: typeof RequestType[keyof typeof RequestType];
  paymentMode: typeof PaymentMode[keyof typeof PaymentMode];
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
  status: typeof RequestStatus[keyof typeof RequestStatus];
  proofImageUrl?: string;
  notes?: string;
  reviewedBy?: number;
  createdAt: Date;
  updatedAt: Date;
};

// Helper functions for wallet requests
export async function createWalletRequest(walletRequest: Omit<WalletRequest, 'id' | 'status' | 'reviewedBy' | 'createdAt' | 'updatedAt'>) {
  try {
    // Store the request using Drizzle ORM
    const result = await db.insert(walletRequests).values({
      userId: walletRequest.userId,
      amount: walletRequest.amount,
      requestType: walletRequest.requestType,
      paymentMode: walletRequest.paymentMode,
      paymentDetails: walletRequest.paymentDetails,
      status: RequestStatus.PENDING,
      proofImageUrl: walletRequest.proofImageUrl || null,
      notes: walletRequest.notes || null,
    }).returning();

    return result[0];
  } catch (error) {
    console.error('Error creating wallet request:', error);
    throw new Error('Failed to create wallet request');
  }
}

export async function getWalletRequests(userId?: number, status?: string, requestType?: string, adminId?: number) {
  try {
    // For subadmin filtering, we need to use a raw SQL query for proper joining
    if (adminId) {
      // Import the connection pool for raw SQL queries
      const { pool } = await import('./db');
      
      const filters = [];
      const params = [];
      
      // Add base condition for assigned users
      filters.push(`u.assigned_to = $${params.length + 1}`);
      params.push(adminId);
      
      if (userId) {
        filters.push(`wr.user_id = $${params.length + 1}`);
        params.push(userId);
      }
      
      if (status) {
        filters.push(`wr.status = $${params.length + 1}`);
        params.push(status);
      }
      
      if (requestType) {
        filters.push(`wr.request_type = $${params.length + 1}`);
        params.push(requestType);
      }
      
      const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
      
      const result = await pool.query(
        `SELECT wr.* FROM wallet_requests wr
         JOIN users u ON wr.user_id = u.id
         ${whereClause}
         ORDER BY wr.created_at DESC`,
        params
      );
      
      return result.rows;
    }
    
    // For simple queries without admin filtering, use Drizzle's prepared statements
    const whereConditions = [];
    
    if (userId) {
      whereConditions.push(eq(walletRequests.userId, userId));
    }
    
    if (status) {
      whereConditions.push(eq(walletRequests.status, status));
    }
    
    if (requestType) {
      whereConditions.push(eq(walletRequests.requestType, requestType));
    }
    
    // Use the query builder with proper type handling
    if (whereConditions.length > 0) {
      return await db.select().from(walletRequests)
        .where(and(...whereConditions))
        .orderBy(desc(walletRequests.createdAt));
    } else {
      return await db.select().from(walletRequests)
        .orderBy(desc(walletRequests.createdAt));
    }
  } catch (error) {
    console.error('Error getting wallet requests:', error);
    throw new Error('Failed to get wallet requests');
  }
}

export async function reviewWalletRequest(
  requestId: number, 
  adminId: number, 
  status: typeof RequestStatus[keyof typeof RequestStatus], 
  notes?: string
) {
  try {
    // Import the connection pool for raw SQL transactions
    const { pool } = await import('./db');
    // For transactions, we need to use the raw pool to start/commit/rollback the transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update the request status
      const updatedRequests = await db
        .update(walletRequests)
        .set({
          status: status,
          notes: notes || null,
          reviewedBy: adminId,
          updatedAt: new Date()
        })
        .where(eq(walletRequests.id, requestId))
        .returning();
      
      if (updatedRequests.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('Wallet request not found');
      }
      
      const request = updatedRequests[0];
      
      // If request is approved, update the user's balance and create a transaction record
      if (status === RequestStatus.APPROVED) {
        const balanceChange = request.requestType === RequestType.DEPOSIT 
          ? request.amount 
          : -request.amount;
        
        // Update user balance with SQL function to add
        const updatedUsersResult = await client.query(
          'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING *',
          [balanceChange, request.userId]
        );
        
        if (updatedUsersResult.rowCount === 0) {
          await client.query('ROLLBACK');
          throw new Error('User not found');
        }
        
        // Create transaction record
        await db.insert(transactions).values({
          userId: request.userId,
          amount: balanceChange,
          performedBy: adminId,
          requestId: requestId,
        });
      }
      
      await client.query('COMMIT');
      return request;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error reviewing wallet request:', error);
    throw new Error('Failed to review wallet request');
  }
}

// Express router setup for wallet system
export function setupWalletRoutes(app: express.Express) {
  // Create a new wallet request (deposit or withdrawal)
  app.post('/api/wallet/requests', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const validatedData = walletRequestSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      const newRequest = await createWalletRequest(validatedData);
      res.status(201).json(newRequest);
    } catch (err) {
      next(err);
    }
  });
  
  // Get all wallet requests (admin/subadmin only)
  app.get('/api/wallet/requests', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Only admin and subadmin can access this endpoint
      if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUBADMIN) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      const { status, type } = req.query;
      
      // For admins, show all requests
      // For subadmins, show only requests from their assigned users
      const requests = await getWalletRequests(
        undefined, 
        status as string, 
        type as string,
        req.user.role === UserRole.SUBADMIN ? req.user.id : undefined
      );
      
      res.json(requests);
    } catch (err) {
      next(err);
    }
  });
  
  // Get user's own wallet requests
  app.get('/api/wallet/my-requests', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const requests = await getWalletRequests(req.user.id);
      res.json(requests);
    } catch (err) {
      next(err);
    }
  });
  
  // Admin/subadmin review a wallet request
  app.patch('/api/wallet/requests/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Only admin and subadmin can access this endpoint
      if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUBADMIN) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      const requestId = Number(req.params.id);
      
      // Validate the request data
      const validatedData = adminRequestReviewSchema.parse(req.body);
      
      // For subadmins, verify they can only approve requests from their assigned users
      if (req.user.role === UserRole.SUBADMIN) {
        // Import the connection pool for raw SQL transactions
        const { pool } = await import('./db');
        // Use a direct SQL query for this specific check
        const result = await pool.query(
          `SELECT wr.* FROM wallet_requests wr
           JOIN users u ON wr.user_id = u.id
           WHERE wr.id = $1 AND u.assigned_to = $2`,
          [requestId, req.user.id]
        );
        
        if (result.rowCount === 0) {
          return res.status(403).json({ message: 'You can only review requests from your assigned users' });
        }
      }
      
      const updatedRequest = await reviewWalletRequest(
        requestId,
        req.user.id,
        validatedData.status,
        validatedData.notes
      );
      
      res.json(updatedRequest);
    } catch (err) {
      next(err);
    }
  });
  
  // Get payment details defined by admin
  app.get('/api/wallet/payment-details', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Get payment details from settings
      const paymentSettings = await db.query.systemSettings.findFirst({
        where: eq(systemSettings.settingKey, 'payment_details')
      });
      
      // Default payment details if none found
      if (!paymentSettings) {
        return res.json({
          upi: {
            id: 'example@upi',
            qrCode: null,
          },
          bank: {
            name: 'Sample Bank',
            accountNumber: '123456789',
            ifscCode: 'SBIN0001234',
            accountHolder: 'Administrator',
          },
          cash: {
            instructions: 'Contact administrator for cash payment',
          },
        });
      }
      
      // Parse the setting value safely
      let parsedValue;
      try {
        parsedValue = JSON.parse(paymentSettings.settingValue);
      } catch (e) {
        console.error('Error parsing payment details:', e);
        parsedValue = {};
      }
      
      res.json(parsedValue);
    } catch (err) {
      next(err);
    }
  });
  
  // Update payment details (admin only)
  app.put('/api/wallet/payment-details', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Only admin can update payment details
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      // Convert request body to JSON string
      const settingValueJson = JSON.stringify(req.body);
      
      // Check if the setting already exists
      const existingSetting = await db.query.systemSettings.findFirst({
        where: eq(systemSettings.settingKey, 'payment_details')
      });
      
      if (existingSetting) {
        // Update existing setting
        await db.update(systemSettings)
          .set({
            settingValue: settingValueJson
          })
          .where(eq(systemSettings.settingKey, 'payment_details'));
      } else {
        // Insert new setting
        await db.insert(systemSettings).values({
          settingType: 'payment',
          settingKey: 'payment_details',
          settingValue: settingValueJson
        });
      }
      
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });
}
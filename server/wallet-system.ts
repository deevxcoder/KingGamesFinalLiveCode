import { db } from './db';
import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole, walletRequests, users, transactions, systemSettings } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';

// Payment Modes
export const PaymentMode = {
  UPI: 'upi',
  BANK: 'bank',
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
  PLATFORM_INVESTMENT: 'platform_investment',
} as const;

// Validation schemas
export const walletRequestSchema = z.object({
  userId: z.number(),
  amount: z.number().positive(),
  requestType: z.enum([RequestType.DEPOSIT, RequestType.WITHDRAWAL, RequestType.PLATFORM_INVESTMENT]),
  paymentMode: z.enum([PaymentMode.UPI, PaymentMode.BANK]),
  paymentDetails: z.object({
    upiId: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    utrNumber: z.string().optional(),
    transactionId: z.string().optional(),
  }),
  proofImageUrl: z.string().optional(),
  notes: z.string().optional(),
});

export const adminRequestReviewSchema = z.object({
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
        `SELECT wr.*, u.username, u.role 
         FROM wallet_requests wr
         JOIN users u ON wr.user_id = u.id
         ${whereClause}
         ORDER BY wr.created_at DESC`,
        params
      );
      
      // Transform to match the expected format with nested user object
      return result.rows.map(row => ({
        ...row,
        user: {
          id: row.user_id,
          username: row.username,
          role: row.role
        }
      }));
    }
    
    // For queries without admin filtering, use a join to include user information
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
    
    // Get wallet requests with joined user data
    const results = whereConditions.length > 0 
      ? await db.select({
          request: walletRequests,
          user: {
            id: users.id,
            username: users.username,
            role: users.role
          }
        })
        .from(walletRequests)
        .innerJoin(users, eq(walletRequests.userId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(walletRequests.createdAt))
      : await db.select({
          request: walletRequests,
          user: {
            id: users.id,
            username: users.username,
            role: users.role
          }
        })
        .from(walletRequests)
        .innerJoin(users, eq(walletRequests.userId, users.id))
        .orderBy(desc(walletRequests.createdAt));
    
    // Transform results to the expected format
    return results.map(({ request, user }) => ({
      ...request,
      user
    }));
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
        // Convert amount to paisa (multiply by 100) since the balance is stored in paisa
        // but the deposit/withdrawal amounts are entered in rupees
        const balanceChangeRupees = request.requestType === RequestType.WITHDRAWAL 
          ? -request.amount 
          : request.amount;
          
        // Convert rupees to paisa (multiply by 100) for storage
        const balanceChangePaisa = balanceChangeRupees * 100;
        
        // Update user balance with SQL function to add
        const updatedUsersResult = await client.query(
          'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING *',
          [balanceChangePaisa, request.userId]
        );
        
        if (updatedUsersResult.rowCount === 0) {
          await client.query('ROLLBACK');
          throw new Error('User not found');
        }
        
        // Get the updated user balance after the transaction
        const updatedUser = await client.query(
          'SELECT balance FROM users WHERE id = $1',
          [request.userId]
        );
        
        // Get the admin's username and role to include in the description
        const adminResult = await client.query(
          'SELECT username, role FROM users WHERE id = $1',
          [adminId]
        );
        
        let adminDescription = '';
        if (adminResult.rowCount > 0) {
          adminDescription = `${adminResult.rows[0].username} (${adminResult.rows[0].role})`;
        } else {
          adminDescription = `Admin #${adminId}`;
        }
        
        // Create appropriate description based on request type
        let transactionDescription;
        
        if (request.requestType === RequestType.PLATFORM_INVESTMENT) {
          transactionDescription = `Platform Investment approved by ${adminDescription}`;
        } else {
          transactionDescription = `${request.requestType === RequestType.DEPOSIT ? 'Deposit' : 'Withdrawal'} request processed by ${adminDescription}`;
        }
        
        // Create transaction record with the player's balance after this transaction
        await db.insert(transactions).values({
          userId: request.userId,
          amount: balanceChangePaisa, // Use the converted amount (paisa)
          balanceAfter: updatedUser.rows[0].balance, // Include the player's updated balance
          performedBy: adminId,
          requestId: requestId,
          description: transactionDescription,
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
  
  // Special endpoint for admin platform investments (self-funding with tracking)
  app.post('/api/admin/platform-investment', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Only admin can access this endpoint
      if (req.user.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: 'Forbidden - Only admins can make platform investments' });
      }
      
      const { amount, notes } = req.body;
      
      if (!amount || amount <= 0 || !notes) {
        return res.status(400).json({ message: 'Invalid request data - amount and notes are required' });
      }
      
      // Start a transaction
      const { pool } = await import('./db');
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Convert amount to paisa for storage
        const amountInPaisa = amount * 100;
        
        // Update admin's balance
        const updatedUserResult = await client.query(
          'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance',
          [amountInPaisa, req.user.id]
        );
        
        if (updatedUserResult.rowCount === 0) {
          await client.query('ROLLBACK');
          return res.status(500).json({ message: 'Failed to update admin balance' });
        }
        
        // Get the updated balance
        const updatedBalance = updatedUserResult.rows[0].balance;
        
        // Create transaction record with special description
        const transactionResult = await client.query(
          'INSERT INTO transactions (user_id, amount, balance_after, performed_by, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [req.user.id, amountInPaisa, updatedBalance, req.user.id, `Platform Investment: ${notes}`]
        );
        
        await client.query('COMMIT');
        
        // Return the transaction and updated user
        res.status(201).json({
          transaction: transactionResult.rows[0],
          userBalance: updatedBalance / 100, // Convert back to rupees for display
          message: 'Platform investment recorded successfully.'
        });
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Investment error:', error);
        res.status(500).json({ message: 'Platform investment failed' });
      } finally {
        client.release();
      }
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
        // Get all payment-related settings to build our response
        const upiSettings = await db.query.systemSettings.findFirst({
          where: eq(systemSettings.settingKey, 'upi_id')
        });
        
        const bankNameSettings = await db.query.systemSettings.findFirst({
          where: eq(systemSettings.settingKey, 'bank_name')
        });
        
        const accountHolderSettings = await db.query.systemSettings.findFirst({
          where: eq(systemSettings.settingKey, 'account_holder')
        });
        
        const accountNumberSettings = await db.query.systemSettings.findFirst({
          where: eq(systemSettings.settingKey, 'account_number')
        });
        
        const ifscCodeSettings = await db.query.systemSettings.findFirst({
          where: eq(systemSettings.settingKey, 'ifsc_code')
        });
        
        // Use admin values from settings, or fallback to defaults if truly not set
        return res.json({
          upi: {
            id: upiSettings?.settingValue || 'admin@upi',
            qrCode: null,
          },
          bank: {
            name: bankNameSettings?.settingValue || 'Bank Name',
            accountNumber: accountNumberSettings?.settingValue || 'Account Number',
            ifscCode: ifscCodeSettings?.settingValue || 'IFSC Code',
            accountHolder: accountHolderSettings?.settingValue || 'Account Holder',
          }
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
  
  // Admin direct transaction endpoint (for adding/removing funds directly)
  app.post('/api/admin/transactions', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Only admin and subadmin can access this endpoint
      if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUBADMIN) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      // Validate the request data
      const { userId, amount, transactionType, notes } = req.body;
      
      if (!userId || !amount || amount <= 0 || !transactionType || !notes) {
        return res.status(400).json({ message: 'Invalid request data' });
      }
      
      // For subadmins, verify they can only process transactions for their assigned users
      if (req.user.role === UserRole.SUBADMIN) {
        // Import the connection pool for raw SQL transactions
        const { pool } = await import('./db');
        // Use a direct SQL query for this specific check
        const result = await pool.query(
          `SELECT * FROM users WHERE id = $1 AND assigned_to = $2`,
          [userId, req.user.id]
        );
        
        if (result.rowCount === 0) {
          return res.status(403).json({ message: 'You can only process transactions for your assigned users' });
        }
      }
      
      // Start a transaction
      const { pool } = await import('./db');
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Get the user receiving funds
        const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        
        if (userResult.rowCount === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ message: 'User not found' });
        }

        // Convert amount to paisa for storage
        const amountInPaisa = amount * 100;
        const actualAmount = transactionType === 'deposit' ? amountInPaisa : -amountInPaisa;
        
        // Special case: Admin adding funds to their own wallet (platform investment)
        const isAdminSelfFunding = req.user.role === UserRole.ADMIN && userId === req.user.id && transactionType === 'deposit';
        
        // If admin is adding funds to another user/subadmin, check admin's balance
        if (req.user.role === UserRole.ADMIN && transactionType === 'deposit' && userId !== req.user.id) {
          // Get admin's current balance
          const adminResult = await client.query('SELECT balance FROM users WHERE id = $1', [req.user.id]);
          
          if (adminResult.rowCount === 0 || adminResult.rows[0].balance < amountInPaisa) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
              message: 'Insufficient balance to fund user. Please add funds to your admin wallet first.' 
            });
          }
          
          // Deduct the amount from admin's balance
          await client.query(
            'UPDATE users SET balance = balance - $1 WHERE id = $2',
            [amountInPaisa, req.user.id]
          );
          
          // Record this deduction in admin's transactions
          await client.query(
            'INSERT INTO transactions (user_id, amount, performed_by, description) VALUES ($1, $2, $3, $4)',
            [req.user.id, -amountInPaisa, req.user.id, `Funds transferred to ${userResult.rows[0].username}: ${notes}`]
          );
        }
        
        // If admin is deducting funds from a user/subadmin, add those funds to admin's wallet
        if (req.user.role === UserRole.ADMIN && transactionType === 'withdraw' && userId !== req.user.id) {
          // First check if user has sufficient balance
          if (userResult.rows[0].balance < amountInPaisa) {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
              message: 'User has insufficient balance for this deduction.' 
            });
          }
          
          // Add the deducted amount to admin's balance
          await client.query(
            'UPDATE users SET balance = balance + $1 WHERE id = $2',
            [amountInPaisa, req.user.id]
          );
          
          // Record this addition in admin's transactions
          await client.query(
            'INSERT INTO transactions (user_id, amount, performed_by, description) VALUES ($1, $2, $3, $4)',
            [req.user.id, amountInPaisa, req.user.id, `Funds received from ${userResult.rows[0].username}: ${notes}`]
          );
        }
        
        // Update user balance
        const updatedUserResult = await client.query(
          'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance',
          [actualAmount, userId]
        );
        
        if (updatedUserResult.rowCount === 0) {
          await client.query('ROLLBACK');
          return res.status(500).json({ message: 'Failed to update user balance' });
        }
        
        // Get the updated balance
        const updatedBalance = updatedUserResult.rows[0].balance;
        
        // Create transaction record with appropriate description
        let transactionDescription;
        
        if (isAdminSelfFunding) {
          transactionDescription = `Platform Investment: ${notes}`;
        } else {
          transactionDescription = `${transactionType === 'deposit' ? 'Added' : 'Deducted'} by ${req.user.username} (${req.user.role}): ${notes}`;
        }
        
        const transactionResult = await client.query(
          'INSERT INTO transactions (user_id, amount, balance_after, performed_by, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [userId, actualAmount, updatedBalance, req.user.id, transactionDescription]
        );
        
        await client.query('COMMIT');
        
        // Return the transaction and updated user
        res.status(201).json({
          transaction: transactionResult.rows[0],
          userBalance: updatedBalance / 100, // Convert back to rupees for display
          message: isAdminSelfFunding ? 'Platform investment recorded successfully.' : 'Transaction completed successfully.'
        });
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction error:', error);
        res.status(500).json({ message: 'Transaction failed' });
      } finally {
        client.release();
      }
    } catch (err) {
      next(err);
    }
  });
}
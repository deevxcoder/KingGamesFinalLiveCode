import { db } from './db';
import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole } from '@shared/schema';

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
    // Store the request directly in the database using SQL
    const result = await db.execute(
      `INSERT INTO wallet_requests 
       (user_id, amount, request_type, payment_mode, payment_details, status, proof_image_url, notes, created_at, updated_at) 
       VALUES 
       ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) 
       RETURNING *`,
      [
        walletRequest.userId,
        walletRequest.amount,
        walletRequest.requestType,
        walletRequest.paymentMode,
        JSON.stringify(walletRequest.paymentDetails),
        RequestStatus.PENDING,
        walletRequest.proofImageUrl || null,
        walletRequest.notes || null,
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error creating wallet request:', error);
    throw new Error('Failed to create wallet request');
  }
}

export async function getWalletRequests(userId?: number, status?: string, requestType?: string, adminId?: number) {
  try {
    let query = `
      SELECT wr.*, u.username as user_username, r.username as reviewer_username
      FROM wallet_requests wr
      LEFT JOIN users u ON wr.user_id = u.id
      LEFT JOIN users r ON wr.reviewed_by = r.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 1;
    
    if (userId) {
      query += ` AND wr.user_id = $${paramCount++}`;
      params.push(userId);
    }
    
    if (status) {
      query += ` AND wr.status = $${paramCount++}`;
      params.push(status);
    }
    
    if (requestType) {
      query += ` AND wr.request_type = $${paramCount++}`;
      params.push(requestType);
    }
    
    if (adminId) {
      query += ` AND u.assigned_to = $${paramCount++}`;
      params.push(adminId);
    }
    
    query += ' ORDER BY wr.created_at DESC';
    
    const result = await db.execute(query, params);
    return result.rows;
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
    // Start a transaction to update the request and update the user balance if approved
    await db.execute('BEGIN');
    
    // Update the request status
    const updateResult = await db.execute(
      `UPDATE wallet_requests 
       SET status = $1, notes = $2, reviewed_by = $3, updated_at = NOW() 
       WHERE id = $4 
       RETURNING *`,
      [status, notes || null, adminId, requestId]
    );
    
    if (updateResult.rows.length === 0) {
      await db.execute('ROLLBACK');
      throw new Error('Wallet request not found');
    }
    
    const request = updateResult.rows[0];
    
    // If request is approved, update the user's balance and create a transaction record
    if (status === RequestStatus.APPROVED) {
      const balanceChange = request.request_type === RequestType.DEPOSIT 
        ? request.amount 
        : -request.amount;
      
      // Update user balance
      const userResult = await db.execute(
        'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING *',
        [balanceChange, request.user_id]
      );
      
      if (userResult.rows.length === 0) {
        await db.execute('ROLLBACK');
        throw new Error('User not found');
      }
      
      // Create transaction record
      await db.execute(
        `INSERT INTO transactions 
         (user_id, amount, performed_by, request_id, created_at) 
         VALUES ($1, $2, $3, $4, NOW())`,
        [request.user_id, balanceChange, adminId, requestId]
      );
    }
    
    await db.execute('COMMIT');
    return updateResult.rows[0];
  } catch (error) {
    await db.execute('ROLLBACK');
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
        const requestInfo = await db.execute(
          `SELECT wr.* FROM wallet_requests wr
           JOIN users u ON wr.user_id = u.id
           WHERE wr.id = $1 AND u.assigned_to = $2`,
          [requestId, req.user.id]
        );
        
        if (requestInfo.rows.length === 0) {
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
      const paymentSettings = await db.execute(
        'SELECT setting_value FROM system_settings WHERE setting_key = $1',
        ['payment_details']
      );
      
      if (paymentSettings.rows.length === 0) {
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
      
      res.json(JSON.parse(paymentSettings.rows[0].setting_value));
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
      
      // Update or insert payment details
      await db.execute(
        `INSERT INTO system_settings (setting_type, setting_key, setting_value) 
         VALUES ($1, $2, $3)
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = $3`,
        ['payment', 'payment_details', JSON.stringify(req.body)]
      );
      
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });
}
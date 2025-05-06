import { db } from './db';
import express, { Request, Response, NextFunction } from 'express';
import { UserRole, depositCommissions, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// Set or update a deposit commission for a specific subadmin (using URL parameter)
export function setupDepositCommissionEndpoints(app: express.Express) {
  // GET endpoint to retrieve a subadmin's deposit commission rate
  app.get('/api/admin/deposit-commissions/:subadminId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Only admin can access this endpoint
      if (req.user?.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: 'Forbidden - Only admins can view deposit commissions' });
      }
      
      const subadminId = parseInt(req.params.subadminId);
      
      if (isNaN(subadminId)) {
        return res.status(400).json({ message: 'Invalid subadmin ID' });
      }
      
      // Verify the user is a subadmin
      const userResult = await db.select()
        .from(users)
        .where(and(eq(users.id, subadminId), eq(users.role, UserRole.SUBADMIN)))
        .limit(1);
      
      if (userResult.length === 0) {
        return res.status(404).json({ message: 'Subadmin not found' });
      }
      
      // Get commission if it exists
      const commissionResult = await db.select()
        .from(depositCommissions)
        .where(eq(depositCommissions.subadminId, subadminId))
        .limit(1);
      
      const commission = commissionResult.length > 0 ? commissionResult[0] : null;
      
      res.json({ 
        subadminId,
        username: userResult[0].username,
        commissionRate: commission ? commission.commissionRate : 0, // Default to 0 if not found
        isActive: commission ? commission.isActive : false
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/deposit-commissions/:subadminId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Only admin can access this endpoint
      if (req.user?.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: 'Forbidden - Only admins can manage deposit commissions' });
      }
      
      const subadminId = parseInt(req.params.subadminId);
      const { commissionRate } = req.body;
      
      if (isNaN(subadminId) || typeof commissionRate !== 'number' || commissionRate < 0 || commissionRate > 10000) {
        return res.status(400).json({ 
          message: 'Invalid request data. Commission rate must be between 0 and 10000 (0% to 100%)' 
        });
      }
      
      // Verify the user is a subadmin
      const userResult = await db.select()
        .from(users)
        .where(and(eq(users.id, subadminId), eq(users.role, UserRole.SUBADMIN)))
        .limit(1);
      
      if (userResult.length === 0) {
        return res.status(404).json({ message: 'Subadmin not found' });
      }
      
      // Check if a commission already exists
      const existingCommission = await db.select()
        .from(depositCommissions)
        .where(eq(depositCommissions.subadminId, subadminId))
        .limit(1);
      
      if (existingCommission.length > 0) {
        // Update existing commission
        await db.update(depositCommissions)
          .set({
            commissionRate,
            isActive: true,
            updatedAt: new Date()
          })
          .where(eq(depositCommissions.subadminId, subadminId));
      } else {
        // Create new commission
        await db.insert(depositCommissions).values({
          subadminId,
          commissionRate,
          isActive: true
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Deposit commission set successfully',
        data: {
          subadminId,
          username: userResult[0].username,
          commissionRate
        }
      });
    } catch (error) {
      next(error);
    }
  });
}
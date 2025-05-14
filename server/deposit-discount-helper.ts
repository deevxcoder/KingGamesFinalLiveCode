import { db } from './db';
import { playerDepositDiscounts } from '@shared/schema';
import { and, eq } from 'drizzle-orm';
import { storage } from './storage';

/**
 * Helper function to get player deposit discount from a subadmin
 * @param playerId The ID of the player
 * @param subadminId The ID of the subadmin
 * @returns Discount rate as an integer (0-10000)
 */
export async function getPlayerDepositDiscount(playerId: number, subadminId: number): Promise<number> {
  try {
    // Check if a discount exists for this player and subadmin
    const result = await db.select()
      .from(playerDepositDiscounts)
      .where(
        and(
          eq(playerDepositDiscounts.userId, playerId),
          eq(playerDepositDiscounts.subadminId, subadminId),
          eq(playerDepositDiscounts.isActive, true)
        )
      ).limit(1);
    
    if (result.length > 0) {
      return result[0].discountRate;
    }
    
    // Default return no discount
    return 0;
  } catch (error) {
    console.error('Error getting player deposit discount:', error);
    return 0; // Default to no discount on error
  }
}

/**
 * Calculate the bonus amount based on deposit amount and discount rate
 * @param depositAmount The amount being deposited (in paisa/cents)
 * @param discountRate The discount rate (in basis points, e.g. 500 = 5%)
 * @returns The bonus amount to add
 */
export function calculateDepositBonus(depositAmount: number, discountRate: number): number {
  if (discountRate <= 0) return 0;
  
  // Calculate bonus amount
  // Example: 10000 (100 rupees) * 500 (5%) / 10000 = 500 (5 rupees)
  return Math.floor((depositAmount * discountRate) / 10000);
}
/**
 * Utility functions for formatting values consistently across the application
 */

/**
 * Game types that store amounts in paisa (1 rupee = 100 paisa)
 */
export const PAISA_BASED_GAMES = ['coin_flip', 'team_match', 'cricket_toss', 'satamatka'];

/**
 * Threshold for amount to be considered in paisa
 * (amounts 10000+ are likely in paisa)
 */
export const PAISA_THRESHOLD = 10000;

/**
 * Format a currency amount consistently based on game type
 * 
 * @param amount - The amount to format
 * @param gameType - The type of game (used to determine if amount is in paisa)
 * @param includeSymbol - Whether to include the ₹ symbol
 * @returns Formatted amount string
 */
export function formatCurrency(amount: number, gameType?: string, includeSymbol = true): string {
  if (!amount && amount !== 0) return includeSymbol ? '₹0.00' : '0.00';
  
  // Determine if we need to convert from paisa to rupees
  let convertedAmount = amount;
  
  // Always convert for known paisa-based games regardless of amount size
  if (gameType && PAISA_BASED_GAMES.includes(gameType)) {
    convertedAmount = amount / 100;
  } 
  // If no game type but amount looks like paisa (for backward compatibility)
  else if (!gameType && amount >= PAISA_THRESHOLD) {
    convertedAmount = amount / 100;
  }
  
  // Format with 2 decimal places and add symbol if requested
  const formattedAmount = convertedAmount.toFixed(2);
  return includeSymbol ? `₹${formattedAmount}` : formattedAmount;
}

/**
 * Calculate and format profit/loss amount
 * 
 * @param betAmount - Original bet amount
 * @param payout - Payout amount (0 if loss)
 * @param gameType - Type of game
 * @returns Formatted profit/loss string with sign
 */
export function formatProfitLoss(betAmount: number, payout: number, gameType?: string): string {
  const isPaisaBased = gameType && PAISA_BASED_GAMES.includes(gameType);
  
  // Convert to rupees if needed
  let normalizedBet = betAmount;
  let normalizedPayout = payout;
  
  // Always convert for paisa-based games
  if (isPaisaBased) {
    normalizedBet = betAmount / 100;
    normalizedPayout = payout / 100;
  }
  // For backward compatibility with non-typed amounts
  else if (!gameType && betAmount >= PAISA_THRESHOLD) {
    normalizedBet = betAmount / 100;
    normalizedPayout = payout / 100;
  }
  
  const isWin = normalizedPayout > 0;
  const profitLoss = isWin ? normalizedPayout - normalizedBet : -normalizedBet;
  
  // Format with sign and 2 decimal places
  return `${profitLoss > 0 ? '+' : ''}₹${Math.abs(profitLoss).toFixed(2)}`;
}

/**
 * Format bet amount for display in forms
 * @param amount - Current amount (might be in paisa)
 * @param gameType - Game type
 * @returns Amount ready for display in input field
 */
export function formatBetAmountForInput(amount: number, gameType?: string): string {
  if (!amount) return '';
  
  const isPaisaBased = gameType && PAISA_BASED_GAMES.includes(gameType);
  
  // Always convert for paisa-based games
  if (isPaisaBased) {
    return (amount / 100).toString();
  }
  // For backward compatibility
  else if (!gameType && amount >= PAISA_THRESHOLD) {
    return (amount / 100).toString();
  }
  
  return amount.toString();
}

/**
 * Parse user input to internal amount format
 * @param value - User input value
 * @param gameType - Game type
 * @returns Amount in the correct format for storage
 */
export function parseInputAmount(value: string, gameType?: string): number {
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return 0;
  
  const isPaisaBased = gameType && PAISA_BASED_GAMES.includes(gameType);
  
  // For paisa-based games, multiply by 100 to convert to paisa
  if (isPaisaBased) {
    return parsed * 100;
  }
  
  return parsed;
}
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string or Date object into a readable format
 * @param dateString Date string or Date object
 * @param formatStr Optional format string (defaults to "PPP")
 * @returns Formatted date string
 */
export function formatDate(dateString: string | Date, formatStr: string = "MMM dd, yyyy h:mm a") {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return format(date, formatStr);
  } catch (error) {
    console.error("Error formatting date:", error);
    return typeof dateString === 'string' ? dateString : dateString.toString();
  }
}

/**
 * Format a number as currency
 * @param amount Amount to format
 * @param currency Currency code (defaults to INR)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = "INR") {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    console.error("Error formatting currency:", error);
    return amount.toString();
  }
}

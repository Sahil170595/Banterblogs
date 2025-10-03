/**
 * Utility functions for consistent number formatting between server and client
 */

export function formatNumber(num: number): string {
  // Use a locale-independent formatting to avoid hydration mismatches
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatReadingTime(minutes: number): string {
  if (minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

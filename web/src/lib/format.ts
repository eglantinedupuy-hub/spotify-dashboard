// Small formatting helpers shared across pages.

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-10" -> "October 2026" */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export const MONTH_SHORT = MONTHS.map((m) => m.slice(0, 3));

/** "2026-10-05" -> "Oct 5, 2026" */
export function dayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${MONTH_SHORT[m - 1]} ${d}, ${y}`;
}

/** 0-23 -> "10 PM" */
export function hourLabel(h: number): string {
  const suffix = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour} ${suffix}`;
}

/** 12345.6 -> "12,346" */
export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** Percent change from `previous` to `current`, or null if there's nothing to compare. */
export function percentChange(current: number, previous: number | undefined): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

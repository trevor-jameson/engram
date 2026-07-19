const DAY_MS = 24 * 60 * 60 * 1000; // MS in a day

/** Adds days to a YYYY-MM-DD string, in UTC, returning YYYY-MM-DD. */
export function addDays(date: string, days: number): string {
  const ms = Date.parse(`${date}T00:00:00Z`);
  return new Date(ms + days * DAY_MS).toISOString().slice(0, 10);
}

/** True when a card with this due date is due on `today` (YYYY-MM-DD compares lexicographically). */
export function isDue(due: string, today: string): boolean {
  return due <= today;
}

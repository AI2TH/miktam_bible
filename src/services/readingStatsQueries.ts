/**
 * Reading stats SQL. A chapter counts once however many days or translations
 * it was read in; "this week" is today and the six days before it.
 * No Expo imports, so it can be tested with node:sqlite.
 */

export const TOTAL_STATS_SQL = `SELECT COUNT(DISTINCT book_number || ':' || chapter) AS cnt,
         COALESCE(SUM(reading_time_secs), 0) AS time
    FROM reading_progress`;

export const WEEK_CHAPTERS_SQL = `SELECT COUNT(DISTINCT book_number || ':' || chapter) AS cnt
    FROM reading_progress
   WHERE read_date >= ? AND read_date <= ?`;

const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** [first, last] local dates (YYYY-MM-DD) of the 7-day window ending on `today`. */
export function weekWindow(today: Date): [string, string] {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  return [dateKey(start), dateKey(today)];
}

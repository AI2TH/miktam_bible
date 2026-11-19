/**
 * Pure helpers that sort the days of a reading plan into "today", "pending"
 * (earlier days not done yet) and "upcoming" (days the user can read ahead).
 *
 * No React Native or database imports, so node:test can run them directly.
 * Dates are local calendar days as 'yyyy-MM-dd' strings, which compare
 * correctly as plain strings.
 */

export interface PlanDayEntry {
  dayNumber: number;
  /** Local calendar date, 'yyyy-MM-dd' */
  scheduledDate?: string | null;
  isCompleted: boolean;
}

export interface PlanDayGroups<T extends PlanDayEntry> {
  /** The day to show as today's reading */
  today: T | null;
  /** Earlier days that are not completed, oldest first (never includes `today`) */
  pending: T[];
  /** The next days after today, completed or not, so the user can read ahead */
  upcoming: T[];
}

export const DEFAULT_UPCOMING_DAYS = 5;

/** Local calendar date as 'yyyy-MM-dd' */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function byDayNumber<T extends PlanDayEntry>(days: T[]): T[] {
  return [...days].sort((a, b) => a.dayNumber - b.dayNumber);
}

function isDated(days: PlanDayEntry[]): boolean {
  return days.length > 0 && days.every((d) => typeof d.scheduledDate === 'string' && d.scheduledDate.length > 0);
}

/**
 * The plan day the calendar is on: the day scheduled for `todayKey`, the last
 * day once the plan has ended, or null before it starts. Completing days (late
 * or early) never changes it.
 */
export function getPlanDayNumberForDate(days: PlanDayEntry[], todayKey: string): number | null {
  let current: number | null = null;
  for (const day of byDayNumber(days)) {
    if (day.scheduledDate && day.scheduledDate <= todayKey) current = day.dayNumber;
  }
  return current;
}

/** Split a plan's days into today's reading, missed days and read-ahead days. */
export function groupPlanDays<T extends PlanDayEntry>(
  days: T[],
  todayKey: string,
  upcomingCount: number = DEFAULT_UPCOMING_DAYS
): PlanDayGroups<T> {
  const sorted = byDayNumber(days);
  if (sorted.length === 0) return { today: null, pending: [], upcoming: [] };

  const firstUnread = sorted.find((d) => !d.isCompleted) ?? null;

  // Plans saved without dates: today is simply the first unread day
  if (!isDated(sorted)) {
    const today = firstUnread ?? sorted[sorted.length - 1];
    return {
      today,
      pending: [],
      upcoming: sorted.filter((d) => d.dayNumber > today.dayNumber).slice(0, upcomingCount),
    };
  }

  const scheduledToday = sorted.find((d) => d.scheduledDate === todayKey) ?? null;
  const missed = sorted.filter((d) => (d.scheduledDate as string) < todayKey && !d.isCompleted);
  const ahead = sorted.filter((d) => (d.scheduledDate as string) > todayKey).slice(0, upcomingCount);

  if (scheduledToday) {
    return { today: scheduledToday, pending: missed, upcoming: ahead };
  }

  if (todayKey < (sorted[0].scheduledDate as string)) {
    // Plan starts later: show day 1 as the next reading and let the user start early
    return { today: sorted[0], pending: [], upcoming: sorted.slice(1, 1 + upcomingCount) };
  }

  // Plan has ended: the first unread day is "today"; the rest of the unread days are pending
  const today = firstUnread ?? sorted[sorted.length - 1];
  return {
    today,
    pending: missed.filter((d) => d.dayNumber !== today.dayNumber),
    upcoming: ahead,
  };
}

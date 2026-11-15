/**
 * Which reading-plan reminders to schedule, worked out ahead of time.
 *
 * There is no background task: the app pre-schedules one notification per
 * reminder with expo-notifications (date triggers) and re-runs this whenever
 * progress changes. With "keep reminding me until today's reading is done",
 * a day gets a reminder at the chosen time and then every N hours until
 * midnight. A day that is complete gets none, so completing the last chapter
 * and re-syncing cancels the rest of that day's reminders. The next day starts
 * again at the chosen time.
 *
 * Pure: no React Native imports, so node:test can run it.
 */

/** Every reading-plan reminder identifier starts with this */
export const PLAN_REMINDER_PREFIX = 'miktam_reading_plan_';

/** Repeat intervals offered in the UI, in hours */
export const REPEAT_INTERVAL_OPTIONS = [1, 2, 3] as const;

/** Days ahead that get reminders, so they keep coming when the app is not opened */
export const REMINDER_WINDOW_DAYS = 7;

/**
 * Most reading-plan notifications pending at once. iOS keeps only 64 pending
 * notifications per app, shared with the daily verse and meeting reminders.
 */
export const MAX_PLAN_REMINDERS = 30;

export interface ReminderPlanDay {
  dayNumber: number;
  /** 'yyyy-MM-dd' */
  scheduledDate?: string | null;
  isCompleted: boolean;
  readingLabel?: string | null;
  chaptersRead?: number;
  chapterCount?: number;
}

export interface PlannedReminder {
  id: string;
  fireAt: Date;
  /** Local date the reminder fires on, 'yyyy-MM-dd' */
  dateKey: string;
  dayNumber: number;
  /** 0 for the reminder at the chosen time, 1, 2, ... for the repeats */
  repeatIndex: number;
  title: string;
  body: string;
}

export interface ReminderScheduleInput {
  now: Date;
  /** 'HH:mm' picked by the user; null means no reminders */
  reminderTime: string | null | undefined;
  /** Repeat every N hours until the day is done; null or 0 for one reminder a day */
  repeatEveryHours?: number | null;
  planTitle: string;
  days: ReminderPlanDay[];
  windowDays?: number;
  maxCount?: number;
}

/** 'HH:mm' to hour and minute; null when missing or invalid (no default time) */
export function parseReminderTime(time: string | null | undefined): { hour: number; minute: number } | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

/** A usable repeat interval in whole hours (1 to 12), or null for no repeats */
export function normalizeRepeatHours(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  return value >= 1 && value <= 12 ? value : null;
}

/** Local calendar date as 'yyyy-MM-dd' */
export function dateKeyOf(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateFromKey(dateKey: string, hour = 0, minute = 0): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

/**
 * Reminder times on one date: the chosen time, then every `repeatEveryHours`
 * until midnight. One time when there is no repeat.
 */
export function reminderTimesForDate(
  dateKey: string,
  hour: number,
  minute: number,
  repeatEveryHours?: number | null
): Date[] {
  const interval = normalizeRepeatHours(repeatEveryHours);
  const times: Date[] = [];
  for (let k = 0; ; k++) {
    const t = dateFromKey(dateKey, hour + k * (interval ?? 0), minute);
    if (dateKeyOf(t) !== dateKey) break; // went past midnight
    if (times.length > 0 && t.getTime() <= times[times.length - 1].getTime()) break; // DST guard
    times.push(t);
    if (!interval) break;
  }
  return times;
}

/** Stable identifier for a reminder: one per date and time, so re-scheduling replaces it */
export function reminderIdFor(fireAt: Date): string {
  const hh = String(fireAt.getHours()).padStart(2, '0');
  const mm = String(fireAt.getMinutes()).padStart(2, '0');
  return `${PLAN_REMINDER_PREFIX}${dateKeyOf(fireAt)}_${hh}${mm}`;
}

function progressText(day: ReminderPlanDay): string {
  const total = day.chapterCount ?? 0;
  if (total < 2) return '';
  return ` (${day.chaptersRead ?? 0} of ${total} read)`;
}

/** Title and body of one reminder */
export function reminderContent(
  planTitle: string,
  day: ReminderPlanDay,
  repeatIndex: number,
  isCatchUp: boolean
): { title: string; body: string } {
  const label = day.readingLabel || `Day ${day.dayNumber}`;
  const progress = progressText(day);
  if (repeatIndex === 0) {
    return {
      title: `📖 ${planTitle} • Day ${day.dayNumber}`,
      body: isCatchUp
        ? `Day ${day.dayNumber} is still pending: ${label}${progress}.`
        : `Today's reading: ${label}${progress}. Keep your study streak going!`,
    };
  }
  return {
    title: `⏳ Still to read: Day ${day.dayNumber}`,
    body: `${label}${progress}. These reminders stop once every chapter is read.`,
  };
}

/** The plan day a date's reminders are about, or null for no reminders that date */
function targetDayFor(
  dateKey: string,
  byDate: Map<string, ReminderPlanDay>,
  sorted: ReminderPlanDay[],
  firstDate: string | null,
  lastDate: string | null
): { day: ReminderPlanDay; isCatchUp: boolean } | null {
  const scheduled = byDate.get(dateKey);
  if (scheduled) return scheduled.isCompleted ? null : { day: scheduled, isCatchUp: false };
  if (firstDate && dateKey < firstDate) return null; // the plan has not started
  // After the last plan day (or a plan without dates): remind about the first unread day
  if (!lastDate || dateKey > lastDate) {
    const unread = sorted.find((d) => !d.isCompleted);
    return unread ? { day: unread, isCatchUp: true } : null;
  }
  return null;
}

/**
 * Every reminder to have scheduled right now, soonest first: for each of the
 * next `windowDays` dates whose plan day is not complete, the chosen time plus
 * the repeats. Times already past are left out. When there are more than
 * `maxCount`, each date keeps its first reminder before any repeats are kept.
 */
export function planReminders(input: ReminderScheduleInput): PlannedReminder[] {
  const time = parseReminderTime(input.reminderTime);
  if (!time) return [];
  const windowDays = input.windowDays ?? REMINDER_WINDOW_DAYS;
  const maxCount = input.maxCount ?? MAX_PLAN_REMINDERS;
  const nowMs = input.now.getTime();

  const sorted = [...input.days].sort((a, b) => a.dayNumber - b.dayNumber);
  const byDate = new Map<string, ReminderPlanDay>();
  for (const d of sorted) if (d.scheduledDate) byDate.set(d.scheduledDate, d);
  const dates = sorted.map((d) => d.scheduledDate).filter((d): d is string => !!d).sort();
  const firstDate = dates[0] ?? null;
  const lastDate = dates[dates.length - 1] ?? null;

  const all: PlannedReminder[] = [];
  const today = dateKeyOf(input.now);
  for (let i = 0; i < windowDays; i++) {
    const base = dateFromKey(today);
    base.setDate(base.getDate() + i);
    const dateKey = dateKeyOf(base);
    const target = targetDayFor(dateKey, byDate, sorted, firstDate, lastDate);
    if (!target) continue;

    const times = reminderTimesForDate(dateKey, time.hour, time.minute, input.repeatEveryHours);
    times.forEach((fireAt, repeatIndex) => {
      if (fireAt.getTime() <= nowMs) return;
      const content = reminderContent(input.planTitle, target.day, repeatIndex, target.isCatchUp);
      all.push({
        id: reminderIdFor(fireAt),
        fireAt,
        dateKey,
        dayNumber: target.day.dayNumber,
        repeatIndex,
        ...content,
      });
    });
  }

  // Keep the first reminder of each date, then repeats soonest first, up to the cap
  const firsts = all.filter((r) => r.repeatIndex === 0);
  const repeats = all.filter((r) => r.repeatIndex > 0);
  const kept = [...firsts, ...repeats].slice(0, Math.max(0, maxCount));
  return kept.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}

/**
 * Compare what is scheduled with what should be. `cancel` holds every
 * reading-plan reminder that should no longer fire (for example the rest of a
 * day that was just completed); `schedule` holds the reminders to (re)schedule,
 * leaving out those already scheduled with the same text.
 */
export function diffReminders(
  scheduled: ReadonlyArray<{ id: string; title?: string | null; body?: string | null }>,
  planned: ReadonlyArray<PlannedReminder>
): { cancel: string[]; schedule: PlannedReminder[] } {
  const plannedIds = new Set(planned.map((r) => r.id));
  const existing = new Map(
    scheduled.filter((s) => s.id.startsWith(PLAN_REMINDER_PREFIX)).map((s) => [s.id, s])
  );
  const cancel = [...existing.keys()].filter((id) => !plannedIds.has(id));
  const schedule = planned.filter((r) => {
    const current = existing.get(r.id);
    return !current || current.title !== r.title || current.body !== r.body;
  });
  return { cancel, schedule };
}

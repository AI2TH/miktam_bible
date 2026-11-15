import { getDatabase } from './database';
import { generateUUID } from '../utils/uuid';
import { CHAPTERS_PER_BOOK } from '../stores/readerStore';
import { getBookName, getBookAbbreviation } from '../utils/bookTranslations';
import { addDays, format, parseISO } from 'date-fns';
import { syncReadingPlanNotification, cancelReadingPlanNotification } from './notificationService';
import { BACKFILL_DAY_CHAPTER_SQL } from '../database/schema';
import {
  ChapterRef,
  PlanDayChapter,
  chaptersFromDayRange,
  summarizeDayProgress,
} from './readingPlanProgress';

export type { ChapterRef, PlanDayChapter } from './readingPlanProgress';

export type PlanType =
  | '1_year'
  | '6_months'
  | 'csb_90'
  | 'navigators_4track'
  | '3_months'
  | '2_months'
  | 'custom';

export interface PlanDefinition {
  type: PlanType;
  title: string;
  durationDays: number;
  description: string;
  scope: string;
  dailyPace: string;
}

export const READING_PLAN_DEFINITIONS: Record<PlanType, PlanDefinition> = {
  '1_year': {
    type: '1_year',
    title: '1 Year Bible Journey',
    durationDays: 365,
    description: 'Read the complete Holy Bible from Genesis to Revelation in 365 days (~3.2 chapters/day).',
    scope: 'Complete Bible (66 Books)',
    dailyPace: '~3 chapters / day',
  },
  '6_months': {
    type: '6_months',
    title: '6 Months Whole Bible Sprint',
    durationDays: 180,
    description: 'Intensive immersion through all 66 books of the Bible in 6 months (~6-7 chapters/day).',
    scope: 'Complete Bible (66 Books)',
    dailyPace: '~6-7 chapters / day',
  },
  'csb_90': {
    type: 'csb_90',
    title: 'CSB 90-Day Bible Planner',
    durationDays: 90,
    description: 'Read the entire Bible cover-to-cover in 90 intense, focused days (~13 chapters/day).',
    scope: 'Complete Bible (66 Books)',
    dailyPace: '~13 chapters / day',
  },
  'navigators_4track': {
    type: 'navigators_4track',
    title: 'Navigators Discipleship Planner',
    durationDays: 365,
    description: '4 concurrent daily tracks: Gospels, Law/History, Psalms/Wisdom, and Epistles for rich daily variety.',
    scope: 'Whole Bible in 4 Daily Tracks',
    dailyPace: '4 readings / day',
  },
  '3_months': {
    type: '3_months',
    title: '3 Months New Testament',
    durationDays: 90,
    description: 'Complete the entire New Testament from Matthew through Revelation in 90 days (~3 chapters/day).',
    scope: 'New Testament (27 Books)',
    dailyPace: '~3 chapters / day',
  },
  '2_months': {
    type: '2_months',
    title: '2 Months New Testament Sprint',
    durationDays: 60,
    description: 'Rapid deep dive through the New Testament in 60 focused days (~4-5 chapters/day).',
    scope: 'New Testament (27 Books)',
    dailyPace: '~4-5 chapters / day',
  },
  'custom': {
    type: 'custom',
    title: 'Custom Reading Planner Generator',
    durationDays: 30,
    description: 'Personalized Bible reading plan tailored to your chosen duration and scope.',
    scope: 'Customizable Scope',
    dailyPace: 'Calculated dynamically',
  },
};

export interface ReadingPlan {
  id: string;
  planType: PlanType;
  title: string;
  durationDays: number;
  startDate: string;
  isActive: boolean;
  reminderTime: string;
  reminderEnabled: boolean;
  currentDay: number;
  completedDaysCount: number;
  progressPercentage: number;
}

export interface ReadingPlanDay {
  id: string;
  planId: string;
  dayNumber: number;
  bookNumber: number;
  startChapter: number;
  endChapter: number;
  scheduledDate?: string;
  readingLabel?: string;
  isCompleted: boolean;
  completedAt?: string;
  bookName?: string;
  status: 'pending' | 'completed';
  /** Chapters of this day in reading order (loaded by getAllPlanDays) */
  chapters?: PlanDayChapter[];
  /** Chapters read so far; equals chapterCount when the day is complete */
  chaptersRead?: number;
  chapterCount?: number;
}

type CustomScope = 'whole' | 'nt' | 'ot' | 'gospels' | 'wisdom';

interface PlanScheduleItem {
  dayNumber: number;
  bookNumber: number;
  startChapter: number;
  endChapter: number;
  scheduledDate: string;
  readingLabel: string;
  /** Every chapter of the day, across book boundaries and Navigators tracks */
  chapters: ChapterRef[];
}

/** Get the currently active reading plan */
export async function getActiveReadingPlan(): Promise<ReadingPlan | null> {
  try {
    const db = getDatabase();
    const planRow = await db.getFirstAsync<any>(
      'SELECT * FROM reading_plans WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1'
    );
    if (!planRow) return null;

    const stats = await db.getFirstAsync<{ completed_count: number }>(
      'SELECT COUNT(*) as completed_count FROM reading_plan_days WHERE plan_id = ? AND is_completed = 1',
      [planRow.id]
    );

    const completedDaysCount = stats?.completed_count || 0;
    const progressPercentage = Math.round((completedDaysCount / planRow.duration_days) * 100);

    // "Day X of N" follows the calendar, like getPlanDayNumberForDate(), so it moves
    // on each day even when nothing is completed, and reading ahead does not move it.
    const calendarDay = await db.getFirstAsync<{ day: number | null }>(
      'SELECT MAX(day_number) AS day FROM reading_plan_days WHERE plan_id = ? AND scheduled_date <= ?',
      [planRow.id, format(new Date(), 'yyyy-MM-dd')]
    );

    return {
      id: planRow.id,
      planType: planRow.plan_type as PlanType,
      title: planRow.title,
      durationDays: planRow.duration_days,
      startDate: planRow.start_date,
      isActive: planRow.is_active === 1,
      reminderTime: planRow.reminder_time || '08:00',
      reminderEnabled: planRow.reminder_enabled === 1,
      currentDay: calendarDay?.day || planRow.current_day || 1,
      completedDaysCount,
      progressPercentage,
    };
  } catch (e) {
    console.error('[readingPlanService] Failed to get active plan:', e);
    return null;
  }
}

/** Get today's reading assignment or earliest uncompleted */
export async function getTodayReading(planId: string): Promise<ReadingPlanDay | null> {
  try {
    const db = getDatabase();
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // First try to find by scheduled_date for today
    let row = await db.getFirstAsync<any>(
      'SELECT * FROM reading_plan_days WHERE plan_id = ? AND scheduled_date = ? LIMIT 1',
      [planId, todayStr]
    );

    // If not found by date, find the earliest uncompleted day
    if (!row) {
      row = await db.getFirstAsync<any>(
        'SELECT * FROM reading_plan_days WHERE plan_id = ? AND is_completed = 0 ORDER BY day_number ASC LIMIT 1',
        [planId]
      );
    }

    if (!row) {
      // If all completed, return last day
      const lastRow = await db.getFirstAsync<any>(
        'SELECT * FROM reading_plan_days WHERE plan_id = ? ORDER BY day_number DESC LIMIT 1',
        [planId]
      );
      if (!lastRow) return null;
      const isCompleted = lastRow.is_completed === 1;
      return {
        id: lastRow.id,
        planId: lastRow.plan_id,
        dayNumber: lastRow.day_number,
        bookNumber: lastRow.book_number,
        startChapter: lastRow.start_chapter,
        endChapter: lastRow.end_chapter,
        scheduledDate: lastRow.scheduled_date,
        readingLabel: lastRow.reading_label,
        isCompleted,
        completedAt: lastRow.completed_at,
        bookName: getBookName(lastRow.book_number),
        status: isCompleted ? 'completed' : 'pending',
      };
    }

    const isCompleted = row.is_completed === 1;
    return {
      id: row.id,
      planId: row.plan_id,
      dayNumber: row.day_number,
      bookNumber: row.book_number,
      startChapter: row.start_chapter,
      endChapter: row.end_chapter,
      scheduledDate: row.scheduled_date,
      readingLabel: row.reading_label,
      isCompleted,
      completedAt: row.completed_at,
      bookName: getBookName(row.book_number),
      status: isCompleted ? 'completed' : 'pending',
    };
  } catch (e) {
    console.error('[readingPlanService] Failed to get today reading:', e);
    return null;
  }
}

/** Get the earliest uncompleted reading assignment */
export async function getNextUncompletedReading(planId: string): Promise<ReadingPlanDay | null> {
  try {
    const db = getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM reading_plan_days WHERE plan_id = ? AND is_completed = 0 ORDER BY day_number ASC LIMIT 1',
      [planId]
    );
    if (!row) return null;
    return {
      id: row.id,
      planId: row.plan_id,
      dayNumber: row.day_number,
      bookNumber: row.book_number,
      startChapter: row.start_chapter,
      endChapter: row.end_chapter,
      scheduledDate: row.scheduled_date,
      readingLabel: row.reading_label,
      isCompleted: false,
      completedAt: row.completed_at,
      bookName: getBookName(row.book_number),
      status: 'pending',
    };
  } catch (e) {
    console.error('[readingPlanService] Failed to get next uncompleted reading:', e);
    return null;
  }
}

/**
 * Get all scheduled days for a reading plan, each with its chapters and
 * progress. A day counts as completed only when every chapter is read.
 */
export async function getAllPlanDays(planId: string): Promise<ReadingPlanDay[]> {
  try {
    const db = getDatabase();
    await ensurePlanChapters(planId);
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM reading_plan_days WHERE plan_id = ? ORDER BY day_number ASC',
      [planId]
    );
    const chapterRows = await db.getAllAsync<any>(
      'SELECT * FROM reading_plan_day_chapters WHERE plan_id = ? ORDER BY day_number ASC, seq ASC',
      [planId]
    );
    const chaptersByDay = new Map<number, PlanDayChapter[]>();
    for (const c of chapterRows) {
      const list = chaptersByDay.get(c.day_number) ?? [];
      list.push({
        seq: c.seq,
        bookNumber: c.book_number,
        chapter: c.chapter,
        isRead: c.is_read === 1,
        readAt: c.read_at,
      });
      chaptersByDay.set(c.day_number, list);
    }

    return rows.map((row) => {
      const chapters = chaptersByDay.get(row.day_number) ?? [];
      const progress = summarizeDayProgress(chapters, row.is_completed === 1);
      return {
        id: row.id,
        planId: row.plan_id,
        dayNumber: row.day_number,
        bookNumber: row.book_number,
        startChapter: row.start_chapter,
        endChapter: row.end_chapter,
        scheduledDate: row.scheduled_date,
        readingLabel: row.reading_label,
        isCompleted: progress.isComplete,
        completedAt: row.completed_at,
        bookName: getBookName(row.book_number),
        status: progress.isComplete ? 'completed' : 'pending',
        chapters,
        chaptersRead: progress.read,
        chapterCount: progress.total,
      };
    });
  } catch (e) {
    console.error('[readingPlanService] Failed to get all plan days:', e);
    return [];
  }
}

/** Get the scheduled reading for any specific calendar date */
export async function getReadingForDate(dateStr: string): Promise<ReadingPlanDay | null> {
  try {
    const db = getDatabase();
    const row = await db.getFirstAsync<any>(
      `SELECT rpd.*, rp.title as plan_title
       FROM reading_plan_days rpd
       JOIN reading_plans rp ON rp.id = rpd.plan_id
       WHERE rp.is_active = 1 AND rpd.scheduled_date = ?
       LIMIT 1`,
      [dateStr]
    );

    if (!row) return null;

    const isCompleted = row.is_completed === 1;
    return {
      id: row.id,
      planId: row.plan_id,
      dayNumber: row.day_number,
      bookNumber: row.book_number,
      startChapter: row.start_chapter,
      endChapter: row.end_chapter,
      scheduledDate: row.scheduled_date,
      readingLabel: row.reading_label,
      isCompleted,
      completedAt: row.completed_at,
      bookName: getBookName(row.book_number),
      status: isCompleted ? 'completed' : 'pending',
    };
  } catch (e) {
    console.error('[readingPlanService] Failed to get reading for date:', e);
    return null;
  }
}

/** Helper to build a sequential list of all chapters for a given set of book numbers */
function buildChapterList(books: number[]): { bookNumber: number; chapter: number }[] {
  const list: { bookNumber: number; chapter: number }[] = [];
  for (const b of books) {
    const total = CHAPTERS_PER_BOOK[b] || 1;
    for (let c = 1; c <= total; c++) {
      list.push({ bookNumber: b, chapter: c });
    }
  }
  return list;
}

/** Helper to format reading range label across book boundaries */
function formatRangeLabel(
  first: { bookNumber: number; chapter: number },
  last: { bookNumber: number; chapter: number },
  useAbbrev: boolean = false
): string {
  const name1 = useAbbrev ? getBookAbbreviation(first.bookNumber) : getBookName(first.bookNumber);
  const name2 = useAbbrev ? getBookAbbreviation(last.bookNumber) : getBookName(last.bookNumber);

  if (first.bookNumber === last.bookNumber) {
    return first.chapter === last.chapter
      ? `${name1} ${first.chapter}`
      : `${name1} ${first.chapter}–${last.chapter}`;
  }
  return `${name1} ${first.chapter} – ${name2} ${last.chapter}`;
}

/** Generate daily schedule entries for a plan with exact calendar dates */
export function generatePlanSchedule(
  planType: PlanType,
  startDateStr: string,
  customDays?: number,
  customScope?: CustomScope
): PlanScheduleItem[] {
  const baseDate = parseISO(startDateStr);
  const schedule: PlanScheduleItem[] = [];

  // ==========================================
  // CASE 1: Navigators 4-Track Discipleship Plan
  // ==========================================
  if (planType === 'navigators_4track') {
    const duration = 365;

    // Track 1: Gospels (Matthew 40 to John 43 = 89 chapters)
    const gospels = buildChapterList([40, 41, 42, 43]);

    // Track 2: Law & OT History (Genesis 1 to Esther 17 = 436 chapters)
    const lawHistory = buildChapterList(Array.from({ length: 17 }, (_, i) => i + 1));

    // Track 3: Psalms & Wisdom (Psalms 19, Job 18, Proverbs 20, Ecclesiastes 21, Song of Solomon 22 = 243 chapters)
    const wisdom = buildChapterList([19, 18, 20, 21, 22]);

    // Track 4: Epistles & Acts (Acts 44 to Revelation 66 = 221 chapters)
    const epistles = buildChapterList(Array.from({ length: 23 }, (_, i) => i + 44));

    for (let day = 1; day <= duration; day++) {
      const dayDate = addDays(baseDate, day - 1);
      const scheduledDate = format(dayDate, 'yyyy-MM-dd');

      // Track 1: Gospels
      const gIdx = (day - 1) % gospels.length;
      const gFirst = gospels[gIdx];
      const gLabel = formatRangeLabel(gFirst, gFirst, true);

      // Track 2: Law & History
      const lStart = Math.floor(((day - 1) * lawHistory.length) / duration);
      const lEnd = Math.max(lStart, Math.floor((day * lawHistory.length) / duration) - 1);
      const lLabel = formatRangeLabel(lawHistory[lStart], lawHistory[lEnd], true);

      // Track 3: Psalms & Wisdom
      const wStart = Math.floor(((day - 1) * wisdom.length) / duration);
      const wEnd = Math.max(wStart, Math.floor((day * wisdom.length) / duration) - 1);
      const wLabel = formatRangeLabel(wisdom[wStart], wisdom[wEnd], true);

      // Track 4: Epistles & Acts
      const eStart = Math.floor(((day - 1) * epistles.length) / duration);
      const eEnd = Math.max(eStart, Math.floor((day * epistles.length) / duration) - 1);
      const eLabel = formatRangeLabel(epistles[eStart], epistles[eEnd], true);

      const readingLabel = `${gLabel} • ${lLabel} • ${wLabel} • ${eLabel}`;

      schedule.push({
        dayNumber: day,
        bookNumber: gFirst.bookNumber,
        startChapter: gFirst.chapter,
        endChapter: gFirst.chapter,
        scheduledDate,
        readingLabel,
        chapters: [
          gFirst,
          ...lawHistory.slice(lStart, lEnd + 1),
          ...wisdom.slice(wStart, wEnd + 1),
          ...epistles.slice(eStart, eEnd + 1),
        ],
      });
    }

    return schedule;
  }

  // ==========================================
  // CASE 2: Sequential & Scope-Based Plans
  // ==========================================
  let duration = READING_PLAN_DEFINITIONS[planType]?.durationDays || 30;
  if (planType === 'custom' && customDays && customDays > 0) {
    duration = customDays;
  }

  let booksToInclude: number[] = [];
  if (planType === '3_months' || planType === '2_months') {
    // New Testament (Matthew 40 to Revelation 66)
    booksToInclude = Array.from({ length: 27 }, (_, i) => i + 40);
  } else if (planType === 'custom') {
    if (customScope === 'nt') {
      booksToInclude = Array.from({ length: 27 }, (_, i) => i + 40);
    } else if (customScope === 'ot') {
      booksToInclude = Array.from({ length: 39 }, (_, i) => i + 1);
    } else if (customScope === 'gospels') {
      booksToInclude = [40, 41, 42, 43, 44]; // Matthew to Acts
    } else if (customScope === 'wisdom') {
      booksToInclude = [18, 19, 20, 21, 22]; // Job to Song of Solomon
    } else {
      booksToInclude = Array.from({ length: 66 }, (_, i) => i + 1);
    }
  } else {
    // Whole Bible (Genesis 1 to Revelation 66) for 1_year, 6_months, csb_90
    booksToInclude = Array.from({ length: 66 }, (_, i) => i + 1);
  }

  const allChapters = buildChapterList(booksToInclude);
  const totalChapCount = allChapters.length;

  for (let day = 1; day <= duration; day++) {
    const startIdx = Math.floor(((day - 1) * totalChapCount) / duration);
    const endIdx = Math.min(totalChapCount - 1, Math.floor((day * totalChapCount) / duration) - 1);
    const safeEndIdx = Math.max(startIdx, endIdx);

    const first = allChapters[startIdx];
    const last = allChapters[safeEndIdx];
    const dayDate = addDays(baseDate, day - 1);
    const scheduledDate = format(dayDate, 'yyyy-MM-dd');

    const readingLabel = formatRangeLabel(first, last, false);
    const endChap =
      first.bookNumber === last.bookNumber
        ? last.chapter
        : (CHAPTERS_PER_BOOK[first.bookNumber] || first.chapter);

    schedule.push({
      dayNumber: day,
      bookNumber: first.bookNumber,
      startChapter: first.chapter,
      endChapter: endChap,
      scheduledDate,
      readingLabel,
      chapters: allChapters.slice(startIdx, safeEndIdx + 1),
    });
  }

  return schedule;
}

/** Get preview schedule for the first N days of a plan */
export function getSchedulePreview(
  planType: PlanType,
  count: number = 5,
  customDays?: number,
  customScope?: 'whole' | 'nt' | 'ot' | 'gospels' | 'wisdom'
): { dayNumber: number; readingLabel: string }[] {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const full = generatePlanSchedule(planType, todayStr, customDays, customScope);
  return full.slice(0, count).map((item) => ({
    dayNumber: item.dayNumber,
    readingLabel: item.readingLabel,
  }));
}

/** Start a new reading plan (preset or custom) */
export async function startReadingPlan(
  planType: PlanType,
  reminderTime: string = '08:00',
  reminderEnabled: boolean = true,
  customConfig?: {
    title?: string;
    durationDays?: number;
    scope?: 'whole' | 'nt' | 'ot' | 'gospels' | 'wisdom';
    startDate?: string;
  }
): Promise<ReadingPlan> {
  const db = getDatabase();
  const planDef = READING_PLAN_DEFINITIONS[planType];
  const planId = generateUUID();
  const todayStr = customConfig?.startDate || format(new Date(), 'yyyy-MM-dd');

  const finalTitle = customConfig?.title || planDef.title;
  const finalDuration = customConfig?.durationDays || planDef.durationDays;

  // Deactivate any existing active plans
  await db.runAsync('UPDATE reading_plans SET is_active = 0 WHERE is_active = 1');

  // Insert new plan
  await db.runAsync(
    `INSERT INTO reading_plans (id, plan_type, title, duration_days, start_date, is_active, reminder_time, reminder_enabled, current_day)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, 1)`,
    [planId, planType, finalTitle, finalDuration, todayStr, reminderTime, reminderEnabled ? 1 : 0]
  );

  // Generate and insert daily chapters with calendar dates
  const schedule = generatePlanSchedule(
    planType,
    todayStr,
    customConfig?.durationDays,
    customConfig?.scope
  );

  await db.withTransactionAsync(async () => {
    for (const item of schedule) {
      const dayId = generateUUID();
      await db.runAsync(
        `INSERT INTO reading_plan_days (id, plan_id, day_number, book_number, start_chapter, end_chapter, scheduled_date, reading_label, is_completed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          dayId,
          planId,
          item.dayNumber,
          item.bookNumber,
          item.startChapter,
          item.endChapter,
          item.scheduledDate,
          item.readingLabel,
        ]
      );
    }
    await insertDayChapters(planId, schedule);
  });
  checkedChapterPlans.add(planId);

  // Synchronize notifications dynamically
  await syncReadingPlanNotification(planId);

  return {
    id: planId,
    planType,
    title: finalTitle,
    durationDays: finalDuration,
    startDate: todayStr,
    isActive: true,
    reminderTime,
    reminderEnabled,
    currentDay: 1,
    completedDaysCount: 0,
    progressPercentage: 0,
  };
}

/** Mark a specific day's reading as completed */
export async function completeDayReading(planId: string, dayNumber: number): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE reading_plan_days 
     SET is_completed = 1, completed_at = ? 
     WHERE plan_id = ? AND day_number = ?`,
    [now, planId, dayNumber]
  );

  // Marking the whole day done marks every chapter of it read
  await db.runAsync(
    `UPDATE reading_plan_day_chapters
     SET is_read = 1, read_at = COALESCE(read_at, ?)
     WHERE plan_id = ? AND day_number = ?`,
    [now, planId, dayNumber]
  );

  // current_day is the plan day scheduled for today. Catching up on a missed
  // day or reading ahead must not move it (it used to become dayNumber + 1).
  await db.runAsync(
    `UPDATE reading_plans
     SET current_day = COALESCE(
       (SELECT MAX(day_number) FROM reading_plan_days WHERE plan_id = ? AND scheduled_date <= ?),
       current_day)
     WHERE id = ?`,
    [planId, format(new Date(), 'yyyy-MM-dd'), planId]
  );

  // Synchronize dynamic notifications (cancels pending for today, schedules tomorrow with Day X+1)
  await syncReadingPlanNotification(planId);
}

/**
 * Mark one chapter of a plan day read or unread. The day becomes complete when
 * its last chapter is read (which also cancels the rest of that day's
 * reminders), and incomplete again if a chapter is unmarked.
 * Returns whether the day is now complete.
 */
export async function setPlanChapterRead(
  planId: string,
  dayNumber: number,
  seq: number,
  isRead: boolean
): Promise<{ dayComplete: boolean; read: number; total: number }> {
  const db = getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE reading_plan_day_chapters
     SET is_read = ?, read_at = CASE WHEN ? = 1 THEN COALESCE(read_at, ?) ELSE NULL END
     WHERE plan_id = ? AND day_number = ? AND seq = ?`,
    [isRead ? 1 : 0, isRead ? 1 : 0, now, planId, dayNumber, seq]
  );

  const counts = await db.getFirstAsync<{ total: number; read: number }>(
    `SELECT COUNT(*) AS total, COALESCE(SUM(is_read), 0) AS read
     FROM reading_plan_day_chapters WHERE plan_id = ? AND day_number = ?`,
    [planId, dayNumber]
  );
  const total = counts?.total ?? 0;
  const read = counts?.read ?? 0;
  const dayComplete = total > 0 && read === total;

  await db.runAsync(
    `UPDATE reading_plan_days
     SET is_completed = ?, completed_at = CASE WHEN ? = 1 THEN COALESCE(completed_at, ?) ELSE NULL END
     WHERE plan_id = ? AND day_number = ?`,
    [dayComplete ? 1 : 0, dayComplete ? 1 : 0, now, planId, dayNumber]
  );

  // Re-sync reminders: a day that just became complete gets its remaining
  // reminders cancelled; partial progress updates the reminder text.
  await syncReadingPlanNotification(planId);

  return { dayComplete, read, total };
}

/** Plans whose chapter rows were already checked this session */
const checkedChapterPlans = new Set<string>();

async function insertDayChapters(planId: string, schedule: PlanScheduleItem[]): Promise<void> {
  const db = getDatabase();
  const stmt = await db.prepareAsync(
    `INSERT OR IGNORE INTO reading_plan_day_chapters
       (plan_id, day_number, seq, book_number, chapter, is_read)
     VALUES (?, ?, ?, ?, ?, 0)`
  );
  try {
    for (const item of schedule) {
      for (let seq = 0; seq < item.chapters.length; seq++) {
        const c = item.chapters[seq];
        await stmt.executeAsync([planId, item.dayNumber, seq, c.bookNumber, c.chapter]);
      }
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

/**
 * Plans created before per-chapter progress have no chapter rows. Rebuild each
 * day's chapter list from the plan's schedule (trying every custom scope and
 * keeping only days whose label still matches), or from the book and chapter
 * range saved on the day. Completed days get all their chapters marked read.
 */
export async function ensurePlanChapters(planId: string): Promise<void> {
  if (checkedChapterPlans.has(planId)) return;
  const db = getDatabase();
  try {
    const existing = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM reading_plan_day_chapters WHERE plan_id = ?',
      [planId]
    );
    if ((existing?.n ?? 0) > 0) {
      checkedChapterPlans.add(planId);
      return;
    }

    const plan = await db.getFirstAsync<any>('SELECT * FROM reading_plans WHERE id = ?', [planId]);
    const days = await db.getAllAsync<any>(
      'SELECT day_number, book_number, start_chapter, end_chapter, reading_label FROM reading_plan_days WHERE plan_id = ?',
      [planId]
    );
    if (!plan || days.length === 0) return;

    const regenerated = regenerateDayChapters(plan, days);

    await db.withTransactionAsync(async () => {
      for (const day of days) {
        const chapters =
          regenerated.get(day.day_number) ??
          chaptersFromDayRange(day.book_number, day.start_chapter, day.end_chapter);
        for (let seq = 0; seq < chapters.length; seq++) {
          await db.runAsync(BACKFILL_DAY_CHAPTER_SQL, [
            seq,
            chapters[seq].bookNumber,
            chapters[seq].chapter,
            planId,
            day.day_number,
          ]);
        }
      }
    });
    checkedChapterPlans.add(planId);
  } catch (e) {
    console.warn('[readingPlanService] Could not add chapter rows for plan', planId, e);
  }
}

/** Chapters per day from the plan's own schedule, for days whose label still matches */
function regenerateDayChapters(
  plan: { plan_type: PlanType; start_date: string; duration_days: number },
  days: { day_number: number; book_number: number; start_chapter: number; reading_label: string | null }[]
): Map<number, ChapterRef[]> {
  const scopes: (CustomScope | undefined)[] =
    plan.plan_type === 'custom' ? ['whole', 'nt', 'ot', 'gospels', 'wisdom'] : [undefined];

  let best = new Map<number, ChapterRef[]>();
  for (const scope of scopes) {
    let schedule: PlanScheduleItem[];
    try {
      schedule = generatePlanSchedule(plan.plan_type, plan.start_date, plan.duration_days, scope);
    } catch {
      continue;
    }
    const byDay = new Map(schedule.map((s) => [s.dayNumber, s]));
    const matched = new Map<number, ChapterRef[]>();
    for (const day of days) {
      const item = byDay.get(day.day_number);
      if (
        item &&
        item.readingLabel === day.reading_label &&
        item.bookNumber === day.book_number &&
        item.startChapter === day.start_chapter
      ) {
        matched.set(day.day_number, item.chapters);
      }
    }
    if (matched.size > best.size) best = matched;
  }
  return best;
}

/** Cancel / Stop current reading plan */
export async function cancelReadingPlan(planId: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('UPDATE reading_plans SET is_active = 0 WHERE id = ?', [planId]);
  await cancelReadingPlanNotification();
}

/** Update reminder time & enabled status */
export async function updatePlanReminder(
  planId: string,
  enabled: boolean,
  reminderTime: string
): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'UPDATE reading_plans SET reminder_enabled = ?, reminder_time = ? WHERE id = ?',
    [enabled ? 1 : 0, reminderTime, planId]
  );

  // Synchronize notifications
  await syncReadingPlanNotification(planId);
}

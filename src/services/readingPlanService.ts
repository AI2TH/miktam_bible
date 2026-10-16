import { getDatabase } from './database';
import { generateUUID } from '../utils/uuid';
import { CHAPTERS_PER_BOOK } from '../stores/readerStore';
import { getBookName } from '../utils/bookTranslations';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addDays, format, parseISO } from 'date-fns';

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
    description: 'Read the complete Holy Bible from Genesis to Revelation in 365 days.',
    scope: 'Complete Bible (66 Books)',
    dailyPace: '~3 chapters / day',
  },
  '6_months': {
    type: '6_months',
    title: '6 Months Whole Bible Sprint',
    durationDays: 180,
    description: 'Intensive immersion through all 66 books of the Bible in 6 months.',
    scope: 'Complete Bible (66 Books)',
    dailyPace: '~6-7 chapters / day',
  },
  'csb_90': {
    type: 'csb_90',
    title: 'CSB 90-Day Bible Plan',
    durationDays: 90,
    description: 'Read the complete Bible cover-to-cover in 90 intense, focused days.',
    scope: 'Complete Bible (66 Books)',
    dailyPace: '~12 chapters / day',
  },
  'navigators_4track': {
    type: 'navigators_4track',
    title: 'Navigators Discipleship Plan',
    durationDays: 365,
    description: '4 daily readings: Gospels, Law/History, Psalms/Wisdom, and Epistles for rich daily variety.',
    scope: 'Whole Bible in 4 Daily Tracks',
    dailyPace: '4 readings / day',
  },
  '3_months': {
    type: '3_months',
    title: '3 Months New Testament',
    durationDays: 90,
    description: 'Complete the entire New Testament from Matthew through Revelation in 90 days.',
    scope: 'New Testament (27 Books)',
    dailyPace: '~3 chapters / day',
  },
  '2_months': {
    type: '2_months',
    title: '2 Months New Testament Sprint',
    durationDays: 60,
    description: 'Rapid deep dive through the New Testament in 60 focused days.',
    scope: 'New Testament (27 Books)',
    dailyPace: '~4-5 chapters / day',
  },
  'custom': {
    type: 'custom',
    title: 'Custom Reading Plan',
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

    return {
      id: planRow.id,
      planType: planRow.plan_type as PlanType,
      title: planRow.title,
      durationDays: planRow.duration_days,
      startDate: planRow.start_date,
      isActive: planRow.is_active === 1,
      reminderTime: planRow.reminder_time || '08:00',
      reminderEnabled: planRow.reminder_enabled === 1,
      currentDay: planRow.current_day || 1,
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

/** Generate daily schedule entries for a plan with exact calendar dates */
function generatePlanSchedule(
  planType: PlanType,
  startDateStr: string,
  customDays?: number,
  customScope?: 'whole' | 'nt' | 'ot' | 'gospels' | 'wisdom'
): {
  dayNumber: number;
  bookNumber: number;
  startChapter: number;
  endChapter: number;
  scheduledDate: string;
  readingLabel: string;
}[] {
  let duration = READING_PLAN_DEFINITIONS[planType]?.durationDays || 30;
  if (planType === 'custom' && customDays && customDays > 0) {
    duration = customDays;
  }

  // Determine books to include
  let startBook = 1;
  let endBook = 66;

  if (planType === '3_months' || planType === '2_months') {
    startBook = 40; // Matthew
    endBook = 66;   // Revelation
  } else if (planType === 'custom') {
    if (customScope === 'nt') {
      startBook = 40;
      endBook = 66;
    } else if (customScope === 'ot') {
      startBook = 1;
      endBook = 39;
    } else if (customScope === 'gospels') {
      startBook = 40;
      endBook = 44; // Acts
    } else if (customScope === 'wisdom') {
      startBook = 18; // Job
      endBook = 22; // Song of Solomon
    }
  }

  const allChapters: { bookNumber: number; chapter: number }[] = [];
  for (let b = startBook; b <= endBook; b++) {
    const totalChapters = CHAPTERS_PER_BOOK[b] || 1;
    for (let c = 1; c <= totalChapters; c++) {
      allChapters.push({ bookNumber: b, chapter: c });
    }
  }

  const totalChapCount = allChapters.length;
  const schedule: {
    dayNumber: number;
    bookNumber: number;
    startChapter: number;
    endChapter: number;
    scheduledDate: string;
    readingLabel: string;
  }[] = [];

  const baseDate = parseISO(startDateStr);

  for (let day = 1; day <= duration; day++) {
    const startIdx = Math.floor(((day - 1) * totalChapCount) / duration);
    const endIdx = Math.min(totalChapCount - 1, Math.floor((day * totalChapCount) / duration) - 1);
    const safeEndIdx = Math.max(startIdx, endIdx);

    const first = allChapters[startIdx];
    const last = allChapters[safeEndIdx];
    const dayDate = addDays(baseDate, day - 1);
    const scheduledDate = format(dayDate, 'yyyy-MM-dd');

    const startChap = first.chapter;
    const endChap = last.bookNumber === first.bookNumber ? last.chapter : (CHAPTERS_PER_BOOK[first.bookNumber] || first.chapter);
    const bName = getBookName(first.bookNumber);
    const readingLabel = startChap === endChap ? `${bName} ${startChap}` : `${bName} ${startChap}-${endChap}`;

    schedule.push({
      dayNumber: day,
      bookNumber: first.bookNumber,
      startChapter: startChap,
      endChapter: endChap,
      scheduledDate,
      readingLabel,
    });
  }

  return schedule;
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
  });

  // Schedule daily notification
  if (reminderEnabled && Platform.OS !== 'web') {
    try {
      const firstDay = schedule[0];
      await schedulePlanNotification(reminderTime, finalTitle, firstDay.readingLabel, true);
    } catch (e) {
      console.warn('[readingPlanService] Failed scheduling notification:', e);
    }
  }

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

  // Advance current_day in reading_plans
  await db.runAsync(
    'UPDATE reading_plans SET current_day = ? WHERE id = ?',
    [dayNumber + 1, planId]
  );
}

/** Cancel / Stop current reading plan */
export async function cancelReadingPlan(planId: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('UPDATE reading_plans SET is_active = 0 WHERE id = ?', [planId]);
  if (Platform.OS !== 'web') {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {}
  }
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

  if (Platform.OS !== 'web') {
    if (enabled) {
      const plan = await getActiveReadingPlan();
      const today = await getTodayReading(planId);
      const isPending = !today?.isCompleted;
      const readingStr = today?.readingLabel || 'Daily Scripture Reading';
      await schedulePlanNotification(
        reminderTime,
        plan?.title || 'Bible Reading Plan',
        readingStr,
        isPending
      );
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  }
}

/** Helper to schedule recurring daily notification with Expo */
async function schedulePlanNotification(
  timeStr: string,
  planTitle: string,
  readingStr: string,
  isPending: boolean = true
) {
  const [hourStr, minuteStr] = timeStr.split(':');
  const hour = parseInt(hourStr || '8', 10);
  const minute = parseInt(minuteStr || '0', 10);

  // Request permissions if needed
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: reqStatus } = await Notifications.requestPermissionsAsync();
    if (reqStatus !== 'granted') return;
  }

  // Cancel prior reminders
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: isPending ? `⏳ Reading Pending: ${planTitle}` : `📖 ${planTitle}`,
      body: isPending
        ? `Your reading for today (${readingStr}) is pending. Take a moment to read and grow!`
        : `Today's reading is complete: ${readingStr}. Keep your streak going!`,
      sound: true,
      color: '#C9A55C',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'default',
    },
  });
}

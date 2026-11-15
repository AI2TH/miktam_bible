import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getDatabase } from './database';
import { loadVerseOfTheDay } from './verseOfTheDayService';
import { DAILY_VERSE_PREFIX, planDailyVerseNotifications } from './dailyVerse';
import { PLAN_DAYS_WITH_PROGRESS_SQL } from '../database/schema';
import {
  PLAN_REMINDER_PREFIX,
  ReminderPlanDay,
  diffReminders,
  parseReminderTime,
  planReminders,
} from './reminderSchedule';

// Set up default notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Initialize Android notification channels */
export async function initNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    await Notifications.setNotificationChannelAsync('reading_plan', {
      name: 'Bible Reading Planner',
      description: 'Daily scripture reading assignments and reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C9A55C',
    });

    await Notifications.setNotificationChannelAsync('daily_votd', {
      name: 'Verse of the Day',
      description: 'One verse a day, at 12:00 AM or the time you choose',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C9A55C',
    });

    await Notifications.setNotificationChannelAsync('default', {
      name: 'General Reminders',
      description: 'Church meetings and personal Bible study reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C9A55C',
    });
  } catch (e) {
    console.warn('[Notifications] Failed to setup channels:', e);
  }
}

// Immediately trigger channel setup on load
if (Platform.OS === 'android') {
  initNotificationChannels().catch((e) => console.warn('[Notifications] Channel setup error:', e));
}

/** Request notification permissions from the user */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (e) {
    console.warn('[Notifications] Error requesting permissions:', e);
    return false;
  }
}

/**
 * Schedule the daily verse notification: exactly one per day, at `time`
 * (12:00 AM by default, see resolveDailyVerseTime), for the next
 * DAILY_VERSE_WINDOW_DAYS days. Each carries that date's verse and reference,
 * the same date-seeded pick the Home screen shows, in the given translation
 * (falling back to KJV). With `time` null (turned off by the user), every
 * daily verse notification is cancelled.
 *
 * Re-run whenever Home opens or the translation or time changes; it keeps
 * notifications whose text is unchanged and replaces the rest. The old
 * repeating midnight "fallback" notification is cancelled.
 */
export function scheduleDailyVotdNotification(versionId: string | undefined, time: string | null): Promise<void> {
  const run = votdQueue.then(() => scheduleDailyVotdNow(versionId, time));
  votdQueue = run.catch(() => {});
  return run;
}

let votdQueue: Promise<void> = Promise.resolve();

async function scheduleDailyVotdNow(versionId: string | undefined, time: string | null): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const planned = planDailyVerseNotifications(new Date(), time);
    if (planned.length === 0) {
      await cancelVotdNotifications();
      return;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    const normVer = (versionId || 'kjv').toLowerCase().trim();
    const plannedIds = new Set(planned.map((p) => p.id));
    const scheduled = (await Notifications.getAllScheduledNotificationsAsync()).filter((n) =>
      n.identifier?.startsWith(DAILY_VERSE_PREFIX)
    );

    // Anything not in the plan goes, including the old midnight fallback
    for (const n of scheduled) {
      if (!plannedIds.has(n.identifier)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
    const existing = new Map(scheduled.map((n) => [n.identifier, n]));

    for (const p of planned) {
      const votd = await loadVerseOfTheDay(normVer, p.dateKey);
      const title = `🕊️ Verse of the Day • ${votd.ref}`;
      const body = votd.text;

      // The id holds the date and time, so only the text can differ
      const current = existing.get(p.id);
      if (current && current.content?.title === title && current.content?.body === body) {
        continue;
      }

      // Same identifier replaces the earlier notification for that date
      await Notifications.scheduleNotificationAsync({
        identifier: p.id,
        content: {
          title,
          body,
          sound: true,
          color: '#C9A55C',
          data: { type: 'votd', book: votd.book, chapter: votd.chapter, verse: votd.verse },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: p.fireAt,
          channelId: 'daily_votd',
        },
      });
    }
    console.log(`[Notifications] Daily verse scheduled for ${planned.length} days at ${time}`);
  } catch (e) {
    console.warn('[Notifications] Failed to schedule daily VOTD notifications:', e);
  }
}

/** Cancel all Verse of the Day scheduled notifications */
export async function cancelVotdNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.identifier && notif.identifier.startsWith(DAILY_VERSE_PREFIX)) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch (e) {
    console.warn('[Notifications] Failed to cancel VOTD notifications:', e);
  }
}

/**
 * Bring the scheduled reading-plan reminders in line with the plan.
 *
 * Reminders are pre-scheduled with date triggers for the next
 * REMINDER_WINDOW_DAYS days (see reminderSchedule.ts): the chosen time, plus a
 * repeat every N hours until midnight when "keep reminding me until today's
 * reading is done" is on. Days that are complete get none, so calling this
 * after the last chapter of a day is marked read cancels the rest of that
 * day's reminders. Called on every completion or chapter change, on reminder
 * changes, when the planner opens and at app start. Calls run one at a time so
 * a slower, older sync can never re-add reminders a newer one removed.
 */
export function syncReadingPlanNotification(planId?: string): Promise<void> {
  const run = syncQueue.then(() => syncReadingPlanNotificationNow(planId));
  syncQueue = run.catch(() => {});
  return run;
}

let syncQueue: Promise<void> = Promise.resolve();

async function syncReadingPlanNotificationNow(planId?: string): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const db = getDatabase();

    // 1. Get the target active plan
    let plan: any = null;
    if (planId) {
      plan = await db.getFirstAsync<any>(
        'SELECT * FROM reading_plans WHERE id = ? AND is_active = 1',
        [planId]
      );
    }
    if (!plan) {
      plan = await db.getFirstAsync<any>(
        'SELECT * FROM reading_plans WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1'
      );
    }

    const scheduled = (await Notifications.getAllScheduledNotificationsAsync())
      .filter((n) => n.identifier?.startsWith(PLAN_REMINDER_PREFIX))
      .map((n) => ({ id: n.identifier, title: n.content?.title, body: n.content?.body }));

    // Reminders stay off until the user picks a time; there is no default
    const reminderOn = !!plan && plan.reminder_enabled === 1 && !!parseReminderTime(plan.reminder_time);
    if (!reminderOn || !(await requestNotificationPermissions())) {
      for (const n of scheduled) await Notifications.cancelScheduledNotificationAsync(n.id);
      return;
    }

    // 2. Every day of the plan with its chapter progress
    const rows = await db.getAllAsync<any>(PLAN_DAYS_WITH_PROGRESS_SQL, [plan.id]);
    const days: ReminderPlanDay[] = rows.map((r) => {
      const total = r.chapter_count || 0;
      const read = r.chapters_read || 0;
      const isCompleted = r.is_completed === 1 || (total > 0 && read === total);
      return {
        dayNumber: r.day_number,
        scheduledDate: r.scheduled_date,
        isCompleted,
        readingLabel: r.reading_label,
        chaptersRead: isCompleted ? Math.max(total, 1) : read,
        chapterCount: Math.max(total, 1),
      };
    });

    // 3. What should be scheduled, and what to cancel
    const planned = planReminders({
      now: new Date(),
      reminderTime: plan.reminder_time,
      repeatEveryHours: plan.reminder_repeat_hours,
      planTitle: plan.title,
      days,
    });
    const { cancel, schedule } = diffReminders(scheduled, planned);

    for (const id of cancel) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    for (const r of schedule) {
      // Same identifier replaces the earlier notification (updated progress text)
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: {
          title: r.title,
          body: r.body,
          sound: true,
          color: '#C9A55C',
          data: { type: 'plan_reading', planId: plan.id, dayNumber: r.dayNumber },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: r.fireAt,
          channelId: 'reading_plan',
        },
      });
    }
    console.log(
      `[Notifications] Plan reminders: ${planned.length} scheduled, ${cancel.length} cancelled, ${schedule.length} (re)written`
    );
  } catch (e) {
    console.warn('[Notifications] Failed to sync reading plan notification:', e);
  }
}

/** Cancel any active reading plan reminder notification */
export async function cancelReadingPlanNotification(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.identifier && notif.identifier.startsWith(PLAN_REMINDER_PREFIX)) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch (e) {
    console.warn('[Notifications] Failed to cancel reading plan notification:', e);
  }
}

/** Cancel all scheduled notifications */
export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('[Notifications] Cancelled all reminders.');
}

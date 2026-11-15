import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { format, addDays } from 'date-fns';
import { getDatabase } from './database';
import { loadVerseOfTheDay } from './verseOfTheDayService';
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
      description: 'Morning Scripture reflection delivered at 12:00 AM',
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
 * Schedule daily morning Verse of the Day notifications at 12:00 AM (midnight)
 * Schedules a rolling window of 14 days with the exact daily verse for each morning,
 * matching the Home screen's Verse of the Day, plus a repeating daily safety net.
 */
export async function scheduleDailyVotdNotification(versionId?: string): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    const normVer = (versionId || 'kjv').toLowerCase().trim();

    // Cancel existing VOTD notifications to prevent duplication
    await cancelVotdNotifications();

    const now = new Date();

    // Schedule for upcoming 14 mornings at 12:00 AM (00:00:00)
    for (let i = 0; i < 14; i++) {
      const scheduledDate = addDays(now, i);
      scheduledDate.setHours(0, 0, 0, 0);

      // If 12:00 AM for today has already passed, skip today and schedule for tomorrow onwards
      if (scheduledDate.getTime() <= now.getTime()) {
        continue;
      }

      const dateStr = format(scheduledDate, 'yyyy-MM-dd');
      const votd = await loadVerseOfTheDay(normVer, dateStr);

      await Notifications.scheduleNotificationAsync({
        identifier: `miktam_votd_${dateStr}`,
        content: {
          title: `🕊️ Verse of the Day • ${votd.ref}`,
          body: votd.text,
          sound: true,
          color: '#C9A55C',
          data: { type: 'votd', book: votd.book, chapter: votd.chapter, verse: votd.verse },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: scheduledDate,
          channelId: 'daily_votd',
        },
      });
      console.log(`[Notifications] Scheduled 12:00 AM VOTD for ${dateStr}: ${votd.ref}`);
    }

    // Safety net: repeating daily notification at 00:00 (12:00 AM)
    await Notifications.scheduleNotificationAsync({
      identifier: 'miktam_votd_daily_fallback',
      content: {
        title: '🕊️ Daily Verse of the Day',
        body: 'Start your morning in God’s Word. Tap to read today’s verse!',
        sound: true,
        color: '#C9A55C',
        data: { type: 'votd_home' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 0,
        minute: 0,
        channelId: 'daily_votd',
      },
    });
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
      if (notif.identifier && notif.identifier.startsWith('miktam_votd_')) {
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

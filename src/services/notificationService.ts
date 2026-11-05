import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { format, addDays } from 'date-fns';
import { getDatabase } from './database';
import { loadVerseOfTheDay } from './verseOfTheDayService';

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
 * Synchronize the reading plan reminder notification dynamically.
 * - If today's reading is already completed: cancels pending notification for today,
 *   and schedules reminder for tomorrow with the NEXT uncompleted reading (e.g. Day 4).
 * - If today's reading is pending: schedules reminder for today with today's reading.
 * - Never shows stale "Genesis 1-3" when user is on a later day!
 * - Never says reading is pending when the user already marked it completed!
 */
export async function syncReadingPlanNotification(planId?: string): Promise<void> {
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

    // Always clear existing reading plan notifications first
    await cancelReadingPlanNotification();

    if (!plan || plan.reminder_enabled !== 1) {
      return;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // 2. Query today's scheduled reading
    const todayRow = await db.getFirstAsync<any>(
      'SELECT * FROM reading_plan_days WHERE plan_id = ? AND scheduled_date = ? LIMIT 1',
      [plan.id, todayStr]
    );

    // 3. Query earliest uncompleted reading
    const nextUncompletedRow = await db.getFirstAsync<any>(
      'SELECT * FROM reading_plan_days WHERE plan_id = ? AND is_completed = 0 ORDER BY day_number ASC LIMIT 1',
      [plan.id]
    );

    // Parse reminder hour & minute
    const [hourStr, minStr] = (plan.reminder_time || '08:00').split(':');
    const reminderHour = parseInt(hourStr || '8', 10);
    const reminderMin = parseInt(minStr || '0', 10);

    const isTodayDone = todayRow ? todayRow.is_completed === 1 : false;

    if (isTodayDone) {
      // User has already completed today's scripture!
      // Do NOT send a "reading pending" notification today.
      if (!nextUncompletedRow) {
        // Entire plan completed!
        return;
      }

      // Schedule notification for tomorrow with next uncompleted day's reading
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, reminderHour, reminderMin, 0);

      await Notifications.scheduleNotificationAsync({
        identifier: 'miktam_reading_plan_reminder',
        content: {
          title: `📖 ${plan.title} • Day ${nextUncompletedRow.day_number}`,
          body: `Tomorrow's reading: ${nextUncompletedRow.reading_label}. Keep your study streak going!`,
          sound: true,
          color: '#C9A55C',
          data: {
            type: 'plan_reading',
            planId: plan.id,
            dayNumber: nextUncompletedRow.day_number,
            bookNumber: nextUncompletedRow.book_number,
            chapter: nextUncompletedRow.start_chapter,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: tomorrow,
          channelId: 'reading_plan',
        },
      });
      console.log(`[Notifications] Today complete. Next Day ${nextUncompletedRow.day_number} scheduled for tomorrow at ${plan.reminder_time}`);
    } else {
      // Today's reading is pending!
      const targetDay = todayRow || nextUncompletedRow;
      if (!targetDay) return;

      const now = new Date();
      const todayReminderTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), reminderHour, reminderMin, 0);
      const isFutureToday = todayReminderTime.getTime() > now.getTime();

      if (isFutureToday) {
        // Reminder time hasn't passed today -> schedule for today
        await Notifications.scheduleNotificationAsync({
          identifier: 'miktam_reading_plan_reminder',
          content: {
            title: `⏳ Reading Pending: ${plan.title}`,
            body: `Day ${targetDay.day_number} (${targetDay.reading_label}) is pending. Take a moment to read and grow!`,
            sound: true,
            color: '#C9A55C',
            data: {
              type: 'plan_reading',
              planId: plan.id,
              dayNumber: targetDay.day_number,
              bookNumber: targetDay.book_number,
              chapter: targetDay.start_chapter,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: todayReminderTime,
            channelId: 'reading_plan',
          },
        });
        console.log(`[Notifications] Today pending. Scheduled for today at ${plan.reminder_time}`);
      } else {
        // Reminder time has already passed today -> schedule recurring daily trigger with current target day
        await Notifications.scheduleNotificationAsync({
          identifier: 'miktam_reading_plan_reminder',
          content: {
            title: `⏳ Reading Pending: ${plan.title}`,
            body: `Day ${targetDay.day_number} (${targetDay.reading_label}) is pending. Don't forget your daily scripture!`,
            sound: true,
            color: '#C9A55C',
            data: {
              type: 'plan_reading',
              planId: plan.id,
              dayNumber: targetDay.day_number,
              bookNumber: targetDay.book_number,
              chapter: targetDay.start_chapter,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: reminderHour,
            minute: reminderMin,
            channelId: 'reading_plan',
          },
        });
        console.log(`[Notifications] Reminder time passed today. Scheduled daily recurring for ${plan.reminder_time}`);
      }
    }
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
      if (notif.identifier && notif.identifier.startsWith('miktam_reading_plan_')) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch (e) {
    console.warn('[Notifications] Failed to cancel reading plan notification:', e);
  }
}

/** Schedule a generic daily reminder (compatibility alias) */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<string> {
  if (Platform.OS === 'web') return '';
  const id = await Notifications.scheduleNotificationAsync({
    identifier: 'miktam_reading_plan_reminder',
    content: {
      title: 'Time for your Daily Scripture study! 📖',
      body: 'Keep your reading streak alive. Take a few minutes to read and reflect.',
      sound: true,
      color: '#C9A55C',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'reading_plan',
    },
  });
  return id;
}

/** Cancel all scheduled notifications */
export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('[Notifications] Cancelled all reminders.');
}

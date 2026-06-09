import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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

/** Request notification permissions from the user */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/** Schedule a daily reading reminder at a specific hour and minute */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<string> {
  if (Platform.OS === 'web') return '';

  // Cancel any existing daily reminder first
  await cancelAllReminders();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time for your Daily Scripture study! 📖",
      body: "Keep your reading streak alive. Take a few minutes to read and reflect.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  console.log(`[Notifications] Scheduled daily reminder at ${hour}:${minute} with ID:`, id);
  return id;
}

/** Cancel all scheduled notifications */
export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('[Notifications] Cancelled all reminders.');
}

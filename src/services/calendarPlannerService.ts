import { getDatabase } from './database';
import { generateUUID } from '../utils/uuid';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface CalendarTodo {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  eventTime?: string; // e.g. "10:00 AM"
  location?: string;
  notes?: string;
  reminderEnabled: boolean;
  createdAt: string;
}

/** Get all to-do items for a specific date */
export async function getTodosForDate(date: string): Promise<CalendarTodo[]> {
  try {
    const db = getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM calendar_todos WHERE date = ? ORDER BY created_at ASC',
      [date]
    );
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      title: r.title,
      isCompleted: r.is_completed === 1,
      createdAt: r.created_at,
    }));
  } catch (e) {
    console.error('[calendarPlannerService] Failed to get todos:', e);
    return [];
  }
}

/** Add a new to-do task for a date */
export async function addTodo(date: string, title: string): Promise<CalendarTodo> {
  const db = getDatabase();
  const id = generateUUID();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO calendar_todos (id, date, title, is_completed, created_at) VALUES (?, ?, ?, 0, ?)',
    [id, date, title.trim(), now]
  );
  return {
    id,
    date,
    title: title.trim(),
    isCompleted: false,
    createdAt: now,
  };
}

/** Toggle completion state of a to-do item */
export async function toggleTodo(id: string, isCompleted: boolean): Promise<void> {
  try {
    const db = getDatabase();
    await db.runAsync('UPDATE calendar_todos SET is_completed = ? WHERE id = ?', [
      isCompleted ? 1 : 0,
      id,
    ]);
  } catch (e) {
    console.error('[calendarPlannerService] Failed to toggle todo:', e);
  }
}

/** Delete a to-do item */
export async function deleteTodo(id: string): Promise<void> {
  try {
    const db = getDatabase();
    await db.runAsync('DELETE FROM calendar_todos WHERE id = ?', [id]);
  } catch (e) {
    console.error('[calendarPlannerService] Failed to delete todo:', e);
  }
}

/** Get all scheduled events/meetings for a specific date */
export async function getEventsForDate(date: string): Promise<CalendarEvent[]> {
  try {
    const db = getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM calendar_events WHERE date = ? ORDER BY event_time ASC, created_at ASC',
      [date]
    );
    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      title: r.title,
      eventTime: r.event_time,
      location: r.location,
      notes: r.notes,
      reminderEnabled: r.reminder_enabled === 1,
      createdAt: r.created_at,
    }));
  } catch (e) {
    console.error('[calendarPlannerService] Failed to get events:', e);
    return [];
  }
}

/** Schedule a church meeting / event */
export async function addEvent(
  event: Omit<CalendarEvent, 'id' | 'createdAt'>
): Promise<CalendarEvent> {
  const db = getDatabase();
  const id = generateUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO calendar_events (id, date, title, event_time, location, notes, reminder_enabled, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      event.date,
      event.title.trim(),
      event.eventTime || null,
      event.location || null,
      event.notes || null,
      event.reminderEnabled ? 1 : 0,
      now,
    ]
  );

  // If reminder is enabled, schedule local notification
  if (event.reminderEnabled && Platform.OS !== 'web') {
    try {
      await scheduleEventReminder(event.date, event.eventTime, event.title, event.location);
    } catch (err) {
      console.warn('[calendarPlannerService] Failed to schedule event reminder notification:', err);
    }
  }

  return {
    id,
    date: event.date,
    title: event.title.trim(),
    eventTime: event.eventTime,
    location: event.location,
    notes: event.notes,
    reminderEnabled: event.reminderEnabled,
    createdAt: now,
  };
}

/** Delete an event */
export async function deleteEvent(id: string): Promise<void> {
  try {
    const db = getDatabase();
    await db.runAsync('DELETE FROM calendar_events WHERE id = ?', [id]);
  } catch (e) {
    console.error('[calendarPlannerService] Failed to delete event:', e);
  }
}

/** Get dates within a range that have todos or events (for calendar day dots) */
export async function getCalendarBadgeDates(
  startDate: string,
  endDate: string
): Promise<{ todoDates: string[]; eventDates: string[] }> {
  try {
    const db = getDatabase();
    const todoRows = await db.getAllAsync<{ date: string }>(
      'SELECT DISTINCT date FROM calendar_todos WHERE date BETWEEN ? AND ?',
      [startDate, endDate]
    );
    const eventRows = await db.getAllAsync<{ date: string }>(
      'SELECT DISTINCT date FROM calendar_events WHERE date BETWEEN ? AND ?',
      [startDate, endDate]
    );

    return {
      todoDates: todoRows.map((r) => r.date),
      eventDates: eventRows.map((r) => r.date),
    };
  } catch (e) {
    console.error('[calendarPlannerService] Failed to get badge dates:', e);
    return { todoDates: [], eventDates: [] };
  }
}

/** Schedule a notification for an event */
async function scheduleEventReminder(
  dateStr: string,
  timeStr?: string,
  title?: string,
  location?: string
) {
  // Parse hour and minute from timeStr like "10:00 AM" or "14:30"
  let hour = 9;
  let minute = 0;

  if (timeStr) {
    const ampmMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (ampmMatch) {
      let h = parseInt(ampmMatch[1], 10);
      const m = parseInt(ampmMatch[2], 10);
      const period = ampmMatch[3]?.toUpperCase();
      if (period === 'PM' && h < 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      hour = h;
      minute = m;
    }
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day, hour, minute);

  // If in the future, schedule notification
  if (targetDate.getTime() > Date.now()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Reminder: ${title || 'Church Meeting'}`,
        body: `${timeStr ? timeStr + ' - ' : ''}${title || 'Event'}${
          location ? ` at ${location}` : ''
        }`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetDate,
      },
    });
  }
}

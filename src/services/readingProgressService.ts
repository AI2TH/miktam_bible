import { getDatabase } from './database';
import type { ReadingProgress } from '../types/user';
import { generateUUID } from '../utils/uuid';
import { format, subDays, parseISO, differenceInDays } from 'date-fns';

/** Mark a specific chapter as read today */
export async function markChapterAsRead(
  versionId: string,
  bookNumber: number,
  chapter: number,
  readingTimeSecs: number = 0
): Promise<ReadingProgress> {
  const db = getDatabase();
  const id = generateUUID();
  const today = format(new Date(), 'yyyy-MM-dd');
  const normVersion = (versionId || 'kjv').toLowerCase().trim();

  // Insert or update progress for today
  await db.runAsync(
    `INSERT INTO reading_progress (id, version_id, book_number, chapter, read_date, reading_time_secs)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(version_id, book_number, chapter, read_date)
     DO UPDATE SET reading_time_secs = reading_time_secs + excluded.reading_time_secs`,
    [id, normVersion, bookNumber, chapter, today, readingTimeSecs]
  );

  // Get final record
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM reading_progress WHERE LOWER(version_id) = ? AND book_number = ? AND chapter = ? AND read_date = ?',
    [normVersion, bookNumber, chapter, today]
  );

  const record: ReadingProgress = {
    id: row?.id || id,
    versionId: row?.version_id || normVersion,
    bookNumber: row?.book_number || bookNumber,
    chapter: row?.chapter || chapter,
    readDate: row?.read_date || today,
    readingTimeSecs: row?.reading_time_secs || readingTimeSecs,
    isSynced: row?.is_synced === 1,
  };

  // Add to sync queue
  await db.runAsync(
    `INSERT INTO sync_queue (table_name, record_id, action, payload)
     VALUES ('reading_progress', ?, 'INSERT', ?)`,
    [record.id, JSON.stringify(record)]
  );

  return record;
}

/** Get list of read book/chapter records for a version and book */
export async function getReadChaptersForBook(
  versionId: string,
  bookNumber: number
): Promise<{ chapter: number; readDate: string }[]> {
  const db = getDatabase();
  const normVersion = (versionId || 'kjv').toLowerCase().trim();
  const rows = await db.getAllAsync<any>(
    `SELECT DISTINCT chapter, read_date
     FROM reading_progress
     WHERE LOWER(version_id) = ? AND book_number = ?`,
    [normVersion, bookNumber]
  );
  return rows.map(r => ({
    chapter: r.chapter,
    readDate: r.read_date,
  }));
}

/** Get unique dates read in a date range (for calendar view) */
export async function getReadDatesInRange(
  startDate: string, // YYYY-MM-DD
  endDate: string
): Promise<string[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<{ read_date: string }>(
    `SELECT DISTINCT read_date FROM reading_progress
     WHERE read_date BETWEEN ? AND ?`,
    [startDate, endDate]
  );
  return rows.map(r => r.read_date);
}

/**
 * Calculates current reading streak.
 * Iterates backwards from today (or yesterday) to find consecutive reading days.
 */
export async function getStreakCount(): Promise<number> {
  const db = getDatabase();
  const rows = await db.getAllAsync<{ read_date: string }>(
    'SELECT DISTINCT read_date FROM reading_progress ORDER BY read_date DESC'
  );

  if (rows.length === 0) return 0;

  const readDates = new Set(rows.map(r => r.read_date));
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  let currentStreak = 0;
  let checkDate = new Date();

  // If didn't read today, check starting from yesterday
  if (!readDates.has(todayStr)) {
    if (!readDates.has(yesterdayStr)) {
      return 0; // Streak broken
    }
    checkDate = subDays(new Date(), 1);
  }

  while (true) {
    const formattedCheck = format(checkDate, 'yyyy-MM-dd');
    if (readDates.has(formattedCheck)) {
      currentStreak++;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
  }

  return currentStreak;
}

/** Get overall stats */
export async function getReadingStats(): Promise<{
  totalChaptersRead: number;
  totalReadingTimeSecs: number;
  chaptersReadThisWeek: number;
}> {
  const db = getDatabase();

  const totalRow = await db.getFirstAsync<{ cnt: number; time: number }>(
    'SELECT COUNT(id) as cnt, SUM(reading_time_secs) as time FROM reading_progress'
  );

  const startOfWeek = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const weekRow = await db.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(id) as cnt FROM reading_progress WHERE read_date >= ?',
    [startOfWeek]
  );

  return {
    totalChaptersRead: totalRow?.cnt ?? 0,
    totalReadingTimeSecs: totalRow?.time ?? 0,
    chaptersReadThisWeek: weekRow?.cnt ?? 0,
  };
}

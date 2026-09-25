import { getDatabase } from './database';
import { generateUUID } from '../utils/uuid';
import type { Verse } from '../types/bible';

export interface PromiseVerseInfo {
  id: string;
  source: string;
  versionId: string;
  bookNumber: number;
  chapter: number;
  verseNumber: number;
  calendarType: 'monthly' | 'yearly';
  targetDate: string;
  createdAt: string;
  verseText: string | null;
  bookName: string | null;
}

/**
 * Fetch a promise verse of a specific type ('monthly' | 'yearly') for a given target date.
 * - Target date format: 'YYYY' for yearly, 'YYYY-MM' for monthly.
 */
export async function getPromiseVerse(
  calendarType: 'monthly' | 'yearly',
  targetDate: string,
  preferredVersionId?: string
): Promise<PromiseVerseInfo | null> {
  const db = getDatabase();
  const prefVer = (preferredVersionId || 'kjv').toLowerCase().trim();
  try {
    const row = await db.getFirstAsync<any>(
      `SELECT vc.*, 
              COALESCE(v_pref.text, v_saved.text, v_kjv.text, v_bbe.text) AS verse_text,
              COALESCE(b_pref.name, b_saved.name, b_kjv.name, b_bbe.name) AS book_name,
              COALESCE(v_pref.version_id, v_saved.version_id, v_kjv.version_id, v_bbe.version_id) AS matched_version_id
       FROM verse_calendar vc
       LEFT JOIN verses v_pref ON LOWER(v_pref.version_id) = ?
         AND vc.book_number = v_pref.book_number 
         AND vc.chapter = v_pref.chapter 
         AND vc.verse_number = v_pref.verse_number
       LEFT JOIN books b_pref ON LOWER(b_pref.version_id) = ?
         AND vc.book_number = b_pref.book_number
       LEFT JOIN verses v_saved ON LOWER(v_saved.version_id) = LOWER(vc.version_id) 
         AND vc.book_number = v_saved.book_number 
         AND vc.chapter = v_saved.chapter 
         AND vc.verse_number = v_saved.verse_number
       LEFT JOIN books b_saved ON LOWER(b_saved.version_id) = LOWER(vc.version_id) 
         AND vc.book_number = b_saved.book_number
       LEFT JOIN verses v_kjv ON LOWER(v_kjv.version_id) = 'kjv' 
         AND vc.book_number = v_kjv.book_number 
         AND vc.chapter = v_kjv.chapter 
         AND vc.verse_number = v_kjv.verse_number
       LEFT JOIN books b_kjv ON LOWER(b_kjv.version_id) = 'kjv' 
         AND vc.book_number = b_kjv.book_number
       LEFT JOIN verses v_bbe ON LOWER(v_bbe.version_id) = 'bbe' 
         AND vc.book_number = v_bbe.book_number 
         AND vc.chapter = v_bbe.chapter 
         AND vc.verse_number = v_bbe.verse_number
       LEFT JOIN books b_bbe ON LOWER(b_bbe.version_id) = 'bbe' 
         AND vc.book_number = b_bbe.book_number
       WHERE vc.calendar_type = ? AND vc.target_date = ?
       ORDER BY vc.created_at DESC
       LIMIT 1`,
      [prefVer, prefVer, calendarType, targetDate]
    );

    if (!row) return null;

    return {
      id: row.id,
      source: row.source,
      versionId: row.matched_version_id || row.version_id,
      bookNumber: row.book_number,
      chapter: row.chapter,
      verseNumber: row.verse_number,
      calendarType: row.calendar_type as 'monthly' | 'yearly',
      targetDate: row.target_date,
      createdAt: row.created_at,
      verseText: row.verse_text,
      bookName: row.book_name,
    };
  } catch (error) {
    console.error(`[calendarService] Failed to getPromiseVerse for ${calendarType} on ${targetDate}:`, error);
    return null;
  }
}

/**
 * Save or overwrite a promise verse.
 */
export async function savePromiseVerse(
  calendarType: 'monthly' | 'yearly',
  targetDate: string,
  versionId: string,
  bookNumber: number,
  chapter: number,
  verseNumber: number,
  source: string = 'user'
): Promise<void> {
  const db = getDatabase();
  const id = generateUUID();
  const normVersion = (versionId || 'kjv').toLowerCase().trim();
  try {
    // 1. Delete existing promise verse for this type and target date to prevent duplicates
    await db.runAsync(
      `DELETE FROM verse_calendar WHERE calendar_type = ? AND target_date = ?`,
      [calendarType, targetDate]
    );

    // 2. Insert new promise verse
    await db.runAsync(
      `INSERT INTO verse_calendar (id, source, version_id, book_number, chapter, verse_number, calendar_type, target_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, source, normVersion, bookNumber, chapter, verseNumber, calendarType, targetDate]
    );

    // 3. Add to sync queue for offline sync support
    const payload = {
      id,
      source,
      versionId: normVersion,
      bookNumber,
      chapter,
      verseNumber,
      calendarType,
      targetDate,
    };
    await db.runAsync(
      `INSERT INTO sync_queue (table_name, record_id, action, payload)
       VALUES ('verse_calendar', ?, 'INSERT', ?)`,
      [id, JSON.stringify(payload)]
    );

    console.log(`[calendarService] Promise verse (${calendarType}) successfully saved for ${targetDate}`);
  } catch (error) {
    console.error(`[calendarService] Failed to savePromiseVerse:`, error);
    throw error;
  }
}

/**
 * Delete a promise verse.
 */
export async function deletePromiseVerse(
  calendarType: 'monthly' | 'yearly',
  targetDate: string
): Promise<void> {
  const db = getDatabase();
  try {
    await db.runAsync(
      `DELETE FROM verse_calendar WHERE calendar_type = ? AND target_date = ?`,
      [calendarType, targetDate]
    );
    console.log(`[calendarService] Promise verse (${calendarType}) successfully deleted for ${targetDate}`);
  } catch (error) {
    console.error(`[calendarService] Failed to deletePromiseVerse:`, error);
    throw error;
  }
}

/**
 * Get suggestions for popular promise verses.
 */
export const SUGGESTED_PROMISE_VERSES = [
  { versionId: 'kjv', bookNumber: 43, chapter: 3, verseNumber: 16, bookName: 'John', reference: 'John 3:16', text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },
  { versionId: 'kjv', bookNumber: 50, chapter: 4, verseNumber: 13, bookName: 'Philippians', reference: 'Philippians 4:13', text: 'I can do all things through Christ which strengtheneth me.' },
  { versionId: 'kjv', bookNumber: 45, chapter: 8, verseNumber: 28, bookName: 'Romans', reference: 'Romans 8:28', text: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.' },
  { versionId: 'kjv', bookNumber: 23, chapter: 40, verseNumber: 31, bookName: 'Isaiah', reference: 'Isaiah 40:31', text: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.' },
  { versionId: 'kjv', bookNumber: 20, chapter: 3, verseNumber: 5, bookName: 'Proverbs', reference: 'Proverbs 3:5', text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.' },
  { versionId: 'kjv', bookNumber: 24, chapter: 29, verseNumber: 11, bookName: 'Jeremiah', reference: 'Jeremiah 29:11', text: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.' },
  { versionId: 'kjv', bookNumber: 19, chapter: 23, verseNumber: 1, bookName: 'Psalms', reference: 'Psalms 23:1', text: 'The LORD is my shepherd; I shall not want.' },
  { versionId: 'kjv', bookNumber: 6, chapter: 1, verseNumber: 9, bookName: 'Joshua', reference: 'Joshua 1:9', text: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.' },
];

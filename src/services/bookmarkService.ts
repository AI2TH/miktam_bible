import { getDatabase } from './database';
import { BOOK_NAMES } from '../utils/constants';
import { getBookName } from '../utils/bookTranslations';
import { cleanVerseText } from '../utils/bibleUtils';
import type { Bookmark } from '../types/user';
import { generateUUID } from '../utils/uuid';

/**
 * Add or update a highlight on a specific verse.
 * Highlighting is PER VERSE (canonical scripture location: book, chapter, verse),
 * so it consistently applies across all translations and dual-mode reading.
 */
export async function addBookmark(
  versionId: string,
  bookNumber: number,
  chapter: number,
  verseNumber: number,
  color: string = '#FFD700'
): Promise<Bookmark> {
  const db = getDatabase();
  const now = new Date().toISOString();
  const normVersion = (versionId || 'kjv').toLowerCase().trim();

  // Check if this verse already has a highlight
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM bookmarks WHERE book_number = ? AND chapter = ? AND verse_number = ? LIMIT 1`,
    [bookNumber, chapter, verseNumber]
  );

  let id: string;
  if (existing) {
    id = existing.id;
    await db.runAsync(
      `UPDATE bookmarks
       SET highlight_color = ?, version_id = ?, updated_at = ?
       WHERE id = ?`,
      [color, normVersion, now, id]
    );
  } else {
    id = generateUUID();
    await db.runAsync(
      `INSERT INTO bookmarks (id, version_id, book_number, chapter, verse_number, highlight_color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, normVersion, bookNumber, chapter, verseNumber, color, now, now]
    );
  }

  // Add to sync queue
  await db.runAsync(
    `INSERT INTO sync_queue (table_name, record_id, action, payload)
     VALUES ('bookmarks', ?, 'INSERT', ?)`,
    [id, JSON.stringify({ id, versionId: normVersion, bookNumber, chapter, verseNumber, color })]
  );

  return { id, versionId: normVersion, bookNumber, chapter, verseNumber, highlightColor: color, createdAt: now, updatedAt: now, isSynced: false };
}

/** Remove a bookmark by ID */
export async function removeBookmark(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM bookmarks WHERE id = ?', [id]);
  await db.runAsync(
    `INSERT INTO sync_queue (table_name, record_id, action, payload) VALUES ('bookmarks', ?, 'DELETE', '{}')`,
    [id]
  );
}

/** Remove a highlight by verse location */
export async function removeHighlightByVerse(
  bookNumber: number,
  chapter: number,
  verseNumber: number
): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'DELETE FROM bookmarks WHERE book_number = ? AND chapter = ? AND verse_number = ?',
    [bookNumber, chapter, verseNumber]
  );
}

/** Get all bookmarks, deduplicated per verse, newest first */
export async function getAllBookmarks(): Promise<(Bookmark & { bookName: string; text: string })[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT b.*, 
            COALESCE(
              v.text,
              (SELECT text FROM verses WHERE version_id = 'kjv' AND book_number = b.book_number AND chapter = b.chapter AND verse_number = b.verse_number LIMIT 1),
              ''
            ) AS verse_text
     FROM bookmarks b
     LEFT JOIN verses v ON LOWER(b.version_id) = LOWER(v.version_id) AND b.book_number = v.book_number AND b.chapter = v.chapter AND b.verse_number = v.verse_number
     GROUP BY b.book_number, b.chapter, b.verse_number
     ORDER BY b.created_at DESC`
  );
  return rows.map(r => ({
    id: r.id,
    versionId: r.version_id,
    bookNumber: r.book_number,
    chapter: r.chapter,
    verseNumber: r.verse_number,
    highlightColor: r.highlight_color,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    isSynced: r.is_synced === 1,
    bookName: getBookName(r.book_number, r.version_id) || BOOK_NAMES[r.book_number] || '',
    text: cleanVerseText(r.verse_text || ''),
  }));
}

/** Get bookmarks for a specific chapter (per verse across all translations) */
export async function getBookmarksForChapter(
  versionId: string,
  bookNumber: number,
  chapter: number
): Promise<Bookmark[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM bookmarks
     WHERE book_number = ? AND chapter = ?
     GROUP BY book_number, chapter, verse_number`,
    [bookNumber, chapter]
  );
  return rows.map(r => ({
    id: r.id,
    versionId: r.version_id,
    bookNumber: r.book_number,
    chapter: r.chapter,
    verseNumber: r.verse_number,
    highlightColor: r.highlight_color,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    isSynced: r.is_synced === 1,
  }));
}

/** Check if a specific verse is bookmarked */
export async function isVerseBookmarked(
  versionId: string,
  bookNumber: number,
  chapter: number,
  verseNumber: number
): Promise<Bookmark | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM bookmarks
     WHERE book_number = ? AND chapter = ? AND verse_number = ?
     LIMIT 1`,
    [bookNumber, chapter, verseNumber]
  );
  if (!row) return null;
  return {
    id: row.id,
    versionId: row.version_id,
    bookNumber: row.book_number,
    chapter: row.chapter,
    verseNumber: row.verse_number,
    highlightColor: row.highlight_color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isSynced: row.is_synced === 1,
  };
}

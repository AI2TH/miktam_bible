import { getDatabase } from './database';
import { BOOK_NAMES } from '../utils/constants';
import type { Bookmark } from '../types/user';
import { generateUUID } from '../utils/uuid';

/** Add a bookmark (highlight) on a verse */
export async function addBookmark(
  versionId: string,
  bookNumber: number,
  chapter: number,
  verseNumber: number,
  color: string = '#FFD700'
): Promise<Bookmark> {
  const db = getDatabase();
  const id = generateUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT OR REPLACE INTO bookmarks (id, version_id, book_number, chapter, verse_number, highlight_color, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, versionId, bookNumber, chapter, verseNumber, color, now, now]
  );

  // Add to sync queue
  await db.runAsync(
    `INSERT INTO sync_queue (table_name, record_id, action, payload)
     VALUES ('bookmarks', ?, 'INSERT', ?)`,
    [id, JSON.stringify({ id, versionId, bookNumber, chapter, verseNumber, color })]
  );

  return { id, versionId, bookNumber, chapter, verseNumber, highlightColor: color, createdAt: now, updatedAt: now, isSynced: false };
}

/** Remove a bookmark */
export async function removeBookmark(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM bookmarks WHERE id = ?', [id]);
  await db.runAsync(
    `INSERT INTO sync_queue (table_name, record_id, action, payload) VALUES ('bookmarks', ?, 'DELETE', '{}')`,
    [id]
  );
}

/** Get all bookmarks, newest first */
export async function getAllBookmarks(): Promise<(Bookmark & { bookName: string; text: string })[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT b.*, v.text 
     FROM bookmarks b
     LEFT JOIN verses v ON b.version_id = v.version_id AND b.book_number = v.book_number AND b.chapter = v.chapter AND b.verse_number = v.verse_number
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
    bookName: BOOK_NAMES[r.book_number] || '',
    text: r.text || '',
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
     WHERE version_id = ? AND book_number = ? AND chapter = ? AND verse_number = ?`,
    [versionId, bookNumber, chapter, verseNumber]
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

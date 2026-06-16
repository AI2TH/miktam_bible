import { getDatabase } from './database';
import { BOOK_NAMES } from '../utils/constants';
import type { Note } from '../types/user';
import { generateUUID } from '../utils/uuid';

/** Add a note on a verse or chapter */
export async function addNote(
  versionId: string,
  bookNumber: number,
  chapter: number,
  verseNumber: number | null,
  content: string
): Promise<Note> {
  const db = getDatabase();

  // Check if a note already exists for this verse/chapter to prevent duplicate records
  const existing = await getNoteForVerse(versionId, bookNumber, chapter, verseNumber);
  if (existing) {
    await updateNote(existing.id, content);
    return {
      ...existing,
      content,
      updatedAt: new Date().toISOString(),
    };
  }

  const id = generateUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO notes (id, version_id, book_number, chapter, verse_number, content, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, versionId, bookNumber, chapter, verseNumber, content, now, now]
  );

  // Sync to FTS virtual table
  const row = await db.getFirstAsync<{ rowid: number }>('SELECT last_insert_rowid() as rowid');
  const rowid = row?.rowid ?? 0;
  await db.runAsync(
    `INSERT INTO notes_fts (rowid, content) VALUES (?, ?)`,
    [rowid, content]
  );

  // Add to sync queue
  await db.runAsync(
    `INSERT INTO sync_queue (table_name, record_id, action, payload)
     VALUES ('notes', ?, 'INSERT', ?)`,
    [id, JSON.stringify({ id, versionId, bookNumber, chapter, verseNumber, content })]
  );

  return { id, versionId, bookNumber, chapter, verseNumber, content, createdAt: now, updatedAt: now, isSynced: false };
}

/** Update an existing note */
export async function updateNote(id: string, content: string): Promise<void> {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Find the rowid for FTS update
  const noteRow = await db.getFirstAsync<{ rowid: number }>('SELECT rowid FROM notes WHERE id = ?', [id]);
  const rowid = noteRow?.rowid;

  await db.runAsync(
    `UPDATE notes SET content = ?, updated_at = ?, is_synced = 0 WHERE id = ?`,
    [content, now, id]
  );

  if (rowid !== undefined) {
    // Update FTS
    await db.runAsync(
      `INSERT OR REPLACE INTO notes_fts (rowid, content) VALUES (?, ?)`,
      [rowid, content]
    );
  }

  // Add to sync queue
  await db.runAsync(
    `INSERT INTO sync_queue (table_name, record_id, action, payload)
     VALUES ('notes', ?, 'UPDATE', ?)`,
    [id, JSON.stringify({ id, content, updatedAt: now })]
  );
}

/** Delete a note */
export async function deleteNote(id: string): Promise<void> {
  const db = getDatabase();

  const noteRow = await db.getFirstAsync<{ rowid: number }>('SELECT rowid FROM notes WHERE id = ?', [id]);
  const rowid = noteRow?.rowid;

  await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);

  if (rowid !== undefined) {
    await db.runAsync(`DELETE FROM notes_fts WHERE rowid = ?`, [rowid]);
  }

  await db.runAsync(
    `INSERT INTO sync_queue (table_name, record_id, action, payload) VALUES ('notes', ?, 'DELETE', '{}')`,
    [id]
  );
}

/** Get a single note for a verse/chapter */
export async function getNoteForVerse(
  versionId: string,
  bookNumber: number,
  chapter: number,
  verseNumber: number | null
): Promise<Note | null> {
  const db = getDatabase();
  let row;
  if (verseNumber === null) {
    row = await db.getFirstAsync<any>(
      `SELECT * FROM notes WHERE version_id = ? AND book_number = ? AND chapter = ? AND verse_number IS NULL`,
      [versionId, bookNumber, chapter]
    );
  } else {
    row = await db.getFirstAsync<any>(
      `SELECT * FROM notes WHERE version_id = ? AND book_number = ? AND chapter = ? AND verse_number = ?`,
      [versionId, bookNumber, chapter, verseNumber]
    );
  }

  if (!row) return null;
  return {
    id: row.id,
    versionId: row.version_id,
    bookNumber: row.book_number,
    chapter: row.chapter,
    verseNumber: row.verse_number,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isSynced: row.is_synced === 1,
  };
}

/** Get all notes, newest first */
export async function getAllNotes(): Promise<(Note & { bookName: string })[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM notes ORDER BY created_at DESC');
  return rows.map(r => ({
    id: r.id,
    versionId: r.version_id,
    bookNumber: r.book_number,
    chapter: r.chapter,
    verseNumber: r.verse_number,
    content: r.content,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    isSynced: r.is_synced === 1,
    bookName: BOOK_NAMES[r.book_number] || '',
  }));
}

/** Search within notes content using FTS5 */
export async function searchNotes(query: string): Promise<(Note & { bookName: string })[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT n.* FROM notes_fts
     JOIN notes n ON n.rowid = notes_fts.rowid
     WHERE notes_fts MATCH ?
     ORDER BY n.updated_at DESC`,
    [query]
  );
  return rows.map(r => ({
    id: r.id,
    versionId: r.version_id,
    bookNumber: r.book_number,
    chapter: r.chapter,
    verseNumber: r.verse_number,
    content: r.content,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    isSynced: r.is_synced === 1,
    bookName: BOOK_NAMES[r.book_number] || '',
  }));
}

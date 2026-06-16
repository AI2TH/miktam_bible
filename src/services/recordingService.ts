import { getDatabase } from './database';
import type { Recording } from '../types/user';
import * as FileSystem from 'expo-file-system/legacy';
import { generateUUID } from '../utils/uuid';

/** Create a new recording record */
export async function addRecording(
  title: string,
  localFilePath: string,
  durationSecs: number,
  linkedBook: number | null = null,
  linkedChapter: number | null = null,
  linkedVerse: number | null = null
): Promise<Recording> {
  const db = getDatabase();
  const id = generateUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO recordings (id, title, local_file_path, duration_secs, transcription_status, linked_book, linked_chapter, linked_verse, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
    [id, title, localFilePath, durationSecs, linkedBook, linkedChapter, linkedVerse, now]
  );

  return {
    id,
    title,
    localFilePath,
    durationSecs,
    transcript: null,
    transcriptionStatus: 'pending',
    linkedBook,
    linkedChapter,
    linkedVerse,
    isSynced: false,
    createdAt: now,
  };
}

/** Update transcription transcript and status */
export async function updateRecordingTranscript(
  id: string,
  transcript: string,
  status: 'processing' | 'done' | 'failed'
): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'UPDATE recordings SET transcript = ?, transcription_status = ? WHERE id = ?',
    [transcript, status, id]
  );
}

/** Delete a recording record and the local file */
export async function deleteRecording(id: string): Promise<void> {
  const db = getDatabase();

  // Find local file path
  const record = await db.getFirstAsync<{ local_file_path: string }>(
    'SELECT local_file_path FROM recordings WHERE id = ?',
    [id]
  );

  if (record?.local_file_path) {
    try {
      await FileSystem.deleteAsync(record.local_file_path, { idempotent: true });
    } catch (e) {
      console.warn('[Recordings] Failed to delete local audio file:', record.local_file_path, e);
    }
  }

  await db.runAsync('DELETE FROM recordings WHERE id = ?', [id]);
}

/** Fetch all recordings sorted newest first */
export async function getAllRecordings(): Promise<Recording[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM recordings ORDER BY created_at DESC');
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    localFilePath: r.local_file_path,
    durationSecs: r.duration_secs,
    transcript: r.transcript,
    transcriptionStatus: r.transcription_status,
    linkedBook: r.linked_book,
    linkedChapter: r.linked_chapter,
    linkedVerse: r.linked_verse,
    isSynced: r.is_synced === 1,
    createdAt: r.created_at,
  }));
}

/** Fetch recordings linked to a particular chapter or verse */
export async function getRecordingsForVerse(
  bookNumber: number,
  chapter: number,
  verseNumber: number | null
): Promise<Recording[]> {
  const db = getDatabase();
  let query = 'SELECT * FROM recordings WHERE linked_book = ? AND linked_chapter = ?';
  const params: any[] = [bookNumber, chapter];

  if (verseNumber !== null) {
    query += ' AND linked_verse = ?';
    params.push(verseNumber);
  } else {
    query += ' AND linked_verse IS NULL';
  }

  query += ' ORDER BY created_at DESC';

  const rows = await db.getAllAsync<any>(query, params);
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    localFilePath: r.local_file_path,
    durationSecs: r.duration_secs,
    transcript: r.transcript,
    transcriptionStatus: r.transcription_status,
    linkedBook: r.linked_book,
    linkedChapter: r.linked_chapter,
    linkedVerse: r.linked_verse,
    isSynced: r.is_synced === 1,
    createdAt: r.created_at,
  }));
}

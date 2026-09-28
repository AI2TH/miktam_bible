import { getDatabase } from './database';
import type { Verse, Book, BibleVersion } from '../types/bible';

// ─── BIBLE VERSIONS ──────────────────────────────

/** Get all registered Bible versions (downloaded or not) */
export async function getAllVersions(): Promise<BibleVersion[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>('SELECT * FROM bible_versions ORDER BY name');
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    language: r.language,
    isDownloaded: r.is_downloaded === 1,
    downloadDate: r.download_date,
    totalSizeMb: r.total_size_mb,
  }));
}

/** Get only downloaded versions */
export async function getDownloadedVersions(): Promise<BibleVersion[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM bible_versions WHERE is_downloaded = 1 ORDER BY name'
  );
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    language: r.language,
    isDownloaded: true,
    downloadDate: r.download_date,
    totalSizeMb: r.total_size_mb,
  }));
}

export interface BibleLanguageRecord {
  code: string;
  name: string;
  localName: string;
  versionCount: number;
}

/** Get all registered languages ordered by name */
export async function getAllLanguages(): Promise<BibleLanguageRecord[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM bible_languages ORDER BY name'
  );
  return rows.map(r => ({
    code: r.code,
    name: r.name,
    localName: r.local_name,
    versionCount: r.version_count,
  }));
}

/** Get versions for a specific language or filter query */
export async function getVersionsByLanguage(langCode: string): Promise<BibleVersion[]> {
  const db = getDatabase();
  const query = langCode === 'all'
    ? 'SELECT * FROM bible_versions ORDER BY is_downloaded DESC, name ASC'
    : 'SELECT * FROM bible_versions WHERE language = ? ORDER BY is_downloaded DESC, name ASC';
  const params = langCode === 'all' ? [] : [langCode];
  const rows = await db.getAllAsync<any>(query, params);
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    language: r.language,
    isDownloaded: r.is_downloaded === 1,
    downloadDate: r.download_date,
    totalSizeMb: r.total_size_mb,
  }));
}

// ─── BOOKS ───────────────────────────────────────

/** Get all 66 books for a version, ordered by book_number */
export async function getBooks(versionId: string): Promise<Book[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM books WHERE version_id = ? ORDER BY book_number',
    [versionId]
  );
  return rows.map(r => ({
    id: r.id,
    versionId: r.version_id,
    bookNumber: r.book_number,
    name: r.name,
    abbreviation: r.abbreviation,
    testament: r.testament,
    totalChapters: r.total_chapters,
  }));
}

/** Get a single book by number */
export async function getBook(versionId: string, bookNumber: number): Promise<Book | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM books WHERE version_id = ? AND book_number = ?',
    [versionId, bookNumber]
  );
  if (!row) return null;
  return {
    id: row.id,
    versionId: row.version_id,
    bookNumber: row.book_number,
    name: row.name,
    abbreviation: row.abbreviation,
    testament: row.testament,
    totalChapters: row.total_chapters,
  };
}

// ─── VERSES ──────────────────────────────────────

export async function getChapterVerses(
  versionId: string,
  bookNumber: number,
  chapter: number
): Promise<Verse[]> {
  console.log(`[bibleService] getChapterVerses called for versionId="${versionId}", bookNumber=${bookNumber}, chapter=${chapter}`);
  const db = getDatabase();
  try {
    let rows = await db.getAllAsync<any>(
      `SELECT * FROM verses
       WHERE version_id = ? AND book_number = ? AND chapter = ?
       ORDER BY verse_number`,
      [versionId, bookNumber, chapter]
    );

    // If version text does not exist in local DB (e.g. study module 'con'), gracefully fallback to KJV
    if (rows.length === 0 && versionId !== 'kjv') {
      console.log(`[bibleService] No verses for ${versionId}, falling back to kjv`);
      rows = await db.getAllAsync<any>(
        `SELECT * FROM verses
         WHERE version_id = 'kjv' AND book_number = ? AND chapter = ?
         ORDER BY verse_number`,
        [bookNumber, chapter]
      );
    }

    console.log(`[bibleService] getChapterVerses fetched ${rows.length} verses`);
    return rows.map(r => ({
      id: r.id,
      versionId: r.version_id,
      bookNumber: r.book_number,
      chapter: r.chapter,
      verseNumber: r.verse_number,
      text: r.text,
    }));
  } catch (err) {
    console.error(`[bibleService] getChapterVerses failed:`, err);
    throw err;
  }
}

/** Get a single verse */
export async function getVerse(
  versionId: string,
  bookNumber: number,
  chapter: number,
  verseNumber: number
): Promise<Verse | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM verses
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
    text: row.text,
  };
}

/** Get total chapter count for a book */
export async function getChapterCount(versionId: string, bookNumber: number): Promise<number> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ cnt: number }>(
    'SELECT MAX(chapter) as cnt FROM verses WHERE version_id = ? AND book_number = ?',
    [versionId, bookNumber]
  );
  return row?.cnt ?? 0;
}

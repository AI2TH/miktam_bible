/**
 * BUILD-TIME SCRIPT — Run on developer machine, NOT on device.
 * Fetches Bible translations from Bolls.life API and outputs SQLite.
 *
 * Usage: npx ts-node scripts/import-bible.ts
 *
 * API Endpoints:
 *   GET https://bolls.life/get-books/{translation}/
 *     → [{ "bookNumber": 1, "name": "Genesis", "chapters": 50 }, ...]
 *
 *   GET https://bolls.life/get-text/{translation}/{book}/{chapter}/
 *     → [{ "verse": 1, "text": "In the beginning God created..." }, ...]
 *
 * Translations to fetch: KJV, WEB, ASV (public domain)
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const TRANSLATIONS = [
  { id: 'kjv', name: 'King James Version', apiCode: 'KJV' },
  { id: 'web', name: 'World English Bible', apiCode: 'WEB' },
  { id: 'asv', name: 'American Standard Version', apiCode: 'ASV' },
];

const API_BASE = 'https://bolls.life';
const OUTPUT_DIR = './output';
const DB_PATH = path.join(OUTPUT_DIR, 'bible.db');

async function fetchJSON(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function importTranslation(db: Database.Database, translation: typeof TRANSLATIONS[0]) {
  console.log(`\n📖 Fetching metadata for ${translation.name}...`);

  // Insert version record
  db.prepare('INSERT OR IGNORE INTO bible_versions (id, name, language, is_downloaded) VALUES (?, ?, ?, 1)')
    .run(translation.id, translation.name, 'en');

  // Fetch books
  let books;
  try {
    books = await fetchJSON(`${API_BASE}/get-books/${translation.apiCode}/`);
  } catch (e) {
    console.error(`Failed to fetch books list for ${translation.name}:`, e);
    return;
  }

  const insertBook = db.prepare(
    'INSERT OR IGNORE INTO books (version_id, book_number, name, abbreviation, testament, total_chapters) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertVerse = db.prepare(
    'INSERT OR IGNORE INTO verses (version_id, book_number, chapter, verse_number, text) VALUES (?, ?, ?, ?, ?)'
  );

  console.log(`Importing books and chapters...`);
  
  // For testing/quick seeding, limit to Genesis and John
  const filteredBooks = books.filter((book: any) => book.bookid === 1 || book.bookid === 43);
  
  for (const book of filteredBooks) {
    const testament = book.bookid <= 39 ? 'OT' : 'NT';
    const abbrev = book.name.substring(0, 3); // Simplified abbreviation
    
    // Limit chapters to 5 for speed
    const maxChapters = Math.min(book.chapters, 5);
    
    // Save book record
    insertBook.run(translation.id, book.bookid, book.name, abbrev, testament, maxChapters);
    console.log(`\n[${translation.id.toUpperCase()}] Importing ${book.name} (${maxChapters} chapters)`);

    // Fetch and save each chapter
    for (let ch = 1; ch <= maxChapters; ch++) {
      let success = false;
      let retries = 3;

      while (!success && retries > 0) {
        try {
          // Respectful API rate limiting
          await delay(250); 
          const verses = await fetchJSON(`${API_BASE}/get-text/${translation.apiCode}/${book.bookid}/${ch}/`);
          console.log(`Fetched ${verses.length} verses for ${translation.id} book ${book.bookid} ch ${ch}`);
          
          const insertMany = db.transaction((verseList: any[]) => {
            for (const v of verseList) {
              insertVerse.run(translation.id, book.bookid, ch, v.verse, v.text);
            }
          });

          insertMany(verses);
          success = true;
          process.stdout.write(`.`);
        } catch (err) {
          retries--;
          console.warn(`\n[Retry] Failed chapter ${ch} in ${book.name}. Retries left: ${retries}. Err:`, err);
          await delay(1000);
        }
      }

      if (!success) {
        console.error(`\n[FATAL] Failed to download ${book.name} chapter ${ch}`);
      }
    }
  }

  console.log(`\n✅ ${translation.name} import complete`);
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`Initializing SQLite database at ${DB_PATH}...`);
  const db = new Database(DB_PATH);

  // Initialize tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS bible_versions (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      language        TEXT NOT NULL DEFAULT 'en',
      is_downloaded   INTEGER DEFAULT 0,
      download_date   TEXT,
      total_size_mb   REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS books (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      version_id      TEXT NOT NULL REFERENCES bible_versions(id),
      book_number     INTEGER NOT NULL,
      name            TEXT NOT NULL,
      abbreviation    TEXT NOT NULL,
      testament       TEXT NOT NULL CHECK(testament IN ('OT','NT')),
      total_chapters  INTEGER NOT NULL,
      UNIQUE(version_id, book_number)
    );

    CREATE TABLE IF NOT EXISTS verses (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      version_id      TEXT NOT NULL,
      book_number     INTEGER NOT NULL,
      chapter         INTEGER NOT NULL,
      verse_number    INTEGER NOT NULL,
      text            TEXT NOT NULL,
      UNIQUE(version_id, book_number, chapter, verse_number)
    );
  `);

  for (const t of TRANSLATIONS) {
    try {
      await importTranslation(db, t);
    } catch (e) {
      console.error(`Failed to import translation ${t.name}:`, e);
    }
  }

  console.log('\n🎉 Bible imports finished successfully.');
  db.close();
}

if (require.main === module) {
  main().catch(console.error);
}

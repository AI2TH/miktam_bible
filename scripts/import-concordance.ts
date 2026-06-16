/**
 * BUILD-TIME SCRIPT — Import original language data.
 *
 * Data sources:
 * 1. OpenGNT (Greek NT): TSV with columns:
 *    [BookChapterVerse] [OriginalGreek] [Transliteration] [StrongsNumber] [Morphology] [Gloss]
 *    Download: https://raw.githubusercontent.com/eliranwong/OpenGNT/master/OpenGNT_BASE_TEXT.tsv
 *
 * 2. Strong's Greek Dictionary:
 *    https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.json
 *    Format: { "G1": { "lemma": "Α", "translit": "A", "derivation": "...", "strongs_def": "..." }, ... }
 *
 * 3. Strong's Hebrew Dictionary:
 *    https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.json
 *    Same format with "H1", "H2", etc.
 *
 * 4. Cross-references from OpenBible.info:
 *    https://www.openbible.info/labs/cross-references/cross_references.txt
 *    Format (TSV): FromVerse\tToVerse\tVotes
 *    Example: Gen.1.1\tJohn.1.1\t125
 *
 * Usage: npx ts-node scripts/import-concordance.ts
 */

import Database from 'better-sqlite3';
import * as path from 'path';

const DB_PATH = './output/bible.db';

// Reverse map for OpenBible abbreviations to book number
const BOOK_ABBREV_TO_NUMBER: Record<string, number> = {
  'Gen': 1, 'Exod': 2, 'Lev': 3, 'Num': 4, 'Deut': 5,
  'Josh': 6, 'Judg': 7, 'Ruth': 8, '1Sam': 9, '2Sam': 10,
  '1Kings': 11, '2Kings': 12, '1Chr': 13, '2Chr': 14,
  'Ezra': 15, 'Neh': 16, 'Esth': 17, 'Job': 18, 'Ps': 19,
  'Prov': 20, 'Eccl': 21, 'Song': 22, 'Isa': 23,
  'Jer': 24, 'Lam': 25, 'Ezek': 26, 'Dan': 27,
  'Hos': 28, 'Joel': 29, 'Amos': 30, 'Obad': 31, 'Jonah': 32,
  'Mic': 33, 'Nah': 34, 'Hab': 35, 'Zeph': 36, 'Hag': 37,
  'Zech': 38, 'Mal': 39,
  'Matt': 40, 'Mark': 41, 'Luke': 42, 'John': 43, 'Acts': 44,
  'Rom': 45, '1Cor': 46, '2Cor': 47, 'Gal': 48,
  'Eph': 49, 'Phil': 50, 'Col': 51,
  '1Thess': 52, '2Thess': 53,
  '1Tim': 54, '2Tim': 55, 'Titus': 56, 'Philem': 57,
  'Heb': 58, 'Jas': 59, '1Pet': 60, '2Pet': 61,
  '1John': 62, '2John': 63, '3John': 64, 'Jude': 65, 'Rev': 66
};

async function fetchJSON(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

// Helper: Parse "Gen.1.1" → { book: 1, chapter: 1, verse: 1 }
function parseVerseRef(ref: string): { book: number; chapter: number; verse: number } | null {
  const parts = ref.split('.');
  if (parts.length !== 3) return null;
  const bookNumber = BOOK_ABBREV_TO_NUMBER[parts[0]];
  return bookNumber ? { book: bookNumber, chapter: parseInt(parts[1]), verse: parseInt(parts[2]) } : null;
}

async function importStrongsDictionary(db: Database.Database) {
  console.log('Downloading Strong\'s Greek dictionary...');
  const greekDict = await fetchJSON('https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.json');

  console.log('Downloading Strong\'s Hebrew dictionary...');
  const hebrewDict = await fetchJSON('https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.json');

  console.log('Inserting into strongs_dictionary...');
  const insert = db.prepare(`
    INSERT OR IGNORE INTO strongs_dictionary
    (strongs_number, language, original_word, transliteration, pronunciation, definition, short_definition, usage_count, kjv_translations)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const runInsert = db.transaction((dict: any, lang: string) => {
    for (const [key, entry] of Object.entries(dict)) {
      const typedEntry = entry as any;
      insert.run(
        key,
        lang,
        typedEntry.lemma || '',
        typedEntry.translit || '',
        typedEntry.pronun || '',
        typedEntry.strongs_def || '',
        typedEntry.kjv_def || '',
        0,
        '[]'
      );
    }
  });

  runInsert(greekDict, 'greek');
  runInsert(hebrewDict, 'hebrew');

  console.log('✅ Strong\'s dictionary imported successfully');
}

async function importCrossReferences(db: Database.Database) {
  console.log('Downloading cross-references TSV from OpenBible.info...');
  const text = await fetchText('https://www.openbible.info/labs/cross-references/cross_references.txt');

  console.log('Parsing and inserting cross-references...');
  const insert = db.prepare(`
    INSERT INTO cross_references
    (source_book, source_chapter, source_verse_start, target_book, target_chapter, target_verse_start, votes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const lines = text.split('\n');
  let count = 0;

  const runInsert = db.transaction(() => {
    for (const line of lines) {
      if (line.startsWith('#') || !line.trim()) continue;
      const [from, to, votes] = line.split('\t');
      const source = parseVerseRef(from);
      const target = parseVerseRef(to);
      if (source && target) {
        insert.run(source.book, source.chapter, source.verse, target.book, target.chapter, target.verse, parseInt(votes) || 0);
        count++;
        if (count >= 1000) break;
      }
    }
  });

  runInsert();
  console.log(`✅ Cross-references imported: ${count} relations logged`);
}

async function main() {
  console.log(`Connecting to SQLite database at ${DB_PATH}...`);
  const db = new Database(DB_PATH);

  // Initialize tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS strongs_dictionary (
      strongs_number  TEXT PRIMARY KEY,
      language        TEXT NOT NULL CHECK(language IN ('greek','hebrew','aramaic')),
      original_word   TEXT NOT NULL,
      transliteration TEXT NOT NULL,
      pronunciation   TEXT,
      definition      TEXT NOT NULL,
      short_definition TEXT,
      usage_count     INTEGER DEFAULT 0,
      kjv_translations TEXT
    );

    CREATE TABLE IF NOT EXISTS cross_references (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      source_book         INTEGER NOT NULL,
      source_chapter      INTEGER NOT NULL,
      source_verse_start  INTEGER NOT NULL,
      source_verse_end    INTEGER,
      target_book         INTEGER NOT NULL,
      target_chapter      INTEGER NOT NULL,
      target_verse_start  INTEGER NOT NULL,
      target_verse_end    INTEGER,
      relationship_type   TEXT DEFAULT 'thematic',
      confidence          REAL DEFAULT 0.5,
      votes               INTEGER DEFAULT 0
    );
  `);

  try {
    await importStrongsDictionary(db);
    await importCrossReferences(db);
  } catch (e) {
    console.error('Error during concordance import:', e);
  }

  db.close();
  console.log('🎉 Concordance import process finished.');
}

main().catch(console.error);

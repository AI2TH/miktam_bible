/**
 * Multi-Language eBible Corpus to SQLite Converter
 * 
 * Converts raw parallel Bible text from eBible corpus (1,363 world translations)
 * into high-performance, standardized SQLite (.db) databases matching Miktam Bible schema.
 * 
 * Partitions into:
 * - bible_db_languages_a_f
 * - bible_db_languages_g_m
 * - bible_db_languages_n_s
 * - bible_db_languages_t_z
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const BOOK_MAP = {
  'GEN': { num: 1, name: 'Genesis', abbr: 'Gen', test: 'OT', chaps: 50 },
  'EXO': { num: 2, name: 'Exodus', abbr: 'Exod', test: 'OT', chaps: 40 },
  'LEV': { num: 3, name: 'Leviticus', abbr: 'Lev', test: 'OT', chaps: 27 },
  'NUM': { num: 4, name: 'Numbers', abbr: 'Num', test: 'OT', chaps: 36 },
  'DEU': { num: 5, name: 'Deuteronomy', abbr: 'Deut', test: 'OT', chaps: 34 },
  'JOS': { num: 6, name: 'Joshua', abbr: 'Josh', test: 'OT', chaps: 24 },
  'JDG': { num: 7, name: 'Judges', abbr: 'Judg', test: 'OT', chaps: 21 },
  'RUT': { num: 8, name: 'Ruth', abbr: 'Ruth', test: 'OT', chaps: 4 },
  '1SA': { num: 9, name: '1 Samuel', abbr: '1Sam', test: 'OT', chaps: 31 },
  '2SA': { num: 10, name: '2 Samuel', abbr: '2Sam', test: 'OT', chaps: 24 },
  '1KI': { num: 11, name: '1 Kings', abbr: '1Kgs', test: 'OT', chaps: 22 },
  '2KI': { num: 12, name: '2 Kings', abbr: '2Kgs', test: 'OT', chaps: 25 },
  '1CH': { num: 13, name: '1 Chronicles', abbr: '1Chr', test: 'OT', chaps: 29 },
  '2CH': { num: 14, name: '2 Chronicles', abbr: '2Chr', test: 'OT', chaps: 36 },
  'EZR': { num: 15, name: 'Ezra', abbr: 'Ezra', test: 'OT', chaps: 10 },
  'NEH': { num: 16, name: 'Nehemiah', abbr: 'Neh', test: 'OT', chaps: 13 },
  'EST': { num: 17, name: 'Esther', abbr: 'Esth', test: 'OT', chaps: 10 },
  'JOB': { num: 18, name: 'Job', abbr: 'Job', test: 'OT', chaps: 42 },
  'PSA': { num: 19, name: 'Psalms', abbr: 'Ps', test: 'OT', chaps: 150 },
  'PRO': { num: 20, name: 'Proverbs', abbr: 'Prov', test: 'OT', chaps: 31 },
  'ECC': { num: 21, name: 'Ecclesiastes', abbr: 'Eccl', test: 'OT', chaps: 12 },
  'SNG': { num: 22, name: 'Song of Solomon', abbr: 'Song', test: 'OT', chaps: 8 },
  'ISA': { num: 23, name: 'Isaiah', abbr: 'Isa', test: 'OT', chaps: 66 },
  'JER': { num: 24, name: 'Jeremiah', abbr: 'Jer', test: 'OT', chaps: 52 },
  'LAM': { num: 25, name: 'Lamentations', abbr: 'Lam', test: 'OT', chaps: 5 },
  'EZK': { num: 26, name: 'Ezekiel', abbr: 'Ezek', test: 'OT', chaps: 48 },
  'DAN': { num: 27, name: 'Daniel', abbr: 'Dan', test: 'OT', chaps: 12 },
  'HOS': { num: 28, name: 'Hosea', abbr: 'Hos', test: 'OT', chaps: 14 },
  'JOL': { num: 29, name: 'Joel', abbr: 'Joel', test: 'OT', chaps: 3 },
  'AMO': { num: 30, name: 'Amos', abbr: 'Amos', test: 'OT', chaps: 9 },
  'OBA': { num: 31, name: 'Obadiah', abbr: 'Obad', test: 'OT', chaps: 1 },
  'JON': { num: 32, name: 'Jonah', abbr: 'Jonah', test: 'OT', chaps: 4 },
  'MIC': { num: 33, name: 'Micah', abbr: 'Mic', test: 'OT', chaps: 7 },
  'NAM': { num: 34, name: 'Nahum', abbr: 'Nah', test: 'OT', chaps: 3 },
  'HAB': { num: 35, name: 'Habakkuk', abbr: 'Hab', test: 'OT', chaps: 3 },
  'ZEP': { num: 36, name: 'Zephaniah', abbr: 'Zeph', test: 'OT', chaps: 3 },
  'HAG': { num: 37, name: 'Haggai', abbr: 'Hag', test: 'OT', chaps: 2 },
  'ZEC': { num: 38, name: 'Zechariah', abbr: 'Zech', test: 'OT', chaps: 14 },
  'MAL': { num: 39, name: 'Malachi', abbr: 'Mal', test: 'OT', chaps: 4 },
  'MAT': { num: 40, name: 'Matthew', abbr: 'Matt', test: 'NT', chaps: 28 },
  'MRK': { num: 41, name: 'Mark', abbr: 'Mark', test: 'NT', chaps: 16 },
  'LUK': { num: 42, name: 'Luke', abbr: 'Luke', test: 'NT', chaps: 24 },
  'JHN': { num: 43, name: 'John', abbr: 'John', test: 'NT', chaps: 21 },
  'ACT': { num: 44, name: 'Acts', abbr: 'Acts', test: 'NT', chaps: 28 },
  'ROM': { num: 45, name: 'Romans', abbr: 'Rom', test: 'NT', chaps: 16 },
  '1CO': { num: 46, name: '1 Corinthians', abbr: '1Cor', test: 'NT', chaps: 16 },
  '2CO': { num: 47, name: '2 Corinthians', abbr: '2Cor', test: 'NT', chaps: 13 },
  'GAL': { num: 48, name: 'Galatians', abbr: 'Gal', test: 'NT', chaps: 6 },
  'EPH': { num: 49, name: 'Ephesians', abbr: 'Eph', test: 'NT', chaps: 6 },
  'PHP': { num: 50, name: 'Philippians', abbr: 'Phil', test: 'NT', chaps: 4 },
  'COL': { num: 51, name: 'Colossians', abbr: 'Col', test: 'NT', chaps: 4 },
  '1TH': { num: 52, name: '1 Thessalonians', abbr: '1Thess', test: 'NT', chaps: 5 },
  '2TH': { num: 53, name: '2 Thessalonians', abbr: '2Thess', test: 'NT', chaps: 3 },
  '1TI': { num: 54, name: '1 Timothy', abbr: '1Tim', test: 'NT', chaps: 6 },
  '2TI': { num: 55, name: '2 Timothy', abbr: '2Tim', test: 'NT', chaps: 4 },
  'TIT': { num: 56, name: 'Titus', abbr: 'Titus', test: 'NT', chaps: 3 },
  'PHM': { num: 57, name: 'Philemon', abbr: 'Phlm', test: 'NT', chaps: 1 },
  'HEB': { num: 58, name: 'Hebrews', abbr: 'Heb', test: 'NT', chaps: 13 },
  'JAS': { num: 59, name: 'James', abbr: 'Jas', test: 'NT', chaps: 5 },
  '1PE': { num: 60, name: '1 Peter', abbr: '1Pet', test: 'NT', chaps: 5 },
  '2PE': { num: 61, name: '2 Peter', abbr: '2Pet', test: 'NT', chaps: 3 },
  '1JN': { num: 62, name: '1 John', abbr: '1John', test: 'NT', chaps: 5 },
  '2JN': { num: 63, name: '2 John', abbr: '2John', test: 'NT', chaps: 1 },
  '3JN': { num: 64, name: '3 John', abbr: '3John', test: 'NT', chaps: 1 },
  'JUD': { num: 65, name: 'Jude', abbr: 'Jude', test: 'NT', chaps: 1 },
  'REV': { num: 66, name: 'Revelation', abbr: 'Rev', test: 'NT', chaps: 22 },
};

function parseVref(vrefPath) {
  const content = fs.readFileSync(vrefPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const parsed = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(' ');
    const bookAbbr = parts[0];
    const [chapStr, verseStr] = (parts[1] || '1:1').split(':');
    const bookInfo = BOOK_MAP[bookAbbr];
    if (bookInfo) {
      parsed.push({
        bookNumber: bookInfo.num,
        chapter: parseInt(chapStr, 10) || 1,
        verseNumber: parseInt(verseStr, 10) || 1,
      });
    } else {
      parsed.push(null);
    }
  }
  return parsed;
}

function buildDatabaseForTranslation(corpusFilePath, parsedVrefs, outputPath, metadata = {}) {
  const textContent = fs.readFileSync(corpusFilePath, 'utf8');
  const lines = textContent.split(/\r?\n/);

  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  const db = new Database(outputPath);
  db.pragma('journal_mode = OFF');
  db.pragma('synchronous = 0');

  db.exec(`
    CREATE TABLE books (
      book_number INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      abbreviation TEXT NOT NULL,
      testament TEXT NOT NULL CHECK(testament IN ('OT', 'NT')),
      total_chapters INTEGER NOT NULL
    );

    CREATE TABLE verses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_number INTEGER NOT NULL,
      chapter INTEGER NOT NULL,
      verse_number INTEGER NOT NULL,
      text TEXT NOT NULL,
      UNIQUE(book_number, chapter, verse_number)
    );

    CREATE TABLE metadata (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  const insertVerse = db.prepare(`
    INSERT OR IGNORE INTO verses (book_number, chapter, verse_number, text)
    VALUES (?, ?, ?, ?)
  `);

  const activeBooks = new Set();

  const insertManyVerses = db.transaction(() => {
    const len = Math.min(lines.length, parsedVrefs.length);
    for (let i = 0; i < len; i++) {
      const vref = parsedVrefs[i];
      if (!vref) continue;
      const text = lines[i]?.trim();
      if (text) {
        insertVerse.run(vref.bookNumber, vref.chapter, vref.verseNumber, text);
        activeBooks.add(vref.bookNumber);
      }
    }
  });

  insertManyVerses();

  // Insert active books
  const insertBook = db.prepare(`
    INSERT INTO books (book_number, name, abbreviation, testament, total_chapters)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertManyBooks = db.transaction(() => {
    for (const b of Object.values(BOOK_MAP)) {
      if (activeBooks.has(b.num)) {
        insertBook.run(b.num, b.name, b.abbr, b.test, b.chaps);
      }
    }
  });

  insertManyBooks();

  // Insert metadata
  const insertMeta = db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(metadata)) {
    insertMeta.run(k, String(v));
  }

  db.close();
  return activeBooks.size;
}

module.exports = {
  BOOK_MAP,
  parseVref,
  buildDatabaseForTranslation,
};

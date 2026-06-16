const Database = require('better-sqlite3');
const path = require('path');

const bookNames = {
  1: 'Genesis', 2: 'Exodus', 3: 'Leviticus', 4: 'Numbers', 5: 'Deuteronomy',
  6: 'Joshua', 7: 'Judges', 8: 'Ruth', 9: '1 Samuel', 10: '2 Samuel',
  11: '1 Kings', 12: '2 Kings', 13: '1 Chronicles', 14: '2 Chronicles',
  15: 'Ezra', 16: 'Nehemiah', 17: 'Esther', 18: 'Job', 19: 'Psalms',
  20: 'Proverbs', 21: 'Ecclesiastes', 22: 'Song of Solomon', 23: 'Isaiah',
  24: 'Jeremiah', 25: 'Lamentations', 26: 'Ezekiel', 27: 'Daniel',
  28: 'Hosea', 29: 'Joel', 30: 'Amos', 31: 'Obadiah', 32: 'Jonah',
  33: 'Micah', 34: 'Nahum', 35: 'Habakkuk', 36: 'Zephaniah', 37: 'Haggai',
  38: 'Zechariah', 39: 'Malachi',
  40: 'Matthew', 41: 'Mark', 42: 'Luke', 43: 'John', 44: 'Acts',
  45: 'Romans', 46: '1 Corinthians', 47: '2 Corinthians', 48: 'Galatians',
  49: 'Ephesians', 50: 'Philippians', 51: 'Colossians',
  52: '1 Thessalonians', 53: '2 Thessalonians',
  54: '1 Timothy', 55: '2 Timothy', 56: 'Titus', 57: 'Philemon',
  58: 'Hebrews', 59: 'James', 60: '1 Peter', 61: '2 Peter',
  62: '1 John', 63: '2 John', 64: '3 John', 65: 'Jude', 66: 'Revelation',
};

const bookAbbrevs = {
  1: 'Gen', 2: 'Exo', 3: 'Lev', 4: 'Num', 5: 'Deu',
  6: 'Jos', 7: 'Jdg', 8: 'Rut', 9: '1Sa', 10: '2Sa',
  11: '1Ki', 12: '2Ki', 13: '1Ch', 14: '2Ch',
  15: 'Ezr', 16: 'Neh', 17: 'Est', 18: 'Job', 19: 'Psa',
  20: 'Pro', 21: 'Ecc', 22: 'Sng', 23: 'Isa',
  24: 'Jer', 25: 'Lam', 26: 'Eze', 27: 'Dan',
  28: 'Hos', 29: 'Joe', 30: 'Amo', 31: 'Oba', 32: 'Jon',
  33: 'Mic', 34: 'Nah', 35: 'Hab', 36: 'Zep', 37: 'Hag',
  38: 'Zec', 39: 'Mal',
  40: 'Mat', 41: 'Mrk', 42: 'Luk', 43: 'Jhn', 44: 'Act',
  45: 'Rom', 46: '1Co', 47: '2Co', 48: 'Gal',
  49: 'Eph', 50: 'Php', 51: 'Col',
  52: '1Th', 53: '2Th',
  54: '1Ti', 55: '2Ti', 56: 'Tit', 57: 'Phm',
  58: 'Heb', 59: 'Jas', 60: '1Pe', 61: '2Pe',
  62: '1Jn', 63: '2Jn', 64: '3Jn', 65: 'Jud', 66: 'Rev',
};

const abbrevMap = {
  'GEN': 1, 'EXO': 2, 'LEV': 3, 'NUM': 4, 'DEU': 5,
  'JOS': 6, 'JDG': 7, 'RUT': 8, '1SA': 9, '2SA': 10,
  '1KI': 11, '2KI': 12, '1CH': 13, '2CH': 14,
  'EZR': 15, 'NEH': 16, 'EST': 17, 'JOB': 18, 'PSA': 19,
  'PRO': 20, 'ECC': 21, 'SNG': 22, 'SON': 22, 'ISA': 23,
  'JER': 24, 'LAM': 25, 'EZE': 26, 'DAN': 27,
  'HOS': 28, 'JOE': 29, 'AMO': 30, 'OBA': 31, 'JON': 32,
  'MIC': 33, 'NAH': 34, 'HAB': 35, 'ZEP': 36, 'HAG': 37,
  'ZEC': 38, 'MAL': 39,
  'MAT': 40, 'MAR': 41, 'LUK': 42, 'JOH': 43, 'ACT': 44,
  'ROM': 45, '1CO': 46, '2CO': 47, 'GAL': 48,
  'EPH': 49, 'PHI': 50, 'COL': 51,
  '1TH': 52, '2TH': 53,
  '1TI': 54, '2TI': 55, 'TIT': 56, 'PHM': 57,
  'HEB': 58, 'JAM': 59, '1PE': 60, '2PE': 61,
  '1JO': 62, '2JO': 63, '3JO': 64, 'JUD': 65, 'REV': 66
};

function repairDatabase(dbPath) {
  console.log(`\nStarting database repair on: ${dbPath}`);
  const db = new Database(dbPath);

  try {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = OFF');

    // 1. Convert book abbreviations to integers in the verses table
    console.log("Converting text book abbreviations to integers in the verses table...");
    db.transaction(() => {
      const updateStmt = db.prepare('UPDATE verses SET book_number = ? WHERE book_number = ?');
      for (const [abbr, num] of Object.entries(abbrevMap)) {
        const res = updateStmt.run(num, abbr);
        if (res.changes > 0) {
          console.log(`  Mapped '${abbr}' to integer ${num} for ${res.changes} verses.`);
        }
      }
    })();

    // 2. Clear out books table and rebuild it from verses table
    console.log("Rebuilding books table dynamically from verses table contents...");
    db.transaction(() => {
      db.prepare('DELETE FROM books').run();
      
      const insertBookStmt = db.prepare(`
        INSERT INTO books (version_id, book_number, name, abbreviation, testament, total_chapters)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const versions = db.prepare('SELECT id FROM bible_versions').all();
      for (const version of versions) {
        // Find all books that have verses for this version
        const booksInVersion = db.prepare(`
          SELECT DISTINCT book_number 
          FROM verses 
          WHERE version_id = ? 
          ORDER BY CAST(book_number AS INTEGER)
        `).all(version.id);

        if (booksInVersion.length === 0) continue;

        console.log(`  Version ${version.id}: populating ${booksInVersion.length} books...`);

        for (const row of booksInVersion) {
          const bookNum = parseInt(row.book_number);
          if (isNaN(bookNum)) {
            console.warn(`    Warning: non-integer book_number found: ${row.book_number} in version ${version.id}`);
            continue;
          }

          const name = bookNames[bookNum] || `Book ${bookNum}`;
          const abbrev = bookAbbrevs[bookNum] || `Bk${bookNum}`;
          const testament = bookNum <= 39 ? 'OT' : 'NT';

          // Get max chapter for total_chapters
          const maxChapterRow = db.prepare(`
            SELECT MAX(chapter) as max_chapter 
            FROM verses 
            WHERE version_id = ? AND book_number = ?
          `).get(version.id, bookNum);

          const totalChapters = maxChapterRow ? maxChapterRow.max_chapter : 1;

          insertBookStmt.run(version.id, bookNum, name, abbrev, testament, totalChapters);
        }
      }
    })();

    console.log("Database repair completed successfully for:", dbPath);

  } catch (e) {
    console.error("Error repairing database:", e);
  } finally {
    db.close();
  }
}

// Support running on standard paths
const targetDbs = [
  path.join(__dirname, 'assets/bible.db'),
  path.join(__dirname, 'pulled_bible.db'),
  path.join(__dirname, 'concordance.db') // Update concordance.db too if it exists and has verses table
];

targetDbs.forEach(filePath => {
  try {
    if (require('fs').existsSync(filePath)) {
      repairDatabase(filePath);
    }
  } catch (e) {
    console.error(`Could not repair ${filePath}:`, e.message);
  }
});

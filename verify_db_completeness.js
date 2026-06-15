const Database = require('better-sqlite3');
const fs = require('fs');

const DB_PATH = './pulled_bible.db';

if (!fs.existsSync(DB_PATH)) {
  console.error(`Database not found at: ${DB_PATH}`);
  process.exit(1);
}

const db = new Database(DB_PATH);

console.log('=== Starting Database Completeness Integrity Audit ===');

try {
  // Get all versions
  const versions = db.prepare('SELECT id, name, language FROM bible_versions').all();
  console.log(`Auditing ${versions.length} registered Bible translations...`);

  let totalChaptersChecked = 0;
  let missingVersesErrors = [];

  for (const ver of versions) {
    console.log(`\nAnalyzing translation: ${ver.name} (${ver.id.toUpperCase()}) [Language: ${ver.language}]`);
    
    // Check total verses
    const verseCountRow = db.prepare('SELECT COUNT(*) as count FROM verses WHERE version_id = ?').get(ver.id);
    const verseCount = verseCountRow ? verseCountRow.count : 0;
    console.log(`  Total Verses: ${verseCount}`);

    if (verseCount === 0) {
      console.log(`  ⚠️ Warning: No verses found for version ${ver.id}`);
      continue;
    }

    // Check books and chapter counts
    const books = db.prepare('SELECT book_number, name, total_chapters FROM books WHERE version_id = ? ORDER BY book_number').all(ver.id);
    
    for (const bk of books) {
      // For each chapter in this book, verify verse count > 0
      for (let ch = 1; ch <= bk.total_chapters; ch++) {
        totalChaptersChecked++;
        const cntRow = db.prepare('SELECT COUNT(*) as count FROM verses WHERE version_id = ? AND book_number = ? AND chapter = ?').get(ver.id, bk.book_number, ch);
        const cnt = cntRow ? cntRow.count : 0;
        
        if (cnt === 0) {
          missingVersesErrors.push({
            version: ver.id,
            book: bk.name,
            book_number: bk.book_number,
            chapter: ch
          });
        }
      }
    }
  }

  console.log('\n=== Integrity Check Summary ===');
  console.log(`Total Chapters Inspected: ${totalChaptersChecked}`);
  if (missingVersesErrors.length === 0) {
    console.log('✅ DATABASE INTEGRITY CONFIRMED: 0 missing or empty chapters found across all translations!');
  } else {
    console.error(`❌ DATABASE INTEGRITY FAILURE: Found ${missingVersesErrors.length} empty chapters!`);
    console.error(JSON.stringify(missingVersesErrors.slice(0, 10), null, 2));
  }
} catch (err) {
  console.error('Audit Error:', err);
} finally {
  db.close();
}

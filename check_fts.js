const Database = require('better-sqlite3');
// Let's open pulled_bible.db or check concordance.db
const db = new Database('./pulled_bible.db');

try {
  const rows = db.prepare(`
    SELECT v.book_number, v.chapter, v.verse_number, v.text,
           snippet(verses_fts, 0, '<b>', '</b>', '...', 30) as snippet
    FROM verses_fts
    JOIN verses v ON v.id = verses_fts.rowid
    WHERE verses_fts MATCH 'grace' AND v.version_id = 'asv_strongs'
    LIMIT 10
  `).all();
  console.log("FTS Results:");
  console.log(rows);
} catch (e) {
  console.error(e);
} finally {
  db.close();
}

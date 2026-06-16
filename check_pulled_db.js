const Database = require('better-sqlite3');
const db = new Database('./pulled_bible.db');
try {
  const count = db.prepare("SELECT COUNT(*) as cnt FROM verses").get();
  console.log("Total verses:", count.cnt);
  const books = db.prepare("SELECT book_number, COUNT(*) as cnt FROM verses GROUP BY book_number").all();
  console.log("Books in DB:", books);
  const sample = db.prepare("SELECT book_number, chapter, verse_number, text FROM verses LIMIT 5").all();
  console.log("Sample verses:", sample);
} catch (e) {
  console.error("Error:", e);
} finally {
  db.close();
}

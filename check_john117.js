const Database = require('better-sqlite3');
const db = new Database('./pulled_bible.db');

try {
  // John is book 43, chapter 1, verse 17
  const verse = db.prepare("SELECT text FROM verses WHERE book_number = 43 AND chapter = 1 AND verse_number = 17").all();
  console.log("John 1:17 in database:");
  console.log(verse);
} catch (e) {
  console.error(e);
} finally {
  db.close();
}

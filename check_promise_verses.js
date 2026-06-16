const Database = require('better-sqlite3');
const db = new Database('./pulled_bible.db');

try {
  console.log("=== Verse Calendar (Promises) ===");
  const promises = db.prepare("SELECT * FROM verse_calendar").all();
  console.log(promises);
} catch (e) {
  console.error("Error querying verse_calendar:", e);
} finally {
  db.close();
}

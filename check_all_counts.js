const Database = require('better-sqlite3');
const db = new Database('./pulled_bible.db');
try {
  const versions = db.prepare("SELECT version_id, count(*) as count FROM verses GROUP BY version_id").all();
  console.log("Verse counts per version in pulled_bible.db:", versions);
} catch (e) {
  console.error("Error:", e);
} finally {
  db.close();
}

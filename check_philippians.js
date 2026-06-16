const Database = require('better-sqlite3');
const db = new Database('./pulled_bible.db');

try {
  const stats = db.prepare("SELECT version_id, count(*) as count FROM verses GROUP BY version_id").all();
  console.log("Verses stats:", stats);

  const bookStats = db.prepare("SELECT version_id, count(*) as count FROM books GROUP BY version_id").all();
  console.log("Books stats:", bookStats);

  const allVersions = db.prepare("SELECT * FROM bible_versions").all();
  console.log("All registered versions:", allVersions);
} catch (e) {
  console.error("Error:", e);
} finally {
  db.close();
}


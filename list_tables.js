const Database = require('better-sqlite3');
const db = new Database('./pulled_bible.db');

try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("Tables in DB:", tables.map(t => t.name));
} catch (e) {
  console.error("Error:", e);
} finally {
  db.close();
}

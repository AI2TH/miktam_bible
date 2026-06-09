const Database = require('better-sqlite3');
const db = new Database('./pulled_bible.db');
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("Tables in pulled db:", tables.map(t => t.name).join(', '));
  for (const table of tables) {
    const countRow = db.prepare(`SELECT COUNT(*) as count FROM "${table.name}"`).get();
    console.log(`- ${table.name}: ${countRow.count} rows`);
  }
} catch (e) {
  console.error("Error:", e);
} finally {
  db.close();
}

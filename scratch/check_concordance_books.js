const Database = require('better-sqlite3');
const db = new Database('./concordance.db');

try {
  console.log("=== Tables in concordance.db ===");
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log(tables);

  for (const table of tables) {
    console.log(`\n=== Columns in table "${table.name}" ===`);
    const info = db.prepare(`PRAGMA table_info("${table.name}")`).all();
    console.log(info.map(c => ({ name: c.name, type: c.type })));
  }

} catch (e) {
  console.error("Error:", e);
} finally {
  db.close();
}

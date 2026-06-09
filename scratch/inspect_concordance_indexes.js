const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'concordance_temp.db');
const db = new Database(dbPath);

try {
  const indexes = db.prepare("SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index'").all();
  console.log("Indexes in downloaded database:");
  for (const idx of indexes) {
    console.log(`- Index: ${idx.name} on table ${idx.tbl_name}`);
    console.log(`  SQL: ${idx.sql}`);
  }
} catch (e) {
  console.error("Error:", e);
} finally {
  db.close();
}

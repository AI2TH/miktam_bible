const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'concordance_temp.db');
const db = new Database(dbPath);

try {
  const tables = db.prepare("SELECT name, type, sql FROM sqlite_master").all();
  console.log("sqlite_master entries in concordance_temp.db:");
  for (const t of tables) {
    console.log(`- Name: ${t.name}, Type: ${t.type}`);
    console.log(`  SQL: ${t.sql}`);
  }
} catch (e) {
  console.error("Error:", e);
} finally {
  db.close();
}

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'concordance_temp.db');
console.log(`Inspecting ${dbPath}...`);
const db = new Database(dbPath);

try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("Tables in downloaded database:", tables.map(t => t.name).join(', '));
  for (const table of tables) {
    try {
      const countRow = db.prepare(`SELECT COUNT(*) as count FROM "${table.name}"`).get();
      console.log(`- ${table.name}: ${countRow.count} rows`);
    } catch (e) {
      console.log(`- ${table.name}: error reading row count (${e.message})`);
    }
  }
  
  // Let's print a sample row from each major table
  for (const table of tables) {
    if (table.name.startsWith('sqlite_') || table.name.includes('_fts')) continue;
    try {
      const sample = db.prepare(`SELECT * FROM "${table.name}" LIMIT 1`).get();
      console.log(`Sample from ${table.name}:`, sample);
    } catch (e) {
      console.log(`Error reading sample from ${table.name}: ${e.message}`);
    }
  }
} catch (e) {
  console.error("Error inspecting DB:", e);
} finally {
  db.close();
}

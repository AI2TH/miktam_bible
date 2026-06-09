const Database = require('better-sqlite3');
const path = require('path');

function checkDb(dbPath) {
  console.log(`Checking database: ${dbPath}`);
  try {
    const db = new Database(dbPath);
    
    // List tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log("Tables:", tables.map(t => t.name).join(', '));
    
    for (const table of tables) {
      const countRow = db.prepare(`SELECT COUNT(*) as count FROM "${table.name}"`).get();
      console.log(`- Table ${table.name}: ${countRow.count} rows`);
      
      if (table.name === 'verses') {
        const sample = db.prepare("SELECT * FROM verses LIMIT 3").all();
        console.log("Sample verses:", JSON.stringify(sample, null, 2));
      }
    }
    db.close();
  } catch (e) {
    console.error("Error:", e);
  }
}

console.log("Checking pulled db:");
checkDb('./pulled_bible.db');

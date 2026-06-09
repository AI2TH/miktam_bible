const Database = require('better-sqlite3');
const dbPath = 'C:\\Users\\kevin\\.gemini\\antigravity-cli\\brain\\5e33d1aa-4b5b-4fb6-a44b-cbc49328a724\\bible_emulator.db';

try {
  const db = new Database(dbPath);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("Tables in emulator db:", tables.map(t => t.name).join(', '));
  for (const table of tables) {
    const countRow = db.prepare(`SELECT COUNT(*) as count FROM "${table.name}"`).get();
    console.log(`- ${table.name}: ${countRow.count} rows`);
  }
  
  // Let's also check if original_words table has data for Genesis 1:1
  const owRows = db.prepare("SELECT COUNT(*) as count FROM original_words").get();
  console.log("original_words row count:", owRows.count);
  
  db.close();
} catch (e) {
  console.error("Error checking emulator db:", e);
}

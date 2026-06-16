const Database = require('better-sqlite3');

function check(dbPath) {
  console.log(`Checking ${dbPath}:`);
  try {
    const db = new Database(dbPath);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log("Tables:", tables.map(t => t.name).join(', '));
    db.close();
  } catch (e) {
    console.error("Error:", e);
  }
}

check('./concordance.db');
check('./assets/bible.db');
check('./output/bible.db');

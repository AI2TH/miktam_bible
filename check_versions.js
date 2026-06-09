const Database = require('better-sqlite3');
const db = new Database('assets/bible.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables in assets/bible.db:', tables);

try {
  const db2 = new Database('output/bible.db');
  console.log('Tables in output/bible.db:', db2.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());
  console.log('Versions in output/bible.db:', db2.prepare("SELECT * FROM bible_versions").all());
} catch (e) {
  console.log('Error output/bible.db:', e.message);
}

try {
  const db3 = new Database('pulled_bible.db');
  console.log('Tables in pulled_bible.db:', db3.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());
  console.log('Versions in pulled_bible.db:', db3.prepare("SELECT * FROM bible_versions").all());
} catch (e) {
  console.log('Error pulled_bible.db:', e.message);
}

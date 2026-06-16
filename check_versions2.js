const Database = require('better-sqlite3');
const db = new Database('concordance.db');
const cols = db.prepare("PRAGMA table_info(verses)").all();
console.log('Columns in verses:', cols.map(c => c.name));

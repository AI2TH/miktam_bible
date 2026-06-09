const fs = require('fs');
const Database = require('better-sqlite3');

const schemaContent = fs.readFileSync('./src/database/schema.ts', 'utf8');
const queries = [];
const regex = /`([\s\S]*?)`/g;
let match;
while ((match = regex.exec(schemaContent)) !== null) {
  const q = match[1].trim();
  if (
    q.startsWith('CREATE TABLE') ||
    q.startsWith('CREATE INDEX') ||
    q.startsWith('CREATE TRIGGER') ||
    q.startsWith('INSERT OR IGNORE') ||
    q.startsWith('INSERT INTO') ||
    q.startsWith('CREATE VIRTUAL TABLE')
  ) {
    queries.push(q);
  }
}

console.log(`Extracted ${queries.length} SQL queries from schema.ts.`);
console.log("Running them on temp.db...");

try {
  if (fs.existsSync('temp.db')) {
    fs.unlinkSync('temp.db');
  }
  const db = new Database('temp.db');
  for (const q of queries) {
    try {
      db.exec(q);
      console.log(`SUCCESS: ${q.substring(0, 50).replace(/\n/g, ' ')}...`);
    } catch (e) {
      console.error(`FAILED: ${q}`);
      console.error(`ERROR:`, e.message);
    }
  }
  db.close();
  console.log("Completed running extracted schema queries.");
} catch (err) {
  console.error("Database error:", err);
}

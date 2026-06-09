const Database = require('better-sqlite3');
const path = require('path');

const db = new Database('./output/bible.db');
const tempDbPath = path.join(__dirname, 'concordance_temp.db').replace(/\\/g, '/');

console.log(`Temp DB absolute path: ${tempDbPath}`);

try {
  db.exec(`ATTACH '${tempDbPath}' AS temp_db`);
  console.log("ATTACH successful!");

  // List tables in temp_db
  console.log("Tables visible in temp_db:");
  const tables = db.prepare("SELECT name FROM temp_db.sqlite_master WHERE type='table'").all();
  console.log(tables);

  // Try querying verses
  try {
    const rowCount = db.prepare("SELECT COUNT(*) as count FROM temp_db.verses").get();
    console.log(`temp_db.verses count: ${rowCount.count}`);
  } catch (e) {
    console.error(`Query temp_db.verses failed:`, e.message);
  }

  // Try querying concordance_index
  try {
    const rowCount = db.prepare("SELECT COUNT(*) as count FROM temp_db.concordance_index").get();
    console.log(`temp_db.concordance_index count: ${rowCount.count}`);
  } catch (e) {
    console.error(`Query temp_db.concordance_index failed:`, e.message);
  }

} catch (e) {
  console.error("General error:", e.message);
} finally {
  try {
    db.exec("DETACH temp_db");
  } catch (e) {}
  db.close();
}

import Database from 'better-sqlite3';
import { CREATE_TABLES_SQL } from './src/database/schema';

console.log("Running schema test on temp.db...");
try {
  const db = new Database('temp.db');
  for (const sql of CREATE_TABLES_SQL) {
    try {
      db.exec(sql);
      console.log("SUCCESS:", sql.substring(0, 50).replace(/\n/g, ' ') + "...");
    } catch (e) {
      console.error("FAILED STATEMENT:", sql);
      console.error("ERROR:", e);
    }
  }
  db.close();
  console.log("Schema test complete.");
} catch (err) {
  console.error("Main error:", err);
}

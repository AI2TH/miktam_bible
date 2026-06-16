const Database = require('better-sqlite3');
const db = new Database('./pulled_bible.db');
try {
  const count = db.prepare("SELECT count(*) as count FROM verses WHERE version_id = 'kjv'").get();
  console.log("KJV verses count:", count);
  const sample = db.prepare("SELECT * FROM verses WHERE version_id = 'kjv' LIMIT 3").all();
  console.log("KJV sample:", sample);
} catch (e) {
  console.error("Error:", e);
} finally {
  db.close();
}

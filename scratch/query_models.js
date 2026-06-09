const Database = require('better-sqlite3');
const db = new Database('./pulled_bible.db');
try {
  const models = db.prepare("SELECT id, name, is_downloaded FROM ai_models").all();
  console.log("AI Models in DB:", models);
} catch (e) {
  console.error("Error:", e);
} finally {
  db.close();
}

const Database = require('better-sqlite3');
const dbPath = 'C:\\Users\\kevin\\.gemini\\antigravity-cli\\brain\\5e33d1aa-4b5b-4fb6-a44b-cbc49328a724\\bible_emulator.db';
const db = new Database(dbPath);

try {
  const result = db.prepare(`
    UPDATE ai_models
    SET download_url = 'https://raw.githubusercontent.com/mormon-documentation-project/strongs/master/strongs.json'
    WHERE id = 'bibleslm-0.5b-q4'
  `).run();
  console.log("Updated model url. Rows changed:", result.changes);
  
  const models = db.prepare("SELECT id, download_url FROM ai_models").all();
  console.log("Current models in DB:", models);
} catch (e) {
  console.error("Error updating model urls:", e);
} finally {
  db.close();
}

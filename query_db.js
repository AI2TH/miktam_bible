const Database = require('better-sqlite3');
const db = new Database('./pulled_bible.db');

try {
  console.log("=== AI Models ===");
  const models = db.prepare("SELECT id, model_type, display_name, is_downloaded, file_path FROM ai_models").all();
  console.log(models);

  console.log("\n=== Recordings ===");
  const recordings = db.prepare("SELECT id, title, duration_secs, transcript, transcription_status FROM recordings").all();
  console.log(recordings);

  console.log("\n=== Profile ===");
  const profiles = db.prepare("SELECT * FROM profile").all();
  console.log(profiles);

  console.log("\n=== Recent Reading Progress ===");
  const progress = db.prepare("SELECT * FROM reading_progress ORDER BY read_date DESC LIMIT 5").all();
  console.log(progress);

} catch (e) {
  console.error("Error running query:", e);
} finally {
  db.close();
}

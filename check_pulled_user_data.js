const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'pulled_bible.db');
console.log("Checking database:", dbPath);

try {
  const db = new Database(dbPath);
  
  // List all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("\n--- Tables in pulled_bible.db ---");
  console.log(tables.map(t => t.name).join(', '));
  
  // Profile
  if (tables.some(t => t.name === 'profile')) {
    console.log("\n--- Profile ---");
    const profile = db.prepare("SELECT * FROM profile").all();
    console.log(profile);
  }
  
  // Bookmarks (Highlights)
  if (tables.some(t => t.name === 'bookmarks')) {
    console.log("\n--- Bookmarks (Highlights) ---");
    const bookmarks = db.prepare("SELECT * FROM bookmarks").all();
    console.log(`Total bookmarks: ${bookmarks.length}`);
    console.log(bookmarks.slice(0, 10));
  }
  
  // Notes
  if (tables.some(t => t.name === 'notes')) {
    console.log("\n--- Notes ---");
    const notes = db.prepare("SELECT * FROM notes").all();
    console.log(`Total notes: ${notes.length}`);
    console.log(notes);
  }
  
  // Verse Calendar
  if (tables.some(t => t.name === 'verse_calendar')) {
    console.log("\n--- Verse Calendar (Promise Verses) ---");
    const calendar = db.prepare("SELECT * FROM verse_calendar").all();
    console.log(`Total promise verses: ${calendar.length}`);
    console.log(calendar);
  }
  
  // AI Models
  if (tables.some(t => t.name === 'ai_models')) {
    console.log("\n--- AI Models ---");
    const models = db.prepare("SELECT id, model_type, display_name, is_downloaded, file_path FROM ai_models").all();
    console.log(models);
  }
  
  // Recordings
  if (tables.some(t => t.name === 'recordings')) {
    console.log("\n--- Recordings ---");
    const recordings = db.prepare("SELECT * FROM recordings").all();
    console.log(`Total recordings: ${recordings.length}`);
    console.log(recordings);
  }

  // Reading Progress
  if (tables.some(t => t.name === 'reading_progress')) {
    console.log("\n--- Reading Progress ---");
    const progress = db.prepare("SELECT * FROM reading_progress").all();
    console.log(`Total progress records: ${progress.length}`);
    console.log(progress);
  }

  db.close();
} catch (e) {
  console.error("Error opening or querying pulled_bible.db:", e);
}

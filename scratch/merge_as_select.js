const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const tempDbPath = path.join(__dirname, 'concordance_temp.db');
const targetDbs = [
  './output/bible.db',
  './pulled_bible.db',
  'C:\\Users\\kevin\\.gemini\\antigravity-cli\\brain\\5e33d1aa-4b5b-4fb6-a44b-cbc49328a724\\bible_emulator.db'
];

async function mergeDatabases() {
  if (!fs.existsSync(tempDbPath)) {
    throw new Error(`Source temp db not found: ${tempDbPath}`);
  }

  const sqliteTempDbPath = tempDbPath.replace(/\\/g, '/');
  console.log(`Using normalized temp DB path: ${sqliteTempDbPath}`);

  for (const dbPath of targetDbs) {
    if (!fs.existsSync(dbPath)) {
      console.log(`Skipping non-existent DB: ${dbPath}`);
      continue;
    }

    console.log(`------------------------------------------------`);
    console.log(`Merging concordance data into: ${dbPath}...`);
    const db = new Database(dbPath);
    db.exec("PRAGMA busy_timeout = 30000;");

    try {
      // 1. Drop existing tables BEFORE attaching temp_db to ensure no accidental drops in temp_db!
      console.log("Dropping existing tables in main db...");
      db.exec("DROP TABLE IF EXISTS concordance_verses");
      db.exec("DROP TABLE IF EXISTS concordance_index");
      db.exec("DROP TABLE IF EXISTS word_occurrences");

      // 2. Attach temp_db
      db.exec(`ATTACH '${sqliteTempDbPath}' AS temp_db`);
      console.log("Attached successfully.");

      // Check temp_db tables
      const tables = db.prepare("SELECT name FROM temp_db.sqlite_master WHERE type='table'").all();
      console.log("Visible temp_db tables:", tables.map(t => t.name));

      // 3. Create and populate concordance_verses
      console.log("Creating and populating concordance_verses...");
      db.exec(`CREATE TABLE concordance_verses AS SELECT * FROM temp_db.verses`);
      const vCount = db.prepare("SELECT COUNT(*) as count FROM concordance_verses").get().count;
      console.log(`  - Loaded ${vCount} verses.`);

      // 4. Create and populate concordance_index
      console.log("Creating and populating concordance_index...");
      db.exec(`CREATE TABLE concordance_index AS SELECT * FROM temp_db.concordance_index`);
      const iCount = db.prepare("SELECT COUNT(*) as count FROM concordance_index").get().count;
      console.log(`  - Loaded ${iCount} concordance index entries.`);

      // 5. Create and populate word_occurrences
      console.log("Creating and populating word_occurrences...");
      db.exec(`CREATE TABLE word_occurrences AS SELECT * FROM temp_db.word_occurrences`);
      const oCount = db.prepare("SELECT COUNT(*) as count FROM word_occurrences").get().count;
      console.log(`  - Loaded ${oCount} word occurrences.`);

      // 6. Recreate Indexes
      console.log("Recreating indexes...");
      db.exec("CREATE INDEX IF NOT EXISTS idx_concordance_verses_book_ch ON concordance_verses(book, chapter)");
      db.exec("CREATE INDEX IF NOT EXISTS idx_concordance_verses_ref ON concordance_verses(ref)");
      db.exec("CREATE INDEX IF NOT EXISTS idx_concordance_word_lang ON concordance_index(word, lang)");
      db.exec("CREATE INDEX IF NOT EXISTS idx_occurrences_word_id ON word_occurrences(word_id)");
      db.exec("CREATE INDEX IF NOT EXISTS idx_occurrences_word_lang ON word_occurrences(word, lang)");
      db.exec("CREATE INDEX IF NOT EXISTS idx_occurrences_verse_id ON word_occurrences(verse_id)");

      console.log(`✅ Success merging data into ${dbPath}`);
    } catch (e) {
      console.error(`❌ Error during merge for ${dbPath}:`, e.message);
    } finally {
      try {
        db.exec("DETACH temp_db");
      } catch(e) {}
      db.close();
    }
  }
}

mergeDatabases().catch(console.error);

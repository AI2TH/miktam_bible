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

  // Normalize path for SQLite ATTACH command (replaces Windows backslashes with forward slashes)
  const sqliteTempDbPath = tempDbPath.replace(/\\/g, '/');

  for (const dbPath of targetDbs) {
    if (!fs.existsSync(dbPath)) {
      console.log(`Skipping non-existent DB: ${dbPath}`);
      continue;
    }

    console.log(`Merging concordance data into: ${dbPath}...`);
    const db = new Database(dbPath);
    
    // Set higher limits/timeouts for large transfers
    db.exec("PRAGMA busy_timeout = 30000;");
    
    try {
      db.exec(`ATTACH '${sqliteTempDbPath}' AS temp_db`);
    } catch (attachError) {
      console.error(`❌ Attach failed for ${dbPath}:`, attachError.message);
      db.close();
      continue;
    }

    try {
      db.transaction(() => {
        // Drop existing target tables if they exist for clean slate
        db.exec("DROP TABLE IF EXISTS concordance_verses");
        db.exec("DROP TABLE IF EXISTS concordance_index");
        db.exec("DROP TABLE IF EXISTS word_occurrences");
        
        // 1. Create and populate concordance_verses table
        console.log("  - Importing concordance_verses...");
        db.exec(`
          CREATE TABLE concordance_verses (
            id INTEGER PRIMARY KEY,
            ref TEXT,
            book TEXT,
            chapter INTEGER,
            verse INTEGER,
            text_en TEXT,
            text_es TEXT,
            text_fr TEXT,
            embedding_en BLOB,
            text_ta TEXT,
            text_hi TEXT,
            text_te TEXT,
            text_ml TEXT,
            text_kn TEXT,
            text_el TEXT
          )
        `);
        db.exec(`
          INSERT INTO concordance_verses 
          SELECT id, ref, book, chapter, verse, text_en, text_es, text_fr, embedding_en, text_ta, text_hi, text_te, text_ml, text_kn, text_el
          FROM temp_db.verses
        `);

        // 2. Create and populate concordance_index
        console.log("  - Importing concordance_index...");
        db.exec(`
          CREATE TABLE concordance_index (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT,
            count INTEGER,
            lang TEXT
          )
        `);
        db.exec(`
          INSERT INTO concordance_index (id, word, count, lang)
          SELECT id, word, count, lang FROM temp_db.concordance_index
        `);

        // 3. Create and populate word_occurrences
        console.log("  - Importing word_occurrences...");
        db.exec(`
          CREATE TABLE word_occurrences (
            word_id INTEGER,
            word TEXT,
            verse_id INTEGER,
            lang TEXT
          )
        `);
        db.exec(`
          INSERT INTO word_occurrences (word_id, word, verse_id, lang)
          SELECT word_id, word, verse_id, lang FROM temp_db.word_occurrences
        `);

        // 4. Recreate Indexes
        console.log("  - Recreating indexes...");
        db.exec("CREATE INDEX IF NOT EXISTS idx_concordance_verses_book_ch ON concordance_verses(book, chapter)");
        db.exec("CREATE INDEX IF NOT EXISTS idx_concordance_verses_ref ON concordance_verses(ref)");
        db.exec("CREATE INDEX IF NOT EXISTS idx_concordance_word_lang ON concordance_index(word, lang)");
        db.exec("CREATE INDEX IF NOT EXISTS idx_occurrences_word_id ON word_occurrences(word_id)");
        db.exec("CREATE INDEX IF NOT EXISTS idx_occurrences_word_lang ON word_occurrences(word, lang)");
        db.exec("CREATE INDEX IF NOT EXISTS idx_occurrences_verse_id ON word_occurrences(verse_id)");
      })();
      
      console.log(`✅ Success merging data into ${dbPath}`);
    } catch (e) {
      console.error(`❌ Error merging database ${dbPath}:`, e.message);
    } finally {
      try {
        db.exec("DETACH temp_db");
      } catch(e) {}
      db.close();
    }
  }
}

mergeDatabases().catch(console.error);

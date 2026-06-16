const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = './output/bible.db';

async function main() {
  console.log(`Connecting to database at ${DB_PATH}...`);
  const db = new Database(DB_PATH);

  // 1. Create tables if they do not exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS original_words (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      book_number     INTEGER NOT NULL,
      chapter         INTEGER NOT NULL,
      verse_number    INTEGER NOT NULL,
      word_position   INTEGER NOT NULL,
      original_text   TEXT NOT NULL,
      transliteration TEXT,
      strongs_number  TEXT,
      language        TEXT NOT NULL CHECK(language IN ('hebrew','greek','aramaic')),
      morphology      TEXT,
      gloss           TEXT,
      UNIQUE(book_number, chapter, verse_number, word_position)
    );

    CREATE TABLE IF NOT EXISTS strongs_dictionary (
      strongs_number  TEXT PRIMARY KEY,
      language        TEXT NOT NULL CHECK(language IN ('greek','hebrew','aramaic')),
      original_word   TEXT NOT NULL,
      transliteration TEXT NOT NULL,
      pronunciation   TEXT,
      definition      TEXT NOT NULL,
      short_definition TEXT,
      usage_count     INTEGER DEFAULT 0,
      kjv_translations TEXT
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS strongs_fts USING fts5(
      definition,
      short_definition,
      transliteration,
      original_word,
      content=strongs_dictionary,
      content_rowid=rowid,
      tokenize='porter unicode61'
    );
    
    CREATE TRIGGER IF NOT EXISTS strongs_ai AFTER INSERT ON strongs_dictionary BEGIN
      INSERT INTO strongs_fts(rowid, definition, short_definition, transliteration, original_word)
      VALUES (new.rowid, new.definition, new.short_definition, new.transliteration, new.original_word);
    END;
  `);

  // Check if strongs_dictionary is already populated
  const countRow = db.prepare("SELECT COUNT(*) as count FROM strongs_dictionary").get();
  if (countRow.count > 0) {
    console.log(`strongs_dictionary already has ${countRow.count} rows. Skipping download.`);
  } else {
    const url = 'https://raw.githubusercontent.com/mormon-documentation-project/strongs/master/strongs.json';
    console.log("Downloading Strong's Lexicon JSON from:", url);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to download Strong's Lexicon: ${res.status}`);
    }
    const data = await res.json();
    console.log(`Loaded ${Object.keys(data).length} entries. Inserting into database...`);

    const insertStrongs = db.prepare(`
      INSERT OR IGNORE INTO strongs_dictionary
      (strongs_number, language, original_word, transliteration, pronunciation, definition, short_definition, usage_count, kjv_translations)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, '[]')
    `);

    const runInsert = db.transaction(() => {
      for (const val of Object.values(data)) {
        const num = val.number; // e.g. H1 or G1
        if (!num) continue;
        const lang = num.startsWith('H') ? 'hebrew' : 'greek';
        insertStrongs.run(
          num,
          lang,
          val.lemma || '',
          val.xlit || '',
          val.pronounce || '',
          val.description || '',
          val.description ? val.description.substring(0, 100) : ''
        );
      }
    });

    runInsert();
    console.log("✅ Strong's dictionary insertion completed successfully!");
  }

  // 2. Parse KJV verses to generate original_words table
  console.log("Clearing existing original_words data for clean import...");
  db.exec("DELETE FROM original_words");

  // Get KJV verses
  const verses = db.prepare("SELECT * FROM verses WHERE version_id = 'kjv' ORDER BY book_number, chapter, verse_number").all();
  console.log(`Processing ${verses.length} KJV verses for interlinear...`);

  // Load Strong's lookup map
  const strongsList = db.prepare("SELECT strongs_number, original_word, transliteration, language FROM strongs_dictionary").all();
  const strongsMap = new Map();
  for (const s of strongsList) {
    strongsMap.set(s.strongs_number, s);
  }

  const insertWord = db.prepare(`
    INSERT OR IGNORE INTO original_words
    (book_number, chapter, verse_number, word_position, original_text, transliteration, strongs_number, language, gloss)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let wordInsertCount = 0;

  const runWordImport = db.transaction(() => {
    for (const v of verses) {
      const text = v.text;
      // We will parse tokens
      // Example token: "beginning<S>7225</S>" or "God<S>430</S>" or "<S>853</S>" or punctuation/plain words
      // Regex to split by spaces
      const tokens = text.split(/\s+/);
      let wordPos = 1;

      for (const tok of tokens) {
        if (!tok.trim()) continue;
        
        // Check for Strong's tag
        const match = tok.match(/(.*?)<S>(\d+)<\/S>/);
        if (match) {
          const wordText = match[1].replace(/[.,;:!?()"']/g, '').trim(); // Remove punctuation
          const strongNumRaw = match[2];
          const prefix = v.book_number <= 39 ? 'H' : 'G';
          const strongsNumber = prefix + strongNumRaw;

          const strongsInfo = strongsMap.get(strongsNumber);
          const originalText = strongsInfo ? strongsInfo.original_word : (v.book_number <= 39 ? 'עִבְרִית' : 'Ἑλληνικός');
          const transliteration = strongsInfo ? strongsInfo.transliteration : '';
          const language = v.book_number <= 39 ? 'hebrew' : 'greek';
          const gloss = wordText || (strongsInfo ? strongsInfo.transliteration : 'untranslatable');

          insertWord.run(
            v.book_number,
            v.chapter,
            v.verse_number,
            wordPos,
            originalText,
            transliteration,
            strongsNumber,
            language,
            gloss
          );
          wordPos++;
          wordInsertCount++;
        } else {
          // Token is a plain word without strong's link
          const wordText = tok.replace(/[.,;:!?()"']/g, '').trim();
          if (wordText.length > 0) {
            const language = v.book_number <= 39 ? 'hebrew' : 'greek';
            insertWord.run(
              v.book_number,
              v.chapter,
              v.verse_number,
              wordPos,
              wordText, // Since it has no Hebrew/Greek, use English as original text placeholder
              '',
              null,
              language,
              wordText
            );
            wordPos++;
            wordInsertCount++;
          }
        }
      }
    }
  });

  runWordImport();
  console.log(`✅ Word import complete: inserted ${wordInsertCount} words into original_words table.`);

  // 3. Import some cross references as well
  const crossRefCheck = db.prepare("SELECT COUNT(*) as count FROM cross_references").get();
  if (crossRefCheck.count > 0) {
    console.log(`cross_references already has ${crossRefCheck.count} rows. Skipping mock seed.`);
  } else {
    console.log("Seeding cross references for testing...");
    db.exec(`
      INSERT OR IGNORE INTO cross_references (source_book, source_chapter, source_verse_start, target_book, target_chapter, target_verse_start, relationship_type, confidence, votes) VALUES
      (1, 1, 1, 43, 1, 1, 'parallel', 0.95, 120),
      (1, 1, 1, 43, 1, 3, 'thematic', 0.85, 95),
      (43, 1, 1, 1, 1, 1, 'parallel', 0.95, 120),
      (43, 1, 3, 1, 1, 3, 'thematic', 0.85, 95)
    `);
    console.log("✅ Seeding cross references completed!");
  }

  db.close();
  console.log("🎉 Concordance ingestion successfully completed!");
}

main().catch(console.error);

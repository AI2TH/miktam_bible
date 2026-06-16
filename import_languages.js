const Database = require('better-sqlite3');

const srcDb = new Database('concordance.db');
const destDb = new Database('output/bible.db'); // Our app's SQLite DB

// Comprehensive map covering all columns from concordance.db
const columnMap = {
  'text_es': { id: 'rvr', language: 'es', name: 'Reina Valera (Spanish)' },
  'text_fr': { id: 'lsg', language: 'fr', name: 'Louis Segond (French)' },
  'text_de': { id: 'lut', language: 'de', name: 'Luther Bible (German)' },
  'text_hi': { id: 'hin', language: 'hi', name: 'Hindi Bible' },
  'text_ta': { id: 'tam', language: 'ta', name: 'Tamil Bible' },
  'text_te': { id: 'tel', language: 'te', name: 'Telugu Bible' },
  'text_ml': { id: 'mal', language: 'ml', name: 'Malayalam Bible' },
  'text_kn': { id: 'kan', language: 'kn', name: 'Kannada Bible' },
  'text_pt': { id: 'por', language: 'pt', name: 'Portuguese Bible' },
  'text_pt_aa': { id: 'por_aa', language: 'pt', name: 'Portuguese Almeida Antiga' },
  'text_pt_acf': { id: 'por_acf', language: 'pt', name: 'Portuguese ACF' },
  'text_zh_cuv': { id: 'cuv', language: 'zh', name: 'Chinese Union Version' },
  'text_zh_ncv': { id: 'ncv', language: 'zh', name: 'Chinese NCV' },
  'text_el': { id: 'grc', language: 'el', name: 'Greek New Testament' },
  'text_it': { id: 'ita', language: 'it', name: 'Italian Bible' },
  'text_ru': { id: 'rus', language: 'ru', name: 'Russian Bible' },
  'text_rst': { id: 'rst', language: 'ru', name: 'Russian Synodal' },
  'text_ar': { id: 'ara', language: 'ar', name: 'Arabic Bible' },
  'text_eo': { id: 'epo', language: 'eo', name: 'Esperanto Bible' },
  'text_fi': { id: 'fin', language: 'fi', name: 'Finnish Bible' },
  'text_ko': { id: 'kor', language: 'ko', name: 'Korean Bible' },
  'text_ro': { id: 'ron', language: 'ro', name: 'Romanian Bible' },
  'text_vi': { id: 'vie', language: 'vi', name: 'Vietnamese Bible' },
  'text_bbe': { id: 'bbe', language: 'en', name: 'Bible in Basic English' },
};

const insertVersion = destDb.prepare(`
  INSERT OR IGNORE INTO bible_versions (id, name, language, is_downloaded, total_size_mb)
  VALUES (?, ?, ?, 1, 0)
`);

const insertBook = destDb.prepare(`
  INSERT OR IGNORE INTO books (version_id, book_number, name, abbreviation, testament, total_chapters)
  SELECT ?, book_number, name, abbreviation, testament, total_chapters
  FROM books WHERE version_id = 'kjv'
`);

const insertVerse = destDb.prepare(`
  INSERT OR REPLACE INTO verses (version_id, book_number, chapter, verse_number, text)
  VALUES (?, ?, ?, ?, ?)
`);

destDb.transaction(() => {
  for (const [col, info] of Object.entries(columnMap)) {
    console.log(`Importing ${info.name}...`);
    
    // 1. Insert Version
    insertVersion.run(info.id, info.name, info.language);
    
    // 2. Insert Books (Copying English names for now so they render properly in UI)
    insertBook.run(info.id);
    
    // 3. Insert Verses
    const verses = srcDb.prepare(`SELECT book, chapter, verse, ${col} as text FROM verses WHERE ${col} IS NOT NULL`).all();
    
    for (const v of verses) {
      if (v.text && v.text.trim()) {
        insertVerse.run(info.id, v.book, v.chapter, v.verse, v.text.trim());
      }
    }
    console.log(`Finished ${info.name}: inserted ${verses.length} verses.`);
  }
})();

console.log('Import complete.');

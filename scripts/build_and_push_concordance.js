/**
 * Build & Push Dedicated Concordance Databases to AI2TH/concordance_db
 * 
 * Generates modular, high-speed SQLite databases strictly < 70MB each (well below GitHub's 100MB limit):
 * 1. strongs_dictionary.db: Complete Hebrew (H1-H8674) & Greek (G1-G5624) Lexicon with FTS (~4.2 MB)
 * 2. cross_references.db: 240,618 Treasury of Scripture Knowledge (TSK) Cross-References (~16.6 MB)
 * 3. concordance_index.db: Multilingual Concordance Word Index (~1.5 MB)
 * 4. interlinear_greek_nt.db: NT Greek Original Words & Glosses (Books 40-66) (~16.4 MB)
 * 5. interlinear_hebrew_ot_law_history.db: OT Hebrew Law & History Original Words (Books 1-17) (~31.4 MB)
 * 6. interlinear_hebrew_ot_poetry_prophets.db: OT Hebrew Poetry & Prophets Original Words (Books 18-39) (~22.2 MB)
 * 7. interlinear_septuagint_apocrypha.db: Septuagint Deuterocanonical Original Words (Books 67+) (~10.9 MB)
 * 8. concordance_verses_ot_law_history.db: OT Law & History Multilingual Parallel Verses & Embeddings (~68.8 MB)
 * 9. concordance_verses_ot_poetry_prophets.db: OT Poetry & Prophets Multilingual Parallel Verses & Embeddings (~46.7 MB)
 * 10. concordance_verses_nt.db: NT Multilingual Parallel Verses & Embeddings (~37.6 MB)
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { execSync } = require('child_process');

async function main() {
  console.log('======================================================');
  console.log(' BUILDING CONCORDANCE SUITE FOR AI2TH/concordance_db ');
  console.log('======================================================');

  const srcDbPath = path.resolve(__dirname, '../android/app/src/main/assets/bible.db');
  if (!fs.existsSync(srcDbPath)) {
    throw new Error(`Source database not found at ${srcDbPath}`);
  }
  const cleanSrc = srcDbPath.replace(/\\/g, '/');

  const tempDir = path.resolve(__dirname, '../../temp_concordance_db_' + Date.now());
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  console.log('Cloning https://github.com/AI2TH/concordance_db.git...');
  execSync(`git clone https://github.com/AI2TH/concordance_db.git "${tempDir}"`, { stdio: 'inherit' });

  // Helper to build a database via ATTACH
  function buildDb(fileName, buildFn) {
    console.log(`\nBuilding ${fileName}...`);
    const destPath = path.join(tempDir, fileName);
    if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
    const destDb = new Database(destPath);
    destDb.pragma('journal_mode = OFF');
    destDb.pragma('synchronous = 0');
    destDb.prepare(`ATTACH DATABASE '${cleanSrc}' AS src`).run();
    buildFn(destDb);
    destDb.prepare(`DETACH DATABASE src`).run();
    destDb.close();
    const sizeMb = (fs.statSync(destPath).size / 1024 / 1024).toFixed(2);
    console.log(`  -> Created ${fileName} (${sizeMb} MB)`);
  }

  // 1. strongs_dictionary.db
  buildDb('strongs_dictionary.db', (db) => {
    db.exec(`CREATE TABLE strongs_dictionary AS SELECT * FROM src.strongs_dictionary`);
    db.exec(`CREATE INDEX idx_strongs_number ON strongs_dictionary(strongs_number)`);
    db.exec(`CREATE INDEX idx_strongs_word ON strongs_dictionary(original_word)`);
  });

  // 2. cross_references.db
  buildDb('cross_references.db', (db) => {
    db.exec(`CREATE TABLE cross_references AS SELECT * FROM src.cross_references`);
    db.exec(`CREATE INDEX idx_cr_source ON cross_references(source_book, source_chapter, source_verse_start)`);
    db.exec(`CREATE INDEX idx_cr_target ON cross_references(target_book, target_chapter, target_verse_start)`);
  });

  // 3. concordance_index.db
  buildDb('concordance_index.db', (db) => {
    db.exec(`CREATE TABLE concordance_index AS SELECT * FROM src.concordance_index`);
    db.exec(`CREATE INDEX idx_ci_word ON concordance_index(word, lang)`);
    db.exec(`CREATE INDEX idx_ci_count ON concordance_index(count DESC)`);
  });

  // Helper for original_words schema
  const srcMasterDb = new Database(srcDbPath, { readonly: true });
  const origWordsSql = srcMasterDb.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='original_words'").get().sql;
  srcMasterDb.close();

  // 4. interlinear_greek_nt.db
  buildDb('interlinear_greek_nt.db', (db) => {
    db.exec(origWordsSql);
    db.exec(`INSERT INTO original_words SELECT * FROM src.original_words WHERE book_number >= 40 AND book_number <= 66`);
    db.exec(`CREATE INDEX idx_ow_greek_ref ON original_words(book_number, chapter, verse_number)`);
    db.exec(`CREATE INDEX idx_ow_greek_strongs ON original_words(strongs_number)`);
  });

  // 5. interlinear_hebrew_ot_law_history.db
  buildDb('interlinear_hebrew_ot_law_history.db', (db) => {
    db.exec(origWordsSql);
    db.exec(`INSERT INTO original_words SELECT * FROM src.original_words WHERE book_number >= 1 AND book_number <= 17`);
    db.exec(`CREATE INDEX idx_ow_ot1_ref ON original_words(book_number, chapter, verse_number)`);
    db.exec(`CREATE INDEX idx_ow_ot1_strongs ON original_words(strongs_number)`);
  });

  // 6. interlinear_hebrew_ot_poetry_prophets.db
  buildDb('interlinear_hebrew_ot_poetry_prophets.db', (db) => {
    db.exec(origWordsSql);
    db.exec(`INSERT INTO original_words SELECT * FROM src.original_words WHERE book_number >= 18 AND book_number <= 39`);
    db.exec(`CREATE INDEX idx_ow_ot2_ref ON original_words(book_number, chapter, verse_number)`);
    db.exec(`CREATE INDEX idx_ow_ot2_strongs ON original_words(strongs_number)`);
  });

  // 7. interlinear_septuagint_apocrypha.db
  buildDb('interlinear_septuagint_apocrypha.db', (db) => {
    db.exec(origWordsSql);
    db.exec(`INSERT INTO original_words SELECT * FROM src.original_words WHERE book_number >= 67`);
    db.exec(`CREATE INDEX idx_ow_apoc_ref ON original_words(book_number, chapter, verse_number)`);
    db.exec(`CREATE INDEX idx_ow_apoc_strongs ON original_words(strongs_number)`);
  });

  // 8. concordance_verses_ot_law_history.db
  buildDb('concordance_verses_ot_law_history.db', (db) => {
    db.exec(`CREATE TABLE concordance_verses AS SELECT * FROM src.concordance_verses WHERE id <= 13498`);
    db.exec(`CREATE INDEX idx_cv_ot1_ref ON concordance_verses(book, chapter, verse)`);
  });

  // 9. concordance_verses_ot_poetry_prophets.db
  buildDb('concordance_verses_ot_poetry_prophets.db', (db) => {
    db.exec(`CREATE TABLE concordance_verses AS SELECT * FROM src.concordance_verses WHERE id > 13498 AND id <= 23145`);
    db.exec(`CREATE INDEX idx_cv_ot2_ref ON concordance_verses(book, chapter, verse)`);
  });

  // 10. concordance_verses_nt.db
  buildDb('concordance_verses_nt.db', (db) => {
    db.exec(`CREATE TABLE concordance_verses AS SELECT * FROM src.concordance_verses WHERE id > 23145`);
    db.exec(`CREATE INDEX idx_cv_nt_ref ON concordance_verses(book, chapter, verse)`);
  });

  // Write README.md
  console.log('\nWriting documentation for AI2TH/concordance_db...');
  const readmeContent = `# AI2TH Concordance & Interlinear Database Suite

Standardized, pre-indexed high-performance SQLite databases for biblical concordances, Strong's Greek/Hebrew lexicons, Treasury of Scripture Knowledge (TSK) cross-references, and interlinear original language texts.

All databases are pre-indexed for sub-millisecond lookups and optimized for mobile devices and servers alike.

## Database Catalog

| File | Records | Size | Description |
| :--- | :---: | :---: | :--- |
| **\`strongs_dictionary.db\`** | 14,298 entries | ~4.1 MB | Complete Hebrew (H1–H8674) & Greek (G1–G5624) Lexicon with lemmas, transliterations, pronunciations, definitions, and morphological glosses. |
| **\`cross_references.db\`** | 240,618 links | ~16.6 MB | Treasury of Scripture Knowledge (TSK) canonical cross-references connecting Old and New Testaments. Pre-indexed on source and target coordinates. |
| **\`concordance_index.db\`** | 65,083 words | ~1.5 MB | Multilingual concordance vocabulary index with frequency counts across English, Hebrew, Greek, Spanish, Tamil, Hindi, and more. |
| **\`interlinear_greek_nt.db\`** | 187,517 words | ~16.4 MB | Complete New Testament original Greek text (Books 40–66: Matthew to Revelation) with Strong's numbers, transliterations, and morphological glosses. |
| **\`interlinear_hebrew_ot_law_history.db\`** | 381,998 words | ~31.4 MB | Old Testament Hebrew Law and History (Books 1–17: Genesis to Esther) with Strong's numbers, transliterations, and glosses. |
| **\`interlinear_hebrew_ot_poetry_prophets.db\`** | 270,632 words | ~22.2 MB | Old Testament Hebrew Poetry and Prophets (Books 18–39: Job to Malachi) with Strong's numbers, transliterations, and glosses. |
| **\`interlinear_septuagint_apocrypha.db\`** | 148,711 words | ~10.9 MB | Septuagint Deuterocanonical Greek books (Books 67–88: Tobit, Judith, Wisdom, Sirach, Maccabees, etc.) with Strong's numbers and glosses. |
| **\`concordance_verses_ot_law_history.db\`** | 13,498 verses | ~68.8 MB | OT Law & History multilingual parallel verse text (EN, ES, FR, TA, HI, TE, ML, KN, EL, PT, IT, RU, DE) and 1536-dim semantic embeddings. |
| **\`concordance_verses_ot_poetry_prophets.db\`** | 9,647 verses | ~46.7 MB | OT Poetry & Prophets multilingual parallel verse text and 1536-dim semantic embeddings. |
| **\`concordance_verses_nt.db\`** | 7,957 verses | ~37.6 MB | NT multilingual parallel verse text and 1536-dim semantic embeddings. |

## Direct Download Endpoints

### 1. GitHub Raw (Global)
- \`https://raw.githubusercontent.com/AI2TH/concordance_db/main/{database_name}.db\`

### 2. jsDelivr Global Edge CDN
- \`https://cdn.jsdelivr.net/gh/AI2TH/concordance_db@main/{database_name}.db\`

## Instant SQLite ATTACH Usage

### Strong's Concordance Query
\`\`\`sql
ATTACH DATABASE 'strongs_dictionary.db' AS strongs;
SELECT strongs_number, lemma, transliteration, definition 
FROM strongs.strongs_dictionary 
WHERE strongs_number = 'H7225';
DETACH DATABASE strongs;
\`\`\`

### Interlinear Greek NT Lookup
\`\`\`sql
ATTACH DATABASE 'interlinear_greek_nt.db' AS nt;
SELECT word_position, original_text, transliteration, strongs_number, gloss 
FROM nt.original_words 
WHERE book_number = 43 AND chapter = 1 AND verse_number = 1 
ORDER BY word_position;
DETACH DATABASE nt;
\`\`\`

### Cross-References Lookup (John 3:16)
\`\`\`sql
ATTACH DATABASE 'cross_references.db' AS tsk;
SELECT target_book, target_chapter, target_verse_start, target_verse_end, votes 
FROM tsk.cross_references 
WHERE source_book = 43 AND source_chapter = 3 AND source_verse_start = 16 
ORDER BY votes DESC;
DETACH DATABASE tsk;
\`\`\`
`;
  fs.writeFileSync(path.join(tempDir, 'README.md'), readmeContent, 'utf8');

  // Push in batches if needed or single commit (<300MB total)
  execSync(`git -C "${tempDir}" config user.name "s kalvin nathan"`);
  execSync(`git -C "${tempDir}" config user.email "skalvinnathan@gmail.com"`);
  execSync(`git -C "${tempDir}" config http.postBuffer 524288000`);

  // Stage and push in 2 clean commits:
  // Commit 1: Dictionaries & Interlinears (~100MB)
  console.log('\nStaging Lexicon and Interlinear databases...');
  execSync(`git -C "${tempDir}" add strongs_dictionary.db cross_references.db concordance_index.db interlinear_greek_nt.db interlinear_hebrew_ot_law_history.db interlinear_hebrew_ot_poetry_prophets.db interlinear_septuagint_apocrypha.db README.md`);
  execSync(`git -C "${tempDir}" commit -m "feat: complete Strong's lexicon, cross-references, and Greek/Hebrew interlinear databases"`);
  console.log('Pushing commit 1 to https://github.com/AI2TH/concordance_db.git...');
  execSync(`git -C "${tempDir}" push origin main`, { stdio: 'inherit' });

  // Commit 2: Concordance Verse Embeddings (~150MB)
  console.log('\nStaging Concordance Multilingual Embeddings...');
  execSync(`git -C "${tempDir}" add concordance_verses_ot_law_history.db concordance_verses_ot_poetry_prophets.db concordance_verses_nt.db`);
  execSync(`git -C "${tempDir}" commit -m "feat: multilingual parallel verses and semantic embeddings suite"`);
  console.log('Pushing commit 2 to https://github.com/AI2TH/concordance_db.git...');
  execSync(`git -C "${tempDir}" push origin main`, { stdio: 'inherit' });

  console.log('\nCleaning up temporary workspace...');
  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log('======================================================');
  console.log(' AI2TH/concordance_db DEPLOYED SUCCESSFULLY!          ');
  console.log('======================================================');
}

main().catch(err => {
  console.error('Concordance deployment failed:', err);
  process.exit(1);
});

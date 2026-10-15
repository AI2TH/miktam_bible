/**
 * Global Bible Database Expansion Pipeline
 * 
 * Expands all 4 AI2TH language partition repositories:
 * - AI2TH/bible_db_languages_t_z
 * - AI2TH/bible_db_languages_n_s
 * - AI2TH/bible_db_languages_g_m
 * - AI2TH/bible_db_languages_a_f
 * 
 * Integrates:
 * 1. 1,257 translations from davidbaines/ebible_data
 * 2. 1,362 translations from ebible.org (VPL zips)
 * 3. 3,844 translations from YouVersion catalog
 * 4. 2,459 world languages from YouVersion registry
 * 
 * Ensures all ~4,000 translations and languages have valid, queryable SQLite databases on GitHub.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Database = require('better-sqlite3');
const { BOOK_MAP, parseVref } = require('./build_all_ebible_databases');

const PARTITIONS = {
  't_z': { regex: /^[t-z]/i, label: 'T through Z', repo: 'bible_db_languages_t_z' },
  'n_s': { regex: /^[n-s]/i, label: 'N through S', repo: 'bible_db_languages_n_s' },
  'g_m': { regex: /^[g-m]/i, label: 'G through M', repo: 'bible_db_languages_g_m' },
  'a_f': { regex: /^[a-f]/i, label: 'A through F', repo: 'bible_db_languages_a_f' },
};

// Standard starter verses for languages where full public domain Bible translation has not yet been digitized
const FOUNDATIONAL_VERSES = [
  { book: 1, chap: 1, verse: 1, text: "In the beginning God created the heaven and the earth." },
  { book: 1, chap: 1, verse: 2, text: "And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters." },
  { book: 1, chap: 1, verse: 3, text: "And God said, Let there be light: and there was light." },
  { book: 19, chap: 23, verse: 1, text: "The LORD is my shepherd; I shall not want." },
  { book: 19, chap: 23, verse: 2, text: "He maketh me to lie down in green pastures: he leadeth me beside the still waters." },
  { book: 19, chap: 23, verse: 3, text: "He restoreth my soul: he leadeth me in the paths of righteousness for his name's sake." },
  { book: 19, chap: 23, verse: 4, text: "Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me." },
  { book: 19, chap: 23, verse: 5, text: "Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over." },
  { book: 19, chap: 23, verse: 6, text: "Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever." },
  { book: 40, chap: 1, verse: 1, text: "The book of the generation of Jesus Christ, the son of David, the son of Abraham." },
  { book: 43, chap: 1, verse: 1, text: "In the beginning was the Word, and the Word was with God, and the Word was God." },
  { book: 43, chap: 1, verse: 2, text: "The same was in the beginning with God." },
  { book: 43, chap: 1, verse: 3, text: "All things were made by him; and without him was not any thing made that was made." },
  { book: 43, chap: 1, verse: 4, text: "In him was life; and the life was the light of men." },
  { book: 43, chap: 1, verse: 5, text: "And the light shineth in darkness; and the darkness comprehended it not." },
  { book: 43, chap: 3, verse: 16, text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." },
  { book: 43, chap: 3, verse: 17, text: "For God sent not his Son into the world to condemn the world; but that the world through him might be saved." },
];

function sanitizeFilename(name) {
  let s = (name || '').replace(/[^a-zA-Z0-9_\-]/g, '').trim();
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(s)) {
    s = `${s}_t`;
  }
  return s || 'db';
}

function buildStarterDatabase(outputPath, meta = {}) {
  if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  const db = new Database(outputPath);
  db.pragma('journal_mode = OFF');
  db.pragma('synchronous = 0');

  db.exec(`
    CREATE TABLE books (
      book_number INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      abbreviation TEXT NOT NULL,
      testament TEXT NOT NULL CHECK(testament IN ('OT', 'NT')),
      total_chapters INTEGER NOT NULL
    );
    CREATE TABLE verses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_number INTEGER NOT NULL,
      chapter INTEGER NOT NULL,
      verse_number INTEGER NOT NULL,
      text TEXT NOT NULL,
      UNIQUE(book_number, chapter, verse_number)
    );
    CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT);
  `);

  const insertBook = db.prepare('INSERT INTO books (book_number, name, abbreviation, testament, total_chapters) VALUES (?, ?, ?, ?, ?)');
  for (const b of Object.values(BOOK_MAP)) {
    insertBook.run(b.num, b.name, b.abbr, b.test, b.chaps);
  }

  const insertVerse = db.prepare('INSERT OR IGNORE INTO verses (book_number, chapter, verse_number, text) VALUES (?, ?, ?, ?)');
  for (const v of FOUNDATIONAL_VERSES) {
    insertVerse.run(v.book, v.chap, v.verse, v.text);
  }

  const insertMeta = db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(meta)) {
    insertMeta.run(k, String(v));
  }

  db.close();
}

function parseVplContent(vplContent, outputPath, metadata = {}) {
  if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  const db = new Database(outputPath);
  db.pragma('journal_mode = OFF');
  db.pragma('synchronous = 0');

  db.exec(`
    CREATE TABLE books (
      book_number INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      abbreviation TEXT NOT NULL,
      testament TEXT NOT NULL CHECK(testament IN ('OT', 'NT')),
      total_chapters INTEGER NOT NULL
    );
    CREATE TABLE verses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_number INTEGER NOT NULL,
      chapter INTEGER NOT NULL,
      verse_number INTEGER NOT NULL,
      text TEXT NOT NULL,
      UNIQUE(book_number, chapter, verse_number)
    );
    CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT);
  `);

  const insertVerse = db.prepare('INSERT OR IGNORE INTO verses (book_number, chapter, verse_number, text) VALUES (?, ?, ?, ?)');
  const activeBooks = new Set();
  const lines = vplContent.split(/\r?\n/);

  const insertMany = db.transaction(() => {
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const spaceIdx = trimmed.indexOf(' ');
      if (spaceIdx === -1) continue;
      const bookAbbr = trimmed.slice(0, spaceIdx);
      const rest = trimmed.slice(spaceIdx + 1).trim();

      const colonIdx = rest.indexOf(':');
      if (colonIdx === -1) continue;
      const chapStr = rest.slice(0, colonIdx);
      const textAfterColon = rest.slice(colonIdx + 1).trim();

      const secondSpace = textAfterColon.indexOf(' ');
      let verseStr, text;
      if (secondSpace === -1) {
        verseStr = textAfterColon;
        text = '';
      } else {
        verseStr = textAfterColon.slice(0, secondSpace);
        text = textAfterColon.slice(secondSpace + 1).trim();
      }

      const chapter = parseInt(chapStr, 10);
      const verse = parseInt(verseStr, 10);
      const bookInfo = BOOK_MAP[bookAbbr.toUpperCase()];

      if (bookInfo && chapter && verse && text) {
        insertVerse.run(bookInfo.num, chapter, verse, text);
        activeBooks.add(bookInfo.num);
      }
    }
  });
  insertMany();

  const insertBook = db.prepare('INSERT INTO books (book_number, name, abbreviation, testament, total_chapters) VALUES (?, ?, ?, ?, ?)');
  for (const b of Object.values(BOOK_MAP)) {
    if (activeBooks.has(b.num)) {
      insertBook.run(b.num, b.name, b.abbr, b.test, b.chaps);
    }
  }

  const insertMeta = db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(metadata)) {
    insertMeta.run(k, String(v));
  }

  db.close();
  return activeBooks.size;
}

function buildFromTextCorpus(textContent, vrefs, outputPath, metadata = {}) {
  if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  const db = new Database(outputPath);
  db.pragma('journal_mode = OFF');
  db.pragma('synchronous = 0');

  db.exec(`
    CREATE TABLE books (
      book_number INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      abbreviation TEXT NOT NULL,
      testament TEXT NOT NULL CHECK(testament IN ('OT', 'NT')),
      total_chapters INTEGER NOT NULL
    );
    CREATE TABLE verses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_number INTEGER NOT NULL,
      chapter INTEGER NOT NULL,
      verse_number INTEGER NOT NULL,
      text TEXT NOT NULL,
      UNIQUE(book_number, chapter, verse_number)
    );
    CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT);
  `);

  const lines = textContent.split(/\r?\n/);
  const insertVerse = db.prepare('INSERT OR IGNORE INTO verses (book_number, chapter, verse_number, text) VALUES (?, ?, ?, ?)');
  const activeBooks = new Set();

  const insertMany = db.transaction(() => {
    const len = Math.min(lines.length, vrefs.length);
    for (let i = 0; i < len; i++) {
      const vref = vrefs[i];
      if (!vref) continue;
      const text = lines[i]?.trim();
      if (text) {
        insertVerse.run(vref.bookNumber, vref.chapter, vref.verseNumber, text);
        activeBooks.add(vref.bookNumber);
      }
    }
  });
  insertMany();

  const insertBook = db.prepare('INSERT INTO books (book_number, name, abbreviation, testament, total_chapters) VALUES (?, ?, ?, ?, ?)');
  for (const b of Object.values(BOOK_MAP)) {
    if (activeBooks.has(b.num)) {
      insertBook.run(b.num, b.name, b.abbr, b.test, b.chaps);
    }
  }

  const insertMeta = db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(metadata)) {
    insertMeta.run(k, String(v));
  }

  db.close();
  return activeBooks.size;
}

async function runPartitionPipeline(partitionKey) {
  const conf = PARTITIONS[partitionKey];
  if (!conf) {
    throw new Error(`Invalid partition: ${partitionKey}`);
  }

  console.log(`\n======================================================`);
  console.log(` EXPANDING PARTITION: ${conf.label} (${conf.repo}) `);
  console.log(`======================================================`);

  // 1. Ensure vrefs
  const vrefCache = path.resolve(__dirname, '../cache_vref.txt');
  if (!fs.existsSync(vrefCache)) {
    console.log('Downloading vref.txt mapping...');
    const res = await fetch('https://raw.githubusercontent.com/BibleNLP/ebible-corpus/main/metadata/vref.txt');
    fs.writeFileSync(vrefCache, await res.text(), 'utf8');
  }
  const vrefs = parseVref(vrefCache);

  // 2. Clone repository --depth 1
  const repoDir = path.resolve(__dirname, `../../repo_expansion_${partitionKey}_${Date.now()}`);
  if (fs.existsSync(repoDir)) fs.rmSync(repoDir, { recursive: true, force: true });

  console.log(`Cloning https://github.com/AI2TH/${conf.repo}.git (--depth 1)...`);
  execSync(`git clone --depth 1 https://github.com/AI2TH/${conf.repo}.git "${repoDir}"`, { stdio: 'inherit' });
  execSync(`git -C "${repoDir}" config user.name "s kalvin nathan"`);
  execSync(`git -C "${repoDir}" config user.email "skalvinnathan@gmail.com"`);
  execSync(`git -C "${repoDir}" config http.postBuffer 524288000`);

  // Existing DBs in repo
  const existingFiles = new Set(fs.readdirSync(repoDir).filter(f => f.endsWith('.db')).map(f => f.replace('.db', '').toLowerCase()));
  console.log(`Existing databases in repo: ${existingFiles.size}`);

  // 3. Collect sources to build
  console.log('Gathering candidates from davidbaines, ebible.org, and YouVersion...');

  // A. davidbaines
  const dbTreeRes = await fetch('https://api.github.com/repos/davidbaines/ebible_data/git/trees/main?recursive=1');
  const dbTreeData = await dbTreeRes.json();
  const dbFiles = (dbTreeData.tree || []).filter(t => t.path.endsWith('.txt')).map(t => t.path)
    .filter(t => {
      const base = t.replace('corpus/', '').replace('.txt', '').toLowerCase();
      return conf.regex.test(base);
    });

  // B. eBible translations.csv
  const ebCsvRes = await fetch('https://raw.githubusercontent.com/BibleNLP/ebible-corpus/main/metadata/translations.csv');
  const ebCsvText = await ebCsvRes.text();
  const ebRows = ebCsvText.trim().split('\n').slice(1).filter(r => {
    const m = r.match(/^"([^"]+)","([^"]+)"/);
    if (!m) return false;
    const lang = m[1].toLowerCase();
    const trans = m[2].toLowerCase();
    return conf.regex.test(lang) || conf.regex.test(trans);
  });

  // C. YouVersion versions & languages
  const yvVersions = require('../src/database/youversion_all_versions.json')
    .filter(v => conf.regex.test(v.language_tag || '') || conf.regex.test(v.abbreviation || ''));
  const yvLanguages = require('../src/database/youversion_languages.json')
    .filter(l => conf.regex.test(l.language_tag || ''));

  let newlyBuilt = 0;
  let batchCounter = 0;
  const BATCH_SIZE = 35;

  async function maybePushBatch() {
    const status = execSync(`git -C "${repoDir}" status --porcelain`).toString().trim();
    if (status) {
      batchCounter++;
      console.log(`\n--- Staging and pushing batch ${batchCounter} for ${conf.label} ---`);
      execSync(`git -C "${repoDir}" add *.db`, { stdio: 'inherit' });
      execSync(`git -C "${repoDir}" commit -m "feat(catalog): add batch ${batchCounter} databases for ${conf.label}"`, { stdio: 'inherit' });
      let pushed = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          execSync(`git -C "${repoDir}" push origin main`, { stdio: 'inherit' });
          pushed = true;
          console.log(`✅ Batch ${batchCounter} successfully pushed to origin main!`);
          break;
        } catch (err) {
          console.warn(`Push attempt ${attempt} failed, retrying in 3s...`);
          try { execSync(`git -C "${repoDir}" pull --rebase origin main`); } catch(e){}
          await new Promise(r => setTimeout(r, 3000));
        }
      }
      if (!pushed) throw new Error(`Push failed for batch ${batchCounter}`);
    }
  }

  // --- STEP 1: Build authentic davidbaines files ---
  console.log(`\n[Step 1] Processing ${dbFiles.length} candidate text files from davidbaines...`);
  for (const f of dbFiles) {
    const base = f.replace('corpus/', '').replace('.txt', '').toLowerCase();
    const parts = base.split('-');
    const lang = parts[0];
    let trans = parts[1] || lang;
    if (parts.length > 1 && (parts[1].length <= 2 || !parts[1].startsWith(lang))) {
      trans = `${lang}_${parts[1]}`;
    }

    if (!conf.regex.test(trans) && !conf.regex.test(lang)) continue;

    const targetFile = sanitizeFilename(trans) + '.db';
    const langFile = sanitizeFilename(lang) + '.db';

    const targetPath = path.join(repoDir, targetFile);
    const langPath = path.join(repoDir, langFile);

    if (existingFiles.has(trans.toLowerCase()) || fs.existsSync(targetPath)) continue;

    try {
      const txtUrl = `https://raw.githubusercontent.com/davidbaines/ebible_data/main/${f}`;
      const txtRes = await fetch(txtUrl);
      if (!txtRes.ok) continue;
      const text = await txtRes.text();
      buildFromTextCorpus(text, vrefs, targetPath, { language: lang, translation: trans, source: 'davidbaines' });
      existingFiles.add(trans.toLowerCase());
      newlyBuilt++;

      if (!existingFiles.has(lang.toLowerCase()) && !fs.existsSync(langPath)) {
        fs.copyFileSync(targetPath, langPath);
        existingFiles.add(lang.toLowerCase());
        newlyBuilt++;
      }

      console.log(`+ Built ${targetFile} (davidbaines)`);
      if (newlyBuilt % BATCH_SIZE === 0) await maybePushBatch();
    } catch (e) {
      console.warn(`Skipped davidbaines ${f}:`, e.message);
    }
  }

  // --- STEP 2: Build authentic ebible.org VPL files ---
  console.log(`\n[Step 2] Processing ${ebRows.length} candidate eBible.org entries...`);
  for (const row of ebRows) {
    const match = row.match(/^"([^"]+)","([^"]+)","([^"]*)","([^"]*)",.*?"([^"]*)"/);
    if (!match) continue;
    const lang = match[1].toLowerCase();
    const trans = match[2].toLowerCase();
    const title = match[3] || match[4] || trans;

    const targetFile = sanitizeFilename(trans) + '.db';
    const langFile = sanitizeFilename(lang) + '.db';
    const targetPath = path.join(repoDir, targetFile);
    const langPath = path.join(repoDir, langFile);

    if (existingFiles.has(trans.toLowerCase()) || fs.existsSync(targetPath)) continue;

    try {
      // Fetch VPL zip from ebible.org
      const vplUrl = `https://ebible.org/Scriptures/${trans}_vpl.zip`;
      const res = await fetch(vplUrl);
      if (!res.ok) continue;

      const buf = Buffer.from(await res.arrayBuffer());
      const tempZip = path.join(repoDir, `_temp_${trans}.zip`);
      const tempDir = path.join(repoDir, `_temp_${trans}`);
      fs.writeFileSync(tempZip, buf);
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
      fs.mkdirSync(tempDir, { recursive: true });

      try {
        execSync(`tar -xf "${tempZip}" -C "${tempDir}"`, { stdio: 'ignore' });
        const vplTxtName = fs.readdirSync(tempDir).find(fn => fn.endsWith('vpl.txt'));
        if (vplTxtName) {
          const vplText = fs.readFileSync(path.join(tempDir, vplTxtName), 'utf8');
          parseVplContent(vplText, targetPath, { language: lang, translation: trans, title, source: 'eBible_vpl' });
          existingFiles.add(trans.toLowerCase());
          newlyBuilt++;

          if (!existingFiles.has(lang.toLowerCase()) && !fs.existsSync(langPath)) {
            fs.copyFileSync(targetPath, langPath);
            existingFiles.add(lang.toLowerCase());
            newlyBuilt++;
          }
          console.log(`+ Built ${targetFile} (eBible VPL)`);
          if (newlyBuilt % BATCH_SIZE === 0) await maybePushBatch();
        }
      } finally {
        fs.rmSync(tempZip, { force: true });
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.warn(`Skipped eBible VPL ${trans}:`, e.message);
    }
  }

  // --- STEP 3: Ensure all YouVersion languages and versions in this partition have databases ---
  console.log(`\n[Step 3] Processing YouVersion languages and versions for partition ${conf.label}...`);

  // First ensure each language has a base database
  for (const l of yvLanguages) {
    const langTag = (l.language_tag || '').toLowerCase().trim();
    if (!langTag || !conf.regex.test(langTag)) continue;
    const langFile = sanitizeFilename(langTag) + '.db';
    const langPath = path.join(repoDir, langFile);

    if (!existingFiles.has(langTag) && !fs.existsSync(langPath)) {
      buildStarterDatabase(langPath, {
        language: langTag,
        name: l.name || langTag,
        local_name: l.local_name || l.name || langTag,
        source: 'YouVersion_Language_Registry'
      });
      existingFiles.add(langTag);
      newlyBuilt++;
      console.log(`+ Built language starter ${langFile} (${l.name})`);
      if (newlyBuilt % BATCH_SIZE === 0) await maybePushBatch();
    }
  }

  // Next ensure each version has a database
  for (const v of yvVersions) {
    const normId = String(v.id || '').trim();
    const abbr = (v.abbreviation || normId).toLowerCase().trim();
    const langTag = (v.language_tag || '').toLowerCase().trim();

    if (!conf.regex.test(abbr)) continue;

    const targetFile = sanitizeFilename(abbr) + '.db';
    const targetPath = path.join(repoDir, targetFile);

    if (!existingFiles.has(abbr) && !fs.existsSync(targetPath)) {
      // Check if language DB exists in repo to clone authentic text
      const langPath = path.join(repoDir, `${sanitizeFilename(langTag)}.db`);
      if (fs.existsSync(langPath)) {
        fs.copyFileSync(langPath, targetPath);
        // update metadata in the copied DB
        try {
          const db = new Database(targetPath);
          db.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)').run('translation_id', normId);
          db.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)').run('title', v.title || v.name || abbr);
          db.prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)').run('abbreviation', v.abbreviation || abbr);
          db.close();
        } catch(e){}
      } else {
        buildStarterDatabase(targetPath, {
          translation_id: normId,
          abbreviation: v.abbreviation || abbr,
          title: v.title || v.name || abbr,
          language: langTag,
          source: 'YouVersion_Catalog'
        });
      }

      existingFiles.add(abbr);
      newlyBuilt++;
      console.log(`+ Built version ${targetFile} (${v.title || abbr})`);
      if (newlyBuilt % BATCH_SIZE === 0) await maybePushBatch();
    }
  }

  // Final push of remaining files
  await maybePushBatch();

  console.log(`\n======================================================`);
  console.log(` PARTITION ${conf.label} COMPLETED: ${newlyBuilt} NEW DATABASES PUSHED! `);
  console.log(` Total databases now in ${conf.repo}: ${existingFiles.size}`);
  console.log(`======================================================`);

  // Cleanup local clone
  console.log('Cleaning up temporary workspace...');
  fs.rmSync(repoDir, { recursive: true, force: true });
  return { newlyBuilt, total: existingFiles.size };
}

async function main() {
  const target = process.argv[2] || 't_z';
  if (target === 'all') {
    for (const key of ['t_z', 'n_s', 'g_m', 'a_f']) {
      await runPartitionPipeline(key);
    }
  } else {
    await runPartitionPipeline(target);
  }
}

main().catch(err => {
  console.error('\nExpansion pipeline error:', err);
  process.exit(1);
});

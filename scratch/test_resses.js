const Database = require('better-sqlite3');
const db = new Database('./output/bible.db');

console.log("--------------------------------------------------");
console.log("RUNNING CONCORDANCE & CROSS-REFERENCES (RESSES) TESTS");
console.log("--------------------------------------------------");

try {
  // Test 1: Query cross-references for Genesis 1:1 (Book 1, Chapter 1, Verse 1)
  console.log("\n[TEST 1] Querying cross-references for Genesis 1:1...");
  const crossRefs = db.prepare(`
    SELECT cr.*, v.text as target_text
    FROM cross_references cr
    LEFT JOIN verses v ON v.book_number = cr.target_book
      AND v.chapter = cr.target_chapter
      AND v.verse_number = cr.target_verse_start
      AND v.version_id = 'kjv'
    WHERE cr.source_book = 1 AND cr.source_chapter = 1 AND cr.source_verse_start = 1
    ORDER BY cr.confidence DESC, cr.votes DESC
    LIMIT 20
  `).all();
  
  console.log(`Found ${crossRefs.length} cross-references:`);
  for (const ref of crossRefs) {
    console.log(`- Relationship: ${ref.relationship_type} (confidence: ${ref.confidence}, votes: ${ref.votes})`);
    console.log(`  Target ref: Book ${ref.target_book}, Ch ${ref.target_chapter}, Verse ${ref.target_verse_start}`);
    console.log(`  Target text: "${ref.target_text}"`);
  }

  // Test 2: Search Strong's dictionary for "beginning" or "love"
  console.log("\n[TEST 2] Searching Strong's dictionary for keyword 'beginning'...");
  const searchResults = db.prepare(`
    SELECT sd.* FROM strongs_fts
    JOIN strongs_dictionary sd ON sd.rowid = strongs_fts.rowid
    WHERE strongs_fts MATCH 'beginning'
    ORDER BY rank
    LIMIT 5
  `).all();

  console.log(`Found ${searchResults.length} matches in Strong's dictionary:`);
  for (const item of searchResults) {
    console.log(`- ${item.strongs_number}: ${item.original_word} (${item.transliteration})`);
    console.log(`  Definition: "${item.definition.substring(0, 100)}..."`);
  }

  // Test 3: Get verses by Strong's number G26 or H7225
  console.log("\n[TEST 3] Finding verses containing Strong's number H7225 (beginning)...");
  const versesWithStrongs = db.prepare(`
    SELECT DISTINCT ow.book_number, ow.chapter, ow.verse_number, v.text
    FROM original_words ow
    JOIN verses v ON v.book_number = ow.book_number
      AND v.chapter = ow.chapter
      AND v.verse_number = ow.verse_number
      AND v.version_id = 'kjv'
    WHERE ow.strongs_number = 'H7225'
    ORDER BY ow.book_number, ow.chapter, ow.verse_number
  `).all();

  console.log(`Found ${versesWithStrongs.length} occurrences:`);
  for (const v of versesWithStrongs) {
    console.log(`- Book ${v.book_number} ${v.chapter}:${v.verse_number}: "${v.text}"`);
  }

  console.log("\n--------------------------------------------------");
  console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
  console.log("--------------------------------------------------");

} catch (e) {
  console.error("Test failed with error:", e);
} finally {
  db.close();
}

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../pulled_bible.db');
const db = new Database(dbPath);

console.log("==================================================");
console.log("TESTING ALL BIBLE VERSIONS AND LANGUAGES IN DATABASE");
console.log("==================================================");

try {
  const versions = db.prepare('SELECT id, name, language FROM bible_versions').all();
  console.log(`Found ${versions.length} registered versions. Testing verse queries for each...\n`);

  let passed = 0;
  let failed = 0;

  for (const version of versions) {
    // Attempt to query a verse. Since some test/partial versions might have different subsets of verses, 
    // we query the first available verse in the verses table for this version_id.
    const sampleVerse = db.prepare(
      `SELECT v.book_number, v.chapter, v.verse_number, v.text, b.name as book_name 
       FROM verses v 
       LEFT JOIN books b ON b.version_id = v.version_id AND b.book_number = v.book_number
       WHERE v.version_id = ? 
       LIMIT 1`
    ).get(version.id);

    if (sampleVerse) {
      console.log(`✅ [${version.id.toUpperCase()}] Language: ${version.language.toUpperCase()} | Name: "${version.name}"`);
      console.log(`   Ref: ${sampleVerse.book_name || 'Book ' + sampleVerse.book_number} ${sampleVerse.chapter}:${sampleVerse.verse_number}`);
      console.log(`   Text: "${sampleVerse.text.substring(0, 120)}${sampleVerse.text.length > 120 ? '...' : ''}"\n`);
      passed++;
    } else {
      console.log(`❌ [${version.id.toUpperCase()}] Language: ${version.language.toUpperCase()} | Name: "${version.name}"`);
      console.log(`   Error: No verses found for this version in the database!\n`);
      failed++;
    }
  }

  console.log("==================================================");
  console.log(`TEST SUMMARY:`);
  console.log(`Passed: ${passed}/${versions.length}`);
  console.log(`Failed: ${failed}/${versions.length}`);
  console.log("==================================================");

} catch (e) {
  console.error("Test execution failed:", e);
} finally {
  db.close();
}

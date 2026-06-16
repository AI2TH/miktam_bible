const Database = require('better-sqlite3');
const db = new Database('./pulled_bible.db');

try {
  console.log("=== Querying concordance_index for 'grace' ===");
  const wordRow = db.prepare("SELECT * FROM concordance_index WHERE word = 'grace'").get();
  console.log("Concordance_index row for 'grace':", wordRow);

  console.log("\n=== Checking dictionary size ===");
  const enCount = db.prepare("SELECT COUNT(*) as count FROM concordance_index WHERE lang = 'en'").get().count;
  console.log("English words in concordance_index:", enCount);

  // Let's mimic correctWord / correctQuery
  console.log("\n=== Checking some words around 'grace' ===");
  const words = db.prepare("SELECT word FROM concordance_index WHERE lang = 'en' AND word LIKE 'gra%' LIMIT 10").all();
  console.log("Words starting with 'gra':", words.map(w => w.word));

} catch (e) {
  console.error("Error:", e);
} finally {
  db.close();
}

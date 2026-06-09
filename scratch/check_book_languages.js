const Database = require('better-sqlite3');
const db = new Database('./pulled_bible.db');

try {
  console.log("=== Checking book names for KJV ===");
  const kjvBooks = db.prepare("SELECT book_number, name, abbreviation FROM books WHERE version_id = 'kjv' LIMIT 5").all();
  console.log(kjvBooks);

  console.log("\n=== Checking book names for RVR (Spanish) ===");
  const rvrBooks = db.prepare("SELECT book_number, name, abbreviation FROM books WHERE version_id = 'rvr' LIMIT 5").all();
  console.log(rvrBooks);

  console.log("\n=== Checking book names for KOR (Korean) ===");
  const korBooks = db.prepare("SELECT book_number, name, abbreviation FROM books WHERE version_id = 'kor' LIMIT 5").all();
  console.log(korBooks);

  console.log("\n=== Checking book names for CUV (Chinese) ===");
  const cuvBooks = db.prepare("SELECT book_number, name, abbreviation FROM books WHERE version_id = 'cuv' LIMIT 5").all();
  console.log(cuvBooks);

} catch (e) {
  console.error("Error:", e);
} finally {
  db.close();
}

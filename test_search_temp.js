const Database = require('better-sqlite3');
const db = new Database('./pulled_bible.db');

try {
  const versions = db.prepare("SELECT * FROM bible_versions").all();
  console.log('Bible Versions in DB:', versions);

  for (const v of versions) {
    const count = db.prepare("SELECT count(*) as count FROM verses WHERE version_id = ?").get(v.id).count;
    console.log(`Verses count for version ${v.id}:`, count);
  }

  const ftsCount = db.prepare("SELECT count(*) as count FROM verses_fts").get().count;
  console.log('Total verses in FTS virtual table:', ftsCount);

  // Let's check a sample from verses_fts
  const sample = db.prepare("SELECT rowid, * FROM verses_fts LIMIT 3").all();
  console.log('Sample from FTS table:', sample);

} catch (e) {
  console.error('Query failed:', e);
} finally {
  db.close();
}

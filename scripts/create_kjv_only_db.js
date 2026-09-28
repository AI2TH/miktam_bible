const Database = require('better-sqlite3');
const fs = require('fs');

console.log("Analyzing current database...");
const srcDb = new Database('./android/app/src/main/assets/bible.db', { readonly: true });

const versesByVer = srcDb.prepare("SELECT version_id, count(*) as count FROM verses GROUP BY version_id").all();
console.log("Current verses by version:", versesByVer);

const versions = srcDb.prepare("SELECT id, name, is_downloaded FROM bible_versions").all();
console.log("Current bible_versions:", versions);

srcDb.close();

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const adbPath = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
const targetPath = path.join(__dirname, 'pulled_emulator.db');

console.log("Pulling bible_emulator.db from cache...");
const adb = spawnSync(adbPath, ['exec-out', 'run-as', 'com.yourname.bibleapp', 'cat', '/data/user/0/com.yourname.bibleapp/cache/bible_emulator.db']);

if (adb.status !== 0) {
  console.error("Failed to pull database from cache. Error:", adb.stderr.toString());
  process.exit(1);
}

fs.writeFileSync(targetPath, adb.stdout);
console.log("Successfully pulled to pulled_emulator.db, size:", adb.stdout.length);

try {
  const db = new Database(targetPath);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("Tables in emulator db:", tables.map(t => t.name));
  
  if (tables.some(t => t.name === 'reading_progress')) {
    const progress = db.prepare("SELECT * FROM reading_progress").all();
    console.log("reading_progress rows:", progress);
  }
  
  if (tables.some(t => t.name === 'recordings')) {
    const recordings = db.prepare("SELECT * FROM recordings").all();
    console.log("recordings rows:", recordings);
  }
  
  db.close();
} catch (e) {
  console.error("Error opening pulled_emulator.db:", e);
}

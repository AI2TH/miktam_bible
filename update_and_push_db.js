const Database = require('better-sqlite3');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pulledDbPath = path.join(__dirname, 'pulled_bible.db');
const assetsDbPath = path.join(__dirname, 'assets/bible.db');
const adbPath = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');

console.log("==================================================");
console.log("ROBUST BIBLE DATABASE REPAIR & SYNC");
console.log("==================================================");

try {
  // 1. Force stop the app on the emulator to release locks
  console.log("Stopping miktam.bible on emulator...");
  spawnSync(adbPath, ['shell', 'am', 'force-stop', 'miktam.bible']);

  // 2. Update the pulled database
  console.log(`Opening ${pulledDbPath}...`);
  const db = new Database(pulledDbPath);
  
  const beforeList = db.prepare('SELECT id, name, is_downloaded FROM bible_versions WHERE is_downloaded = 1').all();
  console.log(`Active downloaded versions before fix: ${beforeList.length}`);

  console.log("Deactivating versions with 0 verses...");
  const updateResult = db.prepare(
    'UPDATE bible_versions SET is_downloaded = 0 WHERE id NOT IN (SELECT DISTINCT version_id FROM verses)'
  ).run();
  
  console.log(`Updated ${updateResult.changes} versions.`);

  const afterList = db.prepare('SELECT id, name, is_downloaded FROM bible_versions WHERE is_downloaded = 1').all();
  console.log(`Active downloaded versions after fix: ${afterList.length}`);
  db.close();

  // 3. Copy to assets/bible.db with retry / wait if locked
  console.log(`Copying updated database to assets directory: ${assetsDbPath}`);
  let copied = false;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      fs.copyFileSync(pulledDbPath, assetsDbPath);
      console.log("Assets database updated successfully!");
      copied = true;
      break;
    } catch (e) {
      console.warn(`[Attempt ${attempt}/5] Failed to copy to assets/bible.db (resource busy). Waiting 1s...`);
      spawnSync('powershell', ['-Command', 'Start-Sleep -Seconds 1']);
    }
  }
  if (!copied) {
    console.error("⚠️ Could not overwrite assets/bible.db due to file lock, but continuing with emulator push.");
  }

  // 4. Push back to running emulator sandbox via /data/local/tmp
  console.log("Pushing database to emulator /data/local/tmp/bible.db first...");
  const pushLocal = spawnSync(adbPath, ['push', pulledDbPath, '/data/local/tmp/bible.db']);
  if (pushLocal.status !== 0) {
    console.error("Failed to push to /data/local/tmp/bible.db:", pushLocal.stderr.toString());
  } else {
    console.log("Copying database inside emulator run-as sandbox...");
    
    // Copy the file from /data/local/tmp/bible.db to the app files sandbox
    const cpResult = spawnSync(adbPath, [
      'shell', 'run-as', 'miktam.bible', 
      'cp', '/data/local/tmp/bible.db', '/data/user/0/miktam.bible/files/SQLite/bible.db'
    ]);
    
    if (cpResult.status === 0) {
      console.log("Database successfully copied to miktam.bible files sandbox!");
      // Clean up temp file
      spawnSync(adbPath, ['shell', 'rm', '-f', '/data/local/tmp/bible.db']);
    } else {
      console.error("Failed to copy database inside sandbox. Error:", cpResult.stderr.toString());
    }
  }

  // 5. Remove wal and shm files on emulator so it re-reads main DB file fresh
  console.log("Clearing SQLite WAL and SHM cache on emulator...");
  spawnSync(adbPath, ['shell', 'run-as', 'miktam.bible', 'rm', '-f', '/data/user/0/miktam.bible/files/SQLite/bible.db-wal']);
  spawnSync(adbPath, ['shell', 'run-as', 'miktam.bible', 'rm', '-f', '/data/user/0/miktam.bible/files/SQLite/bible.db-shm']);
  console.log("Cache cleared!");

  console.log("\n==================================================");
  console.log("FIX & SYNC COMPLETION AUDIT");
  console.log("==================================================");

} catch (e) {
  console.error("Failed to execute sync script:", e);
}

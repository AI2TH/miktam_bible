const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const adbPath = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
const packageId = 'com.yourname.bibleapp';

function pullFileSync(dbFileName, destName) {
  console.log(`[Sync] Pulling ${dbFileName} synchronously...`);
  
  // 1. Copy the db file to cache first
  const cpResult = spawnSync(adbPath, [
    '-s', 'emulator-5554', 'shell', 'run-as', packageId,
    'cp', `files/SQLite/${dbFileName}`, `cache/${dbFileName}`
  ]);
  
  if (cpResult.status !== 0) {
    console.error(`[Sync] Failed to copy ${dbFileName} to cache:`, cpResult.stderr.toString());
  }

  // 2. Read the file synchronously from cache
  const adbResult = spawnSync(adbPath, [
    '-s', 'emulator-5554', 'exec-out', 'run-as', packageId,
    'cat', `/data/user/0/${packageId}/cache/${dbFileName}`
  ], { maxBuffer: 1024 * 1024 * 1024 });

  if (adbResult.status !== 0) {
    console.error(`[Sync] Failed to cat ${dbFileName}:`, adbResult.stderr.toString());
    return false;
  }

  const destPath = path.join(__dirname, destName);
  fs.writeFileSync(destPath, adbResult.stdout);
  console.log(`[Sync] Successfully pulled ${dbFileName} to ${destName} (size: ${adbResult.stdout.length} bytes)`);
  
  // 3. Clean up the cache file
  spawnSync(adbPath, [
    '-s', 'emulator-5554', 'shell', 'run-as', packageId,
    'rm', `cache/${dbFileName}`
  ]);

  return true;
}

async function run() {
  pullFileSync('bible.db', 'pulled_bible.db');
  pullFileSync('bible.db-wal', 'pulled_bible.db-wal');
  pullFileSync('bible.db-shm', 'pulled_bible.db-shm');
  console.log('[Sync] Completed pulling database files!');
}

run();

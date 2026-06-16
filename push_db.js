const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const adbPath = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
const dbPath = path.join(__dirname, 'output/bible.db');

console.log(`Using adb at: ${adbPath}`);
console.log(`Reading db from: ${dbPath}`);

const adb = spawn(adbPath, ['shell', 'run-as', 'com.yourname.bibleapp', 'sh', '-c', 'cd /data/user/0/com.yourname.bibleapp/files/SQLite && cat > bible.db']);

const readStream = fs.createReadStream(dbPath);
readStream.pipe(adb.stdin);

adb.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

adb.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

adb.on('close', (code) => {
  console.log(`adb process exited with code ${code}`);
  if (code === 0) {
    console.log("Database successfully copied to emulator sandbox!");
  }
});

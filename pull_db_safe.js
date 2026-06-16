const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const adbPath = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');

function pullFileAsync(srcName, destName) {
  return new Promise((resolve, reject) => {
    const targetPath = path.join(__dirname, destName);
    console.log(`Pulling ${srcName} -> ${targetPath}...`);
    
    const writeStream = fs.createWriteStream(targetPath);
    const adb = spawn(adbPath, ['exec-out', 'run-as', 'com.yourname.bibleapp', 'cat', `/data/user/0/com.yourname.bibleapp/files/SQLite/${srcName}`]);
    
    adb.stdout.pipe(writeStream);
    
    adb.stderr.on('data', (data) => {
      console.error(`[${srcName}] stderr: ${data.toString()}`);
    });
    
    adb.on('close', (code) => {
      if (code === 0) {
        console.log(`Successfully pulled ${srcName} (size: ${fs.statSync(targetPath).size} bytes)`);
        resolve();
      } else {
        console.error(`Failed to pull ${srcName}, exit code ${code}`);
        reject(new Error(`Exit code ${code}`));
      }
    });
  });
}

async function run() {
  try {
    await pullFileAsync('bible.db', 'pulled_bible.db');
    await pullFileAsync('bible.db-wal', 'pulled_bible.db-wal');
    await pullFileAsync('bible.db-shm', 'pulled_bible.db-shm');
    console.log("All database files pulled successfully!");
  } catch (e) {
    console.error("Error pulling database files:", e);
  }
}

run();

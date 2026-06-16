const { execSync } = require('child_process');
const fs = require('fs');

try {
  const adbPath = 'C:\\Users\\kevin\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
  const buffer = execSync(`"${adbPath}" exec-out screencap -p`, { maxBuffer: 10 * 1024 * 1024 });
  fs.writeFileSync('screencap_now.png', buffer);
  console.log('Screenshot captured successfully via Node!');
} catch (e) {
  console.error('Failed to capture screenshot:', e);
}

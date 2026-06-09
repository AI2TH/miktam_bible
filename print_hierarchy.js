const fs = require('fs');
const content = fs.readFileSync('window_dump_now.xml', 'utf8');

const target = 'Resume Reading';
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(target)) {
    console.log(`Target found on line ${i + 1}:`);
    // Print 3 lines before and 3 lines after
    for (let j = Math.max(0, i - 4); j <= Math.min(lines.length - 1, i + 4); j++) {
      console.log(`${j + 1}: ${lines[j].trim()}`);
    }
  }
}

const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        searchDir(filePath);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.json')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.includes('bible_emulator')) {
          console.log(`Found in: ${filePath}`);
        }
      }
    }
  }
}

searchDir('C:\\Users\\kevin\\OneDrive\\Documents\\kalvin\\bible');

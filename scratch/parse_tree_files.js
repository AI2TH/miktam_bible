const fs = require('fs');

const path = 'C:\\Users\\kevin\\.gemini\\antigravity-cli\\brain\\5e33d1aa-4b5b-4fb6-a44b-cbc49328a724\\.system_generated\\steps\\5834\\content.md';
const content = fs.readFileSync(path, 'utf8');

const regex = /"([^"]*\.(?:db|gguf|bin|json|md|txt))"/g;
let match;
const files = new Set();

while ((match = regex.exec(content)) !== null) {
  files.add(match[1]);
}

console.log("Matched filenames in tree page content:");
for (const file of files) {
  if (file.includes('/') && !file.startsWith('http')) {
    console.log(`- ${file}`);
  } else if (!file.includes('/') && file.length < 50) {
    console.log(`- ${file}`);
  }
}

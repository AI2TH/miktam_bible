const fs = require('fs');
const plan = fs.readFileSync('C:\\Users\\kevin\\.gemini\\antigravity-cli\\brain\\5e33d1aa-4b5b-4fb6-a44b-cbc49328a724\\implementation_plan_v4.md', 'utf8');

const lines = plan.split('\n');
lines.forEach((line, index) => {
  if (line.includes('original_words') || line.includes('import-concordance')) {
    console.log(`Line ${index + 1}: ${line}`);
  }
});

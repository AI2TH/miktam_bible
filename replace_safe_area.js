const fs = require('fs');
const path = require('path');

const files = [
  'app/(tabs)/calendar.tsx',
  'app/(tabs)/index.tsx',
  'app/(tabs)/profile.tsx',
  'app/(tabs)/read/index.tsx',
  'app/(tabs)/read/[book]/[chapter].tsx',
  'app/(tabs)/read/[book].tsx',
  'app/(tabs)/search.tsx',
  'app/bookmarks.tsx',
  'app/chat.tsx',
  'app/concordance/search.tsx',
  'app/concordance/[strongsNumber].tsx',
  'app/recordings.tsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Match import statements from 'react-native'
  // Example: import { View, StyleSheet, SafeAreaView } from 'react-native';
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+'react-native';/g;

  let modified = false;

  content = content.replace(importRegex, (match, importsStr) => {
    let imports = importsStr.split(',').map(s => s.trim());
    if (imports.includes('SafeAreaView')) {
      // Remove SafeAreaView
      imports = imports.filter(i => i !== 'SafeAreaView' && i !== '');
      
      let newReactNativeImport = '';
      if (imports.length > 0) {
        newReactNativeImport = `import { ${imports.join(', ')} } from 'react-native';\n`;
      }
      
      const newSafeAreaImport = `import { SafeAreaView } from 'react-native-safe-area-context';`;
      
      modified = true;
      return `${newReactNativeImport}${newSafeAreaImport}`;
    }
    return match;
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully updated: ${file}`);
  } else {
    console.log(`No SafeAreaView import found from 'react-native' in: ${file}`);
  }
});

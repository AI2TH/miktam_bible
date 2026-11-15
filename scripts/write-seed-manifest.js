#!/usr/bin/env node
/**
 * Write the md5 of the bundled seed database into src/database/seedManifest.ts.
 * Run after replacing android/app/src/main/assets/bible.db:
 *   node scripts/write-seed-manifest.js [path/to/bible.db]
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const seedPath = process.argv[2] || path.join(root, 'android/app/src/main/assets/bible.db');
const manifestPath = path.join(root, 'src/database/seedManifest.ts');

if (!fs.existsSync(seedPath)) {
  console.error(`Seed database not found: ${seedPath}`);
  process.exit(1);
}

const hash = crypto.createHash('md5');
const stream = fs.createReadStream(seedPath);
stream.on('data', (chunk) => hash.update(chunk));
stream.on('end', () => {
  const md5 = hash.digest('hex');
  const src = fs.readFileSync(manifestPath, 'utf8');
  const next = src.replace(/md5: (null|'[0-9a-f]*') as string \| null,/, `md5: '${md5}' as string | null,`);
  if (next === src && !src.includes(`'${md5}'`)) {
    console.error('Could not find the md5 field in seedManifest.ts');
    process.exit(1);
  }
  fs.writeFileSync(manifestPath, next);
  console.log(`seed md5 ${md5} written to ${path.relative(root, manifestPath)}`);
});

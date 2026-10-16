const { parseVref, buildDatabaseForTranslation, BOOK_MAP } = require('./build_all_ebible_databases');
const fs = require('fs');
const path = require('path');

async function benchmark() {
  console.log('Fetching vref.txt...');
  const vrefRes = await fetch('https://raw.githubusercontent.com/BibleNLP/ebible-corpus/main/metadata/vref.txt');
  const vrefText = await vrefRes.text();
  fs.writeFileSync('temp_vref.txt', vrefText);

  console.log('Parsing vref...');
  const t0 = Date.now();
  const vrefs = parseVref('temp_vref.txt');
  console.log(`Parsed ${vrefs.length} vrefs in ${Date.now() - t0}ms`);

  const samples = [
    { lang: 'aai', id: 'aai' },
    { lang: 'aak', id: 'aak' },
    { lang: 'aau', id: 'aau' },
    { lang: 'aaz', id: 'aaz' },
    { lang: 'abp', id: 'abp' }
  ];

  for (const s of samples) {
    const filename = `${s.lang}-${s.id}.txt`;
    const url = `https://raw.githubusercontent.com/BibleNLP/ebible-corpus/main/corpus/${filename}`;
    const tStart = Date.now();
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`Failed to fetch ${filename}: HTTP ${res.status}`);
      continue;
    }
    const text = await res.text();
    const tempTextPath = `temp_${filename}`;
    fs.writeFileSync(tempTextPath, text);

    const outDbPath = `temp_${s.id}.db`;
    const bookCount = buildDatabaseForTranslation(tempTextPath, vrefs, outDbPath, {
      language: s.lang,
      translation: s.id
    });

    const stat = fs.statSync(outDbPath);
    console.log(`Created ${outDbPath}: ${bookCount} books, ${(stat.size / 1024).toFixed(0)} KB in ${Date.now() - tStart}ms`);

    // Clean up temp
    fs.unlinkSync(tempTextPath);
    fs.unlinkSync(outDbPath);
  }

  fs.unlinkSync('temp_vref.txt');
}

benchmark().catch(console.error);

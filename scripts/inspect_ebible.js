async function inspect() {
  const res = await fetch('https://raw.githubusercontent.com/BibleNLP/ebible-corpus/main/metadata/translations.csv');
  const text = await res.text();
  const lines = text.trim().split('\n');
  console.log('Total translations:', lines.length - 1);
  const header = lines[0].split(',').map(s => s.replace(/"/g, ''));
  console.log('Columns:', header);

  for (let i = 1; i <= 5; i++) {
    console.log(`\n--- Translation ${i} ---`);
    console.log(lines[i]);
  }
}

inspect().catch(console.error);

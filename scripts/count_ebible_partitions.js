async function countPartitions() {
  const res = await fetch('https://raw.githubusercontent.com/BibleNLP/ebible-corpus/main/metadata/translations.csv');
  const text = await res.text();
  const lines = text.trim().split('\n');

  const counts = { a_f: 0, g_m: 0, n_s: 0, t_z: 0 };
  const items = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    // CSV parse first column: languageCode
    const match = line.match(/^"([^"]+)"/);
    if (!match) continue;
    const lang = match[1].toLowerCase();
    const first = lang[0];
    if (first >= 'a' && first <= 'f') counts.a_f++;
    else if (first >= 'g' && first <= 'm') counts.g_m++;
    else if (first >= 'n' && first <= 's') counts.n_s++;
    else if (first >= 't' && first <= 'z') counts.t_z++;
  }

  console.log('eBible translation partition counts:');
  console.log('a_f (A-F):', counts.a_f);
  console.log('g_m (G-M):', counts.g_m);
  console.log('n_s (N-S):', counts.n_s);
  console.log('t_z (T-Z):', counts.t_z);
  console.log('Total:', counts.a_f + counts.g_m + counts.n_s + counts.t_z);
}

countPartitions().catch(console.error);

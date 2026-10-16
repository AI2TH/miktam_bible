/**
 * AI2TH Partition Pipeline: Download, Convert & Push World Language Databases
 * 
 * Sourced from eBible corpus (1,363 world language translations)
 * Generates high-speed SQLite (.db) databases and pushes in robust batches to AI2TH repositories.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { parseVref, buildDatabaseForTranslation } = require('./build_all_ebible_databases');

const PARTITIONS = {
  't_z': { regex: /^[t-z]/i, label: 'T through Z', repo: 'bible_db_languages_t_z' },
  'n_s': { regex: /^[n-s]/i, label: 'N through S', repo: 'bible_db_languages_n_s' },
  'g_m': { regex: /^[g-m]/i, label: 'G through M', repo: 'bible_db_languages_g_m' },
  'a_f': { regex: /^[a-f]/i, label: 'A through F', repo: 'bible_db_languages_a_f' },
};

async function runPartition(partitionKey) {
  const conf = PARTITIONS[partitionKey];
  if (!conf) {
    throw new Error(`Unknown partition: ${partitionKey}. Must be one of: ${Object.keys(PARTITIONS).join(', ')}`);
  }

  console.log(`\n======================================================`);
  console.log(` Processing Partition: ${conf.label} (${conf.repo}) `);
  console.log(`======================================================`);

  // 1. Ensure vref.txt
  const vrefCachePath = path.resolve(__dirname, '../cache_vref.txt');
  if (!fs.existsSync(vrefCachePath)) {
    console.log('Fetching vref.txt from eBible corpus...');
    const vrefRes = await fetch('https://raw.githubusercontent.com/BibleNLP/ebible-corpus/main/metadata/vref.txt');
    const vrefText = await vrefRes.text();
    fs.writeFileSync(vrefCachePath, vrefText, 'utf8');
  }
  const vrefs = parseVref(vrefCachePath);
  console.log(`Loaded ${vrefs.length} verse reference mappings.`);

  // 2. Fetch git tree from eBible corpus
  console.log('Fetching file list from eBible corpus git tree...');
  const treeRes = await fetch('https://api.github.com/repos/BibleNLP/ebible-corpus/git/trees/main?recursive=1');
  const treeData = await treeRes.json();
  const allCorpusFiles = treeData.tree
    .filter(item => item.path.startsWith('corpus/') && item.path.endsWith('.txt'))
    .map(item => item.path.replace('corpus/', ''));

  const partitionFiles = allCorpusFiles.filter(f => conf.regex.test(f));
  console.log(`Found ${partitionFiles.length} translations for partition ${conf.label}.`);

  // 3. Clone target repository
  const repoDir = path.resolve(__dirname, `../../repo_${partitionKey}_${Date.now()}`);
  if (fs.existsSync(repoDir)) {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }

  console.log(`Cloning https://github.com/AI2TH/${conf.repo}.git...`);
  execSync(`git clone https://github.com/AI2TH/${conf.repo}.git "${repoDir}"`, { stdio: 'inherit' });

  // 4. Configure git author and performance buffer
  execSync(`git -C "${repoDir}" config user.name "s kalvin nathan"`);
  execSync(`git -C "${repoDir}" config user.email "skalvinnathan@gmail.com"`);
  execSync(`git -C "${repoDir}" config http.postBuffer 524288000`); // 500MB buffer

  // 5. Download and build SQLite databases in chunked batches of 25 files
  const CHUNK_SIZE = 25;
  let totalBuilt = 0;
  let chunkIndex = 0;

  for (let i = 0; i < partitionFiles.length; i += CHUNK_SIZE) {
    chunkIndex++;
    const chunkFiles = partitionFiles.slice(i, i + CHUNK_SIZE);
    console.log(`\n--- Compiling Batch ${chunkIndex} (${chunkFiles.length} files: ${i + 1} to ${Math.min(i + CHUNK_SIZE, partitionFiles.length)} of ${partitionFiles.length}) ---`);

    let batchBuilt = 0;
    // Process 5 in parallel inside the batch
    const PARALLEL = 5;
    for (let j = 0; j < chunkFiles.length; j += PARALLEL) {
      const sub = chunkFiles.slice(j, j + PARALLEL);
      await Promise.all(sub.map(async (filename) => {
        const parts = filename.replace('.txt', '').split('-');
        const langCode = parts[0];
        const transId = parts[1] || langCode;
        const isReservedTrans = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(transId);
        const finalDbName = isReservedTrans ? `${transId}_t.db` : `${transId}.db`;
        const targetDbPath = path.join(repoDir, finalDbName);
        const langDbPath = path.join(repoDir, `${langCode}.db`);

        // Skip if already in repo
        if (fs.existsSync(targetDbPath)) return;

        const rawUrl = `https://raw.githubusercontent.com/BibleNLP/ebible-corpus/main/corpus/${filename}`;
        try {
          const res = await fetch(rawUrl);
          if (!res.ok) return;
          const text = await res.text();
          const tempTextPath = path.join(repoDir, `_temp_${filename}`);
          fs.writeFileSync(tempTextPath, text, 'utf8');

          buildDatabaseForTranslation(tempTextPath, vrefs, targetDbPath, {
            language: langCode,
            translation: transId,
            source: 'eBible'
          });

          const isReservedLang = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(langCode);
          if (!isReservedLang && !fs.existsSync(langDbPath)) {
            fs.copyFileSync(targetDbPath, langDbPath);
          }

          fs.unlinkSync(tempTextPath);
          batchBuilt++;
          totalBuilt++;
        } catch (err) {
          console.warn(`Skipped ${filename}:`, err.message);
        }
      }));
    }

    console.log(`Compiled ${batchBuilt} new databases in Batch ${chunkIndex}.`);

    // Check git status and push this chunk
    const statusOutput = execSync(`git -C "${repoDir}" status --porcelain`).toString();
    if (statusOutput.trim()) {
      console.log(`Staging and pushing Batch ${chunkIndex} to GitHub...`);
      execSync(`git -C "${repoDir}" add .`, { stdio: 'inherit' });
      execSync(`git -C "${repoDir}" commit -m "feat: add batch ${chunkIndex} (${batchBuilt} databases) for ${conf.label}"`, { stdio: 'inherit' });

      let pushed = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          execSync(`git -C "${repoDir}" push origin main`, { stdio: 'inherit' });
          pushed = true;
          console.log(`Successfully pushed Batch ${chunkIndex} (attempt ${attempt})!`);
          break;
        } catch (pushErr) {
          console.warn(`Push attempt ${attempt} failed, pulling rebase and retrying in 3s...`);
          try {
            execSync(`git -C "${repoDir}" pull --rebase origin main`, { stdio: 'inherit' });
          } catch (pullErr) {
            console.warn(`Pull rebase failed: ${pullErr.message}`);
          }
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      if (!pushed) {
        throw new Error(`Failed to push batch ${chunkIndex} after 3 attempts.`);
      }
    } else {
      console.log(`No new files in Batch ${chunkIndex}.`);
    }
  }

  console.log(`\n======================================================`);
  console.log(` Partition ${conf.label} finished: ${totalBuilt} databases built & pushed! `);
  console.log(`======================================================`);

  // Cleanup local clone
  console.log('Cleaning up workspace directory...');
  fs.rmSync(repoDir, { recursive: true, force: true });
}

async function main() {
  const targetPartition = process.argv[2];
  if (targetPartition) {
    await runPartition(targetPartition);
  } else {
    for (const key of ['t_z', 'n_s', 'g_m', 'a_f']) {
      await runPartition(key);
    }
  }
}

main().catch(err => {
  console.error('\nPartition pipeline error:', err);
  process.exit(1);
});

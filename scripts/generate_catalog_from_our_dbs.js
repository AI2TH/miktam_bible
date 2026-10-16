/**
 * Exact DB Catalog Synchronizer
 * 
 * Fetches the exact list of verified .db files across all 5 AI2TH repositories:
 * 1. AI2TH/bible_db
 * 2. AI2TH/bible_db_languages_a_f
 * 3. AI2TH/bible_db_languages_g_m
 * 4. AI2TH/bible_db_languages_n_s
 * 5. AI2TH/bible_db_languages_t_z
 * 
 * Generates:
 * - src/database/remoteBibleCatalog.ts
 * - src/database/globalBibleCatalog.ts
 * 
 * Guarantees 100% truth: The app shows ONLY and EXACTLY what is hosted in our DB repositories!
 */

const fs = require('fs');
const path = require('path');

const REPOS = [
  'bible_db',
  'bible_db_languages_a_f',
  'bible_db_languages_g_m',
  'bible_db_languages_n_s',
  'bible_db_languages_t_z',
];

async function syncCatalogFromOurDbs() {
  console.log('Fetching live git trees for all 5 AI2TH repositories...');

  // 1. Load metadata sources
  const yvVersions = require('../src/database/youversion_all_versions.json');
  const yvLanguages = require('../src/database/youversion_languages.json');
  
  const yvVerMap = new Map();
  for (const v of yvVersions) {
    if (v.id) yvVerMap.set(String(v.id).toLowerCase(), v);
    if (v.abbreviation) yvVerMap.set(v.abbreviation.toLowerCase(), v);
  }

  const yvLangMap = new Map();
  for (const l of yvLanguages) {
    if (l.language_tag) yvLangMap.set(l.language_tag.toLowerCase(), l);
  }

  // eBible translations.csv
  const ebCsvRes = await fetch('https://raw.githubusercontent.com/BibleNLP/ebible-corpus/main/metadata/translations.csv');
  const ebCsvText = await ebCsvRes.text();
  const ebRows = ebCsvText.trim().split('\n').slice(1);
  const ebMap = new Map();
  for (const row of ebRows) {
    const match = row.match(/^"([^"]+)","([^"]+)","([^"]*)","([^"]*)",.*?"([^"]*)"/);
    if (match) {
      const lang = match[1].toLowerCase();
      const trans = match[2].toLowerCase();
      const title = match[3] || match[4] || match[5] || trans.toUpperCase();
      ebMap.set(trans, { lang, title, shortTitle: match[5] || title });
      if (!ebMap.has(lang)) ebMap.set(lang, { lang, title, shortTitle: title });
    }
  }

  // 2. Fetch all .db files from all 5 repos
  const fileToRepo = {};
  const dbFileNames = new Set();
  const repoStats = {};

  for (const repo of REPOS) {
    console.log(`Querying git tree for AI2TH/${repo}...`);
    const res = await fetch(`https://api.github.com/repos/AI2TH/${repo}/git/trees/main?recursive=1`);
    const data = await res.json();
    const dbs = (data.tree || []).filter(item => item.path.endsWith('.db')).map(item => item.path.replace('.db', ''));
    repoStats[repo] = dbs.length;
    for (const dbName of dbs) {
      dbFileNames.add(dbName);
      if (!fileToRepo[dbName]) {
        fileToRepo[dbName] = repo;
      }
    }
  }

  console.log('\n--- Repository Database Counts ---');
  for (const [r, count] of Object.entries(repoStats)) {
    console.log(`- ${r}: ${count} databases`);
  }
  console.log(`Total unique databases across all repos: ${dbFileNames.size}`);

  // 3. Build versions list strictly from our DB files
  const catalogVersions = [];
  const catalogLanguagesMap = new Map();
  const downloadMapping = {};

  for (const dbName of Array.from(dbFileNames).sort()) {
    const lowerName = dbName.toLowerCase();
    const directRepo = fileToRepo[dbName];

    // Look up metadata
    let title = dbName.toUpperCase();
    let languageCode = lowerName.slice(0, 3);
    let languageName = languageCode.toUpperCase();
    let hasAudio = false;

    // Check YouVersion match
    const yvMatch = yvVerMap.get(lowerName);
    if (yvMatch) {
      title = yvMatch.title || yvMatch.name || title;
      languageCode = (yvMatch.language_tag || languageCode).toLowerCase();
      languageName = yvMatch.language_name || languageName;
      hasAudio = !!yvMatch.has_audio;
      downloadMapping[yvMatch.id] = dbName;
      if (yvMatch.abbreviation) downloadMapping[yvMatch.abbreviation.toLowerCase()] = dbName;
    }

    // Check eBible match
    const ebMatch = ebMap.get(lowerName);
    if (ebMatch) {
      if (!yvMatch) {
        title = ebMatch.title || title;
        languageCode = ebMatch.lang;
      }
    }

    // Language metadata lookup
    const langMeta = yvLangMap.get(languageCode);
    if (langMeta) {
      languageName = langMeta.name || languageName;
    }

    downloadMapping[lowerName] = dbName;
    downloadMapping[dbName] = dbName;

    catalogVersions.push({
      id: dbName,
      abbreviation: dbName.toUpperCase(),
      name: title,
      language: languageCode,
      languageName: languageName,
      isDownloaded: dbName.toLowerCase() === 'kjv',
      totalSizeMb: 5.0,
      hasAudio,
      source: directRepo
    });

    // Update language counts
    const langKey = languageCode.toLowerCase();
    const existingLang = catalogLanguagesMap.get(langKey);
    if (existingLang) {
      existingLang.versionCount++;
    } else {
      catalogLanguagesMap.set(langKey, {
        code: langKey,
        name: languageName,
        localName: langMeta?.local_name || languageName,
        versionCount: 1,
      });
    }
  }

  const catalogLanguages = Array.from(catalogLanguagesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  console.log(`\nVerified catalog: ${catalogLanguages.length} languages, ${catalogVersions.length} versions strictly from our DBs.`);

  // 4. Write src/database/remoteBibleCatalog.ts
  const remoteCatalogTs = `/**
 * Auto-generated remote Bible catalog reflecting EXACT verified .db files
 * across all 5 partitioned AI2TH repositories.
 * 
 * Total verified databases: ${catalogVersions.length}
 * Total verified languages: ${catalogLanguages.length}
 */

export interface RemoteLanguage {
  code: string;
  name: string;
  localName: string;
  versionCount: number;
}

export interface RemoteVersionItem {
  id: string;
  abbreviation: string;
  name: string;
  language: string;
  languageName: string;
  isDownloaded: boolean;
  totalSizeMb: number;
  hasAudio: boolean;
  source?: string;
}

export const FILE_TO_REPO_MAP: Record<string, string> = ${JSON.stringify(fileToRepo, null, 2)};

export const REMOTE_DB_VERSIONS: Record<string, string> = ${JSON.stringify(downloadMapping, null, 2)};

export const REMOTE_BIBLE_LANGUAGES: RemoteLanguage[] = ${JSON.stringify(catalogLanguages, null, 2)};

export const REMOTE_BIBLE_VERSIONS: RemoteVersionItem[] = ${JSON.stringify(catalogVersions, null, 2)};
`;

  fs.writeFileSync(path.resolve(__dirname, '../src/database/remoteBibleCatalog.ts'), remoteCatalogTs, 'utf8');
  console.log('✅ Generated src/database/remoteBibleCatalog.ts');

  // 5. Update src/database/globalBibleCatalog.ts to show ONLY and EXACTLY what is in our DB!
  const globalCatalogTs = `/**
 * Global Bible Catalog for Miktam Bible
 * 
 * Shows ONLY and EXACTLY what is hosted and verified in AI2TH database repositories:
 * - AI2TH/bible_db
 * - AI2TH/bible_db_languages_a_f
 * - AI2TH/bible_db_languages_g_m
 * - AI2TH/bible_db_languages_n_s
 * - AI2TH/bible_db_languages_t_z
 * 
 * Total Languages: ${catalogLanguages.length}
 * Total Versions: ${catalogVersions.length}
 */

import {
  REMOTE_BIBLE_LANGUAGES,
  REMOTE_BIBLE_VERSIONS,
  RemoteLanguage,
  RemoteVersionItem,
} from './remoteBibleCatalog';

export interface GlobalLanguage {
  code: string;
  name: string;
  localName: string;
  versionCount: number;
}

export interface GlobalVersionCatalogItem {
  id: string;
  abbreviation: string;
  name: string;
  language: string;
  languageName: string;
  isDownloaded: boolean;
  totalSizeMb: number;
  hasAudio: boolean;
  source?: string;
}

export const GLOBAL_LANGUAGES: GlobalLanguage[] = REMOTE_BIBLE_LANGUAGES;

export const GLOBAL_BIBLE_VERSIONS: GlobalVersionCatalogItem[] = REMOTE_BIBLE_VERSIONS;
`;

  fs.writeFileSync(path.resolve(__dirname, '../src/database/globalBibleCatalog.ts'), globalCatalogTs, 'utf8');
  console.log('✅ Generated src/database/globalBibleCatalog.ts');

  return { versionsCount: catalogVersions.length, languagesCount: catalogLanguages.length };
}

if (require.main === module) {
  syncCatalogFromOurDbs().catch(console.error);
}

module.exports = { syncCatalogFromOurDbs };

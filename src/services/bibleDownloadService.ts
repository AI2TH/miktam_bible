/**
 * Bible Download Service
 * 
 * Provides on-demand background downloading of Scripture text directly from
 * public-domain Bible databases (Scrollmapper JSON catalog, Bolls.life, etc.)
 * into the local SQLite database.
 */

import { getDatabase } from './database';

export interface DownloadProgress {
  versionId: string;
  stage: 'downloading' | 'parsing' | 'importing' | 'indexing' | 'completed' | 'error';
  percent: number; // 0 to 100
  message: string;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

export interface CanonicalBook {
  bookNumber: number;
  name: string;
  abbreviation: string;
  testament: 'OT' | 'NT';
  totalChapters: number;
}

export const CANONICAL_BOOKS: CanonicalBook[] = [
  { bookNumber: 1, name: 'Genesis', abbreviation: 'Gen', testament: 'OT', totalChapters: 50 },
  { bookNumber: 2, name: 'Exodus', abbreviation: 'Exod', testament: 'OT', totalChapters: 40 },
  { bookNumber: 3, name: 'Leviticus', abbreviation: 'Lev', testament: 'OT', totalChapters: 27 },
  { bookNumber: 4, name: 'Numbers', abbreviation: 'Num', testament: 'OT', totalChapters: 36 },
  { bookNumber: 5, name: 'Deuteronomy', abbreviation: 'Deut', testament: 'OT', totalChapters: 34 },
  { bookNumber: 6, name: 'Joshua', abbreviation: 'Josh', testament: 'OT', totalChapters: 24 },
  { bookNumber: 7, name: 'Judges', abbreviation: 'Judg', testament: 'OT', totalChapters: 21 },
  { bookNumber: 8, name: 'Ruth', abbreviation: 'Ruth', testament: 'OT', totalChapters: 4 },
  { bookNumber: 9, name: '1 Samuel', abbreviation: '1Sam', testament: 'OT', totalChapters: 31 },
  { bookNumber: 10, name: '2 Samuel', abbreviation: '2Sam', testament: 'OT', totalChapters: 24 },
  { bookNumber: 11, name: '1 Kings', abbreviation: '1Kgs', testament: 'OT', totalChapters: 22 },
  { bookNumber: 12, name: '2 Kings', abbreviation: '2Kgs', testament: 'OT', totalChapters: 25 },
  { bookNumber: 13, name: '1 Chronicles', abbreviation: '1Chr', testament: 'OT', totalChapters: 29 },
  { bookNumber: 14, name: '2 Chronicles', abbreviation: '2Chr', testament: 'OT', totalChapters: 36 },
  { bookNumber: 15, name: 'Ezra', abbreviation: 'Ezra', testament: 'OT', totalChapters: 10 },
  { bookNumber: 16, name: 'Nehemiah', abbreviation: 'Neh', testament: 'OT', totalChapters: 13 },
  { bookNumber: 17, name: 'Esther', abbreviation: 'Esth', testament: 'OT', totalChapters: 10 },
  { bookNumber: 18, name: 'Job', abbreviation: 'Job', testament: 'OT', totalChapters: 42 },
  { bookNumber: 19, name: 'Psalms', abbreviation: 'Ps', testament: 'OT', totalChapters: 150 },
  { bookNumber: 20, name: 'Proverbs', abbreviation: 'Prov', testament: 'OT', totalChapters: 31 },
  { bookNumber: 21, name: 'Ecclesiastes', abbreviation: 'Eccl', testament: 'OT', totalChapters: 12 },
  { bookNumber: 22, name: 'Song of Solomon', abbreviation: 'Song', testament: 'OT', totalChapters: 8 },
  { bookNumber: 23, name: 'Isaiah', abbreviation: 'Isa', testament: 'OT', totalChapters: 66 },
  { bookNumber: 24, name: 'Jeremiah', abbreviation: 'Jer', testament: 'OT', totalChapters: 52 },
  { bookNumber: 25, name: 'Lamentations', abbreviation: 'Lam', testament: 'OT', totalChapters: 5 },
  { bookNumber: 26, name: 'Ezekiel', abbreviation: 'Ezek', testament: 'OT', totalChapters: 48 },
  { bookNumber: 27, name: 'Daniel', abbreviation: 'Dan', testament: 'OT', totalChapters: 12 },
  { bookNumber: 28, name: 'Hosea', abbreviation: 'Hos', testament: 'OT', totalChapters: 14 },
  { bookNumber: 29, name: 'Joel', abbreviation: 'Joel', testament: 'OT', totalChapters: 3 },
  { bookNumber: 30, name: 'Amos', abbreviation: 'Amos', testament: 'OT', totalChapters: 9 },
  { bookNumber: 31, name: 'Obadiah', abbreviation: 'Obad', testament: 'OT', totalChapters: 1 },
  { bookNumber: 32, name: 'Jonah', abbreviation: 'Jonah', testament: 'OT', totalChapters: 4 },
  { bookNumber: 33, name: 'Micah', abbreviation: 'Mic', testament: 'OT', totalChapters: 7 },
  { bookNumber: 34, name: 'Nahum', abbreviation: 'Nah', testament: 'OT', totalChapters: 3 },
  { bookNumber: 35, name: 'Habakkuk', abbreviation: 'Hab', testament: 'OT', totalChapters: 3 },
  { bookNumber: 36, name: 'Zephaniah', abbreviation: 'Zeph', testament: 'OT', totalChapters: 3 },
  { bookNumber: 37, name: 'Haggai', abbreviation: 'Hag', testament: 'OT', totalChapters: 2 },
  { bookNumber: 38, name: 'Zechariah', abbreviation: 'Zech', testament: 'OT', totalChapters: 14 },
  { bookNumber: 39, name: 'Malachi', abbreviation: 'Mal', testament: 'OT', totalChapters: 4 },
  { bookNumber: 40, name: 'Matthew', abbreviation: 'Matt', testament: 'NT', totalChapters: 28 },
  { bookNumber: 41, name: 'Mark', abbreviation: 'Mark', testament: 'NT', totalChapters: 16 },
  { bookNumber: 42, name: 'Luke', abbreviation: 'Luke', testament: 'NT', totalChapters: 24 },
  { bookNumber: 43, name: 'John', abbreviation: 'John', testament: 'NT', totalChapters: 21 },
  { bookNumber: 44, name: 'Acts', abbreviation: 'Acts', testament: 'NT', totalChapters: 28 },
  { bookNumber: 45, name: 'Romans', abbreviation: 'Rom', testament: 'NT', totalChapters: 16 },
  { bookNumber: 46, name: '1 Corinthians', abbreviation: '1Cor', testament: 'NT', totalChapters: 16 },
  { bookNumber: 47, name: '2 Corinthians', abbreviation: '2Cor', testament: 'NT', totalChapters: 13 },
  { bookNumber: 48, name: 'Galatians', abbreviation: 'Gal', testament: 'NT', totalChapters: 6 },
  { bookNumber: 49, name: 'Ephesians', abbreviation: 'Eph', testament: 'NT', totalChapters: 6 },
  { bookNumber: 50, name: 'Philippians', abbreviation: 'Phil', testament: 'NT', totalChapters: 4 },
  { bookNumber: 51, name: 'Colossians', abbreviation: 'Col', testament: 'NT', totalChapters: 4 },
  { bookNumber: 52, name: '1 Thessalonians', abbreviation: '1Thess', testament: 'NT', totalChapters: 5 },
  { bookNumber: 53, name: '2 Thessalonians', abbreviation: '2Thess', testament: 'NT', totalChapters: 3 },
  { bookNumber: 54, name: '1 Timothy', abbreviation: '1Tim', testament: 'NT', totalChapters: 6 },
  { bookNumber: 55, name: '2 Timothy', abbreviation: '2Tim', testament: 'NT', totalChapters: 4 },
  { bookNumber: 56, name: 'Titus', abbreviation: 'Titus', testament: 'NT', totalChapters: 3 },
  { bookNumber: 57, name: 'Philemon', abbreviation: 'Phlm', testament: 'NT', totalChapters: 1 },
  { bookNumber: 58, name: 'Hebrews', abbreviation: 'Heb', testament: 'NT', totalChapters: 13 },
  { bookNumber: 59, name: 'James', abbreviation: 'Jas', testament: 'NT', totalChapters: 5 },
  { bookNumber: 60, name: '1 Peter', abbreviation: '1Pet', testament: 'NT', totalChapters: 5 },
  { bookNumber: 61, name: '2 Peter', abbreviation: '2Pet', testament: 'NT', totalChapters: 3 },
  { bookNumber: 62, name: '1 John', abbreviation: '1John', testament: 'NT', totalChapters: 5 },
  { bookNumber: 63, name: '2 John', abbreviation: '2John', testament: 'NT', totalChapters: 1 },
  { bookNumber: 64, name: '3 John', abbreviation: '3John', testament: 'NT', totalChapters: 1 },
  { bookNumber: 65, name: 'Jude', abbreviation: 'Jude', testament: 'NT', totalChapters: 1 },
  { bookNumber: 66, name: 'Revelation', abbreviation: 'Rev', testament: 'NT', totalChapters: 22 },
];

const BOOK_NORM_MAP = new Map<string, CanonicalBook>();
for (const b of CANONICAL_BOOKS) {
  BOOK_NORM_MAP.set(b.name.toLowerCase().replace(/[^a-z0-9]/g, ''), b);
  BOOK_NORM_MAP.set(b.abbreviation.toLowerCase().replace(/[^a-z0-9]/g, ''), b);
  if (b.name === 'Psalms') BOOK_NORM_MAP.set('psalm', b);
  if (b.name === 'Song of Solomon') {
    BOOK_NORM_MAP.set('songofsongs', b);
    BOOK_NORM_MAP.set('canticles', b);
  }
}

const SCROLLMAPPER_BASE_URL = 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/';

export const SCROLLMAPPER_VERSIONS: Record<string, string> = {
  kjv: 'KJV',
  akjv: 'AKJV',
  asv: 'ASV',
  bbe: 'BBE',
  bsb: 'BSB',
  cpdv: 'CPDV',
  darby: 'Darby',
  geneva: 'Geneva1599',
  geneva1599: 'Geneva1599',
  ylt: 'YLT',
  web: 'AKJV',
  leb: 'LEB',
  litv: 'LITV',
  oeb: 'OEB',
  tyndale: 'Tyndale',
  wycliffe: 'Wycliffe',
  webster: 'Webster',
  rotherham: 'Rotherham',
  ukjv: 'UKJV',
  sparv: 'SpaRV',
  sparv1865: 'SpaRV1865',
  sparvg: 'SpaRVG',
  spaplatense: 'SpaPlatense',
  rvr: 'SpaRV',
  frebbb: 'FreBBB',
  fresegond: 'FreBBB',
  fregeneve: 'FreGeneve1669',
  frecrampon: 'FreCrampon',
  gerbolut: 'GerBoLut',
  gerluther: 'GerBoLut',
  gerelberfelder: 'GerElb1871',
  germenge: 'GerMenge',
  gerzurcher: 'GerZurcher',
  chiun: 'ChiUn',
  chiunl: 'ChiUnL',
  chisb: 'ChiSB',
  russynodal: 'RusSynodal',
  rusmakarij: 'RusMakarij',
  porblivre: 'PorBLivre',
  pornva: 'PorNVA',
  grevamvas: 'GreVamvas',
  byz: 'Byz',
  tr: 'TR',
  hebmodern: 'HebModern',
  wlc: 'WLC',
  vulgate: 'Vulgate',
  vulgclementine: 'VulgClementine',
  tagangbiblia: 'TagAngBiblia',
  viet: 'Viet',
  thaikjv: 'ThaiKJV',
  ukrogienko: 'UkrOgienko',
  swe1917: 'Swe1917',
  dutch: 'DutSVV',
  polgdanska: 'PolGdanska',
  esperanto: 'Esperanto',
  haitian: 'Haitian',
  korean: 'KorHKJV',
  korhkjv: 'KorHKJV',
  korrv: 'KorRV',
  japbungo: 'JapBungo',
  japkougo: 'JapKougo',
  albanian: 'Alb',
  hunkar: 'HunKar',
  peshitta: 'Peshitta',
};

const listeners = new Set<ProgressCallback>();

export function subscribeDownloadProgress(callback: ProgressCallback): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function notifyProgress(progress: DownloadProgress) {
  for (const listener of listeners) {
    try {
      listener(progress);
    } catch (e) {
      console.warn('[BibleDownloadService] Listener error:', e);
    }
  }
}

export function isVersionDownloadable(versionId: string): boolean {
  return true;
}

function resolveDownloadUrl(versionId: string): { url: string; filename: string } {
  const norm = versionId.toLowerCase().replace(/[^a-z0-9]/g, '');
  const mapped = SCROLLMAPPER_VERSIONS[norm] || SCROLLMAPPER_VERSIONS[versionId.toLowerCase()] || 'KJV';
  return {
    url: `${SCROLLMAPPER_BASE_URL}${mapped}.json`,
    filename: `${mapped}.json`,
  };
}

export async function downloadBibleVersion(
  versionId: string,
  onProgress?: ProgressCallback
): Promise<{ success: boolean; error?: string }> {
  const db = getDatabase();

  const report = (stage: DownloadProgress['stage'], percent: number, message: string) => {
    const item: DownloadProgress = { versionId, stage, percent, message };
    notifyProgress(item);
    onProgress?.(item);
  };

  try {
    report('downloading', 5, 'Connecting to Scripture repository...');

    const { url } = resolveDownloadUrl(versionId);
    console.log(`[BibleDownloadService] Downloading ${versionId} from ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download Bible dataset (HTTP ${response.status})`);
    }

    report('downloading', 35, 'Downloaded Scripture data, reading payload...');
    const data = await response.json();

    if (!data || !Array.isArray(data.books)) {
      throw new Error('Invalid Bible JSON format: books array missing');
    }

    report('parsing', 45, `Found ${data.books.length} books. Validating chapters and verses...`);

    const existingVersion = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM bible_versions WHERE id = ?',
      [versionId]
    );

    const versionName = data.translation || versionId.toUpperCase();
    if (!existingVersion) {
      await db.runAsync(
        'INSERT INTO bible_versions (id, name, language, is_downloaded, download_date, total_size_mb) VALUES (?, ?, ?, ?, datetime("now"), ?)',
        [versionId, versionName, 'en', 0, 5.0]
      );
    }

    report('importing', 55, 'Registering Bible books structure...');
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM verses WHERE version_id = ?', [versionId]);
      await db.runAsync('DELETE FROM books WHERE version_id = ?', [versionId]);

      for (const cb of CANONICAL_BOOKS) {
        await db.runAsync(
          'INSERT OR REPLACE INTO books (version_id, book_number, name, abbreviation, testament, total_chapters) VALUES (?, ?, ?, ?, ?, ?)',
          [versionId, cb.bookNumber, cb.name, cb.abbreviation, cb.testament, cb.totalChapters]
        );
      }
    });

    report('importing', 65, 'Importing verses into SQLite database...');

    const verseBatch: Array<{ bookNumber: number; chapter: number; verseNumber: number; text: string }> = [];

    let bookIndex = 0;
    for (const rawBook of data.books) {
      bookIndex++;
      const normBookName = (rawBook.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchedCanonical = BOOK_NORM_MAP.get(normBookName) || CANONICAL_BOOKS[bookIndex - 1];

      if (!matchedCanonical) continue;
      const bNum = matchedCanonical.bookNumber;

      if (Array.isArray(rawBook.chapters)) {
        for (const rawChapter of rawBook.chapters) {
          const chapNum = Number(rawChapter.chapter) || 1;
          if (Array.isArray(rawChapter.verses)) {
            for (const rawVerse of rawChapter.verses) {
              const vNum = Number(rawVerse.verse) || 1;
              const text = (rawVerse.text || '').trim();
              if (text) {
                verseBatch.push({
                  bookNumber: bNum,
                  chapter: chapNum,
                  verseNumber: vNum,
                  text,
                });
              }
            }
          }
        }
      }
    }

    const totalVerses = verseBatch.length;
    console.log(`[BibleDownloadService] Parsed ${totalVerses} verses for ${versionId}. Writing in chunks...`);

    const CHUNK_SIZE = 500;
    const totalChunks = Math.ceil(totalVerses / CHUNK_SIZE);

    for (let c = 0; c < totalChunks; c++) {
      const chunk = verseBatch.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
      await db.withTransactionAsync(async () => {
        for (const v of chunk) {
          await db.runAsync(
            'INSERT OR REPLACE INTO verses (version_id, book_number, chapter, verse_number, text) VALUES (?, ?, ?, ?, ?)',
            [versionId, v.bookNumber, v.chapter, v.verseNumber, v.text]
          );
        }
      });

      const currentPercent = Math.round(65 + (c / totalChunks) * 30);
      report(
        'importing',
        currentPercent,
        `Imported ${Math.min((c + 1) * CHUNK_SIZE, totalVerses)} of ${totalVerses} verses (${currentPercent}%)...`
      );
    }

    report('indexing', 97, 'Finalizing search index and offline status...');
    const approxSizeMb = parseFloat((totalVerses * 0.00015).toFixed(1)) || 4.5;

    await db.runAsync(
      'UPDATE bible_versions SET is_downloaded = 1, download_date = datetime("now"), total_size_mb = ? WHERE id = ?',
      [approxSizeMb, versionId]
    );

    report('completed', 100, `${versionName} is ready for offline reading!`);
    return { success: true };
  } catch (error: any) {
    console.error(`[BibleDownloadService] Failed to download version ${versionId}:`, error);
    report('error', 0, error.message || 'Download failed');
    return { success: false, error: error.message || 'Unknown error' };
  }
}

export async function deleteBibleVersion(versionId: string): Promise<boolean> {
  if (versionId.toLowerCase() === 'kjv') {
    return false;
  }

  const db = getDatabase();
  try {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM verses WHERE version_id = ?', [versionId]);
      await db.runAsync('DELETE FROM books WHERE version_id = ?', [versionId]);
      await db.runAsync(
        'UPDATE bible_versions SET is_downloaded = 0, download_date = NULL WHERE id = ?',
        [versionId]
      );
    });
    return true;
  } catch (e) {
    console.error(`[BibleDownloadService] Failed to delete version ${versionId}:`, e);
    return false;
  }
}

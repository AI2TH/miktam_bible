import { getDatabase } from './database';
import { BOOK_NAMES } from '../utils/constants';
import type { OriginalWord, StrongsEntry, CrossReferenceWithText } from '../types/concordance';

function safeJsonParse<T>(jsonStr: any, fallback: T): T {
  if (!jsonStr || typeof jsonStr !== 'string') return fallback;
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return fallback;
  }
}

// ─── INTERLINEAR (Word-by-Word) ──────────────────

/**
 * Get all original language words for a specific verse.
 * Returns words in order (word_position) for interlinear display.
 */
export async function getOriginalWords(
  bookNumber: number,
  chapter: number,
  verseNumber: number
): Promise<OriginalWord[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM original_words
     WHERE book_number = ? AND chapter = ? AND verse_number = ?
     ORDER BY word_position`,
    [bookNumber, chapter, verseNumber]
  );
  return rows.map(r => ({
    id: r.id,
    bookNumber: r.book_number,
    chapter: r.chapter,
    verseNumber: r.verse_number,
    wordPosition: r.word_position,
    originalText: r.original_text,
    transliteration: r.transliteration,
    strongsNumber: r.strongs_number,
    language: r.language,
    morphology: safeJsonParse(r.morphology, null),
    gloss: r.gloss,
  }));
}

// ─── STRONG'S DICTIONARY ─────────────────────────

/** Look up a single Strong's entry by number (e.g., "G26") */
export async function getStrongsEntry(strongsNumber: string): Promise<StrongsEntry | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM strongs_dictionary WHERE strongs_number = ?',
    [strongsNumber]
  );
  if (!row) return null;
  return {
    strongsNumber: row.strongs_number,
    language: row.language,
    originalWord: row.original_word,
    transliteration: row.transliteration,
    pronunciation: row.pronunciation || '',
    definition: row.definition,
    shortDefinition: row.short_definition || '',
    usageCount: row.usage_count,
    kjvTranslations: safeJsonParse(row.kjv_translations, []),
  };
}

export async function searchStrongs(query: string): Promise<StrongsEntry[]> {
  const db = getDatabase();

  // Normalize query (e.g. "g 26" -> "G26", "g-26" -> "G26")
  const normalized = query.replace(/[\s-]/g, '').toUpperCase();

  // Case 1: Exact Strong's Number Match (e.g., "G26" or "H26")
  if (/^[GH]\d+$/.test(normalized)) {
    // Try exact first
    let row = await db.getFirstAsync<any>(
      'SELECT * FROM strongs_dictionary WHERE strongs_number = ?',
      [normalized]
    );

    // Fallback: strip leading zeros (e.g. "G0026" -> "G26")
    if (!row) {
      const stripped = normalized.replace(/^([GH])0+/, '$1');
      row = await db.getFirstAsync<any>(
        'SELECT * FROM strongs_dictionary WHERE strongs_number = ?',
        [stripped]
      );
    }

    if (row) {
      return [{
        strongsNumber: row.strongs_number,
        language: row.language,
        originalWord: row.original_word,
        transliteration: row.transliteration,
        pronunciation: row.pronunciation || '',
        definition: row.definition,
        shortDefinition: row.short_definition || '',
        usageCount: row.usage_count,
        kjvTranslations: safeJsonParse(row.kjv_translations, []),
      }];
    }
  }

  // Case 2: Partial/Prefix Strong's Number Match (e.g., "G2" or "G26*")
  if (/^[GH]\d+\*?$/.test(normalized)) {
    const prefix = normalized.replace('*', '');
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM strongs_dictionary WHERE strongs_number LIKE ? ORDER BY strongs_number LIMIT 100',
      [`${prefix}%`]
    );
    if (rows.length > 0) {
      return rows.map((row: any) => ({
        strongsNumber: row.strongs_number,
        language: row.language,
        originalWord: row.original_word,
        transliteration: row.transliteration,
        pronunciation: row.pronunciation || '',
        definition: row.definition,
        shortDefinition: row.short_definition || '',
        usageCount: row.usage_count,
        kjvTranslations: safeJsonParse(row.kjv_translations, []),
      }));
    }
  }

  // Case 3: Regular text FTS match in definitions + KJV translations UNION
  const cleanQuery = query.replace(/['\"*]/g, '').trim();
  if (!cleanQuery) return [];

  const likePattern = `%"${cleanQuery.toLowerCase()}"%`;
  const ftsMatch = `"${cleanQuery}"*`;
  const rows = await db.getAllAsync<any>(
    `SELECT sd.*, 1 as is_kjv_match, 0 as fts_rank
     FROM strongs_dictionary sd
     WHERE sd.kjv_translations LIKE ?

     UNION ALL

     SELECT sd.*, 0 as is_kjv_match, f.rank as fts_rank
     FROM strongs_fts f
     JOIN strongs_dictionary sd ON sd.rowid = f.rowid
     WHERE f.strongs_fts MATCH ?
       AND sd.rowid NOT IN (
         SELECT rowid FROM strongs_dictionary WHERE kjv_translations LIKE ?
       )

     ORDER BY is_kjv_match DESC, fts_rank
     LIMIT 500`,
    [likePattern, ftsMatch, likePattern]
  );

  return rows.map((r: any) => ({
    strongsNumber: r.strongs_number,
    language: r.language,
    originalWord: r.original_word,
    transliteration: r.transliteration,
    pronunciation: r.pronunciation || '',
    definition: r.definition,
    shortDefinition: r.short_definition || '',
    usageCount: r.usage_count,
    kjvTranslations: safeJsonParse(r.kjv_translations, []),
  }));
}

/**
 * Find all verses that contain a specific Strong's number.
 * E.g., getVersesByStrongs("G26") → all verses with ἀγάπη (agape/love)
 */
export async function getVersesByStrongs(
  strongsNumber: string,
  versionId: string = 'kjv'
): Promise<{ bookNumber: number; chapter: number; verseNumber: number; text: string; bookName: string }[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT DISTINCT ow.book_number, ow.chapter, ow.verse_number, v.text
     FROM original_words ow
     JOIN verses v ON v.book_number = ow.book_number
       AND v.chapter = ow.chapter
       AND v.verse_number = ow.verse_number
       AND v.version_id = ?
     WHERE ow.strongs_number = ?
     ORDER BY ow.book_number, ow.chapter, ow.verse_number`,
    [versionId, strongsNumber]
  );
  return rows.map(r => ({
    bookNumber: r.book_number,
    chapter: r.chapter,
    verseNumber: r.verse_number,
    text: r.text,
    bookName: BOOK_NAMES[r.book_number] || '',
  }));
}

// ─── CROSS-REFERENCES ────────────────────────────

/**
 * Get cross-references for a verse, with target verse text resolved.
 * Groups by relationship type. Returns max 20 cross-refs.
 */
export async function getCrossReferences(
  bookNumber: number,
  chapter: number,
  verseNumber: number,
  versionId: string = 'kjv'
): Promise<CrossReferenceWithText[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT cr.*, v.text as target_text
     FROM cross_references cr
     LEFT JOIN verses v ON v.book_number = cr.target_book
       AND v.chapter = cr.target_chapter
       AND v.verse_number = cr.target_verse_start
       AND v.version_id = ?
     WHERE cr.source_book = ? AND cr.source_chapter = ? AND cr.source_verse_start = ?
     ORDER BY cr.confidence DESC, cr.votes DESC
     LIMIT 20`,
    [versionId, bookNumber, chapter, verseNumber]
  );

  return rows.map(r => {
    const targetBookName = BOOK_NAMES[r.target_book] || '';
    const targetLabel = r.target_verse_end
      ? `${targetBookName} ${r.target_chapter}:${r.target_verse_start}-${r.target_verse_end}`
      : `${targetBookName} ${r.target_chapter}:${r.target_verse_start}`;

    return {
      id: r.id,
      sourceBook: r.source_book,
      sourceChapter: r.source_chapter,
      sourceVerseStart: r.source_verse_start,
      sourceVerseEnd: r.source_verse_end,
      targetBook: r.target_book,
      targetChapter: r.target_chapter,
      targetVerseStart: r.target_verse_start,
      targetVerseEnd: r.target_verse_end,
      relationshipType: r.relationship_type,
      confidence: r.confidence,
      votes: r.votes,
      targetText: r.target_text || '',
      targetBookName,
      targetLabel,
    };
  });
}

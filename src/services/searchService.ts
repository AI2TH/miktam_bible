import { initSearchDatabase } from './database';
import { rrfMerge } from '../utils/rrfMerge';
import { BOOK_NAMES } from '../utils/constants';
import { getBookName } from '../utils/bookTranslations';
import { cleanVerseText } from '../utils/bibleUtils';
import { buildRankedSearch, toPage, tokenizeQuery } from './searchQuery';
import type { SearchResult } from '../types/bible';

/**
 * Full-text search using FTS5 with highlighted snippets.
 * Returns ranked results with book name resolved.
 */
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'did', 'do', 'does', 'doing', 'down', 'during',
  'each',
  'for', 'from', 'further',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
  'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'she', 'should', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up',
  'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  // KJV / Biblical common words
  'shall', 'shalt', 'will', 'wilt', 'unto', 'thee', 'thou', 'thy', 'ye', 'hath', 'hast', 'saith', 'said', 'say'
]);

const SYNONYMS: Record<string, string[]> = {
  'worry': ['care', 'careful', 'thought', 'afraid', 'fear', 'troubled', 'worry'],
  'worried': ['care', 'careful', 'thought', 'afraid', 'fear', 'troubled', 'worry'],
  'worrying': ['care', 'careful', 'thought', 'afraid', 'fear', 'troubled', 'worry'],
  'anxious': ['care', 'careful', 'thought', 'afraid', 'fear', 'troubled', 'worry'],
  'anxiety': ['care', 'careful', 'thought', 'afraid', 'fear', 'troubled', 'worry'],
  'forgive': ['forgive', 'forgiven', 'forgiveness', 'pardon', 'remission', 'sins', 'blot'],
  'forgiveness': ['forgive', 'forgiven', 'forgiveness', 'pardon', 'remission', 'sins', 'blot'],
  'forgiving': ['forgive', 'forgiven', 'forgiveness', 'pardon', 'remission', 'sins', 'blot'],
  'sin': ['sin', 'sins', 'iniquity', 'transgression', 'trespass', 'wickedness', 'sinned'],
  'sins': ['sin', 'sins', 'iniquity', 'transgression', 'trespass', 'wickedness', 'sinned'],
  'sinning': ['sin', 'sins', 'iniquity', 'transgression', 'trespass', 'wickedness', 'sinned'],
  'faith': ['faith', 'believe', 'believeth', 'trust', 'assurance', 'believed'],
  'believe': ['faith', 'believe', 'believeth', 'trust', 'assurance', 'believed'],
  'believing': ['faith', 'believe', 'believeth', 'trust', 'assurance', 'believed'],
  'peace': ['peace', 'quietness', 'rest', 'still', 'quiet'],
  'peaceful': ['peace', 'quietness', 'rest', 'still', 'quiet'],
  'spirit': ['spirit', 'ghost', 'comforter'],
  'saved': ['saved', 'salvation', 'deliverance', 'redeem', 'redemption', 'save'],
  'salvation': ['saved', 'salvation', 'deliverance', 'redeem', 'redemption', 'save'],
  'love': ['love', 'loved', 'loveth', 'charity'],
  'loved': ['love', 'loved', 'loveth', 'charity'],
  'loving': ['love', 'loved', 'loveth', 'charity'],
  'heaven': ['heaven', 'heavens', 'paradise', 'glory'],
  'hell': ['hell', 'hades', 'sheol', 'grave', 'pit', 'damnation'],
  'pray': ['pray', 'prayer', 'supplication', 'ask', 'call', 'prayed'],
  'prayer': ['pray', 'prayer', 'supplication', 'ask', 'call', 'prayed'],
  'jesus': ['jesus', 'christ', 'savior', 'saviour', 'lord'],
  'christ': ['jesus', 'christ', 'savior', 'saviour', 'lord'],
  'god': ['god', 'lord', 'jehovah', 'father']
};

function toSearchResult(r: any, normVersion: string): SearchResult {
  const cleanText = cleanVerseText(r.text);
  return {
    verse: {
      id: r.id,
      versionId: r.version_id,
      bookNumber: r.book_number,
      chapter: r.chapter,
      verseNumber: r.verse_number,
      text: cleanText,
    },
    bookName: getBookName(r.book_number, normVersion) || BOOK_NAMES[r.book_number] || `Book ${r.book_number}`,
    score: Math.abs(r.rank || 0),
    snippet: cleanText.substring(0, 150),
    source: 'fts' as const,
  };
}

/**
 * One page of the Search screen: phrase, then all-words, then any-word matches,
 * as a single ranked query (see searchQuery.ts), so pages neither repeat nor skip.
 */
export async function searchVersesPage(
  query: string,
  versionId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ results: SearchResult[]; hasMore: boolean }> {
  const normVersion = (versionId || 'kjv').toLowerCase().trim();
  const { words } = tokenizeQuery(query);
  const built = buildRankedSearch(words, normVersion, limit, offset);
  if (!built) return { results: [], hasMore: false };

  const db = await initSearchDatabase();
  const rows = await db.getAllAsync<any>(built.sql, built.params);
  const page = toPage(rows, limit);
  return { results: page.rows.map((r) => toSearchResult(r, normVersion)), hasMore: page.hasMore };
}

export async function searchFTS(
  query: string,
  versionId: string,
  limit: number = 20,
  isRag: boolean = false,
  offset: number = 0
): Promise<SearchResult[]> {
  if (!isRag) {
    return (await searchVersesPage(query, versionId, limit, offset)).results;
  }

  const normVersion = (versionId || 'kjv').toLowerCase().trim();
  const db = await initSearchDatabase();

  const { cleanQuery, words: tokens } = tokenizeQuery(query);
  if (!cleanQuery || tokens.length === 0) return [];
  let words = tokens;

  // RAG Logic: Filter stop words and expand synonyms
  const filtered = words.filter(w => !STOP_WORDS.has(w));
  if (filtered.length > 0) words = filtered;

  const queryParts = words.map(w => {
    if (SYNONYMS[w]) {
      return '(' + SYNONYMS[w].map(syn => `"${syn}"`).join(' OR ') + ')';
    }
    return `"${w}"`;
  });

  let ftsQuery = queryParts.length > 0 ? queryParts.join(' AND ') : `"${cleanQuery}"`;
  let rows = await db.getAllAsync<any>(
    `SELECT v.id, v.version_id, v.book_number, v.chapter, v.verse_number, v.text, f.rank
     FROM verses_fts f
     JOIN verses v ON v.id = f.rowid
     WHERE f.verses_fts MATCH ? AND LOWER(v.version_id) = ? AND v.book_number <= 66
     ORDER BY f.rank
     LIMIT ? OFFSET ?`,
    [ftsQuery, normVersion, Number(limit), Number(offset)]
  );

  // Fallback to OR for RAG
  if (rows.length < 3 && words.length > 1) {
    ftsQuery = queryParts.join(' OR ');
    rows = await db.getAllAsync<any>(
      `SELECT v.id, v.version_id, v.book_number, v.chapter, v.verse_number, v.text, f.rank
       FROM verses_fts f
       JOIN verses v ON v.id = f.rowid
       WHERE f.verses_fts MATCH ? AND LOWER(v.version_id) = ? AND v.book_number <= 66
       ORDER BY f.rank
       LIMIT ? OFFSET ?`,
      [ftsQuery, normVersion, Number(limit), Number(offset)]
    );
  }

  return rows.map((r: any) => toSearchResult(r, normVersion));
}

/**
 * Hybrid search: combines FTS5 + vector similarity using RRF.
 * Used by the AI RAG pipeline for best retrieval quality.
 */
export async function hybridSearch(
  query: string,
  queryEmbedding: number[],
  versionId: string,
  topK: number = 10
): Promise<SearchResult[]> {
  const normVersion = (versionId || 'kjv').toLowerCase().trim();
  // Step 1: FTS5 results
  const ftsResults = await searchFTS(query, normVersion, 20, true);

  // Step 2: Vector similarity results (sqlite-vec)
  let vectorResults: SearchResult[] = [];
  if (queryEmbedding && queryEmbedding.length > 0) {
    try {
      const db = await initSearchDatabase();
      const vectorRows = await db.getAllAsync<any>(
        `SELECT v.id, v.version_id, v.book_number, v.chapter, v.verse_number, v.text,
                ve.distance
         FROM verse_embeddings ve
         JOIN verses v ON LOWER(v.version_id) = LOWER(ve.version_id)
           AND v.book_number = ve.book_number
           AND v.chapter = ve.chapter
           AND v.verse_number = ve.verse_number
         WHERE LOWER(ve.version_id) = ?
           AND ve.embedding MATCH ?
         ORDER BY ve.distance
         LIMIT 20`,
        [normVersion, JSON.stringify(queryEmbedding)]
      );

      vectorResults = vectorRows.map((r: any) => {
        const cleanText = cleanVerseText(r.text);
        return {
          verse: {
            id: r.id,
            versionId: r.version_id,
            bookNumber: r.book_number,
            chapter: r.chapter,
            verseNumber: r.verse_number,
            text: cleanText,
          },
          bookName: getBookName(r.book_number, normVersion) || BOOK_NAMES[r.book_number] || `Book ${r.book_number}`,
          score: 1 - r.distance, // Convert distance to similarity
          snippet: cleanText.substring(0, 100),
          source: 'vector' as const,
        };
      });
    } catch (e) {
      // Gracefully catch cases where sqlite-vec/verse_embeddings is not yet initialized
      console.warn('[Search] Vector search failed or table not available. Falling back to FTS only.', e);
    }
  }

  // Step 3: RRF merge
  const merged = rrfMerge(ftsResults, vectorResults, topK);
  return merged;
}

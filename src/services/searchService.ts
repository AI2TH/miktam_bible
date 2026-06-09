import { getDatabase } from './database';
import { rrfMerge } from '../utils/rrfMerge';
import { BOOK_NAMES } from '../utils/constants';
import type { SearchResult } from '../types/bible';

/**
 * Full-text search using FTS5 with highlighted snippets.
 * Returns ranked results with book name resolved.
 */
export async function searchFTS(
  query: string,
  versionId: string,
  limit: number = 20
): Promise<SearchResult[]> {
  const db = getDatabase();

  // Clean query for FTS MATCH syntax (simple boolean/phrase query formatting)
  const cleanQuery = query.replace(/['"*]/g, '').trim();
  if (!cleanQuery) return [];

  // Split query into keywords (longer than 2 chars) and join with OR
  const words = cleanQuery
    .split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(w => w.length > 2);
  const ftsQuery = words.length > 0 ? words.map(w => `"${w}"`).join(' OR ') : `"${cleanQuery}"`;

  // FTS5 search with snippet extraction (30 tokens before/after match)
  const rows = await db.getAllAsync<any>(
    `SELECT v.id, v.version_id, v.book_number, v.chapter, v.verse_number, v.text,
            snippet(verses_fts, 0, '<b>', '</b>', '...', 30) as snippet,
            rank
     FROM verses_fts
     JOIN verses v ON v.id = verses_fts.rowid
     WHERE verses_fts MATCH ? AND v.version_id = ?
     ORDER BY rank
     LIMIT ?`,
    [ftsQuery, versionId, limit]
  );

  return rows.map((r: any) => ({
    verse: {
      id: r.id,
      versionId: r.version_id,
      bookNumber: r.book_number,
      chapter: r.chapter,
      verseNumber: r.verse_number,
      text: r.text,
    },
    bookName: BOOK_NAMES[r.book_number] || `Book ${r.book_number}`,
    score: Math.abs(r.rank),
    snippet: r.snippet || r.text.substring(0, 100),
    source: 'fts' as const,
  }));
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
  // Step 1: FTS5 results
  const ftsResults = await searchFTS(query, versionId, 20);

  // Step 2: Vector similarity results (sqlite-vec)
  let vectorResults: SearchResult[] = [];
  if (queryEmbedding && queryEmbedding.length > 0) {
    try {
      const db = getDatabase();
      const vectorRows = await db.getAllAsync<any>(
        `SELECT v.id, v.version_id, v.book_number, v.chapter, v.verse_number, v.text,
                ve.distance
         FROM verse_embeddings ve
         JOIN verses v ON v.version_id = ve.version_id
           AND v.book_number = ve.book_number
           AND v.chapter = ve.chapter
           AND v.verse_number = ve.verse_number
         WHERE ve.version_id = ?
           AND ve.embedding MATCH ?
         ORDER BY ve.distance
         LIMIT 20`,
        [versionId, JSON.stringify(queryEmbedding)]
      );

      vectorResults = vectorRows.map((r: any) => ({
        verse: {
          id: r.id,
          versionId: r.version_id,
          bookNumber: r.book_number,
          chapter: r.chapter,
          verseNumber: r.verse_number,
          text: r.text,
        },
        bookName: BOOK_NAMES[r.book_number] || `Book ${r.book_number}`,
        score: 1 - r.distance, // Convert distance to similarity
        snippet: r.text.substring(0, 100),
        source: 'vector' as const,
      }));
    } catch (e) {
      // Gracefully catch cases where sqlite-vec/verse_embeddings is not yet initialized
      console.warn('[Search] Vector search failed or table not available. Falling back to FTS only.', e);
    }
  }

  // Step 3: RRF merge
  const merged = rrfMerge(ftsResults, vectorResults, topK);
  return merged;
}

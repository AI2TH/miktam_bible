import type { SearchResult } from '../types/bible';

/**
 * Reciprocal Rank Fusion (RRF) — merges two ranked result lists.
 *
 * Algorithm:
 *   score(doc) = Σ 1/(k + rank_i(doc))
 *   where k=60 (constant to prevent high-ranked docs from dominating)
 *
 * This is a zero-shot algorithm — no training needed.
 * Uses only rank position, ignores raw scores.
 * Works perfectly offline.
 */
export function rrfMerge(
  ftsResults: SearchResult[],
  vectorResults: SearchResult[],
  topK: number = 10,
  k: number = 60
): SearchResult[] {
  // Map from verse unique key → { result, score }
  const scoreMap = new Map<string, { result: SearchResult; score: number }>();

  // Helper to create a unique key for deduplication
  const verseKey = (r: SearchResult) =>
    `${r.verse.versionId}:${r.verse.bookNumber}:${r.verse.chapter}:${r.verse.verseNumber}`;

  // Score FTS results by rank position
  ftsResults.forEach((result, rank) => {
    const key = verseKey(result);
    const rrfScore = 1 / (k + rank + 1); // rank is 0-indexed, add 1
    const existing = scoreMap.get(key);
    if (existing) {
      existing.score += rrfScore;
    } else {
      scoreMap.set(key, { result: { ...result, source: 'hybrid' }, score: rrfScore });
    }
  });

  // Score vector results by rank position
  vectorResults.forEach((result, rank) => {
    const key = verseKey(result);
    const rrfScore = 1 / (k + rank + 1);
    const existing = scoreMap.get(key);
    if (existing) {
      existing.score += rrfScore;
    } else {
      scoreMap.set(key, { result: { ...result, source: 'hybrid' }, score: rrfScore });
    }
  });

  // Sort by combined RRF score (descending) and take top K
  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(entry => ({ ...entry.result, score: entry.score }));
}

/**
 * Verse search as one ranked SQL query, so pages never repeat or skip rows.
 *
 * Tiers: 1 = exact phrase (multi-word queries), 2 = all words (AND),
 * 3 = any word (OR, multi-word queries, only when the AND tier has fewer than
 * OR_FALLBACK_BELOW matches). A verse matched by several tiers keeps its best
 * tier. Rows are ordered by tier, then FTS rank, then verse id, so OFFSET is stable.
 *
 * No Expo imports, so it can be tested with node:sqlite.
 */

export const OR_FALLBACK_BELOW = 5;

/** Split a user query into FTS-safe lowercase words. */
export function tokenizeQuery(query: string): { cleanQuery: string; words: string[] } {
  const cleanQuery = query.replace(/['"*]/g, '').trim();
  const words = cleanQuery
    .split(/\s+/)
    .map((w) => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\[\]<>?@+]/g, '').toLowerCase())
    .filter((w) => w.length > 0);
  return { cleanQuery, words };
}

export interface RankedSearchSql {
  sql: string;
  params: (string | number)[];
}

const tierSelect = (tier: number) =>
  `SELECT f.rowid AS id, ${tier} AS tier, f.rank AS rank
     FROM verses_fts f
     JOIN verses v ON v.id = f.rowid
    WHERE f.verses_fts MATCH ? AND LOWER(v.version_id) = ? AND v.book_number <= 66`;

/**
 * Build the paged query. It selects limit + 1 rows: the extra row only tells
 * the caller whether another page exists.
 */
export function buildRankedSearch(
  words: string[],
  versionId: string,
  limit: number,
  offset: number
): RankedSearchSql | null {
  if (words.length === 0) return null;
  const multi = words.length > 1;
  const quoted = words.map((w) => `"${w}"`);

  const ctes: string[] = [];
  const params: (string | number)[] = [];
  const unions: string[] = [];

  if (multi) {
    ctes.push(`t1 AS (${tierSelect(1)})`);
    params.push(`"${words.join(' ')}"`, versionId);
    unions.push('SELECT * FROM t1');
  }
  ctes.push(`t2 AS (${tierSelect(2)})`);
  params.push(quoted.join(' AND '), versionId);
  unions.push('SELECT * FROM t2');
  if (multi) {
    ctes.push(`t3 AS (${tierSelect(3)} AND (SELECT COUNT(*) FROM t2) < ${OR_FALLBACK_BELOW})`);
    params.push(quoted.join(' OR '), versionId);
    unions.push('SELECT * FROM t3');
  }

  // MIN(tier) with bare columns: SQLite takes rank from the row holding the minimum.
  const sql = `WITH ${ctes.join(',\n')},
    matches AS (${unions.join(' UNION ALL ')}),
    best AS (SELECT id, MIN(tier) AS tier, rank FROM matches GROUP BY id)
  SELECT v.id, v.version_id, v.book_number, v.chapter, v.verse_number, v.text, best.rank, best.tier
    FROM best JOIN verses v ON v.id = best.id
   ORDER BY best.tier, best.rank, v.id
   LIMIT ? OFFSET ?`;
  params.push(Math.max(0, Math.floor(limit)) + 1, Math.max(0, Math.floor(offset)));
  return { sql, params };
}

/** Split the limit + 1 rows returned by buildRankedSearch into a page and hasMore. */
export function toPage<T>(rows: T[], limit: number): { rows: T[]; hasMore: boolean } {
  return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
}

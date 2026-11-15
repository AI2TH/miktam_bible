/**
 * A translation is marked downloaded only when the imported verse count
 * matches the source. No Expo imports, so it can be tested with node:test.
 */

export interface VerseKey {
  bookNumber: number;
  chapter: number;
  verseNumber: number;
}

/** Distinct (book, chapter, verse) keys: rows with the same key collapse on import (INSERT OR REPLACE). */
export function countDistinctVerses(verses: VerseKey[]): number {
  const keys = new Set<string>();
  for (const v of verses) keys.add(`${v.bookNumber}:${v.chapter}:${v.verseNumber}`);
  return keys.size;
}

/** Throws if the import is empty or incomplete. */
export function assertVerseCount(versionId: string, expected: number, actual: number): void {
  if (expected <= 0) {
    throw new Error(`The source for ${versionId} contains no verses.`);
  }
  if (actual !== expected) {
    throw new Error(`Imported ${actual} of ${expected} verses for ${versionId}; not marking it downloaded.`);
  }
}

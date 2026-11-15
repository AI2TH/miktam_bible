import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertVerseCount, countDistinctVerses } from '../importCheck.ts';

test('duplicate verse keys count once, as INSERT OR REPLACE stores them', () => {
  const v = (b: number, c: number, n: number) => ({ bookNumber: b, chapter: c, verseNumber: n });
  assert.equal(countDistinctVerses([v(1, 1, 1), v(1, 1, 2), v(1, 1, 1), v(43, 3, 16)]), 3);
  assert.equal(countDistinctVerses([]), 0);
});

test('a translation is accepted only when every source verse was imported', () => {
  assert.doesNotThrow(() => assertVerseCount('web', 31102, 31102));
  assert.throws(() => assertVerseCount('web', 31102, 30000), /Imported 30000 of 31102/);
  assert.throws(() => assertVerseCount('web', 0, 0), /no verses/);
});

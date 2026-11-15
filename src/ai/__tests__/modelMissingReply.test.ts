import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildModelMissingReply,
  MODEL_MISSING_NOTICE,
  MODEL_MISSING_NO_RESULTS,
} from '../modelMissingReply.ts';
import type { SearchResult } from '../../types/bible';

const names: Record<number, string> = { 43: 'John', 50: 'Philippians' };
const bookName = (n: number) => names[n] ?? `Book ${n}`;

function result(bookNumber: number, chapter: number, verseNumber: number, text: string): SearchResult {
  return {
    verse: { id: 0, versionId: 'kjv', bookNumber, chapter, verseNumber, text },
    bookName: bookName(bookNumber),
    score: 1,
    snippet: text,
    source: 'fts',
  };
}

test('no model: reply contains only the notice and the retrieved verses', () => {
  const reply = buildModelMissingReply(
    [
      result(43, 3, 16, 'For God so <i>loved</i> the world'),
      result(50, 4, 6, 'Be careful for nothing'),
      result(43, 3, 16, 'For God so loved the world'), // duplicate is dropped
    ],
    bookName
  );

  const [notice, ...rest] = reply.content.split('\n\n');
  assert.equal(notice, MODEL_MISSING_NOTICE);
  assert.deepEqual(rest, [
    'John 3:16 — For God so loved the world',
    'Philippians 4:6 — Be careful for nothing',
  ]);
  for (const line of rest) {
    assert.match(line, /^[1-3]?\s?[A-Za-z ]+ \d+:\d+ — /);
  }
  assert.deepEqual(reply.citedVerses, [
    { bookNumber: 43, chapter: 3, verseNumber: 16 },
    { bookNumber: 50, chapter: 4, verseNumber: 6 },
  ]);
});

test('no model and no results: reply is only the notice', () => {
  const reply = buildModelMissingReply([], bookName);
  assert.equal(reply.content, MODEL_MISSING_NO_RESULTS);
  assert.deepEqual(reply.citedVerses, []);
});

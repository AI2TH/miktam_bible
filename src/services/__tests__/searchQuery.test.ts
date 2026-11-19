import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { buildRankedSearch, toPage, tokenizeQuery } from '../searchQuery.ts';

type Row = { id: number; tier: number; text: string };

function hasFts5(): boolean {
  try {
    const db = new DatabaseSync(':memory:');
    db.exec('CREATE VIRTUAL TABLE _test USING fts5(x)');
    db.close();
    return true;
  } catch {
    return false;
  }
}

function fixture(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE verses (id INTEGER PRIMARY KEY, version_id TEXT, book_number INTEGER,
             chapter INTEGER, verse_number INTEGER, text TEXT);
           CREATE VIRTUAL TABLE verses_fts USING fts5(text, content=verses, content_rowid=id);
           CREATE TRIGGER verses_ai AFTER INSERT ON verses BEGIN
             INSERT INTO verses_fts(rowid, text) VALUES (new.id, new.text);
           END;`);
  const insert = db.prepare('INSERT INTO verses (version_id, book_number, chapter, verse_number, text) VALUES (?, ?, ?, ?, ?)');
  let n = 0;
  const add = (text: string, version = 'kjv', book = 1) => insert.run(version, book, 1, ++n, text);
  for (let i = 0; i < 7; i++) add(`the love of god number ${i}`); // phrase "love of god" (and AND)
  for (let i = 0; i < 9; i++) add(`god of love and more ${i}`); // AND only
  for (let i = 0; i < 6; i++) add(`only love here ${i}`); // OR only
  add('the love of god in another version', 'web');
  add('the love of god in an apocryphal book', 'kjv', 67);
  return db;
}

function page(db: DatabaseSync, query: string, limit: number, offset: number) {
  const built = buildRankedSearch(tokenizeQuery(query).words, 'kjv', limit, offset);
  assert.ok(built);
  return toPage(db.prepare(built.sql).all(...built.params) as Row[], limit);
}

test('pages of the ranked query never repeat or skip a verse, and hasMore is exact', (t) => {
  if (!hasFts5()) return t.skip('sqlite3 was compiled without fts5 in this environment');
  const db = fixture();
  const seen: number[] = [];
  const hasMores: boolean[] = [];
  for (let offset = 0; ; offset += 5) {
    const p = page(db, 'love of god', 5, offset);
    seen.push(...p.rows.map((r) => r.id));
    hasMores.push(p.hasMore);
    if (!p.hasMore) break;
  }
  // 7 phrase + 9 AND matches; the AND tier has >= 5 rows so no OR tier
  assert.equal(seen.length, 16);
  assert.equal(new Set(seen).size, 16, 'no duplicates across pages');
  assert.deepEqual(hasMores, [true, true, true, false]);
});

test('tiers come in order: phrase, then all words, and a verse keeps its best tier', (t) => {
  if (!hasFts5()) return t.skip('sqlite3 was compiled without fts5 in this environment');
  const db = fixture();
  const all = page(db, 'love of god', 100, 0).rows;
  const tiers = all.map((r) => r.tier);
  assert.deepEqual(tiers, [...tiers].sort((a, b) => a - b));
  assert.equal(all.filter((r) => r.tier === 1).length, 7);
  assert.ok(all.every((r) => !/another version|apocryphal/.test(r.text)), 'version and book filters apply');
});

test('the any-word tier is used only when the all-words tier is small', (t) => {
  if (!hasFts5()) return t.skip('sqlite3 was compiled without fts5 in this environment');
  const db = fixture();
  const rows = page(db, 'love here', 100, 0).rows; // AND matches 6 rows -> no OR tier
  assert.ok(rows.every((r) => r.tier <= 2));
  const fallback = page(db, 'here number', 100, 0).rows; // AND matches 0 rows -> OR tier
  assert.equal(fallback.length, 13);
  assert.ok(fallback.every((r) => r.tier === 3));
});

test('a page exactly as long as the limit does not claim more results', (t) => {
  if (!hasFts5()) return t.skip('sqlite3 was compiled without fts5 in this environment');
  const db = fixture();
  const p = page(db, 'phrase-free single', 20, 0);
  assert.equal(p.hasMore, false);
  const exact = page(db, 'here', 6, 0);
  assert.equal(exact.rows.length, 6);
  assert.equal(exact.hasMore, false);
});

test('tokenizeQuery strips FTS syntax and empty queries build nothing', () => {
  assert.deepEqual(tokenizeQuery(' "Love"* of, God! ').words, ['love', 'of', 'god']);
  assert.equal(buildRankedSearch([], 'kjv', 20, 0), null);
});

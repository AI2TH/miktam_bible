import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  USER_SCHEMA,
  attachUserSchema,
  exportUserDataBeforeReseed,
  hasUserTables,
  needsReseed,
  userTablesDdl,
  type SqlExecutor,
} from '../userSchema.ts';

type Param = string | number | null;

function executor(db: DatabaseSync): SqlExecutor {
  return {
    exec: async (sql) => {
      db.exec(sql);
    },
    all: async <T,>(sql: string, params: Param[] = []) => db.prepare(sql).all(...params) as T[],
    run: async (sql, params = []) => {
      db.prepare(sql).run(...params);
    },
    transaction: async (fn) => {
      db.exec('BEGIN');
      try {
        await fn();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}

/** A bible.db as the app shipped it before user.db: Bible text plus user tables in main. */
function createSeed(path: string, kjvText: string): void {
  const db = new DatabaseSync(path);
  db.exec(`CREATE TABLE verses (id INTEGER PRIMARY KEY, version_id TEXT, book_number INTEGER,
           chapter INTEGER, verse_number INTEGER, text TEXT)`);
  db.prepare('INSERT INTO verses (version_id, book_number, chapter, verse_number, text) VALUES (?, ?, ?, ?, ?)')
    .run('kjv', 43, 3, 16, kjvText);
  for (const sql of userTablesDdl('main')) {
    try { db.exec(sql); } catch {}
  }
  db.close();
}

/** Open bible.db with user.db attached, as database.ts does on start. */
function open(dir: string): DatabaseSync {
  const db = new DatabaseSync(join(dir, 'bible.db'));
  db.prepare(`ATTACH DATABASE ? AS ${USER_SCHEMA}`).run(join(dir, 'user.db'));
  return db;
}

function withDir(fn: (dir: string) => Promise<void>): () => Promise<void> {
  return async () => {
    const dir = mkdtempSync(join(tmpdir(), 'miktam-userdb-'));
    try {
      await fn(dir);
    } finally {
      try {
        rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
      } catch {}
    }
  };
}

test('needsReseed: only a missing, small or old-version bible.db is replaced', () => {
  const base = { exists: true, size: 100, minSize: 50, seededVersion: '1.1.0', expectedVersion: '1.1.0' };
  assert.equal(needsReseed(base), false);
  assert.equal(needsReseed({ ...base, exists: false }), true);
  assert.equal(needsReseed({ ...base, size: 10 }), true);
  assert.equal(needsReseed({ ...base, seededVersion: '1.2.0' }), true);
  assert.equal(needsReseed({ ...base, seededVersion: null }), true);
});

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

test('notes, highlights and plans survive a seed version bump', withDir(async (dir) => {
  if (!hasFts5()) return;
  const biblePath = join(dir, 'bible.db');

  // 1. An existing install: user data written into bible.db by an older build
  createSeed(biblePath, 'For God so loved the world (seed 1.0)');
  const legacy = new DatabaseSync(biblePath);
  legacy.prepare('INSERT INTO notes (id, version_id, book_number, chapter, verse_number, content) VALUES (?, ?, ?, ?, ?, ?)')
    .run('n1', 'kjv', 43, 3, 16, 'Remember this promise');
  legacy.prepare('INSERT INTO bookmarks (id, version_id, book_number, chapter, verse_number, highlight_color) VALUES (?, ?, ?, ?, ?, ?)')
    .run('b1', 'kjv', 43, 3, 16, '#90EE90');
  legacy.prepare('INSERT INTO reading_plans (id, plan_type, title, duration_days, start_date) VALUES (?, ?, ?, ?, ?)')
    .run('p1', 'nt90', 'New Testament', 90, '2026-11-01');
  legacy.close();

  // 2. The app starts with a newer SEEDED_DB_VERSION: copy user data out, then replace bible.db
  const before = open(dir);
  const copied = await exportUserDataBeforeReseed(executor(before));
  assert.equal(copied.notes, 1);
  before.close();
  rmSync(biblePath);
  createSeed(biblePath, 'For God so loved the world (seed 1.1)');

  // 3. Normal start on the new seed
  const db = open(dir);
  const exec = executor(db);
  await attachUserSchema(exec);

  assert.equal(await hasUserTables(exec, 'main'), false, 'user tables are dropped from bible.db');
  const verse = db.prepare('SELECT text FROM verses').get() as { text: string };
  assert.match(verse.text, /seed 1\.1/, 'Bible text comes from the new seed');

  // Unqualified names, as the services use them, resolve to user.db
  const notes = db.prepare('SELECT id, content FROM notes').all();
  assert.deepEqual(notes.map((n) => ({ ...n })), [{ id: 'n1', content: 'Remember this promise' }]);
  const bookmark = db.prepare('SELECT highlight_color FROM bookmarks WHERE id = ?').get('b1') as { highlight_color: string };
  assert.equal(bookmark.highlight_color, '#90EE90');
  const plan = db.prepare('SELECT title FROM reading_plans WHERE id = ?').get('p1') as { title: string };
  assert.equal(plan.title, 'New Testament');

  // Note search and its triggers work in user.db
  const hit = db.prepare(
    `SELECT n.id FROM notes_fts JOIN notes n ON n.rowid = notes_fts.rowid WHERE notes_fts MATCH ?`
  ).all('promise');
  assert.equal(hit.length, 1);
  db.prepare('INSERT INTO notes (id, version_id, book_number, chapter, content) VALUES (?, ?, ?, ?, ?)')
    .run('n2', 'kjv', 1, 1, 'Creation week');
  db.prepare('UPDATE notes SET content = ? WHERE id = ?').run('Creation in six days', 'n2');
  assert.equal(db.prepare(`SELECT rowid FROM notes_fts WHERE notes_fts MATCH 'six'`).all().length, 1);
  assert.equal(db.prepare(`SELECT rowid FROM notes_fts WHERE notes_fts MATCH 'week'`).all().length, 0);
  db.close();

  assert.ok(existsSync(join(dir, 'user.db')));
}));

test('an install from before user.db is migrated on start, and a second start changes nothing', withDir(async (dir) => {
  if (!hasFts5()) return;
  const biblePath = join(dir, 'bible.db');
  createSeed(biblePath, 'text');
  const legacy = new DatabaseSync(biblePath);
  // An old recordings table whose CHECK predates 'needs_model'
  legacy.exec('DROP TABLE recordings');
  legacy.exec(`CREATE TABLE recordings (id TEXT PRIMARY KEY, title TEXT, local_file_path TEXT NOT NULL,
    duration_secs INTEGER DEFAULT 0, transcript TEXT,
    transcription_status TEXT DEFAULT 'pending' CHECK(transcription_status IN ('pending','processing','done','failed')),
    linked_book INTEGER, linked_chapter INTEGER, linked_verse INTEGER, is_synced INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')))`);
  legacy.prepare('INSERT INTO recordings (id, local_file_path) VALUES (?, ?)').run('r1', '/rec/1.wav');
  legacy.prepare('INSERT INTO reading_progress (id, version_id, book_number, chapter, read_date) VALUES (?, ?, ?, ?, ?)')
    .run('rp1', 'kjv', 1, 1, '2026-11-10');
  legacy.close();

  let db = open(dir);
  const first = await attachUserSchema(executor(db));
  assert.equal(first.recordings, 1);
  assert.equal(first.reading_progress, 1);
  // The rebuilt table accepts the newer status
  db.prepare(`UPDATE recordings SET transcription_status = 'needs_model' WHERE id = 'r1'`).run();
  db.close();

  db = open(dir);
  const second = await attachUserSchema(executor(db));
  assert.deepEqual(second, {});
  const count = db.prepare('SELECT COUNT(*) AS n FROM reading_progress').get() as { n: number };
  assert.equal(count.n, 1);
  const profile = db.prepare('SELECT COUNT(*) AS n FROM profile').get() as { n: number };
  assert.equal(profile.n, 1);
  db.close();
}));

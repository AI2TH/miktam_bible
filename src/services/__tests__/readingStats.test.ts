import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { TOTAL_STATS_SQL, WEEK_CHAPTERS_SQL, weekWindow } from '../readingStatsQueries.ts';
import { userTablesDdl } from '../../database/userSchema.ts';

test('the week is today and the six days before it', () => {
  assert.deepEqual(weekWindow(new Date(2026, 10, 15, 21, 30)), ['2026-11-09', '2026-11-15']);
  assert.deepEqual(weekWindow(new Date(2026, 2, 3)), ['2026-02-25', '2026-03-03']);
});

test('stats count distinct chapters, not rows', () => {
  const db = new DatabaseSync(':memory:');
  for (const sql of userTablesDdl('main')) {
    try { db.exec(sql); } catch {}
  }
  const add = db.prepare(
    'INSERT INTO reading_progress (id, version_id, book_number, chapter, read_date, reading_time_secs) VALUES (?, ?, ?, ?, ?, ?)'
  );
  add.run('1', 'kjv', 43, 3, '2026-11-15', 60); // John 3 today
  add.run('2', 'web', 43, 3, '2026-11-15', 30); // John 3 again, other translation
  add.run('3', 'kjv', 43, 3, '2026-11-10', 30); // John 3 earlier this week
  add.run('4', 'kjv', 1, 1, '2026-11-09', 10); // Genesis 1, first day of the week
  add.run('5', 'kjv', 1, 2, '2026-11-08', 10); // Genesis 2, eight days ago: not this week

  const total = db.prepare(TOTAL_STATS_SQL).get() as { cnt: number; time: number };
  assert.equal(total.cnt, 3);
  assert.equal(total.time, 140);

  const [start, end] = weekWindow(new Date(2026, 10, 15));
  const week = db.prepare(WEEK_CHAPTERS_SQL).get(start, end) as { cnt: number };
  assert.equal(week.cnt, 2);
});

test('empty history gives zeros', () => {
  const db = new DatabaseSync(':memory:');
  for (const sql of userTablesDdl('main')) {
    try { db.exec(sql); } catch {}
  }
  assert.deepEqual({ ...(db.prepare(TOTAL_STATS_SQL).get() as object) }, { cnt: 0, time: 0 });
});

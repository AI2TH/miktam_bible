import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_VERSE_POOL,
  FALLBACK_SEED,
  DAILY_VERSE_PREFIX,
  pickDailyVerse,
  pickDailyVerseIndex,
  planDailyVerseNotifications,
  resolveDailyVerseTime,
  dailyVerseSettingValue,
  DEFAULT_DAILY_VERSE_TIME,
  DAILY_VERSE_OFF,
} from '../dailyVerse.ts';

const SEED = '3f1c9a7e-2b4d-4c8e-9f10-5a6b7c8d9e0f';

/** 'yyyy-MM-dd' for `n` days after 2026-11-01 */
function dateKey(n: number): string {
  const d = new Date(2026, 10, 1 + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test('the pick is stable for a date: Home and the notification get the same verse', () => {
  for (let n = 0; n < 60; n++) {
    const homeScreen = pickDailyVerse(dateKey(n), SEED);
    const notification = pickDailyVerse(dateKey(n), SEED);
    assert.deepEqual(notification, homeScreen);
  }
  assert.equal(pickDailyVerseIndex('2026-11-15', SEED, 150), pickDailyVerseIndex('2026-11-15', SEED, 150));
});

test('different dates give different verses', () => {
  assert.notDeepEqual(pickDailyVerse('2026-11-15', SEED), pickDailyVerse('2026-11-16', SEED));
  const n = DAILY_VERSE_POOL.length;
  // A full run of the pool: every verse once before any comes back
  const cycleStart = Math.ceil(Date.UTC(2026, 10, 1) / 86400000 / n) * n;
  const run = Array.from({ length: n }, (_, i) => {
    const d = new Date((cycleStart + i) * 86400000);
    return pickDailyVerseIndex(d.toISOString().slice(0, 10), SEED, n);
  });
  assert.equal(new Set(run).size, n);
});

test('never the same verse two days running, across years and cycle boundaries', () => {
  let previous = -1;
  for (let i = 0; i < 1500; i++) {
    const idx = pickDailyVerseIndex(dateKey(i), SEED, DAILY_VERSE_POOL.length);
    assert.notEqual(idx, previous, `${dateKey(i)} repeats the previous day's verse`);
    previous = idx;
  }
});

test('consecutive dates jump around the pool instead of walking through it', () => {
  const picks = Array.from({ length: 30 }, (_, n) => pickDailyVerseIndex(dateKey(n), SEED, DAILY_VERSE_POOL.length));
  assert.equal(new Set(picks).size, 30);
  const steps = picks.slice(1).map((p, i) => (p - picks[i] + DAILY_VERSE_POOL.length) % DAILY_VERSE_POOL.length);
  assert.ok(new Set(steps).size > 10, 'picks advance by a fixed step');
});

test('the seed changes the pick, and the fallback seed is stable', () => {
  const a = Array.from({ length: 10 }, (_, n) => pickDailyVerseIndex(dateKey(n), SEED, DAILY_VERSE_POOL.length));
  const b = Array.from({ length: 10 }, (_, n) => pickDailyVerseIndex(dateKey(n), 'other-install', DAILY_VERSE_POOL.length));
  assert.notDeepEqual(a, b);
  assert.deepEqual(pickDailyVerse('2026-11-15', FALLBACK_SEED), pickDailyVerse('2026-11-15', FALLBACK_SEED));
});

test('every pick is a valid pool entry', () => {
  assert.ok(DAILY_VERSE_POOL.length > 100);
  for (let n = 0; n < 400; n++) {
    const v = pickDailyVerse(dateKey(n), SEED);
    assert.ok(v && v.b >= 1 && v.b <= 66 && v.c >= 1 && v.v >= 1);
  }
});

test('turned off (time null): no daily verse notifications', () => {
  assert.deepEqual(planDailyVerseNotifications(new Date(2026, 10, 15, 6), null), []);
  assert.deepEqual(planDailyVerseNotifications(new Date(2026, 10, 15, 6), 'bad'), []);
});

test('exactly one daily verse notification per day, at the chosen time', () => {
  const plan = planDailyVerseNotifications(new Date(2026, 10, 15, 6), '07:30', 14);
  assert.equal(plan.length, 14);
  assert.equal(new Set(plan.map((p) => p.dateKey)).size, 14);
  assert.ok(plan.every((p) => p.fireAt.getHours() === 7 && p.fireAt.getMinutes() === 30));
  assert.equal(plan[0].id, `${DAILY_VERSE_PREFIX}2026-11-15_0730`);
  assert.ok(!plan.some((p) => p.id.includes('fallback')));
});

test("today is skipped once the time has passed; tomorrow onwards still come", () => {
  const plan = planDailyVerseNotifications(new Date(2026, 10, 15, 9), '07:30', 14);
  assert.equal(plan[0].dateKey, '2026-11-16');
  assert.equal(plan.length, 13);
});

test('changing the time changes every id, so the old ones are replaced', () => {
  const now = new Date(2026, 10, 15, 6);
  const early = new Set(planDailyVerseNotifications(now, '07:30').map((p) => p.id));
  const late = planDailyVerseNotifications(now, '21:00').map((p) => p.id);
  assert.ok(late.every((id) => !early.has(id)));
});

test('default: on at 12:00 AM every day for users who never chose (new install or upgrade)', () => {
  // Nothing stored: a new install, or an existing user after the upgrade
  assert.equal(resolveDailyVerseTime(undefined), DEFAULT_DAILY_VERSE_TIME);
  assert.equal(resolveDailyVerseTime(null), '00:00');
  const plan = planDailyVerseNotifications(new Date(2026, 10, 15, 9), resolveDailyVerseTime(undefined), 14);
  // Today's midnight has passed, so it starts tomorrow at 00:00, one a day
  assert.equal(plan.length, 13);
  assert.equal(plan[0].id, `${DAILY_VERSE_PREFIX}2026-11-16_0000`);
  assert.ok(plan.every((p) => p.fireAt.getHours() === 0 && p.fireAt.getMinutes() === 0));
  assert.equal(new Set(plan.map((p) => p.dateKey)).size, plan.length);
});

test('a time the user chose is kept across upgrades', () => {
  const stored = dailyVerseSettingValue('07:30');
  assert.equal(stored, '07:30');
  assert.equal(resolveDailyVerseTime(stored), '07:30');
  const plan = planDailyVerseNotifications(new Date(2026, 10, 15, 6), resolveDailyVerseTime(stored), 3);
  assert.deepEqual(plan.map((p) => p.id), [
    `${DAILY_VERSE_PREFIX}2026-11-15_0730`,
    `${DAILY_VERSE_PREFIX}2026-11-16_0730`,
    `${DAILY_VERSE_PREFIX}2026-11-17_0730`,
  ]);
});

test('turning it off is kept too, and is not reset to the default', () => {
  const stored = dailyVerseSettingValue(null);
  assert.equal(stored, DAILY_VERSE_OFF);
  assert.equal(resolveDailyVerseTime(stored), null);
  assert.equal(resolveDailyVerseTime(''), null); // written as "off" by an earlier build of this PR
  assert.deepEqual(planDailyVerseNotifications(new Date(2026, 10, 15, 6), resolveDailyVerseTime(stored)), []);
});

test('a corrupt stored value falls back to the 12:00 AM default', () => {
  assert.equal(resolveDailyVerseTime('25:99'), '00:00');
  assert.equal(resolveDailyVerseTime('soon'), '00:00');
});

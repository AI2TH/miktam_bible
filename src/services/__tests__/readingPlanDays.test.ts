import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  groupPlanDays,
  getPlanDayNumberForDate,
  toDateKey,
  type PlanDayEntry,
} from '../readingPlanDays.ts';

/** A plan of `count` days starting on 2026-11-01, with the given days completed */
function plan(count: number, completed: number[] = []): PlanDayEntry[] {
  return Array.from({ length: count }, (_, i) => {
    const dayNumber = i + 1;
    return {
      dayNumber,
      scheduledDate: `2026-11-${String(dayNumber).padStart(2, '0')}`,
      isCompleted: completed.includes(dayNumber),
    };
  });
}

const numbers = (days: PlanDayEntry[]) => days.map((d) => d.dayNumber);

test('pending lists every earlier day that is not done, oldest first', () => {
  const groups = groupPlanDays(plan(30, [1, 3, 4]), '2026-11-07');
  assert.equal(groups.today?.dayNumber, 7);
  assert.deepEqual(numbers(groups.pending), [2, 5, 6]);
});

test('pending is empty when every earlier day is done', () => {
  const groups = groupPlanDays(plan(30, [1, 2, 3]), '2026-11-04');
  assert.deepEqual(numbers(groups.pending), []);
});

test("today's own day is never listed as pending, done or not", () => {
  for (const completed of [[], [5]]) {
    const groups = groupPlanDays(plan(10, completed), '2026-11-05');
    assert.equal(groups.today?.dayNumber, 5);
    assert.ok(!numbers(groups.pending).includes(5));
    assert.ok(!numbers(groups.upcoming).includes(5));
  }
});

test('upcoming shows the next N days after today, including ones already read ahead', () => {
  const groups = groupPlanDays(plan(30, [9]), '2026-11-07', 5);
  assert.deepEqual(numbers(groups.upcoming), [8, 9, 10, 11, 12]);
  assert.equal(groups.upcoming[1].isCompleted, true);
});

test('upcoming stops at the end of the plan', () => {
  const groups = groupPlanDays(plan(10), '2026-11-08', 5);
  assert.deepEqual(numbers(groups.upcoming), [9, 10]);
});

test('completing a future day does not move today or the current day', () => {
  const before = plan(30);
  const after = plan(30, [8, 9, 10]);
  const today = '2026-11-07';
  assert.equal(groupPlanDays(before, today).today?.dayNumber, 7);
  assert.equal(groupPlanDays(after, today).today?.dayNumber, 7);
  assert.equal(getPlanDayNumberForDate(before, today), 7);
  assert.equal(getPlanDayNumberForDate(after, today), 7);
});

test('completing a missed day removes it from pending and does not move today', () => {
  const today = '2026-11-07';
  const before = groupPlanDays(plan(30, [1, 2, 4, 5, 6]), today);
  assert.deepEqual(numbers(before.pending), [3]);
  const after = groupPlanDays(plan(30, [1, 2, 3, 4, 5, 6]), today);
  assert.deepEqual(numbers(after.pending), []);
  assert.equal(after.today?.dayNumber, 7);
  assert.equal(getPlanDayNumberForDate(plan(30, [3]), today), 7);
});

test('before the plan starts: day 1 is next, nothing pending, later days can be read ahead', () => {
  const groups = groupPlanDays(plan(10), '2026-10-30', 3);
  assert.equal(groups.today?.dayNumber, 1);
  assert.deepEqual(numbers(groups.pending), []);
  assert.deepEqual(numbers(groups.upcoming), [2, 3, 4]);
  assert.equal(getPlanDayNumberForDate(plan(10), '2026-10-30'), null);
});

test('after the plan ends: the first unread day is today and the other unread days are pending', () => {
  const groups = groupPlanDays(plan(10, [1, 2, 3, 5, 6, 7, 8, 9]), '2026-11-20');
  assert.equal(groups.today?.dayNumber, 4);
  assert.deepEqual(numbers(groups.pending), [10]);
  assert.deepEqual(numbers(groups.upcoming), []);
  assert.equal(getPlanDayNumberForDate(plan(10), '2026-11-20'), 10);
});

test('after the plan ends with everything done: today is the last day', () => {
  const all = Array.from({ length: 10 }, (_, i) => i + 1);
  const groups = groupPlanDays(plan(10, all), '2026-11-20');
  assert.equal(groups.today?.dayNumber, 10);
  assert.deepEqual(numbers(groups.pending), []);
});

test('plans without dates fall back to the first unread day', () => {
  const undated = plan(6, [1, 2]).map((d) => ({ ...d, scheduledDate: null }));
  const groups = groupPlanDays(undated, '2026-11-07', 2);
  assert.equal(groups.today?.dayNumber, 3);
  assert.deepEqual(numbers(groups.pending), []);
  assert.deepEqual(numbers(groups.upcoming), [4, 5]);
});

test('input order does not matter', () => {
  const groups = groupPlanDays(plan(10, [2]).reverse(), '2026-11-05', 2);
  assert.deepEqual(numbers(groups.pending), [1, 3, 4]);
  assert.deepEqual(numbers(groups.upcoming), [6, 7]);
});

test('an empty plan has nothing to show', () => {
  assert.deepEqual(groupPlanDays([], '2026-11-07'), { today: null, pending: [], upcoming: [] });
});

test('toDateKey uses the local calendar date', () => {
  assert.equal(toDateKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(toDateKey(new Date(2026, 11, 31, 0, 0)), '2026-12-31');
});

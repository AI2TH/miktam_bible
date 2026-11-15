import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  planReminders,
  diffReminders,
  reminderTimesForDate,
  parseReminderTime,
  normalizeRepeatHours,
  reminderIdFor,
  PLAN_REMINDER_PREFIX,
  type ReminderPlanDay,
} from '../reminderSchedule.ts';

/** Local time on a November 2026 date */
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** A 30-day plan starting 2026-11-01, two chapters a day */
function plan(opts: { completed?: number[]; partial?: number[] } = {}): ReminderPlanDay[] {
  return Array.from({ length: 30 }, (_, i) => {
    const dayNumber = i + 1;
    const done = opts.completed?.includes(dayNumber) ?? false;
    return {
      dayNumber,
      scheduledDate: `2026-11-${String(dayNumber).padStart(2, '0')}`,
      isCompleted: done,
      readingLabel: `Genesis ${dayNumber * 2 - 1}–${dayNumber * 2}`,
      chapterCount: 2,
      chaptersRead: done ? 2 : opts.partial?.includes(dayNumber) ? 1 : 0,
    };
  });
}

const base = { planTitle: '1 Year', windowDays: 3, maxCount: 100 };

test('no time picked means no reminders at all', () => {
  assert.deepEqual(planReminders({ ...base, now: at(15, 6), reminderTime: null, days: plan() }), []);
  assert.deepEqual(planReminders({ ...base, now: at(15, 6), reminderTime: '', days: plan() }), []);
  assert.equal(parseReminderTime('25:00'), null);
  assert.equal(parseReminderTime('7:30')?.hour, 7);
});

test('without repeats: one reminder a day at the chosen time', () => {
  const r = planReminders({ ...base, now: at(15, 6), reminderTime: '07:30', days: plan() });
  assert.deepEqual(
    r.map((x) => `${x.dateKey} ${hhmm(x.fireAt)} day ${x.dayNumber}`),
    ['2026-11-15 07:30 day 15', '2026-11-16 07:30 day 16', '2026-11-17 07:30 day 17']
  );
});

test('repeats every 2 hours from the chosen time until midnight', () => {
  const times = reminderTimesForDate('2026-11-15', 19, 30, 2).map(hhmm);
  assert.deepEqual(times, ['19:30', '21:30', '23:30']);
  assert.deepEqual(reminderTimesForDate('2026-11-15', 7, 0, 3).map(hhmm), [
    '07:00', '10:00', '13:00', '16:00', '19:00', '22:00',
  ]);
  assert.equal(reminderTimesForDate('2026-11-15', 7, 0, 1).length, 17); // 07:00 ... 23:00
  assert.deepEqual(reminderTimesForDate('2026-11-15', 7, 0, null).map(hhmm), ['07:00']);
});

test("today's reminders already past are skipped; later repeats still come", () => {
  const r = planReminders({
    ...base,
    windowDays: 2,
    now: at(15, 12, 10),
    reminderTime: '08:00',
    repeatEveryHours: 3,
    days: plan(),
  });
  const today = r.filter((x) => x.dateKey === '2026-11-15').map((x) => hhmm(x.fireAt));
  assert.deepEqual(today, ['14:00', '17:00', '20:00', '23:00']);
  const tomorrow = r.filter((x) => x.dateKey === '2026-11-16').map((x) => hhmm(x.fireAt));
  assert.deepEqual(tomorrow, ['08:00', '11:00', '14:00', '17:00', '20:00', '23:00']);
});

test('a completed day gets no reminders; the next day starts again at the chosen time', () => {
  const r = planReminders({
    ...base,
    windowDays: 2,
    now: at(15, 6),
    reminderTime: '08:00',
    repeatEveryHours: 2,
    days: plan({ completed: [15] }),
  });
  assert.ok(r.every((x) => x.dateKey === '2026-11-16'));
  assert.equal(hhmm(r[0].fireAt), '08:00');
});

test('reading ahead skips that later date', () => {
  const r = planReminders({ ...base, now: at(15, 6), reminderTime: '08:00', days: plan({ completed: [16] }) });
  assert.deepEqual(r.map((x) => x.dateKey), ['2026-11-15', '2026-11-17']);
});

test('marking the last chapter read cancels the rest of that day', () => {
  const input = { ...base, now: at(15, 10, 30), reminderTime: '08:00', repeatEveryHours: 2 };

  // Day 15 is half read: today's remaining repeats are scheduled
  const before = planReminders({ ...input, days: plan({ partial: [15] }) });
  const scheduled = before.map((r) => ({ id: r.id, title: r.title, body: r.body }));
  const todayIds = before.filter((r) => r.dateKey === '2026-11-15').map((r) => r.id);
  assert.deepEqual(
    before.filter((r) => r.dateKey === '2026-11-15').map((r) => hhmm(r.fireAt)),
    ['12:00', '14:00', '16:00', '18:00', '20:00', '22:00']
  );
  assert.match(before[0].body, /1 of 2 read/);

  // The last chapter of day 15 is read: re-sync
  const after = planReminders({ ...input, days: plan({ completed: [15] }) });
  const diff = diffReminders(scheduled, after);
  assert.deepEqual(diff.cancel.sort(), [...todayIds].sort());
  assert.ok(after.every((r) => r.dateKey !== '2026-11-15'));
  // Tomorrow's reminders are unchanged, so nothing is rewritten
  assert.deepEqual(diff.schedule, []);
});

test('partial progress updates the reminder text, which is rescheduled under the same id', () => {
  const input = { ...base, windowDays: 1, now: at(15, 6), reminderTime: '08:00' };
  const unread = planReminders({ ...input, days: plan() });
  const partial = planReminders({ ...input, days: plan({ partial: [15] }) });
  assert.equal(unread[0].id, partial[0].id);
  const diff = diffReminders(unread.map((r) => ({ id: r.id, title: r.title, body: r.body })), partial);
  assert.deepEqual(diff.cancel, []);
  assert.deepEqual(diff.schedule.map((r) => r.id), [partial[0].id]);
  assert.match(diff.schedule[0].body, /Genesis 29–30 \(1 of 2 read\)/);
});

test('turning reminders off or old-style reminders: everything with the prefix is cancelled', () => {
  const scheduled = [
    { id: 'miktam_reading_plan_reminder' }, // the single reminder of earlier versions
    { id: `${PLAN_REMINDER_PREFIX}2026-11-15_0800` },
    { id: 'miktam_votd_2026-11-16' }, // not ours: left alone
  ];
  const diff = diffReminders(scheduled, []);
  assert.deepEqual(diff.cancel, ['miktam_reading_plan_reminder', `${PLAN_REMINDER_PREFIX}2026-11-15_0800`]);
});

test('ids are unique per date and time', () => {
  assert.equal(reminderIdFor(at(15, 8)), 'miktam_reading_plan_2026-11-15_0800');
  const r = planReminders({ ...base, now: at(15, 6), reminderTime: '08:00', repeatEveryHours: 1, days: plan() });
  assert.equal(new Set(r.map((x) => x.id)).size, r.length);
});

test('the cap keeps the first reminder of every day before any repeats', () => {
  const r = planReminders({
    planTitle: 'x',
    now: at(15, 6),
    reminderTime: '07:00',
    repeatEveryHours: 1,
    days: plan(),
    windowDays: 7,
    maxCount: 20,
  });
  assert.equal(r.length, 20);
  const firsts = r.filter((x) => x.repeatIndex === 0).map((x) => x.dateKey);
  assert.equal(firsts.length, 7);
  // Repeats go to the soonest days first, and the list is in time order
  assert.ok(r.filter((x) => x.repeatIndex > 0).every((x) => x.dateKey === '2026-11-15'));
  assert.deepEqual(r, [...r].sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime()));
});

test('after the plan ends, reminders name the first unread day until it is done', () => {
  const days = plan({ completed: Array.from({ length: 29 }, (_, i) => i + 1).filter((d) => d !== 12) });
  const r = planReminders({ ...base, now: at(30, 23, 30), windowDays: 2, reminderTime: '08:00', days });
  // Nov 30 is day 30 (unread, but 08:00 has passed); Dec 1 is after the plan: day 12 is still pending
  assert.equal(r.length, 1);
  assert.equal(r[0].dateKey, '2026-12-01');
  assert.equal(r[0].dayNumber, 12);
  assert.match(r[0].body, /Day 12 is still pending/);
});

test('no reminders before the plan starts', () => {
  const r = planReminders({ ...base, now: at(1, 6), reminderTime: '08:00', days: plan() });
  assert.deepEqual(r.map((x) => x.dateKey), ['2026-11-01', '2026-11-02', '2026-11-03']);
  // From 29 Oct, a 4-day window reaches 1 Nov, the first day of the plan
  const early = planReminders({ ...base, windowDays: 4, now: new Date(2026, 9, 29, 6), reminderTime: '08:00', days: plan() });
  assert.deepEqual(early.map((x) => x.dateKey), ['2026-11-01']);
});

test('repeat interval must be a whole number of hours', () => {
  assert.equal(normalizeRepeatHours(2), 2);
  assert.equal(normalizeRepeatHours(0), null);
  assert.equal(normalizeRepeatHours(1.5), null);
  assert.equal(normalizeRepeatHours(null), null);
});

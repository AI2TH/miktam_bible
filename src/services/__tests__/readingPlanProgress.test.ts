import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeDayProgress,
  formatDayProgress,
  setChapterRead,
  markAllChaptersRead,
  firstUnreadChapter,
  chaptersFromDayRange,
  toDayChapterRows,
  type PlanDayChapter,
} from '../readingPlanProgress.ts';
import { groupPlanDays } from '../readingPlanDays.ts';

const NOW = '2026-11-15T09:00:00.000Z';

/** Genesis 10–12 as a three-chapter day */
function genesis10to12(read: number[] = []): PlanDayChapter[] {
  return toDayChapterRows(chaptersFromDayRange(1, 10, 12)).map((c) => ({
    ...c,
    isRead: read.includes(c.chapter),
  }));
}

test('a day with no chapters read is not started', () => {
  const p = summarizeDayProgress(genesis10to12(), false);
  assert.deepEqual(p, { read: 0, total: 3, isComplete: false, isPartial: false });
  assert.equal(formatDayProgress(p), '0 of 3 read');
});

test('reading some chapters makes the day partial, not complete', () => {
  const p = summarizeDayProgress(genesis10to12([10]), false);
  assert.deepEqual(p, { read: 1, total: 3, isComplete: false, isPartial: true });
  assert.equal(formatDayProgress(p), '1 of 3 read');
});

test('the day is complete only when every chapter is read', () => {
  let chapters = genesis10to12();
  chapters = setChapterRead(chapters, 0, true, NOW);
  chapters = setChapterRead(chapters, 1, true, NOW);
  assert.equal(summarizeDayProgress(chapters, false).isComplete, false);
  chapters = setChapterRead(chapters, 2, true, NOW);
  const p = summarizeDayProgress(chapters, false);
  assert.equal(p.isComplete, true);
  assert.equal(formatDayProgress(p), '3 of 3 read');
});

test('unmarking a chapter makes a complete day incomplete again', () => {
  const chapters = setChapterRead(genesis10to12([10, 11, 12]), 1, false, NOW);
  const p = summarizeDayProgress(chapters, false);
  assert.equal(p.isComplete, false);
  assert.equal(p.read, 2);
  assert.equal(chapters[1].readAt, null);
});

test('marking the whole day done marks every chapter read and keeps earlier read times', () => {
  const before = setChapterRead(genesis10to12(), 0, true, '2026-11-14T08:00:00.000Z');
  const after = markAllChaptersRead(before, NOW);
  assert.ok(after.every((c) => c.isRead));
  assert.equal(after[0].readAt, '2026-11-14T08:00:00.000Z');
  assert.equal(after[2].readAt, NOW);
  assert.equal(summarizeDayProgress(after, false).isComplete, true);
});

test('a day completed before per-chapter tracking counts as fully read', () => {
  // Chapter rows say nothing is read, but the day row is marked complete
  const p = summarizeDayProgress(genesis10to12(), true);
  assert.deepEqual(p, { read: 3, total: 3, isComplete: true, isPartial: false });
});

test('a day without chapter rows counts as one unit', () => {
  assert.deepEqual(summarizeDayProgress([], false), { read: 0, total: 1, isComplete: false, isPartial: false });
  assert.deepEqual(summarizeDayProgress([], true), { read: 1, total: 1, isComplete: true, isPartial: false });
});

test('Navigators-style day: four tracks across different books', () => {
  const chapters: PlanDayChapter[] = toDayChapterRows([
    { bookNumber: 40, chapter: 1 },
    { bookNumber: 1, chapter: 1 },
    { bookNumber: 19, chapter: 1 },
    { bookNumber: 44, chapter: 1 },
  ]).map((c) => ({ ...c, isRead: c.bookNumber === 40 || c.bookNumber === 19 }));
  assert.equal(formatDayProgress(summarizeDayProgress(chapters, false)), '2 of 4 read');
  assert.deepEqual(firstUnreadChapter(chapters), { ...chapters[1] });
});

test('firstUnreadChapter falls back to the first chapter when all are read', () => {
  const all = genesis10to12([10, 11, 12]);
  assert.equal(firstUnreadChapter(all)?.chapter, 10);
  assert.equal(firstUnreadChapter([]), null);
});

test('chaptersFromDayRange covers the saved range and never goes backwards', () => {
  assert.deepEqual(
    chaptersFromDayRange(1, 10, 12).map((c) => c.chapter),
    [10, 11, 12]
  );
  assert.deepEqual(chaptersFromDayRange(19, 5, 3), [{ bookNumber: 19, chapter: 5 }]);
});

/** A dated plan whose days carry per-chapter progress, like getAllPlanDays() returns */
function planWithProgress(readByDay: Record<number, number[]>, markedComplete: number[] = []) {
  return Array.from({ length: 10 }, (_, i) => {
    const dayNumber = i + 1;
    const chapters = toDayChapterRows([
      { bookNumber: 1, chapter: dayNumber * 2 - 1 },
      { bookNumber: 1, chapter: dayNumber * 2 },
    ]).map((c) => ({ ...c, isRead: (readByDay[dayNumber] ?? []).includes(c.seq) }));
    const progress = summarizeDayProgress(chapters, markedComplete.includes(dayNumber));
    return {
      dayNumber,
      scheduledDate: `2026-11-${String(dayNumber).padStart(2, '0')}`,
      isCompleted: progress.isComplete,
      chaptersRead: progress.read,
      chapterCount: progress.total,
      chapters,
    };
  });
}

test('pending lists partly read earlier days with their progress', () => {
  // Day 2: 1 of 2 read. Day 3: both read. Day 4: marked done as a whole. Day 5: nothing.
  const days = planWithProgress({ 2: [0], 3: [0, 1] }, [1, 4]);
  const groups = groupPlanDays(days, '2026-11-06');
  assert.deepEqual(
    groups.pending.map((d) => d.dayNumber),
    [2, 5]
  );
  const day2 = groups.pending[0];
  assert.equal(formatDayProgress({ read: day2.chaptersRead, total: day2.chapterCount }), '1 of 2 read');
  const day5 = groups.pending[1];
  assert.equal(formatDayProgress({ read: day5.chaptersRead, total: day5.chapterCount }), '0 of 2 read');
});

test('a partly read day ahead of today stays in read-ahead with its progress', () => {
  const days = planWithProgress({ 8: [1] });
  const groups = groupPlanDays(days, '2026-11-06', 3);
  const day8 = groups.upcoming.find((d) => d.dayNumber === 8);
  assert.ok(day8);
  assert.equal(day8.isCompleted, false);
  assert.equal(formatDayProgress({ read: day8.chaptersRead, total: day8.chapterCount }), '1 of 2 read');
});

test("today's card shows partial progress and is not complete until the last chapter", () => {
  const partial = groupPlanDays(planWithProgress({ 6: [0] }), '2026-11-06');
  assert.equal(partial.today?.dayNumber, 6);
  assert.equal(partial.today?.isCompleted, false);
  assert.equal(partial.today?.chaptersRead, 1);

  const done = groupPlanDays(planWithProgress({ 6: [0, 1] }), '2026-11-06');
  assert.equal(done.today?.isCompleted, true);
});

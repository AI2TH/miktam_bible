/**
 * Per-chapter progress for reading plan days.
 *
 * A plan day can cover several chapters (Genesis 10–12, or the four tracks of
 * the Navigators plan). Each chapter is stored as its own row in
 * reading_plan_day_chapters; a day is complete only when every chapter is read.
 *
 * Pure helpers: no React Native or database imports, so node:test can run them.
 */

export interface ChapterRef {
  bookNumber: number;
  chapter: number;
}

export interface PlanDayChapter extends ChapterRef {
  /** Position of the chapter within its day, starting at 0 */
  seq: number;
  isRead: boolean;
  readAt?: string | null;
}

export interface DayProgress {
  read: number;
  total: number;
  isComplete: boolean;
  /** Some chapters read, but not all */
  isPartial: boolean;
}

/**
 * Progress of one day.
 *
 * `dayMarkedComplete` is reading_plan_days.is_completed. A day marked complete
 * counts as fully read even if its chapter rows say otherwise, so days completed
 * before per-chapter tracking existed keep showing as done. A day without chapter
 * rows counts as one unit.
 */
export function summarizeDayProgress(
  chapters: ReadonlyArray<{ isRead: boolean }>,
  dayMarkedComplete: boolean
): DayProgress {
  const total = Math.max(chapters.length, 1);
  const readRows = chapters.filter((c) => c.isRead).length;
  const isComplete = dayMarkedComplete || (chapters.length > 0 && readRows === chapters.length);
  const read = isComplete ? total : readRows;
  return { read, total, isComplete, isPartial: !isComplete && read > 0 };
}

/** "1 of 2 read" */
export function formatDayProgress(progress: Pick<DayProgress, 'read' | 'total'>): string {
  return `${progress.read} of ${progress.total} read`;
}

/** Mark one chapter of a day read or unread. Returns a new array. */
export function setChapterRead(
  chapters: ReadonlyArray<PlanDayChapter>,
  seq: number,
  isRead: boolean,
  nowIso: string
): PlanDayChapter[] {
  return chapters.map((c) =>
    c.seq === seq ? { ...c, isRead, readAt: isRead ? c.readAt || nowIso : null } : c
  );
}

/** Marking a whole day done marks every chapter of it read. */
export function markAllChaptersRead(
  chapters: ReadonlyArray<PlanDayChapter>,
  nowIso: string
): PlanDayChapter[] {
  return chapters.map((c) => ({ ...c, isRead: true, readAt: c.readAt || nowIso }));
}

/** The first chapter of the day not read yet, or the first chapter when all are read */
export function firstUnreadChapter<T extends ChapterRef & { isRead: boolean }>(
  chapters: ReadonlyArray<T>
): T | null {
  return chapters.find((c) => !c.isRead) ?? chapters[0] ?? null;
}

/** Chapters from the plan's chapter list, as rows numbered from 0 */
export function toDayChapterRows(chapters: ReadonlyArray<ChapterRef>): Array<ChapterRef & { seq: number }> {
  return chapters.map((c, seq) => ({ bookNumber: c.bookNumber, chapter: c.chapter, seq }));
}

/**
 * Chapters for a stored day when the plan's schedule cannot be regenerated:
 * the single-book range saved on the day row.
 */
export function chaptersFromDayRange(
  bookNumber: number,
  startChapter: number,
  endChapter: number
): ChapterRef[] {
  const end = Math.max(startChapter, endChapter);
  const list: ChapterRef[] = [];
  for (let c = startChapter; c <= end; c++) list.push({ bookNumber, chapter: c });
  return list;
}

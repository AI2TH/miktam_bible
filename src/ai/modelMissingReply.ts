// Kept free of runtime imports so it can be unit-tested with `node --test`.
import type { SearchResult, VerseRef } from '../types/bible';

export const MODEL_MISSING_NOTICE =
  "The AI model isn't downloaded. Here are the most relevant verses:";

export const MODEL_MISSING_NO_RESULTS =
  "The AI model isn't downloaded, and no matching verses were found. Try different words, or download the model.";

/**
 * Build the reply shown when no on-device model is available.
 * It contains only the notice and the retrieved verses (reference + verse text),
 * never generated or canned prose.
 */
export function buildModelMissingReply(
  results: SearchResult[],
  bookName: (bookNumber: number) => string
): { content: string; citedVerses: VerseRef[] } {
  const citedVerses: VerseRef[] = [];
  const seen = new Set<string>();
  const lines: string[] = [];

  for (const r of results) {
    const { bookNumber, chapter, verseNumber, text } = r.verse;
    const key = `${bookNumber}:${chapter}:${verseNumber}`;
    if (seen.has(key)) continue;
    seen.add(key);
    citedVerses.push({ bookNumber, chapter, verseNumber });
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    lines.push(`${bookName(bookNumber)} ${chapter}:${verseNumber} — ${cleanText}`);
  }

  if (lines.length === 0) {
    return { content: MODEL_MISSING_NO_RESULTS, citedVerses };
  }
  return { content: `${MODEL_MISSING_NOTICE}\n\n${lines.join('\n\n')}`, citedVerses };
}

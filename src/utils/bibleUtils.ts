import { BOOK_NAMES, ABBREV_TO_BOOK_NUMBER } from './constants';
import type { VerseRef } from '../types/bible';
import { getBookName } from './bookTranslations';

/**
 * Parses a string reference like "John 3:16" or "Gen 1:1" into a structured VerseRef.
 * Returns null if parsing fails.
 */
export function parseScriptureRef(refStr: string): VerseRef | null {
  const cleanStr = refStr.trim();
  
  // Regex to match "Book Chapter:Verse" (allowing names with spaces and numbers like "1 Kings 3:5")
  const regex = /^([\d\s\w]+)\s+(\d+):(\d+)$/i;
  const match = cleanStr.match(regex);
  
  if (!match) return null;

  const bookNameOrAbbr = match[1].trim();
  const chapter = parseInt(match[2]);
  const verseNumber = parseInt(match[3]);

  // Lookup book number by name
  let bookNumber = 0;
  
  // Try matching full name
  const bookNameNormalized = bookNameOrAbbr.toLowerCase();
  for (const [num, name] of Object.entries(BOOK_NAMES)) {
    if (name.toLowerCase() === bookNameNormalized) {
      bookNumber = parseInt(num);
      break;
    }
  }

  // If not found, try matching abbreviation
  if (bookNumber === 0) {
    // Check standard abbreviations
    for (const [abbr, num] of Object.entries(ABBREV_TO_BOOK_NUMBER)) {
      if (abbr.toLowerCase() === bookNameNormalized) {
        bookNumber = num;
        break;
      }
    }
  }

  if (bookNumber === 0) return null;

  return {
    bookNumber,
    chapter,
    verseNumber,
  };
}

/** Formats a VerseRef back to standard string "John 3:16" */
export function formatScriptureRef(ref: VerseRef, versionIdOrLang?: string): string {
  const bookName = getBookName(ref.bookNumber, versionIdOrLang);
  return `${bookName} ${ref.chapter}:${ref.verseNumber}`;
}

/** Strips Strong's tags, superscript footnotes, and HTML tags like <b> from verse text */
export function cleanVerseText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<S>\d+<\/S>/gi, '')
    .replace(/<S>\d+/gi, '')
    .replace(/\d+<\/S>/gi, '')
    .replace(/<\/?[Ss]\b>?/gi, '')
    .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
    .replace(/<\/?[Bb]>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface HighlightSegment {
  text: string;
  isHighlighted: boolean;
}

/**
 * Parses a string containing <b>...</b> tags into an array of segments.
 * Removes Strong's tags (complete or truncated) and footnotes.
 */
export function parseHighlightedText(text: string): HighlightSegment[] {
  if (!text) return [];

  // 1. Clean Strong's tags and footnotes, including orphaned/truncated ones
  const cleaned = text
    .replace(/<S>\d+<\/S>/gi, '')
    .replace(/<S>\d+/gi, '')
    .replace(/\d+<\/S>/gi, '')
    .replace(/<\/?[Ss]\b>?/gi, '')
    .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 2. Split by <b>...</b> tags
  const parts = cleaned.split(/(<b>.*?<\/b>)/gi);
  
  return parts.map(part => {
    if (part.toLowerCase().startsWith('<b>') && part.toLowerCase().endsWith('</b>')) {
      return {
        text: part.slice(3, -4),
        isHighlighted: true,
      };
    }
    return {
      text: part,
      isHighlighted: false,
    };
  }).filter(seg => seg.text.length > 0);
}



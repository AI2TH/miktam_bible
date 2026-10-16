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

/**
 * Detects if a text contains non-Latin complex scripts (Indic, Thai, Arabic, CJK, etc.)
 * that require system font fallback and generous line heights to prevent overlapping diacritics.
 */
export function isComplexScript(text?: string | null): boolean {
  if (!text) return false;
  // Unicode ranges:
  // \u0900-\u0D7F: Devanagari, Bengali, Gurmukhi, Gujarati, Oriya, Tamil, Telugu, Kannada, Malayalam
  // \u0D80-\u0DFF: Sinhala
  // \u0E00-\u0E7F: Thai
  // \u0E80-\u0EFF: Lao
  // \u0F00-\u0FFF: Tibetan
  // \u1000-\u109F: Myanmar
  // \u0600-\u06FF: Arabic
  // \u0590-\u05FF: Hebrew
  // \u4E00-\u9FFF: CJK
  return /[\u0900-\u109F\u0600-\u06FF\u0590-\u05FF\u4E00-\u9FFF]/.test(text);
}

/** Strips Strong's tags, superscript footnotes, and HTML/XML tags from verse text */
export function cleanVerseText(text: string): string {
  if (!text) return '';
  return text
    .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
    .replace(/<f[^>]*>.*?<\/f>/gi, '')
    .replace(/<S>\d+<\/S>/gi, '')
    .replace(/<S>\d+/gi, '')
    .replace(/\d+<\/S>/gi, '')
    .replace(/<\/?[Ss]\b[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
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

import { GLOBAL_BIBLE_VERSIONS } from '../database/globalBibleCatalog';

let versionAbbrMap: Map<string, string> | null = null;

/**
 * Resolves a version ID (including numeric IDs like '3095') to its standard display abbreviation
 * (e.g. 'KFI', 'KJV', 'ASV', 'RVR1960').
 */
export function getVersionAbbreviation(versionId?: string | null): string {
  if (!versionId) return 'KJV';
  const norm = versionId.toLowerCase().trim();
  if (!norm || norm === 'kjv') return 'KJV';

  if (!versionAbbrMap) {
    versionAbbrMap = new Map();
    for (const v of GLOBAL_BIBLE_VERSIONS) {
      if (v.abbreviation) {
        versionAbbrMap.set(v.id.toLowerCase(), v.abbreviation.toUpperCase());
      }
    }
  }

  const cached = versionAbbrMap.get(norm);
  if (cached) return cached;

  return versionId.toUpperCase();
}

/**
 * Formats multiple verse numbers into a clean reference string.
 * Examples:
 *   [16] -> "John 3:16"
 *   [16, 17, 18] -> "John 3:16-18"
 *   [16, 18, 19] -> "John 3:16, 18-19"
 */
export function formatMultiVerseRef(
  bookName: string,
  chapter: number,
  verseNumbers: number[]
): string {
  if (verseNumbers.length === 0) return `${bookName} ${chapter}`;
  const sorted = [...verseNumbers].sort((a, b) => a - b);

  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
    } else {
      ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = sorted[i];
      prev = sorted[i];
    }
  }
  ranges.push(start === prev ? `${start}` : `${start}-${prev}`);

  return `${bookName} ${chapter}:${ranges.join(', ')}`;
}


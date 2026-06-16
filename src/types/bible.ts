/** A single Bible verse */
export interface Verse {
  id: number;
  versionId: string;         // 'kjv', 'web', 'asv'
  bookNumber: number;        // 1-66
  chapter: number;
  verseNumber: number;
  text: string;
}

/** A book of the Bible */
export interface Book {
  id: number;
  versionId: string;
  bookNumber: number;        // 1=Genesis ... 66=Revelation
  name: string;              // 'Genesis'
  abbreviation: string;      // 'Gen'
  testament: 'OT' | 'NT';
  totalChapters: number;
}

/** A Bible translation/version */
export interface BibleVersion {
  id: string;                // 'kjv'
  name: string;              // 'King James Version'
  language: string;          // 'en'
  isDownloaded: boolean;
  downloadDate: string | null;
  totalSizeMb: number;
}

/** Search result from FTS5 or hybrid search */
export interface SearchResult {
  verse: Verse;
  bookName: string;
  score: number;             // RRF score or FTS rank
  snippet: string;           // Highlighted text snippet
  source: 'fts' | 'vector' | 'hybrid';
}

/** Verse reference for navigation */
export interface VerseRef {
  bookNumber: number;
  chapter: number;
  verseNumber: number;
  versionId?: string;
}

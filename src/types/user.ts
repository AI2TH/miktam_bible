export interface Profile {
  id: string;                // 'local_user' by default
  displayName: string;
  preferredVersion: string;  // 'kjv'
  preferredLanguage: string; // 'en'
  syncEnabled: boolean;
  remoteUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;                // UUID
  versionId: string;
  bookNumber: number;
  chapter: number;
  verseNumber: number;
  highlightColor: string;    // Hex color
  createdAt: string;
  updatedAt: string;
  isSynced: boolean;
}

export interface Note {
  id: string;
  versionId: string;
  bookNumber: number;
  chapter: number;
  verseNumber: number | null; // null = chapter-level note
  content: string;            // Rich text (markdown)
  createdAt: string;
  updatedAt: string;
  isSynced: boolean;
}

export interface Recording {
  id: string;
  title: string;
  localFilePath: string;      // file:///path/on/device.m4a
  durationSecs: number;
  transcript: string | null;
  transcriptionStatus: 'pending' | 'processing' | 'done' | 'failed';
  linkedBook: number | null;
  linkedChapter: number | null;
  linkedVerse: number | null;
  isSynced: boolean;
  createdAt: string;
}

export interface ReadingProgress {
  id: string;
  versionId: string;
  bookNumber: number;
  chapter: number;
  readDate: string;           // YYYY-MM-DD
  readingTimeSecs: number;
  isSynced: boolean;
}

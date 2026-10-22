/**
 * Global Bible Catalog for Miktam Bible
 * 
 * Shows ONLY and EXACTLY what is hosted, verified, and populated with real Scripture in AI2TH database repositories:
 * - AI2TH/bible_db
 * - AI2TH/bible_db_languages_a_f
 * - AI2TH/bible_db_languages_g_m
 * - AI2TH/bible_db_languages_n_s
 * - AI2TH/bible_db_languages_t_z
 * 
 * Total Languages: 1,279
 * Total Versions: 2,633
 */

import {
  REMOTE_BIBLE_LANGUAGES,
  REMOTE_BIBLE_VERSIONS,
  RemoteLanguage,
  RemoteVersionItem,
} from './remoteBibleCatalog';

export interface GlobalLanguage {
  code: string;
  name: string;
  localName: string;
  versionCount: number;
}

export interface GlobalVersionCatalogItem {
  id: string;
  abbreviation: string;
  name: string;
  language: string;
  languageName: string;
  isDownloaded: boolean;
  totalSizeMb: number;
  hasAudio: boolean;
  source?: string;
}

export const GLOBAL_LANGUAGES: GlobalLanguage[] = REMOTE_BIBLE_LANGUAGES;

export const GLOBAL_BIBLE_VERSIONS: GlobalVersionCatalogItem[] = REMOTE_BIBLE_VERSIONS;

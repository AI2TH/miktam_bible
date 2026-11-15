import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CREATE_TABLES_SQL, SCHEMA_VERSION, createRecordingsTableSql } from '../database/schema';
import { GLOBAL_LANGUAGES, GLOBAL_BIBLE_VERSIONS } from '../database/globalBibleCatalog';

let db: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;
// Shared by concurrent callers so seeding/copying and schema setup run only once
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

let searchDb: SQLite.SQLiteDatabase | null = null;
let isSearchInitialized = false;

/**
 * Initialize the database. Call once at app startup in root _layout.tsx.
 * - Checks if preloaded bible.db exists in local sandbox; if not, copies it from assets
 * - Opens the SQLite database
 * - Sets performance PRAGMAs
 * - Runs schema creation (no-op if tables exist)
 * - Returns the singleton database instance
 */
// Minimum expected size for the initial KJV Bible database (~400MB uncompressed, at least 50MB)
const MIN_VALID_DB_SIZE = 50 * 1024 * 1024;
const SEEDED_DB_VERSION = '1.1.0';

async function copySourceDatabase(targetPath: string): Promise<boolean> {
  const possibleUris = [
    'file:///sdcard/Download/bible.db',
    'file:///sdcard/bible.db',
    `${FileSystem.bundleDirectory || 'asset:/'}bible.db`,
    'asset:/bible.db',
    'asset:///bible.db'
  ];

  for (const uri of possibleUris) {
    try {
      console.log('[DB] Checking source database candidate:', uri);
      const info = await FileSystem.getInfoAsync(uri);
      const infoSize = info.exists && 'size' in info ? (info.size || 0) : 0;
      
      // If on sdcard or local file, verify candidate exists
      if (uri.startsWith('file://') && (!info.exists || infoSize < MIN_VALID_DB_SIZE)) {
        console.log(`[DB] Candidate ${uri} skipped (exists: ${info.exists}, size: ${infoSize})`);
        continue;
      }

      console.log('[DB] Copying database from:', uri);
      await FileSystem.copyAsync({
        from: uri,
        to: targetPath
      });

      const newInfo = await FileSystem.getInfoAsync(targetPath);
      const newSize = newInfo.exists && 'size' in newInfo ? (newInfo.size || 0) : 0;
      if (newInfo.exists && newSize >= MIN_VALID_DB_SIZE) {
        console.log(`[DB] Database successfully copied from ${uri} (size: ${newSize} bytes)`);
        await AsyncStorage.setItem('seeded_bible_db_version', SEEDED_DB_VERSION);
        return true;
      } else {
        console.warn(`[DB] Copied database is too small or truncated (${newSize} bytes). Trying next...`);
      }
    } catch (e) {
      console.warn(`[DB] Failed copying from candidate ${uri}:`, e);
    }
  }
  return false;
}

export function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db && isInitialized) return Promise.resolve(db);
  if (!initPromise) {
    initPromise = openAndPrepareDatabase().catch((e) => {
      // Allow a later retry instead of caching the failure forever
      initPromise = null;
      throw e;
    });
  }
  return initPromise;
}

async function openAndPrepareDatabase(): Promise<SQLite.SQLiteDatabase> {
  const dbDir = `${FileSystem.documentDirectory}SQLite`;
  const dbPath = `${dbDir}/bible.db`;

  try {
    // Ensure SQLite directory exists
    const dirInfo = await FileSystem.getInfoAsync(dbDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
    }

    const dbInfo = await FileSystem.getInfoAsync(dbPath);
    const dbInfoSize = dbInfo.exists && 'size' in dbInfo ? (dbInfo.size || 0) : 0;
    const currentSeededVer = await AsyncStorage.getItem('seeded_bible_db_version');
    const isVersionMatch = currentSeededVer === SEEDED_DB_VERSION;
    const isValidSize = dbInfo.exists && dbInfoSize >= MIN_VALID_DB_SIZE && isVersionMatch;

    if (!isValidSize) {
      if (dbInfo.exists) {
        console.log(`[DB] Local database is outdated or invalid (${dbInfoSize} bytes, seededVer: ${currentSeededVer}). Removing to re-seed...`);
        try {
          await FileSystem.deleteAsync(dbPath, { idempotent: true });
          await FileSystem.deleteAsync(`${dbPath}-wal`, { idempotent: true });
          await FileSystem.deleteAsync(`${dbPath}-shm`, { idempotent: true });
        } catch (delError) {
          console.warn('[DB] Failed to delete existing database:', delError);
        }
      }
      console.log('[DB] Seeding database...');
      await copySourceDatabase(dbPath);
    } else {
      console.log(`[DB] Valid database found on disk (${dbInfoSize} bytes).`);
    }
  } catch (error) {
    console.error('[DB] Error verifying/seeding database:', error);
  }

  // Open database connection
  const database = await SQLite.openDatabaseAsync('bible.db');

  // Fast non-blocking sanity check (<1ms)
  try {
    await database.getFirstAsync('SELECT id FROM verses LIMIT 1;');
    console.log('[DB] Database sanity check verified: healthy');
  } catch (checkErr) {
    console.warn('[DB] Database sanity check warning:', checkErr);
  }

  // Performance PRAGMAs
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = 10000;
    PRAGMA foreign_keys = ON;
    PRAGMA temp_store = MEMORY;
  `);

  // Run all CREATE TABLE statements (failsafes to ensure local tables match schema if any changes are made)
  for (const sql of CREATE_TABLES_SQL) {
    try {
      await database.execAsync(sql);
    } catch (e) {
      console.error('[DB] Error executing schema statement:', sql, e);
    }
  }

  // Rebuild tables whose constraints predate the current schema
  await migrateRecordingsStatusConstraint(database);
  await rebuildNotesSearchIndexOnce(database);

  // Set schema version
  await database.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);

  // Populate all 2,456+ global languages and 3,823+ version combinations if not yet populated
  await populateGlobalBibleCatalog(database);

  // Automatically sync local model files with database state
  await syncLocalModels(database);

  // Cleanup any corrupted fallback downloads where non-KJV version received duplicate KJV verses
  try {
    const corrupted = await database.getAllAsync<{ id: string }>(
      `SELECT DISTINCT bv.id FROM bible_versions bv
       JOIN verses v ON LOWER(bv.id) = LOWER(v.version_id)
       WHERE LOWER(bv.id) NOT IN ('kjv', 'akjv', 'ukjv', 'rnkjv', 'kjva', 'kjvpce')
         AND v.book_number = 1 AND v.chapter = 1 AND v.verse_number = 1
         AND v.text LIKE 'In the beginning God created the heaven and the earth%'
         AND bv.is_downloaded = 1`
    );
    for (const row of corrupted) {
      console.log(`[DB] Cleaning up corrupted fallback version: ${row.id}`);
      await database.runAsync('DELETE FROM verses WHERE LOWER(version_id) = ?', [row.id.toLowerCase()]);
      await database.runAsync('DELETE FROM books WHERE LOWER(version_id) = ?', [row.id.toLowerCase()]);
      await database.runAsync('UPDATE bible_versions SET is_downloaded = 0, download_date = NULL WHERE LOWER(id) = ?', [row.id.toLowerCase()]);
    }
    // Also ensure aldhelm has no non-Psalms verses if previously seeded
    await database.runAsync("DELETE FROM verses WHERE LOWER(version_id) = 'aldhelm' AND book_number != 19;");

    // Automatically correct any non-KJV versions incorrectly marked as downloaded if they have no verses
    await database.runAsync(`
      UPDATE bible_versions
      SET is_downloaded = 0, download_date = NULL
      WHERE LOWER(id) NOT IN ('kjv')
        AND is_downloaded = 1
        AND id NOT IN (SELECT DISTINCT version_id FROM verses);
    `);
  } catch (cleanErr) {
    console.warn('[DB] Cleanup notice:', cleanErr);
  }

  console.log('[DB] Database initialized, schema version:', SCHEMA_VERSION);
  db = database;
  isInitialized = true;
  return database;
}

/**
 * Earlier versions of noteService wrote to notes_fts by hand on top of the
 * notes_ai/notes_au/notes_ad triggers, which corrupts the external-content FTS
 * index (stale or missing note search results). Rebuild it once from the notes table.
 */
async function rebuildNotesSearchIndexOnce(database: SQLite.SQLiteDatabase): Promise<void> {
  const FLAG = 'notes_fts_rebuilt_v1';
  try {
    if ((await AsyncStorage.getItem(FLAG)) === '1') return;
    await database.execAsync(`INSERT INTO notes_fts(notes_fts) VALUES('rebuild')`);
    await AsyncStorage.setItem(FLAG, '1');
  } catch (e) {
    console.warn('[DB] Failed to rebuild notes search index:', e);
  }
}

/**
 * Older databases (including the preseeded bible.db) were created with a CHECK
 * constraint that rejects transcription_status = 'needs_model'. SQLite cannot
 * alter a CHECK constraint, so copy the rows into a table with the current DDL.
 */
async function migrateRecordingsStatusConstraint(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const row = await database.getFirstAsync<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'recordings'"
    );
    if (!row || row.sql.includes('needs_model')) return;

    console.log('[DB] Migrating recordings table to allow the needs_model status');
    const columns =
      'id, title, local_file_path, duration_secs, transcript, transcription_status, linked_book, linked_chapter, linked_verse, is_synced, created_at';
    await database.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync('DROP TABLE IF EXISTS recordings_migrating');
      await txn.execAsync(createRecordingsTableSql('recordings_migrating'));
      await txn.execAsync(
        `INSERT INTO recordings_migrating (${columns}) SELECT ${columns} FROM recordings`
      );
      await txn.execAsync('DROP TABLE recordings');
      await txn.execAsync('ALTER TABLE recordings_migrating RENAME TO recordings');
    });
  } catch (e) {
    console.error('[DB] Failed to migrate recordings table:', e);
  }
}

/**
 * Seed all 2,459 world languages and 3,844 Bible version combinations into SQLite.
 * Uses batch transaction for lightning-fast execution (<100ms).
 */
async function populateGlobalBibleCatalog(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const versionCountRow = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM bible_versions'
    );
    if (versionCountRow && versionCountRow.count >= 2600) {
      // Ensure KJV is always marked downloaded
      await database.runAsync("UPDATE bible_versions SET is_downloaded = 1 WHERE LOWER(id) = 'kjv'");
      return; // Already populated with verified catalog
    }

    console.log(`[DB] Seeding global Bible catalog: ${GLOBAL_LANGUAGES.length} languages & ${GLOBAL_BIBLE_VERSIONS.length} verified versions...`);
    await database.withTransactionAsync(async () => {
      // 1. Seed languages
      for (const lang of GLOBAL_LANGUAGES) {
        await database.runAsync(
          'INSERT OR REPLACE INTO bible_languages (code, name, local_name, version_count) VALUES (?, ?, ?, ?)',
          [lang.code, lang.name, lang.localName, lang.versionCount]
        );
      }

      // 2. Seed all translations
      for (const v of GLOBAL_BIBLE_VERSIONS) {
        const isKjv = v.id.toLowerCase() === 'kjv';
        await database.runAsync(
          'INSERT OR IGNORE INTO bible_versions (id, name, language, is_downloaded, total_size_mb) VALUES (?, ?, ?, ?, ?)',
          [v.id, v.name, v.language, isKjv ? 1 : 0, isKjv ? 32.0 : 25.0]
        );
      }

      // Ensure KJV is marked downloaded
      await database.runAsync("UPDATE bible_versions SET is_downloaded = 1 WHERE LOWER(id) = 'kjv'");
    });
    console.log('[DB] Successfully seeded all verified world languages and translations into SQLite!');
  } catch (seedErr) {
    console.warn('[DB] Failed to seed global Bible catalog:', seedErr);
  }
}

/**
 * Automatically find local GGUF/bin files in the models folder
 * and update their `is_downloaded` and `file_path` state in the database.
 */
async function syncLocalModels(database: SQLite.SQLiteDatabase): Promise<void> {
  const modelsDir = `${FileSystem.documentDirectory}models/`;
  try {
    const dirInfo = await FileSystem.getInfoAsync(modelsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(modelsDir, { intermediates: true });
    }

    // Check if models exist in document directory
    const liteModelPath = `${modelsDir}bibleslm-0.5b-q4.gguf`;
    const liteModelInfo = await FileSystem.getInfoAsync(liteModelPath);
    if (liteModelInfo.exists) {
      console.log(`[DB] Pre-packaged model found in document directory (size: ${liteModelInfo.size || 0} bytes)`);
    }

    const files = await FileSystem.readDirectoryAsync(modelsDir);
    console.log('[DB] Found files in models directory:', files);

    // Get all registered models from database
    const dbModels = await database.getAllAsync<any>('SELECT id, model_type FROM ai_models');
    
    for (const model of dbModels) {
      // Check if there is a file on disk matching the pattern: model.id + '.gguf' or model.id + '.bin'
      const matchFile = files.find(f => f.startsWith(model.id));
      if (matchFile) {
        const filePath = `${modelsDir}${matchFile}`;
        console.log(`[DB] Syncing model on disk: ${model.id} -> ${filePath}`);
        await database.runAsync(
          `UPDATE ai_models SET is_downloaded = 1, file_path = ? WHERE id = ?`,
          [filePath, model.id]
        );
      } else {
        // If file doesn't exist on disk, ensure database is synced to 0
        await database.runAsync(
          `UPDATE ai_models SET is_downloaded = 0, file_path = NULL WHERE id = ? AND is_downloaded = 1`,
          [model.id]
        );
      }
    }
  } catch (e) {
    console.error('[DB] Error syncing local models:', e);
  }
}


/**
 * Get the singleton database instance.
 * Throws if initDatabase() hasn't been called yet.
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db || !isInitialized) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Lazily open a second SQLite connection to the same bible.db file.
 * Because the database is in WAL mode, read-heavy operations on this
 * connection (search, spell-check dictionary) do not block the main
 * connection used by the reader, bookmarks, etc.
 */
export function initSearchDatabase(): Promise<SQLite.SQLiteDatabase> {
  return initDatabase();
}

/**
 * Get the unified database connection for search operations.
 * Throws if initDatabase() hasn't been called yet.
 */
export function getSearchDatabase(): SQLite.SQLiteDatabase {
  return getDatabase();
}

/**
 * Check if the database has been initialized.
 */
export function isDatabaseInitialized(): boolean {
  return isInitialized;
}

/**
 * Close the database connection. Call on app termination.
 */
export async function closeDatabase(): Promise<void> {
  if (searchDb) {
    await searchDb.closeAsync();
    searchDb = null;
    isSearchInitialized = false;
  }
  if (initPromise) {
    // Wait for an in-flight init so we don't close a half-prepared connection
    await initPromise.catch(() => {});
    initPromise = null;
  }
  if (db) {
    await db.closeAsync();
    db = null;
    isInitialized = false;
  }
}

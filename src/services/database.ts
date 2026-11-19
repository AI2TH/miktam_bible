import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from '../database/schema';
import {
  USER_DB_FILE,
  USER_SCHEMA,
  attachUserSchema,
  exportUserDataBeforeReseed,
  hasUserTables,
  needsReseed,
  type SqlExecutor,
} from '../database/userSchema';
import { runMigrations } from '../database/migrations';
import { GLOBAL_LANGUAGES, GLOBAL_BIBLE_VERSIONS } from '../database/globalBibleCatalog';
import { SEED_DB, checkSeedChecksum, seedSourceCandidates } from '../database/seedManifest';
import { LLM_MODEL_ID, renamedModelFile } from '../ai/modelCatalog';

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
const MIN_VALID_DB_SIZE = SEED_DB.minSize;
const SEEDED_DB_VERSION = SEED_DB.version;

async function copySourceDatabase(targetPath: string): Promise<boolean> {
  // /sdcard candidates exist only in development builds (any app can write there)
  const possibleUris = seedSourceCandidates(__DEV__, FileSystem.bundleDirectory);

  for (const uri of possibleUris) {
    const isSharedStorage = uri.startsWith('file:///sdcard');
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

      const newInfo = await FileSystem.getInfoAsync(targetPath, { md5: !isSharedStorage && !!SEED_DB.md5 });
      const newSize = newInfo.exists && 'size' in newInfo ? (newInfo.size || 0) : 0;
      if (!newInfo.exists || newSize < MIN_VALID_DB_SIZE) {
        console.warn(`[DB] Copied database is too small or truncated (${newSize} bytes). Trying next...`);
        await FileSystem.deleteAsync(targetPath, { idempotent: true });
        continue;
      }

      // Verify the bundled seed against the manifest (dev /sdcard copies are test files)
      if (!isSharedStorage) {
        const md5 = newInfo.exists && 'md5' in newInfo ? newInfo.md5 : undefined;
        const check = checkSeedChecksum(md5, SEED_DB.md5);
        if (check === 'mismatch') {
          console.error(`[DB] Seed checksum mismatch from ${uri} (got ${md5}, expected ${SEED_DB.md5}). Trying next...`);
          await FileSystem.deleteAsync(targetPath, { idempotent: true });
          continue;
        }
        if (check === 'unchecked') {
          console.warn('[DB] Seed checksum not set in seedManifest.ts; copy accepted unchecked');
        }
      }

      console.log(`[DB] Database successfully copied from ${uri} (size: ${newSize} bytes)`);
      await AsyncStorage.setItem('seeded_bible_db_version', SEEDED_DB_VERSION);
      return true;
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

/** Adapt an expo-sqlite connection to the executor used by userSchema.ts. */
function executor(database: SQLite.SQLiteDatabase): SqlExecutor {
  return {
    exec: (sql) => database.execAsync(sql),
    all: <T,>(sql: string, params: (string | number | null)[] = []) => database.getAllAsync<T>(sql, params),
    run: async (sql, params = []) => {
      await database.runAsync(sql, params);
    },
    transaction: (fn) => database.withTransactionAsync(fn),
  };
}

/** expo-file-system URIs start with file://; SQLite's ATTACH wants a plain path. */
function toFsPath(uri: string): string {
  return decodeURI(uri.replace(/^file:\/\//, ''));
}

/**
 * Before bible.db is replaced by the bundled seed, copy its user tables into
 * user.db. Returns false if that failed, in which case bible.db must not be deleted.
 */
async function exportUserDataFromOldDatabase(userDbPath: string): Promise<boolean> {
  let old: SQLite.SQLiteDatabase | null = null;
  try {
    old = await SQLite.openDatabaseAsync('bible.db');
    await old.runAsync(`ATTACH DATABASE ? AS ${USER_SCHEMA}`, [userDbPath]);
    const copied = await exportUserDataBeforeReseed(executor(old));
    console.log('[DB] Saved user data to user.db before re-seeding:', copied);
    await old.execAsync(`DETACH DATABASE ${USER_SCHEMA}`);
    return true;
  } catch (e) {
    console.error('[DB] Could not save user data before re-seeding:', e);
    return false;
  } finally {
    if (old) await old.closeAsync().catch(() => {});
  }
}

async function deleteDatabaseFiles(dbPath: string): Promise<void> {
  for (const suffix of ['', '-wal', '-shm']) {
    await FileSystem.deleteAsync(`${dbPath}${suffix}`, { idempotent: true });
  }
}

/** Keep the old file aside instead of deleting it when its user data could not be copied. */
async function backUpDatabaseFiles(dbPath: string): Promise<void> {
  const backup = `${dbPath}.pre-reseed`;
  await deleteDatabaseFiles(backup);
  for (const suffix of ['', '-wal', '-shm']) {
    const info = await FileSystem.getInfoAsync(`${dbPath}${suffix}`);
    if (info.exists) {
      await FileSystem.moveAsync({ from: `${dbPath}${suffix}`, to: `${backup}${suffix}` });
    }
  }
  console.warn(`[DB] Old database kept at ${backup}`);
}

async function openAndPrepareDatabase(): Promise<SQLite.SQLiteDatabase> {
  const dbDir = `${FileSystem.documentDirectory}SQLite`;
  const dbPath = `${dbDir}/bible.db`;
  const userDbPath = toFsPath(`${dbDir}/${USER_DB_FILE}`);

  try {
    // Ensure SQLite directory exists
    const dirInfo = await FileSystem.getInfoAsync(dbDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
    }

    const dbInfo = await FileSystem.getInfoAsync(dbPath);
    const dbInfoSize = dbInfo.exists && 'size' in dbInfo ? (dbInfo.size || 0) : 0;
    const currentSeededVer = await AsyncStorage.getItem('seeded_bible_db_version');
    const reseed = needsReseed({
      exists: dbInfo.exists,
      size: dbInfoSize,
      minSize: MIN_VALID_DB_SIZE,
      seededVersion: currentSeededVer,
      expectedVersion: SEEDED_DB_VERSION,
    });

    if (reseed) {
      if (dbInfo.exists) {
        console.log(`[DB] Local database is outdated or invalid (${dbInfoSize} bytes, seededVer: ${currentSeededVer}). Re-seeding...`);
        // Notes, highlights, plans and recordings must survive the re-seed
        const saved = await exportUserDataFromOldDatabase(userDbPath);
        try {
          if (saved) {
            await deleteDatabaseFiles(dbPath);
          } else {
            await backUpDatabaseFiles(dbPath);
          }
        } catch (delError) {
          console.warn('[DB] Failed to remove the old database:', delError);
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

  // Schema version before this launch, for the migrations below
  let previousVersion = 0;
  try {
    const row = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    previousVersion = row?.user_version ?? 0;
  } catch (e) {
    console.warn('[DB] Could not read user_version:', e);
  }

  // Run all CREATE TABLE statements (failsafes to ensure local tables match schema if any changes are made)
  for (const sql of CREATE_TABLES_SQL) {
    try {
      await database.execAsync(sql);
    } catch (e) {
      console.error('[DB] Error executing schema statement:', sql, e);
    }
  }

  // User data lives in user.db, attached as `user`. Moving the tables out of
  // bible.db also rebuilds recordings with the current CHECK constraint.
  await attachUserDatabase(database, userDbPath);
  await rebuildNotesSearchIndexOnce(database);

  // Upgrade existing tables, then record the schema version. If a migration
  // fails the version is left alone so it runs again on the next launch.
  try {
    await runMigrations(database, previousVersion);
    await database.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  } catch (e) {
    console.error('[DB] Migration failed:', e);
  }

  // Populate all 2,456+ global languages and 3,823+ version combinations if not yet populated
  await populateGlobalBibleCatalog(database);

  // Rename model files saved under old ids, then sync model files with database state
  await migrateModelFiles();
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
 * Attach user.db and make sure the user tables live only there. If the attach
 * fails but bible.db still holds the user tables, keep working from those.
 */
async function attachUserDatabase(database: SQLite.SQLiteDatabase, userDbPath: string): Promise<void> {
  const exec = executor(database);
  try {
    await database.runAsync(`ATTACH DATABASE ? AS ${USER_SCHEMA}`, [userDbPath]);
    await database.execAsync(`PRAGMA ${USER_SCHEMA}.journal_mode = WAL`);
  } catch (e) {
    if (await hasUserTables(exec, 'main').catch(() => false)) {
      console.error('[DB] Could not attach user.db; using the user tables in bible.db:', e);
      return;
    }
    throw e;
  }
  const moved = await attachUserSchema(exec);
  if (Object.keys(moved).length > 0) {
    console.log('[DB] Moved user data from bible.db to user.db:', moved);
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
 * Model files are named after the model id. Rename files saved under an id that
 * has since changed (see MODEL_ID_RENAMES), so a downloaded model is not lost.
 */
async function migrateModelFiles(): Promise<void> {
  const modelsDir = `${FileSystem.documentDirectory}models/`;
  try {
    const dirInfo = await FileSystem.getInfoAsync(modelsDir);
    if (!dirInfo.exists) return;
    for (const file of await FileSystem.readDirectoryAsync(modelsDir)) {
      const renamed = renamedModelFile(file);
      if (!renamed) continue;
      const target = `${modelsDir}${renamed}`;
      if ((await FileSystem.getInfoAsync(target)).exists) {
        await FileSystem.deleteAsync(`${modelsDir}${file}`, { idempotent: true });
      } else {
        await FileSystem.moveAsync({ from: `${modelsDir}${file}`, to: target });
      }
      console.log(`[DB] Renamed model file ${file} -> ${renamed}`);
    }
  } catch (e) {
    console.warn('[DB] Failed to rename model files:', e);
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
    const liteModelPath = `${modelsDir}${LLM_MODEL_ID}.gguf`;
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

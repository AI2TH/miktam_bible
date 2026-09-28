import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from '../database/schema';
import { GLOBAL_LANGUAGES, GLOBAL_BIBLE_VERSIONS } from '../database/globalBibleCatalog';

let db: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

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
// Minimum expected size for the full 651MB Bible database (must be at least 600MB)
const MIN_VALID_DB_SIZE = 600 * 1024 * 1024;

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
        await AsyncStorage.setItem('seeded_bible_db_version', '1.0.9');
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

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

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
    const isValidSize = dbInfo.exists && dbInfoSize >= MIN_VALID_DB_SIZE;

    if (!isValidSize) {
      if (dbInfo.exists) {
        console.log(`[DB] Local database is invalid or truncated (${dbInfoSize} bytes). Removing to re-seed...`);
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
  db = await SQLite.openDatabaseAsync('bible.db');

  // Verify integrity with quick_check and auto-recover if malformed
  try {
    const check = await db.getAllAsync<{ quick_check: string }>('PRAGMA quick_check(1);');
    if (!check || check.length === 0 || check[0].quick_check !== 'ok') {
      throw new Error(`Integrity check failed: ${JSON.stringify(check)}`);
    }
    console.log('[DB] Database integrity verified: healthy');
  } catch (corruptErr) {
    console.error('[DB] Database corrupted on disk! Initiating self-healing re-seed...', corruptErr);
    try {
      await db.closeAsync();
    } catch (_) {}
    db = null;

    await FileSystem.deleteAsync(dbPath, { idempotent: true });
    await FileSystem.deleteAsync(`${dbPath}-wal`, { idempotent: true });
    await FileSystem.deleteAsync(`${dbPath}-shm`, { idempotent: true });
    await AsyncStorage.removeItem('seeded_bible_db_version');

    const copied = await copySourceDatabase(dbPath);
    if (copied) {
      db = await SQLite.openDatabaseAsync('bible.db');
      console.log('[DB] Database successfully healed and re-opened.');
    } else {
      throw new Error('Self-healing failed: could not copy valid database.');
    }
  }

  // Performance PRAGMAs
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = 10000;
    PRAGMA foreign_keys = ON;
    PRAGMA temp_store = MEMORY;
  `);

  // Run all CREATE TABLE statements (failsafes to ensure local tables match schema if any changes are made)
  for (const sql of CREATE_TABLES_SQL) {
    try {
      await db.execAsync(sql);
    } catch (e) {
      console.error('[DB] Error executing schema statement:', sql, e);
    }
  }

  // Set schema version
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);

  // Populate all 2,456+ global languages and 3,823+ version combinations if not yet populated
  await populateGlobalBibleCatalog(db);

  // Automatically sync local model files with database state
  await syncLocalModels(db);

  console.log('[DB] Database initialized, schema version:', SCHEMA_VERSION);
  isInitialized = true;
  return db;
}

/**
 * Seed all 2,459 world languages and 3,844 Bible version combinations into SQLite.
 * Uses batch transaction for lightning-fast execution (<100ms).
 */
async function populateGlobalBibleCatalog(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const langCountRow = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM bible_languages'
    );
    if (langCountRow && langCountRow.count >= 2000) {
      return; // Already populated
    }

    console.log('[DB] Seeding global Bible catalog: 2,459 languages & 3,844 versions...');
    await database.withTransactionAsync(async () => {
      // 1. Seed languages
      for (const lang of GLOBAL_LANGUAGES) {
        await database.runAsync(
          'INSERT OR IGNORE INTO bible_languages (code, name, local_name, version_count) VALUES (?, ?, ?, ?)',
          [lang.code, lang.name, lang.localName, lang.versionCount]
        );
      }

      // 2. Seed all 3,844 translations
      for (const v of GLOBAL_BIBLE_VERSIONS) {
        await database.runAsync(
          'INSERT OR IGNORE INTO bible_versions (id, name, language, is_downloaded, total_size_mb) VALUES (?, ?, ?, ?, ?)',
          [v.id, v.name, v.language, 0, 25.0]
        );
      }
    });
    console.log('[DB] Successfully seeded all world languages and translations into SQLite!');
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

    // Pre-seed the lite model if it's in the native bundle assets
    const liteModelPath = `${modelsDir}bibleslm-0.5b-q4.gguf`;
    const liteModelInfo = await FileSystem.getInfoAsync(liteModelPath);
    if (!liteModelInfo.exists) {
      console.log('[DB] Pre-packaged lite model (bibleslm-0.5b-q4.gguf) not found in document directory. Checking native assets for seeding...');
      const possibleModelUris = [
        `${FileSystem.bundleDirectory || 'asset:/'}bible-q4km.gguf`,
        'asset:/bible-q4km.gguf',
        'asset:///bible-q4km.gguf'
      ];
      
      let copiedModel = false;
      for (const uri of possibleModelUris) {
        try {
          console.log('[DB] Attempting to copy model from asset path:', uri);
          await FileSystem.copyAsync({
            from: uri,
            to: liteModelPath
          });
          copiedModel = true;
          console.log(`[DB] Successfully copied prebuilt model from: ${uri}`);
          break;
        } catch (copyErr) {
          console.warn(`[DB] Failed to copy model from ${uri}:`, copyErr);
        }
      }
    } else {
      console.log(`[DB] Pre-packaged model already exists in document directory (size: ${liteModelInfo.size || 0} bytes)`);
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
export async function initSearchDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (searchDb) return searchDb;

  searchDb = await SQLite.openDatabaseAsync('bible.db');

  // Same read-performance PRAGMAs used by the main connection.
  await searchDb.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = 10000;
    PRAGMA foreign_keys = ON;
    PRAGMA temp_store = MEMORY;
  `);

  console.log('[DB] Search database connection opened');
  isSearchInitialized = true;
  return searchDb;
}

/**
 * Get the dedicated search database connection.
 * Throws if initDatabase() hasn't been called yet (we need the file seeded first).
 */
export function getSearchDatabase(): SQLite.SQLiteDatabase {
  if (!db || !isInitialized) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  if (!searchDb || !isSearchInitialized) {
    throw new Error('Search database not initialized. Call initSearchDatabase() first.');
  }
  return searchDb;
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
  if (db) {
    await db.closeAsync();
    db = null;
    isInitialized = false;
  }
}

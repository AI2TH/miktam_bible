import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from '../database/schema';

let db: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

/**
 * Initialize the database. Call once at app startup in root _layout.tsx.
 * - Checks if preloaded bible.db exists in local sandbox; if not, copies it from assets
 * - Opens the SQLite database
 * - Sets performance PRAGMAs
 * - Runs schema creation (no-op if tables exist)
 * - Returns the singleton database instance
 */
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

    // Check if bible.db already exists and is valid (size > 100MB, since full database is 545MB)
    const dbInfo = await FileSystem.getInfoAsync(dbPath);
    const dbInfoSize = dbInfo.exists && 'size' in dbInfo ? dbInfo.size : 0;
    
    // We check both the existence/size and whether we have successfully seeded the latest database version (1.0.8)
    const dbVersion = await AsyncStorage.getItem('seeded_bible_db_version');
    const isDbVersionMatch = dbVersion === '1.0.8';

    const isValidDb = dbInfo.exists && dbInfoSize > 100 * 1024 * 1024 && isDbVersionMatch;

    if (!isValidDb) {
      if (dbInfo.exists) {
        console.log(`[DB] Local database is too small or invalid (${dbInfoSize} bytes). Removing to re-seed from native assets...`);
        try {
          await FileSystem.deleteAsync(dbPath, { idempotent: true });
        } catch (delError) {
          console.warn('[DB] Failed to delete existing database:', delError);
        }
      } else {
        console.log('[DB] Local database file not found. Seeding from native assets...');
      }

      // Try multiple asset URI formats for maximum platform compatibility
      const possibleUris = [
        `${FileSystem.bundleDirectory || 'asset:/'}bible.db`,
        'asset:/bible.db',
        'asset:///bible.db'
      ];

      let copied = false;
      let lastError: any = null;

      for (const uri of possibleUris) {
        try {
          console.log('[DB] Attempting to copy from native assets path:', uri);
          await FileSystem.copyAsync({
            from: uri,
            to: dbPath
          });
          copied = true;
          console.log(`[DB] Successfully copied database from: ${uri}`);
          break;
        } catch (copyErr) {
          console.warn(`[DB] Failed to copy from ${uri}:`, copyErr);
          lastError = copyErr;
        }
      }

      if (!copied) {
        throw lastError || new Error('All asset copy attempts failed.');
      }

      // Double-check file exists and is valid
      const newDbInfo = await FileSystem.getInfoAsync(dbPath);
      const newDbSize = newDbInfo.exists && 'size' in newDbInfo ? newDbInfo.size : 0;
      console.log(`[DB] Copy completed. Database file on disk: exists=${newDbInfo.exists}, size=${newDbSize} bytes`);
      if (copied && newDbInfo.exists && newDbSize > 100 * 1024 * 1024) {
        await AsyncStorage.setItem('seeded_bible_db_version', '1.0.8');
        console.log('[DB] Saved database seed version to AsyncStorage: 1.0.8');
      }
    } else {
      console.log(`[DB] Local database file already exists and is valid (size: ${dbInfoSize} bytes) at: ${dbPath}`);
    }
  } catch (error) {
    console.error('[DB] Error copying prebuilt database from assets, proceeding with fresh DB initialization:', error);
  }

  db = await SQLite.openDatabaseAsync('bible.db');

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

  // Automatically sync local model files with database state
  await syncLocalModels(db);

  console.log('[DB] Database initialized, schema version:', SCHEMA_VERSION);
  isInitialized = true;
  return db;
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
 * Check if the database has been initialized.
 */
export function isDatabaseInitialized(): boolean {
  return isInitialized;
}

/**
 * Close the database connection. Call on app termination.
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

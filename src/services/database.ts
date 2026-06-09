import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
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

    // Check if bible.db already exists
    const dbInfo = await FileSystem.getInfoAsync(dbPath);
    if (!dbInfo.exists) {
      console.log('[DB] Local database file not found. Copying prebuilt database from assets...');
      
      const asset = Asset.fromModule(require('../../assets/bible.db'));
      await asset.downloadAsync();
      
      if (asset.localUri) {
        await FileSystem.copyAsync({
          from: asset.localUri,
          to: dbPath
        });
        console.log('[DB] Successfully seeded prebuilt database from assets!');
      } else {
        throw new Error('Failed to retrieve local URI for bible.db asset');
      }
    } else {
      console.log('[DB] Local database file already exists at:', dbPath);
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

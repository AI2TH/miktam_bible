import type { SQLiteDatabase } from 'expo-sqlite';
import { SCHEMA_MIGRATIONS } from './schema';

/**
 * Bring the database from `fromVersion` (PRAGMA user_version before this
 * launch) up to SCHEMA_VERSION. Runs after CREATE_TABLES_SQL. Each step is
 * idempotent, so a failed launch can safely run it again.
 *
 * Added columns are checked on every launch (one PRAGMA per table), so a
 * database whose user_version is already high, such as a re-seeded bible.db,
 * still gets them.
 */
export async function runMigrations(db: SQLiteDatabase, fromVersion: number): Promise<void> {
  for (const migration of SCHEMA_MIGRATIONS) {
    for (const col of migration.addColumns ?? []) {
      const existing = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${col.table})`);
      if (!existing.some((c) => c.name === col.column)) {
        console.log(`[Migrations] v${migration.version}: adding ${col.table}.${col.column}`);
        await db.execAsync(`ALTER TABLE ${col.table} ADD COLUMN ${col.column} ${col.definition}`);
      }
    }

    if (migration.version <= fromVersion) continue;
    console.log(`[Migrations] v${migration.version}: ${migration.description}`);
    for (const sql of migration.statements ?? []) {
      await db.execAsync(sql);
    }
  }
}

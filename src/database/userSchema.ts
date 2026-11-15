/**
 * User data lives in its own file, user.db, ATTACHed to the bible.db connection
 * as the schema `user`. Re-seeding bible.db (when the bundled seed version
 * changes) replaces only Bible text, never notes, highlights, plans or recordings.
 *
 * The user tables are created only in `user`, and dropped from `main`, so that
 * the unqualified names the services use (`notes`, `bookmarks`, ...) resolve
 * to user.db. SQLite looks up an unqualified table in main first, so a copy
 * left in main would shadow the user.db one.
 *
 * This module has no Expo imports so it can be tested with node:sqlite.
 */

export const USER_SCHEMA = 'user';
export const USER_DB_FILE = 'user.db';

/** Tables holding user data, in the order they are copied. */
export const USER_TABLES = [
  'profile',
  'bookmarks', // bookmarks and highlights (highlight_color)
  'notes',
  'recordings',
  'calendar_todos',
  'calendar_events',
  'reading_plans',
  'reading_plan_days',
  'reading_progress',
  'chat_history',
] as const;

const NOTES_TRIGGERS = ['notes_ai', 'notes_ad', 'notes_au'] as const;

/** Minimal async SQL interface, implemented by expo-sqlite in the app and node:sqlite in tests. */
export interface SqlExecutor {
  exec(sql: string): Promise<void>;
  all<T>(sql: string, params?: (string | number | null)[]): Promise<T[]>;
  run(sql: string, params?: (string | number | null)[]): Promise<void>;
  /** Run fn in one transaction on this connection. */
  transaction(fn: () => Promise<void>): Promise<void>;
}

/**
 * DDL for the recordings table. Also used for the user.db copy, so rows from
 * older databases (whose CHECK predates 'needs_model') are migrated by copying.
 */
export function createRecordingsTableSql(tableName: string): string {
  return `CREATE TABLE IF NOT EXISTS ${tableName} (
    id              TEXT PRIMARY KEY,
    title           TEXT,
    local_file_path TEXT NOT NULL,
    duration_secs   INTEGER DEFAULT 0,
    transcript      TEXT,
    transcription_status TEXT DEFAULT 'pending'
                    CHECK(transcription_status IN ('pending','processing','done','failed','needs_model')),
    linked_book     INTEGER,
    linked_chapter  INTEGER,
    linked_verse    INTEGER,
    is_synced       INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now'))
  )`;
}

/**
 * CREATE statements for the user tables in `schema`. Index and trigger names
 * take the schema prefix; table names inside ON clauses and trigger bodies must
 * not (SQLite resolves them in the trigger's own schema).
 */
export function userTablesDdl(schema: string = USER_SCHEMA): string[] {
  const s = `${schema}.`;
  return [
    `CREATE TABLE IF NOT EXISTS ${s}profile (
      id              TEXT PRIMARY KEY DEFAULT 'local_user',
      display_name    TEXT DEFAULT 'Reader',
      preferred_version TEXT DEFAULT 'kjv',
      preferred_language TEXT DEFAULT 'en',
      scripture_font_size INTEGER DEFAULT 18,
      sync_enabled    INTEGER DEFAULT 0,
      remote_user_id  TEXT,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS ${s}bookmarks (
      id              TEXT PRIMARY KEY,
      version_id      TEXT NOT NULL,
      book_number     INTEGER NOT NULL,
      chapter         INTEGER NOT NULL,
      verse_number    INTEGER NOT NULL,
      highlight_color TEXT DEFAULT '#FFD700',
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now')),
      is_synced       INTEGER DEFAULT 0,
      UNIQUE(version_id, book_number, chapter, verse_number)
    )`,

    `CREATE TABLE IF NOT EXISTS ${s}notes (
      id              TEXT PRIMARY KEY,
      version_id      TEXT NOT NULL,
      book_number     INTEGER NOT NULL,
      chapter         INTEGER NOT NULL,
      verse_number    INTEGER,
      content         TEXT NOT NULL,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now')),
      is_synced       INTEGER DEFAULT 0
    )`,

    `CREATE VIRTUAL TABLE IF NOT EXISTS ${s}notes_fts USING fts5(
      content,
      content=notes,
      content_rowid=rowid,
      tokenize='porter unicode61'
    )`,

    `CREATE TRIGGER IF NOT EXISTS ${s}notes_ai AFTER INSERT ON notes BEGIN
      INSERT INTO notes_fts(rowid, content) VALUES (new.rowid, new.content);
    END`,

    `CREATE TRIGGER IF NOT EXISTS ${s}notes_ad AFTER DELETE ON notes BEGIN
      INSERT INTO notes_fts(notes_fts, rowid, content) VALUES('delete', old.rowid, old.content);
    END`,

    `CREATE TRIGGER IF NOT EXISTS ${s}notes_au AFTER UPDATE ON notes BEGIN
      INSERT INTO notes_fts(notes_fts, rowid, content) VALUES('delete', old.rowid, old.content);
      INSERT INTO notes_fts(rowid, content) VALUES (new.rowid, new.content);
    END`,

    createRecordingsTableSql(`${s}recordings`),

    `CREATE TABLE IF NOT EXISTS ${s}calendar_todos (
      id              TEXT PRIMARY KEY,
      date            TEXT NOT NULL,
      title           TEXT NOT NULL,
      is_completed    INTEGER DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE INDEX IF NOT EXISTS ${s}idx_calendar_todos_date ON calendar_todos(date)`,

    `CREATE TABLE IF NOT EXISTS ${s}calendar_events (
      id              TEXT PRIMARY KEY,
      date            TEXT NOT NULL,
      title           TEXT NOT NULL,
      event_time      TEXT,
      location        TEXT,
      notes           TEXT,
      reminder_enabled INTEGER DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE INDEX IF NOT EXISTS ${s}idx_calendar_events_date ON calendar_events(date)`,

    `CREATE TABLE IF NOT EXISTS ${s}reading_plans (
      id              TEXT PRIMARY KEY,
      plan_type       TEXT NOT NULL,
      title           TEXT NOT NULL,
      duration_days   INTEGER NOT NULL,
      start_date      TEXT NOT NULL,
      is_active       INTEGER DEFAULT 1,
      reminder_time   TEXT DEFAULT '08:00',
      reminder_enabled INTEGER DEFAULT 1,
      current_day     INTEGER DEFAULT 1,
      created_at      TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS ${s}reading_plan_days (
      id              TEXT PRIMARY KEY,
      plan_id         TEXT NOT NULL,
      day_number      INTEGER NOT NULL,
      book_number     INTEGER NOT NULL,
      start_chapter   INTEGER NOT NULL,
      end_chapter     INTEGER NOT NULL,
      scheduled_date  TEXT,
      reading_label   TEXT,
      is_completed    INTEGER DEFAULT 0,
      completed_at    TEXT,
      UNIQUE(plan_id, day_number)
    )`,

    `CREATE INDEX IF NOT EXISTS ${s}idx_reading_plan_days ON reading_plan_days(plan_id, day_number)`,

    `CREATE INDEX IF NOT EXISTS ${s}idx_reading_plan_days_date ON reading_plan_days(scheduled_date)`,

    `CREATE TABLE IF NOT EXISTS ${s}reading_progress (
      id              TEXT PRIMARY KEY,
      version_id      TEXT NOT NULL,
      book_number     INTEGER NOT NULL,
      chapter         INTEGER NOT NULL,
      read_date       TEXT DEFAULT (date('now')),
      reading_time_secs INTEGER DEFAULT 0,
      is_synced       INTEGER DEFAULT 0,
      UNIQUE(version_id, book_number, chapter, read_date)
    )`,

    `CREATE TABLE IF NOT EXISTS ${s}chat_history (
      id              TEXT PRIMARY KEY,
      session_id      TEXT NOT NULL,
      role            TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content         TEXT NOT NULL,
      cited_verses    TEXT,
      version_id      TEXT,
      created_at      TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE INDEX IF NOT EXISTS ${s}idx_chat_session ON chat_history(session_id, created_at)`,

    `INSERT OR IGNORE INTO ${s}profile (id) VALUES ('local_user')`,
  ];
}

async function tableNames(db: SqlExecutor, schema: string): Promise<Set<string>> {
  const rows = await db.all<{ name: string }>(
    `SELECT name FROM ${schema}.sqlite_master WHERE type = 'table'`
  );
  return new Set(rows.map((r) => r.name));
}

async function columnNames(db: SqlExecutor, schema: string, table: string): Promise<string[]> {
  const rows = await db.all<{ name: string }>(`PRAGMA ${schema}.table_info(${table})`);
  return rows.map((r) => r.name);
}

/**
 * Copy user rows from `fromSchema` into `toSchema`. Only columns present in both
 * are copied, so older layouts work. INSERT OR IGNORE keyed by the TEXT primary
 * keys makes this safe to repeat after an interrupted run. Returns rows copied per table.
 */
export async function copyUserTables(
  db: SqlExecutor,
  fromSchema: string,
  toSchema: string = USER_SCHEMA
): Promise<Record<string, number>> {
  const present = await tableNames(db, fromSchema);
  const copied: Record<string, number> = {};
  await db.transaction(async () => {
    for (const table of USER_TABLES) {
      if (!present.has(table)) continue;
      const target = new Set(await columnNames(db, toSchema, table));
      const cols = (await columnNames(db, fromSchema, table)).filter((c) => target.has(c));
      if (cols.length === 0) continue;
      const list = cols.join(', ');
      const before = await db.all<{ n: number }>(`SELECT COUNT(*) AS n FROM ${toSchema}.${table}`);
      await db.run(
        `INSERT OR IGNORE INTO ${toSchema}.${table} (${list}) SELECT ${list} FROM ${fromSchema}.${table}`
      );
      const after = await db.all<{ n: number }>(`SELECT COUNT(*) AS n FROM ${toSchema}.${table}`);
      copied[table] = after[0].n - before[0].n;
    }
    // The insert trigger already indexes copied notes; rebuild in case the
    // target index was out of step before the copy.
    await db.run(`INSERT INTO ${toSchema}.notes_fts(notes_fts) VALUES('rebuild')`);
  });
  return copied;
}

/** Drop the user tables (and the notes search index and triggers) from `schema`. */
export async function dropUserTables(db: SqlExecutor, schema: string): Promise<void> {
  await db.transaction(async () => {
    for (const trigger of NOTES_TRIGGERS) {
      await db.exec(`DROP TRIGGER IF EXISTS ${schema}.${trigger}`);
    }
    await db.exec(`DROP TABLE IF EXISTS ${schema}.notes_fts`);
    for (const table of USER_TABLES) {
      await db.exec(`DROP TABLE IF EXISTS ${schema}.${table}`);
    }
  });
}

/** Create the user tables in the attached user schema. */
export async function ensureUserSchema(db: SqlExecutor, schema: string = USER_SCHEMA): Promise<void> {
  for (const sql of userTablesDdl(schema)) {
    await db.exec(sql);
  }
}

/** Whether `schema` still holds any user table. */
export async function hasUserTables(db: SqlExecutor, schema: string): Promise<boolean> {
  const present = await tableNames(db, schema);
  return USER_TABLES.some((t) => present.has(t));
}

/**
 * Before bible.db is deleted for a re-seed: copy its user tables into user.db.
 * Expects user.db to be attached as `user`. Throws on failure, in which case
 * the caller must keep the old bible.db.
 */
export async function exportUserDataBeforeReseed(db: SqlExecutor): Promise<Record<string, number>> {
  await ensureUserSchema(db);
  if (!(await hasUserTables(db, 'main'))) return {};
  return copyUserTables(db, 'main', USER_SCHEMA);
}

/**
 * On every start, after user.db is attached: create the user tables there,
 * move any user rows still in bible.db (installs from before user.db existed,
 * and a freshly copied seed that ships empty user tables), then drop them from
 * main so unqualified names resolve to user.db.
 *
 * Copy and drop run in separate transactions: in WAL mode a transaction over
 * several attached files is not atomic as a set, and a repeated copy is harmless.
 */
export async function attachUserSchema(db: SqlExecutor): Promise<Record<string, number>> {
  await ensureUserSchema(db);
  if (!(await hasUserTables(db, 'main'))) return {};
  const copied = await copyUserTables(db, 'main', USER_SCHEMA);
  await dropUserTables(db, 'main');
  return copied;
}

/** Whether the on-disk bible.db has to be replaced with the bundled seed. */
export function needsReseed(opts: {
  exists: boolean;
  size: number;
  minSize: number;
  seededVersion: string | null;
  expectedVersion: string;
}): boolean {
  return !opts.exists || opts.size < opts.minSize || opts.seededVersion !== opts.expectedVersion;
}

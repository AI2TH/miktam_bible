/**
 * All SQL statements to create the database tables.
 * Run in order — foreign keys depend on prior tables.
 */
export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = [
  // =============================================
  // BIBLE TEXT TABLES
  // =============================================

  `CREATE TABLE IF NOT EXISTS bible_languages (
    code            TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    local_name      TEXT,
    version_count   INTEGER DEFAULT 1
  )`,

  `CREATE TABLE IF NOT EXISTS bible_versions (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    language        TEXT NOT NULL DEFAULT 'en',
    is_downloaded   INTEGER DEFAULT 0,
    download_date   TEXT,
    total_size_mb   REAL DEFAULT 0
  )`,

  `CREATE TABLE IF NOT EXISTS books (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    version_id      TEXT NOT NULL REFERENCES bible_versions(id),
    book_number     INTEGER NOT NULL,
    name            TEXT NOT NULL,
    abbreviation    TEXT NOT NULL,
    testament       TEXT NOT NULL CHECK(testament IN ('OT','NT')),
    total_chapters  INTEGER NOT NULL,
    UNIQUE(version_id, book_number)
  )`,

  `CREATE TABLE IF NOT EXISTS verses (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    version_id      TEXT NOT NULL,
    book_number     INTEGER NOT NULL,
    chapter         INTEGER NOT NULL,
    verse_number    INTEGER NOT NULL,
    text            TEXT NOT NULL,
    UNIQUE(version_id, book_number, chapter, verse_number)
  )`,

  // Full-text search index on verse text
  `CREATE VIRTUAL TABLE IF NOT EXISTS verses_fts USING fts5(
    text,
    content=verses,
    content_rowid=id,
    tokenize='unicode61'
  )`,

  // Triggers to keep FTS in sync with verses table
  `CREATE TRIGGER IF NOT EXISTS verses_ai AFTER INSERT ON verses BEGIN
    INSERT INTO verses_fts(rowid, text) VALUES (new.id, new.text);
  END`,

  `CREATE TRIGGER IF NOT EXISTS verses_ad AFTER DELETE ON verses BEGIN
    INSERT INTO verses_fts(verses_fts, rowid, text) VALUES('delete', old.id, old.text);
  END`,

  `CREATE TRIGGER IF NOT EXISTS verses_au AFTER UPDATE ON verses BEGIN
    INSERT INTO verses_fts(verses_fts, rowid, text) VALUES('delete', old.id, old.text);
    INSERT INTO verses_fts(rowid, text) VALUES (new.id, new.text);
  END`,

  // =============================================
  // CONCORDANCE & ORIGINAL LANGUAGE TABLES
  // =============================================

  `CREATE TABLE IF NOT EXISTS original_words (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    book_number     INTEGER NOT NULL,
    chapter         INTEGER NOT NULL,
    verse_number    INTEGER NOT NULL,
    word_position   INTEGER NOT NULL,
    original_text   TEXT NOT NULL,
    transliteration TEXT,
    strongs_number  TEXT,
    language        TEXT NOT NULL CHECK(language IN ('hebrew','greek','aramaic')),
    morphology      TEXT,
    gloss           TEXT,
    UNIQUE(book_number, chapter, verse_number, word_position)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_original_words_verse
    ON original_words(book_number, chapter, verse_number)`,

  `CREATE INDEX IF NOT EXISTS idx_original_words_strongs
    ON original_words(strongs_number)`,

  `CREATE TABLE IF NOT EXISTS strongs_dictionary (
    strongs_number  TEXT PRIMARY KEY,
    language        TEXT NOT NULL CHECK(language IN ('greek','hebrew','aramaic')),
    original_word   TEXT NOT NULL,
    transliteration TEXT NOT NULL,
    pronunciation   TEXT,
    definition      TEXT NOT NULL,
    short_definition TEXT,
    usage_count     INTEGER DEFAULT 0,
    kjv_translations TEXT
  )`,

  // FTS5 on Strong's definitions for searching "love", "grace", etc.
  `CREATE VIRTUAL TABLE IF NOT EXISTS strongs_fts USING fts5(
    definition,
    short_definition,
    transliteration,
    original_word,
    content=strongs_dictionary,
    content_rowid=rowid,
    tokenize='porter unicode61'
  )`,

  `CREATE TABLE IF NOT EXISTS cross_references (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    source_book         INTEGER NOT NULL,
    source_chapter      INTEGER NOT NULL,
    source_verse_start  INTEGER NOT NULL,
    source_verse_end    INTEGER,
    target_book         INTEGER NOT NULL,
    target_chapter      INTEGER NOT NULL,
    target_verse_start  INTEGER NOT NULL,
    target_verse_end    INTEGER,
    relationship_type   TEXT DEFAULT 'thematic'
                        CHECK(relationship_type IN ('quotation','parallel','allusion','thematic')),
    confidence          REAL DEFAULT 0.5,
    votes               INTEGER DEFAULT 0
  )`,

  `CREATE INDEX IF NOT EXISTS idx_crossref_source
    ON cross_references(source_book, source_chapter, source_verse_start)`,

  `CREATE INDEX IF NOT EXISTS idx_crossref_target
    ON cross_references(target_book, target_chapter, target_verse_start)`,

  // =============================================
  // USER DATA TABLES (all local, zero internet)
  // =============================================

  `CREATE TABLE IF NOT EXISTS profile (
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

  `CREATE TABLE IF NOT EXISTS bookmarks (
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

  `CREATE TABLE IF NOT EXISTS notes (
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

  // FTS on notes content for searching within notes
  `CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
    content,
    content=notes,
    content_rowid=rowid,
    tokenize='porter unicode61'
  )`,

  // Triggers to keep notes_fts in sync with notes table
  `CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
    INSERT INTO notes_fts(rowid, content) VALUES (new.rowid, new.content);
  END`,

  `CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, content) VALUES('delete', old.rowid, old.content);
  END`,

  `CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
    INSERT INTO notes_fts(notes_fts, rowid, content) VALUES('delete', old.rowid, old.content);
    INSERT INTO notes_fts(rowid, content) VALUES (new.rowid, new.content);
  END`,

  `CREATE TABLE IF NOT EXISTS recordings (
    id              TEXT PRIMARY KEY,
    title           TEXT,
    local_file_path TEXT NOT NULL,
    duration_secs   INTEGER DEFAULT 0,
    transcript      TEXT,
    transcription_status TEXT DEFAULT 'pending'
                    CHECK(transcription_status IN ('pending','processing','done','failed')),
    linked_book     INTEGER,
    linked_chapter  INTEGER,
    linked_verse    INTEGER,
    is_synced       INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS verse_calendar (
    id              TEXT PRIMARY KEY,
    source          TEXT DEFAULT 'system',
    version_id      TEXT NOT NULL DEFAULT 'kjv',
    book_number     INTEGER NOT NULL,
    chapter         INTEGER NOT NULL,
    verse_number    INTEGER NOT NULL,
    calendar_type   TEXT NOT NULL CHECK(calendar_type IN ('daily','monthly','yearly')),
    target_date     TEXT NOT NULL,
    created_at      TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS reading_progress (
    id              TEXT PRIMARY KEY,
    version_id      TEXT NOT NULL,
    book_number     INTEGER NOT NULL,
    chapter         INTEGER NOT NULL,
    read_date       TEXT DEFAULT (date('now')),
    reading_time_secs INTEGER DEFAULT 0,
    is_synced       INTEGER DEFAULT 0,
    UNIQUE(version_id, book_number, chapter, read_date)
  )`,

  `CREATE TABLE IF NOT EXISTS chat_history (
    id              TEXT PRIMARY KEY,
    session_id      TEXT NOT NULL,
    role            TEXT NOT NULL CHECK(role IN ('user','assistant')),
    content         TEXT NOT NULL,
    cited_verses    TEXT,
    version_id      TEXT,
    created_at      TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE INDEX IF NOT EXISTS idx_chat_session
    ON chat_history(session_id, created_at)`,

  `CREATE TABLE IF NOT EXISTS ai_models (
    id              TEXT PRIMARY KEY,
    model_type      TEXT NOT NULL CHECK(model_type IN ('llm','whisper','embeddings')),
    display_name    TEXT NOT NULL,
    description     TEXT,
    file_size_mb    REAL NOT NULL,
    ram_required_mb REAL DEFAULT 0,
    download_url    TEXT NOT NULL,
    file_path       TEXT,
    is_downloaded   INTEGER DEFAULT 0,
    download_date   TEXT,
    version         TEXT DEFAULT '1.0.0'
  )`,

  `CREATE TABLE IF NOT EXISTS sync_queue (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name      TEXT NOT NULL,
    record_id       TEXT NOT NULL,
    action          TEXT NOT NULL CHECK(action IN ('INSERT','UPDATE','DELETE')),
    payload         TEXT NOT NULL,
    created_at      TEXT DEFAULT (datetime('now')),
    synced_at       TEXT
  )`,

  // =============================================
  // SEED DATA
  // =============================================

  // Insert default profile
  `INSERT OR IGNORE INTO profile (id) VALUES ('local_user')`,

  // Register Condensed Bible & Comprehensive World Translations (Public Domain / Free Study Editions)
  `INSERT OR IGNORE INTO bible_versions (id, name, language, is_downloaded, total_size_mb) VALUES
    ('kjv', 'King James Version (1611/1769)', 'en', 1, 32.0),
    ('con', 'Condensed Bible (Chronological Study)', 'en', 1, 15.0),
    ('gen1599', 'Geneva Bible (1599 Reformation)', 'en', 1, 24.0),
    ('web', 'World English Bible', 'en', 1, 30.0),
    ('asv', 'American Standard Version (1901)', 'en', 1, 28.0),
    ('bbe', 'Bible in Basic English', 'en', 1, 22.0),
    ('rvr', 'Reina-Valera (Español)', 'es', 1, 26.0),
    ('lsg', 'Louis Segond (Français)', 'fr', 1, 25.0),
    ('lut', 'Luther Bibel (Deutsch)', 'de', 1, 28.0),
    ('por', 'João Ferreira de Almeida (Português)', 'pt', 1, 26.0),
    ('ita', 'Giovanni Diodati (Italiano)', 'it', 1, 25.0),
    ('rus', 'Synodal Translation (Русский)', 'ru', 1, 29.0),
    ('cuv', 'Chinese Union Version (中文)', 'zh', 1, 35.0),
    ('ara', 'Smith & Van Dyke (العربية)', 'ar', 1, 27.0),
    ('kor', 'Korean Revised Version (한국어)', 'ko', 1, 28.0),
    ('grc', 'Textus Receptus (Greek NT / LXX)', 'el', 1, 38.0),
    ('hin', 'Hindi Holy Bible (हिन्दी)', 'hi', 1, 34.0),
    ('tam', 'Tamil Holy Bible (தமிழ்)', 'ta', 1, 36.0),
    ('tel', 'Telugu Holy Bible (తెలుగు)', 'te', 1, 36.0),
    ('mal', 'Malayalam Holy Bible (മലയാളം)', 'ml', 1, 35.0),
    ('kan', 'Kannada Holy Bible (ಕನ್ನಡ)', 'kn', 1, 35.0),
    ('vie', '1934 Vietnamese Bible (Tiếng Việt)', 'vi', 1, 27.0),
    ('ron', 'Dumitru Cornilescu (Română)', 'ro', 1, 26.0),
    ('fin', 'Pyhä Raamattu (Suomi)', 'fi', 1, 25.0)`,

  // Register available AI models
  `INSERT OR IGNORE INTO ai_models (id, model_type, display_name, description, file_size_mb, ram_required_mb, download_url, version) VALUES
    ('bibleslm-1.5b-q4', 'llm', 'BibleSLM 1.5B (Full)', 'Best quality Bible study assistant. Recommended for modern phones (3GB+ RAM).', 986, 1200, 'https://huggingface.co/yourname/BibleSLM-1.5B-GGUF/resolve/main/bibleslm-1.5b-q4_k_m.gguf', '1.0.0'),
    ('bibleslm-0.5b-q4', 'llm', 'Bible SmolLM2 (Lite)', 'Lightweight Bible assistant. Very fast, uses minimal RAM.', 105, 200, 'https://huggingface.co/skalvinnathan/bible-smollm2/resolve/main/bible-q4km.gguf', '1.0.0'),
    ('whisper-base-en', 'whisper', 'Whisper Base (English)', 'Speech-to-text for voice recording transcription.', 140, 200, 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin', '1.0.0')`,
];

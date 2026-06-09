const Database = require('better-sqlite3');
const fs = require('fs');

const dbs = [
  './output/bible.db',
  './pulled_bible.db',
  'C:\\Users\\kevin\\.gemini\\antigravity-cli\\brain\\5e33d1aa-4b5b-4fb6-a44b-cbc49328a724\\bible_emulator.db'
];

for (const dbPath of dbs) {
  if (!fs.existsSync(dbPath)) {
    console.log(`DB path does not exist, skipping: ${dbPath}`);
    continue;
  }
  
  console.log(`Updating model registry in: ${dbPath}`);
  const db = new Database(dbPath);
  try {
    // Check if the entry exists
    const exists = db.prepare("SELECT count(*) as count FROM ai_models WHERE id = 'bibleslm-0.5b-q4'").get();
    if (exists.count === 0) {
      // Insert
      db.prepare(`
        INSERT INTO ai_models (id, model_type, display_name, description, file_size_mb, ram_required_mb, download_url, version)
        VALUES ('bibleslm-0.5b-q4', 'llm', 'Bible SmolLM2 (Lite)', 'Lightweight Bible assistant. Very fast, uses minimal RAM.', 105, 200, 'https://huggingface.co/skalvinnathan/bible-smollm2/resolve/main/bible-q4km.gguf', '1.0.0')
      `).run();
      console.log("- Inserted new model row.");
    } else {
      // Update
      const result = db.prepare(`
        UPDATE ai_models
        SET display_name = 'Bible SmolLM2 (Lite)',
            description = 'Lightweight Bible assistant. Very fast, uses minimal RAM.',
            file_size_mb = 105,
            ram_required_mb = 200,
            download_url = 'https://huggingface.co/skalvinnathan/bible-smollm2/resolve/main/bible-q4km.gguf',
            version = '1.0.0'
        WHERE id = 'bibleslm-0.5b-q4'
      `).run();
      console.log(`- Updated model row. Changes: ${result.changes}`);
    }
    
    // Also reset is_downloaded = 0 and file_path = null if it was previously set, so the app downloads the new GGUF file
    const reset = db.prepare(`
      UPDATE ai_models
      SET is_downloaded = 0,
          file_path = NULL,
          download_date = NULL
      WHERE id = 'bibleslm-0.5b-q4'
    `).run();
    console.log(`- Reset download status. Changes: ${reset.changes}`);
    
    const info = db.prepare("SELECT * FROM ai_models WHERE id = 'bibleslm-0.5b-q4'").get();
    console.log("- Result entry:", info);
  } catch (e) {
    console.error("- Error:", e.message);
  } finally {
    db.close();
  }
}

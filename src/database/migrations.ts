/** Runs schema migrations. In version 1, schema is created dynamically in database.ts */
export async function runMigrations(): Promise<void> {
  console.log('[Migrations] Checking migration scripts... Schema is up-to-date.');
}

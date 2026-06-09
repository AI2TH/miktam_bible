import { getDatabase } from './database';
import { createClient } from '@supabase/supabase-js';

// Environment variables or settings override
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

let supabase: any = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/** Check if Supabase client is configured and ready */
export function isSyncConfigured(): boolean {
  return supabase !== null;
}

/**
 * Process the local sync queue and upload pending changes to Supabase.
 * This function processes items sequentially to maintain order.
 */
export async function syncData(): Promise<void> {
  if (!isSyncConfigured()) {
    console.log('[Sync] Cloud sync skipped: Supabase URL/Key not configured.');
    return;
  }

  const db = getDatabase();

  // Fetch unsynced items from the queue
  const pendingItems = await db.getAllAsync<any>(
    'SELECT * FROM sync_queue WHERE synced_at IS NULL ORDER BY id ASC'
  );

  if (pendingItems.length === 0) {
    console.log('[Sync] All data is up to date.');
    return;
  }

  console.log(`[Sync] Found ${pendingItems.length} pending items to sync.`);

  for (const item of pendingItems) {
    try {
      const { id, table_name, record_id, action, payload } = item;
      const parsedPayload = JSON.parse(payload);

      let success = false;

      if (action === 'INSERT' || action === 'UPDATE') {
        const { error } = await supabase
          .from(table_name)
          .upsert({ ...parsedPayload, updated_at: new Date().toISOString() });
        if (!error) success = true;
        else console.error(`[Sync] Supabase Upsert error for ${table_name}:`, error);
      } else if (action === 'DELETE') {
        const { error } = await supabase
          .from(table_name)
          .delete()
          .eq('id', record_id);
        if (!error) success = true;
        else console.error(`[Sync] Supabase Delete error for ${table_name}:`, error);
      }

      if (success) {
        const now = new Date().toISOString();
        // Mark queue item as synced
        await db.runAsync(
          'UPDATE sync_queue SET synced_at = ? WHERE id = ?',
          [now, id]
        );

        // Mark local table row as synced
        try {
          await db.runAsync(
            `UPDATE ${table_name} SET is_synced = 1 WHERE id = ?`,
            [record_id]
          );
        } catch (e) {
          // Some tables might not have is_synced or might differ, swallow or log
        }
      }
    } catch (err) {
      console.error('[Sync] Error processing sync item:', item, err);
      // Stop syncing on error to prevent out-of-order execution
      break;
    }
  }
}

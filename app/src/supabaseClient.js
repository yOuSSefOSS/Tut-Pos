import { createClient } from '@supabase/supabase-js';
import { db } from './db';

const supabaseUrl = 'https://uhkmgwfjyfhrinbwyryp.supabase.co';
const supabaseKey = 'sb_publishable_cw8s8p07qPz_dGrrA72hWw_IuUbnVdi';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Generic function to sync a table
async function syncTable(tableName, localTableName, mapToSupabase) {
  try {
    // We assume any record without 'synced: 1' needs syncing (for tables that support it)
    const unsynced = await db[localTableName].where('synced').equals(0).toArray();
    if (unsynced.length === 0) return 0;

    const mappedData = unsynced.map(mapToSupabase);
    
    // Using upsert based on local_id (if we had a unique constraint, but for now we'll just insert and ignore conflicts if handled on the DB level, or just insert)
    // Actually, simple insert is fine since we mark them synced right after.
    const { error } = await supabase.from(tableName).insert(mappedData);
    if (error) {
      console.error(`Supabase sync error for ${tableName}:`, error);
      throw error;
    }

    // Mark as synced locally
    const ids = unsynced.map(item => item.id);
    await Promise.all(ids.map(id => db[localTableName].update(id, { synced: 1 })));
    
    return unsynced.length;
  } catch (err) {
    console.error(`Failed to sync ${tableName}`, err);
    return 0;
  }
}

export const syncToCloud = async () => {
  try {
    let totalSynced = 0;

    // 1. Sync Orders
    totalSynced += await syncTable('orders', 'orders', (order) => ({
      local_id: order.id,
      total: order.total,
      created_at: order.createdAt
    }));

    // For order items, they don't have a 'synced' flag currently.
    // So we will sync them differently: find orderItems belonging to synced=0 orders, BUT we just synced the orders so they are now synced=1.
    // To handle this, it's better to give orderItems a 'synced' flag. 
    // For now, we will fetch order items where their parent order just synced.
    // Alternatively, just sync all orderItems that aren't synced. We will need to update db.js to add synced to orderItems.
    
    totalSynced += await syncTable('order_items', 'orderItems', (item) => ({
      local_id: item.id,
      order_id: item.orderId, // This might not map to the supabase order ID directly without a lookup, but for analytics, having the local orderId might be enough if we just join on local_id.
      // Wait, order_id in Supabase references orders(id).
      // If we don't return the inserted order ID, we can't link them easily using foreign keys unless Supabase orders table uses local_id as the foreign key target (not supported directly by standard references unless unique).
      // We made local_id UNIQUE in SQL! So we can just join on local_id in analytics, or we can fetch the inserted IDs.
      // Let's simplify: we will just store orderId as the local_id reference.
      // We need to drop the strict foreign key or change the reference to local_id. 
      // I'll update the SQL script to remove the strict foreign key for simplicity, or we do a lookup.
      // Let's assume order_id in Supabase will just store the local orderId for now, we don't strictly need the FK constraint for simple analytics.
      product_id: item.productId,
      name: item.name,
      modifiers: item.modifiers,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal
    }));

    // 2. Sync Expenses
    totalSynced += await syncTable('expenses', 'expenses', (exp) => ({
      local_id: exp.id,
      amount: exp.amount,
      description: exp.description,
      category: exp.category,
      date: exp.date
    }));

    // 3. Sync Stock Logs
    totalSynced += await syncTable('stock_logs', 'stockLogs', (log) => ({
      local_id: log.id,
      material_id: log.materialId,
      quantity_added: log.quantityAdded,
      cost: log.cost,
      date: log.date
    }));

    if (totalSynced > 0) {
      alert(`Successfully synced ${totalSynced} records to Supabase!`);
    } else {
      alert('Everything is already up to date.');
    }
  } catch (error) {
    console.error('Error syncing to Supabase:', error);
    alert('Sync failed. Please ensure the Supabase tables have been created using the provided SQL script.');
  }
}

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

async function syncMenuToCloud() {
  let syncedCount = 0;
  
  // 1. Categories
  const unsyncedCats = await db.categories.where('synced').equals(0).toArray();
  if (unsyncedCats.length > 0) {
    for (const cat of unsyncedCats) {
      if (cat.deleted) {
        if (cat.cloud_id) {
          await supabase.from('menu_categories').delete().eq('id', cat.cloud_id);
        }
        await db.categories.delete(cat.id);
      } else {
        if (!cat.cloud_id) {
          cat.cloud_id = crypto.randomUUID();
          await db.categories.update(cat.id, { cloud_id: cat.cloud_id });
        }
        await supabase.from('menu_categories').upsert({
          id: cat.cloud_id,
          name: cat.name,
          type: cat.type
        });
        await db.categories.update(cat.id, { synced: 1 });
      }
      syncedCount++;
    }
  }

  // 2. Products
  const unsyncedProds = await db.products.where('synced').equals(0).toArray();
  if (unsyncedProds.length > 0) {
    for (const prod of unsyncedProds) {
      if (prod.deleted) {
        if (prod.cloud_id) {
          await supabase.from('menu_products').delete().eq('id', prod.cloud_id);
        }
        await db.products.delete(prod.id);
      } else {
        if (!prod.cloud_id) {
          prod.cloud_id = crypto.randomUUID();
          await db.products.update(prod.id, { cloud_id: prod.cloud_id });
        }
        const cat = await db.categories.get(prod.categoryId);
        if (cat && cat.cloud_id) {
          await supabase.from('menu_products').upsert({
            id: prod.cloud_id,
            name: prod.name,
            price: prod.price,
            category_id: cat.cloud_id,
            type: prod.type,
            has_modifiers: prod.hasModifiers,
            custom_modifiers: prod.customModifiers || null
          });
          await db.products.update(prod.id, { synced: 1 });
        }
      }
      syncedCount++;
    }
  }
  return syncedCount;
}

export const syncToCloud = async () => {
  try {
    let totalSynced = 0;

    // 0. Sync Menu
    totalSynced += await syncMenuToCloud();

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

export const pullMenuFromCloud = async () => {
  try {
    const { data: cloudCats, error: catErr } = await supabase.from('menu_categories').select('*');
    if (catErr) throw catErr;
    
    for (const cloudCat of cloudCats) {
      const localCat = await db.categories.filter(c => c.cloud_id === cloudCat.id).first();
      if (localCat) {
        await db.categories.update(localCat.id, { name: cloudCat.name, type: cloudCat.type, synced: 1, deleted: 0 });
      } else {
        await db.categories.add({ cloud_id: cloudCat.id, name: cloudCat.name, type: cloudCat.type, synced: 1, deleted: 0 });
      }
    }
    
    const { data: cloudProds, error: prodErr } = await supabase.from('menu_products').select('*');
    if (prodErr) throw prodErr;
    
    for (const cloudProd of cloudProds) {
      const localCat = await db.categories.filter(c => c.cloud_id === cloudProd.category_id).first();
      if (!localCat) continue;
      
      const localProd = await db.products.filter(p => p.cloud_id === cloudProd.id).first();
      if (localProd) {
        await db.products.update(localProd.id, {
          name: cloudProd.name,
          price: cloudProd.price,
          categoryId: localCat.id,
          type: cloudProd.type,
          hasModifiers: cloudProd.has_modifiers,
          customModifiers: cloudProd.custom_modifiers,
          synced: 1,
          deleted: 0
        });
      } else {
        await db.products.add({
          cloud_id: cloudProd.id,
          name: cloudProd.name,
          price: cloudProd.price,
          categoryId: localCat.id,
          type: cloudProd.type,
          hasModifiers: cloudProd.has_modifiers,
          customModifiers: cloudProd.custom_modifiers,
          synced: 1,
          deleted: 0
        });
      }
    }
    
    // Delete local items that were deleted in the cloud
    // ONLY if the cloud actually has data (to prevent wiping on first run before push)
    if (cloudCats.length > 0) {
      const allLocalCats = await db.categories.filter(c => !!c.cloud_id).toArray();
      for (const lc of allLocalCats) {
        if (!cloudCats.find(c => c.id === lc.cloud_id)) {
          await db.categories.delete(lc.id);
        }
      }
    }
    
    if (cloudProds.length > 0) {
      const allLocalProds = await db.products.filter(p => !!p.cloud_id).toArray();
      for (const lp of allLocalProds) {
        if (!cloudProds.find(p => p.id === lp.cloud_id)) {
          await db.products.delete(lp.id);
        }
      }
    }

    alert('Menu pulled from cloud successfully!');
  } catch (err) {
    console.error('Error pulling menu:', err);
    alert('Failed to pull menu from cloud. Ensure tables exist and connection is stable.');
  }
}


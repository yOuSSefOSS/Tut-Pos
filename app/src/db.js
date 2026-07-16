import Dexie from 'dexie';

export const db = new Dexie('TutCafeDB');

db.version(7).stores({
  categories: '++id, cloud_id, name, type, synced, deleted', 
  products: '++id, cloud_id, name, price, categoryId, type, hasModifiers, synced, deleted', 
  orders: '++id, total, createdAt, synced', 
  orderItems: '++id, orderId, productId, name, modifiers, quantity, price, subtotal, synced',
  expenses: '++id, amount, description, category, date, synced',
  expenseCategories: '++id, name',
  rawMaterials: '++id, name, unit, currentStock',
  recipes: '++id, productId, materialId, quantity',
  stockLogs: '++id, materialId, quantityAdded, cost, date, synced',
  settings: 'key, value'
}).upgrade(async tx => {
  await tx.categories.toCollection().modify(cat => {
    if (cat.synced === undefined) cat.synced = 0;
    if (cat.deleted === undefined) cat.deleted = 0;
    if (!cat.cloud_id) cat.cloud_id = crypto.randomUUID();
  });
  await tx.products.toCollection().modify(prod => {
    if (prod.synced === undefined) prod.synced = 0;
    if (prod.deleted === undefined) prod.deleted = 0;
    if (!prod.cloud_id) prod.cloud_id = crypto.randomUUID();
  });
});

export const initMenu = async () => {
  // 1. Clean up any existing duplicates (from previous hot-reload bugs) safely without wiping custom data
  const allCats = await db.categories.toArray();
  const uniqueCatNames = new Set();
  for (const cat of allCats) {
    if (uniqueCatNames.has(cat.name)) {
      await db.categories.delete(cat.id);
    } else {
      uniqueCatNames.add(cat.name);
    }
  }

  const allProds = await db.products.toArray();
  const uniqueProdNames = new Set();
  for (const prod of allProds) {
    if (uniqueProdNames.has(prod.name)) {
      await db.products.delete(prod.id);
    } else {
      uniqueProdNames.add(prod.name);
    }
  }

  // 2. Check if we need to seed the default menu
  const count = await db.categories.count();
  if (count > 0) {
    console.log('Menu already initialized and deduplicated correctly.');
    return;
  }

  console.log('Initializing default menu...');
  
  // Add Categories
  const hotId = await db.categories.add({ cloud_id: crypto.randomUUID(), name: 'Hot Drinks', type: 'hot', synced: 0, deleted: 0 });
  const coldId = await db.categories.add({ cloud_id: crypto.randomUUID(), name: 'Cold Drinks', type: 'cold', synced: 0, deleted: 0 });
  const milkshakesId = await db.categories.add({ cloud_id: crypto.randomUUID(), name: 'Milkshakes', type: 'cold', synced: 0, deleted: 0 });
  const smoothiesId = await db.categories.add({ cloud_id: crypto.randomUUID(), name: 'Smoothies', type: 'cold', synced: 0, deleted: 0 });
  const freshJuiceId = await db.categories.add({ cloud_id: crypto.randomUUID(), name: 'Fresh Juices', type: 'cold', synced: 0, deleted: 0 });

  // Add Hot Drinks (Modifiers enabled for coffee/tea)
  const hotDrinks = [
    { name: 'Tea', price: 18, hasModifiers: true },
    { name: 'Flavoured Tea', price: 25, hasModifiers: true },
    { name: 'Turkish Coffee', price: 30, hasModifiers: true },
    { name: 'Americano', price: 45, hasModifiers: true },
    { name: 'Cappuccino', price: 60, hasModifiers: true },
    { name: 'Latte', price: 65, hasModifiers: true },
    { name: 'Mocha', price: 70, hasModifiers: true },
    { name: 'Cortado', price: 50, hasModifiers: true },
    { name: 'Flat White', price: 65, hasModifiers: true },
    { name: 'Espresso (S)', price: 50, hasModifiers: true },
    { name: 'Espresso (D)', price: 60, hasModifiers: true },
    { name: 'French Coffee', price: 45, hasModifiers: true },
    { name: 'French Press', price: 55, hasModifiers: true },
    { name: 'Herbals', price: 25, hasModifiers: true },
  ].map(p => ({ ...p, categoryId: hotId, type: 'hot', cloud_id: crypto.randomUUID(), synced: 0, deleted: 0 }));

  // Add Cold Drinks (Modifiers enabled for iced coffees)
  const icedDrinks = [
    { name: 'Ice Latte', price: 70, hasModifiers: true },
    { name: 'Flavoured Ice Latte', price: 85, hasModifiers: true },
    { name: 'Iced Cappuccino', price: 75, hasModifiers: true },
    { name: 'Iced Caramel Macchiato', price: 75, hasModifiers: true },
    { name: 'Iced Americano', price: 50, hasModifiers: true },
    { name: 'Pineapple Pinacolada', price: 65, hasModifiers: false },
    { name: 'Mix Soda', price: 65, hasModifiers: false },
    { name: 'Softdrinks', price: 30, hasModifiers: false },
  ].map(p => ({ ...p, categoryId: coldId, type: 'cold', cloud_id: crypto.randomUUID(), synced: 0, deleted: 0 }));
  
  // Add Milkshakes (No sugar modifiers needed usually, but could be)
  const milkshakes = [
    { name: 'Vanilla Milkshake', price: 75, hasModifiers: false },
    { name: 'Caramel Milkshake', price: 75, hasModifiers: false },
    { name: 'Chocolate Milkshake', price: 75, hasModifiers: false },
    { name: 'Blueberry Milkshake', price: 75, hasModifiers: false },
    { name: 'Strawberry Milkshake', price: 75, hasModifiers: false },
    { name: 'Oreo Milkshake', price: 75, hasModifiers: false },
  ].map(p => ({ ...p, categoryId: milkshakesId, type: 'cold', cloud_id: crypto.randomUUID(), synced: 0, deleted: 0 }));

  // Add Smoothies
  const smoothies = [
    { name: 'Strawberry Smoothie', price: 65, hasModifiers: false },
    { name: 'Blueberry Smoothie', price: 65, hasModifiers: false },
    { name: 'Mixberry Smoothie', price: 65, hasModifiers: false },
    { name: 'Pineapple Smoothie', price: 65, hasModifiers: false },
  ].map(p => ({ ...p, categoryId: smoothiesId, type: 'cold', cloud_id: crypto.randomUUID(), synced: 0, deleted: 0 }));

  // Add Fresh Juices
  const freshJuices = [
    { name: 'Mango Juice', price: 60, hasModifiers: false },
    { name: 'Strawberry Juice', price: 60, hasModifiers: false },
    { name: 'Watermelon Juice', price: 60, hasModifiers: false },
    { name: 'Lemon Juice', price: 40, hasModifiers: false },
  ].map(p => ({ ...p, categoryId: freshJuiceId, type: 'cold', cloud_id: crypto.randomUUID(), synced: 0, deleted: 0 }));

  await db.products.bulkAdd([
    ...hotDrinks, 
    ...icedDrinks, 
    ...milkshakes, 
    ...smoothies, 
    ...freshJuices
  ]);
  
  console.log('Menu initialized!');
};

import { db } from './db';

const rawMaterialsData = [
  { name: 'Espresso', unit: 'ml' },
  { name: 'Water', unit: 'ml' },
  { name: 'Milk', unit: 'ml' },
  { name: 'Ice', unit: 'g' },
  { name: 'Chocolate Sauce', unit: 'g' },
  { name: 'Vanilla Puree', unit: 'g' },
  { name: 'Caramel Sauce', unit: 'g' },
  { name: 'Condensed Milk', unit: 'g' },
  { name: 'Hazelnut Puree', unit: 'g' },
  { name: 'Coconut Puree', unit: 'g' },
  { name: 'Oreo', unit: 'pcs' },
  { name: 'Vanilla Ice Cream', unit: 'scoops' },
  { name: 'Chocolate Ice Cream', unit: 'scoops' },
  { name: 'Hoho', unit: 'pcs' },
  { name: 'Strawberry Puree', unit: 'g' },
  { name: 'Blueberry Puree', unit: 'g' },
  { name: 'Pineapple Puree', unit: 'g' }
];

const productsData = [
  // Hot Coffee Classics
  { categoryName: 'Hot Coffee Classics', name: 'Classic Espresso', price: 30, type: 'Hot Drink', hasModifiers: false, recipe: { 'Espresso': 60 } },
  { categoryName: 'Hot Coffee Classics', name: 'Americano', price: 40, type: 'Hot Drink', hasModifiers: false, recipe: { 'Espresso': 60, 'Water': 240 } },
  { categoryName: 'Hot Coffee Classics', name: 'Latte', price: 45, type: 'Hot Drink', hasModifiers: true, recipe: { 'Espresso': 60, 'Milk': 240 } },
  { categoryName: 'Hot Coffee Classics', name: 'Cappuccino', price: 45, type: 'Hot Drink', hasModifiers: true, recipe: { 'Espresso': 60, 'Milk': 150 } },
  { categoryName: 'Hot Coffee Classics', name: 'Mocha', price: 55, type: 'Hot Drink', hasModifiers: true, recipe: { 'Espresso': 60, 'Milk': 220, 'Chocolate Sauce': 20 } },
  { categoryName: 'Hot Coffee Classics', name: 'Caramel Macchiato', price: 60, type: 'Hot Drink', hasModifiers: true, recipe: { 'Espresso': 60, 'Milk': 220, 'Vanilla Puree': 15, 'Caramel Sauce': 10 } },
  { categoryName: 'Hot Coffee Classics', name: 'Spanish Latte', price: 60, type: 'Hot Drink', hasModifiers: true, recipe: { 'Espresso': 60, 'Milk': 220, 'Condensed Milk': 30 } },
  { categoryName: 'Hot Coffee Classics', name: 'Flavored Lattes', price: 55, type: 'Hot Drink', hasModifiers: true, recipe: { 'Espresso': 60, 'Milk': 220, 'Vanilla Puree': 20 } },

  // Iced Coffees & Chillers
  { categoryName: 'Iced Coffees & Chillers', name: 'Iced Americano', price: 45, type: 'Cold Drink', hasModifiers: false, recipe: { 'Espresso': 60, 'Water': 180, 'Ice': 150 } },
  { categoryName: 'Iced Coffees & Chillers', name: 'Iced Latte', price: 50, type: 'Cold Drink', hasModifiers: true, recipe: { 'Espresso': 60, 'Milk': 200, 'Ice': 150 } },
  { categoryName: 'Iced Coffees & Chillers', name: 'Iced Spanish Latte', price: 65, type: 'Cold Drink', hasModifiers: true, recipe: { 'Espresso': 60, 'Milk': 200, 'Condensed Milk': 40, 'Ice': 150 } },
  { categoryName: 'Iced Coffees & Chillers', name: 'Iced Mocha / Caramel', price: 60, type: 'Cold Drink', hasModifiers: true, recipe: { 'Espresso': 60, 'Milk': 200, 'Chocolate Sauce': 30, 'Ice': 150 } },
  { categoryName: 'Iced Coffees & Chillers', name: 'Iced Flavored Lattes', price: 60, type: 'Cold Drink', hasModifiers: true, recipe: { 'Espresso': 60, 'Milk': 200, 'Vanilla Puree': 20, 'Ice': 150 } },
  { categoryName: 'Iced Coffees & Chillers', name: 'Coconut Iced Coffee', price: 60, type: 'Cold Drink', hasModifiers: true, recipe: { 'Espresso': 60, 'Milk': 200, 'Coconut Puree': 20, 'Ice': 150 } },

  // Blended Coffee Frappes
  { categoryName: 'Blended Coffee Frappes', name: 'Mocha Frappe', price: 70, type: 'Frappe', hasModifiers: false, recipe: { 'Espresso': 60, 'Milk': 120, 'Chocolate Sauce': 35, 'Ice': 200 } },
  { categoryName: 'Blended Coffee Frappes', name: 'Caramel Frappe', price: 70, type: 'Frappe', hasModifiers: false, recipe: { 'Espresso': 60, 'Milk': 120, 'Caramel Sauce': 35, 'Ice': 200 } },
  { categoryName: 'Blended Coffee Frappes', name: 'Hazelnut Frappe', price: 70, type: 'Frappe', hasModifiers: false, recipe: { 'Espresso': 60, 'Milk': 120, 'Hazelnut Puree': 35, 'Ice': 200 } },
  { categoryName: 'Blended Coffee Frappes', name: 'Oreo Coffee Frappe', price: 75, type: 'Frappe', hasModifiers: false, recipe: { 'Espresso': 60, 'Milk': 150, 'Chocolate Sauce': 15, 'Ice': 200, 'Oreo': 3 } },

  // Thick Milkshakes
  { categoryName: 'Thick Milkshakes', name: 'Vanilla / Choc Shake', price: 65, type: 'Shake', hasModifiers: false, recipe: { 'Milk': 120, 'Vanilla Ice Cream': 3 } },
  { categoryName: 'Thick Milkshakes', name: 'Ultimate Oreo Shake', price: 75, type: 'Shake', hasModifiers: false, recipe: { 'Milk': 120, 'Chocolate Sauce': 10, 'Vanilla Ice Cream': 3, 'Oreo': 3 } },
  { categoryName: 'Thick Milkshakes', name: 'Hohos Choc Explosion', price: 75, type: 'Shake', hasModifiers: false, recipe: { 'Milk': 120, 'Chocolate Ice Cream': 3, 'Hoho': 1 } },
  { categoryName: 'Thick Milkshakes', name: 'Strawberry / Blueberry Shake', price: 70, type: 'Shake', hasModifiers: false, recipe: { 'Milk': 100, 'Strawberry Puree': 40, 'Vanilla Ice Cream': 3 } },
  { categoryName: 'Thick Milkshakes', name: 'Caramel Hazelnut Shake', price: 75, type: 'Shake', hasModifiers: false, recipe: { 'Milk': 120, 'Hazelnut Puree': 20, 'Caramel Sauce': 15, 'Vanilla Ice Cream': 3 } },

  // Fruit Smoothies & Refreshers
  { categoryName: 'Fruit Smoothies & Refreshers', name: 'Berry Smoothie', price: 65, type: 'Smoothie', hasModifiers: false, recipe: { 'Milk': 100, 'Strawberry Puree': 60, 'Ice': 200 } },
  { categoryName: 'Fruit Smoothies & Refreshers', name: 'Piña Colada Mocktail', price: 70, type: 'Smoothie', hasModifiers: false, recipe: { 'Milk': 120, 'Pineapple Puree': 40, 'Coconut Puree': 20, 'Ice': 200 } },
  { categoryName: 'Fruit Smoothies & Refreshers', name: 'Mixed Berry Slush', price: 65, type: 'Slush', hasModifiers: false, recipe: { 'Water': 100, 'Strawberry Puree': 30, 'Blueberry Puree': 30, 'Ice': 200 } },
  { categoryName: 'Fruit Smoothies & Refreshers', name: 'Tropical Sunset', price: 65, type: 'Slush', hasModifiers: false, recipe: { 'Water': 100, 'Pineapple Puree': 30, 'Strawberry Puree': 30, 'Ice': 200 } },

  // Cafe Desserts & Affogatos
  { categoryName: 'Cafe Desserts & Affogatos', name: 'Classic Affogato', price: 50, type: 'Dessert', hasModifiers: false, recipe: { 'Espresso': 30, 'Vanilla Ice Cream': 1 } },
  { categoryName: 'Cafe Desserts & Affogatos', name: 'Mocha Affogato', price: 55, type: 'Dessert', hasModifiers: false, recipe: { 'Espresso': 30, 'Chocolate Ice Cream': 1 } },
  { categoryName: 'Cafe Desserts & Affogatos', name: 'Hoho Sundae', price: 45, type: 'Dessert', hasModifiers: false, recipe: { 'Chocolate Sauce': 15, 'Hoho': 1, 'Vanilla Ice Cream': 2 } },
  { categoryName: 'Cafe Desserts & Affogatos', name: 'Crushed Oreo Sundae', price: 45, type: 'Dessert', hasModifiers: false, recipe: { 'Chocolate Sauce': 15, 'Vanilla Ice Cream': 2, 'Oreo': 1 } },

  // Non-Coffee Warmers & Milks
  { categoryName: 'Non-Coffee Warmers & Milks', name: 'Signature Hot Chocolate', price: 55, type: 'Hot Drink', hasModifiers: false, recipe: { 'Milk': 250, 'Chocolate Sauce': 30 } },
  { categoryName: 'Non-Coffee Warmers & Milks', name: 'Caramel Hot Milk', price: 50, type: 'Hot Drink', hasModifiers: false, recipe: { 'Milk': 250, 'Caramel Sauce': 20 } },
  { categoryName: 'Non-Coffee Warmers & Milks', name: 'Iced Berry Milk', price: 55, type: 'Cold Drink', hasModifiers: false, recipe: { 'Milk': 200, 'Strawberry Puree': 45, 'Ice': 150 } },
];

export const importPdfRecipes = async () => {
  const hasImported = localStorage.getItem('pdf_recipes_imported_v2');
  if (hasImported) return;

  console.log('Starting PDF recipe import without deleting existing data...');

  // 1. Add missing Raw Materials safely
  const existingMaterials = await db.rawMaterials.toArray();
  const materialNameToId = {};
  
  for (const mat of existingMaterials) {
    materialNameToId[mat.name.toLowerCase()] = mat.id;
  }

  for (const newMat of rawMaterialsData) {
    const key = newMat.name.toLowerCase();
    if (!materialNameToId[key]) {
      const id = await db.rawMaterials.add({ name: newMat.name, unit: newMat.unit, currentStock: 0 });
      materialNameToId[key] = id;
    }
  }

  // 2. Add missing Categories safely
  const existingCats = await db.categories.toArray();
  const catNameToId = {};
  for (const c of existingCats) {
    catNameToId[c.name.toLowerCase()] = c.id;
  }

  const uniqueCatNames = [...new Set(productsData.map(p => p.categoryName))];
  for (const catName of uniqueCatNames) {
    const key = catName.toLowerCase();
    if (!catNameToId[key]) {
      const id = await db.categories.add({ name: catName, type: 'Menu' });
      catNameToId[key] = id;
    }
  }

  // 3. Add missing Products & Recipes safely
  const existingProducts = await db.products.toArray();
  const existingRecipes = await db.recipes.toArray();
  const prodNameToId = {};
  
  for (const p of existingProducts) {
    prodNameToId[p.name.toLowerCase()] = p.id;
  }

  for (const prod of productsData) {
    const key = prod.name.toLowerCase();
    let productId = prodNameToId[key];

    // If product doesn't exist, create it
    if (!productId) {
      const catId = catNameToId[prod.categoryName.toLowerCase()];
      productId = await db.products.add({
        name: prod.name,
        price: prod.price,
        categoryId: catId,
        type: prod.type,
        hasModifiers: prod.hasModifiers
      });
      prodNameToId[key] = productId;
    }

    // Check if recipe already exists for this product (don't duplicate recipes)
    const productHasRecipe = existingRecipes.some(r => r.productId === productId);
    
    if (!productHasRecipe && prod.recipe) {
      for (const [materialName, qty] of Object.entries(prod.recipe)) {
        const materialId = materialNameToId[materialName.toLowerCase()];
        if (materialId) {
          await db.recipes.add({
            productId: productId,
            materialId: materialId,
            quantity: qty
          });
        }
      }
    }
  }

  console.log('PDF recipes imported successfully!');
  localStorage.setItem('pdf_recipes_imported_v2', 'true');
};

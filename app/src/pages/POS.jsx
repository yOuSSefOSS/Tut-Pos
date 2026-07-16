import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, X } from 'lucide-react';

// Modifiers Popup Component
function ModifierModal({ product, onClose, onConfirm }) {
  const sugarLevels = product?.customModifiers?.sugarLevels || ['No Sugar', 'Min Sugar', 'Normal', 'Extra Sugar'];
  const variants = product?.customModifiers?.variants || ['None', 'Caramelized', 'Vanilla', 'Extra Shot'];

  const [selectedSugar, setSelectedSugar] = useState(sugarLevels.includes('Normal') ? 'Normal' : sugarLevels[0] || '');
  const [selectedVariant, setSelectedVariant] = useState(variants.includes('None') ? 'None' : variants[0] || '');

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={() => onConfirm(product, sugarLevels.includes('Normal') ? 'Normal' : sugarLevels[0] || '', variants.includes('None') ? 'None' : variants[0] || '')} // Clicking outside skips selection
    >
      <div 
        className="bg-obsidian border border-sand shadow-[0_0_40px_rgba(212,175,55,0.2)] rounded-3xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-sand">{product.name}</h2>
          <button onClick={() => onClose()} className="text-papyrus/50 hover:text-sand"><X size={24} /></button>
        </div>

        <div className="mb-6">
          <h3 className="text-papyrus font-semibold mb-3">Sugar Level</h3>
          <div className="grid grid-cols-2 gap-3">
            {sugarLevels.map(level => (
              <button
                key={level}
                onClick={() => setSelectedSugar(level)}
                className={`py-3 rounded-xl font-bold transition-all ${
                  selectedSugar === level 
                    ? 'bg-sand text-obsidian shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                    : 'bg-black/50 text-papyrus/70 hover:bg-black/80 border border-sand/20'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-papyrus font-semibold mb-3">Add-ons</h3>
          <div className="grid grid-cols-2 gap-3">
            {variants.map(variant => (
              <button
                key={variant}
                onClick={() => setSelectedVariant(variant)}
                className={`py-3 rounded-xl font-bold transition-all ${
                  selectedVariant === variant 
                    ? 'bg-sand text-obsidian shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                    : 'bg-black/50 text-papyrus/70 hover:bg-black/80 border border-sand/20'
                }`}
              >
                {variant}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={() => onConfirm(product, selectedSugar, selectedVariant)}
          className="w-full bg-sand text-obsidian font-bold text-xl py-4 rounded-xl hover:bg-sand-light transition-colors"
        >
          Add to Order
        </button>
      </div>
    </div>
  );
}

export default function POS() {
  const categoriesRaw = useLiveQuery(() => db.categories.toArray());
  // Deduplicate categories by name
  const categories = categoriesRaw ? categoriesRaw.filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i) : [];
  
  const [activeCategoryName, setActiveCategoryName] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);

  // If no active category, default to the first one once loaded
  if (categories && categories.length > 0 && activeCategoryName === null) {
    setActiveCategoryName(categories[0].name);
  }

  const productsRaw = useLiveQuery(() => db.products.toArray());
  
  // Find all products that belong to any category that shares the activeCategoryName
  const activeCategoryIds = categoriesRaw 
    ? categoriesRaw.filter(c => c.name === activeCategoryName).map(c => c.id)
    : [];

  // Deduplicate products by name just to be absolutely safe
  const products = productsRaw
    ? productsRaw.filter(p => activeCategoryIds.includes(p.categoryId)).filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i)
    : [];

  const [cart, setCart] = useState([]);

  const handleProductClick = (product) => {
    if (product.hasModifiers) {
      setActiveProduct(product);
    } else {
      addToCart(product, '', '');
    }
  };

  const addToCart = (product, sugar, variant) => {
    setActiveProduct(null); // Close modal
    
    // Create a unique ID for the cart item based on product ID + modifiers
    const modifierString = [sugar, variant !== 'None' ? variant : ''].filter(Boolean).join(', ');
    const cartItemId = `${product.id}-${modifierString}`;

    setCart(prev => {
      const existing = prev.find(item => item.cartItemId === cartItemId);
      if (existing) {
        return prev.map(item => item.cartItemId === cartItemId ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, cartItemId, modifiers: modifierString, qty: 1 }];
    });
  };

  const updateQty = (cartItemId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (cartItemId) => setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      const orderId = await db.orders.add({
        total,
        createdAt: new Date().toISOString(),
        synced: 0
      });

      const orderItems = cart.map(item => ({
        orderId,
        productId: item.id,
        name: item.name,
        modifiers: item.modifiers,
        quantity: item.qty,
        price: item.price,
        subtotal: item.price * item.qty,
        synced: 0
      }));

      await db.orderItems.bulkAdd(orderItems);
      
      // Auto-deduct raw materials based on recipes
      const allRecipes = await db.recipes.toArray();
      const materialUpdates = {};
      
      for (const item of cart) {
        const itemRecipes = allRecipes.filter(r => r.productId === item.id);
        for (const recipe of itemRecipes) {
          const deduction = recipe.quantity * item.qty;
          if (!materialUpdates[recipe.materialId]) {
            materialUpdates[recipe.materialId] = 0;
          }
          materialUpdates[recipe.materialId] += deduction;
        }
      }

      // Apply deductions
      for (const [materialId, deductionAmount] of Object.entries(materialUpdates)) {
        const material = await db.rawMaterials.get(parseInt(materialId));
        if (material) {
          await db.rawMaterials.update(material.id, {
            currentStock: material.currentStock - deductionAmount
          });
        }
      }

      setCart([]);
      // Play a success sound or visual feedback here instead of alert for better UX
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Failed to process order.');
    }
  };

  return (
    <div className="flex h-full w-full relative">
      {activeProduct && (
        <ModifierModal 
          product={activeProduct} 
          onClose={() => setActiveProduct(null)} 
          onConfirm={addToCart} 
        />
      )}

      {/* Menu Area */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        
        {/* Categories */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {categories?.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryName(cat.name)}
              className={`px-8 py-4 rounded-xl font-bold text-lg whitespace-nowrap transition-all uppercase tracking-wider ${
                activeCategoryName === cat.name 
                  ? 'bg-gradient-to-r from-sand to-sand-light text-obsidian shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                  : 'bg-black/60 text-papyrus hover:bg-black/80 border border-sand/30 hover:border-sand shadow-lg'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0 pr-2">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {products?.map(product => (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="bg-black/70 border border-sand/30 hover:border-sand shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-4 transition-all hover:scale-105 group relative overflow-hidden h-40"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-sand/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <h3 className="font-bold text-lg text-papyrus leading-tight group-hover:text-sand transition-colors z-10">{product.name}</h3>
                
                <div className="mt-auto z-10 w-full flex items-center justify-between">
                  <span className="text-papyrus/50 text-xs uppercase tracking-widest">{product.type}</span>
                  <span className="text-sand font-bold text-xl">{product.price} EGP</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-full md:w-80 lg:w-96 bg-black/80 border-l border-sand/30 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] flex flex-col h-full right-0 absolute md:relative transform transition-transform translate-x-full md:translate-x-0 z-10">
        <div className="p-6 border-b border-sand/30 bg-obsidian flex justify-between items-center">
          <h2 className="text-2xl font-bold text-sand flex items-center gap-3">
            <ShoppingCart size={28} /> Order
          </h2>
          <span className="bg-sand/20 text-sand px-3 py-1 rounded-full font-bold text-sm">
            {cart.reduce((s, i) => s + i.qty, 0)} Items
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-papyrus/30">
              <ShoppingCart size={64} className="mb-4 opacity-20" />
              <p className="text-lg">Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.cartItemId} className="bg-obsidian border border-sand/20 rounded-xl p-4 flex flex-col gap-3 shadow-lg relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <h4 className="font-bold text-papyrus text-lg leading-tight">{item.name}</h4>
                    {item.modifiers && (
                      <p className="text-sand/80 text-sm mt-1 font-medium">{item.modifiers}</p>
                    )}
                  </div>
                  <div className="text-sand font-bold text-lg whitespace-nowrap">{item.price * item.qty} EGP</div>
                </div>
                
                <div className="flex justify-between items-center mt-1">
                  <div className="flex items-center gap-3 bg-black/60 rounded-lg p-1 border border-sand/20">
                    <button onClick={() => updateQty(item.cartItemId, -1)} className="p-2 text-papyrus/70 hover:text-sand hover:bg-sand/10 rounded-md transition-colors"><Minus size={16}/></button>
                    <span className="w-6 text-center font-bold text-papyrus">{item.qty}</span>
                    <button onClick={() => updateQty(item.cartItemId, 1)} className="p-2 text-papyrus/70 hover:text-sand hover:bg-sand/10 rounded-md transition-colors"><Plus size={16}/></button>
                  </div>
                  <button onClick={() => removeFromCart(item.cartItemId)} className="text-red-400 hover:text-red-300 p-2 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-obsidian border-t border-sand/30 shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
          <div className="flex justify-between items-end mb-6">
            <span className="text-papyrus/70 font-semibold text-lg uppercase tracking-wider">Total Amount</span>
            <span className="text-4xl font-bold text-sand">{total} EGP</span>
          </div>
          
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full bg-gradient-to-r from-sand to-sand-light text-obsidian font-bold text-2xl py-5 rounded-2xl hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all disabled:opacity-50 disabled:hover:shadow-none flex items-center justify-center gap-3"
          >
            <Banknote size={28} />
            PAY NOW
          </button>
        </div>
      </div>
    </div>
  );
}

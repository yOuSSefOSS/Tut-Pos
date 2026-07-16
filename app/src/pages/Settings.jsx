import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Settings as SettingsIcon, Lock, ArrowLeft, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Settings() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  
  const [activeTab, setActiveTab] = useState('modifiers'); // modifiers, categories, products

  const products = useLiveQuery(() => db.products.filter(p => p.deleted !== 1).toArray());
  const categories = useLiveQuery(() => db.categories.filter(c => c.deleted !== 1).toArray());

  // Category State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('hot');

  // Product State
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductCategoryId, setNewProductCategoryId] = useState('');
  const [newProductHasModifiers, setNewProductHasModifiers] = useState(false);

  // Edit Product State
  const [editingProductId, setEditingProductId] = useState(null);
  const [editProductName, setEditProductName] = useState('');
  const [editProductPrice, setEditProductPrice] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (passcode === '001') {
      setIsAuthenticated(true);
    } else {
      alert('Incorrect Passcode');
      setPasscode('');
    }
  };

  /* --- MODIFIERS LOGIC --- */
  const toggleModifiers = async (product) => {
    await db.products.update(product.id, { hasModifiers: !product.hasModifiers, synced: 0 });
  };

  const updateCustomModifiers = async (product, field, value) => {
    const arrayValue = value.split(',').map(s => s.trim()).filter(Boolean);
    const updatedModifiers = { ...product.customModifiers, [field]: arrayValue };
    await db.products.update(product.id, { customModifiers: updatedModifiers, synced: 0 });
  };

  /* --- CATEGORIES LOGIC --- */
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName) return;
    await db.categories.add({ 
      cloud_id: crypto.randomUUID(), 
      name: newCategoryName, 
      type: newCategoryType, 
      synced: 0, 
      deleted: 0 
    });
    setNewCategoryName('');
  };

  const handleDeleteCategory = async (id) => {
    // Check if products exist in this category
    const productsInCategory = await db.products.where({ categoryId: id }).count();
    if (productsInCategory > 0) {
      alert(`Cannot delete category. There are ${productsInCategory} products currently assigned to it. Please delete or move them first.`);
      return;
    }
    if (window.confirm('Are you sure you want to delete this category?')) {
      await db.categories.update(id, { deleted: 1, synced: 0 });
    }
  };

  /* --- PRODUCTS LOGIC --- */
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !newProductCategoryId) return;
    
    const cat = categories.find(c => c.id === parseInt(newProductCategoryId));
    if (!cat) return;

    await db.products.add({ 
      cloud_id: crypto.randomUUID(),
      name: newProductName, 
      price: parseFloat(newProductPrice), 
      categoryId: cat.id, 
      type: cat.type, 
      hasModifiers: newProductHasModifiers,
      synced: 0,
      deleted: 0
    });
    setNewProductName('');
    setNewProductPrice('');
    setNewProductHasModifiers(false);
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await db.products.update(id, { deleted: 1, synced: 0 });
    }
  };

  const startEditProduct = (product) => {
    setEditingProductId(product.id);
    setEditProductName(product.name);
    setEditProductPrice(product.price);
  };

  const saveEditProduct = async (id) => {
    await db.products.update(id, { name: editProductName, price: parseFloat(editProductPrice), synced: 0 });
    setEditingProductId(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center bg-obsidian text-papyrus">
        <form onSubmit={handleLogin} className="bg-black/80 border border-sand/30 p-8 rounded-3xl text-center max-w-sm w-full shadow-2xl">
          <div className="flex justify-center mb-6 text-sand"><Lock size={48} /></div>
          <h2 className="text-2xl font-bold mb-6 text-sand tracking-widest uppercase">Admin Access</h2>
          <input 
            type="password" 
            placeholder="Enter Passcode" 
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="w-full bg-obsidian border border-sand/30 rounded-xl p-4 text-center text-xl tracking-[0.5em] focus:border-sand focus:outline-none transition-colors mb-6"
            autoFocus
          />
          <button type="submit" className="w-full bg-sand text-obsidian font-bold py-4 rounded-xl hover:bg-sand-light transition-colors text-lg">
            Unlock Settings
          </button>
        </form>
      </div>
    );
  }

  const uniqueProducts = products?.filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i) || [];

  return (
    <div className="p-8 h-full overflow-y-auto pb-20 relative">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-sand flex items-center gap-3">
          <SettingsIcon size={32} /> System Management
        </h1>
        <Link to="/" className="flex items-center gap-2 text-papyrus/50 hover:text-sand transition-colors">
          <ArrowLeft size={20} /> Back to POS
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-sand/20 mb-8 pb-4 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('modifiers')}
          className={`px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === 'modifiers' ? 'bg-sand text-obsidian' : 'text-papyrus hover:bg-white/5'}`}
        >
          Product Modifiers
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          className={`px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === 'categories' ? 'bg-sand text-obsidian' : 'text-papyrus hover:bg-white/5'}`}
        >
          Categories
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={`px-6 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${activeTab === 'products' ? 'bg-sand text-obsidian' : 'text-papyrus hover:bg-white/5'}`}
        >
          Products
        </button>
      </div>

      {/* TAB CONTENT: MODIFIERS */}
      {activeTab === 'modifiers' && (
        <div className="bg-black/60 border border-sand/30 rounded-3xl p-6 shadow-xl">
          <p className="text-papyrus/60 mb-8">
            Configure which products show the Modifiers Pop-up. If enabled, you can customize the exact Sugar Levels and Add-on Variants for each product.
          </p>
          <div className="space-y-6">
            {uniqueProducts.map(product => {
              const currentSugar = product.customModifiers?.sugarLevels?.join(', ') || 'No Sugar, Min Sugar, Normal, Extra Sugar';
              const currentVariants = product.customModifiers?.variants?.join(', ') || 'None, Caramelized, Vanilla, Extra Shot';

              return (
                <div key={product.id} className="bg-obsidian border border-sand/10 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-papyrus mb-2">{product.name}</h3>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleModifiers(product)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${product.hasModifiers ? 'bg-sand' : 'bg-papyrus/20'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-obsidian transition-transform ${product.hasModifiers ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <span className={`font-semibold ${product.hasModifiers ? 'text-sand' : 'text-papyrus/40'}`}>
                        {product.hasModifiers ? 'Modifiers Enabled' : 'Modifiers Disabled'}
                      </span>
                    </div>
                  </div>

                  {product.hasModifiers && (
                    <div className="flex-2 w-full md:w-2/3 space-y-4 bg-black/40 p-4 rounded-xl border border-sand/5">
                      <div>
                        <label className="block text-xs text-papyrus/50 mb-1 font-semibold uppercase tracking-wider">Sugar Levels (Comma separated)</label>
                        <input 
                          type="text" 
                          defaultValue={currentSugar}
                          onBlur={(e) => updateCustomModifiers(product, 'sugarLevels', e.target.value)}
                          className="w-full bg-obsidian border border-sand/20 rounded-lg p-2 text-sm text-papyrus focus:border-sand focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-papyrus/50 mb-1 font-semibold uppercase tracking-wider">Variants (Comma separated)</label>
                        <input 
                          type="text" 
                          defaultValue={currentVariants}
                          onBlur={(e) => updateCustomModifiers(product, 'variants', e.target.value)}
                          className="w-full bg-obsidian border border-sand/20 rounded-lg p-2 text-sm text-papyrus focus:border-sand focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="space-y-8">
          <div className="bg-black/60 border border-sand/30 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-sand mb-6">Add New Category</h2>
            <form onSubmit={handleAddCategory} className="flex flex-col md:flex-row gap-4">
              <input 
                type="text" 
                placeholder="Category Name (e.g., Ice Cream)" 
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 bg-obsidian border border-sand/30 rounded-xl p-4 text-papyrus focus:border-sand focus:outline-none"
                required
              />
              <select 
                value={newCategoryType}
                onChange={(e) => setNewCategoryType(e.target.value)}
                className="bg-obsidian border border-sand/30 rounded-xl p-4 text-papyrus focus:border-sand focus:outline-none"
              >
                <option value="hot">Hot Drinks</option>
                <option value="cold">Cold Drinks</option>
                <option value="food">Food & Snacks</option>
                <option value="dessert">Desserts</option>
              </select>
              <button type="submit" className="bg-sand text-obsidian font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-sand-light transition-colors">
                <Plus size={20} /> Add
              </button>
            </form>
          </div>

          <div className="bg-black/60 border border-sand/30 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-sand mb-6">Existing Categories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories?.map(cat => (
                <div key={cat.id} className="bg-obsidian border border-sand/10 rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-papyrus text-lg">{cat.name}</h3>
                    <span className="text-xs text-sand uppercase tracking-wider">{cat.type}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="space-y-8">
          <div className="bg-black/60 border border-sand/30 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-sand mb-6">Add New Product</h2>
            <form onSubmit={handleAddProduct} className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                <input 
                  type="text" 
                  placeholder="Product Name" 
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="flex-1 bg-obsidian border border-sand/30 rounded-xl p-4 text-papyrus focus:border-sand focus:outline-none"
                  required
                />
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="Price" 
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(e.target.value)}
                  className="w-full md:w-32 bg-obsidian border border-sand/30 rounded-xl p-4 text-papyrus focus:border-sand focus:outline-none"
                  required
                />
                <select 
                  value={newProductCategoryId}
                  onChange={(e) => setNewProductCategoryId(e.target.value)}
                  className="bg-obsidian border border-sand/30 rounded-xl p-4 text-papyrus focus:border-sand focus:outline-none"
                  required
                >
                  <option value="" disabled>Select Category</option>
                  {categories?.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <button 
                  type="button"
                  onClick={() => setNewProductHasModifiers(!newProductHasModifiers)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${newProductHasModifiers ? 'bg-sand' : 'bg-papyrus/20'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-obsidian transition-transform ${newProductHasModifiers ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-papyrus/60 text-sm font-semibold uppercase tracking-widest">Enable Modifiers (Sugar/Add-ons)</span>
              </div>
              <button type="submit" className="bg-sand text-obsidian font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-sand-light transition-colors mt-4">
                <Plus size={20} /> Add Product
              </button>
            </form>
          </div>

          <div className="bg-black/60 border border-sand/30 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-sand mb-6">Existing Products</h2>
            <div className="space-y-8">
              {categories?.map(cat => {
                const catProducts = uniqueProducts.filter(p => p.categoryId === cat.id);
                if (catProducts.length === 0) return null;
                return (
                  <div key={cat.id} className="border border-sand/10 rounded-2xl overflow-hidden">
                    <div className="bg-sand/10 px-6 py-3 border-b border-sand/20 flex justify-between items-center">
                      <h3 className="font-bold text-sand text-lg">{cat.name}</h3>
                      <span className="text-xs text-papyrus/50 bg-obsidian px-3 py-1 rounded-full">{catProducts.length} items</span>
                    </div>
                    <div className="divide-y divide-sand/5">
                      {catProducts.map(product => (
                        <div key={product.id} className="bg-obsidian p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                          {editingProductId === product.id ? (
                            <div className="flex flex-1 gap-4 mr-4">
                              <input 
                                type="text" 
                                value={editProductName}
                                onChange={(e) => setEditProductName(e.target.value)}
                                className="flex-1 bg-black/50 border border-sand/50 rounded-lg p-2 text-papyrus focus:outline-none"
                              />
                              <input 
                                type="number" 
                                step="0.01"
                                value={editProductPrice}
                                onChange={(e) => setEditProductPrice(e.target.value)}
                                className="w-24 bg-black/50 border border-sand/50 rounded-lg p-2 text-papyrus focus:outline-none"
                              />
                            </div>
                          ) : (
                            <div>
                              <div className="font-bold text-papyrus text-lg">{product.name}</div>
                              <div className="text-sand">{product.price} EGP</div>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            {editingProductId === product.id ? (
                              <>
                                <button onClick={() => saveEditProduct(product.id)} className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"><Check size={20} /></button>
                                <button onClick={() => setEditingProductId(null)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><X size={20} /></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEditProduct(product)} className="p-2 text-papyrus/60 hover:text-sand hover:bg-sand/10 rounded-lg transition-colors"><Edit2 size={20} /></button>
                                <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={20} /></button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

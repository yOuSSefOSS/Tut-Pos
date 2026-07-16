import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Plus, Trash2, ArrowDownRight, ArrowUpRight, Wallet, Package, Link as LinkIcon } from 'lucide-react';
import { startOfMonth, endOfMonth, format } from 'date-fns';

function FinancialsTab() {
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const startMonth = startOfMonth(new Date()).toISOString();
  const endMonth = endOfMonth(new Date()).toISOString();

  const monthlyOrders = useLiveQuery(() => db.orders.where('createdAt').between(startMonth, endMonth).toArray());
  const monthlyExpenses = useLiveQuery(() => db.expenses.where('date').between(startMonth, endMonth).toArray());
  const expenseCategories = useLiveQuery(() => db.expenseCategories.toArray());

  // Initialize default category selection
  if (expenseCategories && expenseCategories.length > 0 && !expenseCategory && !isAddingCategory) {
    setExpenseCategory(expenseCategories[0].name);
  }

  const totalIncome = monthlyOrders?.reduce((sum, order) => sum + order.total, 0) || 0;
  const totalOutcome = monthlyExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const netProfit = totalIncome - totalOutcome;

  const groupedExpenses = useMemo(() => {
    if (!monthlyExpenses) return [];
    const groups = {};
    monthlyExpenses.forEach(exp => {
      if (!groups[exp.category]) groups[exp.category] = 0;
      groups[exp.category] += exp.amount;
    });
    return Object.entries(groups).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [monthlyExpenses]);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName) return;
    await db.expenseCategories.add({ name: newCategoryName });
    setExpenseCategory(newCategoryName);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseAmount || !expenseDesc || !expenseCategory) return;

    await db.expenses.add({
      amount: parseFloat(expenseAmount),
      description: expenseDesc,
      category: expenseCategory,
      date: new Date().toISOString(),
      synced: 0
    });

    setExpenseAmount('');
    setExpenseDesc('');
  };

  const deleteExpense = async (id) => {
    await db.expenses.delete(id);
  };

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-black/60 border border-sand/30 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-green-500/10"><ArrowUpRight size={100} /></div>
          <p className="text-papyrus/60 font-semibold mb-1 uppercase tracking-wider">Monthly Income</p>
          <h3 className="text-4xl font-bold text-green-400 mt-2">{totalIncome} <span className="text-xl opacity-70">EGP</span></h3>
        </div>
        
        <div className="bg-black/60 border border-sand/30 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-red-500/10"><ArrowDownRight size={100} /></div>
          <p className="text-papyrus/60 font-semibold mb-1 uppercase tracking-wider">Monthly Outcome</p>
          <h3 className="text-4xl font-bold text-red-400 mt-2">{totalOutcome} <span className="text-xl opacity-70">EGP</span></h3>
        </div>

        <div className={`border rounded-2xl p-6 relative overflow-hidden ${netProfit >= 0 ? 'bg-sand/10 border-sand text-sand' : 'bg-red-500/10 border-red-500 text-red-400'}`}>
          <p className="font-semibold mb-1 uppercase tracking-wider opacity-80">Net Profit (This Month)</p>
          <h3 className="text-4xl font-bold mt-2">{netProfit} <span className="text-xl opacity-70">EGP</span></h3>
        </div>
      </div>

      {/* Expense Grouping Summary */}
      {groupedExpenses.length > 0 && (
        <div className="bg-black/60 border border-sand/30 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-sand mb-6">Expenses by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {groupedExpenses.map(group => (
              <div key={group.name} className="bg-obsidian border border-sand/20 rounded-xl p-4 text-center">
                <p className="text-papyrus/60 text-sm mb-1">{group.name}</p>
                <p className="text-red-400 font-bold text-lg">{group.total} EGP</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Expense Form */}
        <div className="bg-black/60 border border-sand/30 rounded-2xl p-6 h-fit">
          <h2 className="text-xl font-bold text-sand mb-6">Log New Expense</h2>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <label className="block text-sm text-papyrus/70 mb-1">Amount (EGP)</label>
              <input 
                type="number" 
                required 
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="w-full bg-obsidian border border-sand/30 rounded-lg p-3 text-papyrus focus:border-sand focus:outline-none transition-colors"
                placeholder="e.g. 150"
              />
            </div>
            <div>
              <label className="block text-sm text-papyrus/70 mb-1">Description (Optional detail)</label>
              <input 
                type="text" 
                required
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                className="w-full bg-obsidian border border-sand/30 rounded-lg p-3 text-papyrus focus:border-sand focus:outline-none transition-colors"
                placeholder="e.g. 2 Bottles of Milk"
              />
            </div>
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="block text-sm text-papyrus/70">Category</label>
                {!isAddingCategory && (
                  <button type="button" onClick={() => setIsAddingCategory(true)} className="text-xs text-sand hover:underline flex items-center gap-1">
                    <Plus size={12} /> Add New
                  </button>
                )}
              </div>
              
              {isAddingCategory ? (
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 bg-obsidian border border-sand/30 rounded-lg p-3 text-papyrus focus:border-sand focus:outline-none transition-colors"
                    placeholder="e.g. Milk, Snacks..."
                  />
                  <button type="button" onClick={handleAddCategory} className="bg-sand text-obsidian px-4 rounded-lg font-bold">Save</button>
                  <button type="button" onClick={() => setIsAddingCategory(false)} className="px-3 text-papyrus/50 hover:text-papyrus">Cancel</button>
                </div>
              ) : (
                <select 
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full bg-obsidian border border-sand/30 rounded-lg p-3 text-papyrus focus:border-sand focus:outline-none transition-colors"
                >
                  {expenseCategories?.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                  {(!expenseCategories || expenseCategories.length === 0) && (
                    <option value="" disabled>No categories yet. Click "Add New".</option>
                  )}
                </select>
              )}
            </div>
            <button 
              type="submit"
              disabled={isAddingCategory || (!expenseCategory && !isAddingCategory)}
              className="w-full bg-sand text-obsidian font-bold py-3 rounded-lg hover:bg-sand-light transition-colors flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              <Plus size={20} /> Add Expense
            </button>
          </form>
        </div>

        {/* Expenses List */}
        <div className="bg-black/60 border border-sand/30 rounded-2xl p-6 lg:col-span-2 flex flex-col">
          <h2 className="text-xl font-bold text-sand mb-6">Monthly Expense Ledger</h2>
          <div className="overflow-x-auto flex-1 max-h-96">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-obsidian z-10">
                <tr className="border-b border-sand/10 text-papyrus/60 text-sm">
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Description</th>
                  <th className="p-4 font-medium">Category</th>
                  <th className="p-4 font-medium text-right">Amount</th>
                  <th className="p-4 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {monthlyExpenses?.slice().reverse().map(exp => (
                  <tr key={exp.id} className="border-b border-sand/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-papyrus/80">{format(new Date(exp.date), 'MMM dd, HH:mm')}</td>
                    <td className="p-4 font-bold text-papyrus">{exp.description}</td>
                    <td className="p-4"><span className="bg-sand/10 text-sand px-2 py-1 rounded text-xs uppercase tracking-wider font-bold">{exp.category}</span></td>
                    <td className="p-4 text-right text-red-400 font-bold">{exp.amount} EGP</td>
                    <td className="p-4 text-center">
                      <button onClick={() => deleteExpense(exp.id)} className="text-papyrus/40 hover:text-red-400 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {(!monthlyExpenses || monthlyExpenses.length === 0) && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-papyrus/40">No expenses recorded this month.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function InventoryTab() {
  const rawMaterials = useLiveQuery(() => db.rawMaterials.toArray());
  const products = useLiveQuery(() => db.products.toArray());
  const recipes = useLiveQuery(() => db.recipes.toArray());

  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialUnit, setNewMaterialUnit] = useState('g');
  const [stockAddAmount, setStockAddAmount] = useState('');
  const [stockAddCost, setStockAddCost] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  
  const [activeProductId, setActiveProductId] = useState('');
  const [recipeMaterialId, setRecipeMaterialId] = useState('');
  const [recipeQuantity, setRecipeQuantity] = useState('');

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!newMaterialName) return;
    await db.rawMaterials.add({ name: newMaterialName, unit: newMaterialUnit, currentStock: 0 });
    setNewMaterialName('');
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    if (!selectedMaterialId || !stockAddAmount || !stockAddCost) return;
    
    const material = await db.rawMaterials.get(parseInt(selectedMaterialId));
    const amount = parseFloat(stockAddAmount);
    const cost = parseFloat(stockAddCost);

    // Update Stock
    await db.rawMaterials.update(material.id, {
      currentStock: material.currentStock + amount
    });

    // Log the restock
    await db.stockLogs.add({
      materialId: material.id,
      quantityAdded: amount,
      cost: cost,
      date: new Date().toISOString(),
      synced: 0
    });

    // Automatically log it as an expense so financials stay synced
    const existingCategory = await db.expenseCategories.where('name').equals(material.name).first();
    if (!existingCategory) {
      await db.expenseCategories.add({ name: material.name });
    }
    
    await db.expenses.add({
      amount: cost,
      description: `Restocked ${amount}${material.unit} of ${material.name}`,
      category: material.name,
      date: new Date().toISOString(),
      synced: 0
    });

    setStockAddAmount('');
    setStockAddCost('');
    setSelectedMaterialId('');
    alert(`Successfully restocked ${material.name} and logged ${cost} EGP expense.`);
  };

  const handleAddRecipe = async (e) => {
    e.preventDefault();
    if (!activeProductId || !recipeMaterialId || !recipeQuantity) return;

    await db.recipes.add({
      productId: parseInt(activeProductId),
      materialId: parseInt(recipeMaterialId),
      quantity: parseFloat(recipeQuantity)
    });

    setRecipeQuantity('');
  };

  const handleDeleteRecipe = async (id) => {
    await db.recipes.delete(id);
  };

  const handleDeleteMaterial = async (id) => {
    if (window.confirm('Are you sure you want to delete this raw material? This will also remove it from any recipes.')) {
      const recipesToDelete = recipes.filter(r => r.materialId === id);
      if (recipesToDelete.length > 0) {
        await db.recipes.bulkDelete(recipesToDelete.map(r => r.id));
      }
      await db.rawMaterials.delete(id);
    }
  };

  // Deduplicate products for the dropdown
  const uniqueProducts = products?.filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i) || [];

  return (
    <div className="space-y-8">
      {/* Raw Materials Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Materials List */}
        <div className="bg-black/60 border border-sand/30 rounded-2xl p-6 h-fit">
          <h2 className="text-xl font-bold text-sand mb-6 flex items-center gap-2">
            <Package size={24} /> Raw Materials Stock
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {rawMaterials?.map(mat => (
              <div key={mat.id} className="bg-obsidian border border-sand/20 rounded-xl p-4 flex flex-col justify-between relative group">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-papyrus">{mat.name}</h3>
                  <button 
                    onClick={() => handleDeleteMaterial(mat.id)}
                    className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 p-1.5 rounded-lg"
                    title="Delete Material"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className={`text-2xl font-bold mt-2 ${mat.currentStock <= 5 ? 'text-red-400' : 'text-sand'}`}>
                  {mat.currentStock.toFixed(2)} <span className="text-sm opacity-60">{mat.unit}</span>
                </div>
              </div>
            ))}
            {(!rawMaterials || rawMaterials.length === 0) && (
              <div className="col-span-2 text-center p-4 text-papyrus/50 border border-dashed border-sand/20 rounded-xl">
                No materials added yet. Add one below!
              </div>
            )}
          </div>

          <form onSubmit={handleAddMaterial} className="flex gap-2 p-4 bg-obsidian rounded-xl border border-sand/10">
            <input 
              type="text" 
              required
              placeholder="New Material (e.g. Milk)"
              value={newMaterialName}
              onChange={e => setNewMaterialName(e.target.value)}
              className="flex-1 bg-transparent border-b border-sand/30 focus:border-sand outline-none text-papyrus px-2"
            />
            <select
              value={newMaterialUnit}
              onChange={e => setNewMaterialUnit(e.target.value)}
              className="w-24 bg-transparent border-b border-sand/30 focus:border-sand outline-none text-papyrus px-2"
            >
              <option value="g">Grams (g)</option>
              <option value="ml">Milliliters (ml)</option>
              <option value="pcs">Pieces</option>
              <option value="bags">Bags</option>
            </select>
            <button type="submit" className="bg-sand/20 text-sand p-2 rounded-lg hover:bg-sand hover:text-obsidian transition-colors">
              <Plus size={20} />
            </button>
          </form>
        </div>

        {/* Restock Form */}
        <div className="bg-black/60 border border-sand/30 rounded-2xl p-6 h-fit">
          <h2 className="text-xl font-bold text-sand mb-6">Restock & Log Expense</h2>
          <form onSubmit={handleRestock} className="space-y-4">
            <div>
              <label className="block text-sm text-papyrus/70 mb-1">Select Material</label>
              <select 
                required
                value={selectedMaterialId}
                onChange={e => setSelectedMaterialId(e.target.value)}
                className="w-full bg-obsidian border border-sand/30 rounded-lg p-3 text-papyrus outline-none"
              >
                <option value="" disabled>Choose material...</option>
                {rawMaterials?.map(mat => (
                  <option key={mat.id} value={mat.id}>{mat.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm text-papyrus/70 mb-1">Quantity Added</label>
                <input 
                  type="number" step="0.01" required
                  value={stockAddAmount} onChange={e => setStockAddAmount(e.target.value)}
                  className="w-full bg-obsidian border border-sand/30 rounded-lg p-3 text-papyrus outline-none"
                  placeholder="e.g. 1000"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-papyrus/70 mb-1">Total Cost (EGP)</label>
                <input 
                  type="number" step="0.01" required
                  value={stockAddCost} onChange={e => setStockAddCost(e.target.value)}
                  className="w-full bg-obsidian border border-sand/30 rounded-lg p-3 text-papyrus outline-none"
                  placeholder="e.g. 150"
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full bg-sand text-obsidian font-bold py-3 rounded-lg hover:bg-sand-light transition-colors"
            >
              Add to Stock & Log Expense
            </button>
          </form>
        </div>

      </div>

      {/* Recipe Mapping */}
      <div className="bg-black/60 border border-sand/30 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-sand mb-6 flex items-center gap-2">
          <LinkIcon size={24} /> Product Recipes (Auto-Deduction)
        </h2>
        <p className="text-papyrus/60 mb-6">
          Map raw materials to your products here. When a product is sold, the exact amounts will be automatically deducted from your stock.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form onSubmit={handleAddRecipe} className="bg-obsidian p-4 rounded-xl border border-sand/20 space-y-4 h-fit">
            <h3 className="font-bold text-sand">Add Recipe Link</h3>
            <select 
              required
              value={activeProductId} onChange={e => setActiveProductId(e.target.value)}
              className="w-full bg-black/50 border border-sand/30 rounded-lg p-2 text-papyrus outline-none text-sm"
            >
              <option value="" disabled>Select Product...</option>
              {uniqueProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <select 
              required
              value={recipeMaterialId} onChange={e => setRecipeMaterialId(e.target.value)}
              className="w-full bg-black/50 border border-sand/30 rounded-lg p-2 text-papyrus outline-none text-sm"
            >
              <option value="" disabled>Select Material...</option>
              {rawMaterials?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>

            <div className="flex gap-2 items-center">
              <input 
                type="number" step="0.01" placeholder="Qty" required
                value={recipeQuantity} onChange={e => setRecipeQuantity(e.target.value)}
                className="flex-1 bg-black/50 border border-sand/30 rounded-lg p-2 text-papyrus outline-none text-sm"
              />
              <span className="text-xs text-papyrus/50 w-8">
                {recipeMaterialId && rawMaterials?.find(m => m.id === parseInt(recipeMaterialId))?.unit}
              </span>
            </div>

            <button type="submit" className="w-full bg-sand/20 text-sand font-bold py-2 rounded-lg hover:bg-sand hover:text-obsidian transition-colors text-sm">
              Link Material to Product
            </button>
          </form>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {uniqueProducts.map(product => {
              const productRecipes = recipes?.filter(r => r.productId === product.id) || [];
              if (productRecipes.length === 0) return null;

              return (
                <div key={product.id} className="bg-obsidian border border-sand/10 rounded-xl p-4">
                  <h4 className="font-bold text-sand mb-3">{product.name} Recipe</h4>
                  <ul className="space-y-2">
                    {productRecipes.map(recipe => {
                      const mat = rawMaterials?.find(m => m.id === recipe.materialId);
                      return (
                        <li key={recipe.id} className="flex justify-between items-center text-sm bg-black/40 p-2 rounded-lg">
                          <span className="text-papyrus">{mat?.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sand">{recipe.quantity} {mat?.unit}</span>
                            <button onClick={() => handleDeleteRecipe(recipe.id)} className="text-red-400 hover:text-red-300">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('financials'); // financials or inventory

  return (
    <div className="p-8 h-full overflow-y-auto pb-20">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-sand flex items-center gap-3">
          <Wallet size={32} /> Management & Inventory
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-sand/20 pb-4">
        <button
          onClick={() => setActiveTab('financials')}
          className={`px-6 py-3 rounded-xl font-bold transition-all uppercase tracking-wider ${
            activeTab === 'financials'
              ? 'bg-gradient-to-r from-sand to-sand-light text-obsidian shadow-[0_0_15px_rgba(212,175,55,0.4)]'
              : 'bg-black/60 text-papyrus hover:bg-black/80 border border-sand/30'
          }`}
        >
          Income & Expenses
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-6 py-3 rounded-xl font-bold transition-all uppercase tracking-wider ${
            activeTab === 'inventory'
              ? 'bg-gradient-to-r from-sand to-sand-light text-obsidian shadow-[0_0_15px_rgba(212,175,55,0.4)]'
              : 'bg-black/60 text-papyrus hover:bg-black/80 border border-sand/30'
          }`}
        >
          Raw Materials & Recipes
        </button>
      </div>

      {activeTab === 'financials' ? <FinancialsTab /> : <InventoryTab />}
    </div>
  );
}

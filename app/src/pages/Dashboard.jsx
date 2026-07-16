import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Banknote, TrendingUp, Package, Clock, BarChart3, Activity, ArrowUpRight, ArrowDownRight, Wallet, Trash2 } from 'lucide-react';
import { startOfDay, endOfDay, getHours, format } from 'date-fns';

export default function Dashboard() {
  const todayStart = startOfDay(new Date()).toISOString();
  const todayEnd = endOfDay(new Date()).toISOString();

  // Queries for Analysis
  const todayOrders = useLiveQuery(() => 
    db.orders.where('createdAt').between(todayStart, todayEnd).toArray()
  );

  const todayExpenses = useLiveQuery(() => 
    db.expenses.where('date').between(todayStart, todayEnd).toArray()
  );

  const unsyncedOrders = useLiveQuery(() => 
    db.orders.where('synced').equals(0).toArray()
  );

  // Get all order items for today's orders
  const todayOrderItems = useLiveQuery(async () => {
    if (!todayOrders || todayOrders.length === 0) return [];
    const orderIds = todayOrders.map(o => o.id);
    return await db.orderItems.where('orderId').anyOf(orderIds).toArray();
  }, [todayOrders]);

  const totalRevenue = todayOrders?.reduce((sum, order) => sum + order.total, 0) || 0;
  const totalExpenses = todayExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const netProfit = totalRevenue - totalExpenses;
  
  const orderCount = todayOrders?.length || 0;
  const unsyncedCount = unsyncedOrders?.length || 0;

  // Calculate product sales
  const productSales = useMemo(() => {
    if (!todayOrderItems) return [];
    const salesMap = {};
    todayOrderItems.forEach(item => {
      const key = item.modifiers ? `${item.name} (${item.modifiers})` : item.name;
      if (!salesMap[key]) {
        salesMap[key] = { name: item.name, modifiers: item.modifiers, qty: 0, revenue: 0 };
      }
      salesMap[key].qty += item.quantity;
      salesMap[key].revenue += item.subtotal;
    });
    return Object.values(salesMap).sort((a, b) => b.qty - a.qty);
  }, [todayOrderItems]);

  const topProduct = productSales.length > 0 ? productSales[0].name : 'N/A';

  // Calculate Hourly Sales (Peak Hours)
  const hourlySales = useMemo(() => {
    if (!todayOrders) return [];
    const hours = Array(24).fill(0);
    todayOrders.forEach(order => {
      const hour = getHours(new Date(order.createdAt));
      hours[hour] += order.total;
    });
    return hours;
  }, [todayOrders]);

  const maxHourValue = Math.max(...hourlySales, 1); // Avoid division by zero

  // Find Peak Hour
  let peakHourIdx = 0;
  let peakValue = 0;
  hourlySales.forEach((val, idx) => {
    if (val > peakValue) {
      peakValue = val;
      peakHourIdx = idx;
    }
  });
  const peakHourDisplay = peakValue > 0 ? `${peakHourIdx}:00 - ${peakHourIdx + 1}:00` : 'N/A';

  const [selectedOrder, setSelectedOrder] = useState(null);

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to completely delete this order?')) {
      const items = todayOrderItems.filter(i => i.orderId === orderId);
      await db.orderItems.bulkDelete(items.map(i => i.id));
      await db.orders.delete(orderId);
      setSelectedOrder(null);
    }
  };

  const handleDeleteItem = async (item) => {
    if (window.confirm(`Remove ${item.name} from this order?`)) {
      const order = todayOrders.find(o => o.id === item.orderId);
      if (order) {
        const newTotal = order.total - item.subtotal;
        if (newTotal <= 0) {
          // If no items left, delete whole order
          await db.orderItems.delete(item.id);
          await db.orders.delete(order.id);
          setSelectedOrder(null);
        } else {
          await db.orders.update(order.id, { total: newTotal, synced: 0 });
          await db.orderItems.delete(item.id);
        }
      }
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto pb-20">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-sand flex items-center gap-3">
          <Activity size={32} /> Advanced Analytics
        </h1>
        <div className="bg-obsidian border border-sand/30 px-6 py-2 rounded-xl">
          <span className="text-papyrus/50 uppercase tracking-widest text-sm mr-4">Status:</span>
          {unsyncedCount === 0 ? (
            <span className="text-green-400 font-bold">Cloud Synced</span>
          ) : (
            <span className="text-sand font-bold">{unsyncedCount} Pending Sync</span>
          )}
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-black/60 border border-sand/30 shadow-lg rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-green-500/10 group-hover:text-green-500/20 transition-colors">
            <ArrowUpRight size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-papyrus/60 font-semibold mb-1 uppercase tracking-wider">Today's Revenue</p>
            <h3 className="text-4xl font-bold text-green-400 mt-2">{totalRevenue} <span className="text-xl text-green-400/70">EGP</span></h3>
          </div>
        </div>

        <div className="bg-black/60 border border-sand/30 shadow-lg rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-red-500/10 group-hover:text-red-500/20 transition-colors">
            <ArrowDownRight size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-papyrus/60 font-semibold mb-1 uppercase tracking-wider">Today's Expenses</p>
            <h3 className="text-4xl font-bold text-red-400 mt-2">{totalExpenses} <span className="text-xl text-red-400/70">EGP</span></h3>
          </div>
        </div>

        <div className={`bg-black/60 border shadow-lg rounded-2xl p-6 relative overflow-hidden group ${netProfit >= 0 ? 'border-sand/50' : 'border-red-500/50'}`}>
          <div className={`absolute -right-4 -top-4 transition-colors ${netProfit >= 0 ? 'text-sand/10 group-hover:text-sand/20' : 'text-red-500/10 group-hover:text-red-500/20'}`}>
            <Wallet size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-papyrus/60 font-semibold mb-1 uppercase tracking-wider">Net Profit (Today)</p>
            <h3 className={`text-4xl font-bold mt-2 ${netProfit >= 0 ? 'text-sand' : 'text-red-400'}`}>
              {netProfit} <span className="text-xl opacity-70">EGP</span>
            </h3>
          </div>
        </div>

        <div className="bg-black/60 border border-sand/30 shadow-lg rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-sand/5 group-hover:text-sand/10 transition-colors">
            <Clock size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-papyrus/60 font-semibold mb-1 uppercase tracking-wider">Peak Hour</p>
            <h3 className="text-2xl font-bold text-papyrus mt-2">{peakHourDisplay}</h3>
          </div>
        </div>
      </div>

      {/* Peak Hours Chart */}
      <div className="bg-black/60 border border-sand/30 shadow-lg rounded-2xl p-6 mb-8 pb-12">
        <h2 className="text-xl font-bold text-sand mb-6 flex items-center gap-2"><BarChart3 /> Hourly Sales Distribution</h2>
        <div className="flex gap-1 h-48 w-full items-end">
          {hourlySales.map((val, idx) => {
            const heightPercent = (val / maxHourValue) * 100;
            return (
              <div 
                key={idx} 
                className="flex-1 bg-sand hover:bg-sand-light rounded-t-sm transition-all relative group"
                style={{ height: `${heightPercent}%`, minHeight: val > 0 ? '4px' : '0' }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-obsidian border border-sand/30 text-papyrus text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {val} EGP
                </div>
                <div className="absolute -bottom-6 left-0 right-0 text-[10px] text-papyrus/40 text-center">
                  {idx}h
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Specific Product Quantities */}
        <div className="bg-black/60 border border-sand/30 shadow-lg rounded-2xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-sand/20 flex justify-between items-center">
            <h2 className="text-xl font-bold text-sand flex items-center gap-2"><Package /> Items Sold Today</h2>
          </div>
          <div className="overflow-x-auto flex-1 max-h-96">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-obsidian shadow-sm z-10">
                <tr className="border-b border-sand/10 text-papyrus/60 text-sm">
                  <th className="p-4 font-medium">Product</th>
                  <th className="p-4 font-medium text-center">Qty Sold</th>
                  <th className="p-4 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {productSales.map((item, idx) => (
                  <tr key={idx} className="border-b border-sand/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-papyrus">{item.name}</div>
                      {item.modifiers && <div className="text-xs text-sand/70">{item.modifiers}</div>}
                    </td>
                    <td className="p-4 text-center font-bold text-xl text-sand">{item.qty}</td>
                    <td className="p-4 text-right text-papyrus">{item.revenue} EGP</td>
                  </tr>
                ))}
                {productSales.length === 0 && (
                  <tr>
                    <td colSpan="3" className="p-8 text-center text-papyrus/40">No items sold today yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Orders Ledger */}
        <div className="bg-black/60 border border-sand/30 shadow-lg rounded-2xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-sand/20 flex justify-between items-center">
            <h2 className="text-xl font-bold text-sand flex items-center gap-2"><TrendingUp /> Real-Time Ledger (Orders)</h2>
          </div>
          <div className="overflow-x-auto flex-1 max-h-96">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-obsidian shadow-sm z-10">
                <tr className="border-b border-sand/10 text-papyrus/60 text-sm">
                  <th className="p-4 font-medium">Order ID</th>
                  <th className="p-4 font-medium">Time</th>
                  <th className="p-4 font-medium text-right">Total</th>
                  <th className="p-4 font-medium text-center">Sync</th>
                </tr>
              </thead>
              <tbody>
                {todayOrders?.slice().reverse().map(order => (
                  <tr 
                    key={order.id} 
                    className="border-b border-sand/5 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="p-4 font-mono text-sand/80">#{order.id}</td>
                    <td className="p-4">{format(new Date(order.createdAt), 'HH:mm')}</td>
                    <td className="p-4 text-right font-bold">{order.total} EGP</td>
                    <td className="p-4 text-center">
                      {order.synced === 1 ? (
                        <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full text-xs font-bold uppercase tracking-wide">Synced</span>
                      ) : (
                        <span className="px-3 py-1 bg-sand/10 border border-sand/30 text-sand rounded-full text-xs font-bold uppercase tracking-wide">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!todayOrders || todayOrders.length === 0) && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-papyrus/40">No orders yet today.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
          <div className="bg-obsidian border border-sand shadow-2xl rounded-3xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-sand/10 border-b border-sand/20 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-sand">Order #{selectedOrder.id}</h2>
                <p className="text-papyrus/50 text-sm mt-1">{format(new Date(selectedOrder.createdAt), 'dd MMM yyyy - HH:mm')}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-papyrus hover:text-sand text-xl font-bold p-2">&times;</button>
            </div>
            
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                {todayOrderItems?.filter(item => item.orderId === selectedOrder.id).map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-sand/10 group">
                    <div className="flex-1">
                      <div className="font-bold text-papyrus text-lg">{item.name} <span className="text-sand text-sm">x{item.quantity}</span></div>
                      {item.modifiers && <div className="text-xs text-sand/70 mt-1">{item.modifiers}</div>}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="font-bold text-papyrus text-right">
                        {item.subtotal} <span className="text-xs opacity-50">EGP</span>
                      </div>
                      <button onClick={() => handleDeleteItem(item)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/20 rounded-lg" title="Remove Item">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-black/60 p-6 border-t border-sand/20 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-papyrus/60 font-bold uppercase tracking-widest text-sm">Total Paid</span>
                <span className="text-3xl font-bold text-sand">{selectedOrder.total} EGP</span>
              </div>
              <button 
                onClick={() => handleDeleteOrder(selectedOrder.id)}
                className="w-full py-3 rounded-xl bg-red-500/10 text-red-500 font-bold border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={20} />
                Delete Entire Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

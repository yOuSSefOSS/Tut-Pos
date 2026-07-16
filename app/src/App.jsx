import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Coffee, Activity, Settings, RefreshCw } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initMenu } from './db';
import { syncToCloud, pullMenuFromCloud } from './supabaseClient';
import { importPdfRecipes } from './importRecipes';

// Components
import POS from './pages/POS';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';

function Navigation() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className="w-full md:w-24 lg:w-72 bg-black border-b md:border-b-0 md:border-r border-sand/30 flex flex-row md:flex-col items-center lg:items-start p-4 lg:p-6 justify-between md:justify-start gap-8 z-20 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-4 w-full">
        <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full border-2 border-sand shadow-[0_0_15px_rgba(212,175,55,0.4)] overflow-hidden shrink-0 bg-obsidian">
          <img src="/logo.jpg" alt="Tut Cafe Logo" className="w-full h-full object-cover" />
        </div>
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold tracking-widest text-sand leading-tight">TUT</h1>
          <h2 className="text-sm font-semibold tracking-[0.2em] text-papyrus/70 uppercase">Cafe System</h2>
        </div>
      </div>

      <div className="flex flex-row md:flex-col gap-4 w-full lg:mt-8">
        <Link to="/" className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all group ${path === '/' ? 'bg-sand text-obsidian shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'text-papyrus hover:bg-white/5 hover:text-sand'}`}>
          <Coffee className={path === '/' ? '' : 'group-hover:scale-110 transition-transform'} />
          <span className="hidden lg:block font-bold text-lg">Cashier</span>
        </Link>
        <Link to="/dashboard" className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all group ${path === '/dashboard' ? 'bg-sand text-obsidian shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'text-papyrus hover:bg-white/5 hover:text-sand'}`}>
          <Activity className={path === '/dashboard' ? '' : 'group-hover:scale-110 transition-transform'} />
          <span className="hidden lg:block font-bold text-lg">Dashboard</span>
        </Link>
        <Link to="/inventory" className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all group ${path === '/inventory' ? 'bg-sand text-obsidian shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'text-papyrus hover:bg-white/5 hover:text-sand'}`}>
          <ShoppingCart className={path === '/inventory' ? '' : 'group-hover:scale-110 transition-transform'} />
          <span className="hidden lg:block font-bold text-lg">Inventory</span>
        </Link>
      </div>

      <div className="hidden md:flex flex-col mt-auto pt-8 border-t border-sand/20 w-full gap-2">
         <button onClick={syncToCloud} className="flex items-center gap-4 px-4 py-3 rounded-xl text-papyrus/60 hover:text-sand hover:bg-white/5 transition-all group">
           <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
           <span className="hidden lg:block font-semibold">Push Data to Cloud</span>
         </button>
         <button onClick={pullMenuFromCloud} className="flex items-center gap-4 px-4 py-3 rounded-xl text-papyrus/60 hover:text-sand hover:bg-white/5 transition-all group">
           <RefreshCw size={20} className="group-hover:-rotate-180 transition-transform duration-500" />
           <span className="hidden lg:block font-semibold">Pull Menu from Cloud</span>
         </button>
         <Link to="/settings" className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${path === '/settings' ? 'bg-sand text-obsidian shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'text-papyrus/60 hover:text-sand hover:bg-white/5'}`}>
           <Settings size={20} className={path === '/settings' ? '' : 'group-hover:rotate-90 transition-transform duration-500'} />
           <span className="hidden lg:block font-semibold">Settings</span>
         </Link>
      </div>
    </nav>
  );
}

import SettingsPage from './pages/Settings';

function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    importPdfRecipes().then(() => {
      initMenu().then(() => setIsInitializing(false));
    });
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-obsidian text-papyrus flex flex-col items-center justify-center">
        <div className="w-24 h-24 rounded-full border-4 border-sand/20 border-t-sand animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold text-sand tracking-widest animate-pulse">LOADING TUT CAFE...</h2>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-obsidian text-papyrus flex flex-col md:flex-row font-sans">
        
        <Navigation />

        {/* Main Content Area */}
        <main className="flex-1 h-[calc(100vh-80px)] md:h-screen overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-5 mix-blend-overlay pointer-events-none"></div>
          <Routes>
            <Route path="/" element={<POS />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

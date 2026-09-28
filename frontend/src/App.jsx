import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, PieChart, TrendingUp, Wallet, Search, Upload, Loader2, Database, Layers, Building2, LogOut, X, Calendar, Clock, Home as HomeIcon, Scale } from 'lucide-react';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import { fetchTransactions, uploadBankFile, deleteBankData } from './api/api';
import Statistics from './components/Statistics';
import Forecasting from './components/Forecasting';
import Home from './components/Home';
import Transactions from './components/Transactions';
import BalanceSheet from './components/BalanceSheet';

/**
 * GLOBAL STYLES COMPONENT
 * Injects CSS utility classes specifically for styling the custom, futuristic scrollbars
 * across the application, keeping the UI clean and modern.
 */
const GlobalStyles = () => (
  <style>{`
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
  `}</style>
);

function App() {
  // --- AUTH & NAVIGATION STATE ---
  const [session, setSession] = useState(null); // Stores the current Supabase user session
  const [isRecovering, setIsRecovering] = useState(false); // Flag for password recovery mode
  const [activeTab, setActiveTab] = useState('home'); // Tracks which view/component is currently active
  const [isNavExpanded, setIsNavExpanded] = useState(false); // Controls the desktop sidebar expand/collapse state
  
  // --- CORE DATA & UI STATE ---
  const [transactions, setTransactions] = useState([]); // Master list of all transactions from the DB
  const [uploadLoading, setUploadLoading] = useState(false); // Loading state for file uploads
  const [notification, setNotification] = useState(null); // Global toast/notification messages
  const [isWakingServer, setIsWakingServer] = useState(false); // Indicates if the backend AI server is booting up

  // --- GLOBAL FILTERS & SORTING STATE ---
  const [transType, setTransType] = useState('All amounts'); // Filter for Transactions Tab (Income vs Expenses)
  const [statsType, setStatsType] = useState('Expenses'); // Filter for Statistics Tab
  const [fcType, setFcType] = useState('Expenses'); // Filter for Forecasting Tab

  const [searchTerm, setSearchTerm] = useState(''); // Text search query
  const [catFilter, setCatFilter] = useState('All'); // Category dropdown filter
  const [bankFilter, setBankFilter] = useState('All'); // Bank dropdown filter
  const [selectedMonth, setSelectedMonth] = useState(''); // Month dropdown filter
  const [dashDateRange, setDashDateRange] = useState({ start: '', end: '' }); // Custom date range filter
  const [sortConfig, setSortConfig] = useState({ key: 'payment_date', direction: 'desc' }); // Sorting configuration

  // --- FORECASTING SPECIFIC STATE ---
  const [fcMode, setFcMode] = useState('30'); // Forecast time horizon (e.g., 30, 60, 90 days)
  const [fcCustomRange, setFcCustomRange] = useState({ 
      start: new Date().toISOString().split('T')[0], 
      end: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0] 
  });
  const [fcBankFilter, setFcBankFilter] = useState('All');
  const [fcCatFilter, setFcCatFilter] = useState('All');

  // --- STATISTICS SUMMARY STATE ---
  const [stats, setStats] = useState({ totalRecords: 0, monthsSpan: 0, activeBanks: 0, perBank: {} });

  // Reset basic filters whenever the user switches tabs to ensure a clean view
  useEffect(() => {
    setSearchTerm(''); setCatFilter('All'); setBankFilter('All'); setSelectedMonth(''); setDashDateRange({ start: '', end: '' });
  }, [activeTab]);

  /**
   * AUTHENTICATION LISTENER
   * Monitors Supabase authentication state changes (Login, Logout, Password Recovery).
   */
  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) { setIsRecovering(true); }
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') { setIsRecovering(true); }
    });
    return () => subscription.unsubscribe();
  }, []);

  /**
   * DATA FETCHING FUNCTION
   * Retrieves all user transactions from the backend and standardizes the data format.
   */
  const loadData = async () => {
    if (!session?.user?.id) return; 
    
    setIsWakingServer(true); // Start loading animation

    try {
      const data = await fetchTransactions(session.user.id);
      
      // DATA CLEANING: Force all categories to UPPERCASE. 
      // This prevents UI duplication bugs (e.g., treating "Food" and "FOOD" as different categories).
      const safeData = data.map(t => ({ 
        ...t, 
        amount: Number(t.amount) || 0,
        category: t.category ? t.category.toUpperCase() : 'UNCATEGORIZED'
      }));
      setTransactions(safeData);

      // --- CALCULATE DASHBOARD STATISTICS ---
      if (safeData.length > 0) {
        const dates = safeData.map(t => new Date(t.payment_date).getTime());
        const minDate = new Date(Math.min(...dates)), maxDate = new Date(Math.max(...dates));
        const diffMonths = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + (maxDate.getMonth() - minDate.getMonth());
        const bankCounts = {};
        safeData.forEach(t => { const b = t.bank_name || 'Unknown'; bankCounts[b] = (bankCounts[b] || 0) + 1; });
        setStats({ totalRecords: safeData.length, monthsSpan: diffMonths || 1, activeBanks: Object.keys(bankCounts).length, perBank: bankCounts });
      } else {
         setStats({ totalRecords: 0, monthsSpan: 0, activeBanks: 0, perBank: {} });
      }
    } catch (e) { 
      console.error(e); 
    } finally {
      setIsWakingServer(false); // Stop loading animation
    }
  };

  // Trigger data load when a user successfully logs in
  useEffect(() => { if (session && !isRecovering) loadData(); }, [session, isRecovering]);

  /**
   * HANDLER: FILE UPLOAD
   * Sends the selected bank statement file to the backend for AI processing.
   */
  const handleUpload = async (event, bankId) => {
    const file = event.target.files[0];
    if (!file || !bankId || !session) return;
    setUploadLoading(true);
    try {
      const result = await uploadBankFile(file, bankId, session.user.id);
      if (result.count === 0) {
          setNotification({ type: 'error', text: 'Data already uploaded' });
      } else {
          setNotification({ type: 'success', text: `Success! Added ${result.count} transactions.` });
          await loadData(); // Refresh data to show the newly extracted records
      }
    } catch (e) { 
      const errorMessage = e.response?.data?.detail || 'Upload failed.';
      setNotification({ type: 'error', text: errorMessage }); 
    }
    finally { 
      setUploadLoading(false); 
      event.target.value = ''; // Reset the file input
      setTimeout(() => setNotification(null), 4000); // Clear notification after 4s
    }
  };

  /**
   * HANDLER: DELETE BANK DATA
   * Wipes all records for a specific bank after user confirmation.
   */
  const handleDeleteBank = async (bank) => {
    if (window.confirm(`Delete all data for ${bank}?`)) {
      await deleteBankData(session.user.id, bank);
      await loadData(); // Refresh UI after deletion
    }
  };

  /**
   * HANDLER: MONTH SELECTION
   * Converts a selected month index into a start and end date range for filtering.
   */
  const handleMonthSelect = (e) => {
    const val = e.target.value;
    setSelectedMonth(val);
    if (val === '') { setDashDateRange({ start: '', end: '' }); return; }
    
    const monthIndex = parseInt(val);
    const year = new Date().getFullYear();
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    
    const formatDate = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    setDashDateRange({ start: formatDate(start), end: formatDate(end) });
  };

  /**
   * HANDLER: FORECAST TIME HORIZON SELECTION
   */
  const handleFcDropdownChange = (e) => {
      const val = e.target.value;
      setFcMode(val);
      if (val !== 'custom') {
          const daysToAdd = parseInt(val);
          const today = new Date();
          const future = new Date();
          future.setDate(today.getDate() + daysToAdd);
          setFcCustomRange({
              start: today.toISOString().split('T')[0],
              end: future.toISOString().split('T')[0]
          });
      }
  };

  const handleFcDateChange = (type, val) => {
      setFcCustomRange(prev => ({ ...prev, [type]: val }));
      setFcMode('custom'); 
  };

  // Calculates the final number of days to forecast based on the selected range
  const finalFcDays = useMemo(() => {
    if (!fcCustomRange.start || !fcCustomRange.end) return 30;
    const start = new Date(fcCustomRange.start);
    const end = new Date(fcCustomRange.end);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 1 ? diffDays : 2; 
  }, [fcCustomRange]);

  /**
   * CORE FILTERING ENGINE (useMemo optimized)
   * Applies all active filters (search, category, bank, dates, type) to the master transaction list.
   * This is highly optimized to handle thousands of records without lagging the UI.
   */
  const filteredTransactions = useMemo(() => {
    let res = [...transactions];
    
    // Determine which Type filter applies based on the active tab
    let currentTypeFilter = 'All amounts';
    if (activeTab === 'transactions') currentTypeFilter = transType;
    else if (activeTab === 'statistics') currentTypeFilter = statsType;
    else if (activeTab === 'balance') currentTypeFilter = 'All amounts'; 

    // Filter by Income/Expenses
    if (currentTypeFilter === 'Expenses') res = res.filter(t => t.amount < 0);
    if (currentTypeFilter === 'Income') res = res.filter(t => t.amount > 0);

    // Filter by Search Query
    if (searchTerm) res = res.filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filter by Category and Bank
    if (catFilter !== 'All') res = res.filter(t => t.category === catFilter);
    if (bankFilter !== 'All') res = res.filter(t => t.bank_name === bankFilter);
    
    // Filter by Date Range
    if (dashDateRange.start) res = res.filter(t => new Date(t.payment_date) >= new Date(dashDateRange.start));
    if (dashDateRange.end) res = res.filter(t => new Date(t.payment_date) <= new Date(dashDateRange.end));
    
    // Apply Sorting Configuration
    res.sort((a, b) => {
      let vA = a[sortConfig.key], vB = b[sortConfig.key];
      if (sortConfig.key === 'payment_date') { vA = new Date(vA).getTime(); vB = new Date(vB).getTime(); }
      if (vA < vB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (vA > vB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return res;
  }, [transactions, searchTerm, catFilter, bankFilter, sortConfig, dashDateRange, activeTab, transType, statsType]);

  // Dynamically calculate the total sum of currently filtered transactions
  const statsTotalAmount = useMemo(() => {
    return filteredTransactions.reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
  }, [filteredTransactions]);

  // Dynamically generate the list of available categories for the dropdown menus
  const dynamicCategories = useMemo(() => {
    let currentTypeFilter = 'All amounts';
    if (activeTab === 'transactions') currentTypeFilter = transType;
    else if (activeTab === 'statistics') currentTypeFilter = statsType;
    else if (activeTab === 'forecasting') currentTypeFilter = fcType;
    else if (activeTab === 'balance') currentTypeFilter = 'All amounts';

    let filteredForCats = transactions;
    if (currentTypeFilter === 'Expenses') filteredForCats = transactions.filter(t => t.amount < 0);
    if (currentTypeFilter === 'Income') filteredForCats = transactions.filter(t => t.amount > 0);

    // Extract unique categories and sort them alphabetically
    return ['All', ...[...new Set(filteredForCats.map(t => t.category))].sort()];
  }, [transactions, activeTab, transType, statsType, fcType]);

  // Configuration for Bank options and Month names
  const availableBanks = ['All', 'EUROBANK', 'PIRAEUS', 'NBG', 'ALPHA'];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Toggle sorting direction (Ascending / Descending)
  const handleSort = (key) => setSortConfig(p => ({ key, direction: p.key === key && p.direction === 'desc' ? 'asc' : 'desc' }));

  // --- RENDER AUTHENTICATION VIEW ---
  // If the user is not logged in, render the Auth component.
  if (!session || isRecovering) {
    return (
      <Auth 
        onLogin={(newSession) => {
          setSession(newSession);
          setIsRecovering(false); 
          window.history.replaceState(null, document.title, window.location.pathname);
        }} 
      />
    );
  }

  // Retrieve user metadata for the profile avatar
  const userInitial = session?.user?.email?.charAt(0).toUpperCase() || 'U';
  const userAvatarUrl = session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture;

  // --- RENDER MAIN DASHBOARD VIEW ---
  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-200 overflow-hidden font-sans relative">
      <GlobalStyles />
      
      {/* Mobile Backdrop for expanded sidebar */}
      <div className={`fixed inset-0 bg-slate-950/20 backdrop-blur-[4px] z-10 transition-opacity duration-300 pointer-events-none ${isNavExpanded ? 'opacity-100' : 'opacity-0'}`} />

      {/* --- DESKTOP SIDEBAR --- */}
      <aside onMouseEnter={() => setIsNavExpanded(true)} onMouseLeave={() => setIsNavExpanded(false)} className={`hidden md:flex bg-slate-900/60 backdrop-blur-2xl border-r border-white/5 transition-all duration-300 flex-col z-20 shadow-2xl ${isNavExpanded ? 'w-64' : 'w-20'}`}>
        {/* Sidebar Header / Logo */}
        <div className="p-6 flex items-center gap-4 border-b border-white/5">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg flex-shrink-0"><Wallet size={20} className="text-white" /></div>
          {isNavExpanded && (
            <div className="flex flex-col animate-in fade-in">
              <span className="text-[13px] font-black tracking-tighter text-white uppercase italic leading-none">AI-EXPENSES</span>
              <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase mt-0.5">Predictor</span>
            </div>
          )}
        </div>

        {/* Sidebar Navigation Links */}
        <nav className="flex-1 px-3 space-y-2 mt-4">
          <SidebarItem active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<HomeIcon size={22} />} label="Home" expanded={isNavExpanded} />
          <SidebarItem active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<LayoutDashboard size={22} />} label="Transactions" expanded={isNavExpanded} />
          <SidebarItem active={activeTab === 'statistics'} onClick={() => setActiveTab('statistics')} icon={<PieChart size={22} />} label="Statistics" expanded={isNavExpanded} />
          <SidebarItem active={activeTab === 'balance'} onClick={() => setActiveTab('balance')} icon={<Scale size={22} />} label="Balance Sheet" expanded={isNavExpanded} />
          <SidebarItem active={activeTab === 'forecasting'} onClick={() => setActiveTab('forecasting')} icon={<TrendingUp size={22} />} label="Forecasting" expanded={isNavExpanded} />
        </nav>
        
        {/* Sidebar Footer / User Profile & Logout */}
        <div className="p-4 border-t border-white/5 flex flex-col gap-2">
            <div className="flex items-center h-12 px-2 transition-all duration-300">
                <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full border border-blue-500/30 flex items-center justify-center shrink-0 overflow-hidden shadow-lg bg-blue-600/10">
                    {userAvatarUrl ? (
                        <img 
                            src={userAvatarUrl} 
                            alt="Profile" 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                                e.target.onerror = null; 
                                e.target.src = `https://ui-avatars.com/api/?name=${userInitial}&background=1e3a8a&color=60a5fa&rounded=true`;
                            }}
                        />
                    ) : (
                        <span className="text-blue-400 font-bold text-base">{userInitial}</span>
                    )}
                </div>
                
                {isNavExpanded && (
                    <div className="flex flex-col min-w-0 ml-3 animate-in fade-in slide-in-from-left-2 duration-300">
                        <span className="text-[11px] text-white font-bold truncate w-32">{session?.user?.email}</span>
                        <span className="text-[8px] text-emerald-400 uppercase tracking-widest font-black flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Online
                        </span>
                    </div>
                )}
            </div>

            <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center h-12 px-3 rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-300 group mt-1">
                <LogOut size={22} className="text-rose-400 group-hover:scale-110 transition-transform shrink-0" />
                {isNavExpanded && <span className="text-[10px] ml-3 text-rose-400 font-bold uppercase tracking-widest whitespace-nowrap animate-in fade-in">Logout</span>}
            </button>
        </div>
      </aside>

      {/* --- MOBILE HEADER --- */}
      <header className="md:hidden flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur-xl border-b border-white/5 z-20 shrink-0">
         <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg"><Wallet size={16} className="text-white" /></div>
             <div className="flex flex-col">
                 <span className="text-xs font-black tracking-tighter text-white uppercase italic leading-none">AI-EXPENSES</span>
                 <span className="text-[8px] font-bold tracking-widest text-blue-400 uppercase mt-0.5">Predictor</span>
             </div>
         </div>
         <div className="flex items-center gap-3">
             <div className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-full border border-blue-500/30 flex items-center justify-center shrink-0 overflow-hidden shadow-lg bg-blue-600/10">
                 {userAvatarUrl ? (
                     <img 
                         src={userAvatarUrl} 
                         alt="Profile" 
                         className="w-full h-full object-cover" 
                         onError={(e) => {
                             e.target.onerror = null; 
                             e.target.src = `https://ui-avatars.com/api/?name=${userInitial}&background=1e3a8a&color=60a5fa&rounded=true`;
                         }}
                     />
                 ) : (
                     <span className="text-blue-400 font-bold text-xs">{userInitial}</span>
                 )}
             </div>
             <button onClick={() => supabase.auth.signOut()} className="text-slate-500 hover:text-rose-400 p-2 rounded-full hover:bg-rose-500/10 transition-colors">
                 <LogOut size={18} />
             </button>
         </div>
      </header>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden overflow-y-auto relative z-0 pb-[70px] md:pb-0 w-full max-w-[100vw]">
        <div className="flex-1 p-4 md:p-8 overflow-x-hidden overflow-y-visible no-scrollbar flex flex-col w-full">
          
          {/* TOP BAR FILTERS (Rendered conditionally based on the active tab) */}
          {activeTab !== 'home' && (
            <div className="mb-4 animate-in fade-in slide-in-from-top-4 duration-500 shrink-0">
              
              {/* Transactions Filters */}
              {activeTab === 'transactions' && (
                  <div className="flex items-center gap-2 md:gap-3 p-1 overflow-x-auto no-scrollbar">
                      <select className="bg-blue-600/20 text-blue-400 font-bold rounded-xl h-9 px-3 text-xs outline-none border border-blue-500/30 shrink-0" onChange={(e) => setTransType(e.target.value)} value={transType}>
                          <option value="All amounts" className="bg-slate-900 text-slate-200">All amounts</option>
                          <option value="Expenses" className="bg-slate-900 text-slate-200">Expenses</option>
                          <option value="Income" className="bg-slate-900 text-slate-200">Income</option>
                      </select>
                      <div className="relative min-w-[150px] md:min-w-[200px]">
                          <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
                          <input type="text" placeholder="Search..." className="w-full bg-slate-900/50 rounded-xl h-9 pl-9 pr-4 text-xs text-slate-200 outline-none border border-white/5 focus:border-blue-500/50 transition-all" onChange={(e) => setSearchTerm(e.target.value)} value={searchTerm}/>
                      </div>
                      <select className="bg-slate-900/50 rounded-xl h-9 px-3 text-xs text-slate-400 outline-none border border-white/5 shrink-0" onChange={(e) => setBankFilter(e.target.value)} value={bankFilter}>
                          {availableBanks.map(b => <option key={b} value={b} className="bg-slate-900">{b === 'All' ? 'All Banks' : b}</option>)}
                      </select>
                      <select className="bg-slate-900/50 rounded-xl h-9 px-3 text-xs text-slate-400 outline-none border border-white/5 shrink-0" onChange={(e) => setCatFilter(e.target.value)} value={catFilter}>
                          {dynamicCategories.map(c => <option key={c} value={c} className="bg-slate-900">{c === 'All' ? 'All Categories' : c}</option>)}
                      </select>
                      <div className="relative shrink-0">
                          <Calendar size={14} className="absolute left-3 top-2.5 text-slate-500 pointer-events-none"/>
                          <select className="bg-slate-900/50 rounded-xl h-9 pl-9 pr-3 text-xs text-slate-400 outline-none border border-white/5 appearance-none" onChange={handleMonthSelect} value={selectedMonth}>
                              <option value="">Month</option>
                              {months.map((m, i) => <option key={m} value={i} className="bg-slate-900">{m}</option>)}
                          </select>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-900/50 h-9 px-3 rounded-xl border border-white/5 shrink-0">
                          <input type="date" className="bg-transparent text-[10px] text-slate-400 outline-none [color-scheme:dark]" value={dashDateRange.start} onChange={(e) => setDashDateRange({...dashDateRange, start: e.target.value})} />
                          <span className="text-slate-600 text-[10px] font-bold">-</span>
                          <input type="date" className="bg-transparent text-[10px] text-slate-400 outline-none [color-scheme:dark]" value={dashDateRange.end} onChange={(e) => setDashDateRange({...dashDateRange, end: e.target.value})} />
                      </div>
                  </div>
              )}

              {/* Statistics Filters */}
              {activeTab === 'statistics' && (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full h-full">
                      <div className="flex items-center gap-2 md:gap-3 p-1 overflow-x-auto no-scrollbar w-full md:w-auto">
                          <select className="bg-blue-600/20 text-blue-400 font-bold rounded-xl h-9 px-3 text-xs outline-none border border-blue-500/30 shrink-0" onChange={(e) => setStatsType(e.target.value)} value={statsType}>
                              <option value="Expenses" className="bg-slate-900 text-slate-200">Expenses</option>
                              <option value="Income" className="bg-slate-900 text-slate-200">Income</option>
                          </select>
                          <select className="bg-slate-900/50 rounded-xl h-9 px-3 text-xs text-slate-400 outline-none border border-white/5 shrink-0" onChange={(e) => setBankFilter(e.target.value)} value={bankFilter}>
                              {availableBanks.map(b => <option key={b} value={b} className="bg-slate-900">{b === 'All' ? 'All Banks' : b}</option>)}
                          </select>
                          <select className="bg-slate-900/50 rounded-xl h-9 px-3 text-xs text-slate-400 outline-none border border-white/5 shrink-0" onChange={(e) => setCatFilter(e.target.value)} value={catFilter}>
                              {dynamicCategories.map(c => <option key={c} value={c} className="bg-slate-900">{c === 'All' ? 'All Categories' : c}</option>)}
                          </select>
                          <div className="relative shrink-0">
                              <Calendar size={14} className="absolute left-3 top-2.5 text-slate-500 pointer-events-none"/>
                              <select className="bg-slate-900/50 rounded-xl h-9 pl-9 pr-3 text-xs text-slate-400 outline-none border border-white/5 appearance-none" onChange={handleMonthSelect} value={selectedMonth}>
                                  <option value="">Month</option>
                                  {months.map((m, i) => <option key={m} value={i} className="bg-slate-900">{m}</option>)}
                              </select>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-900/50 h-9 px-3 rounded-xl border border-white/5 shrink-0">
                              <input type="date" className="bg-transparent text-[10px] text-slate-400 outline-none [color-scheme:dark]" value={dashDateRange.start} onChange={(e) => setDashDateRange({...dashDateRange, start: e.target.value})} />
                              <span className="text-slate-600 text-[10px] font-bold">-</span>
                              <input type="date" className="bg-transparent text-[10px] text-slate-400 outline-none [color-scheme:dark]" value={dashDateRange.end} onChange={(e) => setDashDateRange({...dashDateRange, end: e.target.value})} />
                          </div>
                      </div>

                      {/* Statistics Summary Card */}
                      <div className={`bg-gradient-to-r ${statsType === 'Income' ? 'from-emerald-900/20' : 'from-rose-900/20'} to-slate-900 border border-white/10 rounded-[20px] px-6 py-2 flex items-center justify-between gap-4 shadow-xl shrink-0`}>
                          <div className={`${statsType === 'Income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'} p-2 rounded-xl`}><Wallet size={20} /></div>
                          <div className="flex flex-col items-end leading-tight">
                              <span className="text-xl font-mono font-bold text-white tracking-tight">
                                  {statsTotalAmount.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </span>
                              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                                  {statsType === 'Income' ? 'TOTAL INCOME' : 'TOTAL EXPENSES'}
                              </span>
                          </div>
                      </div>
                  </div>
              )}

              {/* Balance Sheet Filters */}
              {activeTab === 'balance' && (
                  <div className="flex items-center gap-2 md:gap-3 p-1 overflow-x-auto no-scrollbar">
                      <select className="bg-slate-900/50 rounded-xl h-9 px-3 text-xs text-slate-400 outline-none border border-white/5 shrink-0" onChange={(e) => setBankFilter(e.target.value)} value={bankFilter}>
                          {availableBanks.map(b => <option key={b} value={b} className="bg-slate-900">{b === 'All' ? 'All Banks' : b}</option>)}
                      </select>
                      <div className="relative shrink-0">
                          <Calendar size={14} className="absolute left-3 top-2.5 text-slate-500 pointer-events-none"/>
                          <select className="bg-slate-900/50 rounded-xl h-9 pl-9 pr-3 text-xs text-slate-400 outline-none border border-white/5 appearance-none" onChange={handleMonthSelect} value={selectedMonth}>
                              <option value="">Month</option>
                              {months.map((m, i) => <option key={m} value={i} className="bg-slate-900">{m}</option>)}
                          </select>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-900/50 h-9 px-3 rounded-xl border border-white/5 shrink-0">
                          <input type="date" className="bg-transparent text-[10px] text-slate-400 outline-none [color-scheme:dark]" value={dashDateRange.start} onChange={(e) => setDashDateRange({...dashDateRange, start: e.target.value})} />
                          <span className="text-slate-600 text-[10px] font-bold">-</span>
                          <input type="date" className="bg-transparent text-[10px] text-slate-400 outline-none [color-scheme:dark]" value={dashDateRange.end} onChange={(e) => setDashDateRange({...dashDateRange, end: e.target.value})} />
                      </div>
                  </div>
              )}

              {/* Forecasting Filters */}
              {activeTab === 'forecasting' && (
                  <div className="flex items-center gap-2 md:gap-3 p-1 overflow-x-auto no-scrollbar">
                      <select className="bg-blue-600/20 text-blue-400 font-bold rounded-xl h-9 px-3 text-xs outline-none border border-blue-500/30 shrink-0" onChange={(e) => setFcType(e.target.value)} value={fcType}>
                          <option value="Expenses" className="bg-slate-900 text-slate-200">Expenses</option>
                          <option value="Income" className="bg-slate-900 text-slate-200">Income</option>
                      </select>
                      <select className="bg-slate-900/50 rounded-xl h-9 px-3 text-xs text-slate-400 outline-none border border-white/5 shrink-0" onChange={(e) => setFcBankFilter(e.target.value)} value={fcBankFilter}>
                          {availableBanks.map(b => <option key={b} value={b} className="bg-slate-900 text-slate-200">{b === 'All' ? 'All Banks' : b}</option>)}
                      </select>
                      <select className="bg-slate-900/50 rounded-xl h-9 px-3 text-xs text-slate-400 outline-none border border-white/5 shrink-0" onChange={(e) => setFcCatFilter(e.target.value)} value={fcCatFilter}>
                          {dynamicCategories.map(c => <option key={c} value={c} className="bg-slate-900 text-slate-200">{c === 'All' ? 'All Categories' : c}</option>)}
                      </select>
                      <select className="bg-slate-900/50 rounded-xl h-9 px-3 text-xs text-slate-400 outline-none border border-white/5 shrink-0" onChange={handleFcDropdownChange} value={fcMode}>
                          <option value="30">1 Month</option>
                          <option value="60">2 Months</option>
                          <option value="90">3 Months</option>
                          <option value="180">6 Months</option>
                          <option value="custom">Custom</option>
                      </select>
                      <div className="flex items-center gap-2 bg-slate-900/50 h-9 px-3 rounded-xl border border-white/5 shrink-0 animate-in fade-in slide-in-from-left-2">
                          <Clock size={14} className="text-slate-500 ml-1"/>
                          <input type="date" className="bg-transparent text-[10px] text-slate-400 outline-none [color-scheme:dark]" value={fcCustomRange.start} onChange={(e) => handleFcDateChange('start', e.target.value)} />
                          <span className="text-slate-600 font-bold">-</span>
                          <input type="date" className="bg-transparent text-[10px] text-slate-400 outline-none [color-scheme:dark]" value={fcCustomRange.end} onChange={(e) => handleFcDateChange('end', e.target.value)} />
                      </div>
                  </div>
              )}
            </div>
          )}

          {/* TAB CONTENT ROUTING */}
          <div className="flex-1 overflow-x-hidden overflow-y-visible flex flex-col w-full">
              {activeTab === 'home' ? (
                 <Home userEmail={session.user.email} />
              ) : activeTab === 'transactions' ? (
                // Passing the data to the Transactions table component
                <Transactions 
                  transactions={filteredTransactions} 
                  allTransactions={transactions}
                  onSort={handleSort}
                  stats={stats}
                  onUpload={handleUpload}
                  onDeleteBank={handleDeleteBank}
                  uploadLoading={uploadLoading}
                  notification={notification}
                  isWakingServer={isWakingServer} 
                  onCategoryUpdated={loadData}
                />
              ) : activeTab === 'statistics' ? (
                <div className="h-full w-full overflow-hidden">
                  <Statistics transactions={filteredTransactions} typeFilter={statsType} />
                </div>
              ) : activeTab === 'balance' ? (
                <div className="h-full w-full overflow-hidden">
                   <BalanceSheet transactions={filteredTransactions} />
                </div>
              ) : (
                 <div className="h-full w-full overflow-hidden">
                    {session && <Forecasting 
                        userId={session.user.id} 
                        bankFilter={fcBankFilter} 
                        categoryFilter={fcCatFilter}
                        days={finalFcDays}
                        typeFilter={fcType}
                    />}
                 </div>
              )}
          </div>

        </div>
      </main>

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[70px] bg-slate-900/95 backdrop-blur-2xl border-t border-white/10 flex items-center justify-around z-50 px-2 pb-safe">
          <MobileNavItem active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<HomeIcon size={20} />} label="Home" />
          <MobileNavItem active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<LayoutDashboard size={20} />} label="Data" />
          <MobileNavItem active={activeTab === 'balance'} onClick={() => setActiveTab('balance')} icon={<Scale size={20} />} label="Balance" />
          <MobileNavItem active={activeTab === 'statistics'} onClick={() => setActiveTab('statistics')} icon={<PieChart size={20} />} label="Stats" />
          <MobileNavItem active={activeTab === 'forecasting'} onClick={() => setActiveTab('forecasting')} icon={<TrendingUp size={20} />} label="Forecast" />
      </nav>

    </div>
  );
}

/**
 * REUSABLE COMPONENT: Desktop Sidebar Item
 */
function SidebarItem({ active, onClick, icon, label, expanded }) {
  return (
    <button 
      onClick={onClick} 
      className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-300 ${
        active 
          ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.7)]' 
          : 'text-slate-500 hover:bg-slate-800 hover:text-blue-300 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:-translate-y-0.5'
      }`}
    >
      {icon}
      {expanded && <span className="font-medium text-sm animate-in fade-in">{label}</span>}
    </button>
  );
}

/**
 * REUSABLE COMPONENT: Mobile Bottom Navigation Item
 */
function MobileNavItem({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center justify-center w-16 h-12 gap-1 rounded-xl transition-all ${
        active ? 'text-blue-400' : 'text-slate-500'
      }`}
    >
      <div className={`${active ? 'scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'scale-100'} transition-transform duration-300`}>
        {icon}
      </div>
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </button>
  );
}

export default App;
import React, { useRef, useState, useMemo } from 'react';
import { ArrowUpDown, Upload, Loader2, Database, Layers, Building2, X, List, PlusCircle, Check, Search } from 'lucide-react';
import { updateTransactionCategory } from '../api/api'; 

const Transactions = ({ 
  transactions,
  allTransactions, // <-- ΝΕΟ: Παίρνει ΟΛΕΣ τις συναλλαγές, χωρίς φίλτρα
  onSort, 
  stats, 
  onUpload, 
  onDeleteBank, 
  uploadLoading, 
  notification,
  isWakingServer,
  onCategoryUpdated
}) => {
  const [isImportHovered, setIsImportHovered] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const fileInputRef = useRef(null);

  const [editingTx, setEditingTx] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [mode, setMode] = useState('select'); 

  const banks = [
    { id: 'PIRAEUS', name: 'Piraeus Bank', logo: '/logos/WINBANK.png', color: 'border-yellow-500/30 hover:border-yellow-500' },
    { id: 'ALPHA', name: 'Alpha Bank', logo: '/logos/ALPHA.svg', color: 'border-blue-600/30 hover:border-blue-600' },
    { id: 'EUROBANK', name: 'EUROBANK', logo: '/logos/EUROBANK.jpg', color: 'border-red-600/30 hover:border-red-600' },
    { id: 'NBG', name: 'National Bank', logo: '/logos/NBG.jpg', color: 'border-emerald-600/30 hover:border-emerald-600' }
  ];

  const getBankStyle = (bankName) => {
    const n = bankName.toUpperCase();
    if (n.includes('PIRAEUS')) return { text: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' };
    if (n.includes('EUROBANK')) return { text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' };
    if (n.includes('NBG')) return { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' };
    return { text: 'text-slate-300', bg: 'bg-slate-700/50', border: 'border-slate-600/20' };
  };

  const handleBankClick = (id) => { 
    setSelectedBankId(id); 
    if (fileInputRef.current) fileInputRef.current.click(); 
  };

  const handleInternalFileChange = (event) => {
    if (selectedBankId) {
        onUpload(event, selectedBankId);
    }
    setSelectedBankId(null);
  };

  const baseExpenseCategories = ['SUPERMARKET', 'BILLS', 'ENTERTAINMENT', 'FOOD & COFFEE', 'TRANSPORT', 'RENT', 'HEALTH', 'SHOPPING', 'SERVICES', 'CASH'];
  const baseIncomeCategories = ['INCOME', 'SALARY', 'DEPOSIT', 'REFUND'];
  
  // --- ΕΔΩ ΕΓΙΝΕ Η ΔΙΟΡΘΩΣΗ ΓΙΑ ΝΑ ΒΛΕΠΕΙΣ ΠΑΝΤΑ ΟΛΕΣ ΤΙΣ ΚΑΤΗΓΟΡΙΕΣ ---
  const allExistingCategories = useMemo(() => {
    if (!editingTx) return [];
    
    const isIncome = editingTx.amount > 0;
    const baseCategories = isIncome ? baseIncomeCategories : baseExpenseCategories;
    
    // Χρησιμοποιούμε την πλήρη λίστα (allTransactions) αντί για τη φιλτραρισμένη!
    const sourceData = (allTransactions && allTransactions.length > 0) ? allTransactions : transactions;

    const dynamicCats = Array.from(new Set(
      sourceData
        .filter(t => isIncome ? t.amount > 0 : t.amount < 0)
        .map(t => t.category)
    ));
    
    const combined = [...baseCategories, ...dynamicCats];
    return Array.from(new Set(combined))
      .filter(c => c !== 'Pending' && c !== 'Uncategorized' && c !== 'UNCATEGORIZED' && c !== 'Review Needed' && c !== 'INCOME')
      .sort();
  }, [allTransactions, transactions, editingTx]);

  const filteredCategories = useMemo(() => {
    return allExistingCategories.filter(cat => 
      cat.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allExistingCategories, searchTerm]);

  const handleUpdateCategory = async () => {
    const finalCategory = mode === 'add' ? customCategory : selectedCategory;
    if (!finalCategory || !finalCategory.trim()) return;

    setIsUpdating(true);
    try {
      await updateTransactionCategory(editingTx.id, finalCategory.trim().toUpperCase());
      
      editingTx.category = finalCategory.trim().toUpperCase();
      setEditingTx(null);
      setCustomCategory('');
      setSelectedCategory('');
      setSearchTerm('');

      if (onCategoryUpdated) {
        onCategoryUpdated();
      }

    } catch (error) {
      alert("Update failed. Check console for details.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col animate-in fade-in duration-500 overflow-y-auto lg:overflow-hidden custom-scrollbar pr-2 lg:pr-4 pb-[100px] lg:pb-0 relative">
      <input type="file" ref={fileInputRef} onChange={handleInternalFileChange} className="hidden" accept=".csv, .xlsx" />

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-auto lg:h-full w-full">
        {/* Αριστερή Στήλη: Πίνακας Συναλλαγών */}
        <section className="w-full flex-none lg:flex-1 min-w-0 bg-white/5 backdrop-blur-sm rounded-[24px] md:rounded-[32px] border border-white/10 flex flex-col overflow-hidden shadow-2xl h-[320px] lg:h-full shrink-0 relative">
          <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar relative">
            <table className="w-full min-w-[500px] border-collapse relative h-full">
              <thead className="bg-slate-950/80 text-slate-500 text-[9px] uppercase tracking-widest sticky top-0 z-10 backdrop-blur-xl border-b border-white/5">
                <tr>
                  <th className="p-3 md:p-5 cursor-pointer hover:text-blue-400 text-center whitespace-nowrap" onClick={() => onSort('payment_date')}>Date <ArrowUpDown size={10} className="inline"/></th>
                  <th className="p-3 md:p-5 cursor-pointer hover:text-blue-400 text-center" onClick={() => onSort('description')}>Description <ArrowUpDown size={10} className="inline"/></th>
                  <th className="p-3 md:p-5 cursor-pointer hover:text-blue-400 text-center whitespace-nowrap" onClick={() => onSort('amount')}>Amount <ArrowUpDown size={10} className="inline"/></th>
                  <th className="p-3 md:p-5 text-center font-bold">Category</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-white/5 text-center text-[10px] md:text-[11px] relative h-full">
                {isWakingServer ? (
                  <tr>
                    <td colSpan="4" className="p-12 md:p-20">
                      <div className="flex flex-col items-center justify-center animate-in fade-in duration-500">
                        <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
                        <h2 className="text-sm md:text-base font-black text-white uppercase tracking-widest mb-2">Waking AI Server</h2>
                        <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest animate-pulse max-w-sm mx-auto leading-relaxed">
                          The neural engine is booting up. This might take up to <span className="text-blue-400">50 seconds</span>. Please hold on...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : transactions.length > 0 ? (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-blue-500/5 transition-all group">
                      <td className="p-3 md:p-5 text-slate-500 whitespace-nowrap">{new Date(t.payment_date).toLocaleDateString()}</td>
                      <td className="p-3 md:p-5 text-slate-300 uppercase font-bold text-[10px]">
                          <div className="truncate max-w-[150px] md:max-w-[200px] mx-auto text-center">{t.description}</div>
                      </td>
                      <td className={`p-3 md:p-5 font-mono font-bold whitespace-nowrap ${t.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{t.amount.toFixed(2)} €</td>
                      <td className="p-3 md:p-5">
                          <div className="flex justify-center">
                            <button 
                              onClick={() => {
                                setEditingTx(t);
                                setMode('select');
                                setSelectedCategory(''); 
                                setSearchTerm('');
                              }}
                              className={`px-3 py-1 rounded-xl text-[9px] md:text-[10px] font-bold uppercase whitespace-nowrap transition-all duration-300 hover:ring-2 hover:ring-blue-500 hover:scale-105 shadow-lg ${
                                t.category === 'Pending' || t.category === 'Uncategorized' || t.category === 'UNCATEGORIZED'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}
                            >
                              {t.category} <span className="opacity-50 ml-1">✎</span>
                            </button>
                          </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-12 md:p-20 text-center">
                      <p className="text-slate-500 text-[10px] md:text-xs uppercase font-bold tracking-widest">No transactions found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Δεξιά Στήλη: Upload & Stats */}
        <section className="w-full lg:w-[280px] xl:w-[320px] flex flex-col gap-4 lg:gap-6 shrink-0 h-auto lg:h-full">
          <div onMouseEnter={() => setIsImportHovered(true)} onMouseLeave={() => setIsImportHovered(false)} className="bg-blue-600/[0.03] border border-white/5 rounded-[24px] md:rounded-[32px] flex flex-col h-[200px] lg:h-[35%] relative overflow-hidden transition-all duration-500 shadow-2xl group cursor-default shrink-0">
            <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all ${isImportHovered || uploadLoading ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
              <div className="bg-blue-600 p-3 md:p-4 rounded-2xl mb-2 md:mb-4 shadow-lg"><Upload className="text-white w-5 h-5 md:w-6 md:h-6" /></div>
              <div className="text-center"><h4 className="text-xs md:text-sm font-black text-white uppercase italic">Import History</h4></div>
              {notification && <div className={`mt-2 text-[10px] font-bold ${notification.type==='success'?'text-emerald-400':'text-rose-400'}`}>{notification.text}</div>}
            </div>
            <div className={`absolute inset-0 p-3 md:p-4 flex flex-col transition-all ${isImportHovered || uploadLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
              {uploadLoading ? (<div className="flex-1 flex flex-col items-center justify-center gap-2 md:gap-3"><Loader2 className="w-6 h-6 md:w-8 md:h-8 text-blue-500 animate-spin"/><p className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 animate-pulse">Syncing...</p></div>) : (
                <div className="flex flex-col gap-2 overflow-y-auto pb-2 custom-scrollbar">
                  {banks.map((b) => (<button key={b.id} onClick={() => handleBankClick(b.id)} className={`w-full flex items-center gap-2 md:gap-3 p-2 bg-white/[0.03] hover:bg-blue-600/20 border border-white/5 rounded-xl md:rounded-2xl transition-all ${b.color}`}><div className="w-8 h-8 md:w-11 md:h-11 rounded-lg md:rounded-xl bg-white flex-shrink-0"><img src={b.logo} className="w-full h-full object-contain" /></div><span className="text-[9px] md:text-[10px] font-black text-slate-200 uppercase">{b.name}</span></button>))}
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white/[0.02] border border-white/5 rounded-[24px] md:rounded-[32px] p-4 md:p-6 flex-1 shadow-xl flex flex-col relative overflow-hidden min-h-[250px] shrink-0">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03]"><Database size={80} className="md:w-[100px] md:h-[100px]" /></div>
            <h4 className="text-[9px] md:text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-3 md:mb-4 flex items-center gap-2 flex-shrink-0"><Database size={12}/> Neural Sync</h4>
            <div className="space-y-3 md:space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1">
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/[0.03] p-2 md:p-3 rounded-xl border border-white/5 flex flex-col gap-1 md:gap-2 hover:bg-white/10 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-1 md:gap-2"><Layers size={12} className="text-blue-400 md:w-[14px] md:h-[14px]"/><span className="text-[8px] md:text-[9px] text-slate-500 uppercase font-bold group-hover:text-blue-300">Records</span></div>
                        <div className="font-mono font-bold text-white text-md md:text-lg">{stats.totalRecords}</div>
                    </div>
                    <div className="bg-white/[0.03] p-2 md:p-3 rounded-xl border border-white/5 flex flex-col gap-1 md:gap-2 hover:bg-white/10 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-1 md:gap-2"><Building2 size={12} className="text-emerald-400 md:w-[14px] md:h-[14px]"/><span className="text-[8px] md:text-[9px] text-slate-500 uppercase font-bold group-hover:text-emerald-300">Sources</span></div>
                        <div className="font-mono font-bold text-white text-md md:text-lg">{stats.activeBanks}</div>
                    </div>
                </div>
                <div className="border-t border-white/5 pt-3 md:pt-4">
                    <p className="text-[8px] md:text-[9px] text-slate-500 uppercase font-bold mb-2 md:mb-3 tracking-wider">Breakdown</p>
                    {Object.entries(stats.perBank).map(([bank, count]) => {
                        const style = getBankStyle(bank);
                        return (
                            <div key={bank} className={`flex justify-between items-center text-[9px] md:text-[10px] mb-2 p-1.5 md:p-2 rounded-lg border group ${style.bg} ${style.border} hover:bg-white/10 transition-all cursor-default`}>
                                <span className={`font-bold ${style.text}`}>{bank}</span>
                                <div className="flex items-center gap-2 md:gap-3">
                                    <span className="font-mono text-white opacity-80">{count}</span>
                                    <button onClick={() => onDeleteBank(bank)} className="opacity-0 group-hover:opacity-100 text-rose-500 transition-all p-1"><X size={10} className="md:w-[12px] md:h-[12px]"/></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
          </div>
        </section>
      </div>

      {/* Pop-up Αλλαγής Κατηγορίας */}
      {editingTx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 w-full max-w-sm rounded-[24px] md:rounded-[32px] border border-blue-500/20 shadow-[0_0_80px_rgba(37,99,235,0.1)] p-5 md:p-6 flex flex-col max-h-[85vh] relative overflow-hidden">
            
            <div className="absolute top-0 right-0 p-3 md:p-4">
              <button onClick={() => setEditingTx(null)} className="text-slate-500 hover:text-white transition-colors bg-white/5 rounded-full p-2 hover:bg-rose-500/20">
                <X size={18} />
              </button>
            </div>

            <h3 className="text-lg md:text-xl font-bold text-white mb-4 md:mb-6 tracking-tight flex items-center gap-2 md:gap-3">
              <span className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-600/30"><Layers size={16} className="text-white"/></span>
              Update Category
            </h3>
            
            <div className="bg-white/5 border border-white/5 p-3 md:p-4 rounded-xl md:rounded-2xl mb-4 md:mb-6 flex-shrink-0 backdrop-blur-md">
              <p className="text-slate-500 text-[8px] md:text-[9px] mb-1 uppercase tracking-widest font-black">Details</p>
              <p className="text-white text-[11px] md:text-xs font-bold mb-1 md:mb-2 truncate uppercase">{editingTx.description}</p>
              <p className={`font-mono font-black text-base md:text-lg ${editingTx.amount < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                {editingTx.amount.toFixed(2)} €
              </p>
            </div>

            <div className="flex p-1 bg-slate-950/50 rounded-xl md:rounded-2xl mb-4 border border-white/5 flex-shrink-0">
              <button onClick={() => { setMode('select'); setSearchTerm(''); }} className={`flex-1 flex items-center justify-center gap-2 py-2 md:py-3 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black transition-all ${mode === 'select' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                <List size={14} /> SELECT
              </button>
              <button onClick={() => { setMode('add'); setCustomCategory(''); }} className={`flex-1 flex items-center justify-center gap-2 py-2 md:py-3 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black transition-all ${mode === 'add' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                <PlusCircle size={14} /> ADD NEW
              </button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              {mode === 'select' ? (
                <div className="flex flex-col h-full animate-in slide-in-from-left-2 duration-300 overflow-hidden">
                  <div className="relative mb-3 flex-shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search categories..." className="w-full bg-slate-950/50 text-white border border-white/5 rounded-xl pl-9 pr-4 py-2 md:py-2.5 text-[10px] md:text-[11px] outline-none focus:border-blue-500/30 transition-all uppercase placeholder:normal-case shadow-inner font-bold" />
                  </div>
                  <div className="h-[180px] md:h-[220px] overflow-y-auto custom-scrollbar pr-1 border border-white/5 rounded-xl bg-slate-950/30">
                    <div className="grid grid-cols-1 gap-1 p-1 md:p-1.5">
                      {filteredCategories.length > 0 ? (
                        filteredCategories.map(cat => (
                          <button key={cat} onClick={() => setSelectedCategory(cat)} className={`w-full text-left p-3 md:p-3.5 rounded-lg border text-[9px] md:text-[10px] font-black transition-all flex items-center justify-between uppercase group ${selectedCategory === cat ? 'bg-blue-600/20 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5'}`}>
                            <span className="truncate">{cat}</span>
                            {selectedCategory === cat && <Check size={14} className="flex-shrink-0 text-blue-400" />}
                          </button>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 md:py-12 opacity-20">
                          <Search size={20} className="mb-2" />
                          <p className="text-[9px] uppercase font-bold tracking-widest">No results</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="animate-in slide-in-from-right-2 duration-300">
                  <label className="block text-slate-500 text-[8px] md:text-[9px] uppercase font-black tracking-widest mb-2 md:mb-3">Custom Label Name</label>
                  <input type="text" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="e.g. GYM, RENT, TAXES..." className="w-full bg-slate-950 text-white border border-blue-500/30 rounded-xl p-3 md:p-4 text-xs md:text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all uppercase shadow-inner font-bold" autoFocus />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 md:gap-3 mt-4 pt-4 md:pt-6 border-t border-white/5 flex-shrink-0">
              <button onClick={() => setEditingTx(null)} className="px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-[9px] md:text-[10px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-widest">Cancel</button>
              <button 
                onClick={handleUpdateCategory} 
                disabled={isUpdating || (mode === 'select' && !selectedCategory) || (mode === 'add' && !customCategory.trim())}
                className="flex items-center gap-2 px-6 md:px-8 py-2 md:py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[9px] md:text-[10px] font-black rounded-xl shadow-lg shadow-blue-600/20 transition-all uppercase tracking-widest"
              >
                {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
                {isUpdating ? 'Training...' : 'Save & Train'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
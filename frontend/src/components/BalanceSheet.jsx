import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Scale, TrendingUp, TrendingDown, Landmark } from 'lucide-react';

/**
 * BALANCE SHEET COMPONENT
 * Calculates and visualizes overall financial health, comparing Income vs Expenses over time.
 * Utilizes Recharts for an interactive, modern Bar Chart.
 */
const BalanceSheet = ({ transactions }) => {
  
  /**
   * MEMOIZED TOTALS CALCULATION
   * Dynamically sums up all Income (amount > 0) and Expenses (amount < 0) 
   * to calculate the Net Balance. Recalculates only when 'transactions' change.
   */
  const totals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    transactions.forEach(t => {
      if (t.amount > 0) income += t.amount;
      else if (t.amount < 0) expenses += Math.abs(t.amount);
    });
    return { income, expenses, net: income - expenses };
  }, [transactions]);

  /**
   * MEMOIZED TIME-SERIES DATA PREPARATION
   * Aggregates daily transactions into monthly buckets (e.g., "Oct 2023") 
   * formatted specifically for the Recharts BarChart component.
   */
  const monthlyData = useMemo(() => {
    const months = {};
    transactions.forEach(t => {
      const date = new Date(t.payment_date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      // Initialize month bucket if it doesn't exist
      if (!months[monthYear]) {
        months[monthYear] = { monthYear, label, Income: 0, Expenses: 0 };
      }
      
      // Separate income and expenses
      if (t.amount > 0) {
        months[monthYear].Income += t.amount;
      } else if (t.amount < 0) {
        months[monthYear].Expenses += Math.abs(t.amount); // Make positive for chart rendering
      }
    });

    // Convert object to array and sort chronologically
    return Object.values(months).sort((a, b) => a.monthYear.localeCompare(b.monthYear));
  }, [transactions]);

  // Extracts the earliest and latest dates from the dataset for the UI badge
  const dateRangeDisplay = useMemo(() => {
    if (!transactions || transactions.length === 0) return 'No data';
    const dates = transactions.map(t => new Date(t.payment_date).getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    return `${minDate.toLocaleDateString('en-GB')} - ${maxDate.toLocaleDateString('en-GB')}`;
  }, [transactions]);

  // Color constants for UI consistency
  const neonGreen = '#00c48c';
  const neonRed = '#eb3b5a';

  return (
    <div className="w-full h-full flex flex-col space-y-4 lg:space-y-6 animate-in fade-in duration-500 overflow-y-auto lg:overflow-hidden custom-scrollbar pr-2 lg:pr-4 pb-[100px] lg:pb-0">
      
      {/* --- TOP SUMMARY CARDS (Income, Expenses, Net) --- */}
      <div className="flex flex-col md:flex-row gap-4 shrink-0">
        
        {/* Total Income Card */}
        <div className="flex-1 bg-gradient-to-br from-[#00c48c]/10 to-slate-900 border border-[#00c48c]/30 rounded-[24px] p-6 shadow-[0_0_15px_rgba(0,196,140,0.1)] relative overflow-hidden flex items-center justify-between group">
            <div className="absolute -right-4 -top-4 opacity-[0.05] group-hover:scale-110 transition-transform"><TrendingUp size={120} className="text-[#00c48c]" /></div>
            <div>
                <p className="text-[10px] text-[#00c48c]/70 uppercase tracking-[0.2em] font-bold mb-1">Total Income</p>
                <h3 className="text-2xl md:text-3xl font-mono font-black text-[#00c48c] drop-shadow-[0_0_8px_rgba(0,196,140,0.6)]">{totals.income.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</h3>
            </div>
            <div className="bg-[#00c48c]/20 p-3 rounded-2xl"><TrendingUp size={24} className="text-[#00c48c] drop-shadow-[0_0_5px_rgba(0,196,140,0.8)]" /></div>
        </div>

        {/* Total Expenses Card */}
        <div className="flex-1 bg-gradient-to-br from-[#eb3b5a]/10 to-slate-900 border border-[#eb3b5a]/30 rounded-[24px] p-6 shadow-[0_0_15px_rgba(235,59,90,0.1)] relative overflow-hidden flex items-center justify-between group">
            <div className="absolute -right-4 -top-4 opacity-[0.05] group-hover:scale-110 transition-transform"><TrendingDown size={120} className="text-[#eb3b5a]" /></div>
            <div>
                <p className="text-[10px] text-[#eb3b5a]/70 uppercase tracking-[0.2em] font-bold mb-1">Total Expenses</p>
                <h3 className="text-2xl md:text-3xl font-mono font-black text-[#eb3b5a] drop-shadow-[0_0_8px_rgba(235,59,90,0.6)]">{totals.expenses.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</h3>
            </div>
            <div className="bg-[#eb3b5a]/20 p-3 rounded-2xl"><TrendingDown size={24} className="text-[#eb3b5a] drop-shadow-[0_0_5px_rgba(235,59,90,0.8)]" /></div>
        </div>

        {/* Net Balance Card */}
        <div className="flex-1 bg-gradient-to-br from-blue-900/20 to-slate-900 border border-blue-500/30 rounded-[24px] p-6 shadow-[0_0_15px_rgba(59,130,246,0.15)] relative overflow-hidden flex items-center justify-between group">
            <div className="absolute -right-4 -top-4 opacity-[0.05] group-hover:scale-110 transition-transform"><Landmark size={120} className="text-blue-500" /></div>
            <div>
                <p className="text-[10px] text-blue-400/70 uppercase tracking-[0.2em] font-bold mb-1">Net Balance</p>
                <h3 className="text-2xl md:text-3xl font-mono font-black text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]">
                    {totals.net.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </h3>
            </div>
            <div className="bg-blue-500/20 p-3 rounded-2xl">
                <Scale size={24} className="text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]" />
            </div>
        </div>
      </div>

      {/* --- VISUALIZATION AREA --- */}
      <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-[32px] p-4 md:p-8 shadow-2xl relative flex flex-col min-h-[400px] lg:min-h-0">
          
          {/* Chart Header & Trend Badge */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 shrink-0 gap-4">
              <h3 className="text-[10px] md:text-xs font-bold text-white uppercase tracking-widest text-center md:text-left">
                  Cash Flow Comparison
              </h3>
              <div className="flex items-center gap-3">
                 <p className="text-[9px] md:text-[10px] text-slate-400 font-mono bg-slate-900/50 px-3 py-1.5 rounded-lg border border-white/10 shadow-inner">
                     {dateRangeDisplay}
                 </p>
                 <div className={`flex items-center gap-1.5 text-[9px] font-black px-3 py-1.5 rounded-full bg-slate-900/80 border shadow-lg ${totals.net >= 0 ? 'text-[#00c48c] border-[#00c48c]/50 drop-shadow-[0_0_8px_rgba(0,196,140,0.6)]' : 'text-[#eb3b5a] border-[#eb3b5a]/50 drop-shadow-[0_0_8px_rgba(235,59,90,0.6)]'}`}>
                    {totals.net >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                    {totals.net >= 0 ? 'POSITIVE BALANCE' : 'NEGATIVE BALANCE'}
                </div>
              </div>
          </div>

          {/* Recharts Bar Chart Container */}
          <div className="flex-1 w-full min-h-0">
              {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" stroke="#334155" vertical={true} horizontal={true} opacity={0.6} />
                        <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val}€`} />
                        
                        {/* Custom Tooltip Styling to match the Dark Theme */}
                        <Tooltip 
                            cursor={{ fill: 'rgba(255,255,255,0.15)' }} 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} 
                            itemStyle={{ fontWeight: 'bold' }}
                            formatter={(value) => [`${value.toFixed(2)} €`, undefined]} 
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '10px' }} />
                        
                        <Bar dataKey="Income" fill={neonGreen} radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="Expenses" fill={neonRed} radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
              ) : (
                  <div className="w-full h-full flex items-center justify-center">
                      <p className="text-slate-500 text-xs font-mono">No financial data available for comparison.</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default BalanceSheet;
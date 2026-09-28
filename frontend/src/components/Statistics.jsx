import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

// --- COLOR PALETTES ---
// Professional gradients for visual distinction between Income and Expenses
const EXPENSE_COLORS = ['#e11d48', '#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#be123c', '#9f1239', '#881337', '#4c0519'];
const INCOME_COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#047857', '#065f46', '#064e3b', '#022c22'];

/**
 * STATISTICS COMPONENT
 * Renders the primary data visualizations (Pie Chart for Breakdown, Area Chart for Trends).
 * Adapts dynamically based on whether the user is viewing Income or Expenses.
 */
const Statistics = ({ transactions, typeFilter }) => {
  const [topN, setTopN] = useState(5); // Controls how many top categories are shown in the Pie Chart
  const data = transactions;
  const isIncome = typeFilter === 'Income';

  // Apply the correct color palette based on the active tab filter
  const currentColors = isIncome ? INCOME_COLORS : EXPENSE_COLORS;

  /**
   * MEMOIZED PIE CHART DATA
   * Aggregates amounts by category and sorts them descending.
   */
  const pieDataSorted = useMemo(() => {
    const counts = {};
    data.forEach(t => { 
        counts[t.category] = (counts[t.category] || 0) + Math.abs(t.amount); 
    });
    return Object.keys(counts)
      .map(name => ({ name, value: parseFloat(counts[name].toFixed(2)) }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // Limits the pie chart to the top N items based on user input
  const displayData = useMemo(() => pieDataSorted.slice(0, topN), [pieDataSorted, topN]);

  /**
   * MEMOIZED AREA CHART DATA (TIMELINE)
   * Groups transactions by day to show the spending/income velocity over time.
   */
  const chartData = useMemo(() => {
    const timeline = {};
    data.forEach(t => {
      // Format date to local Greek standard for the X-Axis
      const d = new Date(t.payment_date).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' });
      timeline[d] = (timeline[d] || 0) + Math.abs(t.amount);
    });
    
    // Convert to array and sort chronologically for Recharts
    return Object.keys(timeline)
        .map(date => {
            const [day, month] = date.split('/');
            const dateObj = new Date(new Date().getFullYear(), month - 1, day); 
            return { date, amount: parseFloat(timeline[date].toFixed(2)), dateObj };
        })
        .sort((a, b) => a.dateObj - b.dateObj);
  }, [data]);

  return (
    <div className="w-full h-full flex flex-col space-y-4 lg:space-y-0 overflow-y-auto lg:overflow-hidden animate-in fade-in duration-500 custom-scrollbar pr-2 lg:pr-4 pb-[100px] lg:pb-0">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-auto lg:h-full w-full">
        
        {/* --- PIE CHART CONTAINER (Category Breakdown) --- */}
        <div className="w-full lg:w-[45%] bg-white/[0.02] p-4 md:p-8 rounded-[32px] md:rounded-[44px] flex flex-col lg:flex-row items-center shadow-2xl relative border border-white/5 min-h-[450px] lg:min-h-0 lg:h-full shrink-0">
          
          {/* Limit N Input Field */}
          <div className="absolute top-4 right-4 md:top-8 md:right-8 flex flex-col gap-1 items-end z-10">
              <label className={`text-[8px] uppercase tracking-widest font-black ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`}>Limit N</label>
              <input 
                type="number" 
                min="1" 
                value={topN} 
                className={`bg-white/5 border rounded-lg p-1 text-[10px] outline-none w-12 text-center font-black shadow-inner 
                           ${isIncome ? 'border-emerald-500/20 text-emerald-400' : 'border-rose-500/20 text-rose-400'}`} 
                onChange={(e) => setTopN(parseInt(e.target.value) || 1)} 
              />
          </div>

          <div className="w-full lg:flex-1 h-[220px] lg:h-full flex flex-col min-h-0 mt-2 lg:mt-0">
              <h3 className="text-slate-500 text-[10px] uppercase tracking-[0.3em] mb-2 md:mb-4 font-black text-center lg:text-left">
                  {isIncome ? 'Income by Category' : 'Expenses by Category'}
              </h3>
              
              {displayData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                      <Pie data={displayData} cy="45%" innerRadius="60%" outerRadius="85%" paddingAngle={5} dataKey="value" stroke="none">
                        {displayData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={currentColors[index % currentColors.length]} className="hover:opacity-70 transition-opacity outline-none" />
                        ))}
                      </Pie>
                      {/* Custom Dark-Themed Tooltip */}
                      <Tooltip contentStyle={{ backgroundColor: '#020617', border: 'none', borderRadius: '16px', padding: '12px' }} itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }} formatter={(value) => [`${value.toLocaleString()} €`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center opacity-30 mt-8">
                  <p className="text-[10px] uppercase tracking-widest font-bold">No data available</p>
                </div>
              )}
          </div>
          
          {/* Right Sidebar: Ranked Breakdown List */}
          <div className="w-full lg:w-48 h-auto lg:h-[80%] flex flex-col border-t lg:border-t-0 lg:border-l border-white/5 pt-4 lg:pt-0 lg:pl-6 shrink-0 mt-4 lg:mt-0">
              <h4 className="text-[9px] uppercase tracking-[0.2em] text-slate-600 font-black mb-2 md:mb-4 text-center lg:text-left">Breakdown</h4>
              <div className="w-full overflow-y-auto custom-scrollbar space-y-2 pr-1 flex-1">
              {displayData.map((item, idx) => (
                  <div key={idx} className="flex justify-between lg:flex-col group border-b border-white/[0.02] pb-1 items-center lg:items-start">
                  <span className={`text-[9px] font-bold truncate transition-colors uppercase tracking-tighter 
                                   ${isIncome ? 'text-slate-400 group-hover:text-emerald-400' : 'text-slate-500 group-hover:text-rose-400'}`}>
                    {item.name}
                  </span>
                  <span className="text-[11px] md:text-[13px] text-white font-black">{item.value.toLocaleString()} €</span>
                  </div>
              ))}
              </div>
          </div>
        </div>

        {/* --- AREA CHART CONTAINER (Timeline Trend) --- */}
        <div className="flex-1 min-w-0 bg-white/[0.02] p-4 md:p-8 rounded-[32px] md:rounded-[44px] shadow-2xl relative border border-white/5 overflow-hidden min-h-[400px] lg:min-h-0 lg:h-full flex flex-col shrink-0">
          <h3 className="text-slate-500 text-[10px] uppercase tracking-[0.3em] mb-4 md:mb-6 font-black text-center shrink-0 lg:text-left">
              {isIncome ? 'Income Trend Line' : 'Expense Trend Line'}
          </h3>
          <div className="flex-1 w-full min-h-0">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    {/* Dynamic gradient that changes color based on Income/Expense state */}
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isIncome ? '#10b981' : '#f43f5e'} stopOpacity={isIncome ? 0.4 : 0.3}/>
                      <stop offset="95%" stopColor={isIncome ? '#10b981' : '#f43f5e'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.08)" vertical={true} horizontal={true} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} minTickGap={20} />
                  <YAxis tick={{fill: '#475569', fontSize: 10}} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#020617', border: 'none', borderRadius: '16px' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="amount" stroke={isIncome ? '#10b981' : '#f43f5e'} strokeWidth={4} fillOpacity={1} fill="url(#colorGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center opacity-30">
                <p className="text-[10px] uppercase tracking-widest font-bold">No timeline data</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Statistics;
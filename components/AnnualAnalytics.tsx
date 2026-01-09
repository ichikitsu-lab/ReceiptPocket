
import React, { useMemo } from 'react';
import { Receipt, AppProfile } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { CATEGORY_COLORS } from '../constants';

interface AnnualAnalyticsProps {
  receipts: Receipt[];
  currentProfile: AppProfile;
}

const AnnualAnalytics: React.FC<AnnualAnalyticsProps> = ({ receipts, currentProfile }) => {
  const currentYear = new Date().getFullYear().toString();
  
  const monthlyTrends = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthStr = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
      const amount = receipts
        .filter(r => r.date.startsWith(monthStr))
        .reduce((sum, r) => sum + r.amount, 0);
      return {
        month: `${i + 1}月`,
        amount
      };
    });
  }, [receipts, currentYear]);

  const categoryAnnualSummary = useMemo(() => {
    const uniqueCategories = Array.from(new Set(receipts.map(r => r.category)));
    return uniqueCategories.map(cat => ({
      name: cat,
      amount: receipts.filter(r => r.category === cat).reduce((sum, r) => sum + r.amount, 0),
      count: receipts.filter(r => r.category === cat).length
    })).filter(s => s.count > 0).sort((a, b) => b.amount - a.amount);
  }, [receipts]);

  const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-8 animate-in slide-in-from-top-4 duration-500 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
          {currentYear}年 支出分析
        </h3>
        <div className="text-right">
          <p className="text-lg font-black text-indigo-600">¥{totalAmount.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">年間合計</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">月別推移</p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 'bold'}} tickFormatter={(v) => `¥${v/1000}k`} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} 
                  formatter={(v) => [`¥${v.toLocaleString()}`, '支出']}
                />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">カテゴリー内訳</p>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {categoryAnnualSummary.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat.name]?.split(' ')[0] || 'bg-slate-300'}`} />
                  <span className="text-[10px] font-black text-slate-700">{cat.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-900">¥{cat.amount.toLocaleString()}</span>
                  <div className="w-16 h-1 bg-slate-200 rounded-full mt-0.5 overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${(cat.amount / (totalAmount || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnualAnalytics;

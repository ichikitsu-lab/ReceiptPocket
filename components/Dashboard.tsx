
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Receipt } from '../types';
import { CATEGORY_COLORS } from '../constants';

const getCategorySVG = (cat: string) => {
  if (cat.includes('接待') || cat.includes('飲食')) return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (cat.includes('交通') || cat.includes('旅費')) return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 10l7-7m0 0l7 7m-7-7v18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
};

// 共通の更新（同期）アイコン
const IconRefresh = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

interface DashboardProps {
  receipts: Receipt[];
  categories: string[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onSyncAll?: () => void;
  userRole: 'admin' | 'viewer' | null;
  isPulling?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ receipts, categories, selectedMonth, setSelectedMonth, onSyncAll, userRole, isPulling }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const isCloudLinked = !!process.env.SYNC_API_URL;

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    receipts.forEach(r => {
      if (r.date) {
        const normalized = r.date.substring(0, 7).replace(/\//g, '-');
        if (/^\d{4}-\d{2}$/.test(normalized)) months.add(normalized);
      }
    });
    return Array.from(months).sort().reverse();
  }, [receipts]);

  const filteredReceipts = useMemo(() => {
    if (selectedMonth === "") return []; 
    return receipts.filter(r => {
      if (!r.date) return false;
      if (selectedMonth === "all") return true; 
      const normalizedDate = r.date.substring(0, 7).replace(/\//g, '-');
      return normalizedDate === selectedMonth;
    });
  }, [receipts, selectedMonth]);

  const totalAmount = filteredReceipts.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6 sm:space-y-10 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 px-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{t('dashboard.title')}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2.5 h-2.5 rounded-full ${isCloudLinked ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`}></span>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{isCloudLinked ? t('common.cloudSync') : t('common.localOnly')}</span>
          </div>
        </div>
        <div className="relative w-full sm:w-auto">
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full sm:w-auto bg-white border border-slate-200 rounded-2xl px-6 py-4 text-xs font-black text-slate-700 shadow-md appearance-none pr-12 hover:border-indigo-400 transition-colors"
          >
            <option value="">{t('dashboard.selectPeriod')}</option>
            <option value="all">{t('dashboard.allPeriods')}</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{t('dashboard.monthFormat', { year: m.split('-')[0], month: m.split('-')[1] })}</option>
            ))}
          </select>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </div>

      {selectedMonth === "" ? (
        <div className="bg-white border-2 border-dashed border-slate-200 p-20 rounded-[3rem] text-center space-y-4">
           <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
             <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" /></svg>
           </div>
           <p className="text-sm font-black text-slate-400 uppercase tracking-widest leading-loose whitespace-pre-line">
             {t('dashboard.selectPeriodPrompt')}
           </p>
        </div>
      ) : (
        <>
          <div className="bg-slate-900 px-8 py-10 sm:px-14 sm:py-14 rounded-[3rem] text-white shadow-2xl relative overflow-hidden flex flex-col justify-center min-h-[140px] sm:min-h-[220px]">
            <div className="relative z-10 flex flex-row justify-between items-center gap-6 sm:gap-16">
              <div className="flex flex-col">
                <p className="text-white/40 text-[10px] sm:text-[12px] font-black uppercase tracking-[0.4em] mb-3 sm:mb-6">
                  {selectedMonth === "all" ? t('dashboard.totalExpenseAll') : t('dashboard.totalExpense')}
                </p>
                <div className="flex items-baseline gap-1 sm:gap-3">
                  <span className="text-orange-400 text-2xl sm:text-4xl font-black">¥</span>
                  <span className="text-4xl sm:text-7xl font-black tracking-tighter leading-none">{totalAmount.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex flex-col items-end border-l border-white/10 pl-8 sm:pl-16 h-full">
                <p className="text-white/40 text-[10px] sm:text-[12px] font-black uppercase tracking-[0.4em] mb-3 sm:mb-6">
                  {selectedMonth === "all" ? t('dashboard.totalCountAll') : t('dashboard.totalCount')}
                </p>
                <p className="text-3xl sm:text-5xl font-black tracking-tight leading-none">{filteredReceipts.length} <span className="text-xs sm:text-sm text-orange-400 font-bold ml-1 uppercase">{t('dashboard.countUnit')}</span></p>
              </div>
            </div>
          </div>

          <section className="space-y-6">
            <h3 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight px-1 uppercase tracking-widest flex items-center gap-3">
              <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
              {t('dashboard.categoryAnalysis')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              {categories.map(cat => {
                const total = filteredReceipts.filter(r => r.category === cat).reduce((sum, r) => sum + r.amount, 0);
                if (total === 0) return null;
                return (
                  <button key={cat} onClick={() => navigate(`/history?category=${cat}`)} className="bg-white border border-slate-100 p-6 sm:p-10 rounded-[2.5rem] shadow-sm hover:border-indigo-300 transition-all text-left group">
                    <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-6 sm:mb-8 shadow-md ${CATEGORY_COLORS[cat]?.split(' ')[0] || 'bg-slate-100'} group-hover:scale-110 transition-transform`}>
                      <div className="scale-125 text-slate-700">{getCategorySVG(cat)}</div>
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{cat}</p>
                    <p className="text-lg sm:text-2xl font-black text-slate-900 leading-none">¥{total.toLocaleString()}</p>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      )}

      {userRole === 'admin' && (
        <div className="flex justify-center mt-4">
           <button 
             onClick={onSyncAll} 
             disabled={isPulling}
             className="bg-white border border-slate-200 px-10 py-5 rounded-[2.5rem] text-xs font-black text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-4 shadow-xl active:scale-95 group disabled:opacity-50"
           >
              <div className={`p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform duration-500 ${isPulling ? 'animate-spin' : ''}`}>
                <IconRefresh />
              </div>
              {isPulling ? t('common.syncing') : t('dashboard.syncButton')}
           </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

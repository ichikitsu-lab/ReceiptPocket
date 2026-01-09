
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Receipt, AppSettings } from '../types';
import { APP_VERSION } from '../constants';

interface SettingsProps {
  receipts: Receipt[];
  categories: string[];
  reimbursementNames: string[];
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onUpdateCategories: (newCats: string[]) => void;
  onUpdateReimbursementNames: (names: string[]) => void;
  onEditCategory: (oldName: string, newName: string) => void;
  onRemoveCategory: (cat: string) => void;
  userRole: 'admin' | 'viewer' | null;
  onLogout: () => void;
  onSync: (isManual?: boolean) => void;
  onResetLocal?: () => void;
  syncCount: number;
}

const Settings: React.FC<SettingsProps> = ({ 
  receipts, 
  categories, 
  reimbursementNames, 
  settings, 
  onUpdateSettings, 
  onUpdateCategories, 
  onUpdateReimbursementNames, 
  onEditCategory, 
  onRemoveCategory, 
  userRole, 
  onLogout,
  onSync,
  onResetLocal,
  syncCount
}) => {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [newCat, setNewCat] = useState("");
  const [newName, setNewName] = useState("");
  
  const buildId = useMemo(() => {
    const hash = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `SN-${syncCount}-${hash}`;
  }, [syncCount]);

  const storageMetrics = useMemo(() => {
    const rawData = JSON.stringify(receipts);
    const sizeInBytes = new Blob([rawData]).size;
    const sizeInKB = sizeInBytes / 1024;
    const sizeInMB = sizeInKB / 1024;
    
    const syncedCount = receipts.filter(r => r.synced).length;
    const unsyncedCount = receipts.length - syncedCount;
    
    const limitGB = 10;
    const limitMB = limitGB * 1024;
    const percent = Math.min((sizeInMB / limitMB) * 100, 100);
    
    const displaySize = sizeInMB >= 0.01 
      ? `${sizeInMB.toFixed(2)} MB` 
      : `${sizeInKB.toFixed(2)} KB`;

    return { displaySize, percent: percent.toFixed(2), syncedCount, unsyncedCount };
  }, [receipts]);

  const showStatus = (type: 'success' | 'error', message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleAddCategory = () => {
    if (userRole !== 'admin') return;
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      showStatus('error', t('settings.categoryExists'));
      return;
    }
    onUpdateCategories([...categories, trimmed]);
    setNewCat("");
    showStatus('success', t('settings.categoryAdded', { name: trimmed }));
  };

  const handleAddReimbursementName = () => {
    if (userRole !== 'admin') return;
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (reimbursementNames.includes(trimmed)) {
      showStatus('error', t('settings.memberExists'));
      return;
    }
    onUpdateReimbursementNames([...reimbursementNames, trimmed]);
    setNewName("");
    showStatus('success', t('settings.memberAdded', { name: trimmed }));
  };

  const handleRemoveReimbursementName = (nameToRemove: string) => {
    if (userRole !== 'admin') return;
    onUpdateReimbursementNames(reimbursementNames.filter(n => n !== nameToRemove));
  };

  const handleLogoutClick = () => {
    if (confirm(t('settings.logoutConfirm'))) {
      onLogout();
    }
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    showStatus('success', t('settings.languageChanged'));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in duration-500 pb-32 px-1">
      <div className="flex justify-between items-end border-b border-slate-200 pb-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase">{t('settings.title')}</h2>
          <div className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-3 w-fit shadow-md ${userRole === 'admin' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${userRole === 'admin' ? 'bg-white' : 'bg-slate-400'}`}></span>
            {userRole === 'admin' ? t('settings.adminAccess') : t('settings.viewerAccess')}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onSync(true)} 
            className="p-3 bg-white border border-slate-200 text-indigo-600 rounded-2xl shadow-md hover:bg-indigo-50 transition-all active:scale-95 group"
            title={t('settings.syncButton')}
          >
            <svg className="w-5 h-5 group-active:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button 
            onClick={handleLogoutClick} 
            className="px-6 py-3 bg-white border border-rose-200 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-md hover:bg-rose-50 transition-all active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            {t('settings.logoutButton')}
          </button>
        </div>
      </div>

      <section className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm space-y-8">
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-[1.5rem] flex items-center justify-center">
             <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
           </div>
           <div>
             <h3 className="font-black text-xl text-slate-900 tracking-tight uppercase">{t('settings.languageTitle')}</h3>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{t('settings.languageSubtitle')}</p>
           </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {['ja', 'en', 'zh-CN', 'zh-TW', 'de', 'es', 'it'].map(lang => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`py-4 px-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                i18n.language === lang 
                  ? 'bg-indigo-600 text-white shadow-lg scale-105' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t(`languages.${lang}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-xl space-y-8">
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 bg-white/10 text-indigo-400 rounded-[1.5rem] flex items-center justify-center shadow-inner">
             <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
           </div>
           <div>
             <h3 className="font-black text-xl tracking-tight uppercase">{t('settings.storageTitle')}</h3>
             <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">{t('settings.storageSubtitle')}</p>
           </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <p className="text-3xl font-black tracking-tight">{storageMetrics.displaySize}</p>
            <div className="relative w-full h-4 bg-white/10 rounded-full overflow-hidden">
               <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${storageMetrics.percent}%` }}></div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t('settings.cacheUsage')}</p>
              <button 
                onClick={onResetLocal}
                className="text-[9px] font-black text-rose-400 border border-rose-400/30 px-3 py-1 rounded-lg hover:bg-rose-400/10 transition-colors uppercase tracking-widest"
              >
                {t('settings.resetLocal')}
              </button>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-3xl p-6 flex flex-col justify-center gap-3">
             <div className="flex justify-between items-center">
               <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t('settings.syncedItems')}</span>
               <span className="text-sm font-black text-emerald-400">{storageMetrics.syncedCount} {t('dashboard.countUnit')}</span>
             </div>
             <div className="flex justify-between items-center">
               <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t('settings.unsyncedItems')}</span>
               <span className="text-sm font-black text-orange-400">{storageMetrics.unsyncedCount} {t('dashboard.countUnit')}</span>
             </div>
             <p className="text-[9px] text-white/20 font-bold mt-1 leading-relaxed">
               {t('settings.resetNote')}
             </p>
          </div>
        </div>
      </section>

      <section className={`bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm space-y-8 ${userRole !== 'admin' ? 'opacity-60 grayscale pointer-events-none' : ''}`}>
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-[1.5rem] flex items-center justify-center">
             <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
           </div>
           <div>
             <h3 className="font-black text-xl text-slate-900 tracking-tight uppercase">{t('settings.membersTitle')}</h3>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{t('settings.membersSubtitle')}</p>
           </div>
        </div>
        <div className="space-y-6">
           <div className="flex flex-col sm:flex-row gap-3">
             <input 
               type="text" 
               placeholder={t('settings.newMemberPlaceholder')}
               value={newName}
               onChange={(e) => setNewName(e.target.value)}
               className="flex-grow bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none"
             />
             <button onClick={handleAddReimbursementName} className="bg-amber-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all w-full sm:w-auto">{t('settings.addMember')}</button>
           </div>
           <div className="flex flex-wrap gap-2">
              {reimbursementNames.length > 0 ? reimbursementNames.map(name => (
                <div key={name} className="px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 text-amber-700">
                  {name}
                  <button onClick={() => handleRemoveReimbursementName(name)} className="text-amber-300 hover:text-rose-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
              )) : (
                <p className="text-[10px] text-slate-400 font-bold py-4">{t('settings.noMembers')}</p>
              )}
           </div>
        </div>
      </section>

      <section className={`bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm space-y-8 ${userRole !== 'admin' ? 'opacity-60 grayscale pointer-events-none' : ''}`}>
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 bg-slate-50 text-slate-600 rounded-[1.5rem] flex items-center justify-center">
             <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" /></svg>
           </div>
           <div>
             <h3 className="font-black text-xl text-slate-900 tracking-tight uppercase">{t('settings.categoryTitle')}</h3>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{t('settings.categorySubtitle')}</p>
           </div>
        </div>
        <div className="space-y-6">
           <div className="flex flex-col sm:flex-row gap-3">
             <input 
               type="text" 
               placeholder={t('settings.newCategoryPlaceholder')}
               value={newCat}
               onChange={(e) => setNewCat(e.target.value)}
               className="flex-grow bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none"
             />
             <button onClick={handleAddCategory} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all w-full sm:w-auto">{t('settings.addCategory')}</button>
           </div>
           <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <div key={cat} className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                  {cat}
                  <button onClick={() => onRemoveCategory(cat)} className="text-slate-400 hover:text-rose-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
              ))}
           </div>
        </div>
      </section>

      <div className="pt-20 pb-10 flex flex-col items-center justify-center gap-2 opacity-30 group grayscale">
        <div className="w-8 h-8 bg-slate-200 rounded-lg mb-2 flex items-center justify-center text-slate-400">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">{t('settings.versionInfo')}</p>
        <div className="flex items-center gap-4">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">v {APP_VERSION}</p>
           <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
           <p className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-tighter">{buildId}</p>
        </div>
        <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest mt-2">{t('settings.copyright')}</p>
      </div>

      {status && (
        <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 px-10 py-5 rounded-[2rem] font-black text-white shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-6 duration-300 ${status.type === 'success' ? 'bg-indigo-600' : 'bg-rose-600 uppercase tracking-widest text-[10px]'}`}>
          {status.message}
        </div>
      )}
    </div>
  );
};

export default Settings;


import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Dashboard from './components/Dashboard';
import UploadSection from './components/UploadSection';
import ReceiptList from './components/ReceiptList';
import AccountingView from './components/AccountingView';
import Settings from './components/Settings';
import Login from './components/Login';
import { Receipt, AppProfile, DEFAULT_CATEGORIES, AppData, AppSettings } from './types';
import { syncToExternalServer, fetchReceiptsFromServer, deleteFromServer, saveConfigToServer, fetchConfigFromServer } from './services/syncService';
import { UserRole } from './services/authService';

const IconHome = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const IconHistory = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
const IconScan = () => <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IconChart = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6m2 0h2a2 2 0 002-2v-4a2 2 0 00-2-2h-2a2 2 0 00-2 2v4a2 2 0 002 2z" /></svg>;

const App: React.FC = () => {
  const { t } = useTranslation();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [syncCount, setSyncCount] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(() => localStorage.getItem('pocket_session_role') as UserRole || null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const deletedIdsRef = useRef<Set<string>>(new Set());

  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('pocket_custom_categories_business');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [reimbursementNames, setReimbursementNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('pocket_reimbursement_names');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('pocket_app_settings');
    return saved ? JSON.parse(saved) : { appName: '領収書DB', autoDeleteMonths: 0, fiscalYearStartMonth: 4 };
  });

  const [selectedMonth, setSelectedMonth] = useState("");
  const [pendingUpload, setPendingUpload] = useState<any>(null);

  const isPullingRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      const local = localStorage.getItem('pocket_receipts_v2');
      if (local) setReceipts(JSON.parse(local));
      
      const config = await fetchConfigFromServer();
      if (config) {
        if (config.categories) setCategories(config.categories);
        if (config.reimbursementNames) setReimbursementNames(config.reimbursementNames);
      }
      if (userRole) refreshCloudData(false);
    };
    init();
  }, [userRole]);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    if (role) localStorage.setItem('pocket_session_role', role);
  };

  const saveReceiptsToLocal = (list: Receipt[]) => {
    const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    localStorage.setItem('pocket_receipts_v2', JSON.stringify(sorted));
    setReceipts(sorted);
  };

  const refreshCloudData = useCallback(async (isManual = false) => {
    if (!userRole || isPullingRef.current) return;
    isPullingRef.current = true;
    setIsPulling(true);
    try {
      const cloudData = await fetchReceiptsFromServer();
      if (cloudData && Array.isArray(cloudData)) {
        const currentLocal = JSON.parse(localStorage.getItem('pocket_receipts_v2') || '[]');
        const unsyncedItems = currentLocal.filter((r: Receipt) => !r.synced);
        
        const filteredCloudData = cloudData
          .filter(r => !deletedIdsRef.current.has(r.id))
          .map(r => ({ ...r, synced: true }));
        
        const dataMap = new Map<string, Receipt>();
        filteredCloudData.forEach(r => dataMap.set(r.id, r));
        
        unsyncedItems.forEach((r: Receipt) => { 
          if (!dataMap.has(r.id) && !deletedIdsRef.current.has(r.id)) {
            dataMap.set(r.id, r);
          }
        });

        saveReceiptsToLocal(Array.from(dataMap.values()));
      }

      const config = await fetchConfigFromServer();
      if (config) {
        if (config.categories) {
          setCategories(config.categories);
          localStorage.setItem('pocket_custom_categories_business', JSON.stringify(config.categories));
        }
        if (config.reimbursementNames) {
          setReimbursementNames(config.reimbursementNames);
          localStorage.setItem('pocket_reimbursement_names', JSON.stringify(config.reimbursementNames));
        }
      }

      setSyncCount(c => c + 1);
      if (isManual) showToast(t('toast.cloudSynced'));
    } catch (err) {
      if (isManual) showToast(t('toast.syncFailed'), 'error');
    } finally {
      isPullingRef.current = false;
      setIsPulling(false);
    }
  }, [userRole, showToast, t]);

  const addReceipt = async (receipt: Receipt): Promise<boolean> => {
    if (userRole !== 'admin') return false;
    
    const exists = receipts.some(r => r.id === receipt.id);
    if (exists) {
        showToast(t('upload.alreadyRegistered'), 'info');
        return true; 
    }

    try {
      const result = await syncToExternalServer(receipt);
      if (result.success) {
        const syncedReceipt = { 
          ...receipt, 
          imageUrl: result.url || receipt.imageUrl, 
          evidenceUrl: result.evidenceUrl || receipt.evidenceUrl,
          synced: true 
        };
        saveReceiptsToLocal([syncedReceipt, ...receipts]);
        showToast(t('toast.savedToCloud'));
        return true;
      } else {
        showToast(t('toast.saveFailed'), 'error');
        return false;
      }
    } catch (e) { 
      showToast(t('toast.networkError'), 'error');
      return false;
    }
  };

  const updateReceipt = async (receipt: Receipt) => {
    if (userRole !== 'admin') return;
    const newList = receipts.map(r => r.id === receipt.id ? receipt : r);
    saveReceiptsToLocal(newList);
    try {
      const result = await syncToExternalServer(receipt);
      if (result.success) {
        saveReceiptsToLocal(newList.map(r => r.id === receipt.id ? { ...receipt, synced: true } : r));
      }
    } catch (e) {}
  };

  const deleteReceipt = async (id: string) => {
    if (userRole !== 'admin') return;
    if (!confirm('削除しますか？')) return;
    
    deletedIdsRef.current.add(id);
    saveReceiptsToLocal(receipts.filter(r => r.id !== id));
    
    try {
      await deleteFromServer(id);
      showToast(t('toast.deleted'));
    } catch (err) {
      showToast(t('toast.deleteFailedPartial'), 'info');
    }
  };

  const handleDeleteMonth = async (month: string) => {
    if (userRole !== 'admin') return;
    if (!confirm('削除しますか？')) return;
    const targets = receipts.filter(r => r.date.startsWith(month));
    targets.forEach(r => deletedIdsRef.current.add(r.id));
    
    saveReceiptsToLocal(receipts.filter(r => !r.date.startsWith(month)));
    for (const r of targets) await deleteFromServer(r.id).catch(() => {});
    showToast(t('receiptList.deleteMonthCompleted'));
  };

  const deleteMultipleReceipts = async (ids: string[]) => {
    if (userRole !== 'admin') return;
    ids.forEach(id => deletedIdsRef.current.add(id));
    
    saveReceiptsToLocal(receipts.filter(r => !ids.includes(r.id)));
    for (const id of ids) await deleteFromServer(id).catch(() => {});
    showToast(t('receiptList.bulkDeleteCompleted'));
  };

  const handleEditCategory = (oldName: string, newName: string) => {
    if (userRole !== 'admin') return;
    const newCats = categories.map(c => c === oldName ? newName : c);
    setCategories(newCats);
    localStorage.setItem('pocket_custom_categories_business', JSON.stringify(newCats));
    saveConfigToServer('categories', newCats);
    saveReceiptsToLocal(receipts.map(r => r.category === oldName ? { ...r, category: newName } : r));
  };

  const handleRemoveCategory = (cat: string) => {
    if (userRole !== 'admin') return;
    if (!confirm(`「${cat}」を削除しますか？`)) return;
    const newCats = categories.filter(c => c !== cat);
    setCategories(newCats);
    localStorage.setItem('pocket_custom_categories_business', JSON.stringify(newCats));
    saveConfigToServer('categories', newCats);
  };

  const handleResetLocalData = async () => {
    if (!confirm('リセットして再取得しますか？')) return;
    setIsPulling(true);
    deletedIdsRef.current.clear(); 
    try {
      localStorage.removeItem('pocket_receipts_v2');
      setReceipts([]);
      const cloudData = await fetchReceiptsFromServer();
      if (cloudData) saveReceiptsToLocal(cloudData.map(r => ({ ...r, synced: true })));
      showToast('リセット完了');
    } catch (e) {
      showToast('失敗', 'error');
    } finally {
      setIsPulling(false);
    }
  };

  if (!userRole) return <Login onLogin={handleLogin} appName={appSettings.appName} />;

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50 overflow-hidden relative">
        <header className="bg-slate-900 sticky top-0 z-30 border-b border-slate-800 px-4 sm:px-6 h-16 sm:h-20 flex justify-between items-center shadow-lg">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg">DB</div>
            <div className="flex flex-col leading-tight">
              <h1 className="text-sm sm:text-lg font-black text-white tracking-tight uppercase truncate max-w-[150px] sm:max-w-none">{appSettings.appName}</h1>
              <span className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${userRole === 'admin' ? 'text-indigo-400' : 'text-slate-500'}`}>
                {userRole === 'admin' ? t('common.adminMode') : t('common.viewerMode')}
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/settings" className="p-2.5 sm:p-3 text-slate-400 hover:text-white transition-all bg-slate-800 rounded-xl shadow-inner active:scale-95">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            </Link>
          </div>
        </header>
        <main className="flex-grow overflow-y-auto scroll-smooth">
          <div className="container mx-auto max-w-4xl px-4 py-8 sm:p-10 pb-36">
            <Routes>
              <Route path="/" element={<Dashboard receipts={receipts} categories={categories} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} onSyncAll={() => refreshCloudData(true)} userRole={userRole} isPulling={isPulling} />} />
              <Route path="/upload" element={userRole === 'admin' ? <UploadSection receipts={receipts} onAdd={addReceipt} categories={categories} reimbursementNames={reimbursementNames} pendingUpload={pendingUpload} setPendingUpload={setPendingUpload} /> : <Navigate to="/" />} />
              <Route path="/history" element={<ReceiptList receipts={receipts} onDelete={deleteReceipt} onDeleteMultiple={deleteMultipleReceipts} onDeleteMonth={handleDeleteMonth} onUpdate={updateReceipt} profileCategories={categories} reimbursementNames={reimbursementNames} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} userRole={userRole} />} />
              <Route path="/accounting" element={<AccountingView receipts={receipts} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} onDeleteMonth={handleDeleteMonth} onSyncAll={() => refreshCloudData(true)} reimbursementNames={reimbursementNames} />} />
              <Route path="/settings" element={<Settings receipts={receipts} categories={categories} reimbursementNames={reimbursementNames} settings={appSettings} onUpdateSettings={(s) => { setAppSettings(s); localStorage.setItem('pocket_app_settings', JSON.stringify(s)); }} onUpdateCategories={(c) => { setCategories(c); localStorage.setItem('pocket_custom_categories_business', JSON.stringify(c)); saveConfigToServer('categories', c); }} onUpdateReimbursementNames={(n) => { setReimbursementNames(n); saveConfigToServer('reimbursementNames', n); }} onEditCategory={handleEditCategory} onRemoveCategory={handleRemoveCategory} userRole={userRole} onLogout={() => setUserRole(null)} onSync={refreshCloudData} onResetLocal={handleResetLocalData} syncCount={syncCount} />} />
            </Routes>
          </div>
        </main>
        {toast && (
          <div className="fixed top-24 left-4 right-4 z-[60] flex justify-center pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
            <div className={`px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10 ${toast.type === 'error' ? 'bg-rose-600' : 'bg-indigo-600'} text-white font-black text-xs uppercase tracking-widest pointer-events-auto`}>
              {toast.message}
            </div>
          </div>
        )}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 flex justify-around items-center z-40 shadow-[0_-4px_30px_-5px_rgba(0,0,0,0.1)] h-20 sm:h-24">
          <NavItem to="/" icon={<IconHome />} label={t('common.home')} />
          <NavItem to="/history" icon={<IconHistory />} label={t('common.history')} />
          {userRole === 'admin' && <NavItem to="/upload" icon={<IconScan />} label={t('common.register')} isPrimary />}
          <NavItem to="/accounting" icon={<IconChart />} label={t('common.report')} />
        </nav>
      </div>
    </Router>
  );
};

const NavItem: React.FC<{ to: string, icon: React.ReactNode, label: string, isPrimary?: boolean }> = ({ to, icon, label, isPrimary }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex flex-col items-center transition-all ${isPrimary ? '-translate-y-8' : ''} ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
      <div className={`${isPrimary ? 'w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center border-4 border-slate-50 shadow-2xl scale-110' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase mt-1 tracking-widest">{label}</span>
    </Link>
  );
};

export default App;

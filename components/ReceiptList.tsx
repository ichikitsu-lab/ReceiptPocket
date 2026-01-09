
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Receipt, PaymentMethod } from '../types';
import { CATEGORY_COLORS } from '../constants';

const IconImageSmall = () => (
  <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);

interface ReceiptListProps {
  receipts: Receipt[];
  onDelete: (id: string) => void;
  onDeleteMultiple: (ids: string[]) => void;
  onDeleteMonth: (month: string) => void;
  onUpdate: (updated: Receipt) => void;
  profileCategories: string[];
  reimbursementNames: string[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  userRole: 'admin' | 'viewer';
}

const ReceiptList: React.FC<ReceiptListProps> = ({ receipts, onDelete, onDeleteMultiple, onDeleteMonth, onUpdate, profileCategories, reimbursementNames, selectedMonth, setSelectedMonth, userRole }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<'all' | 'normal' | 'reimbursement'>('all');
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Receipt | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fullScreenImageUrl, setFullScreenImageUrl] = useState<string | null>(null);
  
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const editEvidenceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (location.state?.viewReceiptId) {
      const existing = receipts.find(r => r.id === location.state.viewReceiptId);
      if (existing) {
        setViewingReceipt(existing);
        setIsEditing(false);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, receipts]);

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

  const finalFiltered = useMemo(() => {
    if (selectedMonth === "") return [];

    return receipts.filter(r => {
      const normalizedDate = r.date.substring(0, 7).replace(/\//g, '-');
      const matchesMonth = selectedMonth === "all" || normalizedDate === selectedMonth;
      const matchesSearch = r.vendor.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (r.title && r.title.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesFilter = filterMode === 'all' || 
                           (filterMode === 'reimbursement' && r.isReimbursement) ||
                           (filterMode === 'normal' && !r.isReimbursement);

      return matchesMonth && matchesSearch && matchesFilter;
    });
  }, [receipts, selectedMonth, searchTerm, filterMode]);

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedIds(new Set());
  };

  const handleItemClick = (receipt: Receipt) => {
    if (isSelectMode) {
      const next = new Set(selectedIds);
      if (next.has(receipt.id)) {
        next.delete(receipt.id);
      } else {
        next.add(receipt.id);
      }
      setSelectedIds(next);
    } else {
      setViewingReceipt(receipt);
      setIsEditing(false);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (confirm(t('receiptList.deleteConfirm'))) {
        onDeleteMultiple(Array.from(selectedIds));
        setIsSelectMode(false);
        setSelectedIds(new Set());
    }
  };

  const handleSaveEdit = () => {
    if (editForm) {
      // 保存直前に立替設定がOFFならメンバー名を空にする
      const finalUpdate = {
        ...editForm,
        reimbursedBy: editForm.isReimbursement ? (editForm.reimbursedBy || '') : ''
      };
      onUpdate(finalUpdate);
      setViewingReceipt(finalUpdate);
      setIsEditing(false);
    }
  };

  const handleMediaClick = (url: string) => {
    if (!url) return;
    if (url.startsWith('data:application/pdf') || url.includes('/view/evidence-') || url.includes('application/pdf')) {
      const win = window.open();
      if (win) {
        win.document.write(`<iframe src="${url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      }
      return;
    }
    setFullScreenImageUrl(url);
    setIsFullScreen(true);
  };

  const handleEditEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editForm) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      setEditForm({
        ...editForm,
        evidenceUrl: base64Data
      });
    };
    reader.readAsDataURL(file);
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none h-[58px] box-border appearance-none";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24 px-0">
      <div className="flex flex-col gap-5">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">領収書履歴</h2>
          <div className="flex items-center gap-2">
            {userRole === 'admin' && selectedMonth !== "" && (
               <button 
                 onClick={toggleSelectMode}
                 className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isSelectMode ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50'}`}
               >
                 {isSelectMode ? '解除' : '選択'}
               </button>
            )}
            <div className="relative">
              <select 
                value={selectedMonth}
                onChange={(e) => { setSelectedMonth(e.target.value); setIsSelectMode(false); }}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black text-slate-700 shadow-sm appearance-none pr-10 hover:border-indigo-400 transition-colors"
              >
                <option value="">期間を選択してください</option>
                <option value="all">すべての期間を表示</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m.replace('-', '年')}月</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {selectedMonth !== "" && !isSelectMode && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button onClick={() => setFilterMode('all')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${filterMode === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}>すべて</button>
              <button onClick={() => setFilterMode('normal')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${filterMode === 'normal' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}>通常支出</button>
              <button onClick={() => setFilterMode('reimbursement')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${filterMode === 'reimbursement' ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white text-slate-400 border-slate-200'}`}>立替金</button>
            </div>
            <div className="relative">
              <input type="text" placeholder="支払先やタイトルで検索..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
            </div>
          </>
        )}
      </div>

      <div className="space-y-3">
        {selectedMonth === "" ? (
          <div className="bg-white border-2 border-dashed border-slate-200 py-32 rounded-[3rem] text-center space-y-6">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-indigo-500/40">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" /></svg>
             </div>
             <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">期間を選択してください</p>
          </div>
        ) : finalFiltered.length > 0 ? (
          finalFiltered.map(receipt => (
            <div 
              key={receipt.id} 
              onClick={() => handleItemClick(receipt)} 
              className={`bg-white rounded-2xl p-4 flex items-center gap-4 border shadow-sm transition-all cursor-pointer ${isSelectMode && selectedIds.has(receipt.id) ? 'border-indigo-600 bg-indigo-50/30' : 'hover:border-indigo-300'}`}
            >
              {isSelectMode && (
                <div className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${selectedIds.has(receipt.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 bg-white'}`}>
                  {selectedIds.has(receipt.id) && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                </div>
              )}
              <div className="bg-slate-50 p-2 rounded-xl shrink-0">
                 {receipt.evidenceUrl || receipt.imageUrl ? <IconImageSmall /> : <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>}
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm truncate pr-2">{receipt.title || receipt.vendor}</span>
                  <span className="font-black text-slate-900 text-sm whitespace-nowrap">¥{receipt.amount.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{receipt.date}</span>
                  <span className={`text-[8px] px-2 py-0.5 rounded-md font-black uppercase tracking-widest ${CATEGORY_COLORS[receipt.category] || 'bg-slate-100 text-slate-500'}`}>{receipt.category}</span>
                  {receipt.isReimbursement && <span className="text-[8px] px-2 py-0.5 rounded-md font-black uppercase tracking-widest bg-orange-500 text-white">立替:{receipt.reimbursedBy}</span>}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-24 text-slate-400 font-bold bg-white rounded-3xl border border-dashed border-slate-200 uppercase tracking-widest">条件に合うデータがありません</div>
        )}
      </div>

      {isSelectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-28 left-4 right-4 z-50 animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-5 rounded-[2rem] shadow-2xl flex items-center justify-between text-white">
            <span className="text-xs font-black uppercase ml-4">{selectedIds.size}件 選択中</span>
            <button onClick={handleDeleteSelected} className="px-8 py-4 bg-rose-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl">選択項目を削除</button>
          </div>
        </div>
      )}

      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md" onClick={() => !isEditing && setViewingReceipt(null)}>
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] p-6 sm:p-10 space-y-6 shadow-2xl relative overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {!isEditing ? (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start shrink-0 gap-6 border-b pb-6">
                   <div className="flex-grow min-w-0 w-full">
                     <h3 className="text-xl sm:text-2xl font-black text-slate-900 truncate uppercase">{viewingReceipt.title || viewingReceipt.vendor}</h3>
                     <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-[0.2em]">{viewingReceipt.date} • {viewingReceipt.vendor}</p>
                   </div>
                   <div className="text-left sm:text-right shrink-0">
                     <p className="text-3xl font-black text-indigo-600 leading-none">¥{viewingReceipt.amount.toLocaleString()}</p>
                     {viewingReceipt.isReimbursement && <p className="text-[8px] font-black uppercase tracking-widest bg-orange-500 text-white px-2 py-1 rounded mt-2 inline-block">立替: {viewingReceipt.reimbursedBy}</p>}
                   </div>
                </div>
                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-6">
                   {viewingReceipt.description && (
                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 uppercase mb-2">備考 / AI解析メモ</p>
                       <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">{viewingReceipt.description}</p>
                     </div>
                   )}
                   {(viewingReceipt.evidenceUrl || viewingReceipt.imageUrl) && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">画像データ</p>
                      <div className="flex flex-wrap gap-4">
                        {viewingReceipt.imageUrl && <img src={viewingReceipt.imageUrl} alt="Receipt" className="max-w-[150px] max-h-[150px] object-contain rounded-xl border cursor-pointer" onClick={() => handleMediaClick(viewingReceipt.imageUrl!)} />}
                        {viewingReceipt.evidenceUrl && <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 cursor-pointer" onClick={() => handleMediaClick(viewingReceipt.evidenceUrl!)}><p className="text-[9px] font-black text-indigo-600 uppercase">エビデンスファイルを表示</p></div>}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-4 pt-6 border-t border-slate-100">
                  {userRole === 'admin' && (
                    <>
                      <button onClick={() => { if(confirm('削除しますか？')) { onDelete(viewingReceipt.id); setViewingReceipt(null); } }} className="flex-1 py-4 bg-rose-50 text-rose-500 rounded-2xl font-black text-xs uppercase tracking-widest">削除</button>
                      <button onClick={() => { setEditForm({ ...viewingReceipt }); setIsEditing(true); }} className="flex-1 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest">編集</button>
                    </>
                  )}
                  <button onClick={() => setViewingReceipt(null)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest">閉じる</button>
                </div>
              </>
            ) : (
              <>
                <div className="shrink-0 flex items-center justify-between border-b pb-5">
                   <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest">内容の修正</h3>
                </div>
                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-6 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1 md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">タイトル</label>
                      <input type="text" value={editForm?.title || ''} className={inputClass} onChange={(e) => setEditForm({...editForm!, title: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">日付</label>
                      <input type="date" value={editForm?.date || ''} className={inputClass} onChange={(e) => setEditForm({...editForm!, date: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">金額 (¥)</label>
                      <input type="number" value={editForm?.amount || 0} className={inputClass} onChange={(e) => setEditForm({...editForm!, amount: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">支払先</label>
                      <input type="text" value={editForm?.vendor || ''} className={inputClass} onChange={(e) => setEditForm({...editForm!, vendor: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">カテゴリー</label>
                      <div className="relative">
                        <select value={editForm?.category || ''} className={`${inputClass} !pr-10`} onChange={(e) => setEditForm({...editForm!, category: e.target.value})}>
                          {profileCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">備考 / AIメモ</label>
                      <textarea value={editForm?.description || ''} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none h-24 resize-none box-border" onChange={(e) => setEditForm({...editForm!, description: e.target.value})} />
                    </div>
                    <div className="col-span-1 md:col-span-2 p-6 bg-orange-50 rounded-3xl border border-orange-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <input type="checkbox" id="edit-check-reim" checked={!!editForm?.isReimbursement} className="w-6 h-6 rounded-lg text-orange-600" onChange={(e) => setEditForm({...editForm!, isReimbursement: e.target.checked})} />
                          <label htmlFor="edit-check-reim" className="text-xs font-black text-orange-900 uppercase cursor-pointer">立替金として設定</label>
                        </div>
                        {editForm?.isReimbursement ? (
                          <select value={editForm.reimbursedBy || ''} className="bg-white border border-orange-200 rounded-xl px-4 py-2 font-black text-xs text-orange-600 outline-none" onChange={(e) => setEditForm({...editForm!, reimbursedBy: e.target.value})}>
                            <option value="">選択してください</option>
                            {reimbursementNames.map(name => <option key={name} value={name}>{name}</option>)}
                          </select>
                        ) : (
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-lg">通常支出（未チェック）</span>
                        )}
                    </div>
                    <div className="col-span-1 md:col-span-2 p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-3">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">エビデンス添付の変更</p>
                        <button onClick={() => editEvidenceInputRef.current?.click()} className="w-full py-4 bg-white border border-slate-200 rounded-xl font-black text-xs text-slate-400 uppercase hover:text-indigo-600 transition-colors">
                          {editForm?.evidenceUrl ? "ファイルを変更" : "新規ファイルを選択"}
                        </button>
                        <input type="file" ref={editEvidenceInputRef} onChange={handleEditEvidenceChange} accept="image/*,application/pdf" className="hidden" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 pt-6 border-t border-slate-100 shrink-0">
                  <button onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest">キャンセル</button>
                  <button onClick={handleSaveEdit} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">保存する</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isFullScreen && fullScreenImageUrl && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4" onClick={() => setIsFullScreen(false)}>
          <img src={fullScreenImageUrl} alt="Full Screen" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
};

export default ReceiptList;

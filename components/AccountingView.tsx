
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Receipt } from '../types';

interface AccountingViewProps {
  receipts: Receipt[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onDeleteMonth: (month: string) => void;
  onSyncAll: () => void;
  reimbursementNames: string[];
}

const AccountingView: React.FC<AccountingViewProps> = ({ receipts, selectedMonth, setSelectedMonth, onDeleteMonth, onSyncAll, reimbursementNames }) => {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState<'all' | 'normal' | 'reimbursement'>('all');
  const [selectedMember, setSelectedMember] = useState<string>("all");
  const [rangeMonths, setRangeMonths] = useState<number>(1); 
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const monthOptions: string[] = useMemo(() => {
    const months = new Set<string>();
    receipts.forEach(r => {
      if (r.date) {
        const normalized = r.date.substring(0, 7).replace(/\//g, '-');
        if (/^\d{4}-\d{2}$/.test(normalized)) months.add(normalized);
      }
    });
    return Array.from(months).sort().reverse();
  }, [receipts]);

  const targetMonths = useMemo(() => {
    if (!selectedMonth || selectedMonth === "all") return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const result = [];
    for (let i = 0; i < rangeMonths; i++) {
      const d = new Date(year, month - 1 - i, 1);
      result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return result;
  }, [selectedMonth, rangeMonths]);

  const filteredReceipts = useMemo(() => {
    if (!selectedMonth || selectedMonth === "") return [];

    return receipts.filter(r => {
      if (!r.date) return false;
      const normalizedDate = r.date.substring(0, 7).replace(/\//g, '-');
      const matchesMonth = selectedMonth === "all" ? true : targetMonths.includes(normalizedDate);
      
      let matchesType = true;
      if (reportType === 'normal') matchesType = !r.isReimbursement;
      if (reportType === 'reimbursement') matchesType = !!r.isReimbursement;

      let matchesMember = true;
      if (selectedMember !== "all") {
        matchesMember = r.reimbursedBy === selectedMember;
      }
      
      return matchesMonth && matchesType && matchesMember;
    });
  }, [receipts, selectedMonth, targetMonths, reportType, selectedMember]);

  const totalAmount = filteredReceipts.reduce((sum, r) => sum + r.amount, 0);

  const showStatus = (type: 'success' | 'error', message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 4000);
  };

  const handleOpenUrl = (url: string) => {
    if (url.startsWith('http')) {
      window.open(url, '_blank');
    } else if (url.startsWith('data:')) {
      const win = window.open();
      if (win) {
        if (url.includes('pdf')) {
          win.document.write(`<iframe src="${url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        } else {
          win.document.write(`
            <html>
              <body style="margin:0; background: #000; display:flex; align-items:center; justify-content:center;">
                <img src="${url}" style="max-width:100%; max-height:100%; object-fit:contain;"/>
              </body>
            </html>
          `);
        }
      }
    }
  };

  const handleExportCSV = () => {
    try {
      if (filteredReceipts.length === 0) {
        showStatus('error', '出力対象のデータが見つかりません。');
        return;
      }
      
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      // タイトル列を明示的に追加
      const headers = ['日付', 'タイトル', '支払先', '金額', 'カテゴリー', '種別', '立替人', '備考', '画像URL'].join(',');
      
      const rows = filteredReceipts.map(r => {
        const urlValue = r.evidenceUrl || r.imageUrl || '';
        return [
          r.date,
          `"${(r.title || '').replace(/"/g, '""')}"`, // タイトル
          `"${(r.vendor || '').replace(/"/g, '""')}"`, // 支払先
          r.amount,
          r.category,
          r.isReimbursement ? '立替金' : '通常支出',
          `"${(r.reimbursedBy || '').replace(/"/g, '""')}"`,
          `"${(r.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
          urlValue.startsWith('http') ? urlValue : '未同期（ローカルのみ）'
        ].join(',');
      });

      // Fix: Removed broken totalRow and used calculated totalAmount correctly
      const totalRow = ['合計', '', '', totalAmount, '', '', '', '', ''].join(',');

      const csvContent = [headers, ...rows, totalRow].join('\n');
      const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `経費レポート_${selectedMonth}.csv`;
      link.click();
      showStatus('success', 'CSV形式で保存しました。');
    } catch (err) {
      showStatus('error', 'エラーが発生しました。');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 px-1">
      <div className="px-1">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">レポート出力</h2>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">集計範囲を指定して一括抽出</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">基準月</p>
          <div className="relative">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)} 
              className="w-full text-sm font-black text-indigo-600 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none appearance-none"
            >
              <option value="">選択...</option>
              <option value="all">すべてのデータ</option>
              {monthOptions.map(m => <option key={m} value={m}>{m.replace('-', '年')}月</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">抽出期間</p>
          <div className="flex gap-2">
            {[1, 3, 6].map(m => (
              <button 
                key={m} 
                onClick={() => setRangeMonths(m)}
                disabled={selectedMonth === "all" || selectedMonth === ""}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${rangeMonths === m && selectedMonth !== "all" && selectedMonth !== "" ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100 disabled:opacity-30'}`}
              >
                {m}ヶ月
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">種別</p>
          <div className="flex gap-2">
            {['all', 'normal', 'reimbursement'].map(type => (
              <button 
                key={type} 
                onClick={() => setReportType(type as any)}
                className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${reportType === type ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
              >
                {type === 'all' ? '全部' : type === 'normal' ? '通常' : '立替'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">立替人</p>
          <div className="relative">
            <select 
              value={selectedMember} 
              onChange={(e) => setSelectedMember(e.target.value)} 
              className="w-full text-sm font-black text-orange-600 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none appearance-none"
            >
              <option value="all">全員を表示</option>
              {reimbursementNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {selectedMonth !== "" && (
        <>
          <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-3">
                {selectedMember !== "all" ? `${selectedMember} の` : ''} 抽出結果: {filteredReceipts.length} 件
              </p>
              <div className="flex items-baseline gap-2">
                 <span className="text-xl font-black text-indigo-400">¥</span>
                 <span className="text-4xl font-black">{totalAmount.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <button onClick={handleExportCSV} className="bg-indigo-600 text-white font-black px-10 py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                CSV形式で出力
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">抽出データ一覧</h3>
            </div>
            <div className="overflow-x-auto scroll-smooth">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">日付</th>
                    <th className="px-6 py-4">タイトル / 支払先</th>
                    <th className="px-6 py-4 text-right">金額</th>
                    <th className="px-6 py-4">カテゴリー</th>
                    <th className="px-6 py-4">立替人</th>
                    <th className="px-6 py-4 text-center">領収書URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReceipts.map(r => {
                    const hasUrl = !!(r.evidenceUrl || r.imageUrl);
                    return (
                      <tr key={r.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="px-6 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">{r.date}</td>
                        <td className="px-6 py-4 text-xs font-black text-slate-900 leading-snug">
                          {r.title && <span className="block text-[9px] text-indigo-500 mb-0.5">{r.title}</span>}
                          {r.vendor}
                        </td>
                        <td className="px-6 py-4 text-xs font-black text-indigo-600 text-right">¥{r.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest pr-4">{r.category}</td>
                        <td className="px-6 py-4 text-[10px] font-black text-orange-600 uppercase tracking-widest">{r.reimbursedBy || '-'}</td>
                        <td className="px-6 py-4 text-center">
                          {hasUrl ? (
                            <button 
                              onClick={() => handleOpenUrl(r.evidenceUrl || r.imageUrl || '')}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all font-black text-[10px] uppercase shadow-sm border border-indigo-100"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              表示
                            </button>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-300 uppercase">なし</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-indigo-50/50">
                    <td colSpan={2} className="px-6 py-4 text-xs font-black text-slate-900 text-right uppercase tracking-widest">合計金額:</td>
                    <td className="px-6 py-4 text-sm font-black text-indigo-700 text-right whitespace-nowrap">¥{totalAmount.toLocaleString()}</td>
                    <td colSpan={3} className="px-6 py-4"></td>
                  </tr>
                </tfoot>
              </table>
              {filteredReceipts.length === 0 && (
                <div className="py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">条件に合うデータがありません</div>
              )}
            </div>
          </div>
        </>
      )}

      {status && (
        <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 px-10 py-5 rounded-[2rem] font-black text-white shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-6 duration-300 ${status.type === 'success' ? 'bg-indigo-600' : 'bg-rose-600'}`}>
          {status.message}
        </div>
      )}
    </div>
  );
};

export default AccountingView;

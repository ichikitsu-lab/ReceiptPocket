
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { analyzeReceipt } from '../services/geminiService';
import { Receipt, PaymentMethod } from '../types';
import { SupportedLanguage } from '../i18n/aiPrompts';

const generateDeterministicId = (data: any, fileBase64: string): string => {
  const str = `${data.date}-${data.vendor}-${data.amount}-${fileBase64.substring(100, 200)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `RC-${Math.abs(hash).toString(36).toUpperCase()}-${data.date.replace(/-/g, '')}`;
};

const IconCloudUpload = () => (
  <svg className="w-16 h-16 mb-6 text-indigo-500 group-hover:scale-110 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

interface UploadSectionProps {
  receipts: Receipt[];
  onAdd: (receipt: Receipt) => Promise<boolean>;
  categories: string[];
  reimbursementNames: string[];
  pendingUpload: {
    fileInfo: { base64: string, mime: string, name: string, hash?: string } | null,
    evidenceFileInfo: { base64: string, mime: string, name: string } | null,
    extractedData: Partial<Receipt> | null
  } | null;
  setPendingUpload: (data: any) => void;
}

const UploadSection: React.FC<UploadSectionProps> = ({ 
  receipts,
  onAdd, 
  categories, 
  reimbursementNames,
  pendingUpload,
  setPendingUpload
}) => {
  const { t, i18n } = useTranslation();
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleAiFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingStep(t('upload.aiAnalyzing'));
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      try {
        const currentLanguage = i18n.language as SupportedLanguage;
        const analysis = await analyzeReceipt(base64Data.split(',')[1], file.type, 'business', categories, currentLanguage);
        const detectedAssetType = file.type === 'application/pdf' ? 'pdf' : 'image';
        
        setPendingUpload({ 
          fileInfo: { base64: base64Data, mime: file.type, name: file.name }, 
          evidenceFileInfo: null,
          extractedData: { 
            ...analysis, 
            title: '', 
            isReimbursement: false, 
            reimbursedBy: '', // 初期状態は空
            assetType: detectedAssetType 
          } 
        });
      } catch (err) {
        alert(t('upload.analysisFailed'));
      } finally {
        setLoadingStep(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEvidenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUpload) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      setPendingUpload({
        ...pendingUpload,
        evidenceFileInfo: { base64: base64Data, mime: file.type, name: file.name }
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveClick = async () => {
    if (!pendingUpload || !pendingUpload.extractedData || isSaving) return;
    
    const { extractedData, fileInfo, evidenceFileInfo } = pendingUpload;
    const vendor = extractedData.vendor || '不明な支払先';
    const date = extractedData.date || new Date().toISOString().split('T')[0];
    const amount = extractedData.amount || 0;

    // 重複チェック
    const isDuplicate = receipts.find(r => 
      r.date === date && 
      r.vendor === vendor && 
      r.amount === amount
    );

    if (isDuplicate) {
      if (!confirm(t('upload.duplicateConfirm', { date, vendor, amount: amount.toLocaleString() }))) {
        return;
      }
    }

    setIsSaving(true);
    try {
      const receiptId = generateDeterministicId({ date, vendor, amount }, fileInfo?.base64 || "");

      const finalReceipt: Receipt = {
        id: receiptId,
        title: extractedData.title || '',
        date: date,
        vendor: vendor,
        amount: amount,
        category: extractedData.category || categories[0],
        paymentMethod: PaymentMethod.CASH,
        description: extractedData.description || '',
        imageUrl: fileInfo?.base64 || '',
        evidenceUrl: evidenceFileInfo?.base64 || '',
        mimeType: fileInfo?.mime || '',
        profile: 'business',
        createdAt: new Date().toISOString(),
        isReimbursement: !!extractedData.isReimbursement,
        // チェックがない場合は空文字にする
        reimbursedBy: extractedData.isReimbursement ? (extractedData.reimbursedBy || '') : '',
        assetType: (extractedData.assetType as any) || 'image'
      };

      const success = await onAdd(finalReceipt);
      if (success) {
        setPendingUpload(null);
        navigate('/history');
      } else {
        alert(t('upload.saveFailed'));
      }
    } catch (e) {
      console.error(e);
      alert(t('upload.errorOccurred'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!pendingUpload && !loadingStep) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
        <div className="text-center px-4">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{t('upload.title')}</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{t('upload.subtitle')}</p>
        </div>
        <div className="px-4">
          <div onClick={() => !loadingStep && fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-[3rem] sm:rounded-[4rem] p-12 sm:p-24 flex flex-col items-center justify-center bg-white hover:border-indigo-500 hover:bg-indigo-50/10 transition-all cursor-pointer shadow-sm group">
            <IconCloudUpload />
            <p className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight text-center">{t('upload.selectReceipt')}</p>
            <input type="file" ref={fileInputRef} onChange={handleAiFileChange} accept="image/*,application/pdf" className="hidden" />
          </div>
        </div>
      </div>
    );
  }

  if (loadingStep || isSaving) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-8">
        <div className="w-20 h-20 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin shadow-lg mx-auto"></div>
        <p className="text-xl font-black text-slate-800 uppercase tracking-widest">{isSaving ? t('upload.savingData') : loadingStep}</p>
      </div>
    );
  }

  // 入力項目のスタイル。日付欄(input[type="date"])も他と揃うようにbox-borderとw-fullを強制
  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500 h-[58px] box-border appearance-none";

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="text-center px-4">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('upload.confirmContent')}</h2>
      </div>
      <div className="px-4">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 sm:p-14 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('upload.titleLabel')}</label>
                  <input 
                    type="text" 
                    value={pendingUpload?.extractedData?.title || ''} 
                    placeholder={t('upload.titlePlaceholder')}
                    className={inputClass} 
                    onChange={(e)=>setPendingUpload({...pendingUpload, extractedData:{...pendingUpload!.extractedData, title:e.target.value}})} 
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('upload.dateLabel')}</label>
                  <input type="date" value={pendingUpload?.extractedData?.date || ''} className={inputClass} onChange={(e)=>setPendingUpload({...pendingUpload, extractedData:{...pendingUpload!.extractedData, date:e.target.value}})} />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('upload.amountLabel')}</label>
                  <input type="number" value={pendingUpload?.extractedData?.amount || 0} className={`${inputClass} text-2xl text-indigo-600 font-black`} onChange={(e)=>setPendingUpload({...pendingUpload, extractedData:{...pendingUpload!.extractedData, amount:Number(e.target.value)}})} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('upload.vendorLabel')}</label>
                  <input type="text" value={pendingUpload?.extractedData?.vendor || ''} className={inputClass} onChange={(e)=>setPendingUpload({...pendingUpload, extractedData:{...pendingUpload!.extractedData, vendor:e.target.value}})} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('upload.categoryLabel')}</label>
                  <div className="relative">
                    <select value={pendingUpload?.extractedData?.category || ''} className={`${inputClass} !pr-10`} onChange={(e)=>setPendingUpload({...pendingUpload, extractedData:{...pendingUpload!.extractedData, category:e.target.value}})}>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('upload.descriptionLabel')}</label>
                  <textarea 
                    value={pendingUpload?.extractedData?.description || ''} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none box-border" 
                    onChange={(e)=>setPendingUpload({...pendingUpload, extractedData:{...pendingUpload!.extractedData, description:e.target.value}})} 
                  />
                </div>

                <div className="col-span-1 md:col-span-2 p-6 bg-orange-50 rounded-3xl border border-orange-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <input type="checkbox" id="check-reim" checked={!!pendingUpload?.extractedData?.isReimbursement} className="w-6 h-6 rounded-lg text-orange-600 focus:ring-orange-500" onChange={(e)=>setPendingUpload({...pendingUpload, extractedData:{...pendingUpload!.extractedData, isReimbursement:e.target.checked}})} />
                    <label htmlFor="check-reim" className="text-sm font-black text-orange-900 uppercase cursor-pointer">{t('upload.reimbursementCheck')}</label>
                  </div>
                  {pendingUpload?.extractedData?.isReimbursement ? (
                    <select value={pendingUpload?.extractedData?.reimbursedBy || ''} className="bg-white border border-orange-200 rounded-xl px-4 py-2 font-black text-xs text-orange-600 outline-none" onChange={(e)=>setPendingUpload({...pendingUpload, extractedData:{...pendingUpload!.extractedData, reimbursedBy:e.target.value}})}>
                      <option value="">{t('upload.selectPerson')}</option>
                      {reimbursementNames.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  ) : (
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-lg">{t('upload.reimbursementStatus')}</span>
                  )}
                </div>

                <div className="col-span-1 md:col-span-2 p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{t('upload.evidenceTitle')}</h4>
                    {pendingUpload.evidenceFileInfo && <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{t('upload.evidenceAttached')}</span>}
                  </div>
                  <button onClick={() => evidenceInputRef.current?.click()} className="w-full py-4 bg-white border border-slate-200 rounded-2xl font-black text-xs text-slate-400 uppercase hover:text-indigo-600 transition-all flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                    {pendingUpload.evidenceFileInfo ? pendingUpload.evidenceFileInfo.name : t('upload.selectEvidence')}
                  </button>
                  <input type="file" ref={evidenceInputRef} onChange={handleEvidenceFileChange} accept="image/*,application/pdf" className="hidden" />
                </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-slate-100">
                <button onClick={() => setPendingUpload(null)} className="flex-1 py-5 bg-slate-100 text-slate-600 font-black rounded-2xl text-xs uppercase tracking-widest transition-all">{t('common.back')}</button>
                <button onClick={handleSaveClick} className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-2xl text-xs uppercase tracking-widest active:scale-95 transition-all">{t('common.save')}</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default UploadSection;

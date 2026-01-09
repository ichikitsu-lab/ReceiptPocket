
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { verifyPasswordForRole, UserRole } from '../services/authService';

interface LoginProps {
  onLogin: (role: UserRole) => void;
  appName: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, appName }) => {
  const { t, i18n } = useTranslation();
  const [selectedRole, setSelectedRole] = useState<'admin' | 'viewer' | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    const isValid = verifyPasswordForRole(password, selectedRole);
    if (isValid) {
      onLogin(selectedRole);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  const roleName = selectedRole === 'admin' ? t('login.adminRole') : t('login.viewerRole');

  const languages = [
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
    { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowLanguageMenu(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-md space-y-10 relative">
        {/* 言語選択ボタン（右上） */}
        <div className="absolute -top-4 right-0 z-50">
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-white text-sm font-bold transition-all"
          >
            <span className="text-xl">{currentLanguage.flag}</span>
            <span className="hidden sm:inline">{currentLanguage.name}</span>
            <svg className={`w-4 h-4 transition-transform ${showLanguageMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* 言語選択ドロップダウン */}
          {showLanguageMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    i18n.language === lang.code
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className="font-bold text-sm">{lang.name}</span>
                  {i18n.language === lang.code && (
                    <svg className="w-5 h-5 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-center space-y-4">
          <div className="inline-flex w-24 h-24 bg-indigo-600 rounded-[2rem] items-center justify-center text-white text-4xl font-black shadow-[0_0_50px_rgba(79,70,229,0.3)] animate-pulse">
            DB
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">{appName}</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.4em]">{t('login.title')}</p>
        </div>

        {!selectedRole ? (
          <div className="space-y-4 animate-in slide-in-from-bottom-4">
             <button 
               onClick={() => setSelectedRole('admin')}
               className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-3xl shadow-xl transition-all active:scale-95 flex flex-col items-center gap-1 group"
             >
               <span className="text-lg uppercase tracking-widest">{t('login.adminMode')}</span>
               <span className="text-[10px] text-indigo-300 group-hover:text-white transition-colors">{t('login.adminDesc')}</span>
             </button>
             <button 
               onClick={() => setSelectedRole('viewer')}
               className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black py-6 rounded-3xl shadow-xl transition-all active:scale-95 flex flex-col items-center gap-1 group"
             >
               <span className="text-lg uppercase tracking-widest">{t('login.viewerMode')}</span>
               <span className="text-[10px] text-slate-500 group-hover:text-slate-300 transition-colors">{t('login.viewerDesc')}</span>
             </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 space-y-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-4 border-b border-white/10 pb-4">
              <button 
                type="button" 
                onClick={() => { setSelectedRole(null); setPassword(""); setError(false); }}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="flex-grow">
                 <h2 className="text-white font-black uppercase text-sm tracking-widest">{t('login.loginWith', { role: roleName })}</h2>
                 <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{t('login.enterPassword')}</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">{t('login.accessKey')}</label>
              <input 
                type="password" 
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.passwordPlaceholder')}
                className={`w-full bg-white/5 border ${error ? 'border-rose-500 animate-shake' : 'border-white/10'} rounded-2xl px-6 py-5 text-center text-3xl text-white font-black tracking-[0.8em] outline-none focus:ring-2 focus:ring-indigo-500 transition-all`}
              />
              {error && <p className="text-center text-rose-400 text-[10px] font-black uppercase tracking-widest mt-2 animate-pulse">{t('login.authFailed')}</p>}
            </div>

            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 text-xs uppercase tracking-[0.2em]"
            >
              {t('login.loginButton')}
            </button>
          </form>
        )}
        
        <div className="text-center">
           <p className="text-[9px] text-slate-700 font-bold uppercase tracking-[0.5em]">{t('login.appSubtitle')}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;

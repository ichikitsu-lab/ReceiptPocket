import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ja from './locales/ja.json';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import de from './locales/de.json';
import es from './locales/es.json';
import it from './locales/it.json';

// ブラウザの言語設定を取得
const getBrowserLanguage = (): string => {
  const lang = navigator.language || 'ja';
  
  // 言語コードを正規化
  if (lang.startsWith('zh')) {
    // 中国語の場合、地域コードを確認
    if (lang.includes('TW') || lang.includes('HK') || lang.includes('Hant')) {
      return 'zh-TW';
    }
    return 'zh-CN';
  }
  
  if (lang.startsWith('en')) {
    return 'en';
  }
  
  if (lang.startsWith('ja')) {
    return 'ja';
  }
  
  if (lang.startsWith('de')) {
    return 'de';
  }
  
  if (lang.startsWith('es')) {
    return 'es';
  }
  
  if (lang.startsWith('it')) {
    return 'it';
  }
  
  return 'ja'; // デフォルトは日本語
};

// ローカルストレージから保存された言語を取得、なければブラウザの言語設定を使用
const savedLanguage = localStorage.getItem('pocket_app_language') || getBrowserLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ja: { translation: ja },
      en: { translation: en },
      'zh-CN': { translation: zhCN },
      'zh-TW': { translation: zhTW },
      de: { translation: de },
      es: { translation: es },
      it: { translation: it }
    },
    lng: savedLanguage,
    fallbackLng: 'ja',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

// 言語変更時にローカルストレージに保存
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('pocket_app_language', lng);
});

export default i18n;


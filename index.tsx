
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n/config'; // i18nの初期化

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // 開発環境やホスティング環境でのパス問題を避けるためルート相対パスで指定
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      },
      (err) => {
        // MIME type error happens if sw.js is not found at the root
        console.log('ServiceWorker registration failed: ', err);
      }
    );
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

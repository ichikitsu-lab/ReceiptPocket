
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // セキュリティのため、API_KEY はクライアントサイドに露出しない
    // Worker の環境変数として設定し、Worker 経由で Gemini API を呼び出す
    'process.env.SYNC_API_URL': JSON.stringify(process.env.SYNC_API_URL),
    'process.env': {}
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
});

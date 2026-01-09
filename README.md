
# 領収書ポケット (Receipt Pocket)

AIを活用したスマートな領収書管理・共有アプリケーションです。Gemini APIによる自動解析と、Cloudflare D1/R2による複数端末間でのリアルタイム同期機能を備えています。

## 🛠️ 環境変数の設定 (重要)

このアプリは領収書の解析に **Google Gemini API** を使用します。Cloudflare環境で動作させるには以下の設定が必要です。

### 1. Gemini APIキーの設定
`services/geminiService.ts` では、`process.env.API_KEY` を通じてAPIキーを参照しています。

**Cloudflare Pages でデプロイする場合:**
1. Cloudflareダッシュボードで Pages プロジェクトを選択します。
2. **「設定」 > 「環境変数」** を開きます。
3. **「変数を追加」** をクリックし、以下の内容を登録して保存します。
   - **変数名**: `API_KEY`
   - **値**: Google AI Studioで取得したAPIキー (`AIza...`)
4. **重要**: 設定後、一度 **「デプロイ」タブから「デプロイを再試行」** を実行して環境変数をビルドに反映させてください。

### 2. 同期サーバーURLの設定
| 変数名 | 説明 | 例 |
| :--- | :--- | :--- |
| `SYNC_API_URL` | デプロイした Worker の URL | `https://your-worker.workers.dev/` |

## 🚀 技術構成
- **Frontend**: React (Vite)
- **AI**: Gemini 2.0 Flash (`gemini-3-flash-preview`)
- **Backend**: Cloudflare Workers + D1 (SQL) + R2 (Storage)

## 📝 セットアップ（データベース準備）
D1コンソールで `SETUP_GUIDE.md` に記載のSQLを実行し、最新のテーブルスキーマ（`isReimbursement` や `assetType` カラムを含む）を作成してください。

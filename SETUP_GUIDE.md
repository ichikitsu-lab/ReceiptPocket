
# 領収書DB セットアップ・不具合解消ガイド

## ⚠️ 重要：SQL実行エラーの解消
最新の同期機能を動作させるために、D1コンソールで以下のSQLを実行してください。

### 1. 設定同期用テーブルの作成
**必ず実行してください:**
```sql
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

### 2. 領収書テーブルのリセット（推奨）
「column missing」エラーが出る場合は、以下を順番に実行してください。

**手順1:**
```sql
DROP TABLE IF EXISTS receipts;
```

**手順2:**
```sql
CREATE TABLE receipts (
  id TEXT PRIMARY KEY,
  title TEXT DEFAULT '',
  date TEXT,
  vendor TEXT,
  amount INTEGER,
  category TEXT,
  paymentMethod TEXT DEFAULT '現金',
  description TEXT,
  referenceUrl TEXT DEFAULT '',
  imageUrl TEXT,
  evidenceUrl TEXT DEFAULT '',
  mimeType TEXT,
  fileHash TEXT,
  profile TEXT,
  createdAt TEXT,
  isReimbursement INTEGER DEFAULT 0,
  reimbursedBy TEXT DEFAULT '',
  assetType TEXT DEFAULT 'image'
);
```

-- Receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  title TEXT,
  date TEXT NOT NULL,
  vendor TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  paymentMethod TEXT,
  description TEXT,
  referenceUrl TEXT,
  imageUrl TEXT,
  evidenceUrl TEXT,
  mimeType TEXT,
  fileHash TEXT,
  profile TEXT,
  createdAt TEXT,
  isReimbursement INTEGER DEFAULT 0,
  reimbursedBy TEXT,
  assetType TEXT DEFAULT 'image'
);

-- Config table
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

export type AppProfile = 'business';

export const DEFAULT_CATEGORIES = ['接待交際費', '旅費交通費', '消耗品費', '通信費', '福利厚生費', '会議費', '仕入高', '地代家賃', 'その他'];

export enum PaymentMethod {
  CASH = '現金',
  CREDIT = 'クレジットカード',
  COD = '代金引換',
  ELECTRONIC = '電子マネー',
  CORPORATE_CARD = '法人カード'
}

export interface TaxDetail {
  rate: 8 | 10;
  amount: number;
}

export interface AppSettings {
  appName: string;
  autoDeleteMonths: number; 
  fiscalYearStartMonth: number;
}

export interface Receipt {
  id: string;
  title: string;
  date: string;
  vendor: string;
  amount: number;
  taxAmount?: number;
  taxDetails?: TaxDetail[];
  registrationNumber?: string;
  category: string;
  paymentMethod: PaymentMethod;
  description: string;
  imageUrl?: string;
  evidenceUrl?: string;
  referenceUrl?: string;
  mimeType?: string;
  fileHash?: string;
  profile: AppProfile;
  createdAt: string;
  synced?: boolean;
  isReimbursement?: boolean;
  reimbursedBy?: string;
  assetType?: 'image' | 'pdf' | 'none';
}

export interface AppData {
  receipts: Receipt[];
  categories: string[];
  settings?: AppSettings;
  monthlyBudget?: number;
  lastSyncedAt?: string;
}

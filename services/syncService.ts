
import { Receipt } from '../types';

const getApiUrl = () => {
  const apiUrl = process.env.SYNC_API_URL;
  if (!apiUrl || apiUrl === "undefined" || apiUrl.includes("process.env")) return null;
  return apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
};

/**
 * クラウドに領収書データを送信（保存）
 */
export const syncToExternalServer = async (receipt: Receipt): Promise<{ success: boolean; url?: string; evidenceUrl?: string }> => {
  const apiUrl = getApiUrl();
  if (!apiUrl) return { success: false };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(receipt),
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true, url: result.url, evidenceUrl: result.evidenceUrl };
    }
    return { success: false };
  } catch (error) {
    console.error('同期エラー:', error);
    throw error;
  }
};

/**
 * 設定（カテゴリーや立替人リスト）をクラウドに保存
 */
export const saveConfigToServer = async (key: string, value: any): Promise<boolean> => {
  const apiUrl = getApiUrl();
  if (!apiUrl) return false;
  try {
    const response = await fetch(`${apiUrl}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    return response.ok;
  } catch (e) {
    console.error('Config save error:', e);
    return false;
  }
};

/**
 * クラウドから全設定を取得
 */
export const fetchConfigFromServer = async (): Promise<any> => {
  const apiUrl = getApiUrl();
  if (!apiUrl) return null;
  try {
    const response = await fetch(`${apiUrl}/config`);
    if (response.ok) return await response.json();
    return null;
  } catch (e) {
    console.error('Config fetch error:', e);
    return null;
  }
};

/**
 * クラウドから全ての領収書データを取得
 */
export const fetchReceiptsFromServer = async (): Promise<Receipt[]> => {
  const apiUrl = getApiUrl();
  if (!apiUrl) return [];

  try {
    const response = await fetch(`${apiUrl}/list`);
    if (response.ok) {
      const results = await response.json();
      return Array.isArray(results) ? results.map((r: any) => ({ ...r, synced: true })) : [];
    }
    return [];
  } catch (error) {
    console.error('取得エラー:', error);
    throw error;
  }
};

/**
 * クラウドから特定の領収書を削除
 * クエリパラメータ方式に変更して安定性を向上
 */
export const deleteFromServer = async (id: string): Promise<boolean> => {
  const apiUrl = getApiUrl();
  if (!apiUrl) return false;
  try {
    const response = await fetch(`${apiUrl}/delete?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    return response.ok;
  } catch (error) {
    console.error('削除エラー:', error);
    throw error;
  }
};

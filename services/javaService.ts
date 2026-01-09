
import { Receipt } from '../types';

/**
 * Cloudflare Workers (R2 ストレージ) へのデータ同期
 * 成功時にサーバーから返却される公開URLを取得して、アプリ側のデータを更新します。
 * エンドポイントは環境変数 SYNC_API_URL から取得します。
 */
export const syncToExternalServer = async (receipt: Receipt): Promise<{ success: boolean; url?: string }> => {
  // 環境変数から取得（デプロイ環境の環境変数設定に依存）
  const apiUrl = process.env.SYNC_API_URL;
  
  if (!apiUrl) {
    console.debug('SYNC_API_URL が設定されていません。同期をスキップします。');
    return { success: false };
  }

  try {
    const imageSize = receipt.imageUrl ? (receipt.imageUrl.length * 0.75) : 0;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...receipt,
        metadata: {
          sizeBytes: imageSize,
          platform: 'cloudflare-r2',
          agent: 'ReceiptPocket-Web'
        },
        timestamp: new Date().toISOString()
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true, url: result.url };
    }
    
    return { success: false };
  } catch (error) {
    console.error('同期ネットワークエラー:', error);
    return { success: false };
  }
};

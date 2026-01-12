import { SupportedLanguage } from '../i18n/aiPrompts';

/**
 * 領収書画像を解析する（Cloudflare Worker 経由で Gemini API を呼び出す）
 * これにより、APIキーがクライアントサイドに露出しない安全な設計になります
 */
export const analyzeReceipt = async (
  base64Data: string, 
  mimeType: string, 
  profile: 'business', 
  categories: string[],
  language: SupportedLanguage = 'ja'
): Promise<any> => {
  // Worker の /analyze エンドポイントを呼び出す
  const workerUrl = process.env.SYNC_API_URL;
  
  if (!workerUrl) {
    throw new Error('SYNC_API_URL が設定されていません');
  }

  const response = await fetch(`${workerUrl}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      base64Data,
      mimeType,
      categories,
      language
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '解析に失敗しました');
  }

  return await response.json();
};

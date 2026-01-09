
import { GoogleGenAI, Type } from "@google/genai";
import { aiPrompts, SupportedLanguage } from '../i18n/aiPrompts';

export const analyzeReceipt = async (
  base64Data: string, 
  mimeType: string, 
  profile: 'business', 
  categories: string[],
  language: SupportedLanguage = 'ja'
): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const allowedCategories = categories.join(', ');
  
  // 選択された言語のプロンプトを使用
  const prompt = aiPrompts[language];
  const promptText = prompt.systemPrompt.replace('{{categories}}', allowedCategories);

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data,
          },
        },
        {
          text: promptText
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING, description: "YYYY-MM-DD" },
          vendor: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          category: { type: Type.STRING },
          paymentMethod: { type: Type.STRING },
          description: { type: Type.STRING, description: prompt.descriptionHint }
        },
        required: ["date", "vendor", "amount", "category", "paymentMethod", "description"]
      }
    }
  });

  return JSON.parse(response.text);
};

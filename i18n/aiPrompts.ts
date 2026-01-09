export type SupportedLanguage = 'ja' | 'en' | 'zh-CN' | 'zh-TW' | 'de' | 'es' | 'it';

interface AIPrompt {
  systemPrompt: string;
  descriptionHint: string;
}

export const aiPrompts: Record<SupportedLanguage, AIPrompt> = {
  ja: {
    systemPrompt: `領収書/レシートの画像を解析し、以下のルールに従ってJSONで出力してください。
1. categoryは必ず次のリストから最も適切なものを1つ選んでください: [{{categories}}]
2. descriptionには、何を購入したか、どのような目的の支出かを推測して、20文字程度の簡潔なメモを日本語で作成してください。
3. 出力項目: date (YYYY-MM-DD), vendor, amount, category, paymentMethod, description`,
    descriptionHint: "支出内容の簡潔な要約メモ（日本語）"
  },
  en: {
    systemPrompt: `Analyze the receipt/invoice image and output JSON according to the following rules:
1. For category, select the most appropriate one from this list: [{{categories}}]
2. For description, infer what was purchased and the purpose of the expense, then create a concise memo of about 20 words in English.
3. Output fields: date (YYYY-MM-DD), vendor, amount, category, paymentMethod, description`,
    descriptionHint: "Brief summary memo of the expense (English)"
  },
  'zh-CN': {
    systemPrompt: `请分析收据/小票图像，并按照以下规则输出JSON格式：
1. category必须从以下列表中选择最合适的一个: [{{categories}}]
2. description请推测购买了什么、支出的目的，用简体中文创建约20字的简洁备注。
3. 输出项目: date (YYYY-MM-DD), vendor, amount, category, paymentMethod, description`,
    descriptionHint: "支出内容的简洁摘要备注（简体中文）"
  },
  'zh-TW': {
    systemPrompt: `請分析收據/小票圖像，並按照以下規則輸出JSON格式：
1. category必須從以下列表中選擇最合適的一個: [{{categories}}]
2. description請推測購買了什麼、支出的目的，用繁體中文創建約20字的簡潔備註。
3. 輸出項目: date (YYYY-MM-DD), vendor, amount, category, paymentMethod, description`,
    descriptionHint: "支出內容的簡潔摘要備註（繁體中文）"
  },
  de: {
    systemPrompt: `Analysieren Sie das Quittungs-/Rechnungsbild und geben Sie JSON gemäß den folgenden Regeln aus:
1. Wählen Sie für category die am besten geeignete aus dieser Liste: [{{categories}}]
2. Schließen Sie für description darauf, was gekauft wurde und den Zweck der Ausgabe, und erstellen Sie eine prägnante Notiz von etwa 20 Wörtern auf Deutsch.
3. Ausgabefelder: date (YYYY-MM-DD), vendor, amount, category, paymentMethod, description`,
    descriptionHint: "Kurze Zusammenfassung der Ausgabe (Deutsch)"
  },
  es: {
    systemPrompt: `Analice la imagen del recibo/factura y genere JSON según las siguientes reglas:
1. Para category, seleccione la más apropiada de esta lista: [{{categories}}]
2. Para description, infiera qué se compró y el propósito del gasto, luego cree una nota concisa de aproximadamente 20 palabras en español.
3. Campos de salida: date (YYYY-MM-DD), vendor, amount, category, paymentMethod, description`,
    descriptionHint: "Nota breve resumen del gasto (Español)"
  },
  it: {
    systemPrompt: `Analizzare l'immagine della ricevuta/fattura e generare JSON secondo le seguenti regole:
1. Per category, selezionare la più appropriata da questo elenco: [{{categories}}]
2. Per description, dedurre cosa è stato acquistato e lo scopo della spesa, quindi creare una nota concisa di circa 20 parole in italiano.
3. Campi di output: date (YYYY-MM-DD), vendor, amount, category, paymentMethod, description`,
    descriptionHint: "Breve nota di riepilogo della spesa (Italiano)"
  }
};



export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const DB = env.DB;
    const BUCKET = env.MY_BUCKET;

    if (!DB || !BUCKET) {
      return new Response(JSON.stringify({ 
        error: "Worker binding error: DB or BUCKET is missing." 
      }), { status: 500, headers: corsHeaders });
    }

    // --- 設定（カテゴリー、メンバー名）の同期エンドポイント ---
    if (request.method === "POST" && url.pathname === "/config") {
      try {
        const { key, value } = await request.json();
        await DB.prepare("INSERT INTO app_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(key, JSON.stringify(value)).run();
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
      }
    }

    if (request.method === "GET" && url.pathname === "/config") {
      try {
        const { results } = await DB.prepare("SELECT * FROM app_config").all();
        const config = {};
        results.forEach(row => { config[row.key] = JSON.parse(row.value); });
        return new Response(JSON.stringify(config), { headers: corsHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
      }
    }

    // --- 領収書の同期エンドポイント ---
    if (request.method === "POST" && url.pathname === "/") {
      try {
        const data = await request.json();
        let publicUrl = data.imageUrl;
        let evidenceUrl = data.evidenceUrl;
        
        // 1. R2 への画像保存
        if (data.imageUrl && data.imageUrl.startsWith('data:')) {
          try {
            const base64Data = data.imageUrl.split(',')[1];
            const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            await BUCKET.put(data.id, binaryData, {
              httpMetadata: { contentType: data.mimeType || 'image/jpeg' }
            });
            publicUrl = `${url.origin}/view/${data.id}`;
          } catch (r2Err) {
            console.error("R2 Upload Error (main):", r2Err);
          }
        }

        if (data.evidenceUrl && data.evidenceUrl.startsWith('data:')) {
          try {
            const evidenceId = `evidence-${data.id}`;
            const base64Data = data.evidenceUrl.split(',')[1];
            const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            await BUCKET.put(evidenceId, binaryData, {
              httpMetadata: { contentType: 'image/jpeg' } 
            });
            evidenceUrl = `${url.origin}/view/${evidenceId}`;
          } catch (r2Err) {
            console.error("R2 Upload Error (evidence):", r2Err);
          }
        }

        // 2. D1 (Database) への保存
        await DB.prepare(`
          INSERT INTO receipts (
            id, title, date, vendor, amount, category, paymentMethod, 
            description, referenceUrl, imageUrl, evidenceUrl, mimeType, fileHash, profile, createdAt,
            isReimbursement, reimbursedBy, assetType
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title=excluded.title, date=excluded.date, vendor=excluded.vendor, 
            amount=excluded.amount, category=excluded.category, paymentMethod=excluded.paymentMethod, 
            description=excluded.description, referenceUrl=excluded.referenceUrl,
            imageUrl=excluded.imageUrl, evidenceUrl=excluded.evidenceUrl, fileHash=excluded.fileHash,
            isReimbursement=excluded.isReimbursement, reimbursedBy=excluded.reimbursedBy, assetType=excluded.assetType
        `).bind(
          data.id, data.title || '', data.date, data.vendor, data.amount, data.category, 
          data.paymentMethod || '現金', data.description || '', data.referenceUrl || '', publicUrl || '', 
          evidenceUrl || '', data.mimeType || 'image/jpeg', data.fileHash || '', data.profile || 'business', data.createdAt,
          data.isReimbursement ? 1 : 0, data.reimbursedBy || '', data.assetType || 'image'
        ).run();

        return new Response(JSON.stringify({ success: true, url: publicUrl, evidenceUrl: evidenceUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: `保存失敗: ${e.message}` }), { status: 500, headers: corsHeaders });
      }
    }

    if (request.method === "GET" && url.pathname === "/list") {
      try {
        const { results } = await DB.prepare("SELECT * FROM receipts ORDER BY date DESC, createdAt DESC").all();
        const processed = results.map(r => ({ ...r, isReimbursement: !!r.isReimbursement }));
        return new Response(JSON.stringify(processed || []), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: `取得失敗: ${e.message}` }), { status: 500, headers: corsHeaders });
      }
    }

    // 削除エンドポイントの改善: パス解析の不確実性を避けるためクエリパラメータを使用
    if (request.method === "DELETE" && (url.pathname === "/delete" || url.pathname.startsWith("/delete/"))) {
      let id = url.searchParams.get("id");
      if (!id) {
        // フォールバック: パスから取得
        id = url.pathname.split("/").pop();
      }
      
      if (!id) return new Response(JSON.stringify({ error: "IDが必要です" }), { status: 400, headers: corsHeaders });

      try {
        // D1から削除
        await DB.prepare("DELETE FROM receipts WHERE id = ?").bind(id).run();
        // R2から削除（失敗しても無視）
        try { await BUCKET.delete(id); await BUCKET.delete(`evidence-${id}`); } catch (r2Err) {}
        
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ error: `削除失敗: ${e.message}` }), { status: 500, headers: corsHeaders });
      }
    }

    if (url.pathname.startsWith("/view/")) {
      const id = url.pathname.split("/")[2];
      try {
        const object = await BUCKET.get(id);
        if (!object) return new Response("Not Found", { status: 404, headers: corsHeaders });
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Cache-Control", "public, max-age=31536000");
        return new Response(object.body, { headers });
      } catch (e) {
        return new Response(e.message, { status: 500, headers: corsHeaders });
      }
    }

    // --- Gemini API を使った領収書解析エンドポイント ---
    if (request.method === "POST" && url.pathname === "/analyze") {
      try {
        const { base64Data, mimeType, categories, language } = await request.json();
        
        // Worker の環境変数から Gemini API キーを取得
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ 
            error: "GEMINI_API_KEY が設定されていません" 
          }), { status: 500, headers: corsHeaders });
        }

        // 言語別のプロンプトを定義
        const prompts = {
          ja: `領収書/レシートの画像を解析し、以下のルールに従ってJSONで出力してください。
1. categoryは必ず次のリストから最も適切なものを1つ選んでください: [${categories.join(', ')}]
2. descriptionには、何を購入したか、どのような目的の支出かを推測して、20文字程度の簡潔なメモを日本語で作成してください。
3. 出力項目: date (YYYY-MM-DD), vendor, amount, category, paymentMethod, description`,
          en: `Analyze the receipt/invoice image and output JSON according to the following rules:
1. For category, select the most appropriate one from this list: [${categories.join(', ')}]
2. For description, infer what was purchased and the purpose of the expense, then create a concise memo of about 20 words in English.
3. Output fields: date (YYYY-MM-DD), vendor, amount, category, paymentMethod, description`,
          'zh-CN': `请分析收据/小票图像，并按照以下规则输出JSON格式：
1. category必须从以下列表中选择最合适的一个: [${categories.join(', ')}]
2. description请推测购买了什么、支出的目的，用简体中文创建约20字的简洁备注。
3. 输出项目: date (YYYY-MM-DD), vendor, amount, category, paymentMethod, description`,
          'zh-TW': `請分析收據/小票圖像，並按照以下規則輸出JSON格式：
1. category必須從以下列表中選擇最合適的一個: [${categories.join(', ')}]
2. description請推測購買了什麼、支出的目的，用繁體中文創建約20字的簡潔備註。
3. 輸出項目: date (YYYY-MM-DD), vendor, amount, category, paymentMethod, description`,
          de: `Analysieren Sie das Quittungs-/Rechnungsbild und geben Sie JSON gemäß den folgenden Regeln aus:
1. Wählen Sie für category die am besten geeignete aus dieser Liste: [${categories.join(', ')}]
2. Schließen Sie für description darauf, was gekauft wurde und den Zweck der Ausgabe, und erstellen Sie eine prägnante Notiz von etwa 20 Wörtern auf Deutsch.
3. Ausgabefelder: date (YYYY-MM-DD), vendor, amount, category, paymentMethod, description`,
          es: `Analice la imagen del recibo/factura y genere JSON según las siguientes reglas:
1. Para category, seleccione la más apropiada de esta lista: [${categories.join(', ')}]
2. Para description, infiera qué se compró y el propósito del gasto, luego cree una nota concisa de aproximadamente 20 palabras en español.
3. Campos de salida: date (YYYY-MM-DD), vendor, amount, category, paymentMethod, description`,
          it: `Analizzare l'immagine della ricevuta/fattura e generare JSON secondo le seguenti regole:
1. Per category, selezionare la più appropriata da questo elenco: [${categories.join(', ')}]
2. Per description, dedurre cosa è stato acquistato e lo scopo della spesa, quindi creare una nota concisa di circa 20 parole in italiano.
3. Campi di output: date (YYYY-MM-DD), vendor, amount, category, paymentMethod, description`
        };

        const promptText = prompts[language] || prompts.ja;

        // Gemini API を呼び出し (v1beta API と gemini-1.5-flash モデルを使用)
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data
                    }
                  },
                  { text: promptText }
                ]
              }],
              generationConfig: {
                response_mime_type: "application/json",
                response_schema: {
                  type: "object",
                  properties: {
                    date: { type: "string", description: "YYYY-MM-DD" },
                    vendor: { type: "string" },
                    amount: { type: "number" },
                    category: { type: "string" },
                    paymentMethod: { type: "string" },
                    description: { type: "string" }
                  },
                  required: ["date", "vendor", "amount", "category", "paymentMethod", "description"]
                }
              }
            })
          }
        );

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          return new Response(JSON.stringify({ 
            error: `Gemini API エラー: ${geminiResponse.status} - ${errorText}` 
          }), { status: geminiResponse.status, headers: corsHeaders });
        }

        const geminiData = await geminiResponse.json();
        
        // Gemini のレスポンスから JSON を抽出
        const resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!resultText) {
          return new Response(JSON.stringify({ 
            error: "Gemini API からの応答が不正です" 
          }), { status: 500, headers: corsHeaders });
        }

        const parsedResult = JSON.parse(resultText);
        
        return new Response(JSON.stringify(parsedResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ 
          error: `解析失敗: ${e.message}` 
        }), { status: 500, headers: corsHeaders });
      }
    }

    return new Response("Receipt Pocket API", { headers: corsHeaders });
  }
};

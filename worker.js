
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

    return new Response("Receipt Pocket API", { headers: corsHeaders });
  }
};

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

// OpSec sanitizer: redact any sensitive API keys, tokens, or bearer headers from errors
function sanitizeOpSecError(error: any): string {
  let msg = error?.message || String(error);
  // Redact Google AI API keys
  msg = msg.replace(/AIza[0-9A-Za-z_-]{35}/g, '[REDACTED_API_KEY]');
  msg = msg.replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]');
  // Redact Telegram bot tokens
  msg = msg.replace(/bot[0-9]{8,10}:[a-zA-Z0-9_-]{35}/gi, 'bot[REDACTED_TOKEN]');
  // Redact Authorization headers
  msg = msg.replace(/Bearer\s+[A-Za-z0-9_-]+/gi, 'Bearer [REDACTED]');
  return msg;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors());
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", defaultModel: "gemini-3.8-flash" });
  });

  // API proxy route for Google Gemini
  app.post("/api/gemini", async (req, res) => {
    try {
      let apiKey = process.env.GEMINI_API_KEY;
      
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const clientKey = authHeader.substring(7).trim();
        if (clientKey) {
          apiKey = clientKey;
        }
      }

      if (!apiKey) {
        return res.status(400).json({ 
          error: { 
            message: "Ralat Kebenaran (API Permission Denied): Tiada API Key ditemui pada pelayan atau tetapan anda." 
          } 
        });
      }

      const { method, model, contents, prompt, config } = req.body;
      const ai = new GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      if (method === "generateImages") {
        if (!model || !prompt) {
          return res.status(400).json({ error: { message: "Model dan prompt diperlukan untuk generateImages." } });
        }
        console.log(`🎨 Backend calling Imagen model: ${model}`);

        const imagenFallbackList = Array.from(new Set([
          model,
          "imagen-3.0-generate-002",
          "imagen-3.0-fast-generate-001",
          "imagen-3.0-generate-001"
        ]));

        let lastImagenError: any = null;
        for (const targetImagenModel of imagenFallbackList) {
          try {
            console.log(`🎨 Attempting Imagen model: ${targetImagenModel}`);
            const response = await ai.models.generateImages({
              model: targetImagenModel,
              prompt,
              config
            });
            return res.json(response);
          } catch (err: any) {
            console.warn(`⚠️ Imagen model ${targetImagenModel} failed:`, err?.message || err);
            lastImagenError = err;
          }
        }

        return res.status(404).json({
          error: {
            message: lastImagenError?.message || "Penjana imej Imagen tidak disokong pada API Key ini."
          }
        });
      } else {
        if (!model || !contents) {
          return res.status(400).json({ 
            error: { message: "Model dan kandungan (contents) diperlukan." } 
          });
        }
        console.log(`🤖 Backend calling Gemini model: ${model}`);
        
        // Safe and approved fallback models list in order of preference (prioritizing active supported models)
        const safeFallbacks = [
          "gemini-3.8-flash",
          "gemini-flash-latest",
          "gemini-3.7-flash",
          "gemini-2.5-flash",
          "gemini-2.5-flash-lite",
          "gemini-2.5-pro",
          "gemini-3.1-flash-lite",
          "gemini-3.1-pro-preview"
        ];

        const modelFallbackList = [model];
        for (const fallback of safeFallbacks) {
          if (!modelFallbackList.includes(fallback)) {
            modelFallbackList.push(fallback);
          }
        }

        const uniqueModels = Array.from(new Set(modelFallbackList));
        let response = null;
        let lastError: any = null;

        for (const targetModel of uniqueModels) {
          try {
            if (targetModel !== model) {
              console.log(`🔄 Attempting fallback model: ${targetModel} due to high demand or failure on previous attempt`);
            }

            // Protect from thinkingConfig on non-supported models
            let activeConfig = config;
            if (activeConfig) {
              const isGemini3 = targetModel.includes("gemini-3");
              if (!isGemini3) {
                activeConfig = { ...activeConfig };
                if (activeConfig.thinkingConfig) {
                  delete activeConfig.thinkingConfig;
                }
                if (activeConfig.thinkingLevel) {
                  delete activeConfig.thinkingLevel;
                }
              }
            }

            response = await ai.models.generateContent({
              model: targetModel,
              contents,
              config: activeConfig
            });
            break; // Success! Break out of the loop
          } catch (err: any) {
            lastError = err;
            const errStatus = err?.status || err?.code || 500;
            const errMsg = err?.message || String(err);
            console.log(`ℹ️ Model ${targetModel} attempt failed (Status ${errStatus}): ${errMsg}`);
          }
        }

        if (!response) {
          throw lastError || new Error(`Sistem gagal mengakses model Gemini ${model} dan semua fallback dialiri ralat.`);
        }

        return res.json({ text: response.text });
      }
    } catch (error: any) {
      console.error("Gemini server proxy error:", error);
      const statusCode = error?.status || 500;
      res.status(statusCode).json({
        error: {
          message: sanitizeOpSecError(error),
          status: error?.status,
          code: error?.code || statusCode
        }
      });
    }
  });

  // API proxy route for Telegram
  app.all(["/api/telegram/send", "/api/telegram/send/"], async (req, res) => {
    try {
      const payload = (req.method === 'GET' ? req.query : req.body) || {};
      const { text, mediaUrls, rawImages, clientBotToken, clientChatId } = payload;
      const botToken = (clientBotToken || process.env.TELEGRAM_BOT_TOKEN || '').toString().trim();
      const chatId = (clientChatId || process.env.TELEGRAM_CHAT_ID || '').toString().trim();

      if (!botToken || !chatId) {
        return res.status(400).json({
          error: { message: "Telegram Bot Token dan Chat ID diperlukan. Sila masukkan dalam tetapan eksport atau tetapkan TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID dalam fail persekitaran (.env)." }
        });
      }

      // Safe HTML chunker for Telegram ensuring tags like <b>, <i>, <code>, <a> are balanced
      const chunkHtmlText = (str: string, maxLength: number = 3800): string[] => {
        if (!str || str.length <= maxLength) return [str || ''];
        
        const lines = str.split('\n');
        const chunks: string[] = [];
        let currentChunk = '';

        for (const line of lines) {
          if ((currentChunk + '\n' + line).length > maxLength) {
            if (currentChunk.trim()) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = line;
          } else {
            currentChunk = currentChunk ? (currentChunk + '\n' + line) : line;
          }
        }
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }

        // Repair unclosed HTML tags across split chunks
        return chunks.map(chunk => {
          let fixedChunk = chunk;
          const openTags: string[] = [];
          const tagRegex = /<\/?([a-zA-Z0-9]+)(?:\s+[^>]*?)?>/g;
          let match;

          while ((match = tagRegex.exec(chunk)) !== null) {
            const isClosing = match[0].startsWith('</');
            const tagName = match[1].toLowerCase();
            if (['b', 'i', 'code', 'pre', 'a', 'u', 's'].includes(tagName)) {
              if (isClosing) {
                const idx = openTags.lastIndexOf(tagName);
                if (idx !== -1) openTags.splice(idx, 1);
              } else {
                openTags.push(tagName);
              }
            }
          }

          // Close any open tags at the end of this chunk
          for (let i = openTags.length - 1; i >= 0; i--) {
            fixedChunk += `</${openTags[i]}>`;
          }
          return fixedChunk;
        });
      };

      // Helper to strip HTML tags for plain text fallback
      const stripHtml = (html: string) => {
        return html
          .replace(/<br\s*[\/]?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'");
      };

      // 1. Send text chunks with automatic plain text fallback on entity parse error
      if (text) {
          const chunks = chunkHtmlText(text, 3800);
          for (const chunk of chunks) {
              let response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      chat_id: chatId,
                      text: chunk,
                      parse_mode: 'HTML'
                  })
              });

              if (!response.ok) {
                  let errorDescription = 'Ralat tidak diketahui';
                  let isParseError = false;
                  try {
                      const errorData = await response.json();
                      errorDescription = errorData.description || JSON.stringify(errorData);
                      if (errorDescription.includes("can't parse entities") || errorDescription.includes("tag")) {
                          isParseError = true;
                      }
                  } catch (e) {
                      const textError = await response.text();
                      errorDescription = `Status ${response.status}: ${textError.substring(0, 200)}`;
                  }

                  // If HTML parse error, retry with plain text (without parse_mode)
                  if (isParseError) {
                      console.warn("⚠️ Telegram HTML parse error. Retrying with plain text fallback...");
                      const plainChunk = stripHtml(chunk);
                      response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                              chat_id: chatId,
                              text: plainChunk
                          })
                      });
                  }

                  if (!response.ok) {
                      let finalErr = errorDescription;
                      try {
                          const errJson = await response.json();
                          finalErr = errJson.description || finalErr;
                      } catch (_) {}
                      
                      if (finalErr.includes("chat not found")) {
                          finalErr += " (Petunjuk: Jika ID Kumpulan/Saluran, pastikan ia bermula dengan tanda '-' seperti -100xxxx. Pastikan Bot telah dimasukkan ke dalam kumpulan/saluran tersebut sebagai Admin).";
                      } else if (finalErr.includes("Unauthorized") || finalErr.includes("Not Found")) {
                          finalErr += " (Petunjuk: Sila periksa semula Telegram Bot Token anda dari @BotFather).";
                      }
                      throw new Error(`Telegram Text Error: ${finalErr}`);
                  }
              }
          }
      }

      // 2. Send media photos directly via multipart upload if raw base64 images provided
      if (rawImages && Array.isArray(rawImages) && rawImages.length > 0) {
          const validBase64List = rawImages.filter(img => typeof img === 'string' && img.length > 50);
          if (validBase64List.length > 0) {
              try {
                  const fd = new FormData();
                  fd.append("chat_id", chatId);
                  const mediaMeta = validBase64List.map((_, idx) => ({
                      type: 'photo',
                      media: `attach://photo_${idx}`
                  }));
                  fd.append("media", JSON.stringify(mediaMeta));

                  validBase64List.forEach((base64Str, idx) => {
                      const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                      const type = matches ? matches[1] : 'image/jpeg';
                      const dataPart = matches ? matches[2] : base64Str;
                      const buffer = Buffer.from(dataPart, 'base64');
                      const ext = type.includes('png') ? 'png' : 'jpg';
                      fd.append(`photo_${idx}`, new Blob([buffer], { type }), `specimen_${idx}.${ext}`);
                  });

                  const mediaResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
                      method: 'POST',
                      body: fd
                  });

                  if (!mediaResponse.ok) {
                      const errData = await mediaResponse.json().catch(() => ({}));
                      console.warn("⚠️ Direct raw images sendMediaGroup warning:", errData?.description || mediaResponse.statusText);
                  }
              } catch (rawMediaErr: any) {
                  console.warn("⚠️ Failed to send raw media group to Telegram:", rawMediaErr?.message || rawMediaErr);
              }
          }
      } else if (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0) {
          // 3. Fallback: Send media groups by public URLs if provided
          const validUrls = mediaUrls.filter(u => typeof u === 'string' && u.startsWith('http'));
          const chunks = [];
          for (let i = 0; i < validUrls.length; i += 10) {
              chunks.push(validUrls.slice(i, i + 10));
          }
          for (const chunk of chunks) {
              const mediaGroup = chunk.map(url => ({
                  type: 'photo',
                  media: url
              }));
              try {
                  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          chat_id: chatId,
                          media: mediaGroup
                      })
                  });
                  if (!response.ok) {
                      let errorDescription = 'Ralat media tidak diketahui';
                      try {
                          const errorData = await response.json();
                          errorDescription = errorData.description || JSON.stringify(errorData);
                      } catch (e) {
                          const textError = await response.text();
                          errorDescription = `Status ${response.status}: ${textError.substring(0, 200)}`;
                      }
                      console.warn("⚠️ Telegram Media Group warning:", errorDescription);
                  }
              } catch (mediaErr: any) {
                  console.warn("⚠️ Failed to send media group to Telegram:", mediaErr?.message || mediaErr);
              }
          }
      }

      return res.json({ success: true, message: "Laporan berjaya dihantar ke Telegram." });
    } catch (error: any) {
      console.error("Telegram proxy error:", error);
      res.status(500).json({
        error: { message: sanitizeOpSecError(error) }
      });
    }
  });

  // API proxy route for Telegraph Upload with Multi-Provider Fallbacks
  app.all(["/api/telegraph/upload", "/api/telegraph/upload/"], async (req, res) => {
    try {
      const payload = (req.method === 'GET' ? req.query : req.body) || {};
      const { image } = payload;
      if (!image) {
        return res.status(400).json({ error: "Tiada imej diberikan." });
      }

      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const type = matches ? matches[1] : 'image/jpeg';
      const base64Data = matches ? matches[2] : image;
      const buffer = Buffer.from(base64Data, 'base64');
      const ext = type.includes('png') ? 'png' : 'jpg';

      // 1. Primary: Litterbox (Catbox) - High speed, 72h retention, reliable for Telegraph embedding
      try {
        const fd = new FormData();
        fd.append("reqtype", "fileupload");
        fd.append("time", "72h");
        fd.append("fileToUpload", new Blob([buffer], { type }), `vectorguard_${Date.now()}.${ext}`);
        
        const catboxRes = await fetch("https://litterbox.catbox.moe/resources/internals/api.php", {
          method: "POST",
          body: fd,
          signal: AbortSignal.timeout(12000)
        });

        if (catboxRes.ok) {
          const directUrl = (await catboxRes.text()).trim();
          if (directUrl.startsWith("http")) {
            return res.json({ url: directUrl });
          }
        }
      } catch (catboxErr: any) {
        console.warn("⚠️ Litterbox upload failed, trying Tmpfiles:", catboxErr?.message || catboxErr);
      }

      // 2. Secondary: Tmpfiles.org
      try {
        const fdTmp = new FormData();
        fdTmp.append("file", new Blob([buffer], { type }), `vectorguard_${Date.now()}.${ext}`);
        
        const tmpRes = await fetch("https://tmpfiles.org/api/v1/upload", {
          method: "POST",
          body: fdTmp,
          signal: AbortSignal.timeout(12000)
        });

        if (tmpRes.ok) {
          const tmpData = await tmpRes.json();
          if (tmpData && tmpData.data && tmpData.data.url) {
            const directUrl = tmpData.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
            return res.json({ url: directUrl });
          }
        }
      } catch (tmpErr: any) {
        console.warn("⚠️ Tmpfiles upload failed, trying Freeimage:", tmpErr?.message || tmpErr);
      }

      // 3. Tertiary: Freeimage.host with direct timeout guard
      try {
        const fdFree = new FormData();
        fdFree.append('source', new Blob([buffer], { type }), `image.${ext}`);
        fdFree.append('type', 'file');
        fdFree.append('action', 'upload');
        fdFree.append('format', 'json');
        fdFree.append('key', '6d207e02198a847aa98d0a2a901485a5');

        const freeRes = await fetch('https://freeimage.host/api/1/upload', {
          method: 'POST',
          body: fdFree,
          signal: AbortSignal.timeout(8000)
        });

        if (freeRes.ok) {
          const freeData = await freeRes.json();
          if (freeData?.image?.url) {
            return res.json({ url: freeData.image.url });
          }
        }
      } catch (freeErr) {}

      throw new Error("Semua pelayan hos imej sementara gagal. Sila cuba sebentar lagi.");
    } catch (error: any) {
      console.error("Image upload proxy error:", error);
      res.status(500).json({ error: error?.message || String(error) });
    }
  });

  // API proxy route for Telegraph createAccount (Bypass CORS)
  app.all(["/api/telegraph/createAccount", "/api/telegraph/createAccount/"], async (req, res) => {
    try {
      const payload = (req.method === 'GET' ? req.query : req.body) || {};
      const { authorName } = payload;
      const rawAuthor = (authorName || 'VectorGuard AI').toString().trim();
      // Telegraph requires short_name to be 1-32 chars alphanumeric/underscore
      const shortName = rawAuthor.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30) || 'VectorGuard';
      const cleanAuthorName = rawAuthor.substring(0, 120) || 'VectorGuard AI';

      const response = await fetch(`https://api.telegra.ph/createAccount?short_name=${encodeURIComponent(shortName)}&author_name=${encodeURIComponent(cleanAuthorName)}`);
      const data = await response.json();
      if (data.ok) {
        return res.json(data);
      }
      throw new Error(data.error || 'Failed to create Telegraph account');
    } catch (error: any) {
      console.error("Telegraph account proxy error:", error);
      res.status(500).json({ error: error?.message || String(error) });
    }
  });

  // API proxy route for Telegraph createPage (Bypass CORS)
  app.all(["/api/telegraph/createPage", "/api/telegraph/createPage/"], async (req, res) => {
    try {
      const payload = (req.method === 'GET' ? req.query : req.body) || {};
      const { accessToken, title, authorName, content } = payload;
      const safeTitle = (title || 'Laporan Pemeriksaan Vektor & Kebersihan').toString().substring(0, 250);
      const safeAuthor = (authorName || 'VectorGuard AI').toString().substring(0, 120);

      const parsedContent = typeof content === 'string' ? JSON.parse(content) : (content || []);

      const response = await fetch('https://api.telegra.ph/createPage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            access_token: accessToken,
            title: safeTitle,
            author_name: safeAuthor,
            content: JSON.stringify(parsedContent),
            return_content: false
        })
      });
      const data = await response.json();
      if (data.ok) {
        return res.json(data);
      }
      throw new Error(data.error || 'Failed to create Telegraph page');
    } catch (error: any) {
      console.error("Telegraph page proxy error:", error);
      res.status(500).json({ error: error?.message || String(error) });
    }
  });

  // Local uploads directory & static serving
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsDir));

  // Shared sessions storage
  const SESSIONS_FILE = path.join(uploadsDir, "shared_sessions.json");

  const loadSharedSessions = (): any[] => {
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        const raw = fs.readFileSync(SESSIONS_FILE, "utf-8");
        return JSON.parse(raw) || [];
      }
    } catch (err) {
      console.warn("⚠️ Ralat membaca fail sesi:", err);
    }
    return [];
  };

  const saveSharedSessions = (sessions: any[]) => {
    try {
      const trimmed = sessions.slice(0, 50); // Simpan sehingga 50 sesi terkini
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(trimmed, null, 2), "utf-8");
    } catch (err) {
      console.warn("⚠️ Ralat menyimpan fail sesi:", err);
    }
  };

  // Endpoint to upload and host images (Cloud + Server mirror)
  app.post("/api/upload-image", async (req, res) => {
    try {
      const { image, name } = req.body || {};
      if (!image || typeof image !== "string") {
        return res.status(400).json({ error: "Tiada imej dibekalkan." });
      }

      if (image.startsWith("http://") || image.startsWith("https://")) {
        return res.json({ url: image });
      }

      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const type = matches ? matches[1] : "image/jpeg";
      const base64Data = matches ? matches[2] : image;
      const buffer = Buffer.from(base64Data, "base64");
      const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
      const safePrefix = (name || "vg").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 20);
      const filename = `${safePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

      // 1. Simpan salinan tempatan di pelayan
      const localFilePath = path.join(uploadsDir, filename);
      fs.writeFileSync(localFilePath, buffer);
      const localUrl = `/uploads/${filename}`;

      // 2. Muat naik ke Litterbox (Catbox) / Tmpfiles sebagai cermin awan HTTPS
      let cloudUrl = localUrl;
      try {
        const fd = new FormData();
        fd.append("reqtype", "fileupload");
        fd.append("time", "72h");
        fd.append("fileToUpload", new Blob([buffer], { type }), filename);

        const catboxRes = await fetch("https://litterbox.catbox.moe/resources/internals/api.php", {
          method: "POST",
          body: fd,
          signal: AbortSignal.timeout(6000)
        });

        if (catboxRes.ok) {
          const directUrl = (await catboxRes.text()).trim();
          if (directUrl.startsWith("http")) {
            cloudUrl = directUrl;
          }
        }
      } catch (mirrorErr) {
        console.warn("⚠️ Cermin awan gagal, menggunakan hos pelayan tempatan:", mirrorErr);
      }

      return res.json({ url: cloudUrl, localUrl });
    } catch (err: any) {
      console.error("Ralat /api/upload-image:", err);
      return res.status(500).json({ error: err.message || "Gagal memproses imej" });
    }
  });

  // Endpoints for shared sessions across all devices
  app.get("/api/shared-sessions", (req, res) => {
    const sessions = loadSharedSessions();
    return res.json({ sessions });
  });

  app.get("/api/shared-sessions/:id", (req, res) => {
    const { id } = req.params;
    const sessions = loadSharedSessions();
    const found = sessions.find((s: any) => s.id === id);
    if (found) {
      return res.json({ session: found });
    }
    return res.status(404).json({ error: "Sesi tidak ditemui" });
  });

  app.post("/api/shared-sessions", (req, res) => {
    try {
      const session = req.body;
      if (!session || !session.id) {
        return res.status(400).json({ error: "Sesi tidak sah" });
      }
      const current = loadSharedSessions();
      const existingIdx = current.findIndex((s: any) => s.id === session.id);
      if (existingIdx >= 0) {
        current[existingIdx] = { ...current[existingIdx], ...session };
      } else {
        current.unshift(session);
      }
      saveSharedSessions(current);
      return res.json({ success: true, count: current.length });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Gagal menyimpan sesi" });
    }
  });

  app.delete("/api/shared-sessions/:id", (req, res) => {
    try {
      const { id } = req.params;
      const current = loadSharedSessions();
      const filtered = current.filter((s: any) => s.id !== id);
      saveSharedSessions(filtered);
      return res.json({ success: true, count: filtered.length });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Gagal memadam sesi" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Using simple * for Express 4, fallback to index.html for SPA routing
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

import express from "express";
import path from "path";
import fs from "fs";
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

// SSRF Protection: Block private IPs, loopback, cloud metadata services, and internal hostnames
const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./,
  /^100\.100\.100\.200$/,
  /^0\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^\[::1\]$/,
  /^\[?fe80:/i,
  /^\[?fc00:/i,
  /^\[?fd[0-9a-f]{2}:/i,
  /^\[?::ffff:(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.)/i,
  /^metadata\.google\.internal$/i,
  /^metadata$/i,
  /\.internal$/i,
  /\.local$/i
];

function isSafeExternalImageUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    for (const pattern of BLOCKED_HOST_PATTERNS) {
      if (pattern.test(hostname)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

// LFI / Path Traversal Protection: Ensure local upload paths stay strictly inside /uploads and only target safe image extensions
const ALLOWED_UPLOAD_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function resolveSafeUploadPath(rawInput: string): string | null {
  try {
    const uploadsRoot = path.resolve(process.cwd(), "uploads");
    const cleanInput = rawInput.trim().replace(/^\/+/, "");
    if (!cleanInput.startsWith("uploads/")) return null;
    const fileName = path.basename(cleanInput);
    if (!fileName || fileName.includes("..") || fileName.startsWith(".")) return null;
    const ext = path.extname(fileName).toLowerCase();
    if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) return null;
    const resolved = path.resolve(uploadsRoot, fileName);
    if (!resolved.startsWith(uploadsRoot + path.sep)) return null;
    return resolved;
  } catch {
    return null;
  }
}

// Convert any URLs, data URLs, or local file paths in inlineData to pure base64
async function sanitizeGeminiContents(contents: any): Promise<any> {
  if (!contents) return contents;

  const sanitizePart = async (part: any) => {
    if (!part || typeof part !== "object") return part;
    
    // Check inlineData or inline_data
    const inlineData = part.inlineData || part.inline_data;
    if (inlineData && typeof inlineData.data === "string") {
      let rawData = inlineData.data.trim();
      
      // 1. If it's a data URL like data:image/jpeg;base64,xxxx
      if (rawData.startsWith("data:")) {
        const commaIdx = rawData.indexOf(",");
        if (commaIdx !== -1) {
          const prefix = rawData.substring(0, commaIdx);
          const mimeMatch = prefix.match(/data:([^;]+)/);
          if (mimeMatch && mimeMatch[1]) {
            inlineData.mimeType = mimeMatch[1];
          }
          rawData = rawData.substring(commaIdx + 1);
        }
      }
      
      // 2. If it's an HTTP/HTTPS URL (Protected against SSRF)
      if (rawData.startsWith("http://") || rawData.startsWith("https://")) {
        if (!isSafeExternalImageUrl(rawData)) {
          console.warn(`🛑 Blocked unsafe SSRF image URL in Gemini inlineData`);
          rawData = "";
        } else {
          try {
            const fetchRes = await fetch(rawData, { signal: AbortSignal.timeout(15000) });
            if (fetchRes.url && !isSafeExternalImageUrl(fetchRes.url)) {
              console.warn(`🛑 Blocked unsafe SSRF redirect URL in Gemini inlineData`);
              rawData = "";
            } else if (fetchRes.ok) {
              const contentType = fetchRes.headers.get("content-type");
              if (contentType && !contentType.includes("text")) {
                inlineData.mimeType = contentType.split(";")[0].trim();
              }
              const arrayBuf = await fetchRes.arrayBuffer();
              if (arrayBuf.byteLength <= 15 * 1024 * 1024) {
                rawData = Buffer.from(arrayBuf).toString("base64");
              }
            }
          } catch (fetchErr) {
            console.warn(`⚠️ Ralat memuat turun URL imej untuk Gemini inlineData:`, sanitizeOpSecError(fetchErr));
          }
        }
      } else if (rawData.startsWith("/uploads/") || rawData.startsWith("uploads/")) {
        // 3. Local uploaded file (Protected against LFI / Path Traversal)
        const safeLocalPath = resolveSafeUploadPath(rawData);
        if (safeLocalPath && fs.existsSync(safeLocalPath)) {
          try {
            const buf = fs.readFileSync(safeLocalPath);
            rawData = buf.toString("base64");
            const ext = path.extname(safeLocalPath).toLowerCase();
            if (ext === ".png") inlineData.mimeType = "image/png";
            else if (ext === ".webp") inlineData.mimeType = "image/webp";
            else inlineData.mimeType = "image/jpeg";
          } catch (readErr) {
            console.warn(`⚠️ Ralat membaca fail imej tempatan untuk Gemini inlineData`);
          }
        } else {
          rawData = "";
        }
      }
      
      inlineData.data = rawData;
    }
    return part;
  };

  // If contents is an array
  if (Array.isArray(contents)) {
    for (const item of contents) {
      if (item && Array.isArray(item.parts)) {
        for (const p of item.parts) {
          await sanitizePart(p);
        }
      } else if (item && item.parts) {
        await sanitizePart(item.parts);
      }
    }
  } else if (contents && typeof contents === "object") {
    if (Array.isArray(contents.parts)) {
      for (const p of contents.parts) {
        await sanitizePart(p);
      }
    } else if (contents.parts) {
      await sanitizePart(contents.parts);
    }
  }

  return contents;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Hide Express server fingerprint
  app.disable("x-powered-by");

  // In-memory sliding window rate limiter per IP for API protection
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  const apiRateLimiter = (maxRequests: number, windowMs: number) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
      const key = `${clientIp}:${req.baseUrl || req.path}`;
      const now = Date.now();
      const entry = rateLimitMap.get(key);
      if (!entry || now > entry.resetAt) {
        rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
        return next();
      }
      entry.count += 1;
      if (entry.count > maxRequests) {
        res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
        return res.status(429).json({
          error: { message: "Terlalu banyak permintaan dalam masa singkat (Rate Limit Protection). Sila tunggu sebentar." }
        });
      }
      return next();
    };
  };

  // Security Headers & CORS Middleware
  app.use(cors());
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    // Defensive HTTP Security Headers (preserving AI Studio preview iframe compatibility)
    res.header("X-Content-Type-Options", "nosniff");
    res.header("Referrer-Policy", "strict-origin-when-cross-origin");
    res.header("X-DNS-Prefetch-Control", "off");
    res.header("Permissions-Policy", "geolocation=(self), camera=(self), microphone=()");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", defaultModel: "gemini-3.8-flash" });
  });

  // API proxy route for Google Gemini (Protected by Rate Limiter)
  app.post("/api/gemini", apiRateLimiter(45, 60_000), async (req, res) => {
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
        
        // Ensure all inline image data are valid base64 (not raw URLs or file paths)
        const sanitizedContents = await sanitizeGeminiContents(contents);

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
              contents: sanitizedContents,
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

  // API proxy route for Telegram (Restricted to POST so Bot Tokens are never exposed in GET URL logs)
  app.post(["/api/telegram/send", "/api/telegram/send/"], apiRateLimiter(20, 60_000), async (req, res) => {
    try {
      const payload = req.body || {};
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
  app.post(["/api/telegraph/upload", "/api/telegraph/upload/"], apiRateLimiter(25, 60_000), async (req, res) => {
    try {
      const payload = req.body || {};
      const { image } = payload;
      if (!image || typeof image !== "string") {
        return res.status(400).json({ error: "Tiada imej diberikan." });
      }

      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const type = matches ? matches[1] : 'image/jpeg';
      const base64Data = matches ? matches[2] : image;
      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.byteLength > 15 * 1024 * 1024) {
        return res.status(413).json({ error: "Saiz imej melebihi had keselamatan 15MB." });
      }
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
        console.warn("⚠️ Tmpfiles upload failed:", tmpErr?.message || tmpErr);
      }

      // 3. Tertiary: Freeimage.host (Only if FREEIMAGE_API_KEY is configured in environment variables - no hardcoded keys)
      const freeImageKey = (process.env.FREEIMAGE_API_KEY || "").trim();
      if (freeImageKey) {
        try {
          const fdFree = new FormData();
          fdFree.append('source', new Blob([buffer], { type }), `image.${ext}`);
          fdFree.append('type', 'file');
          fdFree.append('action', 'upload');
          fdFree.append('format', 'json');
          fdFree.append('key', freeImageKey);

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
      }

      throw new Error("Semua pelayan hos imej sementara gagal. Sila cuba sebentar lagi.");
    } catch (error: any) {
      console.error("Image upload proxy error:", sanitizeOpSecError(error));
      res.status(500).json({ error: sanitizeOpSecError(error) });
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

  // API proxy route for images (CORS bypass for client canvas/fetch - Protected against SSRF & LFI)
  app.get("/api/image-proxy", apiRateLimiter(60, 60_000), async (req, res) => {
    try {
      const imageUrl = (req.query.url as string || "").trim();
      if (!imageUrl) {
        return res.status(400).send("Parameter 'url' diperlukan.");
      }

      if (imageUrl.startsWith("/uploads/") || imageUrl.startsWith("uploads/")) {
        const safeLocalPath = resolveSafeUploadPath(imageUrl);
        if (safeLocalPath && fs.existsSync(safeLocalPath)) {
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");
          return res.sendFile(safeLocalPath);
        }
        return res.status(403).send("Laluan fail tempatan tidak sah atau disekat (Path Traversal Protection).");
      }

      if (!isSafeExternalImageUrl(imageUrl)) {
        return res.status(400).send("URL imej tidak sah atau disekat atas faktor keselamatan (SSRF Protection).");
      }

      const response = await fetch(imageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; VectorGuardProxy/3.5)",
          "Accept": "image/*,*/*"
        },
        redirect: "follow",
        signal: AbortSignal.timeout(12000)
      });

      if (response.url && !isSafeExternalImageUrl(response.url)) {
        return res.status(403).send("Ubahan hala (redirect) URL disekat atas faktor keselamatan (SSRF Protection).");
      }

      if (!response.ok) {
        return res.status(response.status).send("Gagal mengambil imej dari sumber asal");
      }

      const contentType = (response.headers.get("content-type") || "image/jpeg").toLowerCase();
      const safeImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"];
      const matchedType = safeImageTypes.find(t => contentType.startsWith(t));
      if (!matchedType && !contentType.includes("octet-stream")) {
        return res.status(415).send("Sumber bukan fail imej yang sah.");
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > 15 * 1024 * 1024) {
        return res.status(413).send("Saiz imej melebihi had maksimum 15MB.");
      }

      res.setHeader("Content-Type", matchedType || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      res.status(500).send("Ralat memproses proksi imej");
    }
  });

  // Local uploads directory & static serving (with nosniff & dotfiles denied)
  const uploadsDir = path.join(process.cwd(), "uploads");
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch (dirErr) {
    console.warn("⚠️ Could not create local uploads directory:", dirErr);
  }
  app.use("/uploads", express.static(uploadsDir, {
    dotfiles: "deny",
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'");
    }
  }));

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

  // Helper to validate session image integrity on the server
  const isServerSessionImageValid = (src: unknown): boolean => {
    if (!src || typeof src !== "string") return false;
    const trimmed = src.trim();
    if (!trimmed || trimmed.startsWith("blob:")) return false;
    if (trimmed.includes("catbox.moe") || trimmed.includes("tmpfiles.org")) return false;
    if (trimmed.startsWith("/uploads/") || trimmed.startsWith("uploads/")) {
      const safeLocalPath = resolveSafeUploadPath(trimmed);
      return Boolean(safeLocalPath && fs.existsSync(safeLocalPath));
    }
    return trimmed.startsWith("data:image/") || (isSafeExternalImageUrl(trimmed));
  };

  const SAFE_SESSION_ID_REGEX = /^[a-zA-Z0-9_.-]{1,120}$/;

  const sanitizeServerSessionPayload = (raw: any): any | null => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    if (!id || !SAFE_SESSION_ID_REGEX.test(id)) return null;
    if (!isServerSessionImageValid(raw.imageSrc)) return null;

    // Strip prototype pollution keys & unexpected fields
    const clean: Record<string, any> = Object.create(null);
    const allowedTopKeys = [
      "id", "fileName", "imageSrc", "mimeType", "status",
      "result", "error", "simulationImage", "mode", "createdAt"
    ];
    for (const key of allowedTopKeys) {
      if (Object.prototype.hasOwnProperty.call(raw, key) && key !== "__proto__" && key !== "constructor" && key !== "prototype") {
        clean[key] = raw[key];
      }
    }
    clean.id = id;
    if (typeof clean.fileName === "string") {
      clean.fileName = clean.fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").slice(0, 180);
    }
    return JSON.parse(JSON.stringify(clean));
  };

  // Endpoint to upload and host images (returns reliable self-contained Data URI to prevent broken images)
  app.post("/api/upload-image", apiRateLimiter(30, 60_000), async (req, res) => {
    try {
      const { image } = req.body || {};
      if (!image || typeof image !== "string") {
        return res.status(400).json({ error: "Tiada imej dibekalkan." });
      }

      if (image.startsWith("data:image/")) {
        return res.json({ url: image });
      }

      if (image.startsWith("http://") || image.startsWith("https://")) {
        if (!isSafeExternalImageUrl(image)) {
          return res.status(400).json({ error: "URL imej tidak sah atau disekat." });
        }
        return res.json({ url: image });
      }

      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const type = matches ? matches[1] : "image/jpeg";
      const base64Data = matches ? matches[2] : image;
      const dataUri = `data:${type};base64,${base64Data}`;

      return res.json({ url: dataUri });
    } catch (err: any) {
      console.error("Ralat /api/upload-image:", sanitizeOpSecError(err));
      return res.status(500).json({ error: "Gagal memproses imej" });
    }
  });

  // Endpoints for shared sessions across all devices
  app.get("/api/shared-sessions", (req, res) => {
    const rawSessions = loadSharedSessions();
    const validSessions = rawSessions.filter((s: any) => s && s.id && isServerSessionImageValid(s.imageSrc));
    if (validSessions.length !== rawSessions.length) {
      saveSharedSessions(validSessions);
    }
    return res.json({ sessions: validSessions });
  });

  app.get("/api/shared-sessions/:id", (req, res) => {
    const { id } = req.params;
    const sessions = loadSharedSessions();
    const found = sessions.find((s: any) => s.id === id && isServerSessionImageValid(s.imageSrc));
    if (found) {
      return res.json({ session: found });
    }
    return res.status(404).json({ error: "Sesi tidak ditemui" });
  });

  app.post("/api/shared-sessions", apiRateLimiter(30, 60_000), (req, res) => {
    try {
      const session = sanitizeServerSessionPayload(req.body);
      if (!session) {
        return res.status(400).json({ error: "Sesi atau imej tidak sah" });
      }
      const current = loadSharedSessions().filter((s: any) => s && s.id && isServerSessionImageValid(s.imageSrc));
      const existingIdx = current.findIndex((s: any) => s.id === session.id);
      if (existingIdx >= 0) {
        current[existingIdx] = { ...current[existingIdx], ...session };
      } else {
        current.unshift(session);
      }
      saveSharedSessions(current);
      return res.json({ success: true, count: current.length });
    } catch (err: any) {
      return res.status(500).json({ error: "Gagal menyimpan sesi" });
    }
  });

  app.delete(["/api/shared-sessions", "/api/shared-sessions/:id"], (req, res) => {
    try {
      const purgeAll = req.query.all === "true" || req.query.purge === "true";
      const id = (req.params.id || req.query.id || "").toString().trim();

      if (purgeAll || id === "all" || id === "__ALL__") {
        saveSharedSessions([]);
        // Clean up any leftover image files in uploadsDir
        try {
          if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            for (const f of files) {
              if (f !== "shared_sessions.json") {
                try {
                  fs.unlinkSync(path.join(uploadsDir, f));
                } catch (_) {}
              }
            }
          }
        } catch (_) {}
        return res.json({ success: true, count: 0, purgedAll: true });
      }

      if (!id) {
        return res.status(400).json({ error: "ID sesi diperlukan untuk pemadaman." });
      }
      const current = loadSharedSessions();
      const filtered = current.filter((s: any) => s.id !== id);
      saveSharedSessions(filtered);
      return res.json({ success: true, count: filtered.length });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Gagal memadam sesi" });
    }
  });

  // Serve static dist files if built, or use Vite middleware in development
  const distPath = path.join(process.cwd(), "dist");
  const isProd = process.env.NODE_ENV === "production" || fs.existsSync(path.join(distPath, "index.html")) && process.env.NODE_ENV !== "development";

  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn("⚠️ Vite dev server not available, falling back to static dist:", viteErr);
      app.use(express.static(distPath));
      app.use((req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  } else {
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

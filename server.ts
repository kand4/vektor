import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

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
          "gemini-2.5-flash",
          "gemini-2.5-flash-lite",
          "gemini-2.5-pro",
          "gemini-3.7-flash",
          "gemini-flash-latest",
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
          message: error?.message || String(error),
          status: error?.status,
          code: error?.code || statusCode
        }
      });
    }
  });

  // API proxy route for Telegram
  app.post("/api/telegram/send", async (req, res) => {
    try {
      const { text, mediaUrls, clientBotToken, clientChatId } = req.body;
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
                          finalErr += " (Petunjuk: Sila periksa semula Telegram Bot Token anda).";
                      }
                      throw new Error(`Telegram Text Error: ${finalErr}`);
                  }
              }
          }
      }

      // 2. Send media groups if provided
      if (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0) {
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
        error: { message: error?.message || String(error) }
      });
    }
  });

  // API proxy route for Telegraph Upload (Bypass CORS via Freeimage.host because Telegraph blocks IP)
  app.post("/api/telegraph/upload", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Tiada imej diberikan." });
      }

      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Rentetan base64 tidak sah." });
      }

      const type = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      const blob = new Blob([buffer], { type });

      const formData = new FormData();
      formData.append('source', blob, 'image.jpg');
      formData.append('type', 'file');
      formData.append('action', 'upload');
      formData.append('format', 'json');
      // Public API key for freeimage.host
      formData.append('key', '6d207e02198a847aa98d0a2a901485a5');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

      const response = await fetch('https://freeimage.host/api/1/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ralat muat naik imej: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data && data.image && data.image.url) {
        return res.json({ url: data.image.url });
      }
      
      throw new Error("Respons tidak sah dari pelayan imej.");
    } catch (error: any) {
      console.error("Image upload proxy error:", error);
      res.status(500).json({ error: error?.message || String(error) });
    }
  });

  // API proxy route for Telegraph createAccount (Bypass CORS)
  app.post("/api/telegraph/createAccount", async (req, res) => {
    try {
      const { authorName } = req.body;
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
  app.post("/api/telegraph/createPage", async (req, res) => {
    try {
      const { accessToken, title, authorName, content } = req.body;
      const safeTitle = (title || 'Laporan Pemeriksaan Vektor & Kebersihan').toString().substring(0, 250);
      const safeAuthor = (authorName || 'VectorGuard AI').toString().substring(0, 120);

      const response = await fetch('https://api.telegra.ph/createPage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            access_token: accessToken,
            title: safeTitle,
            author_name: safeAuthor,
            content: JSON.stringify(content || []),
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

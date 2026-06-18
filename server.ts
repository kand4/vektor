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
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

      if (method === "generateImages") {
        if (!model || !prompt) {
          return res.status(400).json({ error: { message: "Model dan prompt diperlukan untuk generateImages." } });
        }
        console.log(`🎨 Backend calling Imagen model: ${model}`);
        const response = await ai.models.generateImages({
          model,
          prompt,
          config
        });
        return res.json(response);
      } else {
        if (!model || !contents) {
          return res.status(400).json({ 
            error: { message: "Model dan kandungan (contents) diperlukan." } 
          });
        }
        console.log(`🤖 Backend calling Gemini model: ${model}`);
        
        // Safe and approved fallback models list in order of preference (excluding deprecated models like 1.5 and 2.0)
        const safeFallbacks = [
          "gemini-3.5-flash",
          "gemini-2.5-flash",
          "gemini-flash-latest",
          "gemini-3.1-flash-lite"
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
              console.log(`🔄 Attempting fallback model: ${targetModel} due to a block or demand spike on ${model}`);
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

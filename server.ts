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
        
        // Define a list of fallback models
        const modelFallbackList = [model];
        if (model.includes("3.5-flash")) {
          modelFallbackList.push("gemini-2.5-flash");
          modelFallbackList.push("gemini-1.5-flash");
        } else if (model.includes("2.5-flash")) {
          modelFallbackList.push("gemini-1.5-flash");
        } else if (model.includes("2.5-pro") || model.includes("1.5-pro")) {
          modelFallbackList.push("gemini-2.5-flash");
          modelFallbackList.push("gemini-1.5-flash");
        }

        const uniqueModels = Array.from(new Set(modelFallbackList));
        let response = null;
        let lastError: any = null;

        for (const targetModel of uniqueModels) {
          try {
            if (targetModel !== model) {
              console.log(`🔄 Attempting fallback model: ${targetModel} due to a block or demand spike on ${model}`);
            }
            response = await ai.models.generateContent({
              model: targetModel,
              contents,
              config
            });
            break; // Success! Break out of the loop
          } catch (err: any) {
            lastError = err;
            const errStatus = err?.status || err?.code || 500;
            const errMsg = err?.message || String(err);
            console.warn(`⚠️ Model ${targetModel} call failed with status ${errStatus}: ${errMsg}`);
            
            // If it's a client 400 error (excluding quota), don't try other models as it's a syntax / prompt issue
            if (errStatus === 400 && !errMsg.toLowerCase().includes("quota")) {
              throw err;
            }
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

  // API proxy route for Z.ai
  app.post("/api/zai", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Missing authorization header" });
      }

      const fetchRes = await fetch("https://api.z.ai/api/paas/v4/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader
        },
        body: JSON.stringify(req.body)
      });
      
      if (!fetchRes.ok) {
        const errorText = await fetchRes.text();
        return res.status(fetchRes.status).send(errorText);
      }

      const result = await fetchRes.json();
      res.json(result);
    } catch (error: any) {
      console.error("Z.ai proxy error:", error);
      res.status(500).json({ error: error.message });
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

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers support
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  // Preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: { message: `Sistem hanya menyokong kaedah POST. Kaedah ${req.method} tidak dibenarkan.` }
    });
  }

  try {
    let apiKey = process.env.GEMINI_API_KEY;
    
    // Auth from client headers
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
      console.log(`🎨 [Vercel API] Backend calling Imagen model: ${model}`);
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
      console.log(`🤖 [Vercel API] Backend calling Gemini model: ${model}`);
      
      // Fallback model support
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
            console.log(`🔄 [Vercel API] Attempting fallback model: ${targetModel} due to issues on ${model}`);
          }
          response = await ai.models.generateContent({
            model: targetModel,
            contents,
            config
          });
          break; // Success
        } catch (err: any) {
          lastError = err;
          const errStatus = err?.status || err?.code || 500;
          const errMsg = err?.message || String(err);
          console.warn(`⚠️ [Vercel API] Model ${targetModel} call failed with status ${errStatus}: ${errMsg}`);
          
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
    console.error("[Vercel API] Gemini server proxy error:", error);
    const statusCode = error?.status || 500;
    return res.status(statusCode).json({
      error: {
        message: error?.message || String(error),
        status: error?.status,
        code: error?.code || statusCode
      }
    });
  }
}

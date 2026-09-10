import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

// OpSec sanitizer: redact any API keys or tokens from outgoing error messages
function sanitizeErrorMessage(msg: string): string {
  if (!msg) return msg;
  return msg
    .replace(/AIza[0-9A-Za-z_-]{35}/g, '[REDACTED_API_KEY]')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9_-]+/gi, 'Bearer [REDACTED]');
}

// Sanitizer for inlineData in contents to guarantee Gemini receives raw base64
async function sanitizeGeminiContents(contents: any): Promise<any> {
  if (!contents) return contents;

  const sanitizePart = async (part: any) => {
    if (!part || typeof part !== "object") return part;
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

      // 2. If it's an HTTP/HTTPS URL
      if (rawData.startsWith("http://") || rawData.startsWith("https://")) {
        try {
          const fetchRes = await fetch(rawData, { signal: AbortSignal.timeout(15000) });
          if (fetchRes.ok) {
            const contentType = fetchRes.headers.get("content-type");
            if (contentType && !contentType.includes("text")) {
              inlineData.mimeType = contentType.split(";")[0].trim();
            }
            const arrayBuf = await fetchRes.arrayBuffer();
            rawData = Buffer.from(arrayBuf).toString("base64");
          }
        } catch (fetchErr) {
          console.warn(`[Vercel API] Error downloading image URL for Gemini inlineData:`, fetchErr);
        }
      }

      inlineData.data = rawData;
    }
    return part;
  };

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
      
      const sanitizedContents = await sanitizeGeminiContents(contents);
      
      // Safe and approved fallback models list in order of preference (excluding deprecated models like 1.5 and 2.0)
      const safeFallbacks = [
        "gemini-3.8-flash",
        "gemini-flash-latest",
        "gemini-3.7-flash",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
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
            console.log(`🔄 [Vercel API] Attempting fallback model: ${targetModel} due to issues on ${model}`);
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
          break; // Success
        } catch (err: any) {
          lastError = err;
          const errStatus = err?.status || err?.code || 500;
          const errMsg = err?.message || String(err);
          console.log(`ℹ️ [Vercel API] Model ${targetModel} attempt failed (Status ${errStatus}): ${errMsg}`);
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
    const rawMessage = error?.message || String(error);
    return res.status(statusCode).json({
      error: {
        message: sanitizeErrorMessage(rawMessage),
        status: error?.status,
        code: error?.code || statusCode
      }
    });
  }
}

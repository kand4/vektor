import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";
import { isSafeExternalImageUrl } from "./image-proxy";

// OpSec sanitizer: redact any API keys or tokens from outgoing error messages
function sanitizeErrorMessage(msg: string): string {
  if (!msg) return msg;
  return msg
    .replace(/AIza[0-9A-Za-z_-]{35}/g, '[REDACTED_API_KEY]')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/bot[0-9]{8,10}:[a-zA-Z0-9_-]{30,}/gi, 'bot[REDACTED_TOKEN]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
}

let cachedWorkingTextModel: { model: string; expiresAt: number } | null = null;

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

      // 2. If it's an HTTP/HTTPS URL (SSRF-guarded)
      if ((rawData.startsWith("http://") || rawData.startsWith("https://")) && isSafeExternalImageUrl(rawData)) {
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
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

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
      const imagenFallbackList = Array.from(new Set([
        model,
        "imagen-3.0-generate-002",
        "imagen-3.0-fast-generate-001",
        "imagen-3.0-generate-001"
      ]));

      let lastImagenError: any = null;
      for (const targetImagenModel of imagenFallbackList) {
        try {
          const response = await ai.models.generateImages({
            model: targetImagenModel,
            prompt,
            config
          });
          return res.json(response);
        } catch (err: any) {
          console.warn(`⚠️ [Vercel API] Imagen model ${targetImagenModel} failed:`, err?.message || err);
          lastImagenError = err;
        }
      }

      return res.status(404).json({
        error: {
          message: sanitizeErrorMessage(lastImagenError?.message || "Penjana imej Imagen tidak disokong pada API Key ini.")
        }
      });
    } else {
      if (!model || !contents) {
        return res.status(400).json({ 
          error: { message: "Model dan kandungan (contents) diperlukan." } 
        });
      }
      const normalizeModel = (m: string): string => {
        const clean = (m || "").trim();
        const legacyInvalid = new Set([
          "gemini-3.7-flash",
          "gemini-2.5-flash",
          "gemini-2.5-flash-lite",
          "gemini-2.5-pro",
          "gemini-flash-latest",
          "gemini-1.5-flash",
          "gemini-1.5-pro",
          "gemini-pro",
          "gemini-2.0-flash",
          "gemini-2.0-pro",
          "gemini-2.0-flash-thinking"
        ]);
        if (!clean || legacyInvalid.has(clean)) return "gemini-4-hydrogen";
        return clean;
      };

      const requestedModel = normalizeModel(model);
      console.log(`🤖 [Vercel API] Backend calling Gemini model: ${requestedModel}`);
      
      const sanitizedContents = await sanitizeGeminiContents(contents);
      
      const isImageGenModel = /banana|flash-lite-image|pro-image|-image$/i.test(requestedModel);

      const safeFallbacks = isImageGenModel
        ? [
            requestedModel,
            "gemini-nano-banana-2.1",
            "gemini-3.1-flash-lite-image",
            "gemini-3-pro-image"
          ]
        : [
            "gemini-4-hydrogen",
            "gemini-3.8-flash",
            "gemini-3.1-flash-lite"
          ];

      const cached =
        !isImageGenModel && cachedWorkingTextModel && Date.now() < cachedWorkingTextModel.expiresAt
          ? [cachedWorkingTextModel.model]
          : [];

      const uniqueModels = Array.from(new Set([...cached, requestedModel, ...safeFallbacks]));
      let response = null;
      let extractedImage: { data: string; mimeType: string } | null = null;
      let extractedImageText = "";
      let usedModel = requestedModel;
      let lastError: any = null;

      for (const targetModel of uniqueModels) {
        try {
          if (targetModel !== requestedModel) {
            console.log(`🔄 [Vercel API] Attempting fallback model: ${targetModel}`);
          }

          let activeConfig = config;
          if (activeConfig) {
            activeConfig = { ...activeConfig };
            if (isImageGenModel) {
              delete activeConfig.responseMimeType;
              delete activeConfig.responseSchema;
              delete activeConfig.thinkingConfig;
              delete activeConfig.thinkingLevel;
              if (targetModel === "gemini-3.1-flash-lite-image" && activeConfig.imageConfig?.imageSize) {
                activeConfig.imageConfig = { ...activeConfig.imageConfig };
                delete activeConfig.imageConfig.imageSize;
              }
            } else {
              const isGemini4 = targetModel.includes("gemini-4");
              const isGemini3 = targetModel.includes("gemini-3");
              if (isGemini4 || isGemini3) {
                if (activeConfig.thinkingConfig && typeof activeConfig.thinkingConfig.thinkingBudget === "number") {
                  const budget = activeConfig.thinkingConfig.thinkingBudget;
                  activeConfig.thinkingConfig = {
                    thinkingLevel: budget >= 16000 ? "HIGH" : "LOW"
                  };
                }
                delete activeConfig.thinkingLevel;
              } else {
                delete activeConfig.thinkingConfig;
                delete activeConfig.thinkingLevel;
              }
            }
          }

          response = await ai.models.generateContent({
            model: targetModel,
            contents: sanitizedContents,
            config: activeConfig
          });
          usedModel = targetModel;

          if (isImageGenModel) {
            const parts = response?.candidates?.[0]?.content?.parts ?? [];
            let foundData: string | null = null;
            let foundMime = "image/png";
            let textBuf = "";
            for (const part of parts) {
              if (part?.inlineData?.data && !foundData) {
                foundData = part.inlineData.data;
                foundMime = part.inlineData.mimeType || "image/png";
              } else if (part?.text) {
                textBuf += (textBuf ? "\n" : "") + part.text;
              }
            }
            if (!foundData) {
              throw new Error(`Model ${targetModel} tidak memulangkan data imej dalam respons.`);
            }
            extractedImage = { data: foundData, mimeType: foundMime };
            extractedImageText = textBuf;
            break;
          } else {
            cachedWorkingTextModel = { model: targetModel, expiresAt: Date.now() + 10 * 60_000 };
            break;
          }
        } catch (err: any) {
          lastError = err;
          response = null;
          const errStatus = Number(err?.status || err?.code) || 500;
          const errMsg = sanitizeErrorMessage(err?.message || String(err));
          console.log(`ℹ️ [Vercel API] Model ${targetModel} attempt failed (Status ${errStatus}): ${errMsg}`);

          const isPermissionOrAuthError =
            errStatus === 401 ||
            errStatus === 403 ||
            /PERMISSION_DENIED|ACCESS_DENIED|API_KEY_INVALID|Permission denied on the service/i.test(errMsg);
          if (isPermissionOrAuthError) {
            if (!isImageGenModel) cachedWorkingTextModel = null;
            break;
          }

          const isFreeTierZeroQuota =
            errStatus === 429 && /limit:\s*0|free_tier|RESOURCE_EXHAUSTED/i.test(errMsg);
          if (isImageGenModel && isFreeTierZeroQuota) {
            break;
          }
        }
      }

      if (isImageGenModel) {
        if (!extractedImage) {
          throw lastError || new Error(`Penjanaan imej Nano Banana (${requestedModel}) gagal.`);
        }
        return res.json({
          text: extractedImageText,
          imageBase64: extractedImage.data,
          mimeType: extractedImage.mimeType,
          imageUrl: `data:${extractedImage.mimeType};base64,${extractedImage.data}`,
          modelUsed: usedModel
        });
      }

      if (!response) {
        throw lastError || new Error(`Sistem gagal mengakses model Gemini ${requestedModel}.`);
      }

      return res.json({ text: response.text });
    }
  } catch (error: any) {
    const rawCode = Number(error?.status || error?.code);
    const statusCode = Number.isInteger(rawCode) && rawCode >= 400 && rawCode < 600 ? rawCode : 500;
    const rawMessage = sanitizeErrorMessage(error?.message || String(error));
    if (statusCode === 401 || statusCode === 403 || /PERMISSION_DENIED|ACCESS_DENIED/i.test(rawMessage)) {
      console.log("[Vercel API] Gemini API permission/auth rejected (403):", rawMessage);
      return res.status(statusCode === 401 ? 401 : 403).json({
        error: {
          message: "Ralat Kebenaran Gemini API (403 PERMISSION_DENIED): Kunci API semasa tidak dibenarkan mengakses perkhidmatan Generative Language. Sila semak GEMINI_API_KEY anda di panel Settings > Secrets atau buang/tukar kunci tersuai di Tetapan aplikasi.",
          status: "PERMISSION_DENIED",
          code: statusCode === 401 ? 401 : 403
        }
      });
    }
    if (statusCode === 429 || /RESOURCE_EXHAUSTED|quota/i.test(rawMessage)) {
      const isFreeZero = /limit:\s*0|free_tier/i.test(rawMessage);
      return res.status(429).json({
        error: {
          message: isFreeZero
            ? "Kuota API Percuma Tidak Menyokong Model Ini (429 Free Tier, limit: 0): Kunci API anda belum mengaktifkan Billing berbayar di Google AI Studio untuk Nano Banana / Pro. Aktifkan Billing pada projek API Key anda di aistudio.google.com atau guna 🌸 Flux (Pollinations)."
            : "Had Kuota API Gemini Dicapai (429 RESOURCE_EXHAUSTED): Sila tunggu sebentar sebelum mencuba semula atau tukar ke kunci API lain di Tetapan.",
          status: "RESOURCE_EXHAUSTED",
          code: 429
        }
      });
    }
    console.log("[Vercel API] Gemini server proxy error:", rawMessage);
    return res.status(statusCode).json({
      error: {
        message: rawMessage,
        status: error?.status,
        code: statusCode
      }
    });
  }
}

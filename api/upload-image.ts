import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isSafeExternalImageUrl } from './image-proxy';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers support
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: `Sistem hanya menyokong kaedah POST. Kaedah ${req.method} tidak dibenarkan.`
    });
  }

  try {
    const payload = req.body || {};
    const { image } = payload;
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "Tiada imej dibekalkan." });
    }

    const trimmed = image.trim();
    if (trimmed.startsWith("blob:")) {
      return res.status(400).json({ error: "Pautan blob sementara tidak disokong." });
    }

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      if (!isSafeExternalImageUrl(trimmed)) {
        return res.status(400).json({ error: "URL imej tidak sah atau disekat." });
      }
      return res.json({ url: trimmed });
    }

    const matches = trimmed.match(/^data:(image\/[A-Za-z0-9.+-]+);base64,(.+)$/i);
    if (trimmed.startsWith("data:") && !matches) {
      return res.status(400).json({ error: "Format data URI bukan imej yang sah." });
    }

    const type = matches ? matches[1] : "image/jpeg";
    const base64Data = matches ? matches[2] : trimmed;
    const fallbackDataUri = `data:${type};base64,${base64Data}`;
    return res.json({ url: fallbackDataUri });
  } catch (err: any) {
    console.error("Ralat api/upload-image pada Vercel:", err);
    return res.status(500).json({ error: "Gagal memproses imej" });
  }
}

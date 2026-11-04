import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers support
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
      error: `Sistem hanya menyokong kaedah POST. Kaedah ${req.method} tidak dibenarkan.`
    });
  }

  try {
    const payload = req.body || {};
    const { image, name } = payload;
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "Tiada imej dibekalkan." });
    }

    if (image.startsWith("http://") || image.startsWith("https://")) {
      return res.json({ url: image });
    }

    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const type = matches ? matches[1] : "image/jpeg";
    const base64Data = matches ? matches[2] : image;
    const fallbackDataUri = image.startsWith("data:") ? image : `data:${type};base64,${base64Data}`;
    return res.json({ url: fallbackDataUri });
  } catch (err: any) {
    console.error("Ralat api/upload-image pada Vercel:", err);
    return res.status(500).json({ error: err.message || "Gagal memproses imej" });
  }
}

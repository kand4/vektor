import type { VercelRequest, VercelResponse } from '@vercel/node';

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
    const buffer = Buffer.from(base64Data, "base64");
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
    const safePrefix = (name || "vg").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 20);
    const filename = `${safePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

    // 1. Primary: Litterbox (Catbox) - 72h retention, reliable for cross-device view
    try {
      const fd = new FormData();
      fd.append("reqtype", "fileupload");
      fd.append("time", "72h");
      fd.append("fileToUpload", new Blob([buffer], { type }), filename);

      const catboxRes = await fetch("https://litterbox.catbox.moe/resources/internals/api.php", {
        method: "POST",
        body: fd,
        signal: AbortSignal.timeout(8000)
      });

      if (catboxRes.ok) {
        const directUrl = (await catboxRes.text()).trim();
        if (directUrl.startsWith("http")) {
          return res.json({ url: directUrl });
        }
      }
    } catch (catboxErr: any) {
      console.warn("⚠️ Litterbox upload failed on Vercel:", catboxErr?.message || catboxErr);
    }

    // 2. Secondary: Tmpfiles.org
    try {
      const fdTmp = new FormData();
      fdTmp.append("file", new Blob([buffer], { type }), filename);

      const tmpRes = await fetch("https://tmpfiles.org/api/v1/upload", {
        method: "POST",
        body: fdTmp,
        signal: AbortSignal.timeout(8000)
      });

      if (tmpRes.ok) {
        const tmpData = await tmpRes.json();
        if (tmpData && tmpData.data && tmpData.data.url) {
          const directUrl = tmpData.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
          return res.json({ url: directUrl });
        }
      }
    } catch (tmpErr: any) {
      console.warn("⚠️ Tmpfiles upload failed on Vercel:", tmpErr?.message || tmpErr);
    }

    // 3. Fallback: If external hosts are unreachable, return data URI directly so the browser always renders the image!
    const fallbackDataUri = image.startsWith("data:") ? image : `data:${type};base64,${base64Data}`;
    return res.json({ url: fallbackDataUri });
  } catch (err: any) {
    console.error("Ralat api/upload-image pada Vercel:", err);
    return res.status(500).json({ error: err.message || "Gagal memproses imej" });
  }
}

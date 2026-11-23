import type { VercelRequest, VercelResponse } from '@vercel/node';

function sanitizeOpSecError(error: any): string {
  let msg = error?.message || String(error);
  msg = msg.replace(/AIza[0-9A-Za-z_-]{35}/g, '[REDACTED_API_KEY]');
  msg = msg.replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]');
  msg = msg.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
  return msg;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: `Kaedah ${req.method} tidak dibenarkan.` });
  }

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

    // 1. Primary: Litterbox (Catbox)
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
    } catch {}

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
        if (tmpData?.data?.url) {
          const directUrl = tmpData.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
          return res.json({ url: directUrl });
        }
      }
    } catch {}

    // 3. Tertiary: Freeimage.host if FREEIMAGE_API_KEY env is configured
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
      } catch {}
    }

    return res.status(502).json({ error: "Semua pelayan hos imej sementara gagal. Sila cuba sebentar lagi." });
  } catch (error: any) {
    console.error("[Vercel API] Telegraph upload error:", sanitizeOpSecError(error));
    return res.status(500).json({ error: sanitizeOpSecError(error) });
  }
}

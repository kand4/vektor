import type { VercelRequest, VercelResponse } from '@vercel/node';

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^\[::1\]$/,
  /\.internal$/i,
  /\.local$/i
];

export function isSafeExternalImageUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    for (const pattern of BLOCKED_HOST_PATTERNS) {
      if (pattern.test(hostname)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const rawUrl = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  if (!rawUrl || typeof rawUrl !== "string" || !isSafeExternalImageUrl(rawUrl)) {
    return res.status(400).send("URL imej tidak sah atau disekat atas faktor keselamatan (SSRF Protection).");
  }

  try {
    const upstream = await fetch(rawUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; VectorGuardProxy/3.5)",
        "Accept": "image/*,*/*"
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000)
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send(`Gagal mengambil imej: ${upstream.statusText}`);
    }

    const contentType = (upstream.headers.get("content-type") || "image/jpeg").toLowerCase();
    if (!contentType.startsWith("image/") && !contentType.includes("octet-stream")) {
      return res.status(415).send("Sumber bukan fail imej yang sah.");
    }

    res.setHeader("Content-Type", contentType.startsWith("image/") ? contentType : "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800");
    res.setHeader("X-Content-Type-Options", "nosniff");

    const arrayBuffer = await upstream.arrayBuffer();
    if (arrayBuffer.byteLength > 15 * 1024 * 1024) {
      return res.status(413).send("Saiz imej melebihi had maksimum 15MB.");
    }

    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error("Vercel image proxy error:", err);
    return res.status(500).send(err?.message || "Ralat pelayan memuat turun imej");
  }
}

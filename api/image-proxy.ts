import type { VercelRequest, VercelResponse } from '@vercel/node';

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./,
  /^100\.100\.100\.200$/,
  /^0\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^\[::1\]$/,
  /^\[?fe80:/i,
  /^\[?fc00:/i,
  /^\[?fd[0-9a-f]{2}:/i,
  /^\[?::ffff:(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.)/i,
  /^metadata\.google\.internal$/i,
  /^metadata$/i,
  /\.internal$/i,
  /\.local$/i
];

export function isSafeExternalImageUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    if (parsed.username || parsed.password) {
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
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).send("Kaedah tidak dibenarkan.");
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

    // Verify final redirected URL is also safe against SSRF redirect bypass
    if (upstream.url && !isSafeExternalImageUrl(upstream.url)) {
      return res.status(403).send("Ubahan hala (redirect) URL disekat atas faktor keselamatan (SSRF Protection).");
    }

    if (!upstream.ok) {
      return res.status(upstream.status).send(`Gagal mengambil imej: ${upstream.statusText}`);
    }

    const contentType = (upstream.headers.get("content-type") || "image/jpeg").toLowerCase();
    const safeImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"];
    const matchedType = safeImageTypes.find(t => contentType.startsWith(t));
    if (!matchedType && !contentType.includes("octet-stream")) {
      return res.status(415).send("Sumber bukan fail imej yang sah.");
    }

    res.setHeader("Content-Type", matchedType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");

    const arrayBuffer = await upstream.arrayBuffer();
    if (arrayBuffer.byteLength > 15 * 1024 * 1024) {
      return res.status(413).send("Saiz imej melebihi had maksimum 15MB.");
    }

    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error("Vercel image proxy error:", err);
    return res.status(500).send("Ralat pelayan memuat turun imej");
  }
}

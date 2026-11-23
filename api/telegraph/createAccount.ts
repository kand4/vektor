import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: `Kaedah ${req.method} tidak dibenarkan.` });
  }

  try {
    const payload = (req.method === 'GET' ? req.query : req.body) || {};
    const rawAuthor = (payload.authorName || 'VectorGuard AI').toString().trim();
    const shortName = rawAuthor.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30) || 'VectorGuard';
    const cleanAuthorName = rawAuthor.substring(0, 120) || 'VectorGuard AI';

    const response = await fetch(
      `https://api.telegra.ph/createAccount?short_name=${encodeURIComponent(shortName)}&author_name=${encodeURIComponent(cleanAuthorName)}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await response.json();
    if (data.ok) {
      return res.json(data);
    }
    return res.status(502).json({ error: data.error || 'Gagal mencipta akaun Telegraph.' });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Gagal menyambung ke Telegraph.' });
  }
}

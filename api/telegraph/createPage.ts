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
    const { accessToken, title, authorName, content } = payload;
    if (!accessToken || typeof accessToken !== 'string') {
      return res.status(400).json({ error: 'Token akses Telegraph diperlukan.' });
    }

    const safeTitle = (title || 'Laporan Pemeriksaan Vektor & Kebersihan').toString().substring(0, 250);
    const safeAuthor = (authorName || 'VectorGuard AI').toString().substring(0, 120);
    const parsedContent = typeof content === 'string' ? JSON.parse(content) : (content || []);

    const response = await fetch('https://api.telegra.ph/createPage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken,
        title: safeTitle,
        author_name: safeAuthor,
        content: JSON.stringify(parsedContent),
        return_content: false
      }),
      signal: AbortSignal.timeout(12000)
    });
    const data = await response.json();
    if (data.ok) {
      return res.json(data);
    }
    return res.status(502).json({ error: data.error || 'Gagal menerbitkan halaman Telegraph.' });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Ralat menerbitkan artikel Telegraph.' });
  }
}

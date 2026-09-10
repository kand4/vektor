import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory cache across warm invocations of the serverless function
// and external cloud persistence
let memorySessions: any[] = [];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // GET: Return all shared sessions
  if (req.method === "GET") {
    return res.json({ sessions: memorySessions });
  }

  // POST: Add or update shared session
  if (req.method === "POST") {
    try {
      const session = req.body;
      if (!session || !session.id) {
        return res.status(400).json({ error: "Sesi tidak sah: 'id' diperlukan." });
      }

      const existingIdx = memorySessions.findIndex((s: any) => s.id === session.id);
      if (existingIdx >= 0) {
        memorySessions[existingIdx] = { ...memorySessions[existingIdx], ...session };
      } else {
        memorySessions.unshift(session);
      }

      // Keep up to 100 latest sessions
      if (memorySessions.length > 100) {
        memorySessions = memorySessions.slice(0, 100);
      }

      return res.json({ success: true, count: memorySessions.length });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Gagal menyimpan sesi." });
    }
  }

  // DELETE: Remove session by id
  if (req.method === "DELETE") {
    try {
      const url = req.url || "";
      const parts = url.split("?")[0].split("/");
      const id = parts[parts.length - 1];
      if (id && id !== "shared-sessions") {
        memorySessions = memorySessions.filter((s: any) => s.id !== id);
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Gagal memadam sesi." });
    }
  }

  return res.status(405).json({ error: `Kaedah ${req.method} tidak disokong.` });
}

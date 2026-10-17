import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

const TMP_SESSIONS_FILE = path.join('/tmp', 'vectorguard_shared_sessions.json');

declare global {
  // eslint-disable-next-line no-var
  var __vectorguard_sessions__: any[] | undefined;
}

function loadSessions(): any[] {
  if (Array.isArray(globalThis.__vectorguard_sessions__) && globalThis.__vectorguard_sessions__.length > 0) {
    return globalThis.__vectorguard_sessions__;
  }
  try {
    if (fs.existsSync(TMP_SESSIONS_FILE)) {
      const raw = fs.readFileSync(TMP_SESSIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        globalThis.__vectorguard_sessions__ = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[shared-sessions] Could not read /tmp cache:', err);
  }
  globalThis.__vectorguard_sessions__ = [];
  return globalThis.__vectorguard_sessions__;
}

function saveSessions(sessions: any[]): void {
  const trimmed = sessions.slice(0, 100);
  globalThis.__vectorguard_sessions__ = trimmed;
  try {
    fs.writeFileSync(TMP_SESSIONS_FILE, JSON.stringify(trimmed), 'utf-8');
  } catch (err) {
    console.warn('[shared-sessions] Could not write /tmp cache:', err);
  }
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

  const currentSessions = loadSessions();

  // GET: Return all shared sessions or single session by ?id=
  if (req.method === "GET") {
    const queryId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    if (queryId) {
      const found = currentSessions.find((s: any) => s.id === queryId);
      if (!found) {
        return res.status(404).json({ error: "Sesi tidak ditemui" });
      }
      return res.json({ session: found });
    }
    return res.json({ sessions: currentSessions });
  }

  // POST: Add or update shared session
  if (req.method === "POST") {
    try {
      const session = req.body;
      if (!session || typeof session !== "object" || !session.id) {
        return res.status(400).json({ error: "Sesi tidak sah: 'id' diperlukan." });
      }

      const existingIdx = currentSessions.findIndex((s: any) => s.id === session.id);
      if (existingIdx >= 0) {
        currentSessions[existingIdx] = { ...currentSessions[existingIdx], ...session };
      } else {
        currentSessions.unshift(session);
      }

      saveSessions(currentSessions);
      return res.json({ success: true, count: currentSessions.length });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Gagal menyimpan sesi." });
    }
  }

  // DELETE: Remove session by query ?id= or path segment
  if (req.method === "DELETE") {
    try {
      const queryId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
      const url = req.url || "";
      const parts = url.split("?")[0].split("/");
      const pathId = parts[parts.length - 1];
      const targetId = queryId || (pathId && pathId !== "shared-sessions" ? decodeURIComponent(pathId) : "");

      if (targetId) {
        const filtered = currentSessions.filter((s: any) => s.id !== targetId);
        saveSessions(filtered);
        return res.json({ success: true, count: filtered.length });
      }
      return res.status(400).json({ error: "ID sesi diperlukan untuk pemadaman." });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Gagal memadam sesi." });
    }
  }

  return res.status(405).json({ error: `Kaedah ${req.method} tidak disokong.` });
}

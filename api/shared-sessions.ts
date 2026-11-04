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

function isImageValid(src: unknown): boolean {
  if (!src || typeof src !== 'string') return false;
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith('blob:')) return false;
  if (trimmed.includes('catbox.moe') || trimmed.includes('tmpfiles.org') || trimmed.startsWith('/uploads/')) return false;
  return trimmed.startsWith('data:image/') || trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

const SAFE_SESSION_ID_REGEX = /^[a-zA-Z0-9_.-]{1,120}$/;

function sanitizeSessionPayload(raw: any): any | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  if (!id || !SAFE_SESSION_ID_REGEX.test(id)) return null;
  if (!isImageValid(raw.imageSrc)) return null;

  // Strip dangerous prototype pollution keys & excessive fields
  const clean: Record<string, any> = Object.create(null);
  const allowedTopKeys = [
    'id', 'fileName', 'imageSrc', 'mimeType', 'status',
    'result', 'error', 'simulationImage', 'mode', 'createdAt'
  ];
  for (const key of allowedTopKeys) {
    if (Object.prototype.hasOwnProperty.call(raw, key) && key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
      clean[key] = raw[key];
    }
  }
  clean.id = id;
  if (typeof clean.fileName === 'string') {
    clean.fileName = clean.fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').slice(0, 180);
  }
  return JSON.parse(JSON.stringify(clean));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const currentSessions = loadSessions().filter((s: any) => s && s.id && isImageValid(s.imageSrc));

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
      const session = sanitizeSessionPayload(req.body);
      if (!session) {
        return res.status(400).json({ error: "Sesi tidak sah: 'id' yang selamat dan imej sah diperlukan." });
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
      return res.status(500).json({ error: "Gagal menyimpan sesi." });
    }
  }

  // DELETE: Remove session by query ?id=, ?all=true, or path segment
  if (req.method === "DELETE") {
    try {
      const purgeAll = req.query.all === "true" || req.query.purge === "true";
      const queryId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
      const url = req.url || "";
      const parts = url.split("?")[0].split("/");
      const pathId = parts[parts.length - 1];
      const targetId = queryId || (pathId && pathId !== "shared-sessions" ? decodeURIComponent(pathId) : "");

      if (purgeAll || targetId === "all" || targetId === "__ALL__") {
        saveSessions([]);
        return res.json({ success: true, count: 0, purgedAll: true });
      }

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

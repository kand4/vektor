import { AnalysisSession } from '../types';

export const OWNER_EMAIL = 'Pentadbir Berdaftar';
const OWNER_STORAGE_KEY = 'vectorguard_owner_auth_v1';
const OWNER_AUTH_TS_KEY = 'vectorguard_owner_auth_ts_v1';
const OWNER_CUSTOM_PIN_HASH_KEY = 'vectorguard_owner_pin_hash_v1';
const OWNER_LEGACY_PIN_KEY = 'vectorguard_owner_custom_pin';
const OWNER_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours session TTL for shared device safety

// Deterministic salted digest (FNV-1a 64-bit style dual pass) so PINs are never stored in plaintext in localStorage
const computeSaltedDigest = (raw: string): string => {
  const normalized = `vg_opsec_salt_2026::${raw.trim().toLowerCase()}`;
  let h1 = 0xdeadbeef ^ normalized.length;
  let h2 = 0x41c6ce57 ^ normalized.length;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `vgh1_${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
};

// Precomputed salted digests for default owner passkeys ('2026', 'admin2026', 'vectorguard')
const RECOGNIZED_DIGESTS = new Set([
  computeSaltedDigest('2026'),
  computeSaltedDigest('admin2026'),
  computeSaltedDigest('vectorguard')
]);

export const isOwnerAuthorized = (): boolean => {
  if (typeof window === 'undefined') return false;
  const isAuth = localStorage.getItem(OWNER_STORAGE_KEY) === 'true';
  if (!isAuth) return false;

  const tsRaw = localStorage.getItem(OWNER_AUTH_TS_KEY);
  if (tsRaw) {
    const ts = Number(tsRaw);
    if (!isNaN(ts) && Date.now() - ts > OWNER_SESSION_TTL_MS) {
      localStorage.removeItem(OWNER_STORAGE_KEY);
      localStorage.removeItem(OWNER_AUTH_TS_KEY);
      return false;
    }
  }
  return true;
};

export const setOwnerAuthorized = (authorized: boolean): void => {
  if (typeof window === 'undefined') return;
  if (authorized) {
    localStorage.setItem(OWNER_STORAGE_KEY, 'true');
    localStorage.setItem(OWNER_AUTH_TS_KEY, String(Date.now()));
  } else {
    localStorage.removeItem(OWNER_STORAGE_KEY);
    localStorage.removeItem(OWNER_AUTH_TS_KEY);
  }
};

export const verifyOwnerPasskey = (input: string): boolean => {
  if (!input || typeof input !== 'string') return false;
  const inputDigest = computeSaltedDigest(input);

  if (typeof window !== 'undefined') {
    // Migrate legacy plaintext PIN to salted hash automatically if present
    const legacyPlainPin = localStorage.getItem(OWNER_LEGACY_PIN_KEY);
    if (legacyPlainPin) {
      localStorage.setItem(OWNER_CUSTOM_PIN_HASH_KEY, computeSaltedDigest(legacyPlainPin));
      localStorage.removeItem(OWNER_LEGACY_PIN_KEY);
    }

    const customPinHash = localStorage.getItem(OWNER_CUSTOM_PIN_HASH_KEY);
    if (customPinHash && inputDigest === customPinHash) {
      return true;
    }
  }

  return RECOGNIZED_DIGESTS.has(inputDigest);
};

export const setCustomOwnerPin = (newPin: string): void => {
  if (typeof window === 'undefined' || !newPin.trim()) return;
  localStorage.setItem(OWNER_CUSTOM_PIN_HASH_KEY, computeSaltedDigest(newPin));
  localStorage.removeItem(OWNER_LEGACY_PIN_KEY);
};

/**
 * Robust timestamp extractor for any past or new session
 */
export const getSessionTimestamp = (session: AnalysisSession): number => {
  if (session.createdAt) {
    const num = typeof session.createdAt === 'number' ? session.createdAt : Number(session.createdAt);
    if (!isNaN(num) && num > 0) {
      return num;
    }
    const d = new Date(session.createdAt).getTime();
    if (!isNaN(d) && d > 0) {
      return d;
    }
  }
  if (session.result?.timestamp) {
    const num = typeof session.result.timestamp === 'number' ? session.result.timestamp : Number(session.result.timestamp);
    if (!isNaN(num) && num > 0) {
      return num;
    }
  }
  // Try extracting milliseconds from id e.g. "session-1725...-..." or "live-1725..."
  const match = session.id.match(/(\d{10,13})/);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > 1600000000000) {
      return num;
    }
  }
  return Date.now();
};

export interface DateGroupedSessions {
  dateKey: string;
  displayDate: string;
  relativeBadge: string;
  rawDate: Date;
  sessions: AnalysisSession[];
}

export const groupSessionsByDate = (
  sessions: AnalysisSession[],
  language: string = 'ms',
  sortOrder: 'NEWEST_FIRST' | 'OLDEST_FIRST' = 'NEWEST_FIRST'
): DateGroupedSessions[] => {
  const groupsMap = new Map<string, { displayDate: string; relativeBadge: string; rawDate: Date; sessions: AnalysisSession[] }>();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  sessions.forEach(session => {
    const ts = getSessionTimestamp(session);
    const d = new Date(ts);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    let relativeBadge = '';
    if (dateKey === todayStr) {
      relativeBadge = language === 'ms' ? 'HARI INI' : language === 'zh' ? '今天' : language === 'ta' ? 'இன்று' : 'TODAY';
    } else if (dateKey === yesterdayStr) {
      relativeBadge = language === 'ms' ? 'SEMALAM' : language === 'zh' ? '昨天' : language === 'ta' ? 'நேற்று' : 'YESTERDAY';
    }

    const locale = language === 'ms' ? 'ms-MY' : language === 'zh' ? 'zh-CN' : language === 'ta' ? 'ta-IN' : 'en-US';
    const displayDate = d.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    if (!groupsMap.has(dateKey)) {
      groupsMap.set(dateKey, {
        displayDate,
        relativeBadge,
        rawDate: d,
        sessions: []
      });
    }

    groupsMap.get(dateKey)!.sessions.push(session);
  });

  // Convert to array and sort groups
  const sortedGroups = Array.from(groupsMap.entries()).map(([dateKey, data]) => ({
    dateKey,
    displayDate: data.displayDate,
    relativeBadge: data.relativeBadge,
    rawDate: data.rawDate,
    sessions: data.sessions.sort((a, b) => {
      const tsA = getSessionTimestamp(a);
      const tsB = getSessionTimestamp(b);
      return sortOrder === 'NEWEST_FIRST' ? tsB - tsA : tsA - tsB;
    })
  }));

  sortedGroups.sort((a, b) => {
    const timeA = a.rawDate.getTime();
    const timeB = b.rawDate.getTime();
    return sortOrder === 'NEWEST_FIRST' ? timeB - timeA : timeA - timeB;
  });

  return sortedGroups;
};

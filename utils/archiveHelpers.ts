import { AnalysisSession } from '../types';

export const OWNER_EMAIL = 'Pentadbir Berdaftar';
const OWNER_STORAGE_KEY = 'vectorguard_owner_auth_v1';
const OWNER_CUSTOM_PIN_KEY = 'vectorguard_owner_custom_pin';

export const isOwnerAuthorized = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(OWNER_STORAGE_KEY) === 'true';
};

export const setOwnerAuthorized = (authorized: boolean): void => {
  if (typeof window === 'undefined') return;
  if (authorized) {
    localStorage.setItem(OWNER_STORAGE_KEY, 'true');
  } else {
    localStorage.removeItem(OWNER_STORAGE_KEY);
  }
};

export const verifyOwnerPasskey = (input: string): boolean => {
  const sanitized = input.trim().toLowerCase();
  const customPin = typeof window !== 'undefined' ? localStorage.getItem(OWNER_CUSTOM_PIN_KEY) : null;
  
  if (customPin && input.trim() === customPin.trim()) return true;

  // Recognized default owner credentials (anonymized for OpSec)
  const validKeys = [
    '2026',
    'admin2026',
    'vectorguard'
  ];

  return validKeys.includes(sanitized);
};

export const setCustomOwnerPin = (newPin: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OWNER_CUSTOM_PIN_KEY, newPin.trim());
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

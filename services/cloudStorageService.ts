import { AnalysisSession } from '../types';

export const uploadImageToCloud = async (base64Image: string, _fileName?: string): Promise<string> => {
  if (!base64Image) return '';
  // Preserve self-contained data:image/ URIs directly so images never expire or become broken on refresh
  if (base64Image.startsWith('data:image/')) {
    return base64Image;
  }
  if (base64Image.startsWith('http://') || base64Image.startsWith('https://')) {
    return base64Image;
  }
  return base64Image;
};

export const syncSessionToServer = async (session: AnalysisSession): Promise<boolean> => {
  try {
    const res = await fetch('/api/shared-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    });
    return res.ok;
  } catch (err) {
    console.warn('Gagal menyegerak sesi ke pelayan awan:', err);
    return false;
  }
};

export const fetchSharedSessionsFromServer = async (): Promise<AnalysisSession[]> => {
  try {
    const res = await fetch('/api/shared-sessions');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.sessions)) {
        return data.sessions;
      }
    }
  } catch (err) {
    console.warn('Gagal mengambil sesi perkongsian dari pelayan:', err);
  }
  return [];
};

export const deleteSharedSessionFromServer = async (sessionId: string): Promise<boolean> => {
  try {
    const res = await fetch(`/api/shared-sessions?id=${encodeURIComponent(sessionId)}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch (err) {
    console.warn('Gagal memadam sesi dari pelayan:', err);
    return false;
  }
};

export const purgeAllSharedSessionsFromServer = async (): Promise<boolean> => {
  try {
    const res = await fetch('/api/shared-sessions?all=true', {
      method: 'DELETE'
    });
    return res.ok;
  } catch (err) {
    console.warn('Gagal mengosongkan semua sesi dari pelayan:', err);
    return false;
  }
};


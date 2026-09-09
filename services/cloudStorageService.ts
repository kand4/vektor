import { AnalysisSession } from '../types';

export const uploadImageToCloud = async (base64Image: string, fileName?: string): Promise<string> => {
  if (!base64Image) return '';
  if (base64Image.startsWith('http://') || base64Image.startsWith('https://')) {
    return base64Image;
  }
  // If svg data url, it doesn't need external upload
  if (base64Image.startsWith('data:image/svg+xml')) {
    return base64Image;
  }

  try {
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image, name: fileName })
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.url) {
        return data.url;
      }
    }
  } catch (err) {
    console.warn('Gagal muat naik imej ke awan:', err);
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
    const res = await fetch(`/api/shared-sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch (err) {
    console.warn('Gagal memadam sesi dari pelayan:', err);
    return false;
  }
};

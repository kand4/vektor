
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [apiKey2, setApiKey2] = useState('');
  const [apiKey3, setApiKey3] = useState('');
  const [geminiModel, setGeminiModel] = useState('');
  const [roboflowKey, setRoboflowKey] = useState('');
  const [roboflowModel, setRoboflowModel] = useState('');
  const [testStatus, setTestStatus] = useState<'idle'|'testing'|'success'|'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem('gemini_api_key') || '';
      const storedKey2 = localStorage.getItem('gemini_api_key_2') || '';
      const storedKey3 = localStorage.getItem('gemini_api_key_3') || '';
      const storedModel = localStorage.getItem('gemini_model_preference') || 'gemini-3.1-pro-preview';
      const storedRoboflowKey = localStorage.getItem('roboflow_api_key') || '';
      const storedRoboflowModel = localStorage.getItem('roboflow_model') || 'aegypti-larvae-detection/1';
      setApiKey(storedKey);
      setApiKey2(storedKey2);
      setApiKey3(storedKey3);
      setGeminiModel(storedModel);
      setRoboflowKey(storedRoboflowKey);
      setRoboflowModel(storedRoboflowModel);
      setTestStatus('idle');
      setTestMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const testGeminiConnection = async () => {
    const keysToTest = [apiKey, apiKey2, apiKey3].map(k => k.trim()).filter(Boolean);
    if (keysToTest.length === 0) {
       setTestStatus('error');
       setTestMessage('Sila masukkan sekurang-kurangnya satu API Key dahulu.');
       return;
    }
    setTestStatus('testing');
    try {
        const results: string[] = [];
        for (let i = 0; i < keysToTest.length; i++) {
            const key = keysToTest[i];
            try {
                const ai = new GoogleGenAI({ apiKey: key });
                await ai.models.generateContent({
                    model: geminiModel || 'gemini-2.5-flash',
                    contents: 'Test connection. Reply OK.'
                });
                results.push(`Kunci ${i + 1}: ✅ Berjaya disambung`);
            } catch (err: any) {
                results.push(`Kunci ${i + 1}: ❌ Ralat (${err.message || 'Gagal disambung'})`);
            }
        }
        
        const allOk = results.every(res => res.includes('✅'));
        const someOk = results.some(res => res.includes('✅'));
        if (allOk) {
            setTestStatus('success');
            setTestMessage(`Muat naik berjaya! Semua ${keysToTest.length} Kunci aktif:\n\n` + results.join('\n'));
        } else if (someOk) {
            setTestStatus('success');
            setTestMessage(`Selesai dengan amaran! Sebahagian kunci berjaya:\n\n` + results.join('\n'));
        } else {
            setTestStatus('error');
            setTestMessage(`❌ Semua sambung kunci gagal:\n\n` + results.join('\n'));
        }
    } catch (err: any) {
        setTestStatus('error');
        setTestMessage(`❌ Ralat: ${err.message || 'Gagal disambung'}`);
    }
  };

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
    } else {
      localStorage.removeItem('gemini_api_key');
    }

    if (apiKey2.trim()) {
      localStorage.setItem('gemini_api_key_2', apiKey2.trim());
    } else {
      localStorage.removeItem('gemini_api_key_2');
    }

    if (apiKey3.trim()) {
      localStorage.setItem('gemini_api_key_3', apiKey3.trim());
    } else {
      localStorage.removeItem('gemini_api_key_3');
    }

    if (geminiModel.trim()) {
      localStorage.setItem('gemini_model_preference', geminiModel.trim());
    } else {
      localStorage.removeItem('gemini_model_preference');
    }

    if (roboflowKey.trim()) {
      localStorage.setItem('roboflow_api_key', roboflowKey.trim());
    } else {
      localStorage.removeItem('roboflow_api_key');
    }

    if (roboflowModel.trim()) {
      localStorage.setItem('roboflow_model', roboflowModel.trim());
    } else {
      localStorage.removeItem('roboflow_model');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-md w-full shadow-2xl my-auto max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">Tetapan Sistem</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-950/40 p-4 rounded-lg border border-slate-800 space-y-3">
            <div className="flex justify-between items-center">
               <label className="block text-xs font-bold text-cyan-400 uppercase tracking-widest">
                 Sistem Penggiliran Kunci API (Max 3)
               </label>
               <button 
                  onClick={testGeminiConnection}
                  disabled={testStatus === 'testing'}
                  className="text-[10px] uppercase font-bold bg-slate-800 hover:bg-slate-700 border border-slate-600 px-2 py-1 rounded text-cyan-400 disabled:opacity-50 transition-colors"
               >
                  {testStatus === 'testing' ? 'Menguji...' : 'Uji Semua Kunci'}
               </button>
            </div>
            
            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-slate-400 font-mono block mb-1">KUNCI 1 (UTAMA)</span>
                <input
                  type="password"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  placeholder="Masukkan API Key Utama..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              
              <div>
                <span className="text-[10px] text-slate-400 font-mono block mb-1">KUNCI 2 (CADANGAN)</span>
                <input
                  type="password"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  placeholder="Masukkan API Key Kedua (Pilihan)..."
                  value={apiKey2}
                  onChange={(e) => setApiKey2(e.target.value)}
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-mono block mb-1">KUNCI 3 (CADANGAN)</span>
                <input
                  type="password"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  placeholder="Masukkan API Key Ketiga (Pilihan)..."
                  value={apiKey3}
                  onChange={(e) => setApiKey3(e.target.value)}
                />
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-normal">
              Sistem akan menjalankan giliran pusingan (Round-Robin Style) antara kunci-kunci aktif di atas bagi mengelak limitasi rate harian (RPM/RPD). Sekiranya salah satu kunci gagal, sistem akan terus mencuba kunci seterusnya secara automatik!
            </p>

            {testMessage && (
               <div className={`mt-2 text-xs p-2 rounded whitespace-pre-line ${testStatus === 'success' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/30' : 'bg-red-950/50 text-red-400 border border-red-500/30'}`}>
                   {testMessage}
               </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Model Enjin Gemini (AI Engine)
            </label>
            <select
              className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white focus:outline-none focus:border-cyan-500 font-sans text-sm appearance-none"
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value)}
            >
              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Terbaik / Pintar)</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Laju / Sederhana)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Roboflow API Key
            </label>
            <input
              type="password"
              className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white focus:outline-none focus:border-cyan-500 font-mono text-sm"
              placeholder="Private API Key from Roboflow..."
              value={roboflowKey}
              onChange={(e) => setRoboflowKey(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Roboflow Model ID / Version
            </label>
            <input
              type="text"
              className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white focus:outline-none focus:border-cyan-500 font-mono text-sm"
              placeholder="e.g. aedypti-larvae-detection/1"
              value={roboflowModel}
              onChange={(e) => setRoboflowModel(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-2">
              Keys are stored securely in localStorage.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;

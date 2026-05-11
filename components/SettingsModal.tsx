
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [roboflowKey, setRoboflowKey] = useState('');
  const [roboflowModel, setRoboflowModel] = useState('');
  const [testStatus, setTestStatus] = useState<'idle'|'testing'|'success'|'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem('gemini_api_key') || '';
      const storedRoboflowKey = localStorage.getItem('roboflow_api_key') || '';
      const storedRoboflowModel = localStorage.getItem('roboflow_model') || 'aegypti-larvae-detection/1';
      setApiKey(storedKey);
      setRoboflowKey(storedRoboflowKey);
      setRoboflowModel(storedRoboflowModel);
      setTestStatus('idle');
      setTestMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const testGeminiConnection = async () => {
    if (!apiKey.trim()) {
       setTestStatus('error');
       setTestMessage('Sila masukkan API Key dahulu.');
       return;
    }
    setTestStatus('testing');
    try {
       const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
       await ai.models.generateContent({
           model: 'gemini-2.5-flash',
           contents: 'Test connection. Reply OK.'
       });
       setTestStatus('success');
       setTestMessage('✅ Sambungan Gemini Berjaya!');
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-md w-full shadow-2xl my-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">Tetapan Sistem</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
               <label className="block text-sm font-medium text-slate-300">
                 Gemini API Key
               </label>
               <button 
                  onClick={testGeminiConnection}
                  disabled={testStatus === 'testing'}
                  className="text-[10px] uppercase font-bold bg-slate-800 hover:bg-slate-700 border border-slate-600 px-2 py-1 rounded text-cyan-400 disabled:opacity-50"
               >
                  {testStatus === 'testing' ? 'Menguji...' : 'Uji Sambungan'}
               </button>
            </div>
            <input
              type="password"
              className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white focus:outline-none focus:border-cyan-500 font-mono text-sm"
              placeholder="Masukkan API Key anda..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            {testMessage && (
               <div className={`mt-2 text-xs p-2 rounded ${testStatus === 'success' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30' : 'bg-red-900/30 text-red-400 border border-red-500/30'}`}>
                   {testMessage}
               </div>
            )}
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

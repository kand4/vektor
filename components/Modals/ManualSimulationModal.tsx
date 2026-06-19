import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ManualSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptText: string;
  onImagePasted: (base64Image: string, jsonText?: string) => void;
}

export const ManualSimulationModal: React.FC<ManualSimulationModalProps> = ({ 
    isOpen, onClose, promptText, onImagePasted 
}) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAndOpenGemini = (e: React.MouseEvent<HTMLAnchorElement>) => {
    navigator.clipboard.writeText(promptText).catch(console.error);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          processFile(file);
      }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  const handlePaste = (e: React.ClipboardEvent) => {
     const items = e.clipboardData?.items;
     if (!items) return;
     for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) processFile(blob);
        }
     }
  }

  const handleSubmit = () => {
     if (uploadedImage) {
         onImagePasted(uploadedImage, jsonInput.trim() !== '' ? jsonInput : undefined);
     }
  }

  return (
    <div className="fixed inset-0 z-[170] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in no-print" onPaste={handlePaste}>
        <div className="bg-slate-900 border border-cyan-500 rounded-xl p-6 w-full max-w-4xl shadow-[0_0_50px_rgba(34,211,238,0.3)] max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-sci-fi font-bold text-cyan-400 flex items-center gap-2">
                ✍️ Mod Eksternal Sifar-Kuota (Manual)
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                
                {/* LANGKAH 1 */}
                <div className="bg-slate-800 border border-slate-700 rounded p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold text-lg">1</div>
                        <p className="text-sm text-cyan-400 font-mono-sci uppercase">
                          Salin Arahan & Buka AI Luaran (DALL-E / Gemini)
                        </p>
                    </div>
                    
                    <div className="relative">
                        <textarea 
                            readOnly 
                            value={promptText} 
                            className="w-full h-32 bg-slate-950 border border-slate-800 rounded p-4 text-slate-300 text-xs font-mono focus:outline-none whitespace-pre-wrap select-all" 
                        />
                        <button 
                            onClick={handleCopy}
                            className={`absolute top-2 right-2 px-3 py-1 rounded text-xs font-bold transition-colors ${copied ? 'bg-emerald-600 text-white' : 'bg-cyan-600 text-white hover:bg-cyan-500'}`}
                        >
                            {copied ? 'DISALIN!' : 'SALIN'}
                        </button>
                    </div>

                    <a
                        href="https://gemini.google.com/app"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleCopyAndOpenGemini}
                        className="mt-4 w-full py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-xs border border-slate-600"
                    >
                        <span>🚀 BUKA GEMINI AI DI TAB BAHARU (PILIHAN)</span>
                    </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* LANGKAH 2 */}
                    <div className="bg-slate-800 border border-slate-700 rounded p-6 flex flex-col items-center justify-center text-center">
                        <div className="flex flex-col items-center gap-3 mb-4 w-full">
                            <div className="flex items-center gap-3 w-full self-start">
                                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0">2</div>
                                <p className="text-sm text-emerald-400 font-mono-sci uppercase text-left break-words">
                                  Muat Naik / Tampal Imej Baharu
                                </p>
                            </div>
                        </div>
                        
                        {uploadedImage ? (
                            <div className="relative w-full aspect-video rounded overflow-hidden border border-emerald-500/50 mb-4">
                                <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover" />
                                <button 
                                    onClick={() => setUploadedImage(null)} 
                                    className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded hover:bg-red-500 text-xs font-bold"
                                >
                                    BUANG
                                </button>
                            </div>
                        ) : (
                            <div className="w-full h-32 border-2 border-dashed border-slate-600 rounded flex flex-col items-center justify-center mb-4 bg-slate-900/50 text-slate-500">
                                <span className="text-2xl mb-2">🖼️</span>
                                <span className="text-xs">Klik bawah atau (Ctrl+V) imej di sini</span>
                            </div>
                        )}

                        <input 
                            type="file" 
                            accept="image/*" 
                            id="manual-sim-upload" 
                            className="hidden" 
                            onChange={handleFileChange} 
                        />
                        <label 
                            htmlFor="manual-sim-upload"
                            className="inline-block w-full py-2 rounded bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-600/40 cursor-pointer transition font-bold text-sm"
                        >
                            TAMPAL / PILIH IMEJ
                        </label>
                    </div>

                    {/* LANGKAH 3 */}
                    <div className="bg-slate-800 border border-slate-700 rounded p-6 flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shrink-0">3</div>
                            <p className="text-sm text-indigo-400 font-mono-sci uppercase text-left">
                              Tampal JSON Analisis (Pilihan)
                            </p>
                        </div>
                        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                            Jika anda turut meminta kod JSON daripada AI, tampal di sini untuk terus menganalisis imej baharu secara automatik.
                        </p>
                        <textarea 
                            className="w-full flex-1 min-h-[120px] bg-slate-950 border border-indigo-500/30 rounded p-3 text-emerald-300 text-xs font-mono focus:outline-none focus:border-indigo-500 transition resize-none custom-scrollbar" 
                            placeholder='{"risks": [...]}'
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                        />
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700">
                     <button
                        disabled={!uploadedImage}
                        onClick={handleSubmit}
                        className={`w-full py-4 rounded-lg font-bold font-sci-fi uppercase tracking-widest transition-all text-sm shadow-lg ${
                            uploadedImage 
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20' 
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                     >
                         {jsonInput.trim() !== '' ? 'JANA IMEJ & TERUSKAN ANALISIS JSON' : 'HANYA PAPARKAN IMEJ'}
                     </button>
                </div>
            </div>
            
        </div>
    </div>
  )
};

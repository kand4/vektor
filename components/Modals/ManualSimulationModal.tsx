import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ManualSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptText: string;
  onImagePasted: (base64Image: string) => void;
}

export const ManualSimulationModal: React.FC<ManualSimulationModalProps> = ({ 
    isOpen, onClose, promptText, onImagePasted 
}) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAndOpenGemini = () => {
    navigator.clipboard.writeText(promptText);
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
      onImagePasted(e.target?.result as string);
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

  return (
    <div className="fixed inset-0 z-[170] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in no-print" onPaste={handlePaste}>
        <div className="bg-slate-900 border border-cyan-500 rounded-xl p-6 w-full max-w-2xl shadow-[0_0_50px_rgba(34,211,238,0.3)] max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-sci-fi font-bold text-cyan-400 flex items-center gap-2">
                ✍️ Simulasi Manual (Gemini Web)
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                <div className="bg-slate-800 border border-slate-700 rounded p-4">
                    <p className="text-sm text-slate-300 font-mono-sci uppercase mb-3 text-emerald-400">
                      1. Muat Naik Imej Asal & Tampal Prompt ini di Gemini Web
                    </p>
                    <div className="relative">
                        <textarea 
                            readOnly 
                            value={promptText} 
                            className="w-full h-64 bg-slate-950 border border-slate-800 rounded p-4 text-slate-300 text-xs md:text-sm font-mono focus:outline-none whitespace-pre-wrap" 
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
                        className="mt-4 w-full py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:shadow-[0_0_25px_rgba(34,211,238,0.5)] uppercase tracking-wider text-xs md:text-sm text-center border border-cyan-400/30"
                    >
                        <span>🚀 {copied ? 'TELAH DISALIN! KLIK UNTUK BUKA GEMINI AI' : 'SALIN PROMPT & BUKA GEMINI WEB'}</span>
                    </a>
                </div>

                <div className="bg-slate-800 border border-slate-700 rounded p-6 mt-4 text-center border-dashed">
                    <p className="text-sm text-slate-300 font-mono-sci uppercase mb-3 text-cyan-400">
                      2. Muat Naik / Tampal Imej Hasil (Ctrl+V)
                    </p>
                    <p className="text-xs text-slate-500 mb-4">Simpan atau salin imej yang dijana oleh Gemini dan muat naik ke sini.</p>
                    
                    <input 
                        type="file" 
                        accept="image/*" 
                        id="manual-sim-upload" 
                        className="hidden" 
                        onChange={handleFileChange} 
                    />
                    <label 
                        htmlFor="manual-sim-upload"
                        className="inline-block px-5 py-2 rounded bg-cyan-600/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-600/40 cursor-pointer transition font-bold"
                    >
                        Pilih Fail Imej
                    </label>
                </div>
            </div>
            
        </div>
    </div>
  )
};

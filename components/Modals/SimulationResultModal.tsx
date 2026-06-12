import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface SimulationResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalImage: string;
  generatedImages: string[];
  onRegenerate: (customPrompt: string) => void;
}

export const SimulationResultModal: React.FC<SimulationResultModalProps> = ({ 
  isOpen, onClose, originalImage, generatedImages, onRegenerate 
}) => {
  const { t } = useLanguage();
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [customPrompt, setCustomPrompt] = useState('');
  
  useEffect(() => {
    if (isOpen && generatedImages.length > 0) {
      setSelectedIndex(generatedImages.length - 1);
    }
  }, [isOpen, generatedImages]);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos(Math.max(0, Math.min(100, (x / rect.width) * 100)));
  };

  const onStart = (clientX: number) => { isDragging.current = true; handleMove(clientX); };
  const onEnd = () => { isDragging.current = false; };
  const onMove = (clientX: number) => { if (isDragging.current) handleMove(clientX); };

  useEffect(() => {
      const handleUp = () => isDragging.current = false;
      document.addEventListener('mouseup', handleUp);
      document.addEventListener('touchend', handleUp);
      return () => { document.removeEventListener('mouseup', handleUp); document.removeEventListener('touchend', handleUp); };
  }, []);

  if (!isOpen || generatedImages.length === 0) return null;

  const currentGeneratedImage = generatedImages[selectedIndex];

  return (
    <div className="fixed inset-0 z-[180] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 no-print overflow-y-auto"
      onMouseMove={(e) => onMove(e.clientX)}
      onTouchMove={(e) => onMove(e.touches[0].clientX)}
      onMouseUp={onEnd}
      onTouchEnd={onEnd}
    >
        <div className="bg-slate-900 border border-cyan-500 rounded-xl w-full max-w-5xl h-[95vh] md:h-[85vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.3)] my-auto">
             <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950 shrink-0">
                 <h3 className="text-lg font-sci-fi font-bold text-cyan-400 flex items-center gap-2">
                    <span className="animate-pulse">✨</span> {t('sim_complete')}
                 </h3>
                 <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-white">✕</button>
             </div>
             <div className="flex-1 overflow-y-auto relative bg-black/50 p-4 md:p-6 flex flex-col items-center gap-6 custom-scrollbar">
                 {/* Image Container */}
                 <div 
                    ref={containerRef}
                    onMouseDown={(e) => onStart(e.clientX)}
                    onTouchStart={(e) => onStart(e.touches[0].clientX)}
                    className="relative w-full max-h-[50vh] aspect-video border border-slate-700 rounded overflow-hidden shadow-2xl group/sim select-none shrink-0 cursor-ew-resize"
                 >
                    <img src={currentGeneratedImage} className="absolute inset-0 w-full h-full object-contain bg-slate-950 pointer-events-none" />
                    <div className="absolute inset-0 bg-slate-950 overflow-hidden pointer-events-none" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                        <img src={originalImage} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                    </div>
                    {/* Visual Divider Line */}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] pointer-events-none z-20" style={{ left: `${sliderPos}%` }}>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center shadow-lg border border-white/30 text-[10px] text-white">
                            ↔
                        </div>
                    </div>
                    
                    {/* Labels */}
                    <div className="absolute top-4 left-4 z-30 px-2 py-1 bg-black/60 backdrop-blur border border-slate-700 rounded text-[10px] font-mono-sci text-white pointer-events-none uppercase tracking-widest">
                        ORIGINAL
                    </div>
                    <div className="absolute top-4 right-4 z-30 px-2 py-1 bg-cyan-900/60 backdrop-blur border border-cyan-500/50 rounded text-[10px] font-mono-sci text-cyan-400 pointer-events-none uppercase tracking-widest text-right">
                        SANORAI_SIMULATION
                    </div>
                 </div>

                 {/* SLIDER CONTROL BOX */}
                 <div className="w-full max-w-2xl bg-slate-950/80 border border-slate-800 rounded-xl p-4 md:p-6 shadow-xl shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                                ↔
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-widest">Kawalan Perbandingan</h4>
                            </div>
                        </div>
                        <div className="text-xs font-mono-sci text-cyan-500 font-bold bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">
                            {Math.round(sliderPos)}%
                        </div>
                    </div>
                    <div className="relative pt-2">
                        <input 
                            type="range"
                            min="0"
                            max="100"
                            step="0.1"
                            value={sliderPos}
                            onChange={(e) => setSliderPos(parseFloat(e.target.value))}
                            className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg appearance-none border border-slate-700 cursor-pointer hover:border-cyan-500/50 transition-colors"
                        />
                    </div>
                 </div>

                 {/* HISTORY & REGENERATE SECTION */}
                 <div className="w-full max-w-2xl shrink-0 space-y-4">
                     {generatedImages.length > 1 && (
                         <div className="bg-slate-900/50 border border-slate-800 rounded p-4 border-dashed">
                             <h4 className="text-[10px] font-mono-sci text-slate-400 uppercase tracking-widest mb-2">Sejarah Janaan:</h4>
                             <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                                 {generatedImages.map((img, idx) => (
                                     <button 
                                        key={idx} 
                                        onClick={() => setSelectedIndex(idx)}
                                        className={`shrink-0 relative w-16 h-16 rounded overflow-hidden border-2 transition-all ${selectedIndex === idx ? 'border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'border-slate-800 opacity-50 hover:opacity-100'}`}
                                     >
                                         <img src={img} className="w-full h-full object-cover" />
                                         <div className="absolute bottom-0 right-0 bg-black/60 text-[8px] font-mono px-1 rounded-tl">{idx + 1}</div>
                                     </button>
                                 ))}
                             </div>
                         </div>
                     )}

                     <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row gap-2 items-stretch md:items-end">
                         <div className="flex-1">
                            <label className="text-[10px] font-mono-sci text-slate-400 uppercase block mb-1">Kurang berpuas hati? Masukkan arahan (prompt) baru:</label>
                            <input 
                                type="text" 
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder="Cth: Catkan dinding warna biru muda dan tambah lampu LED..."
                                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white font-mono placeholder:text-slate-600 focus:border-cyan-500 transition-colors focus:outline-none"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && customPrompt.trim()) {
                                        onRegenerate(customPrompt);
                                        setCustomPrompt('');
                                    }
                                }}
                            />
                         </div>
                         <button 
                            onClick={() => {
                                if (customPrompt.trim()) {
                                    onRegenerate(customPrompt);
                                    setCustomPrompt('');
                                }
                            }}
                            disabled={!customPrompt.trim()}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold py-2 px-4 rounded text-sm transition-colors uppercase whitespace-nowrap"
                         >
                             Jana Semula
                         </button>
                     </div>
                 </div>

                 <div className="flex flex-wrap items-center justify-center gap-4 no-print shrink-0 w-full mb-8">
                      <button 
                        onClick={() => {
                            const link = document.createElement('a');
                            link.download = `sanorai_simulation_${selectedIndex + 1}.jpg`;
                            link.href = currentGeneratedImage;
                            link.click();
                        }}
                        className="px-6 py-2 rounded bg-slate-800 border border-slate-700 text-white font-bold text-sm hover:bg-slate-700 transition"
                      >
                         Muat Turun Imej #{selectedIndex + 1}
                      </button>
                      <button 
                        onClick={onClose}
                        className="px-8 py-2 rounded bg-cyan-600 text-white font-bold text-sm hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 transition"
                      >
                         Selesai & Tutup
                      </button>
                 </div>
             </div>
        </div>
    </div>
  );
};

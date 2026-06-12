import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface SimulationResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalImage: string;
  generatedImage: string;
}

export const SimulationResultModal: React.FC<SimulationResultModalProps> = ({ isOpen, onClose, originalImage, generatedImage }) => {
  const { t } = useLanguage();
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[180] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 no-print"
      onMouseMove={(e) => onMove(e.clientX)}
      onTouchMove={(e) => onMove(e.touches[0].clientX)}
      onMouseUp={onEnd}
      onTouchEnd={onEnd}
    >
        <div className="bg-slate-900 border border-cyan-500 rounded-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.3)]">
             <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950">
                 <h3 className="text-lg font-sci-fi font-bold text-cyan-400 flex items-center gap-2">
                    <span className="animate-pulse">✨</span> {t('sim_complete')}
                 </h3>
                 <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-white">✕</button>
             </div>
             <div className="flex-1 relative bg-black/50 overflow-hidden flex flex-col items-center justify-center p-4 gap-6">
                 {/* Image Container */}
                 <div 
                    ref={containerRef}
                    onMouseDown={(e) => onStart(e.clientX)}
                    onTouchStart={(e) => onStart(e.touches[0].clientX)}
                    className="relative w-full flex-1 max-h-[60vh] aspect-video border border-slate-700 rounded overflow-hidden shadow-2xl group/sim select-none"
                 >
                    <img src={generatedImage} className="absolute inset-0 w-full h-full object-contain bg-slate-950 pointer-events-none" />
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
                 <div className="w-full max-w-2xl bg-slate-950/80 border border-slate-800 rounded-xl p-4 md:p-6 shadow-xl animate-fade-in-up">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                                ↔
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-white uppercase tracking-widest">Kawalan Perbandingan</h4>
                                <p className="text-[10px] text-slate-500 font-mono-sci italic">Seret untuk melihat perbezaan antara keadaan asal dan simulasi bersih.</p>
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
                        <div className="flex justify-between mt-2 px-1">
                            <span className="text-[9px] font-mono-sci text-slate-600 uppercase">Input Asal</span>
                            <span className="text-[9px] font-mono-sci text-cyan-600 uppercase tracking-widest font-black">Hasil Simulasi</span>
                        </div>
                    </div>
                 </div>

                 <div className="flex gap-4 no-print">
                      <button 
                        onClick={() => {
                            // Download Logic
                            const link = document.createElement('a');
                            link.download = 'sanorai_simulation.jpg';
                            link.href = generatedImage;
                            link.click();
                        }}
                        className="px-6 py-2 rounded bg-slate-800 border border-slate-700 text-white font-bold text-sm hover:bg-slate-700 transition"
                      >
                         Muat Turun Hasil
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

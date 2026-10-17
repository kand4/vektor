import React, { useState } from 'react';
import { AnalysisSession } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { getProxiedImageUrl } from '../utils/imageProxy';
import { BeforeAfterSlider } from './ArchivePage/BeforeAfterSlider';
import { generateAndDownloadPoster } from '../utils/posterGenerator';

interface SimulationGalleryProps {
  sessions: AnalysisSession[];
  onClose: () => void;
  onDeleteSimulation: (sessionId: string) => void;
  onRegenerate: (sessionId: string, customPrompt: string) => void;
}

export const SimulationGallery: React.FC<SimulationGalleryProps> = ({ sessions, onClose, onDeleteSimulation, onRegenerate }) => {
  const { t } = useLanguage();
  const simulationSessions = sessions.filter(s => s.simulationImage);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(simulationSessions.length > 0 ? simulationSessions[0].id : null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [compareMode, setCompareMode] = useState<'SLIDER' | 'SIDE_BY_SIDE'>('SLIDER');
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  
  if (simulationSessions.length === 0) {
      return (
          <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-8 max-w-md w-full text-center relative overflow-hidden">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-500 transition-colors z-20">✕</button>
                <div className="text-5xl mb-4">✨</div>
                <h2 className="text-xl font-sci-fi font-bold text-cyan-400 mb-2">TIADA SIMULASI</h2>
                <p className="text-slate-400 text-sm">Anda belum menjana sebarang imej simulasi. Sila jana simulasi pensterilan daripada laporan analisis terlebih dahulu.</p>
                <button onClick={onClose} className="mt-6 bg-slate-800 text-slate-300 px-6 py-2 rounded-lg font-bold hover:bg-slate-700 w-full tracking-widest uppercase">Tutup</button>
             </div>
          </div>
      );
  }

  const activeSession = simulationSessions.find(s => s.id === activeSessionId) || simulationSessions[0];

  const handleRegenerate = async (sessionId: string) => {
      setIsRegenerating(true);
      await onRegenerate(sessionId, "");
      setIsRegenerating(false);
  };

  const handleDownloadPoster = async () => {
      if (!activeSession.result) return;
      setIsGeneratingPoster(true);
      try {
          await generateAndDownloadPoster({
              sessionId: activeSession.id,
              fileName: activeSession.fileName,
              originalImageSrc: activeSession.imageSrc,
              simulationImageSrc: activeSession.simulationImage,
              result: activeSession.result
          });
      } finally {
          setIsGeneratingPoster(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fade-in">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col relative overflow-hidden shadow-2xl">
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3 z-10 shrink-0">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-cyan-950 rounded-lg flex items-center justify-center border border-cyan-500/50 text-cyan-400">✨</div>
                   <div>
                       <h2 className="text-lg sm:text-xl font-sci-fi font-bold text-white">GALERI SIMULASI & PERBANDINGAN VISUAL</h2>
                       <p className="text-xs text-slate-400 font-mono">{simulationSessions.length} Rekod Dijana · {activeSession.fileName}</p>
                   </div>
                </div>

                <div className="flex items-center gap-2">
                   <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-lg">
                      <button
                        onClick={() => setCompareMode('SLIDER')}
                        className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-colors ${
                          compareMode === 'SLIDER' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        ↔ Slider Interaktif
                      </button>
                      <button
                        onClick={() => setCompareMode('SIDE_BY_SIDE')}
                        className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-colors ${
                          compareMode === 'SIDE_BY_SIDE' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        ⊞ Bersebelahan
                      </button>
                   </div>
                   <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 rounded-lg w-9 h-9 flex items-center justify-center hover:bg-red-600 transition-colors border border-slate-700">✕</button>
                </div>
            </div>
            
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Sidebar - Gallery List */}
                <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950/60 overflow-x-auto lg:overflow-y-auto custom-scrollbar shrink-0 flex flex-row lg:flex-col p-3 gap-3 h-28 lg:h-auto">
                    {simulationSessions.map(session => (
                        <div key={session.id} className="relative shrink-0 w-24 h-20 lg:w-full lg:h-28 group">
                            <button 
                                onClick={() => setActiveSessionId(session.id)}
                                className={`w-full h-full rounded-xl overflow-hidden border-2 transition-all ${activeSessionId === session.id ? 'border-cyan-400 shadow-md' : 'border-slate-800 opacity-60 hover:opacity-100'}`}
                            >
                                <img 
                                    src={session.simulationImage!} 
                                    className="w-full h-full object-cover" 
                                    alt="Simulasi"
                                    onError={(e) => {
                                        const target = e.currentTarget;
                                        if (!target.dataset.proxied && session.simulationImage?.startsWith('http')) {
                                            target.dataset.proxied = 'true';
                                            target.src = getProxiedImageUrl(session.simulationImage);
                                        }
                                    }} 
                                />
                            </button>
                            <button onClick={() => onDeleteSimulation(session.id)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-600 hover:bg-red-500 text-white rounded-md flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10" title="Padam Simulasi Ini">✖</button>
                        </div>
                    ))}
                </div>
                
                {/* Main View Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 flex flex-col relative bg-slate-950">
                    {isRegenerating && (
                        <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center">
                            <div className="w-14 h-14 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <h2 className="text-lg font-bold font-sci-fi text-cyan-400 tracking-wider">MENJANA SEMULA SIMULASI...</h2>
                        </div>
                    )}

                    {compareMode === 'SLIDER' ? (
                        <div className="flex-1 flex flex-col justify-center">
                            <BeforeAfterSlider
                                originalImage={activeSession.imageSrc}
                                simulatedImage={activeSession.simulationImage!}
                                title="SLIDER PERBANDINGAN: ASAL vs SIMULASI AI"
                            />
                        </div>
                    ) : (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr h-full min-h-[380px]">
                            <div className="relative group rounded-xl overflow-hidden border border-slate-800 h-full flex flex-col bg-black">
                                <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-sm px-3 py-1 border border-slate-700 rounded-md z-10 text-[10px] font-mono font-bold text-slate-300">SEBELUM (ASAL)</div>
                                <img 
                                    src={activeSession.imageSrc} 
                                    className="w-full h-full object-contain" 
                                    alt="Original"
                                    onError={(e) => {
                                        const target = e.currentTarget;
                                        if (!target.dataset.proxied && activeSession.imageSrc?.startsWith('http')) {
                                            target.dataset.proxied = 'true';
                                            target.src = getProxiedImageUrl(activeSession.imageSrc);
                                        }
                                    }} 
                                />
                            </div>
                            <div className="relative group rounded-xl overflow-hidden border border-cyan-500/40 h-full flex flex-col bg-black">
                                <div className="absolute top-3 left-3 bg-cyan-950/90 backdrop-blur-sm px-3 py-1 border border-cyan-500/40 rounded-md z-10 text-[10px] font-mono font-bold text-cyan-300">SELEPAS (SIMULASI AI)</div>
                                <img 
                                    src={activeSession.simulationImage} 
                                    className="w-full h-full object-contain" 
                                    alt="Generated"
                                    onError={(e) => {
                                        const target = e.currentTarget;
                                        if (!target.dataset.proxied && activeSession.simulationImage?.startsWith('http')) {
                                            target.dataset.proxied = 'true';
                                            target.src = getProxiedImageUrl(activeSession.simulationImage);
                                        }
                                    }} 
                                />
                            </div>
                        </div>
                    )}

                    <div className="mt-5 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-900/90 border border-slate-800 px-4 py-3.5 rounded-xl shrink-0">
                        <div className="text-xs font-mono text-slate-400">
                            ID Sesi: <span className="text-slate-200">{activeSession.id.substring(0, 16)}</span> · Fail: <span className="text-slate-200">{activeSession.fileName}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                             {activeSession.result && (
                               <button
                                 onClick={handleDownloadPoster}
                                 disabled={isGeneratingPoster}
                                 className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                               >
                                 <span>🖼️</span>
                                 <span>{isGeneratingPoster ? 'Menjana Poster...' : 'Muat Turun Poster PNG'}</span>
                               </button>
                             )}
                             <a
                               href={activeSession.simulationImage}
                               download={`Simulasi_Bersih_${activeSession.id.slice(-8)}.jpg`}
                               className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                             >
                               <span>⬇️</span>
                               <span>Imej Simulasi</span>
                             </a>
                             <button onClick={() => handleRegenerate(activeSession.id)} className="bg-cyan-950/70 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-900 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5">
                                <span>🔄</span>
                                <span>Jana Semula</span>
                             </button>
                             <button onClick={() => onDeleteSimulation(activeSession.id)} className="bg-slate-800 text-red-400 border border-slate-700 hover:border-red-500/50 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5">
                                <span>🗑️</span>
                                <span>Padam</span>
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};


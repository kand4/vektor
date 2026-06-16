import React, { useState } from 'react';
import { AnalysisSession } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

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
      await onRegenerate(sessionId, ""); // Default prompt for re-generation
      setIsRegenerating(false);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fade-in">
        <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col relative overflow-hidden shadow-2xl">
            <div className="bg-slate-950 p-4 border-b border-slate-700 flex justify-between items-center z-10 shrink-0">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-cyan-900/50 rounded-lg flex items-center justify-center border border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]">✨</div>
                   <div>
                       <h2 className="text-xl font-sci-fi font-bold text-cyan-400">GALERI SIMULASI PENSTERILAN</h2>
                       <p className="text-[10px] text-slate-400 font-mono tracking-widest">{simulationSessions.length} REKOD DIJANA</p>
                   </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-500 transition-colors shadow-lg border border-slate-600 hover:border-red-400">✕</button>
            </div>
            
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Sidebar - Gallery List */}
                <div className="w-full lg:w-1/4 max-w-xs border-r border-slate-800 bg-slate-950/50 overflow-y-auto custom-scrollbar shrink-0 flex flex-row lg:flex-col p-4 gap-4 h-32 lg:h-auto">
                    {simulationSessions.map(session => (
                        <div key={session.id} className="relative shrink-0 w-24 h-24 lg:w-full lg:h-32 group">
                            <button 
                                onClick={() => setActiveSessionId(session.id)}
                                className={`w-full h-full rounded-xl overflow-hidden border-2 transition-all ${activeSessionId === session.id ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'border-slate-700 opacity-60 hover:opacity-100'}`}
                            >
                                <img src={session.simulationImage!} className="w-full h-full object-cover" alt="Simulasi" />
                            </button>
                            <button onClick={() => onDeleteSimulation(session.id)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg focus:opacity-100 z-10 border border-red-400" title="Padam Simulasi Ini">✖</button>
                        </div>
                    ))}
                </div>
                
                {/* Main View Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800/50 via-slate-900 to-black">
                    {isRegenerating && (
                        <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center">
                            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_cyan]"></div>
                            <h2 className="text-xl font-bold font-sci-fi text-cyan-400 tracking-wider">MENJANA SEMULA...</h2>
                        </div>
                    )}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr h-full min-h-[400px]">
                        <div className="relative group rounded-xl overflow-hidden border border-slate-700 h-full flex flex-col">
                            <div className="absolute top-0 left-0 bg-slate-900/80 backdrop-blur-sm px-4 py-2 border-b border-r border-slate-700 rounded-br-lg z-10 text-[10px] font-bold tracking-widest text-slate-300">ASAL</div>
                            <img src={activeSession.imageSrc} className="w-full h-full object-contain bg-black" alt="Original" />
                        </div>
                        <div className="relative group rounded-xl overflow-hidden border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)] h-full flex flex-col">
                            <div className="absolute top-0 left-0 bg-cyan-900/80 backdrop-blur-sm px-4 py-2 border-b border-r border-cyan-500/50 rounded-br-lg z-10 text-[10px] font-bold tracking-widest text-cyan-300">SIMULASI BERSIH</div>
                            <img src={activeSession.simulationImage} className="w-full h-full object-contain bg-black" alt="Generated" />
                            <a href={activeSession.simulationImage} download={`Simulasi_Bersih_${activeSession.id}.jpg`} className="absolute bottom-4 right-4 bg-cyan-600/90 hover:bg-cyan-500 text-white p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10" title="Muat Turun">⬇️</a>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-950/80 border border-slate-700 p-4 rounded-xl shrink-0">
                        <div className="text-sm font-mono-sci text-slate-400">
                            ID: {activeSession.id.substring(0, 15)}...
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => onDeleteSimulation(activeSession.id)} className="bg-slate-800 text-red-400 border border-slate-700 hover:border-red-500/50 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2">
                                🗑️ Padam Simulasi Ini
                             </button>
                             <button onClick={() => handleRegenerate(activeSession.id)} className="bg-cyan-900/40 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-800 hover:text-cyan-300 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2">
                                🔄 Jana Semula (AI)
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

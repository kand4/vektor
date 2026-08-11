import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface MobileBottomNavProps {
  currentView: 'HOME' | 'LARVAE_DETECTION' | 'ADULT_MOSQUITO_DETECTION' | 'MANUAL_SIMULATION' | 'GAME';
  currentHomeSubView: 'MENU' | 'FORENSIC' | 'ANALYTICS';
  onSelectView: (view: 'HOME' | 'LARVAE_DETECTION' | 'ADULT_MOSQUITO_DETECTION' | 'MANUAL_SIMULATION' | 'GAME', subView?: 'MENU' | 'FORENSIC' | 'ANALYTICS') => void;
  onOpenHeatmap?: () => void;
  onOpenSimulation?: () => void;
  sessionsCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  currentHomeSubView,
  onSelectView,
  onOpenHeatmap,
  onOpenSimulation,
  sessionsCount = 0,
}) => {
  const { language } = useLanguage();
  const isMalay = language === 'ms';
  const [showSubMenu, setShowSubMenu] = useState(false);

  const isHomeActive = currentView === 'HOME' && currentHomeSubView === 'MENU';
  const isForensicActive = currentView === 'HOME' && currentHomeSubView === 'FORENSIC';
  const isInsectScannerActive = currentView === 'LARVAE_DETECTION' || currentView === 'ADULT_MOSQUITO_DETECTION';
  const isGameActive = currentView === 'GAME';
  const isAnalyticsActive = currentView === 'HOME' && currentHomeSubView === 'ANALYTICS';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[140] md:hidden bg-slate-950/95 border-t border-emerald-900/40 backdrop-blur-xl px-1.5 py-1 shadow-[0_-5px_25px_rgba(0,0,0,0.8)]">
      
      {/* Insect Scanner Quick Selection Menu Overlay */}
      {showSubMenu && (
        <>
          <div 
            className="fixed inset-0 z-10 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSubMenu(false)}
          ></div>
          <div className="absolute bottom-full left-2 right-2 mb-2 z-20 bg-slate-900 border border-emerald-500/40 rounded-2xl p-3 shadow-2xl animate-fade-in-up flex flex-col gap-2">
            <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest border-b border-slate-800 pb-1.5 flex items-center justify-between">
              <span>{isMalay ? '🔬 PILIH PENGESAN SPESIS' : '🔬 CHOOSE SPECIES DETECTOR'}</span>
              <button onClick={() => setShowSubMenu(false)} className="text-slate-400 font-bold px-2 py-0.5">✕</button>
            </div>
            
            <button
              onClick={() => {
                setShowSubMenu(false);
                onSelectView('LARVAE_DETECTION');
              }}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                currentView === 'LARVAE_DETECTION'
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center text-xl shrink-0">🐛</div>
              <div>
                <span className="block text-xs font-bold font-sci-fi text-white">
                  {isMalay ? 'DETEKTIF JENTIK-JENTIK (LARVAE)' : 'LARVAE DETECTIVE'}
                </span>
                <span className="text-[10px] text-slate-400 leading-tight block">
                  {isMalay ? 'Visi Komputer Roboflow YOLOv8 mengesan jentik-jentik' : 'Roboflow YOLOv8 computer vision larvae model'}
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                setShowSubMenu(false);
                onSelectView('ADULT_MOSQUITO_DETECTION');
              }}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                currentView === 'ADULT_MOSQUITO_DETECTION'
                  ? 'bg-purple-950/80 border-purple-400 text-purple-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center text-xl shrink-0">🦟</div>
              <div>
                <span className="block text-xs font-bold font-sci-fi text-white">
                  {isMalay ? 'PENGECAMAN NYAMUK DEWASA' : 'ADULT MOSQUITO SPECIES'}
                </span>
                <span className="text-[10px] text-slate-400 leading-tight block">
                  {isMalay ? 'Morfologi Aedes, Anopheles, & Culex jantina' : 'Morphology analysis for Aedes, Anopheles & Culex'}
                </span>
              </div>
            </button>

            {onOpenSimulation && (
              <button
                onClick={() => {
                  setShowSubMenu(false);
                  onOpenSimulation();
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-rose-500/30 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 text-left transition"
              >
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-lg shrink-0">✨</div>
                <div>
                  <span className="block text-xs font-bold font-sci-fi text-white">
                    {isMalay ? 'SIMULATOR REMEDIASI (IMAGEN 3)' : 'REMEDIATION SIMULATOR'}
                  </span>
                </div>
              </button>
            )}
          </div>
        </>
      )}

      {/* Main 5-Icon Navigation Grid */}
      <div className="grid grid-cols-5 gap-1 items-center text-center">
        
        {/* Tab 1: Utama / Home */}
        <button
          onClick={() => {
            setShowSubMenu(false);
            onSelectView('HOME', 'MENU');
          }}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 ${
            isHomeActive
              ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 scale-105'
              : 'text-slate-400 hover:text-slate-200 active:scale-95'
          }`}
        >
          <span className="text-lg leading-none mb-0.5">🏠</span>
          <span className="text-[9px] font-bold tracking-tight uppercase font-mono">
            {isMalay ? 'Utama' : 'Home'}
          </span>
        </button>

        {/* Tab 2: Imbas Premis */}
        <button
          onClick={() => {
            setShowSubMenu(false);
            onSelectView('HOME', 'FORENSIC');
          }}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 relative ${
            isForensicActive
              ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 scale-105'
              : 'text-slate-400 hover:text-slate-200 active:scale-95'
          }`}
        >
          <span className="text-lg leading-none mb-0.5">📸</span>
          <span className="text-[9px] font-bold tracking-tight uppercase font-mono">
            {isMalay ? 'Imbas' : 'Scan'}
          </span>
          {sessionsCount > 0 && (
            <span className="absolute top-1 right-2 bg-emerald-500 text-black text-[8px] font-bold px-1 rounded-full animate-pulse">
              {sessionsCount}
            </span>
          )}
        </button>

        {/* Tab 3: Spesis Vektor (Dropdown Launcher) */}
        <button
          onClick={() => setShowSubMenu(!showSubMenu)}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 ${
            isInsectScannerActive || showSubMenu
              ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 scale-105 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
              : 'text-slate-400 hover:text-slate-200 active:scale-95'
          }`}
        >
          <span className="text-lg leading-none mb-0.5">🔬</span>
          <span className="text-[9px] font-bold tracking-tight uppercase font-mono flex items-center gap-0.5">
            {isMalay ? 'Spesis' : 'Species'} <span className="text-[7px]">▲</span>
          </span>
        </button>

        {/* Tab 4: Arked / Game */}
        <button
          onClick={() => {
            setShowSubMenu(false);
            onSelectView('GAME');
          }}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 ${
            isGameActive
              ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 scale-105 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
              : 'text-slate-400 hover:text-slate-200 active:scale-95'
          }`}
        >
          <span className="text-lg leading-none mb-0.5">🎮</span>
          <span className="text-[9px] font-bold tracking-tight uppercase font-mono">
            {isMalay ? 'Arked' : 'Game'}
          </span>
        </button>

        {/* Tab 5: Analitik / Peta Wabak */}
        <button
          onClick={() => {
            setShowSubMenu(false);
            onSelectView('HOME', 'ANALYTICS');
          }}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 ${
            isAnalyticsActive
              ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300 scale-105'
              : 'text-slate-400 hover:text-slate-200 active:scale-95'
          }`}
        >
          <span className="text-lg leading-none mb-0.5">📊</span>
          <span className="text-[9px] font-bold tracking-tight uppercase font-mono">
            {isMalay ? 'Data' : 'Analytics'}
          </span>
        </button>

      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';

interface BeforeAfterSliderProps {
  originalImage: string;
  simulatedImage: string;
  title?: string;
  aspectRatio?: string;
  onDownloadClean?: () => void;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  originalImage,
  simulatedImage,
  title,
  onDownloadClean
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  };

  const onStart = (clientX: number) => {
    isDragging.current = true;
    handleMove(clientX);
  };

  const onEnd = () => {
    isDragging.current = false;
  };

  const onMove = (clientX: number) => {
    if (isDragging.current) {
      handleMove(clientX);
    }
  };

  useEffect(() => {
    const handleUp = () => {
      isDragging.current = false;
    };
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, []);

  return (
    <div className={`flex flex-col w-full ${isFullscreen ? 'fixed inset-0 z-[300] bg-black/95 p-4 md:p-8 flex flex-col justify-center items-center' : ''}`}>
      {/* Top Slider Bar Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="text-xs md:text-sm font-bold font-sci-fi text-cyan-300 tracking-wider uppercase">
            {title || 'INTERAKTIF SEBELUM & SELEPAS (SLIDER DUA HALA)'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSliderPos(0)}
            className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded border transition-all ${sliderPos === 0 ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}
            title="Papar 100% Imej Asal"
          >
            ASAL (100%)
          </button>
          <button
            onClick={() => setSliderPos(50)}
            className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded border transition-all ${Math.round(sliderPos) === 50 ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}
            title="Papar 50/50 Separuh"
          >
            SPLIT (50/50)
          </button>
          <button
            onClick={() => setSliderPos(100)}
            className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded border transition-all ${sliderPos === 100 ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}
            title="Papar 100% Simulasi Bersih"
          >
            BERSIH (100%)
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-400 rounded transition-all text-xs"
            title={isFullscreen ? "Keluar Paparan Penuh" : "Buka Paparan Skrin Penuh"}
          >
            {isFullscreen ? '✕ KELUAR' : '⛶ SKRIN PENUH'}
          </button>
        </div>
      </div>

      {/* Main Interactive Slider Canvas */}
      <div
        ref={containerRef}
        onMouseDown={(e) => onStart(e.clientX)}
        onTouchStart={(e) => onStart(e.touches[0].clientX)}
        onMouseMove={(e) => onMove(e.clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        className="relative w-full h-[400px] sm:h-[480px] md:h-[560px] max-h-[75vh] rounded-2xl overflow-hidden select-none cursor-ew-resize border border-slate-700 bg-slate-950 shadow-2xl group shadow-cyan-950/20"
      >
        {/* Layer 1: Simulated Clean Image (Background / Right) */}
        <img
          src={simulatedImage}
          alt="Simulasi Remediasi Bersih"
          className="absolute inset-0 w-full h-full object-contain bg-slate-950 pointer-events-none"
        />

        {/* Layer 2: Original Image (Foreground / Left, Clipped) */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none bg-slate-950"
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
        >
          <img
            src={originalImage}
            alt="Imej Asal Sebelum"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
        </div>

        {/* Divider Line & Glow */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-300 via-cyan-400 to-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.9)] pointer-events-none z-30"
          style={{ left: `${sliderPos}%` }}
        >
          {/* Circular Sliding Knob */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-cyan-500 text-slate-950 rounded-full flex items-center justify-center font-black shadow-[0_0_20px_rgba(6,182,212,0.8)] border-2 border-white text-xs cursor-ew-resize group-hover:scale-110 transition-transform">
            ↔
          </div>
        </div>

        {/* Left Label: SEBELUM */}
        <div className="absolute top-3 left-3 z-20 pointer-events-none">
          <div className="bg-slate-950/80 backdrop-blur-md border border-amber-500/50 px-3 py-1.5 rounded-lg shadow-lg">
            <span className="text-[10px] font-mono font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              SEBELUM (ASAL - TERANCAM)
            </span>
          </div>
        </div>

        {/* Right Label: SELEPAS */}
        <div className="absolute top-3 right-3 z-20 pointer-events-none">
          <div className="bg-slate-950/80 backdrop-blur-md border border-emerald-500/50 px-3 py-1.5 rounded-lg shadow-lg text-right">
            <span className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              SELEPAS (SIMULASI BERSIH)
            </span>
          </div>
        </div>

        {/* Floating Hint Overlay on Hover */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-black/70 backdrop-blur-md border border-slate-700/80 px-4 py-1.5 rounded-full opacity-80 group-hover:opacity-100 transition-opacity">
          <p className="text-[10px] font-mono text-slate-300 tracking-wider flex items-center gap-2">
            <span>👈</span>
            <span>SERET KIRI / KANAN UNTUK MEMBANDING</span>
            <span>👉</span>
          </p>
        </div>
      </div>

      {/* Range Slider Control & Percentage Readout */}
      <div className="mt-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center gap-4">
        <div className="text-[11px] font-mono text-amber-400 font-bold shrink-0">
          Asal: {Math.round(sliderPos)}%
        </div>

        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={sliderPos}
          onChange={(e) => setSliderPos(parseFloat(e.target.value))}
          className="flex-1 accent-cyan-400 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer border border-slate-700 hover:border-cyan-500/50 transition-colors"
          aria-label="Slider Perbandingan Sebelum dan Selepas"
        />

        <div className="text-[11px] font-mono text-emerald-400 font-bold shrink-0">
          Bersih: {Math.round(100 - sliderPos)}%
        </div>

        {onDownloadClean && (
          <button
            onClick={onDownloadClean}
            className="shrink-0 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            title="Muat turun gambar simulasi bersih HD"
          >
            <span>⬇️</span>
            <span className="hidden sm:inline">MUAT TURUN BERSIH</span>
          </button>
        )}
      </div>
    </div>
  );
};

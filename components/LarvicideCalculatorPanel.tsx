import React, { useState, useMemo } from 'react';
import { RiskDetection } from '../types';

interface LarvicideCalculatorPanelProps {
  risks: RiskDetection[];
  defaultExpanded?: boolean;
}

interface ContainerPreset {
  id: string;
  label: string;
  liters: number;
  note: string;
}

const CONTAINER_PRESETS: ContainerPreset[] = [
  { id: 'saucer', label: 'Alas Pasu / Bekas Kecil (~9L)', liters: 9, note: '1g Abate 1% SG (hujung sudu teh)' },
  { id: 'bucket', label: 'Baldi / Tong Simpanan (~45L)', liters: 45, note: '5g Abate 1% SG (~1 sudu teh rata)' },
  { id: 'drum', label: 'Tong Air / Kolah Mandi Standard (90L)', liters: 90, note: '10g Abate 1% SG (1 paket / 2 sudu teh)' },
  { id: 'tank', label: 'Tangki Simpanan / Kolam Kecil (200L)', liters: 200, note: '22g Abate 1% SG (~2.2 paket)' },
  { id: 'drain', label: 'Longkang Mati / Perangkap Air (450L)', liters: 450, note: '50g Abate 1% SG (5 paket standard)' },
  { id: 'pond', label: 'Kolam Landskap / Takungan Besar (900L)', liters: 900, note: '100g Abate 1% SG atau Semburan Bti' }
];

export const LarvicideCalculatorPanel: React.FC<LarvicideCalculatorPanelProps> = ({
  risks,
  defaultExpanded = false
}) => {
  const vectorRisks = useMemo(() => risks.filter(r => r.category === 'VECTOR'), [risks]);
  const [isOpen, setIsOpen] = useState<boolean>(defaultExpanded);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('drum');
  const [customLiters, setCustomLiters] = useState<number>(Math.max(1, vectorRisks.length) * 90);
  const [containerCount, setContainerCount] = useState<number>(Math.max(1, vectorRisks.length));

  const handleSelectPreset = (preset: ContainerPreset) => {
    setSelectedPresetId(preset.id);
    setCustomLiters(preset.liters * containerCount);
  };

  const handleCountChange = (newCount: number) => {
    const safeCount = Math.max(1, Math.min(100, newCount));
    setContainerCount(safeCount);
    const activePreset = CONTAINER_PRESETS.find(p => p.id === selectedPresetId);
    if (activePreset) {
      setCustomLiters(activePreset.liters * safeCount);
    }
  };

  // KKM Standard Formula:
  // Abate 1% SG (Temephos 1% Sand Granules): 10g per 90 Liters (1 ppm active ingredient) -> ~1g per 9 Liters
  // 1 rata sudu teh (teaspoon) ≈ 5g | 1 paket KKM standard = 10g
  // Bti (VectoBac WG): ~0.4g - 0.5g per 50 Liters of water surface
  const abateGrams = Math.max(1, Math.round((customLiters / 9) * 10) / 10);
  const teaspoons = Math.round((abateGrams / 5) * 10) / 10;
  const packets10g = Math.ceil(abateGrams / 10);
  const btiGrams = Math.max(0.5, Math.round((customLiters / 50) * 0.5 * 10) / 10);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden transition-all no-print">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-mono text-xs font-bold">
            Rx
          </div>
          <div>
            <div className="text-xs font-sci-fi font-bold text-slate-100 uppercase tracking-wider">
              Kalkulator Sukatan Dos Larvasid KKM (Abate 1% SG & Bti)
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              {vectorRisks.length} zon takungan dikesan · Anggaran semasa: {abateGrams}g Abate ({customLiters}L air)
            </div>
          </div>
        </div>
        <span className="text-xs font-mono text-cyan-400">
          {isOpen ? 'TUTUP ▲' : 'KIRA DOS ▼'}
        </span>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 space-y-4">
          {/* Preset Selector */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2">
              1. Pilih Jenis Bekas Takungan (Standard Piawaian KKM)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CONTAINER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`px-3 py-2 rounded-lg border text-left transition-all ${
                    selectedPresetId === preset.id
                      ? 'bg-cyan-950/70 border-cyan-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">{preset.label}</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">{preset.note}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Volume & Container Count Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                Bilangan Bekas / Titik Takungan
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCountChange(containerCount - 1)}
                  className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={containerCount}
                  onChange={(e) => handleCountChange(parseInt(e.target.value) || 1)}
                  className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center text-sm font-mono font-bold text-white"
                />
                <button
                  type="button"
                  onClick={() => handleCountChange(containerCount + 1)}
                  className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                >
                  +
                </button>
                <span className="text-xs text-slate-400 font-mono">bekas</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                Jumlah Isipadu Air Keseluruhan (Liter)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={50000}
                  value={customLiters}
                  onChange={(e) => {
                    setSelectedPresetId('custom');
                    setCustomLiters(Math.max(1, parseInt(e.target.value) || 1));
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono font-bold text-cyan-300"
                />
                <span className="text-xs font-mono text-slate-400">Liter</span>
              </div>
            </div>
          </div>

          {/* Calculated Dosages Output */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-slate-900 border border-cyan-500/40 rounded-xl p-3.5">
              <div className="text-[10px] font-mono text-cyan-400 uppercase">SUKATAN ABATE 1% SG (TEMEPHOS)</div>
              <div className="text-2xl font-extrabold font-sci-fi text-white mt-1">
                {abateGrams} <span className="text-xs font-normal text-slate-300">gram</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-1">
                ≈ {teaspoons} sudu teh ({packets10g} paket 10g)
              </div>
            </div>

            <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-3.5">
              <div className="text-[10px] font-mono text-emerald-400 uppercase">ALTERNATIF BIOLOGI (BTI WG)</div>
              <div className="text-2xl font-extrabold font-sci-fi text-white mt-1">
                {btiGrams} <span className="text-xs font-normal text-slate-300">gram</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-1">
                Larut air & sembur permukaan takungan
              </div>
            </div>

            <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-3.5">
              <div className="text-[10px] font-mono text-amber-400 uppercase">KITARAN ULANGAN RAWATAN</div>
              <div className="text-2xl font-extrabold font-sci-fi text-white mt-1">
                14 - 21 <span className="text-xs font-normal text-slate-300">hari</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-1">
                Kesan residu efektif 2 hingga 3 minggu
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-2.5 flex items-center justify-between flex-wrap gap-2">
            <span>Formula Rasmi KKM: 10 gram Abate 1% SG bagi setiap 90 Liter air (1 ppm).</span>
            <span className="text-emerald-400">Selamat untuk air kegunaan domestik mengikut sukatan</span>
          </div>
        </div>
      )}
    </div>
  );
};

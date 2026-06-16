import React, { useState, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Toast } from './Toast';

interface ManualSimulationPageProps {
  onBack: () => void;
  onSaveSimulation: (originalImageBase64: string, simulatedImageBase64: string) => void;
}

export const ManualSimulationPage: React.FC<ManualSimulationPageProps> = ({ onBack, onSaveSimulation }) => {
  const { t } = useLanguage();
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [simulatedImage, setSimulatedImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  
  // Customization parameters for the prompt
  const [keepPeople, setKeepPeople] = useState(true);
  const [cleanlinessLevel, setCleanlinessLevel] = useState<'STERILE' | 'MODERN_CLEAN' | 'ULTRA_CLEAN'>('STERILE');
  const [lighting, setLighting] = useState<'NATURAL' | 'NEON_SURGICAL' | 'BRIGHT_DAYLIGHT'>('BRIGHT_DAYLIGHT');
  const [additionalDirectives, setAdditionalDirectives] = useState('');

  // Slider comparison state
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  const fileInputRefOriginal = useRef<HTMLInputElement>(null);
  const fileInputRefSimulated = useRef<HTMLInputElement>(null);

  // Generate dynamic prompt based on user selections
  const generatePromptText = () => {
    const levelText = 
      cleanlinessLevel === 'STERILE' ? 'sanitized, sterilized, medical-grade clean, spotless and pristine' :
      cleanlinessLevel === 'MODERN_CLEAN' ? 'modern, beautiful, organized, highly cleaned and clear of mess' :
      'exceptionally cleaned, neat, all elements polished and orderly';

    const lightText = 
      lighting === 'NATURAL' ? 'natural, soft ambient lighting' :
      lighting === 'NEON_SURGICAL' ? 'bright surgical neon overhead lighting' :
      'crisp, clear daylight shining into the room';

    const humanText = keepPeople 
      ? '5. KEKALKAN semua manusia/pekerja di kedudukan yang sama seperti imej asal, cuma pastikan pakaian mereka disterilkan atau ditukar kepada uniform yang bersih.'
      : '5. Alih keluar atau hilangkan sebarang kelibat manusia/pekerja di dalam gambar supaya hanya kelihatan persekitaran bertaraf steril.';

    return `Sila gunakan tool penjana imej (Imagen) untuk mengubah imej kotor/tidak sanitasi ini berdasarkan panduan berikut:

[PARAMETRE UTAMA / CRITICAL PARAMETERS]:
1. PERSPEKTIF & STRUKTUR: Kekalkan 100% sudut kamera, perspektif, susun atur perabot, pintu, dan tingkap dari imej asal. Jangan ubah struktur asas.
2. KEBERSIHAN MAKSIMUM: Ubah status kebersihan semasanya kepada "${levelText}". Buang semua kotoran, kesan karat, minyak, takungan air, jentik-jentik, lalat, serangga, sampah sarap, habuk, dan sisa tercemar.
3. PEMULIHAN DINDING/LANTAI: Sekiranya ada lantai pecah, tiles rosak, cat dinding terkopat atau berlumut, gantikan dengan cat baru/lantai baru yang kukuh dan berkilat.
4. PENCAHAYAAN: Gunakan "${lightText}" untuk memperlihatkan tahap kesterilan kawasan secara profesional.
${humanText}
${additionalDirectives ? `6. ARAHAN TAMBAHAN PENGGUNA: ${additionalDirectives}` : ''}
7. KUALITI VISUAL: Hasilkan output dengan gaya hiper-fotorealistik, tekstur yang sangat terperinci (8k resolution), tanpa herotan/distorsi, kelihatan seperti foto sebenar kawasan yang telah dibersihkan secara intensif.`;
  };

  const currentPrompt = generatePromptText();

  const handleCopyAndOpen = () => {
    try {
      navigator.clipboard.writeText(currentPrompt);
      setCopied(true);
      setToastMsg({ msg: "Prompt Manual disalin! Membuka gemini.google.com/app...", type: 'success' });
      setTimeout(() => setCopied(false), 2000);
      window.open("https://gemini.google.com/app", "_blank");
    } catch (err) {
      console.error(err);
      setToastMsg({ msg: "Gagal menyalin secara automatik. Sila salin prompt secara manual.", type: 'error' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'original' | 'simulated') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          if (type === 'original') setOriginalImage(event.target.result as string);
          else setSimulatedImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Support paste events
  const handlePaste = (e: React.ClipboardEvent, type: 'original' | 'simulated') => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                if (type === 'original') {
                  setOriginalImage(event.target.result as string);
                  setToastMsg({ msg: "Imej asal berjaya ditampal!", type: 'success' });
                } else {
                  setSimulatedImage(event.target.result as string);
                  setToastMsg({ msg: "Imej simulasi bersih berjaya ditampal!", type: 'success' });
                }
              }
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, type: 'original' | 'simulated') => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          if (type === 'original') setOriginalImage(event.target.result as string);
          else setSimulatedImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!originalImage || !simulatedImage) {
      setToastMsg({ msg: "Sila lengkapkan kedua-dua imej asal dan imej simulasi sebelum menyimpan.", type: 'error' });
      return;
    }
    onSaveSimulation(originalImage, simulatedImage);
    setToastMsg({ msg: "Simulasi manual berjaya disimpan ke dalam rekod imbasan dan galeri simulasi!", type: 'success' });
    setTimeout(() => {
      onBack();
    }, 1500);
  };

  // Drag controls for Before/After Slider
  const handleSliderMove = (clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleSliderMove(e.touches[0].clientX);
    }
  };

  return (
    <div className="animate-fade-in pb-20 max-w-6xl mx-auto">
      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center border border-slate-700 transition-colors"
          >
            ←
          </button>
          <div>
            <span className="text-[10px] text-cyan-400 font-mono-sci uppercase tracking-[0.2em] block mb-1">PRO-GRADE SANITATION LAB</span>
            <h1 className="text-2xl font-bold text-white font-sci-fi tracking-wide flex items-center gap-2">
              ✨ DETAK SIMULASI MANUAL <span className="text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">DEDICATED PAGE</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setOriginalImage(null);
              setSimulatedImage(null);
              setAdditionalDirectives('');
            }}
            className="px-4 py-2 text-xs font-mono uppercase bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 font-bold transition-all"
          >
            Reset Semua
          </button>
          <button
            onClick={handleSave}
            disabled={!originalImage || !simulatedImage}
            className={`px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider font-sci-fi transition-all border ${
              originalImage && simulatedImage 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer' 
                : 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed'
            }`}
          >
            💾 Simpan Rekod
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Controls & Prompt Generator */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* STEP 1: Customization Config Panel */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl backdrop-blur-md">
            <h3 className="text-xs font-bold text-cyan-400 font-mono-sci uppercase tracking-[0.15em] border-b border-slate-800 pb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></span>
              Konfigurasi Prompt Dinamik
            </h3>

            {/* Cleanliness selection */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-mono-sci uppercase">Tahap Kebersihan Simulasi</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'STERILE', label: 'Steril (Hospital)', emoji: '🏥' },
                  { id: 'MODERN_CLEAN', label: 'Moden Bersih', emoji: '✨' },
                  { id: 'ULTRA_CLEAN', label: 'Sangat Kemas', emoji: '🧹' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setCleanlinessLevel(opt.id as any)}
                    className={`p-2.5 rounded-lg border text-xs font-bold text-center flex flex-col items-center gap-1 transition-all ${
                      cleanlinessLevel === opt.id 
                        ? 'bg-cyan-900/40 border-cyan-400 text-cyan-200' 
                        : 'bg-slate-850 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-sm">{opt.emoji}</span>
                    <span className="text-[9px] leading-tight">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Lighting Selection */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-mono-sci uppercase">Sistem Pencahayaan (Lighting)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'BRIGHT_DAYLIGHT', label: 'Daylight', emoji: '☀️' },
                  { id: 'NATURAL', label: 'Natural', emoji: '🌿' },
                  { id: 'NEON_SURGICAL', label: 'Surgical Neon', emoji: '💡' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setLighting(opt.id as any)}
                    className={`p-2.5 rounded-lg border text-xs font-bold text-center flex flex-col items-center gap-1 transition-all ${
                      lighting === opt.id 
                        ? 'bg-indigo-900/40 border-indigo-400 text-indigo-200' 
                        : 'bg-slate-850 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-sm">{opt.emoji}</span>
                    <span className="text-[9px] leading-tight">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Human mode */}
            <div className="flex items-center justify-between bg-slate-850 border border-slate-800 p-3 rounded-lg">
              <div>
                <span className="text-[11px] font-bold text-slate-200 block">Kekalkan Manusia dalam Imej</span>
                <span className="text-[9px] text-slate-400 font-mono-sci">Kekalkan pekerja/orang di lokasi dengan uniform bersih</span>
              </div>
              <button
                onClick={() => setKeepPeople(!keepPeople)}
                className={`w-12 h-6 rounded-full p-1 transition-colors relative ${keepPeople ? 'bg-emerald-600' : 'bg-slate-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${keepPeople ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>

            {/* Additional custom text */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 font-mono-sci uppercase">Arahan Tambahan (Custom Instructions)</label>
              <input
                type="text"
                value={additionalDirectives}
                onChange={(e) => setAdditionalDirectives(e.target.value)}
                placeholder="E.g., Tukar mozek dinding ke mozek putih berkilat..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* STEP 2: Prepared Copy Prompter */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-md">
            <div>
              <h3 className="text-xs font-bold text-indigo-400 font-mono-sci uppercase tracking-[0.15em] mb-1">
                Prompt Terkompilasi
              </h3>
              <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                Sistem menyatukan parameter di atas menjadi set arahan yang optimum dan memahami struktur perniagaan tempatan.
              </p>
            </div>

            <div className="relative">
              <textarea
                readOnly
                value={currentPrompt}
                className="w-full h-44 bg-slate-950/80 border border-slate-850 rounded-xl p-3 text-[10px] font-mono text-slate-300 focus:outline-none custom-scrollbar resize-none leading-relaxed select-all"
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                <span className="text-[9px] text-slate-500 font-mono bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                  {currentPrompt.length} aksara
                </span>
              </div>
            </div>

            <button
              onClick={handleCopyAndOpen}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(34,211,238,0.25)] hover:shadow-[0_0_25px_rgba(34,211,238,0.45)] uppercase tracking-wider text-xs border border-cyan-400/30"
            >
              <span>🚀 {copied ? 'TELAH DISALIN! MEMBUKA GEMINI...' : 'SALIN PROMPT & BUKA GEMINI WEB'}</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Image Inputs and Live Slider Review */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* COMPARISON BOX / BEFORE-AFTER VIEW */}
          {originalImage && simulatedImage ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold text-emerald-400 font-mono-sci uppercase tracking-[0.15em]">
                  Simulasi Kebersihan Sebelum / Selepas (Interactive Slider)
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">Sila heret pemisah di tengah-tengah imej</span>
              </div>

              {/* Interative Slider Component */}
              <div 
                ref={sliderContainerRef}
                onMouseMove={(e) => { if (isResizing) handleSliderMove(e.clientX); }}
                onTouchMove={handleTouchMove}
                onMouseDown={() => setIsResizing(true)}
                onTouchStart={() => setIsResizing(true)}
                onMouseLeave={() => setIsResizing(false)}
                onMouseUp={() => setIsResizing(false)}
                onTouchEnd={() => setIsResizing(false)}
                className="relative h-[320px] md:h-[400px] w-full rounded-xl overflow-hidden cursor-ew-resize select-none border border-slate-800"
              >
                {/* Simulated Clean Image (Base Layer) */}
                <img 
                  src={simulatedImage} 
                  alt="Simulasi Pasca Pembersihan" 
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-3 right-3 bg-emerald-600/95 border border-emerald-400 text-white font-bold text-[10px] py-1 px-2.5 rounded shadow font-sans tracking-wide">
                  PASCA SIMULASI (SELEPAS)
                </div>

                {/* Original Dirty Image (Overridden Layer via Clip Path) */}
                <div 
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
                >
                  <img 
                    src={originalImage} 
                    alt="Pemandangan Asal" 
                    className="absolute inset-0 w-[100%] h-[100%] object-cover pointer-events-none"
                    style={{ width: sliderContainerRef.current?.getBoundingClientRect().width, height: '100%' }}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-3 left-3 bg-red-600/95 border border-red-400 text-white font-bold text-[10px] py-1 px-2.5 rounded shadow font-sans tracking-wide pointer-events-none">
                    LOKASI ASAL (SEBELUM)
                  </div>
                </div>

                {/* Slider Handle Divider bar */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_white] z-20 pointer-events-none"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-slate-900 border border-slate-900 flex items-center justify-center font-bold text-xs shadow-xl pointer-events-auto">
                    ↔
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* TWO DROP AREAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* INPUT AREA 1: Original Image */}
            <div 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'original')}
              onPaste={(e) => handlePaste(e, 'original')}
              className={`bg-slate-900/60 border rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all min-h-[220px] ${
                originalImage 
                  ? 'border-cyan-500/30' 
                  : 'border-slate-800 border-dashed hover:border-cyan-500/50 hover:bg-slate-850'
              }`}
            >
              {originalImage ? (
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-cyan-400 font-mono-sci uppercase">📸 1. IMEJ ASAL (KOTOR)</span>
                    <button 
                      onClick={() => setOriginalImage(null)} 
                      className="text-[9px] text-red-400 hover:text-red-300 font-mono uppercase bg-red-950/40 px-2 py-0.5 rounded border border-red-900/50"
                    >
                      Padam
                    </button>
                  </div>
                  <img 
                    src={originalImage} 
                    alt="Preview Asal" 
                    className="w-full h-36 object-cover rounded-lg border border-slate-800"
                    referrerPolicy="no-referrer"
                  />
                  <p className="text-[9px] text-slate-500 font-mono italic">
                    Sokong Ctrl+V atau seret & jatuhkan imej baru di sini
                  </p>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRefOriginal.current?.click()}
                  className="cursor-pointer space-y-3 py-4 w-full"
                >
                  <div className="text-4xl text-slate-600">📸</div>
                  <h4 className="text-xs font-bold text-slate-350">1. MUAT NAIK IMEJ ASAL</h4>
                  <p className="text-[10px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Heret imej premis/tempat yang kotor, atau tampal tangkapan skrin (Ctrl+V) di sini.
                  </p>
                  <span className="inline-block text-[9px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 px-2.5 py-1 rounded">
                    Sila Pilih Fail / Paste
                  </span>
                  <input 
                    ref={fileInputRefOriginal}
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'original')}
                    className="hidden" 
                  />
                </div>
              )}
            </div>

            {/* INPUT AREA 2: Clean Simulation Image */}
            <div 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'simulated')}
              onPaste={(e) => handlePaste(e, 'simulated')}
              className={`bg-slate-900/60 border rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all min-h-[220px] ${
                simulatedImage 
                  ? 'border-emerald-500/30' 
                  : 'border-slate-800 border-dashed hover:border-emerald-500/50 hover:bg-slate-850'
              }`}
            >
              {simulatedImage ? (
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-emerald-400 font-mono-sci uppercase">✨ 2. IMEJ SIMULASI (BERSIH)</span>
                    <button 
                      onClick={() => setSimulatedImage(null)} 
                      className="text-[9px] text-red-400 hover:text-red-300 font-mono uppercase bg-red-950/40 px-2 py-0.5 rounded border border-red-900/50"
                    >
                      Padam
                    </button>
                  </div>
                  <img 
                    src={simulatedImage} 
                    alt="Preview Simulasi" 
                    className="w-full h-36 object-cover rounded-lg border border-slate-800"
                    referrerPolicy="no-referrer"
                  />
                  <p className="text-[9px] text-slate-500 font-mono italic">
                    Sokong Ctrl+V atau seret & jatuhkan imej baru di sini
                  </p>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRefSimulated.current?.click()}
                  className="cursor-pointer space-y-3 py-4 w-full"
                >
                  <div className="text-4xl text-slate-600">✨</div>
                  <h4 className="text-xs font-bold text-slate-350">2. IMEJ HASIL SIMULASI GEMINI</h4>
                  <p className="text-[10px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Setelah Gemini AI selesai menjana semula imej bersih, salin dan tampalkan (Ctrl+V) fail hasil tersebut di sini.
                  </p>
                  <span className="inline-block text-[9px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded">
                    Sila Pilih Fail / Paste Semula
                  </span>
                  <input 
                    ref={fileInputRefSimulated}
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'simulated')}
                    className="hidden" 
                  />
                </div>
              )}
            </div>

          </div>

          {/* DUST ADVICE WORKFLOW */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-xl backdrop-blur-md">
            <h4 className="text-xs font-bold text-yellow-500 font-mono-sci uppercase tracking-[0.1em] flex items-center gap-1.5">
              ⚠️ PANDUAN PENTING & AMALAN TERBAIK
            </h4>
            <ul className="text-xs text-slate-400 space-y-2 list-inside list-decimal leading-relaxed">
              <li>
                Pastikan anda memuat naik <span className="text-cyan-400 font-bold">IMEJ ASAL</span> terlebih dahulu di panel sebelah kiri di Google Gemini Web.
              </li>
              <li>
                Klik butang pink <span className="text-indigo-400 font-bold">"SALIN PROMPT & BUKA GEMINI"</span> di atas bagi membolehkan prompt kami dimuatkan ke clipboard anda sebelum tab dibuka.
              </li>
              <li>
                Di Gemini Web, tampal prompt tersebut dan hantar bersama foto tersebut. Gemini AI akan melancarkan <span className="text-cyan-400">Imagen 3/4</span> di belakang tab dan mengembalikan hasil gambar yang bersih secara otomatik.
              </li>
              <li>
                Menerusi Gemini Web, klik butang muat turun gambarnya atau salin imej tersebut dan tampal kembali di bahagian <span className="text-emerald-400 font-bold">IMEJ SIMULASI</span> di atas.
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
};

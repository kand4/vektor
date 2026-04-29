import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResponse, RiskDetection, ChatMessage, BoundingBox, RiskCategory, EpidemicTrend, AnalysisSession } from '../types';
import ImageAnnotator from './ImageAnnotator';
import { askRiskFollowUp, analyzeManualRegion, generateCleanSimulation, SimulationConfig } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { PrintLayout } from './PrintLayout';
import KKMReport from './KKMReport';
import { Toast } from './Toast';

const getRiskColorParams = (category: RiskCategory) => {
  switch (category) {
    case 'HYGIENE': return { 
      border: 'border-amber-500', text: 'text-amber-400', bg: 'bg-amber-900/40', 
      shadow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]', badge: 'bg-amber-500 text-black', icon: '☣' 
    };
    case 'SAFETY': return { 
      border: 'border-indigo-500', text: 'text-indigo-400', bg: 'bg-indigo-900/40', 
      shadow: 'shadow-[0_0_15px_rgba(99,102,241,0.5)]', badge: 'bg-indigo-500 text-white', icon: '⚠️' 
    };
    default: return { 
      border: 'border-red-500', text: 'text-red-400', bg: 'bg-red-900/40', 
      shadow: 'shadow-[0_0_15px_rgba(239,68,68,0.3)]', badge: 'bg-red-600 text-white', icon: '🦟' 
    };
  }
};

const RiskListItem: React.FC<{ risk: RiskDetection, index: number, activeId: string | null, onClick: (r: RiskDetection) => void }> = ({ risk, index, activeId, onClick }) => {
  const isActive = activeId === risk.id;
  const params = getRiskColorParams(risk.category);
  const isManual = risk.id?.startsWith('manual'); // Added optional chaining
  const displayNum = (index).toString().padStart(2, '0');

  return (
    <button onClick={() => onClick(risk)} className={`no-print relative flex items-center gap-3 md:gap-4 p-2 md:p-4 rounded-lg text-left transition-all duration-300 border group w-full ${isActive ? `${params.bg} ${params.border} ${params.shadow}` : 'bg-slate-950/60 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900'}`}>
      <div className={`w-8 h-8 md:w-10 md:h-10 rounded flex items-center justify-center font-bold text-xs md:text-sm shrink-0 font-mono-sci relative ${params.badge} shadow-[0_0_10px_currentColor]`}>
        {displayNum}
        {isManual && <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping"></span>}
      </div>
      <div className="overflow-hidden flex-1 min-w-0">
        <div className={`font-sci-fi text-xs md:text-sm font-bold truncate flex items-center gap-2 ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-emerald-400'}`}>
          <span className="truncate">{risk.label}</span>
          {isManual && <span className="text-[9px] bg-slate-700 text-white px-1 rounded border border-slate-500 shrink-0">MANUAL</span>}
        </div>
        <div className="text-[10px] md:text-xs text-slate-500 font-mono-sci italic truncate">{risk.agent}</div>
      </div>
    </button>
  );
};

// Dual Score Card
const DualScoreCard: React.FC<{ hygieneLevel: number, safetyLevel: number, isSavage: boolean }> = ({ hygieneLevel, safetyLevel, isSavage }) => {
    const safeLevel = safetyLevel || hygieneLevel;
    const getColor = (level: number) => {
        if (level >= 4) return 'text-emerald-400 border-emerald-500';
        if (level === 3) return 'text-yellow-400 border-yellow-500';
        return 'text-red-500 border-red-500';
    };

    return (
        <div className="w-full relative overflow-hidden rounded-xl border border-slate-700 bg-slate-900/80 p-4 md:p-6 shadow-xl mb-4 transition-all duration-500">
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
             <div className="relative z-10 grid grid-cols-2 gap-4 md:gap-8 divide-x divide-slate-700">
                 <div className="flex flex-col items-center justify-center text-center">
                     <div className="text-[10px] font-mono-sci uppercase tracking-widest text-slate-400 mb-2">HYGIENE</div>
                     <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full border-4 flex items-center justify-center bg-black/20 backdrop-blur mb-2 ${getColor(hygieneLevel)}`}>
                        <span className="text-xl md:text-3xl font-bold font-sci-fi">{hygieneLevel}</span>
                        <span className="text-[10px] opacity-60 mb-2">/5</span>
                     </div>
                 </div>
                 <div className="flex flex-col items-center justify-center text-center pl-4 md:pl-8">
                     <div className="text-[10px] font-mono-sci uppercase tracking-widest text-slate-400 mb-2">SAFETY</div>
                     <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full border-4 flex items-center justify-center bg-black/20 backdrop-blur mb-2 ${getColor(safeLevel)}`}>
                        <span className="text-xl md:text-3xl font-bold font-sci-fi">{safeLevel}</span>
                        <span className="text-[10px] opacity-60 mb-2">/5</span>
                     </div>
                 </div>
             </div>
             <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                 <span className={`text-xs md:text-sm font-sci-fi font-bold uppercase tracking-widest ${Math.min(hygieneLevel, safeLevel) < 3 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                     {isSavage ? 'HONEST VERDICT: ' : 'STATUS: '} 
                     {Math.min(hygieneLevel, safeLevel) === 1 ? 'IMMEDIATE CLOSURE' : Math.min(hygieneLevel, safeLevel) === 2 ? 'NOTICE ISSUED' : 'COMPLIANT'}
                 </span>
             </div>
        </div>
    );
};

interface SimulationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: SimulationConfig) => void;
}

const SimulationConfigModal: React.FC<SimulationConfigModalProps> = ({ isOpen, onClose, onStart }) => {
  const [mode, setMode] = useState<SimulationConfig['mode']>('SANITIZE_ONLY');
  const [humans, setHumans] = useState<SimulationConfig['humans']>('KEEP_PROTECTED');
  const [lighting, setLighting] = useState<SimulationConfig['lighting']>('CLINICAL_BLUE');
  const [engine, setEngine] = useState<SimulationConfig['engine']>('POLLINATIONS');
  const [customPrompt, setCustomPrompt] = useState('');

  if (!isOpen) return null;

  const OptionBtn = ({ label, selected, onClick }: any) => (
      <button 
        onClick={onClick} 
        className={`w-full p-3 rounded text-xs md:text-sm font-bold border transition-all flex items-center justify-center gap-2 ${selected ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
      >
        {label}
      </button>
  );

  return (
    <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in no-print">
        <div className="bg-slate-900 border border-cyan-500 rounded-xl p-6 w-full max-w-lg shadow-[0_0_50px_rgba(34,211,238,0.3)] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-xl font-sci-fi font-bold text-white mb-6 flex items-center gap-2">
               <span className="text-cyan-400">🧬 BIO-CLEAN SIMULATOR</span>
            </h3>

            <div className="space-y-6">
                <div>
                   <label className="text-xs text-slate-400 font-mono-sci uppercase block mb-2">TARGET OBJECTIVE</label>
                   <div className="grid grid-cols-1 gap-2">
                      <OptionBtn label="🧹 SANITIZE" selected={mode === 'SANITIZE_ONLY'} onClick={() => setMode('SANITIZE_ONLY')} />
                      <OptionBtn label="🛋️ UPGRADE FURNITURE" selected={mode === 'UPGRADE_FURNITURE'} onClick={() => setMode('UPGRADE_FURNITURE')} />
                      <OptionBtn label="🏗️ FULL RECONSTRUCTION" selected={mode === 'FULL_RECONSTRUCTION'} onClick={() => setMode('FULL_RECONSTRUCTION')} />
                   </div>
                </div>

                <div>
                   <label className="text-xs text-slate-400 font-mono-sci uppercase block mb-2">PERSONNEL PROTOCOL</label>
                   <div className="grid grid-cols-2 gap-2">
                      <OptionBtn label="👥 KEEP (PPE Gear)" selected={humans === 'KEEP_PROTECTED'} onClick={() => setHumans('KEEP_PROTECTED')} />
                      <OptionBtn label="🚫 REMOVE HUMANS" selected={humans === 'REMOVE'} onClick={() => setHumans('REMOVE')} />
                   </div>
                </div>
                
                <div>
                   <label className="text-xs text-slate-400 font-mono-sci uppercase block mb-2">ATMOSPHERE / LIGHTING</label>
                   <div className="grid grid-cols-3 gap-2">
                      <OptionBtn label="🔵 CLINICAL" selected={lighting === 'CLINICAL_BLUE'} onClick={() => setLighting('CLINICAL_BLUE')} />
                      <OptionBtn label="☀️ NATURAL" selected={lighting === 'NATURAL'} onClick={() => setLighting('NATURAL')} />
                      <OptionBtn label="💡 WARM" selected={lighting === 'WARM'} onClick={() => setLighting('WARM')} />
                   </div>
                </div>

                <div>
                   <label className="text-xs text-slate-400 font-mono-sci uppercase block mb-2">AI ENGINE GENERATOR</label>
                   <div className="grid grid-cols-2 gap-2">
                      <OptionBtn label="✨ GEMINI (Imagen 3)" selected={engine === 'GEMINI_IMAGEN'} onClick={() => setEngine('GEMINI_IMAGEN')} />
                      <OptionBtn label="🌸 FLUX (Pollinations)" selected={engine === 'POLLINATIONS'} onClick={() => setEngine('POLLINATIONS')} />
                   </div>
                   <p className="text-[10px] text-slate-500 mt-2 italic leading-relaxed">
                       * Gemini (Imagen): Kualiti tinggi tetapi bergantung kepada kuota limitasi API anda (Rate-limit).<br/>
                       * Flux (Pollinations): Percuma dan pantas, namun berisiko pelayan sibuk (public pool) dan hasil mungkin tidak konsisten.
                   </p>
                </div>
                
                <div>
                    <label className="text-xs text-slate-400 font-mono-sci uppercase block mb-2">ARAHAN KHAS (PROMPT)</label>
                    <textarea 
                        className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white text-sm outline-none focus:border-cyan-500"
                        rows={3}
                        placeholder="e.g. Pastikan meja bersih sepenuhnya..."
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex gap-3 justify-end mt-8">
                <button onClick={onClose} className="px-5 py-2 rounded text-slate-400 font-bold hover:text-white transition">BATAL</button>
                <button 
                  onClick={() => onStart({ mode, humans, lighting, engine, customPrompt })}
                  className="px-6 py-2 rounded bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/30 flex items-center gap-2"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576L8.279 5.044A.75.75 0 019 4.5z" clipRule="evenodd" /></svg>
                   JANA SIMULASI
                </button>
            </div>
        </div>
    </div>
  )
}

const SimulationResultModal: React.FC<{ isOpen: boolean, onClose: () => void, originalImage: string, generatedImage: string }> = ({ isOpen, onClose, originalImage, generatedImage }) => {
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
    <div className="fixed inset-0 z-[180] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 no-print">
        <div className="bg-slate-900 border border-cyan-500 rounded-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
             <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-950">
                 <h3 className="text-lg font-sci-fi font-bold text-cyan-400">✨ SIMULATION COMPLETE</h3>
                 <button onClick={onClose} className="text-white">✕</button>
             </div>
             <div className="flex-1 relative bg-black/50 overflow-hidden flex items-center justify-center p-4">
                 <div 
                    ref={containerRef}
                    className="relative w-full h-full max-h-full aspect-video border border-slate-700 rounded overflow-hidden cursor-ew-resize"
                    onMouseDown={(e) => onStart(e.clientX)}
                    onTouchStart={(e) => onStart(e.touches[0].clientX)}
                    onMouseMove={(e) => onMove(e.clientX)}
                    onTouchMove={(e) => onMove(e.touches[0].clientX)}
                 >
                    <img src={generatedImage} className="absolute inset-0 w-full h-full object-contain bg-slate-900" />
                    <div className="absolute inset-0 bg-slate-900 overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                        <img src={originalImage} className="absolute inset-0 w-full h-full object-contain" />
                    </div>
                    <div className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 shadow-[0_0_10px_black]" style={{ left: `${sliderPos}%` }}>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-cyan-500">↔</div>
                    </div>
                 </div>
             </div>
        </div>
    </div>
  );
};

interface AnalysisResultsProps {
  result: AnalysisResponse;
  imageSrc: string;
  savedSimulationImage?: string; 
  onSaveSimulation: (image: string) => void;
  // NEW PROPS FOR PERSISTENCE & PRINTING
  allSessions?: AnalysisSession[];
  onUpdateResult?: (updatedResult: AnalysisResponse) => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({ 
    result, 
    imageSrc, 
    savedSimulationImage, 
    onSaveSimulation,
    allSessions = [],
    onUpdateResult
}) => {
  const [activeRisk, setActiveRisk] = useState<RiskDetection | null>(null);
  
  // DEFENSIVE FIX: Ensure risks is always an array
  const currentRisks = result.risks || [];
  const isKKMMode = result.mode === 'KKM_FOOD_STANDARD';
  
  const [isSavageMode, setIsSavageMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userQuestion, setUserQuestion] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [manualBox, setManualBox] = useState<BoundingBox | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualContext, setManualContext] = useState("");
  const [isProcessingManual, setIsProcessingManual] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanImage, setCleanImage] = useState<string | null>(savedSimulationImage || null);
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<{msg: string, type: 'error' | 'success'} | null>(null);

  // Reference for scrolling
  const detailsPanelRef = useRef<HTMLDivElement>(null);

  const { language, t } = useLanguage();

  useEffect(() => { setCleanImage(savedSimulationImage || null); }, [savedSimulationImage]);
  useEffect(() => { 
      // Only auto-set activeRisk if it's currently null AND there are risks to select.
      if (currentRisks && currentRisks.length > 0 && !activeRisk) {
          setActiveRisk(currentRisks[0]); 
      }
  }, [currentRisks]);

  // Robust Print Clean-up Listener
  useEffect(() => {
    const cleanupPrint = () => {
        document.body.classList.remove('is-printing');
    };

    // 'afterprint' fires when the print dialog is closed (or printing is done)
    window.addEventListener('afterprint', cleanupPrint);
    
    // Fallback: If afterprint doesn't fire (some mobile browsers), detect focus return
    const onFocus = () => {
        // If the body still has the class and window gains focus, likely print dialog closed
        if (document.body.classList.contains('is-printing')) {
             // Add a small delay to ensure we don't accidentally clear it during the dialog opening sequence
            setTimeout(cleanupPrint, 500);
        }
    };
    window.addEventListener('focus', onFocus);

    return () => {
        window.removeEventListener('afterprint', cleanupPrint);
        window.removeEventListener('focus', onFocus);
        // Ensure cleanup on unmount
        document.body.classList.remove('is-printing');
    };
  }, []);

  const handleRiskChange = (risk: RiskDetection) => {
    setActiveRisk(risk);
    
    // SMOOTH SCROLL TO DETAILS PANEL ON CLICK
    if (detailsPanelRef.current) {
        // Add small delay to ensure UI updates first
        setTimeout(() => {
            detailsPanelRef.current?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);
    }
  }

  const bioRisks = currentRisks.filter(r => r.category === 'VECTOR' || r.category === 'HYGIENE');
  const safetyRisks = currentRisks.filter(r => r.category === 'SAFETY');
  const getRiskIndex = (risk: RiskDetection) => currentRisks.findIndex(r => r.id === risk.id) + 1;

  const handleRegionDrawn = (box: BoundingBox) => {
    setManualBox(box);
    setShowManualModal(true);
    setIsEditing(false);
  };

  const submitManualAnalysis = async () => {
    if (!manualBox || !manualContext) return;
    setIsProcessingManual(true);
    try {
        const cleanBase64 = imageSrc.split(',')[1] || imageSrc;
        const mimeType = imageSrc.split(';')[0].split(':')[1] || 'image/jpeg';
        const currentSensitivity = result?.sensitivityUsed || 'HIGH';
        const newRisk = await analyzeManualRegion(cleanBase64, mimeType, manualBox, manualContext, language, isSavageMode, currentSensitivity as 'LOW' | 'HIGH' | 'EXTREME');
        
        // UPDATE PARENT STATE FOR PERSISTENCE
        const updatedRisks = [newRisk, ...currentRisks];
        if (onUpdateResult) {
            onUpdateResult({ ...result, risks: updatedRisks });
        }
        
        setActiveRisk(newRisk);
        setShowManualModal(false);
        setManualContext("");
        setManualBox(null);
    } catch (e) {
        setToastMsg({ msg: "Gagal memproses manual region.", type: 'error' });
    } finally {
        setIsProcessingManual(false);
    }
  };

  const cancelManualMode = () => { setIsEditing(false); setShowManualModal(false); setManualBox(null); setManualContext(""); };
  const handleOpenSimulation = () => { cleanImage ? setShowCleanModal(true) : setShowConfigModal(true); };

  const startSimulation = async (config: any) => {
      setShowConfigModal(false);
      setIsCleaning(true);
      try {
          const base64Data = imageSrc.split(',')[1];
          const mimeType = imageSrc.split(';')[0].split(':')[1] || 'image/jpeg';
          const generatedImage = await generateCleanSimulation(base64Data, mimeType, config);
          setCleanImage(generatedImage);
          onSaveSimulation(generatedImage);
          setShowCleanModal(true);
      } catch (error: any) {
          setToastMsg({ msg: `Simulasi Gagal: ${error.message}`, type: 'error' });
      } finally {
          setIsCleaning(false);
      }
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim() || !activeRisk) return;
    const newMsg: ChatMessage = { role: 'user', text: userQuestion };
    setChatMessages(prev => [...prev, newMsg]);
    setUserQuestion("");
    setIsChatLoading(true);
    try {
      const response = await askRiskFollowUp(activeRisk, newMsg.text, language);
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'model', text: "Error contacting AI." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // ROBUST PRINT HANDLER V5: HTML2PDF + NATIVE FALLBACK
  const handlePrint = async () => {
    // 1. Save scroll position
    const originalScrollY = window.scrollY;
    
    // 2. Scroll to top (critical fix for html2canvas blank page bug)
    window.scrollTo(0, 0);

    // 3. Add class to show print view
    document.body.classList.add('is-printing');
    
    // 4. FORCE REFLOW/LAYOUT FLUSH
    void document.body.offsetHeight; 
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    try {
        setToastMsg({ msg: "Menjana PDF... Sila tunggu.", type: 'info' });
        // Dynamically import html2pdf safely
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default || html2pdfModule;
        const element = document.getElementById('print-mount');
        
        if (element) {
            const targetElement = element.firstElementChild || element;
            const opt = {
                margin:       0,
                filename:     `Laporan_Pemeriksaan_${Math.floor(Date.now() / 1000)}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { 
                    scale: 2, 
                    useCORS: true, 
                    logging: false,
                    backgroundColor: '#ffffff',
                    scrollY: 0,
                    x: 0,
                    y: 0,
                    windowWidth: document.documentElement.scrollWidth,
                    windowHeight: document.documentElement.scrollHeight
                },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak:    { mode: 'css', avoid: '.avoid-break' }
            };
            
            // Allow a delay for images/layout to settle
            setTimeout(() => {
                html2pdf().from(targetElement).set(opt).outputPdf('blob').then((pdfBlob: Blob) => {
                    document.body.classList.remove('is-printing');
                    window.scrollTo(0, originalScrollY);
                    setToastMsg({ msg: "PDF berjaya dijana!", type: 'success' });
                    
                    const file = new File([pdfBlob], opt.filename, { type: 'application/pdf' });
                    
                    // Allow share on mobile if possible
                    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                         navigator.share({
                             title: 'Laporan Pemeriksaan',
                             text: 'Sila dapati laporan pemeriksaan rasmi dan simulasi AI.',
                             files: [file]
                         }).catch((e: any) => console.log('Share canceled', e));
                    } else {
                        // Force native download for desktop or if share unsupported
                        const fileUrl = URL.createObjectURL(pdfBlob);
                        const link = document.createElement('a');
                        link.href = fileUrl;
                        link.download = opt.filename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
                    }
                }).catch((e: any) => {
                    console.error("PDF generation failed", e);
                    document.body.classList.remove('is-printing');
                    window.scrollTo(0, originalScrollY);
                    window.print();
                });
            }, 1000); // 1s delay to ensure content is fully painted
            return;
        }
    } catch (e) {
        console.error('html2pdf error', e);
        document.body.classList.remove('is-printing');
        window.scrollTo(0, originalScrollY);
        window.print();
    }
  };
  
  // ENHANCED YOUTUBE LOGIC: TARGETING PATHOGEN/DISEASE STRICTLY
  const generateYoutubeLink = (risk: RiskDetection) => {
      // IF SAFETY (OSH/HAZARDS) -> Search for workplace accidents or safety training
      if (risk.category === 'SAFETY') {
          // Use 'agent' (Scientific/English) if available, otherwise fallback to label but prefer English terms
          const hazard = risk.agent || risk.label;
          const query = `workplace accident ${hazard} safety training real footage`;
          return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      }
      
      // IF VECTOR/HYGIENE -> Strict Scientific Search
      // We purposefully IGNORE risk.label (which is in Malay)
      // We construct query using: Agent (English/Latin) + Microbiology (English/Latin) + Disease (English)
      
      const parts = [];
      if (risk.agent && risk.agent !== 'N/A') parts.push(risk.agent); // e.g., Aedes aegypti
      if (risk.microbiology && risk.microbiology !== 'N/A') parts.push(risk.microbiology); // e.g., Dengue Virus
      if (risk.disease && risk.disease !== 'N/A') parts.push(risk.disease); // e.g., Dengue Fever
      
      // If we have nothing scientific, fallback to label but append "microscope"
      const coreSearch = parts.length > 0 ? parts.join(" ") : risk.label;
      
      const query = `${coreSearch} clinical microscope view real footage`;
      return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  };

  // DYNAMIC BUTTON LABEL
  const getVideoButtonLabel = (risk: RiskDetection) => {
      if (risk.category === 'SAFETY') return t('btn_safety_video');
      return t('btn_microscope');
  };

  // MANUAL TARGETING MODAL
  if (showManualModal) {
     return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-emerald-500 rounded-xl p-6 w-full max-w-sm shadow-2xl animate-fade-in-up">
                <h3 className="text-lg font-sci-fi font-bold text-white mb-4"><span className="text-emerald-400">🎯 MANUAL TARGETING</span></h3>
                <textarea value={manualContext} onChange={(e) => setManualContext(e.target.value)} placeholder="e.g. Look at the dark spot..." rows={3} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white text-sm outline-none mb-4" />
                <div className="flex gap-2">
                    <button onClick={cancelManualMode} disabled={isProcessingManual} className="flex-1 py-2 bg-slate-800 text-slate-300 rounded">CANCEL</button>
                    <button onClick={submitManualAnalysis} disabled={!manualContext.trim() || isProcessingManual} className="flex-1 py-2 bg-emerald-600 text-white rounded font-bold">{isProcessingManual ? "SCANNING..." : "ANALYZE"}</button>
                </div>
            </div>
        </div>
     )
  }

  // IF KKM MODE: Show Special Report + Image Annotator
  if (isKKMMode) {
      return (
          <div className="animate-fade-in pb-20">
             {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
             <h2 className="text-2xl font-bold text-blue-400 mb-6 font-sci-fi text-center">LAPORAN PEMERIKSAAN KKM</h2>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Left: Report */}
                 <KKMReport result={result} />
                 
                 {/* Right: Evidence */}
                 <div className="flex flex-col gap-4">
                     <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-white mb-2">BUKTI GAMBAR (ANNOTATED)</h3>
                        <ImageAnnotator imageSrc={imageSrc} risks={currentRisks} onRiskSelect={() => {}} isEditing={false} />
                     </div>
                 </div>
             </div>
          </div>
      )
  }

  // STANDARD VECTOR MODE
  // Restored to rely on activeRisk for details panel presence (Clean visual if no risk selected)
  return (
    <div className="animate-fade-in pb-20">
      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
      <SimulationConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} onStart={startSimulation} />
      <SimulationResultModal isOpen={showCleanModal} onClose={() => setShowCleanModal(false)} originalImage={imageSrc} generatedImage={cleanImage || ""} />
      
      {/* THE HIDDEN PRINT MODULE */}
      <PrintLayout sessions={allSessions} />

      <div className="flex flex-wrap gap-3 justify-between items-center mb-4 md:mb-6 no-print">
         <div className="flex gap-2">
            <button onClick={() => setIsEditing(!isEditing)} className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded text-xs md:text-sm font-bold uppercase tracking-wider transition-all border ${isEditing ? 'bg-red-600 text-white border-red-500 animate-pulse' : 'bg-slate-800 text-slate-300 border-slate-600'}`}>
                {isEditing ? '🔴 TARGETING' : `🎯 ${t('btn_manual_scan')}`}
            </button>
            <button onClick={handleOpenSimulation} disabled={isCleaning} className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded text-xs md:text-sm font-bold uppercase tracking-wider transition-all border border-cyan-500/50 hover:bg-cyan-900/30 text-cyan-400 disabled:opacity-50`}>
                {isCleaning ? <span className="animate-pulse">SIMULATING...</span> : <>✨ {t('btn_simulation')}</>}
            </button>
            
            <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded text-xs md:text-sm font-bold uppercase tracking-wider transition-all border border-green-500/50 hover:bg-green-900/30 text-green-400">
                🖨️ CETAK / SIMPAN PDF
            </button>
         </div>
         <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2 bg-slate-900 rounded-full p-1 border border-slate-700">
               <button onClick={() => setIsSavageMode(false)} className={`px-3 py-1 rounded-full text-[10px] font-bold ${!isSavageMode ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>{t('tab_official')}</button>
               <button onClick={() => setIsSavageMode(true)} className={`px-3 py-1 rounded-full text-[10px] font-bold ${isSavageMode ? 'bg-red-600 text-white' : 'text-slate-500'}`}>{t('tab_savage')}</button>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 no-print">
        {/* LEFT COL: Image & List */}
        <div className="lg:col-span-7 flex flex-col gap-4">
           <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 group">
              <ImageAnnotator imageSrc={imageSrc} risks={currentRisks} onRiskSelect={handleRiskChange} selectedId={activeRisk?.id} isEditing={isEditing} onRegionDrawn={handleRegionDrawn} />
              <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-600 px-3 py-2 rounded-lg z-40 shadow-xl">
                 <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] text-slate-400 font-mono-sci uppercase">HYGIENE</span>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border ${result.hygieneLevel >= 4 ? 'border-emerald-500 text-emerald-400' : 'border-red-500 text-red-500'}`}>{result.hygieneLevel}</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-400 font-mono-sci uppercase">SAFETY</span>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border ${result.safetyLevel >= 4 ? 'border-blue-500 text-blue-400' : 'border-orange-500 text-orange-500'}`}>{result.safetyLevel || result.hygieneLevel}</div>
                    </div>
                    {result.sensitivityUsed && (
                       <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-slate-500 font-mono-sci uppercase">SENSITIVITY</span>
                          <span className={`text-[8px] px-1 rounded border ${result.sensitivityUsed === 'EXTREME' ? 'border-red-500 text-red-400' : result.sensitivityUsed === 'HIGH' ? 'border-orange-500 text-orange-400' : 'border-slate-500 text-slate-400'}`}>
                             {result.sensitivityUsed}
                          </span>
                       </div>
                    )}
                 </div>
              </div>
           </div>
           
           <div className="grid grid-cols-1 gap-4">
              {/* Only show lists if risks exist */}
              {bioRisks.length > 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 md:p-4">
                   <h3 className="text-xs text-slate-500 font-mono-sci uppercase mb-3 flex items-center gap-2"><span className="w-2 h-2 bg-amber-500 rounded-full"></span> {t('risk_vector')}</h3>
                   <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {bioRisks.map((risk) => <RiskListItem key={risk.id} risk={risk} index={getRiskIndex(risk)} activeId={activeRisk?.id || null} onClick={handleRiskChange} />)}
                   </div>
                </div>
              )}
              {safetyRisks.length > 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 md:p-4">
                   <h3 className="text-xs text-slate-500 font-mono-sci uppercase mb-3 flex items-center gap-2"><span className="w-2 h-2 bg-indigo-500 rounded-full"></span> {t('risk_safety')}</h3>
                   <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {safetyRisks.map((risk) => <RiskListItem key={risk.id} risk={risk} index={getRiskIndex(risk)} activeId={activeRisk?.id || null} onClick={handleRiskChange} />)}
                   </div>
                </div>
              )}
              
              {/* Logic Fix: Only show "No Risks" if Hygiene is decent (>4). If it's dirty but no risks found, show Warning. */}
              {currentRisks.length === 0 && result.hygieneLevel >= 5 && (
                  <div className="bg-emerald-900/20 border border-emerald-500/50 rounded-lg p-6 text-center">
                      <div className="text-3xl mb-2">✅</div>
                      <h3 className="text-emerald-400 font-bold font-sci-fi">TIADA RISIKO DIKESAN</h3>
                      <p className="text-sm text-slate-400 mt-2">Premis kelihatan bersih dalam gambar ini. Walau bagaimanapun, sila gunakan 'Manual Scan' jika anda melihat sesuatu yang terlepas pandang.</p>
                  </div>
              )}
              
              {currentRisks.length === 0 && result.hygieneLevel < 5 && (
                  <div className="bg-amber-900/20 border border-amber-500/50 rounded-lg p-6 text-center animate-pulse">
                      <div className="text-3xl mb-2">⚠️</div>
                      <h3 className="text-amber-400 font-bold font-sci-fi">AMARAN: RISIKO TERSEMBUNYI</h3>
                      <p className="text-sm text-slate-300 mt-2">
                        Markah kebersihan rendah dikesan ({result.hygieneLevel}/5), tetapi AI tidak dapat menanda objek khusus. 
                        Ini mungkin disebabkan oleh pencahayaan atau sudut kamera. Sila gunakan <b>Manual Scan</b> untuk menanda kawasan kotor.
                      </p>
                  </div>
              )}
           </div>
        </div>

        {/* RIGHT COL: Details Panel */}
        <div id="details-panel" ref={detailsPanelRef} className="lg:col-span-5 flex flex-col h-full gap-4 scroll-mt-24">
            <DualScoreCard hygieneLevel={result.hygieneLevel} safetyLevel={result.safetyLevel} isSavage={isSavageMode} />
            
            {activeRisk ? (
                <div className={`relative flex-1 bg-slate-900/90 border border-slate-700 rounded-xl p-6 md:p-8 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col transition-all duration-500`}>
                    <div className="relative z-10 flex-1 flex flex-col">
                        <div className="mb-6 md:mb-8 border-b border-slate-700/50 pb-6">
                            <div className="flex items-center gap-3 mb-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] md:text-xs font-bold font-mono-sci uppercase tracking-widest ${activeRisk.category === 'HYGIENE' ? 'bg-amber-500 text-black' : activeRisk.category === 'SAFETY' ? 'bg-indigo-500 text-white' : 'bg-red-600 text-white'}`}>{activeRisk.category} THREAT</span>
                                <span className="text-slate-500 text-[10px] md:text-xs font-mono-sci">#{getRiskIndex(activeRisk).toString().padStart(2, '0')}</span>
                            </div>
                            <h2 className="text-2xl md:text-3xl lg:text-4xl font-sci-fi font-bold text-white mb-2 leading-tight break-words">{activeRisk.label}</h2>
                            <div className="mt-2"><h3 className="text-slate-400 text-[10px] md:text-xs font-mono-sci tracking-widest uppercase mb-1">Identified Agent</h3><p className="text-lg md:text-xl lg:text-2xl text-emerald-400 font-mono-sci italic break-words leading-tight">{activeRisk.agent}</p></div>
                        </div>

                        {/* BIO-FORENSIC DATA GRID (RESTORED FROM OLD FILE) */}
                        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-950/80 border border-slate-800 rounded-lg">
                             <div>
                                <h4 className="text-[10px] font-mono-sci text-emerald-500 uppercase tracking-widest mb-1">PATHOGEN / MICROBIOLOGY</h4>
                                <div className="text-sm text-white font-mono italic">{activeRisk.microbiology || "Analysis Pending..."}</div>
                             </div>
                             <div>
                                <h4 className="text-[10px] font-mono-sci text-red-500 uppercase tracking-widest mb-1">CLINICAL DISEASE</h4>
                                <div className="text-sm text-white font-bold">{activeRisk.disease || "Medical Check Required"}</div>
                             </div>
                             {activeRisk.statistics && (
                                <div className="col-span-2 mt-2 pt-2 border-t border-slate-800">
                                   <div className="flex items-center gap-2">
                                     <span className="text-[9px] text-slate-500 font-mono-sci">STATS:</span>
                                     <span className="text-xs text-slate-300">{activeRisk.statistics}</span>
                                   </div>
                                </div>
                             )}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 md:space-y-8 pr-2">
                            <div><h4 className="text-emerald-500 font-bold text-xs font-sci-fi uppercase mb-2 flex items-center gap-2">ANALYSIS</h4><p className="text-slate-300 text-sm md:text-base leading-relaxed font-light">{activeRisk.description}</p></div>
                            <div className={`p-4 md:p-5 rounded-lg border relative overflow-hidden transition-colors duration-500 ${isSavageMode ? 'bg-red-900/10 border-red-500/30' : 'bg-emerald-900/10 border-emerald-500/30'}`}>
                                <h4 className={`font-bold text-xs font-sci-fi uppercase mb-3 flex items-center gap-2 ${isSavageMode ? 'text-red-400' : 'text-emerald-400'}`}>{isSavageMode ? t('card_savage_verdict') : t('card_recommendation')}</h4>
                                <div className="text-sm md:text-base text-slate-200 leading-relaxed italic">{isSavageMode && !activeRisk.id.startsWith('manual-') ? `"${result.savageCommentary || 'Disaster.'}"` : activeRisk.solution}</div>
                            </div>
                            <a href={generateYoutubeLink(activeRisk)} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-center gap-2 w-full py-3 rounded text-xs md:text-sm font-bold text-white transition-colors border ${activeRisk.category === 'SAFETY' ? 'bg-indigo-900/50 border-indigo-500 hover:bg-indigo-800' : 'bg-slate-800 border-slate-600 hover:bg-slate-700'}`}>
                            {activeRisk.category === 'SAFETY' ? '⚠️' : '🔬'} {getVideoButtonLabel(activeRisk)}
                            </a>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-800">
                            {chatMessages.length > 0 && (<div className="mb-3 max-h-[150px] overflow-y-auto custom-scrollbar bg-black/40 rounded p-2 text-xs space-y-2">{chatMessages.map((msg, idx) => (<div key={idx} className={`${msg.role === 'user' ? 'text-right text-emerald-300' : 'text-left text-slate-300'}`}><span className="font-bold">{msg.role === 'user' ? 'YOU: ' : 'AI: '}</span>{msg.text}</div>))}<div ref={chatEndRef}></div></div>)}
                            <form onSubmit={handleAskAI} className="relative"><input type="text" value={userQuestion} onChange={(e) => setUserQuestion(e.target.value)} placeholder={t('chat_placeholder')} disabled={isChatLoading} className="w-full bg-slate-950 border border-slate-700 rounded-full py-3 px-5 pr-12 text-sm text-white focus:border-emerald-500 outline-none" /><button type="submit" disabled={isChatLoading || !userQuestion.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-600 rounded-full text-white">➤</button></form>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
      </div>
    </div>
  );
};
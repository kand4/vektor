import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResponse, RiskDetection, ChatMessage, BoundingBox, RiskCategory, EpidemicTrend, AnalysisSession } from '../types';
import ImageAnnotator from './ImageAnnotator';
import { askRiskFollowUp, analyzeManualRegion, generateCleanSimulation, generateSimulationPrompt, SimulationConfig } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { PrintLayout } from './PrintLayout';
import KKMReport from './KKMReport';
import { Toast } from './Toast';
import { SimulationConfigModal } from './Modals/SimulationConfigModal';
import { SimulationResultModal } from './Modals/SimulationResultModal';
import { ManualSimulationModal } from './Modals/ManualSimulationModal';
import { DualScoreCard } from './DualScoreCard';

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
  const { t } = useLanguage();
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
          {isManual && <span className="text-[9px] bg-slate-700 text-white px-1 rounded border border-slate-500 shrink-0">{t('manual_label')}</span>}
        </div>
        <div className="text-[10px] md:text-xs text-slate-500 font-mono-sci italic truncate">{risk.agent}</div>
      </div>
    </button>
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
  const [cleanImages, setCleanImages] = useState<string[]>(savedSimulationImage ? [savedSimulationImage] : []);
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showManualSimModal, setShowManualSimModal] = useState(false);
  const [manualSimPrompt, setManualSimPrompt] = useState("");
  const [toastMsg, setToastMsg] = useState<{msg: string, type: 'error' | 'success'} | null>(null);

  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [displayThreshold, setDisplayThreshold] = useState(100); // 0-100 threshold

  // Reference for scrolling
  const detailsPanelRef = useRef<HTMLDivElement>(null);

  const { language, t } = useLanguage();

  useEffect(() => { setCleanImages(savedSimulationImage ? [savedSimulationImage] : []); }, [savedSimulationImage]);
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
    if (isAutoScrollEnabled && detailsPanelRef.current) {
        // Add small delay to ensure UI updates first
        setTimeout(() => {
            detailsPanelRef.current?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 100);
    }
  }

  // Filter risks based on displayThreshold (Smart Percentage-based Sorting)
  const filteredRisks = (() => {
    const sorted = [...currentRisks].sort((a, b) => {
      const confA = a.confidence !== undefined ? a.confidence : 0.9;
      const confB = b.confidence !== undefined ? b.confidence : 0.9;
      return confB - confA;
    });
    const count = Math.round(sorted.length * (displayThreshold / 100));
    return sorted.slice(0, count);
  })();

  const bioRisks = filteredRisks.filter(r => r.category === 'VECTOR' || r.category === 'HYGIENE');
  const safetyRisks = filteredRisks.filter(r => r.category === 'SAFETY');
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
  const handleOpenSimulation = () => { cleanImages.length > 0 ? setShowCleanModal(true) : setShowConfigModal(true); };

  const handleRegenerateSimulation = async (customPrompt: string) => {
      setIsCleaning(true);
      setShowCleanModal(false);
      try {
          const base64Data = imageSrc.split(',')[1];
          const mimeType = imageSrc.split(';')[0].split(':')[1] || 'image/jpeg';
          const config: SimulationConfig = {
              mode: 'SANITIZE_ONLY',
              humans: 'REMOVE',
              lighting: 'NATURAL',
              engine: 'GEMINI_IMAGEN',
              customPrompt
          };
          const generatedImage = await generateCleanSimulation(base64Data, mimeType, config);
          setCleanImages(prev => [...prev, generatedImage]);
          onSaveSimulation(generatedImage);
          setShowCleanModal(true);
      } catch (error: any) {
          setToastMsg({ msg: `Regenerasi Gagal: ${error.message}. Cuba butang manual di bawah.`, type: 'error' });
          setShowCleanModal(true);
      } finally {
          setIsCleaning(false);
      }
  };

  const handleManualFallback = async (customPrompt: string = '') => {
      setShowCleanModal(false);
      setIsCleaning(true);
      try {
          const base64Data = imageSrc.split(',')[1];
          const config: SimulationConfig = {
              mode: 'SANITIZE_ONLY',
              humans: 'REMOVE',
              lighting: 'NATURAL',
              engine: 'MANUAL',
              customPrompt
          };
          const textPrompt = await generateSimulationPrompt(base64Data, config);
          const jsonPrompt = JSON.stringify({
              instruction: "Sila gunakan tool imej generator (Imagen 3) di Gemini AI untuk mengubah imej ini berdasarkan parameters berikut:",
              image_prompt: textPrompt,
              configuration: config
          }, null, 2);
          setManualSimPrompt(jsonPrompt);
          setShowManualSimModal(true);
      } catch (error: any) {
          setToastMsg({ msg: `Ralat mod manual: ${error.message}`, type: 'error' });
      } finally {
          setIsCleaning(false);
      }
  };

  const startSimulation = async (config: SimulationConfig) => {
      setShowConfigModal(false);
      setIsCleaning(true);
      try {
          const base64Data = imageSrc.split(',')[1];
          const mimeType = imageSrc.split(';')[0].split(':')[1] || 'image/jpeg';
          
          if (config.engine === 'MANUAL') {
              const textPrompt = await generateSimulationPrompt(base64Data, config);
              const jsonPrompt = JSON.stringify({
                  instruction: "Sila gunakan tool imej generator (Imagen 3) di Gemini AI untuk mengubah imej ini berdasarkan parameters berikut:",
                  image_prompt: textPrompt,
                  configuration: config
              }, null, 2);
              setManualSimPrompt(jsonPrompt);
              setShowManualSimModal(true);
          } else {
              const generatedImage = await generateCleanSimulation(base64Data, mimeType, config);
              setCleanImages(prev => [...prev, generatedImage]);
              onSaveSimulation(generatedImage);
              setShowCleanModal(true);
          }
      } catch (error: any) {
          setToastMsg({ msg: `Simulasi Gagal: ${error.message}. API Limit/Quota dicapai. Sila cuba kaedah manual.`, type: 'error' });
          // If automatic fails, we fallback to manual seamlessly or ask user via toast.
          // Since the user is asked to use button, they can click "✨ LIHAT SIMULASI LEPAS" then click the manual button if we left cleanImages intact...
          // Wait, if cleanImages is empty, they can't open the modal! We should auto trigger flow.
          if (cleanImages.length === 0) {
              handleManualFallback();
          }
      } finally {
          setIsCleaning(false);
      }
  };

  const handleManualSimulationPasted = (base64Image: string) => {
      setShowManualSimModal(false);
      setCleanImages(prev => [...prev, base64Image]);
      onSaveSimulation(base64Image);
      setShowCleanModal(true);
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
      setChatMessages(prev => [...prev, { role: 'model', text: t('chat_error') }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // ROBUST PRINT HANDLER V5: HTML2PDF + NATIVE FALLBACK
  const handlePrint = async () => {
    setIsPrinting(true);
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
        setToastMsg({ msg: "Menjana PDF... Sila tunggu.", type: 'success' });
        // Dynamically import html2pdf safely
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default || html2pdfModule;
        const element = document.getElementById('print-mount');
        
        if (element) {
            const targetElement = (element.firstElementChild as HTMLElement) || element;
            const opt = {
                margin:       0,
                filename:     `Laporan_Pemeriksaan_${Math.floor(Date.now() / 1000)}.pdf`,
                image:        { type: 'jpeg' as const, quality: 0.98 },
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
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
                pagebreak:    { mode: 'css', avoid: '.avoid-break' }
            };
            
            // Allow a delay for images/layout to settle
            setTimeout(() => {
                html2pdf().from(targetElement).set(opt).outputPdf('blob').then((pdfBlob: Blob) => {
                    document.body.classList.remove('is-printing');
                    window.scrollTo(0, originalScrollY);
                    setToastMsg({ msg: "PDF berjaya dijana!", type: 'success' });
                    setIsPrinting(false);
                    
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
                    setIsPrinting(false);
                    window.print();
                });
            }, 1000); // 1s delay to ensure content is fully painted
            return;
        }
    } catch (e) {
        console.error('html2pdf error', e);
        document.body.classList.remove('is-printing');
        window.scrollTo(0, originalScrollY);
        setIsPrinting(false);
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
                <h3 className="text-lg font-sci-fi font-bold text-white mb-4"><span className="text-emerald-400">🎯 {t('manual_targeting')}</span></h3>                <div className="mb-4">
                     <label className="text-xs text-slate-400 font-mono-sci uppercase block mb-1">Jenis Gambar:</label>
                     <select 
                        value={manualContext.includes("Candid") ? "Candid" : "Targeted"} 
                        onChange={(e) => setManualContext(prev => `${e.target.value}: ${prev.split(': ')[1] || ''}`)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm"
                     >
                         <option value="Candid">Candid</option>
                         <option value="Targeted">Targeted (Bersasar)</option>
                     </select>
                 </div>
                 <textarea value={manualContext.split(': ')[1] || ''} onChange={(e) => setManualContext(prev => `${prev.split(': ')[0] || 'Candid'}: ${e.target.value}`)} placeholder={t('manual_placeholder')} rows={3} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white text-sm outline-none mb-4" />
                <div className="flex gap-2">
                    <button onClick={cancelManualMode} disabled={isProcessingManual} className="flex-1 py-2 bg-slate-800 text-slate-300 rounded">{t('btn_cancel')}</button>
                    <button onClick={submitManualAnalysis} disabled={!manualContext.trim() || isProcessingManual} className="flex-1 py-2 bg-emerald-600 text-white rounded font-bold">{isProcessingManual ? t('scanning_wait') : t('btn_analyze')}</button>
                </div>
            </div>
        </div>
     )
  }

  // IF KKM MODE: Show Special Report + Image Annotator
  if (isKKMMode) {
      const validSessions = allSessions.filter(s => s.status === 'SUCCESS' && s.result);
      const avgHygiene = validSessions.length > 0 ? (validSessions.reduce((sum, s) => sum + (s.result?.hygieneLevel || 0), 0) / validSessions.length) : 0;
      
      return (
          <div className="animate-fade-in pb-20 border border-[#e5ebe5]">
             {isPrinting && (
                 <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center">
                     <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_cyan]"></div>
                     <h2 className="text-xl font-bold font-sci-fi text-cyan-400 tracking-wider">MENJANA LAPORAN PDF...</h2>
                     <p className="text-sm text-slate-400 mt-2 font-mono">Sila tunggu. Mengumpul data analisis keseluruhan.</p>
                 </div>
             )}
             {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
             
             {/* THE HIDDEN PRINT MODULE */}
             <PrintLayout sessions={allSessions.map(session => {
                if (!session.result?.risks) return session;
                const sorted = [...session.result.risks].sort((a, b) => {
                    const confA = a.confidence !== undefined ? a.confidence : 0.9;
                    const confB = b.confidence !== undefined ? b.confidence : 0.9;
                    return confB - confA;
                });
                const count = Math.round(sorted.length * (displayThreshold / 100));
                return { 
                    ...session, 
                    result: { 
                        ...session.result, 
                        risks: sorted.slice(0, count) 
                    } 
                };
             })} />

             <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-blue-400 font-sci-fi">LAPORAN PEMERIKSAAN KKM</h2>
                <div className="flex gap-2">
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded text-sm font-bold uppercase tracking-wider transition-all border border-green-500/50 hover:bg-green-900/30 text-green-400 bg-slate-900 shadow-lg">
                        🖨️ {t('btn_print_pdf') || 'CETAK LAPORAN PDF'}
                    </button>
                    {allSessions.length > 1 && (
                        <div className="bg-blue-900/40 border border-blue-500/50 px-4 py-2 rounded flex items-center gap-3 shadow-lg">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-blue-300 font-bold uppercase tracking-tighter">SKOR KUMULATIF ({validSessions.length})</span>
                                <span className="text-sm font-sci-fi font-bold text-white">{avgHygiene.toFixed(1)} / 5.0</span>
                            </div>
                            <div className={`w-8 h-8 rounded border-2 flex items-center justify-center font-bold text-sm ${avgHygiene < 3 ? 'border-red-500 text-red-500' : 'border-emerald-500 text-emerald-400'}`}>
                                {avgHygiene < 3 ? 'D' : 'A'}
                            </div>
                        </div>
                    )}
                    {validSessions.length > 1 && (
                        <button 
                            onClick={() => document.getElementById('cumulative-table')?.scrollIntoView({ behavior: 'smooth' })}
                            className="bg-slate-800 border border-slate-700 px-4 py-2 rounded text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
                        >
                            📊 LIHAT PECAHAN
                        </button>
                    )}
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Left: Report */}
                 <KKMReport result={result} />
                 
                 {/* Right: Evidence */}
                 <div className="flex flex-col gap-4">
                     <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 relative">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                           <h3 className="text-sm font-bold text-white">BUKTI GAMBAR (ANNOTATED)</h3>
                           <div className="flex items-center gap-2">
                               <button 
                                   onClick={() => setIsEditing(!isEditing)} 
                                   className={`text-[9px] uppercase font-bold px-2 py-1 rounded transition-colors flex items-center gap-1 border shadow-md backdrop-blur-md ${isEditing ? 'bg-red-900/60 text-red-300 border-red-800/80 animate-pulse' : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:bg-slate-800'}`}
                                   title={isEditing ? "Matikan Sasar Manual" : "Sasar Kawasan Manual"}
                               >
                                   {isEditing ? `🔴 ${t('label_targeting') || 'SEDANG SEDIA MENGESAN'}` : `🎯 ${t('btn_manual_scan') || 'SASARAN MANUAL'}`}
                               </button>
                               <button
                                  onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
                                  className={`text-[9px] uppercase font-bold px-2 py-1 rounded transition-colors flex items-center gap-1 border shadow-md backdrop-blur-md ${
                                    isAutoScrollEnabled ? 'bg-cyan-900/60 text-cyan-300 border-cyan-800/80 hover:bg-cyan-800/80' : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:bg-slate-800'
                                  }`}
                                  title={isAutoScrollEnabled ? "Matikan Auto-Scroll" : "Hidupkan Auto-Scroll"}
                               >
                                  {isAutoScrollEnabled ? '✅ Auto-Scroll (ON)' : '❌ Auto-Scroll (OFF)'}
                               </button>
                           </div>
                        </div>
                        <div className="border border-slate-700 rounded-xl bg-slate-950 relative z-20">
                            <ImageAnnotator 
                                imageSrc={imageSrc} 
                                risks={filteredRisks} 
                                onRiskSelect={handleRiskChange} 
                                selectedId={activeRisk?.id} 
                                isEditing={isEditing} 
                                onRegionDrawn={handleRegionDrawn} 
                            />
                            
                            {activeRisk && (
                                <div className="p-4 bg-slate-950 border-t border-slate-700">
                                    <h4 className="text-emerald-500 font-bold text-xs font-sci-fi uppercase mb-1">{t('label_analysis') || 'ANALISIS KESELAMATAN & KESIHATAN MAKANAN'}</h4>
                                    <p className="text-slate-300 text-sm leading-relaxed">{activeRisk.description}</p>
                                    
                                    {(activeRisk.agent || activeRisk.microbiology || activeRisk.disease) && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 p-3 bg-slate-900 border border-slate-800 rounded-lg">
                                            {activeRisk.agent && (
                                                <div>
                                                    <h4 className="text-[9px] font-mono-sci text-slate-500 uppercase tracking-widest mb-1">{t('label_agent') || 'AGEN MIKROB'}</h4>
                                                    <div className="text-xs text-emerald-400 font-mono italic break-words">{activeRisk.agent}</div>
                                                </div>
                                            )}
                                            {activeRisk.microbiology && (
                                                <div>
                                                    <h4 className="text-[9px] font-mono-sci text-emerald-500 uppercase tracking-widest mb-1">{t('label_pathogen') || 'PATOGEN'}</h4>
                                                    <div className="text-xs text-white font-mono italic break-words">{activeRisk.microbiology}</div>
                                                </div>
                                            )}
                                            {activeRisk.disease && (
                                                <div>
                                                    <h4 className="text-[9px] font-mono-sci text-red-500 uppercase tracking-widest mb-1">{t('label_disease') || 'PENYAKIT/RISIKO KLINIKAL'}</h4>
                                                    <div className="text-xs text-white break-words">{activeRisk.disease}</div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <h4 className="text-emerald-500 font-bold text-xs font-sci-fi uppercase mt-3 mb-1">{t('card_recommendation') || 'TINDAKAN PEMBETULAN'}</h4>
                                    <p className="text-slate-200 text-sm italic mb-4">{activeRisk.solution}</p>

                                    <div className="flex flex-col sm:flex-row gap-2 mt-4 border-t border-slate-800 pt-4">
                                        <a href={generateYoutubeLink(activeRisk)} target="_blank" rel="noopener noreferrer" className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-xs font-bold text-white transition-colors border bg-slate-800 border-slate-600 hover:bg-slate-700`}>
                                            🔬 {getVideoButtonLabel(activeRisk)}
                                        </a>
                                        {activeRisk.agent && (
                                            <a href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(activeRisk.agent + (activeRisk.microbiology ? ' ' + activeRisk.microbiology : '') + (activeRisk.disease ? ' ' + activeRisk.disease : ''))}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2 rounded text-xs font-bold text-white transition-colors border bg-blue-900/50 border-blue-700 hover:bg-blue-800">
                                                📚 PubMed Citation
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SENSITIVITY CONTROL SECTION (KKM) */}
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 animate-fade-in no-print">
                            <div className="flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-blue-400 font-sci-fi tracking-widest">DARJAH KEPEKAAN ANALISIS (AI)</span>
                                        <span className="text-[10px] text-slate-400 font-mono italic">Kawal peratusan penemuan yang dipaparkan mengikut tahap keyakinan AI.</span>
                                    </div>
                                    <div className="px-3 py-1 bg-blue-900/40 border border-blue-500/50 rounded text-blue-300 font-mono-sci font-bold">
                                        {displayThreshold}%
                                    </div>
                                </div>
                                <div className="relative pt-1">
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        step="1"
                                        value={displayThreshold}
                                        onChange={(e) => setDisplayThreshold(parseInt(e.target.value))}
                                        className="w-full accent-blue-500 h-2 cursor-pointer bg-slate-800 rounded-lg appearance-none border border-slate-700"
                                    />
                                    <div className="flex justify-between mt-2">
                                        <span className="text-[8px] font-mono-sci text-slate-500 uppercase tracking-tighter">Fokus Kritikal (0%)</span>
                                        <span className="text-[8px] font-mono-sci text-slate-500 uppercase tracking-tighter">Analisis Maksimum (100%)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                     </div>
                 </div>
             </div>
             
             {validSessions.length > 1 && (
                 <div id="cumulative-table" className="mt-8 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden animate-fade-in no-print">
                     <div className="bg-slate-950 p-4 border-b border-slate-700 flex justify-between items-center">
                         <h3 className="text-sm font-bold text-white tracking-widest font-sci-fi">RUMUSAN KUMULATIF ({validSessions.length} IMEJ)</h3>
                         <span className="text-[10px] text-slate-500 font-mono">PURATA SCORE: {(validSessions.reduce((sum, s) => sum + (s.result?.hygieneLevel || 0), 0) / validSessions.length).toFixed(1)}/5.0</span>
                     </div>
                     <table className="w-full text-xs text-left border-collapse">
                         <thead>
                             <tr className="bg-slate-900/50 text-slate-400 border-b border-slate-800 font-mono-sci">
                                 <th className="p-3 font-bold">#</th>
                                 <th className="p-3 font-bold">FAIL / IMEJ</th>
                                 <th className="p-3 font-bold">KEBERSIHAN</th>
                                 <th className="p-3 font-bold text-center">STATUS</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800">
                             {validSessions.map((s, idx) => (
                                 <tr key={s.id} className="hover:bg-slate-800/50 transition">
                                     <td className="p-3 text-slate-500">{idx + 1}</td>
                                     <td className="p-3 truncate max-w-xs text-slate-300">{s.fileName}</td>
                                     <td className="p-3">
                                         <div className="flex items-center gap-2">
                                             <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                 <div className={`h-full ${s.result!.hygieneLevel >= 3 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${(s.result!.hygieneLevel / 5) * 100}%` }}></div>
                                             </div>
                                             <span className="font-bold">{s.result!.hygieneLevel}/5</span>
                                         </div>
                                     </td>
                                     <td className="p-3 text-center">
                                         <span className={`text-[9px] px-2 py-0.5 rounded border uppercase font-bold ${s.result!.hygieneLevel >= 3 ? 'bg-red-900/20 text-red-500 border-red-500/50' : 'bg-emerald-900/20 text-emerald-500 border-emerald-500/50'}`}>
                                             {s.result!.hygieneLevel >= 3 ? 'GAGAL' : 'LULUS'}
                                         </span>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
             )}
          </div>
      )
  }

  // STANDARD VECTOR MODE
  // Restored to rely on activeRisk for details panel presence (Clean visual if no risk selected)
  return (
    <div className="animate-fade-in pb-20">
      {isPrinting && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_cyan]"></div>
              <h2 className="text-xl font-bold font-sci-fi text-cyan-400 tracking-wider">MENJANA LAPORAN PDF...</h2>
              <p className="text-sm text-slate-400 mt-2 font-mono">Sila tunggu. Mengumpul data analisis keseluruhan.</p>
          </div>
      )}
      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
      <SimulationConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} onStart={startSimulation} />
      <SimulationResultModal isOpen={showCleanModal} onClose={() => setShowCleanModal(false)} originalImage={imageSrc} generatedImages={cleanImages} onRegenerate={handleRegenerateSimulation} onManualFallback={handleManualFallback} />
      <ManualSimulationModal isOpen={showManualSimModal} onClose={() => setShowManualSimModal(false)} promptText={manualSimPrompt} onImagePasted={handleManualSimulationPasted} />
      
      {/* THE HIDDEN PRINT MODULE */}
      <PrintLayout sessions={allSessions} />

      <div className="flex flex-wrap gap-3 justify-between items-center mb-4 md:mb-6 no-print">
         <div className="flex gap-2">
            <button onClick={() => setIsEditing(!isEditing)} className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded text-xs md:text-sm font-bold uppercase tracking-wider transition-all border ${isEditing ? 'bg-red-600 text-white border-red-500 animate-pulse' : 'bg-slate-800 text-slate-300 border-slate-600'}`}>
                {isEditing ? `🔴 ${t('label_targeting')}` : `🎯 ${t('btn_manual_scan')}`}
            </button>
            <button onClick={handleOpenSimulation} disabled={isCleaning} className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded text-xs md:text-sm font-bold uppercase tracking-wider transition-all border border-cyan-500/50 hover:bg-cyan-900/30 text-cyan-400 disabled:opacity-50`}>
                {isCleaning ? <span className="animate-pulse">SIMULATING...</span> : <>✨ {t('btn_simulation')}</>}
            </button>
            
            <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded text-xs md:text-sm font-bold uppercase tracking-wider transition-all border border-green-500/50 hover:bg-green-900/30 text-green-400">
                🖨️ {t('btn_print_pdf')}
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
        <div className="lg:col-span-7 flex flex-col gap-4 z-20 relative">
            
            {/* Analysis Score Overview */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl p-3 md:p-4 shadow-sm">
                 <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] md:text-xs text-slate-400 font-mono-sci uppercase">{t('label_hygiene')}</span>
                        <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-sm md:text-base border ${result.hygieneLevel <= 2 ? 'border-emerald-500 text-emerald-400 bg-emerald-950/30' : result.hygieneLevel === 3 ? 'border-yellow-500 text-yellow-400 bg-yellow-950/30' : 'border-red-500 text-red-500 bg-red-950/30'}`}>{result.hygieneLevel}</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] md:text-xs text-slate-400 font-mono-sci uppercase">{t('label_safety')}</span>
                        <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-sm md:text-base border ${result.safetyLevel <= 2 ? 'border-blue-500 text-blue-400 bg-blue-950/30' : result.safetyLevel === 3 ? 'border-yellow-500 text-yellow-400 bg-yellow-950/30' : 'border-orange-500 text-orange-500 bg-orange-950/30'}`}>{result.safetyLevel || result.hygieneLevel}</div>
                    </div>
                 </div>
                 {result.sensitivityUsed && (
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] md:text-xs text-slate-500 font-mono-sci uppercase">{t('label_sensitivity')}</span>
                       <span className={`text-[10px] md:text-xs px-2 py-1 rounded border font-bold ${result.sensitivityUsed === 'EXTREME' ? 'border-red-500 text-red-400 bg-red-950/30' : result.sensitivityUsed === 'HIGH' ? 'border-orange-500 text-orange-400 bg-orange-950/30' : 'border-slate-500 text-slate-400 bg-slate-900'}`}>
                          {result.sensitivityUsed}
                       </span>
                    </div>
                 )}
            </div>

           <div className="relative rounded-xl border border-slate-700 bg-slate-900 group">
              {/* Auto Scroll Toggle */}
              <div className="absolute top-2 right-2 z-50">
                 <button
                    onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
                    className={`text-[9px] uppercase font-bold px-2 py-1 rounded transition-colors flex items-center gap-1 border shadow-md backdrop-blur-md ${
                      isAutoScrollEnabled ? 'bg-cyan-900/60 text-cyan-300 border-cyan-800/80 hover:bg-cyan-800/80' : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:bg-slate-800'
                    }`}
                    title={isAutoScrollEnabled ? "Matikan Auto-Scroll" : "Hidupkan Auto-Scroll"}
                 >
                    {isAutoScrollEnabled ? '✅ Auto-Scroll (ON)' : '❌ Auto-Scroll (OFF)'}
                 </button>
              </div>
              <ImageAnnotator imageSrc={imageSrc} risks={filteredRisks} onRiskSelect={handleRiskChange} selectedId={activeRisk?.id} isEditing={isEditing} onRegionDrawn={handleRegionDrawn} />
               
              {activeRisk && (
                  <div className="p-4 bg-slate-950 border-t border-slate-700">
                      <h4 className="text-emerald-500 font-bold text-xs font-sci-fi uppercase mb-1">{t('label_analysis')}</h4>
                      <p className="text-slate-300 text-sm leading-relaxed">{activeRisk.description}</p>
                      <h4 className="text-emerald-500 font-bold text-xs font-sci-fi uppercase mt-3 mb-1">{t('card_recommendation')}</h4>
                      <p className="text-slate-200 text-sm italic">{activeRisk.solution}</p>
                  </div>
              )}
           </div>

           {/* SENSITIVITY CONTROL SECTION (STANDARD) */}
           <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 animate-fade-in no-print mt-2">
                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-emerald-400 font-sci-fi tracking-widest">TAHAP KEPEKAAN PENGESANAN</span>
                            <span className="text-[10px] text-slate-400 font-mono italic text-balance">Tetapkan peratusan penemuan yang ingin dipaparkan dalam laporan.</span>
                        </div>
                        <div className="px-3 py-1 bg-emerald-900/30 border border-emerald-500/50 rounded text-emerald-400 font-mono-sci font-bold font-sci-fi">
                            {displayThreshold}%
                        </div>
                    </div>
                    <div className="relative pt-1">
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="1"
                            value={displayThreshold}
                            onChange={(e) => setDisplayThreshold(parseInt(e.target.value))}
                            className="w-full accent-emerald-500 h-2 cursor-pointer bg-slate-800 rounded-lg appearance-none border border-slate-700"
                        />
                        <div className="flex justify-between mt-2">
                            <span className="text-[8px] font-mono-sci text-slate-500 uppercase tracking-tighter">Tiada Hasil (0%)</span>
                            <span className="text-[8px] font-mono-sci text-emerald-500 uppercase tracking-tighter font-black underline">Lengkap (100%)</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-4">
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
              
              {/* Logic Fix: Only show "No Risks" if Hygiene is decent (<=2). If it's dirty but no risks found, show Warning. */}
              {currentRisks.length === 0 && result.hygieneLevel <= 2 && (
                  <div className="bg-emerald-900/20 border border-emerald-500/50 rounded-lg p-6 text-center">
                      <div className="text-3xl mb-2">✅</div>
                      <h3 className="text-emerald-400 font-bold font-sci-fi">{t('no_risk_detected')}</h3>
                      <p className="text-sm text-slate-400 mt-2">{t('no_risk_desc')}</p>
                  </div>
              )}
              
              {currentRisks.length === 0 && result.hygieneLevel > 2 && (
                  <div className="bg-amber-900/20 border border-amber-500/50 rounded-lg p-6 text-center animate-pulse">
                      <div className="text-3xl mb-2">⚠️</div>
                      <h3 className="text-amber-400 font-bold font-sci-fi">{t('hidden_risk_warning')}</h3>
                      <p className="text-sm text-slate-300 mt-2">
                        {t('hidden_risk_desc')}
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
                                <span className={`px-2 py-0.5 rounded text-[10px] md:text-xs font-bold font-mono-sci uppercase tracking-widest ${activeRisk.category === 'HYGIENE' ? 'bg-amber-500 text-black' : activeRisk.category === 'SAFETY' ? 'bg-indigo-500 text-white' : 'bg-red-600 text-white'}`}>{activeRisk.category} {t('label_threat')}</span>
                                <span className="text-slate-500 text-[10px] md:text-xs font-mono-sci">#{getRiskIndex(activeRisk).toString().padStart(2, '0')}</span>
                            </div>
                            <h2 className="text-2xl md:text-3xl lg:text-4xl font-sci-fi font-bold text-white mb-2 leading-tight break-words">{activeRisk.label}</h2>
                            <div className="mt-2"><h3 className="text-slate-400 text-[10px] md:text-xs font-mono-sci tracking-widest uppercase mb-1">{t('label_agent')}</h3><p className="text-lg md:text-xl lg:text-2xl text-emerald-400 font-mono-sci italic break-words leading-tight">{activeRisk.agent}</p></div>
                        </div>

                        {/* BIO-FORENSIC DATA GRID (RESTORED FROM OLD FILE) */}
                        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-950/80 border border-slate-800 rounded-lg">
                             <div>
                                <h4 className="text-[10px] font-mono-sci text-emerald-500 uppercase tracking-widest mb-1">{t('label_pathogen')}</h4>
                                <div className="text-sm text-white font-mono italic">{activeRisk.microbiology || t('analysis_pending')}</div>
                             </div>
                             <div>
                                <h4 className="text-[10px] font-mono-sci text-red-500 uppercase tracking-widest mb-1">{t('label_disease')}</h4>
                                <div className="text-sm text-white font-bold">{activeRisk.disease || t('medical_check')}</div>
                             </div>
                             {activeRisk.statistics && (
                                <div className="col-span-2 mt-2 pt-2 border-t border-slate-800">
                                   <div className="flex items-center gap-2">
                                     <span className="text-[9px] text-slate-500 font-mono-sci">{t('label_stats')}</span>
                                     <span className="text-xs text-slate-300">{activeRisk.statistics}</span>
                                   </div>
                                </div>
                             )}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 md:space-y-8 pr-2">
                            <div><h4 className="text-emerald-500 font-bold text-xs font-sci-fi uppercase mb-2 flex items-center gap-2">{t('label_analysis')}</h4><p className="text-slate-300 text-sm md:text-base leading-relaxed font-light">{activeRisk.description}</p></div>
                            <div className={`p-4 md:p-5 rounded-lg border relative overflow-hidden transition-colors duration-500 ${isSavageMode ? 'bg-red-900/10 border-red-500/30' : 'bg-emerald-900/10 border-emerald-500/30'}`}>
                                <h4 className={`font-bold text-xs font-sci-fi uppercase mb-3 flex items-center gap-2 ${isSavageMode ? 'text-red-400' : 'text-emerald-400'}`}>{isSavageMode ? t('card_savage_verdict') : t('card_recommendation')}</h4>
                                <div className="text-sm md:text-base text-slate-200 leading-relaxed italic mb-4">{isSavageMode && !activeRisk.id.startsWith('manual-') ? `"${activeRisk.savageCommentary || result.savageCommentary || t('savage_fallback')}"` : activeRisk.solution}</div>
                                
                                <div className="flex flex-col sm:flex-row gap-2 mt-4 border-t border-slate-700/50 pt-4">
                                    <a href={generateYoutubeLink(activeRisk)} target="_blank" rel="noopener noreferrer" className={`flex-1 flex items-center justify-center gap-2 py-3 rounded text-xs md:text-sm font-bold text-white transition-colors border ${activeRisk.category === 'SAFETY' ? 'bg-indigo-900/50 border-indigo-500 hover:bg-indigo-800' : 'bg-slate-800 border-slate-600 hover:bg-slate-700'}`}>
                                        {activeRisk.category === 'SAFETY' ? '⚠️' : '🔬'} {getVideoButtonLabel(activeRisk)}
                                    </a>
                                    {activeRisk.agent && (
                                        <a href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(activeRisk.agent + (activeRisk.microbiology ? ' ' + activeRisk.microbiology : '') + (activeRisk.disease ? ' ' + activeRisk.disease : ''))}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-3 rounded text-xs md:text-sm font-bold text-white transition-colors border bg-blue-900/50 border-blue-700 hover:bg-blue-800">
                                            📚 PubMed Citation
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-800">
                            {chatMessages.length > 0 && (<div className="mb-3 max-h-[150px] overflow-y-auto custom-scrollbar bg-black/40 rounded p-2 text-xs space-y-2">{chatMessages.map((msg, idx) => (<div key={idx} className={`${msg.role === 'user' ? 'text-right text-emerald-300' : 'text-left text-slate-300'}`}><span className="font-bold">{msg.role === 'user' ? t('chat_you') : t('chat_ai')}</span>{msg.text}</div>))}<div ref={chatEndRef}></div></div>)}
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
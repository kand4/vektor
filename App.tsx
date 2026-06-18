import React, { useState, useEffect } from 'react';
import BioBackground from './components/BioBackground';
import Header from './components/Header';
import Footer from './components/Footer';
import UploadZone from './components/UploadZone';
import { AnalysisResults } from './components/AnalysisResults';
import LiveCameraScanner from './components/LiveCameraScanner';
import { AnalysisSession, SensitivityLevel, AnalysisMode, AnalysisResponse, iDengueData, RegionalDengueData } from './types';
import HUDOverlay from './components/HUDOverlay';
import AboutSystem from './components/AboutSystem';
import SettingsModal from './components/SettingsModal';
import HeatmapModal from './components/HeatmapModal';
import GlobalMapModal from './components/GlobalMapModal';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { PredictionChart } from './components/PredictionChart';
import LarvaeScanner from './components/LarvaeScanner';
import AdultMosquitoScanner from './components/AdultMosquitoScanner';
import { SimulationGallery } from './components/SimulationGallery';
import { ManualSimulationPage } from './components/ManualSimulationPage';
import { fetchNationalDengueTrend } from './services/dataGovService';
import { fetchLatestIDengueStats, fetchRegionalDengueStats, analyzeLandscape } from './services/geminiService';
import { resizeAndCompressImage } from './utils/imageUtils';
import { dbGet, dbSet, dbClear } from './utils/db';
import { Toast } from './components/Toast';
import { ManualJsonBypassPanel } from './components/ManualJsonBypassPanel';

const MANUAL_SIMULATION_DEFAULT_PROMPT = `Sila gunakan tool penjana imej (Imagen) untuk mengubah imej yang saya kongsikan ini:

[PANDUAN UTAMA / CRITICAL INSTRUCTIONS]:
1. KEKALKAN SUDUT KAMERA, PERSPEKTIF, ELEVASI, DAN FIELD OF VIEW YANG SAMA SEPERTI IMEJ ASAL.
2. Jadikan kawasan ini kelihatan sangat bersih, kemas, kering sepenuhnya, tersusun rapi, dan mematuhi standard kebersihan yang sangat tinggi (spotless, immaculate, and pristine).
3. Pastikan seluruh lantai, dinding, dan permukaan rata kelihatan sangat bersih, kering, licin berkilat tanpa sebarang cela atau kotoran.
4. Semua objek, peranti, atau perabot diaturkan dengan sangat kemas, teratur, dan tersusun rapi mengikut susun atur asal.
5. Hasilkan imej yang ultra-fotorealistik, fotografi resolusi tinggi (8k), dengan pencahayaan semula jadi yang bersih, terang, dan bergemerlapan.`;

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'HOME' | 'LARVAE_DETECTION' | 'ADULT_MOSQUITO_DETECTION' | 'MANUAL_SIMULATION'>('HOME');
  const [currentHomeSubView, setCurrentHomeSubView] = useState<'MENU' | 'FORENSIC' | 'ANALYTICS'>('MENU');
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  // Load from IndexedDB on startup
  useEffect(() => {
    const loadFromDb = async () => {
      try {
        const cachedSessions = await dbGet<AnalysisSession[]>('sessions');
        const cachedActiveId = await dbGet<string | null>('activeSessionId');
        if (cachedSessions && cachedSessions.length > 0) {
          setSessions(cachedSessions);
          if (cachedActiveId && cachedSessions.some(s => s.id === cachedActiveId)) {
            setActiveSessionId(cachedActiveId);
          } else {
            setActiveSessionId(cachedSessions[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading history from IndexedDB:", err);
      } finally {
        setDbLoaded(true);
      }
    };
    loadFromDb();
  }, []);

  // Save sessions to IndexedDB whenever changed
  useEffect(() => {
    if (dbLoaded) {
      dbSet('sessions', sessions);
    }
  }, [sessions, dbLoaded]);

  // Save activeSessionId to IndexedDB whenever changed
  useEffect(() => {
    if (dbLoaded) {
      dbSet('activeSessionId', activeSessionId);
    }
  }, [activeSessionId, dbLoaded]);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showGlobalMap, setShowGlobalMap] = useState(false);
  const [showSimulationGallery, setShowSimulationGallery] = useState(false);
  const [showBypassModal, setShowBypassModal] = useState(false);
  const [emptyAlertType, setEmptyAlertType] = useState<'imbasan' | 'simulasi' | null>(null);
  const [isGalleryExpanded, setIsGalleryExpanded] = useState(true);
  const [toastMsg, setToastMsg] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);
  
  const [sensitivity, setSensitivity] = useState<SensitivityLevel>('STANDARD');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('VECTOR_CONTROL');

  const [isStatsLoading, setIsStatsLoading] = useState(false);
  
  const [nationalStats, setNationalStats] = useState<iDengueData | null>(null);
  const [regionalStats, setRegionalStats] = useState<RegionalDengueData | null>(null);
  
  const { language, t } = useLanguage();

  const loadDengueData = async () => {
    setIsStatsLoading(true);
    try {
        const nat = await fetchLatestIDengueStats();
        const reg = await fetchRegionalDengueStats("Pahang", "Temerloh");
        setNationalStats(nat);
        setRegionalStats(reg);
    } catch (e) {
        console.error("Failed to sync", e);
    } finally {
        setIsStatsLoading(false);
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    try {
      const filePromises = files.map(async (file, index) => {
        try {
          const { base64, mimeType, preview } = await resizeAndCompressImage(file);
          if (!preview || !base64) return null;
          return {
            id: `session-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`,
            fileName: file.name,
            imageSrc: preview,
            mimeType: mimeType,
            status: 'PENDING' as const,
            mode: analysisMode
          };
        } catch (err) {
          console.error("Error reading file:", file.name, err);
          return null;
        }
      });

      const newSessions = (await Promise.all(filePromises))
        .filter((s): s is NonNullable<typeof s> => s !== null);

      if (newSessions.length > 0) {
        setSessions(prev => [...prev, ...newSessions]);
        if (!activeSessionId) {
          setActiveSessionId(newSessions[0].id);
        }
        setIsGalleryExpanded(true);
      }
    } catch (error) {
       console.error("Error batch processing files:", error);
    }
  };

  useEffect(() => {
    const processNext = async () => {
        const analyzingCount = sessions.filter(s => s.status === 'ANALYZING').length;
        if (analyzingCount < 2) {
            const pendingSession = sessions.find(s => s.status === 'PENDING');
            if (pendingSession) {
                // Enforce minimum 4 seconds between processing to respect 15 RPM free tier limits
                await new Promise(resolve => setTimeout(resolve, 4000));
                triggerAnalysis(pendingSession.id);
            }
        }
    };
    processNext();
  }, [sessions]);

  const triggerAnalysis = async (sessionId: string) => {
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'ANALYZING' } : s));
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;
      try {
          // 'DETAILED' mode now implies 32k token budget deep scan
          const result = await analyzeLandscape(session.imageSrc.split(',')[1], session.mimeType, 'DETAILED', language, sensitivity, session.mode || analysisMode);
          setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'SUCCESS', result: result } : s));
      } catch (error: any) {
          setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'ERROR', error: error.message } : s));
      }
  };

  const handleSimulationSave = (sessionId: string, image: string) => {
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, simulationImage: image } : s));
  };

  const RADAR_GRID_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 1000 1000" style="background:%23020617"><defs><radialGradient id="r" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="%2310b981" stop-opacity="0.15"/><stop offset="100%" stop-color="%23020617" stop-opacity="0.9"/></radialGradient></defs><rect width="1000" height="1000" fill="url(%23r)"/><g stroke="%2310b981" stroke-opacity="0.2" stroke-width="1"><path d="M 0,100 L 1000,100 M 0,200 L 1000,200 M 0,300 L 1000,300 M 0,400 L 1000,400 M 0,500 L 1000,500 M 0,600 L 1000,600 M 0,700 L 1000,700 M 0,800 L 1000,800 M 0,900 L 1000,900"/><path d="M 100,0 L 100,1000 M 200,0 L 200,1000 M 300,0 L 300,1000 M 400,0 L 400,1000 M 500,0 L 500,1000 M 600,0 L 600,1000 M 700,0 L 700,1000 M 800,0 L 800,1000 M 900,0 L 900,1000"/></g><circle cx="500" cy="500" r="100" fill="none" stroke="%2310b981" stroke-opacity="0.5" stroke-dasharray="8 8" stroke-width="2"></circle><circle cx="500" cy="500" r="300" fill="none" stroke="%2310b981" stroke-opacity="0.3" stroke-width="1.5"/><circle cx="500" cy="500" r="450" fill="none" stroke="%2310b981" stroke-opacity="0.15" stroke-width="1"/><line x1="500" y1="0" x2="500" y2="1000" stroke="%2310b981" stroke-opacity="0.3" stroke-width="2"/><line x1="0" y1="500" x2="1000" y2="500" stroke="%2310b981" stroke-opacity="0.3" stroke-width="2"/><text x="50" y="80" fill="%2310b981" font-family="monospace" font-size="20" opacity="0.6">ANOMALY DETECTOR // MONITOR ACTIVE</text></svg>`;

  const handleApplyExternalJson = (parsedResult: AnalysisResponse) => {
    if (activeSessionId) {
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, status: 'SUCCESS', result: parsedResult } : s));
      setIsGalleryExpanded(false);
    } else {
      const newSessionId = `session-external-${Date.now()}`;
      const newSession: AnalysisSession = {
        id: newSessionId,
        fileName: 'PENGESANAN_KUPASAN_AI_LUARAN.jpg',
        imageSrc: RADAR_GRID_SVG,
        mimeType: 'image/jpeg',
        status: 'SUCCESS',
        result: parsedResult,
        mode: analysisMode
      };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSessionId);
      setIsGalleryExpanded(false);
    }
  };

  const handleUpdateSessionResult = (sessionId: string, newResult: AnalysisResponse) => {
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, result: newResult } : s));
  };

  const handleDeleteSession = (sessionId: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
          setActiveSessionId(null);
      }
  };

  const handleLiveAnalysisCapture = (capturedResult: AnalysisResponse, capturedImageSrc: string) => {
    setIsLiveMode(false);
    const newSession: AnalysisSession = { id: `live-${Date.now()}`, fileName: 'AR_CAPTURE.jpg', imageSrc: capturedImageSrc, mimeType: 'image/jpeg', status: 'SUCCESS', result: capturedResult, mode: 'VECTOR_CONTROL' };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setIsGalleryExpanded(true);
  };

  const resetApp = async () => {
    setSessions([]);
    setActiveSessionId(null);
    await dbClear();
    setToastMsg({ msg: "Semua rekod dan simulasi telah dipadamkan sepenuhnya!", type: 'success' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleSaveManualSimulation = (originalImageBase64: string, simulatedImageBase64: string) => {
    const newSession: AnalysisSession = {
      id: `manual-sim-${Date.now()}`,
      fileName: `Manual_Sim_${new Date().toISOString().slice(0,10)}.jpg`,
      imageSrc: originalImageBase64,
      mimeType: 'image/jpeg',
      status: 'SUCCESS',
      simulationImage: simulatedImageBase64,
      mode: 'VECTOR_CONTROL',
      result: {
        risks: [],
        generalAdvice: "Simulasi Kebersihan Manual Berjaya Diselamatkan! Sila guna tab simulasi lepas/sejarah simulasi untuk banding semula data.",
        hygieneLevel: 1, 
        safetyLevel: 1,
      }
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleManualSimulation = () => {
    try {
      navigator.clipboard.writeText(MANUAL_SIMULATION_DEFAULT_PROMPT);
      setToastMsg({ msg: "Prompt disalin secara automatik! Membuka halaman simulasi khas & Gemini Web...", type: 'success' });
      window.open("https://gemini.google.com/app", "_blank");
      setCurrentView('MANUAL_SIMULATION');
    } catch (err) {
      console.error(err);
      setToastMsg({ msg: "Membuka halaman simulasi khas secara manual.", type: 'error' });
      setCurrentView('MANUAL_SIMULATION');
    }
  };

  const handleGoHome = () => { 
    setIsLiveMode(false); 
    setActiveSessionId(null); 
    setIsGalleryExpanded(true); 
    setCurrentHomeSubView('MENU');
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };
  
  const getActiveSession = () => sessions.find(s => s.id === activeSessionId);
  const completedCount = sessions.filter(s => s.status === 'SUCCESS').length;

  return (
    <div className="min-h-screen text-slate-200 relative selection:bg-emerald-500 selection:text-black font-sans flex flex-col overflow-x-hidden">
      <BioBackground />
      <AboutSystem isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <HeatmapModal isOpen={showHeatmap} onClose={() => setShowHeatmap(false)} />
      <GlobalMapModal isOpen={showGlobalMap} onClose={() => setShowGlobalMap(false)} />
      {showSimulationGallery && (
        <SimulationGallery 
          sessions={sessions} 
          onClose={() => setShowSimulationGallery(false)} 
          onDeleteSimulation={(sessionId) => {
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, simulationImage: undefined } : s));
          }}
          onRegenerate={async (sessionId) => {
            const sessionToRegen = sessions.find(s => s.id === sessionId);
            if (sessionToRegen && sessionToRegen.result) {
                setActiveSessionId(sessionId);
                setShowSimulationGallery(false);
            }
          }}
        />
      )}

      {emptyAlertType && (
          <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl p-8 max-w-md w-full text-center relative overflow-hidden">
                <button onClick={() => setEmptyAlertType(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-500 transition-colors z-20">✕</button>
                <div className="text-5xl mb-4">🗂️</div>
                <h2 className="text-xl font-sci-fi font-bold text-indigo-400 mb-2">TIADA {emptyAlertType === 'simulasi' ? 'SIMULASI' : 'IMBASAN'}</h2>
                <p className="text-slate-400 text-sm">
                   {emptyAlertType === 'simulasi' 
                      ? 'Tiada rekod simulasi lepas dijumpai. Sila muat naik atau tangkap imej, buat analisis, dan jana simulasi terlebih dahulu.' 
                      : 'Tiada rekod imbasan lepas dijumpai. Sila muat naik atau tangkap imej terlebih dahulu untuk memulakan sesi.'}
                </p>
                <button onClick={() => setEmptyAlertType(null)} className="mt-6 bg-slate-800 text-slate-300 px-6 py-2 rounded-lg font-bold hover:bg-slate-700 w-full tracking-widest uppercase">Tutup</button>
             </div>
          </div>
      )}

      {isLiveMode && <LiveCameraScanner onCaptureAnalysis={handleLiveAnalysisCapture} onClose={() => setIsLiveMode(false)} />}

      <Header 
         onOpenAbout={() => setShowAbout(true)} 
         onOpenSettings={() => setShowSettings(true)} 
         onGoHome={() => {
            setCurrentView('HOME');
            handleGoHome();
         }} 
         onGoLarvae={() => setCurrentView('LARVAE_DETECTION')}
         onGoAdult={() => setCurrentView('ADULT_MOSQUITO_DETECTION')}
         currentView={currentView}
      />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20 md:mt-32 relative z-10 w-full transition-all duration-300 pointer-events-auto">
        
        {currentView === 'LARVAE_DETECTION' ? (
            <LarvaeScanner />
        ) : currentView === 'ADULT_MOSQUITO_DETECTION' ? (
            <AdultMosquitoScanner />
        ) : currentView === 'MANUAL_SIMULATION' ? (
            <ManualSimulationPage 
                onBack={() => setCurrentView('HOME')} 
                onSaveSimulation={handleSaveManualSimulation} 
            />
        ) : (
            <>
                {!activeSessionId && (
                    <>
                        {currentHomeSubView === 'MENU' ? (
                            <div className="max-w-6xl mx-auto py-4 md:py-8">
                                <div className="mb-12 text-center animate-fade-in">
                                    <div className="inline-flex items-center gap-2 bg-emerald-950/50 border border-emerald-500/30 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-mono-sci text-emerald-400 mb-4 uppercase tracking-[0.2em] shadow-md shadow-emerald-900/10">
                                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                                        ANUGERAH INOVASI BIO-TEKNOLOGI 2026
                                    </div>
                                    <h2 className="text-3xl sm:text-5xl md:text-6xl font-sci-fi font-black tracking-wider text-white mb-4 drop-shadow-[0_0_20px_rgba(16,185,129,0.3)] leading-none uppercase">
                                        VECTOR<span className="text-emerald-500">GUARD</span><span className="text-slate-500 font-mono text-xl lowercase opacity-60">.ai</span>
                                    </h2>
                                    <p className="text-slate-400 max-w-2xl mx-auto text-xs sm:text-sm md:text-base font-light font-sans tracking-wide px-4 leading-relaxed">
                                        Platform bersepadu berlandaskan Kecerdasan Buatan (Gemini Pro) untuk pengecaman spesies nyamuk, kawalan jentik-jentik, simulasi sanitasi premis, ramalan wabak KKM, dan pencegahan jangkitan vektor.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16 animate-fade-in-up">
                                    {/* Card 1: Forensic AI Scanner */}
                                    <button 
                                        onClick={() => {
                                            setCurrentHomeSubView('FORENSIC');
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="group relative cursor-pointer text-left bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-6 rounded-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all">📸</div>
                                            <div className="inline-block bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full mb-2 tracking-wide uppercase font-mono-sci">TERAS GEMINI AI</div>
                                            <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors font-sci-fi tracking-wide mb-2">IMBASAN HABITAT & PREMIS</h3>
                                            <p className="text-xs text-slate-400 leading-relaxed">Imbas, sah, dan ukur risiko takungan air pembiakan nyamuk dlm premis dengan cadangan sanitasi Automatik berdasarkan piawaian KKM.</p>
                                        </div>
                                        <div className="mt-6 flex items-center justify-between text-[11px] font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                                            <span>Mula Analisis Lapangan</span>
                                            <span>→</span>
                                        </div>
                                    </button>

                                    {/* Card 2: Larvae Scanner */}
                                    <button 
                                        onClick={() => {
                                            setCurrentView('LARVAE_DETECTION');
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="group relative cursor-pointer text-left bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 p-6 rounded-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all">🐛</div>
                                            <div className="inline-block bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full mb-2 tracking-wide uppercase font-mono-sci">ROBOFLOW YOLOV8</div>
                                            <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors font-sci-fi tracking-wide mb-2">DETEKTIF JENTIK-JENTIK</h3>
                                            <p className="text-xs text-slate-400 leading-relaxed">Guna model visi komputer yang ditala khusus untuk mengesan, melabel, dan mengira bilangan larva Aedes dalam bekas tadahan.</p>
                                        </div>
                                        <div className="mt-6 flex items-center justify-between text-[11px] font-bold text-cyan-400 group-hover:translate-x-1 transition-transform">
                                            <span>Lancarkan Visi Komputer</span>
                                            <span>→</span>
                                        </div>
                                    </button>

                                    {/* Card 3: Adult Mosquito Scanner */}
                                    <button 
                                        onClick={() => {
                                            setCurrentView('ADULT_MOSQUITO_DETECTION');
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="group relative cursor-pointer text-left bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/50 p-6 rounded-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all">🦟</div>
                                            <div className="inline-block bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full mb-2 tracking-wide uppercase font-mono-sci">SIASATAN ENTIOMOLOGI</div>
                                            <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors font-sci-fi tracking-wide mb-2">ANALISIS NYAMUK DEWASA</h3>
                                            <p className="text-xs text-slate-400 leading-relaxed">Pengenalpastian morfologi sayap, abdomen, dan spesifikasi jantina vektor dewasa sama ada Aedes Albopictus atau Anopheles.</p>
                                        </div>
                                        <div className="mt-6 flex items-center justify-between text-[11px] font-bold text-purple-400 group-hover:translate-x-1 transition-transform">
                                            <span>Pengelasan Spesies</span>
                                            <span>→</span>
                                        </div>
                                    </button>

                                    {/* Card 4: National Outbreak Analytics */}
                                    <button 
                                        onClick={() => {
                                            setCurrentHomeSubView('ANALYTICS');
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="group relative cursor-pointer text-left bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-6 rounded-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all">📊</div>
                                            <div className="inline-block bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full mb-2 tracking-wide uppercase font-mono-sci">TELEMETRI KEBANGSAAN</div>
                                            <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors font-sci-fi tracking-wide mb-2">EPIDEMIOLOGY & RAMALAN</h3>
                                            <p className="text-xs text-slate-400 leading-relaxed">Tinjau grafik kumulatif kes kebangsaan, hotspot aktif, minggu epidemiologi, serta akses penuh peta risiko iDengue KKM 2026.</p>
                                        </div>
                                        <div className="mt-6 flex items-center justify-between text-[11px] font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                                            <span>Segerakkan Pangkalan Data</span>
                                            <span>→</span>
                                        </div>
                                    </button>

                                    {/* Card 5: Env Simulation Sandbox */}
                                    <button 
                                        onClick={handleManualSimulation}
                                        className="group relative cursor-pointer text-left bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-rose-500/50 p-6 rounded-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(244,63,94,0.15)] flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 group-hover:bg-rose-500/20 transition-all">✨</div>
                                            <div className="inline-block bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full mb-2 tracking-wide uppercase font-mono-sci">IMAGEN 3 SANDBOX</div>
                                            <h3 className="text-lg font-bold text-white group-hover:text-rose-400 transition-colors font-sci-fi tracking-wide mb-2">SIMULATOR REMEDIASI</h3>
                                            <p className="text-xs text-slate-400 leading-relaxed">Keupayaan menjana gambar simulasi landskap selepas diperbaiki dan dinyah kuman untuk pameran, bilik gerakan, atau laporan inovasi.</p>
                                        </div>
                                        <div className="mt-6 flex items-center justify-between text-[11px] font-bold text-rose-400 group-hover:translate-x-1 transition-transform">
                                            <span>Simulasi Arena</span>
                                            <span>→</span>
                                        </div>
                                    </button>
                                </div>
                                <div className="hidden md:block"><HUDOverlay /></div>
                            </div>
                        ) : currentHomeSubView === 'FORENSIC' ? (
                            <div className="animate-fade-in-up">
                                {/* Sub Header & Back Button */}
                                <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                                    <button 
                                        onClick={() => setCurrentHomeSubView('MENU')}
                                        className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 border border-emerald-800/80 hover:border-emerald-500 px-4 py-2.5 rounded-lg transition-colors font-mono-sci uppercase tracking-widest"
                                    >
                                        ← KEMBALI KE MEJA UTAMA
                                    </button>
                                    <div className="text-left sm:text-right">
                                        <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-mono-sci">MODUL SEKARANG</span>
                                        <span className="block text-sm font-bold text-white font-sci-fi uppercase tracking-wider">FORENSIK IMAGES & PENGESAN MULTIMODAL</span>
                                    </div>
                                </div>

                                <div className="mb-8 text-center pt-2">
                                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-sci-fi font-bold text-white mb-2 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)] leading-tight">{t('hero_title')} <span className="text-emerald-500">{t('hero_title_highlight')}</span></h2>
                                    <p className="text-slate-300 max-w-3xl mx-auto mb-6 text-xs sm:text-sm md:text-base font-light tracking-wide px-2">{t('hero_subtitle')}</p>
                                    
                                    <div className="max-w-4xl mx-auto mb-6 md:mb-10">
                                        <div className="mb-3 text-center text-emerald-500/50 text-[10px] md:text-xs font-mono-sci tracking-[0.2em] md:tracking-[0.3em]">{t('secure_link')}</div>
                                        <UploadZone onImagesSelected={handleFilesSelected} disabled={false} isAnalyzing={false} />
                                    </div>

                                    <div className="max-w-xl mx-auto mb-8 bg-slate-900/50 p-4 md:p-6 rounded-2xl border border-slate-700/50 shadow-2xl backdrop-blur-md relative z-10 pointer-events-auto">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1">
                                            {/* Mode Picker */}
                                            <div className="space-y-3 text-left">
                                                <label className="text-[10px] text-slate-400 font-mono-sci uppercase tracking-[0.2em] block">{t('inspection_mode')}</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button onClick={() => setAnalysisMode('VECTOR_CONTROL')} className={`text-[10px] md:text-xs font-bold py-3 rounded-lg transition-all flex flex-col items-center justify-center gap-1 border ${analysisMode === 'VECTOR_CONTROL' ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'}`}>
                                                        <span className="text-lg">🦟</span>
                                                        <span>{t('mode_vector')}</span>
                                                    </button>
                                                    <button onClick={() => setAnalysisMode('KKM_FOOD_STANDARD')} className={`text-[10px] md:text-xs font-bold py-3 rounded-lg transition-all flex flex-col items-center justify-center gap-1 border ${analysisMode === 'KKM_FOOD_STANDARD' ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'}`}>
                                                        <span className="text-lg">📋</span>
                                                        <span>{t('mode_kkm')}</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Sensitivity Picker */}
                                            <div className="space-y-3 text-left">
                                                <label className="text-[10px] text-slate-400 font-mono-sci uppercase tracking-[0.2em] block">{t('forensic_sensitivity')}</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {(['STANDARD', 'HIGH', 'EXTREME'] as SensitivityLevel[]).map((level) => (
                                                        <button 
                                                            key={level}
                                                            onClick={() => setSensitivity(level)}
                                                            className={`text-[9px] font-bold py-3 rounded-lg transition-all border flex items-center justify-center ${sensitivity === level ? 'bg-red-600 border-red-400 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)] animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'}`}
                                                        >
                                                            {level}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[9px] text-slate-500 mt-4 italic font-mono-sci leading-relaxed text-center">
                                            {t('extreme_mode_desc')}
                                        </p>
                                    </div>
                                    
                                    <div className="flex flex-col items-center justify-center gap-4 mb-4">
                                        <button onClick={() => setIsLiveMode(true)} className="group relative flex items-center gap-2 md:gap-3 bg-red-600/90 text-white px-5 py-3 md:px-10 md:py-5 rounded font-sci-fi font-bold text-sm md:text-lg shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:bg-red-500 hover:shadow-[0_0_40px_rgba(220,38,38,0.8)] transition-all overflow-hidden border border-red-400 active:scale-95">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-7 md:h-7"><path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" /><path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" /></svg>
                                            {t('btn_ar_scan')}
                                        </button>
                                        
                                        <div className="flex flex-wrap justify-center gap-3 w-full max-w-xl mt-2">
                                            {/* External Bypass Modal */}
                                            <button 
                                                onClick={() => setShowBypassModal(true)} 
                                                className="bg-slate-800 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-lg text-xs font-mono-sci font-bold hover:bg-emerald-950/40 hover:border-emerald-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                                            >
                                                <span>🧬</span> TAMPAL DATA LUARAN (BYPASS)
                                            </button>

                                            {/* Previous Simulations and Scans buttons */}
                                            <button onClick={() => {
                                                if (sessions.filter(s => s.simulationImage).length === 0) {
                                                    setEmptyAlertType('simulasi');
                                                    return;
                                                }
                                                setShowSimulationGallery(true);
                                            }} className="bg-slate-800/80 border border-cyan-500/30 text-cyan-400 px-4 py-2.5 rounded-lg text-xs font-mono-sci font-bold hover:bg-cyan-900/40 hover:border-cyan-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
                                                <span>✨</span> SEJARAH SIMULASI
                                            </button>

                                            <button onClick={() => {
                                                if (sessions.length === 0) {
                                                    setEmptyAlertType('imbasan');
                                                    return;
                                                }
                                                setIsGalleryExpanded(true);
                                                setTimeout(() => {
                                                    document.getElementById('evidence-board')?.scrollIntoView({ behavior: 'smooth' });
                                                }, 100);
                                            }} className="bg-slate-800/80 border border-indigo-500/30 text-indigo-400 px-4 py-2.5 rounded-lg text-xs font-mono-sci font-bold hover:bg-indigo-900/40 hover:border-indigo-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(99,102,241,0.15)]">
                                                <span>🗂️</span> SEJARAH IMBASAN
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-fade-in-up">
                                {/* Sub Header & Back Button */}
                                <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                                    <button 
                                        onClick={() => setCurrentHomeSubView('MENU')}
                                        className="flex items-center gap-2 text-xs font-bold text-amber-500 hover:text-amber-400 bg-amber-950/40 border border-amber-900 px-4 py-2.5 rounded-lg transition-colors font-mono-sci uppercase tracking-widest"
                                    >
                                        ← KEMBALI KE MEJA UTAMA
                                    </button>
                                    <div className="text-left sm:text-right">
                                        <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-mono-sci">MODUL SEKARANG</span>
                                        <span className="block text-sm font-bold text-white font-sci-fi uppercase tracking-wider">TELEMETRI DATA & ANALIS EPIDEMIOLOGI</span>
                                    </div>
                                </div>

                                <div className="max-w-6xl mx-auto">
                                    <div className="mb-8 text-center pt-2">
                                        <h2 className="text-2xl sm:text-4xl md:text-5xl font-sci-fi font-bold text-white mb-2 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)] leading-tight uppercase">DASHBOARD AMARAN AWAL</h2>
                                        <p className="text-slate-400 max-w-2xl mx-auto text-xs sm:text-sm md:text-base leading-relaxed px-4">
                                            Analisis interaktif berasaskan ramalan data iDengue KKM kebangsaaan. Pilih zon kawalan wabak dan peta taburan wilayah untuk unjuran ramalan zon berbahaya.
                                        </p>
                                    </div>

                                    {/* Outbreak Map button repositioned to the bottom */}
                                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-8 justify-center items-center">
                                        <button onClick={() => setShowHeatmap(true)} className="w-full sm:w-64 bg-slate-900/90 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)] text-emerald-400 px-6 py-4 rounded-xl font-bold font-sci-fi tracking-widest text-xs hover:bg-emerald-900/30 hover:border-emerald-400 transition-all flex items-center justify-center gap-3 active:scale-95">
                                            <span>🗺️ PETA STRATEGIK WABAK (KKM)</span>
                                        </button>
                                        <button onClick={() => setShowGlobalMap(true)} className="w-full sm:w-64 bg-slate-900/90 border border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)] text-blue-400 px-6 py-4 rounded-xl font-bold font-sci-fi tracking-widest text-xs hover:bg-blue-900/30 hover:border-blue-400 transition-all flex items-center justify-center gap-3 active:scale-95">
                                            <span>🌍 PETA TABURAN GLOBAL (WHO)</span>
                                        </button>
                                    </div>

                                    <div className="mt-4">
                                        {/* Pass lifted stats to PredictionChart */}
                                        <PredictionChart 
                                            preloadedNational={nationalStats} 
                                            preloadedRegional={regionalStats} 
                                            isLoading={isStatsLoading}
                                            onSync={loadDengueData}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </>
        )}

        {sessions.length > 0 && (
           <div id="evidence-board" className="space-y-4 md:space-y-6 mt-8 mb-8 z-50">
              <div className="bg-slate-900/80 border border-slate-700 rounded-lg backdrop-blur-md overflow-hidden animate-fade-in-up shadow-xl transition-all duration-300">
                 <div className="flex justify-between items-center bg-slate-950/50 p-3 md:p-4 cursor-pointer group/header select-none border-b border-slate-800 hover:bg-slate-900 transition-colors" onClick={() => setIsGalleryExpanded(!isGalleryExpanded)}>
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className={`transition-transform duration-300 text-emerald-500 ${isGalleryExpanded ? 'rotate-180' : 'rotate-0'}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 md:w-4 md:h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg></div>
                        <h3 className="font-sci-fi font-bold text-white flex items-center gap-2 text-xs md:text-base">{t('evidence_board')} <span className="text-slate-500 text-[10px] md:text-sm">[{completedCount} DONE]</span></h3>
                    </div>
                    <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                       <button onClick={() => document.getElementById('add-more-input')?.click()} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded border border-slate-600 font-mono-sci flex items-center gap-1"><span>+</span> <span className="hidden sm:inline">{t('btn_add')}</span></button>
                       <input id="add-more-input" type="file" multiple accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFilesSelected(Array.from(e.target.files))} />
                       {!showPurgeConfirm ? (
                          <button 
                             onClick={() => setShowPurgeConfirm(true)} 
                             className="text-[10px] bg-red-950/85 hover:bg-red-900 text-red-400 px-3 py-1.5 rounded border border-red-900 hover:border-red-600 font-mono-sci transition-colors flex items-center gap-1"
                             title="Padam (Purge) Semua Rekod Sejarah"
                          >
                             ☣️ PURGE ALL
                          </button>
                       ) : (
                          <div className="flex gap-1 animate-pulse items-center">
                             <button 
                                onClick={() => {
                                   setShowPurgeConfirm(false);
                                   resetApp();
                                }} 
                                className="text-[10px] bg-red-600 hover:bg-red-500 text-white font-bold px-2 py-1 rounded border border-red-400 whitespace-nowrap"
                             >
                                YA, GANTIKAN SEMUA!
                             </button>
                             <button 
                                onClick={() => setShowPurgeConfirm(false)} 
                                className="text-[10px] bg-slate-850 hover:bg-slate-750 text-slate-300 px-2 py-1 rounded border border-slate-600"
                             >
                                X
                             </button>
                          </div>
                       )}
                    </div>
                 </div>
                 <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isGalleryExpanded ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-3 md:p-4 flex gap-2 md:gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x">
                        <button onClick={() => document.getElementById('add-more-input')?.click()} className="flex-shrink-0 w-16 h-16 md:w-28 md:h-28 rounded-lg border-2 border-dashed border-slate-700 hover:border-emerald-500/50 flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-emerald-500 transition bg-slate-900/50"><span className="text-xl">+</span></button>
                        {sessions.map((session, idx) => (
                        <div key={session.id} className="relative flex-shrink-0 w-16 h-16 md:w-28 md:h-28 snap-center group">
                          <button onClick={() => { setActiveSessionId(session.id); setIsGalleryExpanded(false); }} className={`relative w-full h-full rounded-lg overflow-hidden border-2 transition-all duration-300 ${activeSessionId === session.id ? 'border-emerald-400 scale-105 shadow-[0_0_15px_rgba(52,211,153,0.5)] z-10' : 'border-slate-700 opacity-70 hover:opacity-100 hover:border-slate-500'}`}>
                              <img src={session.imageSrc} className="w-full h-full object-cover" alt="thumbnail" />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                  {session.status === 'PENDING' && <span className="text-[8px] font-mono-sci text-slate-300 bg-black/60 px-1 rounded backdrop-blur-sm">Q</span>}
                                  {session.status === 'ANALYZING' && (<div className="absolute inset-0 bg-emerald-900/80 flex flex-col items-center justify-center backdrop-blur-[2px]"><div className="w-4 h-4 md:w-6 md:h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-1"></div></div>)}
                                  {session.status === 'SUCCESS' && (<div className="absolute top-1 right-1"><div className="w-3 h-3 md:w-4 md:h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-2 h-2 md:w-3 md:h-3 text-black font-bold"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" /></svg></div></div>)}
                                  {session.status === 'ERROR' && (<div className="absolute inset-0 bg-red-900/80 flex items-center justify-center"><span className="text-sm">⚠️</span></div>)}
                              </div>
                              {session.simulationImage && (
                                   <div className="absolute bottom-1 left-1 bg-cyan-900/80 text-[10px] border border-cyan-400 p-0.5 rounded shadow-lg backdrop-blur-sm z-20 tooltip tooltip-right hover:scale-110 transition-transform" data-tip="Simulasi Tersedia">✨</div>
                              )}
                          </button>
                          <button onClick={(e) => handleDeleteSession(session.id, e)} className="absolute -top-2 -right-2 bg-red-600/90 text-white w-5 h-5 md:w-6 md:h-6 rounded-full z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity print:hidden shadow-lg border border-red-400 hover:bg-red-500 hover:scale-110">✖</button>
                        </div>
                        ))}
                    </div>
                 </div>
              </div>

              {activeSessionId && getActiveSession() ? (
                 <div className="animate-fade-in">
                    {getActiveSession()!.status === 'PENDING' && (
                       <div className="bg-slate-900/50 border border-slate-700 p-8 md:p-12 rounded-lg text-center min-h-[300px] flex flex-col items-center justify-center">
                          <div className="w-10 h-10 md:w-12 md:h-12 border-2 border-dashed border-slate-600 rounded-full animate-spin-slow mb-4"></div>
                          <p className="text-slate-400 font-mono-sci tracking-widest text-xs md:text-sm">{t('waiting_queue')}</p>
                       </div>
                    )}
                    {getActiveSession()!.status === 'ANALYZING' && (
                       <div className="bg-emerald-950/20 border border-emerald-500/50 p-8 md:p-12 rounded-lg text-center min-h-[300px] flex flex-col items-center justify-center">
                          <div className="w-12 h-12 border-4 border-dashed border-emerald-500 rounded-full animate-spin mb-4"></div>
                          <p className="text-emerald-400 font-mono-sci tracking-widest text-sm animate-pulse">{t('processing_target')}</p>
                       </div>
                    )}
                    {getActiveSession()!.status === 'ERROR' && (
                       <div className="bg-red-950/20 border border-red-500/50 p-6 md:p-10 rounded-xl text-center min-h-[300px] flex flex-col items-center justify-center max-w-lg mx-auto">
                          <div className="text-4xl mb-3">⚠️</div>
                          <h4 className="text-lg font-sci-fi font-bold text-red-200 mb-2">ANALISIS TERGANGGU / HAD KUOTA</h4>
                          <p className="text-xs text-slate-400 font-mono-sci mb-6">
                             Sistem mengesan ralat sambungan atau had kuota API pelayan telah tamat. Jangan risau! Anda boleh memintas had ini dengan menggunakan Mod Pengesanan Luaran secara percuma di Google AI Studio atau LMSYS.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3 w-full">
                             <button onClick={() => triggerAnalysis(activeSessionId!)} className="flex-1 bg-red-900 border border-red-500 text-red-200 px-6 py-3 rounded-lg font-bold hover:bg-red-800 text-xs uppercase tracking-widest transition-all">
                                {t('btn_retry')}
                             </button>
                             <button onClick={() => setShowBypassModal(true)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                <span>🧬</span> TAMPAL JSON LUARAN
                             </button>
                          </div>
                       </div>
                    )}
                    {getActiveSession()!.status === 'SUCCESS' && getActiveSession()!.result && (
                       <div key={getActiveSession()!.id} className="animate-fade-in-up">
                          <AnalysisResults 
                             result={getActiveSession()!.result!} 
                             imageSrc={getActiveSession()!.imageSrc} 
                             savedSimulationImage={getActiveSession()!.simulationImage} 
                             onSaveSimulation={(img) => handleSimulationSave(activeSessionId!, img)}
                             allSessions={sessions}
                             onUpdateResult={(newResult) => handleUpdateSessionResult(activeSessionId!, newResult)}
                             onDeleteSession={() => {
                               if (activeSessionId) {
                                 handleDeleteSession(activeSessionId);
                               }
                             }}
                          />
                       </div>
                    )}
                 </div>
              ) : null}
           </div>
        )}
      </main>
      <Footer onOpenAbout={() => setShowAbout(true)} />
      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
      
      <ManualJsonBypassPanel 
        isOpen={showBypassModal}
        onClose={() => setShowBypassModal(false)}
        activeImageSrc={activeSessionId ? getActiveSession()?.imageSrc : undefined}
        activeMode={analysisMode}
        onApplyJson={handleApplyExternalJson}
      />
    </div>
  );
};

export default App;

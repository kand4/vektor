import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import UploadZone from './components/UploadZone';
import { AnalysisResults } from './components/AnalysisResults';
import LiveCameraScanner from './components/LiveCameraScanner';
import BioBackground from './components/BioBackground';
import HUDOverlay from './components/HUDOverlay';
import AboutSystem from './components/AboutSystem';
import SettingsModal from './components/SettingsModal';
import { analyzeLandscape, fetchLatestIDengueStats, fetchRegionalDengueStats } from './services/geminiService';
import { getGlobalOutbreaks } from './services/outbreakService';
import LarvaeScanner from './components/LarvaeScanner';
import AdultMosquitoScanner from './components/AdultMosquitoScanner';
import { AnalysisResponse, AnalysisSession, OutbreakAlert, SensitivityLevel, AnalysisMode, iDengueData, RegionalDengueData } from './types';
import { useLanguage } from './contexts/LanguageContext';
import { PredictionChart } from './components/PredictionChart';

const MAX_CONCURRENT_ANALYSIS = 3;

const LoadingDisplay: React.FC<{mode: AnalysisMode}> = ({mode}) => {
  const { t } = useLanguage();
  const [progress, setProgress] = useState(0);
  const [logText, setLogText] = useState(t('log_initializing'));
  
  useEffect(() => {
    // UPDATED PROGRESS LOGIC:
    // Moves quickly to 20%, then slowly crawls to 90%, then waits.
    // This prevents the "stuck at 16%" feeling while accommodating the long processing time.
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98) return 98; // Hold at 98 until complete
        
        let increment = 0;
        
        if (prev < 20) {
            increment = 2; // Fast start
        } else if (prev < 50) {
            increment = 0.5; // Deep thinking phase
        } else if (prev < 80) {
            increment = 0.2; // Complex reasoning
        } else {
            increment = 0.05; // Final touches
        }
        
        // Random jitter to look alive
        if (Math.random() > 0.5) increment += 0.1;
        
        return Math.min(prev + increment, 98);
      });
    }, 150); // Tick every 150ms

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
      if (mode === 'KKM_FOOD_STANDARD') {
          if (progress < 15) setLogText(t('log_initializing'));
          else if (progress < 30) setLogText(t('log_deep_thinking'));
          else if (progress < 50) setLogText(t('log_grid_search'));
          else if (progress < 70) setLogText(t('log_law_ref'));
          else if (progress < 90) setLogText(t('log_calculating'));
          else setLogText(t('log_finalizing'));
      } else {
          if (progress < 15) setLogText(t('log_initializing'));
          else if (progress < 30) setLogText(t('log_deep_thinking'));
          else if (progress < 50) setLogText(t('log_clutter'));
          else if (progress < 70) setLogText(t('log_vector'));
          else if (progress < 90) setLogText(t('log_pathogen'));
          else setLogText(t('log_generating'));
      }
  }, [progress, mode]);

  return (
    <div className="bg-slate-900/90 border border-emerald-500/30 p-8 md:p-12 rounded-xl text-center min-h-[450px] flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center mb-10 scale-90 md:scale-100 transition-transform">
         <div className="absolute inset-0 rounded-full border border-slate-700 border-t-emerald-500 border-b-emerald-900 opacity-60 animate-[spin_4s_linear_infinite]"></div>
         <div className="absolute inset-0 m-auto w-40 h-40 rounded-full border border-emerald-400/30 shadow-[0_0_40px_rgba(16,185,129,0.2)] animate-pulse bg-emerald-900/10"></div>
         <div className="relative z-10 flex flex-col items-center justify-center bg-slate-950/90 w-36 h-36 rounded-full border border-slate-600 shadow-inner">
             <div className="text-4xl md:text-5xl font-mono-sci font-bold text-white tabular-nums tracking-tighter">{Math.floor(progress)}<span className="text-lg text-emerald-500">%</span></div>
             <div className="text-[10px] text-cyan-400 font-bold tracking-[0.2em] mt-2 animate-pulse">PRO ANALYSIS</div>
         </div>
      </div>
      <div className="relative z-10 max-w-lg w-full space-y-5 px-4">
          <h3 className="text-lg md:text-xl font-sci-fi text-emerald-300 tracking-wider font-bold animate-pulse uppercase drop-shadow-md">{logText}</h3>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-600 relative shadow-lg">
              <div className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-cyan-500 shadow-[0_0_20px_#10b981] relative overflow-hidden transition-all duration-200" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-[10px] font-mono-sci text-slate-500 uppercase tracking-widest">{t('processing_time_info')}</p>
      </div>
    </div>
  );
};

const HeatmapModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
    const [selectedAlert, setSelectedAlert] = useState<OutbreakAlert | null>(null);
    const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');
    const alerts = getGlobalOutbreaks();
    const filteredAlerts = filter === 'ALL' ? alerts : alerts.filter(a => a.severity === filter);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-0 md:p-4 overflow-hidden">
             <div className="bg-slate-950 border border-slate-800 w-full max-w-7xl h-full md:h-[90vh] md:rounded-2xl flex flex-col relative overflow-hidden shadow-2xl">
                 <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
                     <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>
                        <h3 className="font-sci-fi text-white text-lg tracking-widest uppercase">{t('bio_intelligence')} <span className="text-slate-500 text-sm">| {t('cdc_who_stream')}</span></h3>
                     </div>
                     <button onClick={onClose} className="bg-slate-800 p-2 rounded hover:bg-red-600 transition text-white">✕ ESC</button>
                 </div>
                 <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                     <div className="flex-1 relative bg-[#050b14] overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800 order-2 lg:order-1">
                         <div className="absolute inset-0 opacity-40 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center grayscale contrast-125"></div>
                         <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                         {filteredAlerts.map(alert => (
                             <button
                                key={alert.id}
                                onClick={() => setSelectedAlert(alert)}
                                className={`absolute transform -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 focus:outline-none z-10`}
                                style={{ left: `${alert.coordinates.x}%`, top: `${alert.coordinates.y}%` }}
                             >
                                 <div className={`relative flex items-center justify-center ${selectedAlert?.id === alert.id ? 'scale-150 z-50' : 'scale-100 hover:scale-125'}`}>
                                     <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full ${alert.severity === 'CRITICAL' ? 'bg-red-500 shadow-[0_0_20px_red]' : alert.severity === 'HIGH' ? 'bg-orange-500 shadow-[0_0_15px_orange]' : 'bg-emerald-500 shadow-[0_0_10px_emerald]'} animate-pulse`}></div>
                                     <div className={`absolute w-8 h-8 md:w-12 md:h-12 rounded-full border ${alert.severity === 'CRITICAL' ? 'border-red-500/50' : 'border-emerald-500/50'} animate-ping opacity-20`}></div>
                                     <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/80 border border-slate-700 px-2 py-1 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                         {alert.disease}
                                     </div>
                                 </div>
                             </button>
                         ))}
                         <div className="absolute bottom-4 left-4 p-3 bg-slate-900/80 border border-slate-700 rounded text-[10px] font-mono-sci text-slate-400">
                             <div>{'>'} {t('source_aggregate')}</div>
                             <div>{'>'} {t('map_latency')}</div>
                             <div>{'>'} {t('active_threats')}: {alerts.length}</div>
                         </div>
                     </div>
                     <div className="w-full lg:w-[400px] bg-slate-950 flex flex-col order-1 lg:order-2">
                         <div className="p-3 border-b border-slate-800 flex gap-2">
                             {(['ALL', 'CRITICAL', 'HIGH'] as const).map(f => (
                                 <button 
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`flex-1 py-2 text-[10px] font-bold rounded font-mono-sci transition-colors ${filter === f ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/50' : 'bg-slate-900 text-slate-500 border border-slate-800 hover:bg-slate-800'}`}
                                 >
                                     {f}
                                 </button>
                             ))}
                         </div>
                         <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                             {filteredAlerts.map(alert => (
                                 <div 
                                    key={alert.id}
                                    onClick={() => setSelectedAlert(alert)}
                                    className={`p-4 rounded border cursor-pointer transition-all ${selectedAlert?.id === alert.id ? 'bg-slate-800 border-emerald-500 shadow-lg' : 'bg-slate-900/50 border-slate-800 hover:border-slate-600 hover:bg-slate-800'}`}
                                 >
                                     <div className="flex justify-between items-start mb-2">
                                         <h4 className={`font-bold text-sm ${alert.severity === 'CRITICAL' ? 'text-red-400' : alert.severity === 'HIGH' ? 'text-orange-400' : 'text-emerald-400'}`}>{alert.disease}</h4>
                                         <span className="text-[9px] bg-black px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">{alert.source}</span>
                                     </div>
                                     <div className="text-xs text-slate-300 mb-1 font-mono-sci">📍 {alert.location}</div>
                                     <div className="text-[10px] text-slate-500 mb-2">{alert.cases} {t('cases_reported')}</div>
                                     {selectedAlert?.id === alert.id && (
                                         <div className="mt-2 pt-2 border-t border-slate-700/50 animate-fade-in">
                                             <p className="text-xs text-slate-400 italic mb-2 leading-relaxed">"{alert.description}"</p>
                                             <div className="flex items-center gap-2 text-[10px] font-mono-sci text-red-400">
                                                 <span>{t('vector_label')}: {alert.vector}</span>
                                             </div>
                                         </div>
                                     )}
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>
             </div>
        </div>
    )
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'HOME' | 'LARVAE_DETECTION' | 'ADULT_MOSQUITO_DETECTION'>('HOME');
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isGalleryExpanded, setIsGalleryExpanded] = useState(true);
  
  const [sensitivity, setSensitivity] = useState<SensitivityLevel>('STANDARD');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('VECTOR_CONTROL');

  // iDengue Persistent Stats
  const [nationalStats, setNationalStats] = useState<iDengueData | null>(null);
  const [regionalStats, setRegionalStats] = useState<RegionalDengueData | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  
  const { language, t } = useLanguage();

  // Fetch stats once on Mount
  useEffect(() => {
    const loadDengueData = async () => {
        try {
            // Updated to handle potential failures silently using the new robust service
            const [national, regional] = await Promise.all([
                fetchLatestIDengueStats(),
                fetchRegionalDengueStats("Pahang", "Temerloh")
            ]);
            setNationalStats(national);
            setRegionalStats(regional);
        } catch (e) {
            console.error("Critical: Failed to sync iDengue data even with fallback", e);
        } finally {
            setIsStatsLoading(false);
        }
    };
    loadDengueData();
  }, []);

  const readFile = (file: File): Promise<{ base64: string, mimeType: string, preview: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve({ base64: result.split(',')[1], mimeType: result.split(';')[0].split(':')[1], preview: result });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFilesSelected = async (files: File[]) => {
    const newSessions: AnalysisSession[] = [];
    for (const file of files) {
       const { base64, mimeType, preview } = await readFile(file);
       newSessions.push({ id: `session-${Date.now()}-${Math.random()}`, fileName: file.name, imageSrc: preview, mimeType: mimeType, status: 'PENDING', mode: analysisMode });
    }
    setSessions(prev => [...prev, ...newSessions]);
    if (!activeSessionId && newSessions.length > 0) setActiveSessionId(newSessions[0].id);
    setIsGalleryExpanded(true);
  };

  useEffect(() => {
    const processNext = async () => {
        const analyzingCount = sessions.filter(s => s.status === 'ANALYZING').length;
        if (analyzingCount < MAX_CONCURRENT_ANALYSIS) {
            const pendingSession = sessions.find(s => s.status === 'PENDING');
            if (pendingSession) {
                await new Promise(resolve => setTimeout(resolve, 500));
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

  const handleUpdateSessionResult = (sessionId: string, newResult: AnalysisResponse) => {
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, result: newResult } : s));
  };

  const handleLiveAnalysisCapture = (capturedResult: AnalysisResponse, capturedImageSrc: string) => {
    setIsLiveMode(false);
    const newSession: AnalysisSession = { id: `live-${Date.now()}`, fileName: 'AR_CAPTURE.jpg', imageSrc: capturedImageSrc, mimeType: 'image/jpeg', status: 'SUCCESS', result: capturedResult, mode: 'VECTOR_CONTROL' };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setIsGalleryExpanded(true);
  };

  const resetApp = () => { setSessions([]); setActiveSessionId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleGoHome = () => { 
    setIsLiveMode(false); 
    setActiveSessionId(null); 
    setIsGalleryExpanded(true); 
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

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20 md:mt-32 relative z-10 w-full transition-all duration-300">
        
        {currentView === 'LARVAE_DETECTION' ? (
            <LarvaeScanner />
        ) : currentView === 'ADULT_MOSQUITO_DETECTION' ? (
            <AdultMosquitoScanner />
        ) : (
            <>
                {!activeSessionId && (
                    <div className="mb-10 md:mb-14 text-center pt-4 md:pt-8 animate-fade-in-up">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-sci-fi font-bold text-white mb-3 md:mb-6 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)] leading-tight">{t('hero_title')} <span className="text-emerald-500">{t('hero_title_highlight')}</span></h2>
            <p className="text-slate-300 max-w-3xl mx-auto mb-6 md:mb-10 font-light tracking-wide text-xs sm:text-sm md:text-xl px-2">{t('hero_subtitle')}</p>
            
            <div className="flex flex-col items-center justify-center gap-4 mb-6 md:mb-12">
                <button onClick={() => setIsLiveMode(true)} className="group relative flex items-center gap-2 md:gap-3 bg-red-600/90 text-white px-5 py-3 md:px-10 md:py-5 rounded font-sci-fi font-bold text-sm md:text-lg shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:bg-red-500 hover:shadow-[0_0_40px_rgba(220,38,38,0.8)] transition-all overflow-hidden border border-red-400 active:scale-95">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-7 md:h-7"><path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" /><path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" /></svg>
                    {t('btn_ar_scan')}
                </button>
                <div className="flex justify-center gap-3 w-full max-w-sm">
                     <button
                       onClick={() => setCurrentView('LARVAE_DETECTION')}
                       className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 border border-cyan-500/50 rounded font-sci-fi text-xs tracking-wider transition-colors bg-cyan-900/20 hover:bg-cyan-900/40 text-cyan-400`}
                     >
                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shrink-0"></div>
                        {t('nav_larvae_scanner')}
                     </button>
                     <button
                       onClick={() => setCurrentView('ADULT_MOSQUITO_DETECTION')}
                       className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 border border-purple-500/50 rounded font-sci-fi text-xs tracking-wider transition-colors bg-purple-900/20 hover:bg-purple-900/40 text-purple-400`}
                     >
                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shrink-0"></div>
                        {t('nav_adult_scanner')}
                     </button>
                </div>
            </div>
            
            <div className="max-w-xl mx-auto mb-8 bg-slate-900/50 p-4 md:p-6 rounded-2xl border border-slate-700/50 shadow-2xl backdrop-blur-md">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Mode Picker */}
                  <div className="space-y-3">
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
                  <div className="space-y-3">
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
            
            <div className="max-w-4xl mx-auto">
                <div className="mb-3 text-center text-emerald-500/50 text-[10px] md:text-xs font-mono-sci tracking-[0.2em] md:tracking-[0.3em]">{t('secure_link')}</div>
                <UploadZone onImagesSelected={handleFilesSelected} disabled={false} isAnalyzing={false} />
                
                <div className="mt-8 flex justify-center animate-fade-in-up">
                    <button onClick={() => setShowHeatmap(true)} className="bg-slate-800 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] text-emerald-400 px-6 py-3 rounded-xl font-bold hover:bg-emerald-900/30 hover:border-emerald-400 transition-all flex items-center gap-3">
                        <span className="font-sci-fi tracking-widest text-sm">{t('btn_outbreak_map')}</span>
                    </button>
                </div>

                <div className="mt-8">
                    {/* Pass lifted stats to PredictionChart */}
                    <PredictionChart 
                        preloadedNational={nationalStats} 
                        preloadedRegional={regionalStats} 
                        isLoading={isStatsLoading}
                    />
                </div>
                <div className="hidden md:block"><HUDOverlay /></div>
            </div>
            </div>
        )}

        {sessions.length > 0 && (
           <div className="space-y-4 md:space-y-6">
              <div className="bg-slate-900/80 border border-slate-700 rounded-lg backdrop-blur-md overflow-hidden animate-fade-in-up shadow-xl transition-all duration-300">
                 <div className="flex justify-between items-center bg-slate-950/50 p-3 md:p-4 cursor-pointer group/header select-none border-b border-slate-800 hover:bg-slate-900 transition-colors" onClick={() => setIsGalleryExpanded(!isGalleryExpanded)}>
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className={`transition-transform duration-300 text-emerald-500 ${isGalleryExpanded ? 'rotate-180' : 'rotate-0'}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3 md:w-4 md:h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg></div>
                        <h3 className="font-sci-fi font-bold text-white flex items-center gap-2 text-xs md:text-base">{t('evidence_board')} <span className="text-slate-500 text-[10px] md:text-sm">[{completedCount} DONE]</span></h3>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                       <button onClick={() => document.getElementById('add-more-input')?.click()} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded border border-slate-600 font-mono-sci flex items-center gap-1"><span>+</span> <span className="hidden sm:inline">{t('btn_add')}</span></button>
                       <input id="add-more-input" type="file" multiple accept="image/*" className="hidden" onChange={(e) => e.target.files && handleFilesSelected(Array.from(e.target.files))} />
                       <button onClick={resetApp} className="text-[10px] bg-red-900/50 hover:bg-red-800 text-red-200 px-3 py-1 rounded border border-red-800 font-mono-sci">{t('btn_clear')}</button>
                    </div>
                 </div>
                 <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isGalleryExpanded ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-3 md:p-4 flex gap-2 md:gap-3 overflow-x-auto pb-4 custom-scrollbar snap-x">
                        <button onClick={() => document.getElementById('add-more-input')?.click()} className="flex-shrink-0 w-16 h-16 md:w-28 md:h-28 rounded-lg border-2 border-dashed border-slate-700 hover:border-emerald-500/50 flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-emerald-500 transition bg-slate-900/50"><span className="text-xl">+</span></button>
                        {sessions.map((session, idx) => (
                        <button key={session.id} onClick={() => { setActiveSessionId(session.id); setIsGalleryExpanded(false); }} className={`relative flex-shrink-0 w-16 h-16 md:w-28 md:h-28 rounded-lg overflow-hidden border-2 transition-all duration-300 snap-center group ${activeSessionId === session.id ? 'border-emerald-400 scale-105 shadow-[0_0_15px_rgba(52,211,153,0.5)] z-10' : 'border-slate-700 opacity-70 hover:opacity-100 hover:border-slate-500'}`}>
                            <img src={session.imageSrc} className="w-full h-full object-cover" alt="thumbnail" />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                {session.status === 'PENDING' && <span className="text-[8px] font-mono-sci text-slate-300 bg-black/60 px-1 rounded backdrop-blur-sm">Q</span>}
                                {session.status === 'ANALYZING' && (<div className="absolute inset-0 bg-emerald-900/80 flex flex-col items-center justify-center backdrop-blur-[2px]"><div className="w-4 h-4 md:w-6 md:h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-1"></div></div>)}
                                {session.status === 'SUCCESS' && (<div className="absolute top-1 right-1"><div className="w-3 h-3 md:w-4 md:h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-2 h-2 md:w-3 md:h-3 text-black font-bold"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" /></svg></div></div>)}
                                {session.status === 'ERROR' && (<div className="absolute inset-0 bg-red-900/80 flex items-center justify-center"><span className="text-sm">⚠️</span></div>)}
                            </div>
                        </button>
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
                    {getActiveSession()!.status === 'ANALYZING' && <LoadingDisplay mode={getActiveSession()!.mode || 'VECTOR_CONTROL'} />}
                    {getActiveSession()!.status === 'ERROR' && (
                       <div className="bg-red-950/20 border border-red-500/50 p-8 md:p-12 rounded-lg text-center min-h-[300px] flex flex-col items-center justify-center">
                          <div className="text-4xl mb-4">🚫</div>
                          <button onClick={() => triggerAnalysis(activeSessionId!)} className="bg-red-800 text-white px-6 py-2 rounded font-bold hover:bg-red-700 text-xs md:text-sm">{t('btn_retry')}</button>
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
                          />
                       </div>
                    )}
                 </div>
              ) : null}
           </div>
        )}
            </>
        )}
      </main>
      <Footer onOpenAbout={() => setShowAbout(true)} />
    </div>
  );
};

export default App;
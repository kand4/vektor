import React, { useRef, useState, useEffect } from 'react';
import { analyzeLandscape } from '../services/geminiService';
import { AnalysisMode, AnalysisResponse, RiskDetection } from '../types';
import { Toast } from './Toast';
import { useLanguage } from '../contexts/LanguageContext';

interface LiveCameraScannerProps {
  onCaptureAnalysis: (result: AnalysisResponse, imageSrc: string) => void;
  onClose: () => void;
}

const LiveCameraScanner: React.FC<LiveCameraScannerProps> = ({ onCaptureAnalysis, onClose }) => {
  const { t, language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasScannedOnce, setHasScannedOnce] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('VECTOR_CONTROL');
  const [liveRisks, setLiveRisks] = useState<RiskDetection[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastCapturedImage, setLastCapturedImage] = useState<string | null>(null);
  const [currentHygieneLevel, setCurrentHygieneLevel] = useState<number>(3);
  const [currentSafetyLevel, setCurrentSafetyLevel] = useState<number>(3); 
  const [currentGeneralAdvice, setCurrentGeneralAdvice] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<{msg: string, type: 'error' | 'success'} | null>(null);

  // Start Camera on Mount
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment', // Use back camera on mobile
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Play only after metadata is loaded to avoid blank screens
          videoRef.current.onloadedmetadata = () => {
             videoRef.current?.play().catch(e => console.error("Play error:", e));
             setIsStreaming(true);
          };
        }
      } catch (err) {
        console.error("Camera Error:", err);
        setCameraError(t('camera_error'));
      }
    };

    startCamera();

    return () => {
      // STRICT CLEANUP: Stop all tracks to turn off camera hardware light
      if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
        });
      }
      if (videoRef.current) {
          videoRef.current.srcObject = null;
      }
    };
  }, []);

  // Continuous Analysis Loop for Live AR (Uses FAST model)
  const handleCaptureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    setIsAnalyzing(true);
    setLiveRisks([]); // Clear old boxes while thinking

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Match canvas size to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current frame to canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to Base64
        const base64Image = canvas.toDataURL('image/jpeg', 0.8);
        setLastCapturedImage(base64Image);
        const base64Data = base64Image.split(',')[1];
        
        // Analyze using 'FAST' mode for low latency while preserving user mode & language
        const result = await analyzeLandscape(base64Data, 'image/jpeg', 'FAST', language, 'STANDARD', analysisMode);
        
        // Update AR Overlay
        setLiveRisks(result.risks);
        setCurrentHygieneLevel(result.hygieneLevel);
        setCurrentSafetyLevel(result.safetyLevel || result.hygieneLevel);
        setCurrentGeneralAdvice(result.generalAdvice || '');
        setHasScannedOnce(true);
      }
    } catch (error) {
      console.error("Analysis Failed:", error);
      setToastMsg({ msg: t('ar_analysis_failed'), type: 'error' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Click handler for AR Boxes
  const handleRiskClick = (risk: RiskDetection) => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // Prevent multiple clicks
    setIsAnalyzing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
       // Capture the exact moment user clicked
       ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
       const base64Image = canvas.toDataURL('image/jpeg', 0.95);

       // Reorder risks to ensure the clicked one is prioritized/selected in the next view
       const sortedRisks = [
           risk,
           ...liveRisks.filter(r => r.id !== risk.id)
       ];

       const response: AnalysisResponse = {
           risks: sortedRisks,
           generalAdvice: currentGeneralAdvice || t('ar_report_fast'),
           groundingChunks: [],
           hygieneLevel: currentHygieneLevel,
           safetyLevel: currentSafetyLevel,
           mode: analysisMode
       };

       onCaptureAnalysis(response, base64Image);
    }
  };

  const handleSaveCleanScan = () => {
    if (!lastCapturedImage) return;
    const response: AnalysisResponse = {
      risks: [],
      generalAdvice: currentGeneralAdvice || 'Tiada risiko pembiakan vektor atau pencemaran kritikal dikesan pada bingkai ini. Premis mematuhi piawaian asas.',
      groundingChunks: [],
      hygieneLevel: currentHygieneLevel || 1,
      safetyLevel: currentSafetyLevel || 1,
      mode: analysisMode
    };
    onCaptureAnalysis(response, lastCapturedImage);
  };

  const handleViewDetails = () => {
    if (liveRisks.length > 0 && lastCapturedImage) {
        const response: AnalysisResponse = {
            risks: liveRisks,
            generalAdvice: currentGeneralAdvice || t('ar_report_scan'),
            groundingChunks: [],
            hygieneLevel: currentHygieneLevel,
            safetyLevel: currentSafetyLevel,
            mode: analysisMode
        };
        onCaptureAnalysis(response, lastCapturedImage);
    } else if (liveRisks.length > 0 && !lastCapturedImage) {
        // Fallback if image wasn't saved for some reason, capture now
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const base64Image = canvas.toDataURL('image/jpeg', 0.95);
            const response: AnalysisResponse = {
                risks: liveRisks,
                generalAdvice: currentGeneralAdvice || t('ar_report_frame'),
                groundingChunks: [],
                hygieneLevel: currentHygieneLevel,
                safetyLevel: currentSafetyLevel,
                mode: analysisMode
            };
            onCaptureAnalysis(response, base64Image);
        }
    }
  };

  // Helper for AR Boxes CSS
  const getBoxStyle = (box: any) => {
    return {
      top: `${box.ymin / 10}%`,
      left: `${box.xmin / 10}%`,
      width: `${(box.xmax - box.xmin) / 10}%`,
      height: `${(box.ymax - box.ymin) / 10}%`,
    };
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex flex-wrap justify-between items-center gap-3 z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="text-white">
            <h3 className="font-bold text-lg">{t('ar_scanner_title')}</h3>
            <p className="text-xs text-emerald-300">{t('ar_scanner_mode')}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900/90 border border-slate-700 rounded-lg p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setAnalysisMode('VECTOR_CONTROL')}
              disabled={isAnalyzing}
              className={`px-2.5 py-1 rounded-md transition ${analysisMode === 'VECTOR_CONTROL' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              🦟 Vektor
            </button>
            <button
              type="button"
              onClick={() => setAnalysisMode('KKM_FOOD_STANDARD')}
              disabled={isAnalyzing}
              className={`px-2.5 py-1 rounded-md transition ${analysisMode === 'KKM_FOOD_STANDARD' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              🍽️ KKM
            </button>
          </div>

          <button 
            onClick={onClose}
            aria-label="Tutup Pengimbas"
            title="Tutup Pengimbas"
            className="bg-slate-900/80 backdrop-blur border border-slate-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 hover:border-red-400 transition-colors font-mono text-xs font-bold flex items-center gap-1.5"
          >
            <span>✕</span>
            <span>TUTUP</span>
          </button>
        </div>
      </div>

      {/* Camera Viewport */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {cameraError ? (
           <div className="text-white text-center p-6">
             <p className="text-red-400 mb-2">{cameraError}</p>
             <button onClick={onClose} className="underline">{t('btn_back')}</button>
           </div>
        ) : (
           <div className="relative w-full h-full">
              <video 
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover z-0"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* AR Overlay Layer */}
              <div className="absolute inset-0 z-10 pointer-events-none">
                 {liveRisks.map((risk) => (
                    <div
                      key={risk.id}
                      onClick={(e) => { e.stopPropagation(); handleRiskClick(risk); }}
                      style={getBoxStyle(risk.box_2d)}
                      className="absolute border-2 border-red-500 bg-red-500/10 shadow-[0_0_10px_rgba(255,0,0,0.5)] transition-all duration-300 animate-pulse cursor-pointer pointer-events-auto hover:bg-red-500/30 hover:scale-105 z-50"
                    >
                       <span className="absolute -top-6 left-0 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                         {risk.label}
                       </span>
                    </div>
                 ))}
              </div>

              {/* Scanning Effect Animation */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-emerald-500/10 z-20 flex items-center justify-center pointer-events-none">
                   <div className="w-full h-1 bg-emerald-400 shadow-[0_0_20px_#34d399] animate-[scan_2s_ease-in-out_infinite]"></div>
                   <div className="absolute text-white font-bold text-xl tracking-widest drop-shadow-md">{t('analyzing')}</div>
                </div>
              )}
           </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-slate-900 p-6 flex flex-col items-center gap-4 z-20 pb-10">
         {liveRisks.length > 0 && !isAnalyzing ? (
            <div className="flex gap-4 w-full max-w-md animate-fade-in-up">
               <button 
                 onClick={handleCaptureAndAnalyze}
                 className="flex-1 bg-slate-700 text-white py-3 rounded-lg font-bold"
               >
                 {t('btn_rescan')}
               </button>
               <button 
                 onClick={handleViewDetails}
                 className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-emerald-700"
               >
                 {t('btn_view_full_report')}
               </button>
            </div>
         ) : hasScannedOnce && lastCapturedImage && !isAnalyzing && liveRisks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 w-full max-w-md animate-fade-in-up">
               <div className="w-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono px-3 py-2 rounded-lg text-center">
                 ✅ Imbasan selesai: Tiada risiko aktif dikesan pada bingkai semasa.
               </div>
               <div className="flex gap-3 w-full">
                 <button 
                   onClick={handleCaptureAndAnalyze}
                   className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-bold text-sm transition"
                 >
                   {t('btn_rescan')}
                 </button>
                 <button 
                   onClick={handleSaveCleanScan}
                   className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-bold text-sm shadow-lg transition"
                 >
                   Simpan Laporan Bersih (0 Risiko)
                 </button>
               </div>
            </div>
         ) : (
            <button 
              onClick={handleCaptureAndAnalyze}
              disabled={isAnalyzing || !isStreaming}
              className={`
                w-20 h-20 rounded-full border-4 border-white flex items-center justify-center shadow-lg transition-transform
                ${isAnalyzing ? 'scale-90 opacity-50 cursor-wait' : 'hover:scale-105 active:scale-95 bg-red-600'}
              `}
            >
               <div className="w-16 h-16 bg-white rounded-full opacity-20"></div>
            </button>
         )}
         
         {!isAnalyzing && !hasScannedOnce && liveRisks.length === 0 && (
            <p className="text-slate-400 text-sm">{t('ar_tip_red_btn')}</p>
         )}
         {!isAnalyzing && liveRisks.length > 0 && (
            <p className="text-emerald-400 text-xs font-bold animate-pulse">{t('ar_tip_click_box')}</p>
         )}
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-40vh); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(40vh); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default LiveCameraScanner;
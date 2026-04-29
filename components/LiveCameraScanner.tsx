import React, { useRef, useState, useEffect } from 'react';
import { analyzeLandscape } from '../services/geminiService';
import { AnalysisResponse, RiskDetection } from '../types';
import { Toast } from './Toast';

interface LiveCameraScannerProps {
  onCaptureAnalysis: (result: AnalysisResponse, imageSrc: string) => void;
  onClose: () => void;
}

const LiveCameraScanner: React.FC<LiveCameraScannerProps> = ({ onCaptureAnalysis, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [liveRisks, setLiveRisks] = useState<RiskDetection[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastCapturedImage, setLastCapturedImage] = useState<string | null>(null);
  const [currentHygieneLevel, setCurrentHygieneLevel] = useState<number>(3);
  const [currentSafetyLevel, setCurrentSafetyLevel] = useState<number>(3); 
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
        setCameraError("Gagal akses kamera. Pastikan anda memberi kebenaran.");
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
        
        // Analyze using 'FAST' mode for low latency
        const result = await analyzeLandscape(base64Data, 'image/jpeg', 'FAST');
        
        // Update AR Overlay
        setLiveRisks(result.risks);
        setCurrentHygieneLevel(result.hygieneLevel);
        setCurrentSafetyLevel(result.safetyLevel || result.hygieneLevel);
      }
    } catch (error) {
      console.error("Analysis Failed:", error);
      setToastMsg({ msg: "Analisis gagal. Cuba stabilkan kamera.", type: 'error' });
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
           generalAdvice: "Laporan dijana daripada pemilihan pantas AR.",
           groundingChunks: [],
           hygieneLevel: currentHygieneLevel,
           safetyLevel: currentSafetyLevel
       };

       onCaptureAnalysis(response, base64Image);
    }
  };

  const handleViewDetails = () => {
    if (liveRisks.length > 0 && lastCapturedImage) {
        const response: AnalysisResponse = {
            risks: liveRisks,
            generalAdvice: "Laporan dijana daripada imbasan AR.",
            groundingChunks: [],
            hygieneLevel: currentHygieneLevel,
            safetyLevel: currentSafetyLevel
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
                generalAdvice: "Laporan dijana daripada imbasan AR (Bingkai Terkini).",
                groundingChunks: [],
                hygieneLevel: currentHygieneLevel,
                safetyLevel: currentSafetyLevel
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
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/70 to-transparent">
        <div className="text-white">
            <h3 className="font-bold text-lg">Pengimbas KULILATIN AR</h3>
            <p className="text-xs text-emerald-300">Mod Pantas (Gemini Flash 2.5)</p>
        </div>
        <button 
          onClick={onClose}
          className="bg-white/20 backdrop-blur text-white p-2 rounded-full hover:bg-white/30"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Camera Viewport */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {cameraError ? (
           <div className="text-white text-center p-6">
             <p className="text-red-400 mb-2">{cameraError}</p>
             <button onClick={onClose} className="underline">Kembali</button>
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
                   <div className="absolute text-white font-bold text-xl tracking-widest drop-shadow-md">MENGANALISIS...</div>
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
                 Imbas Semula
               </button>
               <button 
                 onClick={handleViewDetails}
                 className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-emerald-700"
               >
                 Lihat Laporan Penuh
               </button>
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
         
         {!isAnalyzing && liveRisks.length === 0 && (
            <p className="text-slate-400 text-sm">Tekan butang merah untuk analisis AR segera</p>
         )}
         {!isAnalyzing && liveRisks.length > 0 && (
            <p className="text-emerald-400 text-xs font-bold animate-pulse">KLIK KOTAK MERAH UNTUK BUTIRAN</p>
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
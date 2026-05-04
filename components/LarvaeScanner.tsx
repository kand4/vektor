import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import { generateLarvaeDiagnosis, deepLarvaeAnalysis } from '../services/geminiService';

interface Prediction {
    x: number;
    y: number;
    width: number;
    height: number;
    class: string;
    confidence: number;
    short_desc?: string;
    isRelative?: boolean;
}

const LarvaeScanner: React.FC = () => {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [predictions, setPredictions] = useState<Prediction[] | null>(null);
    const [dragPositions, setDragPositions] = useState<{[key: number]: {x: number, y: number}}>({});
    const [activeId, setActiveId] = useState<number | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [diagnosis, setDiagnosis] = useState<string | null>(null);
    const [isGeneratingDiagnosis, setIsGeneratingDiagnosis] = useState(false);
    const [imageDimensions, setImageDimensions] = useState<{naturalWidth: number, naturalHeight: number} | null>(null);
    
    // Roboflow parameters
    const [confidenceThreshold, setConfidenceThreshold] = useState<number>(40); // default 40%
    const [overlapThreshold, setOverlapThreshold] = useState<number>(30); // default 30% IOU

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.src = reader.result as string;
                img.onload = () => {
                    // Resize large images for better API performance
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
                        width = width * ratio;
                        height = height * ratio;
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                        setImagePreview(compressedBase64);
                    } else {
                        setImagePreview(reader.result as string);
                    }
                    
                    setPredictions(null);
                    setDiagnosis(null);
                    setError(null);
                };
            };
            reader.readAsDataURL(file);
        }
    };

    const handleScan = async () => {
        if (!imagePreview) return;
        setIsScanning(true);
        setError(null);
        setDiagnosis(null);

        try {
            const apiKey = localStorage.getItem('roboflow_api_key');
            const endpointConfig = localStorage.getItem('roboflow_model') || 'aegypti-larvae-detection/1';
            
            if (!apiKey) {
                throw new Error("Sila tetapkan API Key Roboflow di ruang Tetapan.");
            }

            const base64Data = imagePreview.split(',')[1];

            // Use axios to make the request as per Roboflow recommendations
            const response = await axios({
                method: "POST",
                url: `https://detect.roboflow.com/${endpointConfig}`,
                params: {
                    api_key: apiKey,
                    confidence: confidenceThreshold / 100,
                    overlap: overlapThreshold / 100
                },
                data: base64Data,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            });

            if (!response.data || !response.data.predictions) {
                throw new Error("Format respon tidak sah dari pelayan Roboflow.");
            }

            setPredictions(response.data.predictions);
        } catch (err: any) {
            setError(err.message || 'Ralat semasa membuat imbasan.');
        } finally {
            setIsScanning(false);
        }
    };

    const handleGenerateDiagnosis = async () => {
        if (!predictions || predictions.length === 0) return;
        setIsGeneratingDiagnosis(true);
        try {
            const result = await generateLarvaeDiagnosis(predictions);
            setDiagnosis(result);
        } catch (err: any) {
            setError(err.message || "Gagal menjana laporan diagnostik.");
            setDiagnosis("Gagal menghubungi pelayan AI. Sila cuba lagi.");
        } finally {
            setIsGeneratingDiagnosis(false);
        }
    };

    const handleDeepScan = async () => {
        if (!imagePreview) return;
        setIsGeneratingDiagnosis(true);
        setIsScanning(true);
        setError(null);
        setDiagnosis(null);
        setPredictions(null);

        try {
            const base64Data = imagePreview.split(',')[1];
            const result = await deepLarvaeAnalysis(base64Data);
            
            setPredictions(result.predictions);
            setDiagnosis(result.diagnosis);
            
        } catch (err: any) {
             setError(err.message || 'Ralat semasa membuat imbasan mendalam AI.');
        } finally {
             setIsGeneratingDiagnosis(false);
             setIsScanning(false);
        }
    };

    return (
        <div className="w-full flex justify-center py-6">
            <div className="max-w-4xl w-full bg-slate-900/80 border border-slate-700/50 rounded-xl p-6 backdrop-blur shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-sci-fi text-cyan-400 uppercase tracking-widest mb-1 shadow-cyan-500/20 drop-shadow-lg">Mosquito Larvae Scanner</h2>
                        <p className="text-sm text-slate-400 font-mono-sci">Powered by Universal Roboflow Inference API <span className="text-purple-400 font-bold">& Gemini Vision</span></p>
                    </div>
                    {predictions !== null && (
                        <div className={`px-4 py-2 border rounded-lg font-mono-sci tabular-nums text-sm ${
                            predictions.length > 0 
                                ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400' 
                                : 'bg-amber-900/30 border-amber-500/50 text-amber-400'
                        }`}>
                            DETECTED: <span className="text-white text-lg font-bold">{predictions.length}</span>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded text-red-300 font-mono text-sm max-w-2xl">
                        ⚠️ ralat: {error}
                    </div>
                )}
                
                {(predictions !== null && predictions.length === 0) && (
                    <div className="mb-6 p-4 bg-amber-900/30 border border-amber-500/50 rounded text-amber-200 font-mono text-sm max-w-4xl shadow-xl flex gap-3 items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <p className="font-bold mb-1">Tiada pengesanan melalui Model Konvensional (Roboflow).</p>
                            <p className="text-amber-200/80 mb-2 leading-relaxed">Model Roboflow sangat bergantung kepada jenis imej yang dilatih (dataset). Jika gambar anda diambil dari sudut berbeza, beresolusi terlampau tinggi, atau pencahayaannya berbeza dari dataset mereka, ia mungkin gagal mengesan jejentik walaupun jelas kelihatan.</p>
                            <p className="text-purple-300 bg-purple-900/40 p-2 rounded border border-purple-500/30 inline-block font-sci-fi tracking-wide">💡 TINDAKAN PENYELESAIAN: Sila klik "IMBASAN MENDALAM ULTRA AI" untuk menggunakan dataset biologi secara terus dari enjin penglihatan Gemini.</p>
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                        <div className="relative border-2 border-dashed border-slate-600 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-colors bg-slate-950/50 min-h-[300px] flex items-center justify-center group cursor-pointer">
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageUpload} 
                                className="absolute inset-0 opacity-0 cursor-pointer z-20"
                            />
                            {!imagePreview ? (
                                <div className="text-center p-6 disabled-group-hover">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-16 h-16 mx-auto text-slate-500 mb-3 group-hover:text-cyan-400 transition-colors">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                    </svg>
                                    <p className="text-sm text-slate-300 font-bold mb-1">Klik atau heret gambar jentik-jentik</p>
                                    <p className="text-xs text-slate-500 font-mono">Format disokong: JPG, PNG</p>
                                </div>
                            ) : (
                                <div className="relative flex items-center justify-center p-2 w-full min-h-[400px]">
                                    <div className="relative inline-block max-w-full max-h-[60vh]">
                                        <img 
                                            src={imagePreview} 
                                            alt="Preview" 
                                            className="max-w-full max-h-[60vh] rounded drop-shadow-2xl"
                                            ref={imageRef}
                                            onLoad={(e) => {
                                                const img = e.target as HTMLImageElement;
                                                setImageDimensions({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
                                            }}
                                        />
                                        {(predictions && imageDimensions) && (
                                            <>
                                                {/* SVG Lines Overlay */}
                                                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                                                    {predictions.map((p, i) => {
                                                        const relX = p.x / imageDimensions.naturalWidth;
                                                        const relY = p.y / imageDimensions.naturalHeight;
                                                        const startX = (p.isRelative ? p.x * 100 : relX * 100);
                                                        const startY = (p.isRelative ? p.y * 100 : relY * 100);
                                                        
                                                        // Use a default drag position if none exists
                                                        const dragX = dragPositions[i]?.x || 0;
                                                        const dragY = dragPositions[i]?.y || 0;
                                                        
                                                        // Calculate end position as percentage of container
                                                        const containerWidth = imageRef.current?.offsetWidth || 1;
                                                        const containerHeight = imageRef.current?.offsetHeight || 1;
                                                        
                                                        const endX = startX + (dragX / containerWidth * 100);
                                                        const endY = startY + (dragY / containerHeight * 100) - 1; // Slight offset so it points to the top of the box
                                                        
                                                        const midY = (startY + endY) / 2;
                                                        
                                                        return (
                                                            <motion.path
                                                                key={`line-${i}`}
                                                                d={`M ${startX}% ${startY}% C ${startX}% ${midY}%, ${endX}% ${midY}%, ${endX}% ${endY}%`}
                                                                animate={{
                                                                    d: `M ${startX}% ${startY}% C ${startX}% ${midY}%, ${endX}% ${midY}%, ${endX}% ${endY}%`,
                                                                    stroke: activeId === i ? "#22d3ee" : "#10b981" // cyan-400 vs emerald-500
                                                                }}
                                                                strokeWidth="3"
                                                                fill="none"
                                                                strokeLinecap="round"
                                                                initial={false}
                                                            />
                                                        );
                                                    })}
                                                </svg>

                                                {/* Detection Boxes */}
                                                {predictions.map((p, i) => {
                                                    const relX = p.x / imageDimensions.naturalWidth;
                                                    const relY = p.y / imageDimensions.naturalHeight;
                                                    const relW = p.width / (p.isRelative ? 1 : imageDimensions.naturalWidth);
                                                    const relH = p.height / (p.isRelative ? 1 : imageDimensions.naturalHeight);
                                                    
                                                    return (
                                                        <motion.div 
                                                            key={`box-${i}`} 
                                                            className="absolute border-2 pointer-events-none z-20"
                                                            animate={{
                                                                borderColor: activeId === i ? "#22d3ee" : "#10b981",
                                                                backgroundColor: activeId === i ? "rgba(34, 211, 238, 0.2)" : "rgba(16, 185, 129, 0.1)"
                                                            }}
                                                            style={{
                                                                left: `${(p.isRelative ? p.x - relW / 2 : relX - relW / 2) * 100}%`,
                                                                top: `${(p.isRelative ? p.y - relH / 2 : relY - relH / 2) * 100}%`,
                                                                width: `${relW * 100}%`,
                                                                height: `${relH * 100}%`
                                                            }}
                                                        />
                                                    );
                                                })}

                                                {/* Draggable Explanation Boxes */}
                                                {predictions.map((p, i) => {
                                                    const relX = p.x / imageDimensions.naturalWidth;
                                                    const relY = p.y / imageDimensions.naturalHeight;
                                                    const initialLeft = (p.isRelative ? p.x : relX) * 100;
                                                    const initialTop = (p.isRelative ? p.y : relY) * 100;
                                                    
                                                    return (
                                                        <motion.div 
                                                            key={`callout-${i}`}
                                                            drag
                                                            dragMomentum={false}
                                                            className="absolute z-30 cursor-grab active:cursor-grabbing touch-none"
                                                            onDragStart={() => setActiveId(i)}
                                                            onDragEnd={() => setActiveId(null)}
                                                            onDrag={(e, info) => setDragPositions(prev => ({ 
                                                                ...prev, 
                                                                [i]: { 
                                                                    x: (prev[i]?.x || 0) + info.delta.x, 
                                                                    y: (prev[i]?.y || 0) + info.delta.y 
                                                                } 
                                                            }))}
                                                            style={{
                                                                left: `${initialLeft}%`,
                                                                top: `${initialTop}%`,
                                                                translateX: '-50%', // Center horizontally by default
                                                            }}
                                                        >
                                                            <motion.div 
                                                                className="bg-slate-900 border shadow-lg rounded-md p-2 backdrop-blur-sm bg-slate-900/90 text-left w-max max-w-[180px] pointer-events-auto"
                                                                animate={{
                                                                    borderColor: activeId === i ? "rgba(34, 211, 238, 0.8)" : "rgba(16, 185, 129, 0.5)",
                                                                    boxShadow: activeId === i ? "0 10px 15px -3px rgba(34, 211, 238, 0.2)" : "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                                                                }}
                                                            >
                                                                <div className={`flex items-center gap-2 mb-1 border-b pb-1 transition-colors ${activeId === i ? 'border-cyan-900/50' : 'border-emerald-900/50'}`}>
                                                                    <div className={`font-bold text-xs uppercase tracking-wider transition-colors ${activeId === i ? 'text-cyan-400' : 'text-emerald-400'}`}>{p.class}</div>
                                                                </div>
                                                                {p.short_desc && <div className="text-[10px] text-slate-300 leading-tight">{p.short_desc}</div>}
                                                            </motion.div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </>
                                        )}

                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-center md:justify-start gap-4 flex-wrap">
                            <button 
                                onClick={handleScan}
                                disabled={!imagePreview || isScanning}
                                className={`px-6 py-3 rounded-lg font-bold font-sci-fi tracking-widest transition-all shadow-lg flex items-center gap-2 ${!imagePreview || isScanning ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/50 hover:shadow-cyan-500/50'}`}
                            >
                                {isScanning && !isGeneratingDiagnosis ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        MENGIMBAS (ROBOFLOW)...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                                        </svg>
                                        IMBAS (ROBOFLOW)
                                    </>
                                )}
                            </button>
                            
                            <button 
                                onClick={handleDeepScan}
                                disabled={!imagePreview || isScanning}
                                className={`px-6 py-3 rounded-lg font-bold font-sci-fi tracking-widest transition-all shadow-lg flex items-center gap-2 ${!imagePreview || isScanning ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/50 hover:shadow-purple-500/50 relative overflow-hidden group'}`}
                            >
                                {!imagePreview || isScanning ? null : (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                                )}
                                {isGeneratingDiagnosis && isScanning ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        ANALISA MENDALAM...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                                        </svg>
                                        IMBASAN MENDALAM ULTRA AI
                                    </>
                                )}
                            </button>
                            
                            {(predictions && predictions.length > 0 && !diagnosis) && (
                                <button
                                    onClick={handleGenerateDiagnosis}
                                    disabled={isGeneratingDiagnosis}
                                    className={`px-6 py-3 rounded-lg font-bold font-sci-fi tracking-widest transition-all shadow-lg flex items-center gap-2 ${isGeneratingDiagnosis ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50 hover:shadow-emerald-500/50'}`}
                                >
                                    {isGeneratingDiagnosis ? 'MENJANA...' : 'JANA DIAGNOSA AI'}
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="w-full md:w-80 flex flex-col gap-6">
                        <div className="bg-slate-950/50 border border-slate-700/50 rounded-xl p-5">
                            <h3 className="text-white font-bold mb-4 font-sci-fi tracking-wide flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-cyan-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                                </svg>
                                TETAPAN IMBASAN
                            </h3>
                            
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs text-slate-300 font-bold uppercase tracking-wider">Tahap Keyakinan</label>
                                        <span className="text-cyan-400 text-xs font-mono">{confidenceThreshold}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="10" 
                                        max="100" 
                                        value={confidenceThreshold}
                                        onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">Kurangkan untuk kesan lebih banyak (mungkin kurang tepat). Tingkatkan untuk ketepatan.</p>
                                </div>
                                
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs text-slate-300 font-bold uppercase tracking-wider">Tindihan Kotak (IOU)</label>
                                        <span className="text-cyan-400 text-xs font-mono">{overlapThreshold}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        value={overlapThreshold}
                                        onChange={(e) => setOverlapThreshold(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">Had pertindihan bagi objek yang berdekatan.</p>
                                </div>
                            </div>
                        </div>

                        {diagnosis && (
                            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-5 overflow-y-auto max-h-[400px]">
                                <h3 className="text-emerald-400 font-bold mb-3 font-sci-fi tracking-wide flex items-center gap-2 text-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                    </svg>
                                    DIAGNOSA SAINTIFIK AI
                                </h3>
                                <div className="text-sm text-slate-300 prose prose-invert prose-emerald max-w-none">
                                    <ReactMarkdown>{diagnosis}</ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LarvaeScanner;

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { generateLarvaeDiagnosis, deepLarvaeAnalysis } from '../services/geminiService';
import ImageMagnifier from './ImageMagnifier';
import GBIFDataPanel from './GBIFDataPanel';

import LarvaImg from '../src/assets/images/Larva.png';

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
    const { t, language } = useLanguage();
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [predictions, setPredictions] = useState<Prediction[] | null>(null);
    const [dragPositions, setDragPositions] = useState<{[key: number]: {x: number, y: number}}>({});
    const [activeId, setActiveId] = useState<number | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [diagnosis, setDiagnosis] = useState<string | null>(null);
    const [isGeneratingDiagnosis, setIsGeneratingDiagnosis] = useState(false);
    const [imageDimensions, setImageDimensions] = useState<{naturalWidth: number, naturalHeight: number} | null>(null);
    
    // Magnifier states & controls
    const containerRef = useRef<HTMLDivElement>(null);

    // Roboflow parameters
    const [confidenceThreshold, setConfidenceThreshold] = useState<number>(40); // default 40%
    const [overlapThreshold, setOverlapThreshold] = useState<number>(30); // default 30% IOU

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    // Anatomy Poster Reference - Loaded locally from the new pics directory for maximum speed and security
    const LARVAE_POSTER_URL = LarvaImg; 

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
                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
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
                throw new Error("Sila tetapkan API Key Roboflow di ruang Tetapan atau gunakan butang Analisa Mendalam (Gemini).");
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
            setError(err.message || t('larvae_scanner_error'));
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
             setError(err.message || t('larvae_scanner_error'));
        } finally {
             setIsGeneratingDiagnosis(false);
             setIsScanning(false);
        }
    };

    return (
        <div className="w-full flex justify-center py-4 sm:py-6">
            <div className="max-w-7xl w-full bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-7 backdrop-blur-md shadow-2xl relative overflow-hidden text-slate-200">
                {/* Futuristic HUD Grid Line & Vignette Effect */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-slate-950/0 to-slate-950 z-0"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d408_1px,transparent_1px),linear-gradient(to_bottom,#06b6d408_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>

                {/* HUD Header Bar */}
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 border-b border-cyan-500/20 pb-5">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-cyan-950/60 border border-cyan-500/40 px-3 py-1 rounded-full text-[10px] font-mono font-bold text-cyan-400 mb-2.5 uppercase tracking-widest shadow-md">
                            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-ping"></span>
                            MOD DETEKTIF JEJENTIK // FORENSIK MAKRO
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-sci-fi font-black text-white uppercase tracking-wider drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                            PENGIMBAS <span className="text-cyan-400">LARVA VEKTOR</span>
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400 font-light mt-1">
                            Pengecaman morfologi sifar sifon, kepala kapsul, pengiraan ketumpatan & analisis saintifik berbantukan AI.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {predictions !== null && (
                            <div className={`px-4 py-2.5 border rounded-2xl font-mono tabular-nums text-xs sm:text-sm shadow-lg flex items-center gap-2.5 ${
                                predictions.length > 0 
                                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400 shadow-emerald-950/50' 
                                    : 'bg-amber-950/60 border-amber-500/50 text-amber-400 shadow-amber-950/50'
                            }`}>
                                <span className="text-[10px] uppercase tracking-widest text-slate-400">STATUS:</span>
                                <span className="text-white text-base font-black">{predictions.length} LARVA DIKESAN</span>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-950/40 border border-red-500/50 rounded-2xl text-red-300 font-mono text-xs sm:text-sm shadow-xl flex items-center gap-3 relative z-10">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <span className="font-bold tracking-widest uppercase block text-red-400">RALAT_SISTEM:</span>
                            {error}
                        </div>
                    </div>
                )}
                
                {(predictions !== null && predictions.length === 0) && (
                    <div className="mb-6 p-4 bg-amber-950/40 border border-amber-500/50 rounded-2xl text-amber-200 font-mono text-xs sm:text-sm shadow-xl flex flex-col sm:flex-row gap-3 items-start relative z-10">
                        <span className="text-2xl">💡</span>
                        <div>
                            <p className="font-bold mb-1 uppercase tracking-wider text-amber-300">Tiada pengesanan melalui model konvensional.</p>
                            <p className="text-amber-200/80 mb-2 leading-relaxed text-xs">Model Roboflow bergantung kepada dataset standard. Sila gunakan <strong>Analisa Mendalam (Gemini 3.7 Flash)</strong> untuk mengekstrak ciri morfologi kompleks dan orientasi melengkung.</p>
                            <p className="text-cyan-300 bg-cyan-950/60 p-2 rounded-xl border border-cyan-500/30 inline-block font-mono tracking-wide text-xs">{t('larvae_scanner_tip')}</p>
                        </div>
                    </div>
                )}
                
                {/* Main Viewport & Controls Grid */}
                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 relative z-10 items-start">
                    
                    {/* LEFT (8 cols): Interactive Image HUD Viewport */}
                    <div className="lg:col-span-8 w-full flex flex-col gap-4">
                        <div className="relative border-2 border-slate-800 rounded-3xl overflow-hidden shadow-2xl bg-slate-950 min-h-[380px] sm:min-h-[460px] flex items-center justify-center group">
                            
                            {/* HUD Hologram Corner Reticles */}
                            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-400/80 pointer-events-none z-20"></div>
                            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-400/80 pointer-events-none z-20"></div>
                            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-cyan-400/80 pointer-events-none z-20"></div>
                            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-cyan-400/80 pointer-events-none z-20"></div>
                            
                            {/* HUD Top Info Bar inside Viewport */}
                            <div className="absolute top-3 left-12 right-12 z-20 flex items-center justify-between pointer-events-none opacity-75">
                                <span className="font-mono text-[9px] font-bold text-cyan-400/80 tracking-widest uppercase">OPTICAL SENSOR // ACTIVE</span>
                                <span className="font-mono text-[9px] font-bold text-slate-500 tracking-widest uppercase">SCALE: MICROSCOPIC (10x-50x)</span>
                            </div>

                            {!imagePreview && (
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleImageUpload} 
                                    className="absolute inset-0 opacity-0 cursor-pointer z-30"
                                />
                            )}

                            {!imagePreview ? (
                                <div className="text-center p-8 flex flex-col items-center justify-center">
                                    <div className="w-20 h-20 rounded-3xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 group-hover:border-cyan-400 transition-all shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                                        🔬
                                    </div>
                                    <h4 className="text-lg font-sci-fi font-bold text-white uppercase tracking-wider mb-1">{t('larvae_scanner_drag')}</h4>
                                    <p className="text-xs text-slate-400 font-mono max-w-sm mb-4">{t('larvae_scanner_formats')}</p>
                                    <span className="px-4 py-2 rounded-xl bg-cyan-600 text-black font-mono text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-500/20 group-hover:bg-cyan-400 transition">
                                        + PILIH GAMBAR 2D JEJENTIK
                                    </span>
                                </div>
                            ) : (
                                <div className="relative flex items-center justify-center p-2 w-full min-h-[420px]">
                                    {/* Action buttons inside container */}
                                    <div className="absolute top-4 left-4 right-4 z-30 flex justify-between items-center no-print">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setImagePreview(null);
                                                    setPredictions(null);
                                                    setDiagnosis(null);
                                                }}
                                                className="px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-400 hover:text-red-300 font-mono text-[10px] font-bold tracking-widest transition-all uppercase flex items-center gap-1 shadow-lg"
                                            >
                                                🗑️ {t('clear_btn') || 'PADAM'}
                                            </button>
                                            <label className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-mono text-[10px] font-bold tracking-widest transition-all uppercase flex items-center gap-1 shadow-lg cursor-pointer">
                                                📁 {t('change_btn') || 'TUKAR'}
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    onChange={handleImageUpload} 
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    <div 
                                        ref={containerRef}
                                        className="relative inline-block max-w-full max-h-[60vh] overflow-hidden rounded-2xl"
                                    >
                                        <ImageMagnifier 
                                            src={imagePreview} 
                                            alt="Preview" 
                                            imageClassName="max-w-full max-h-[60vh] rounded-2xl drop-shadow-2xl object-contain"
                                            imageRef={imageRef}
                                            onLoad={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
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
                                                        
                                                        const dragX = dragPositions[i]?.x || 0;
                                                        const dragY = dragPositions[i]?.y || 0;
                                                        
                                                        const containerWidth = imageRef.current?.offsetWidth || 1;
                                                        const containerHeight = imageRef.current?.offsetHeight || 1;
                                                        
                                                        const endX = startX + (dragX / containerWidth * 100);
                                                        const endY = startY + (dragY / containerHeight * 100) - 1;
                                                        const midY = (startY + endY) / 2;
                                                        
                                                        return (
                                                            <motion.path
                                                                key={`line-${i}`}
                                                                d={`M ${startX}% ${startY}% C ${startX}% ${midY}%, ${endX}% ${midY}%, ${endX}% ${endY}%`}
                                                                animate={{
                                                                    d: `M ${startX}% ${startY}% C ${startX}% ${midY}%, ${endX}% ${midY}%, ${endX}% ${endY}%`,
                                                                    stroke: activeId === i ? "#06b6d4" : "#10b981"
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
                                                            className="absolute border-2 pointer-events-none z-20 rounded-lg shadow-lg"
                                                            animate={{
                                                                borderColor: activeId === i ? "#06b6d4" : "#10b981",
                                                                backgroundColor: activeId === i ? "rgba(6, 182, 212, 0.25)" : "rgba(16, 185, 129, 0.15)"
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
                                                                translateX: '-50%',
                                                            }}
                                                        >
                                                            <motion.div 
                                                                className="bg-slate-900/95 border shadow-2xl rounded-xl p-2.5 text-left w-max max-w-[150px] sm:max-w-[200px] md:max-w-[240px] pointer-events-auto backdrop-blur-md"
                                                                animate={{
                                                                    borderColor: activeId === i ? "rgba(6, 182, 212, 0.9)" : "rgba(16, 185, 129, 0.6)",
                                                                    boxShadow: activeId === i ? "0 10px 25px rgba(6, 182, 212, 0.4)" : "0 10px 20px rgba(0, 0, 0, 0.3)"
                                                                }}
                                                            >
                                                                <div className={`flex items-center gap-1.5 mb-1 border-b pb-1 transition-colors ${activeId === i ? 'border-cyan-500/40' : 'border-emerald-500/40'}`}>
                                                                    <div className={`font-mono font-bold text-[10px] sm:text-xs uppercase tracking-wider overflow-hidden text-ellipsis ${activeId === i ? 'text-cyan-400' : 'text-emerald-400'}`}>{p.class}</div>
                                                                </div>
                                                                {p.short_desc && <div className="text-[9px] sm:text-[10px] text-slate-300 leading-tight break-words">{p.short_desc}</div>}
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

                        {/* Scanner Control Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/90 border border-slate-800 rounded-2xl">
                            <div className="flex items-center gap-2 flex-wrap">
                                <button 
                                    onClick={handleDeepScan}
                                    disabled={!imagePreview || isScanning}
                                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold font-mono tracking-wider transition-all shadow-lg flex items-center gap-2 ${
                                        !imagePreview || isScanning 
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/40 hover:scale-[1.02] active:scale-[0.98]'
                                    }`}
                                >
                                    {isGeneratingDiagnosis && isScanning ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            ANALISIS GEMINI 3.7...
                                        </>
                                    ) : (
                                        <>
                                            <span>✨</span>
                                            <span>ANALISIS FORENSIK (GEMINI 3.7)</span>
                                        </>
                                    )}
                                </button>

                                <button 
                                    onClick={handleScan}
                                    disabled={!imagePreview || isScanning}
                                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold font-mono tracking-wider transition-all border ${
                                        !imagePreview || isScanning 
                                            ? 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed' 
                                            : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-400 hover:bg-cyan-900/40 hover:border-cyan-400'
                                    }`}
                                >
                                    {isScanning && !isGeneratingDiagnosis ? 'MENGIMBAS ROBOFLOW...' : 'ROBOFLOW YOLOV8'}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* RIGHT (4 cols): HUD Diagnosis & Diagnostic Details */}
                    <div className="lg:col-span-4 w-full flex flex-col gap-4">
                        
                        {/* Detection Tuning Settings */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
                            <h3 className="text-white font-bold font-sci-fi tracking-wide flex items-center gap-2 text-xs uppercase mb-4 text-cyan-400">
                                <span>⚙️</span>
                                <span>PARAMETRI VISI ROBOTIK</span>
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="text-[11px] text-slate-400 font-mono uppercase font-bold">Tahap Keyakinan</label>
                                        <span className="text-cyan-400 text-xs font-mono font-bold">{confidenceThreshold}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="10" 
                                        max="100" 
                                        value={confidenceThreshold}
                                        onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                    />
                                </div>
                                
                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="text-[11px] text-slate-400 font-mono uppercase font-bold">Tindihan Kotak (IOU)</label>
                                        <span className="text-cyan-400 text-xs font-mono font-bold">{overlapThreshold}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        value={overlapThreshold}
                                        onChange={(e) => setOverlapThreshold(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* AI Scientific Diagnostic Report */}
                        {diagnosis ? (
                            <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden flex flex-col gap-3">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-400 to-indigo-500"></div>

                                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-sm shadow-md">
                                            🔬
                                        </div>
                                        <div>
                                            <h4 className="text-emerald-400 font-bold font-sci-fi tracking-widest text-xs uppercase">
                                                LAPORAN SAINTIFIK AI
                                            </h4>
                                            <p className="text-[8px] text-slate-500 font-mono uppercase">Enjin Gemini 3.7 Flash</p>
                                        </div>
                                    </div>

                                    <button 
                                        type="button"
                                        onClick={() => window.print()}
                                        className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white font-mono text-[9px] font-bold uppercase transition"
                                    >
                                        CETAK
                                    </button>
                                </div>

                                <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl max-h-[350px] overflow-y-auto scrollbar-thin text-xs leading-relaxed text-slate-300 prose prose-invert prose-emerald max-w-none">
                                    <ReactMarkdown>{diagnosis}</ReactMarkdown>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-6 text-center min-h-[220px] flex flex-col items-center justify-center">
                                <span className="text-4xl mb-3 opacity-60">🧬</span>
                                <h4 className="text-xs font-sci-fi font-bold text-slate-400 uppercase tracking-widest mb-1">
                                    MENUNGGU IMBASAN SPESIMEN
                                </h4>
                                <p className="text-[11px] text-slate-500 leading-relaxed max-w-[240px]">
                                    Muat naik gambar 2D jejentik untuk memulakan analisis anatomi dan pengesyoran tindakan KKM.
                                </p>
                            </div>
                        )}

                        {/* GBIF Biodiversity Panel */}
                        {diagnosis && (
                            <GBIFDataPanel speciesName={(() => {
                                const text = diagnosis.toLowerCase();
                                if (text.includes("culex")) return "Culex";
                                if (text.includes("anopheles")) return "Anopheles";
                                if (text.includes("mansonia")) return "Mansonia";
                                if (text.includes("armigeres")) return "Armigeres";
                                return "Aedes";
                            })()} />
                        )}
                    </div>
                </div>

                {/* ANATOMY POSTER SECTION */}
                <div className="mt-10 pt-6 border-t border-slate-800/80 relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-lg shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                                🔬
                            </div>
                            <div>
                                <h3 className="text-white font-bold font-sci-fi tracking-widest text-sm uppercase">CARTA REFERENSI ANATOMI LARVA KKM</h3>
                                <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">Manual Entomologi Lapangan v2.0</p>
                            </div>
                        </div>
                        <a 
                            href={LARVAE_POSTER_URL} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-700 px-3 py-1.5 rounded-xl font-mono uppercase tracking-widest transition-colors flex items-center gap-2 self-start sm:self-auto"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                            BUKA SAIZ ASAL
                        </a>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden p-2 group">
                        <div className="relative aspect-[16/10] sm:aspect-[16/9] bg-slate-900 rounded-2xl overflow-hidden cursor-zoom-in">
                            <ImageMagnifier 
                                src={LARVAE_POSTER_URL} 
                                alt="Poster Anatomi Larva"
                                zoomLevel={2.5}
                                imageClassName="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                                className="w-full h-full flex items-center justify-center"
                            />
                            <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-3 rounded-2xl max-w-sm hidden md:block">
                                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                                    <strong className="text-cyan-400 uppercase tracking-tighter">Nota Lapangan:</strong> Rujuk ciri Sifon, Gigi Pecten, dan rambut toraks untuk pengesahan spesis Aedes vs Culex.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LarvaeScanner;


import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import { analyzeAdultMosquito } from '../services/geminiService';

import { useLanguage } from '../contexts/LanguageContext';
import Mosquito3DViewer from './Mosquito3DViewer';

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

const AdultMosquitoScanner: React.FC = () => {
    const { t } = useLanguage();
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [predictions, setPredictions] = useState<Prediction[] | null>(null);
    const [dragPositions, setDragPositions] = useState<{[key: number]: {x: number, y: number}}>({});
    const [activeId, setActiveId] = useState<number | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [diagnosis, setDiagnosis] = useState<string | null>(null);
    const [isGeneratingDiagnosis, setIsGeneratingDiagnosis] = useState(false);
    const [imageDimensions, setImageDimensions] = useState<{naturalWidth: number, naturalHeight: number} | null>(null);
    const [show3DModel, setShow3DModel] = useState(false);
    
    const imageRef = useRef<HTMLImageElement | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.src = reader.result as string;
                img.onload = () => {
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

    const handleForensicScan = async () => {
        if (!imagePreview) return;
        setIsScanning(true);
        setError(null);
        setDiagnosis(null);
        setPredictions(null);

        try {
            const base64Data = imagePreview.split(',')[1];
            const result = await analyzeAdultMosquito(base64Data);
            
            setPredictions(result.predictions);
            setDiagnosis(result.diagnosis);
            
        } catch (err: any) {
             setError(err.message || t('adult_scanner_error'));
        } finally {
             setIsScanning(false);
        }
    };

    return (
        <div className="w-full flex justify-center py-6">
            <div className="max-w-6xl w-full bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 sm:p-6 backdrop-blur shadow-2xl relative overflow-hidden">
                {/* HUD Scanline Effect on the background */}
                <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] z-0"></div>
                
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                    <div>
                        <div className="flex items-center gap-3">
                           <div className="w-2 h-8 bg-cyan-500 rounded-sm animate-pulse"></div>
                           <h2 className="text-xl sm:text-2xl font-sci-fi text-cyan-400 uppercase tracking-widest mb-1 shadow-cyan-500/20 drop-shadow-lg">{t('adult_scanner_title')}</h2>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-400 font-mono-sci pl-5">Powered by Gemini Vision Forensic AI</p>
                    </div>
                    <div>
                        <button 
                            onClick={() => setShow3DModel(true)} 
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-900/50 hover:bg-emerald-800/80 border border-emerald-500/50 rounded-lg text-emerald-300 font-sci-fi text-sm transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                            </svg>
                            LIHAT MODEL 3D
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded text-red-300 font-mono text-sm max-w-2xl relative z-10">
                        <span className="font-bold tracking-widest">SYSTEM_ERROR:</span> {error}
                    </div>
                )}
                
                <div className="flex flex-col lg:flex-row gap-6 relative z-10">
                    <div className="flex-1 space-y-4">
                        <div className="relative border border-cyan-900/50 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(34,211,238,0.1)] transition-colors bg-slate-950/80 min-h-[300px] flex items-center justify-center group cursor-pointer">
                            {/* Scanner Corner Crosshairs */}
                            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-500/70 pointer-events-none"></div>
                            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-500/70 pointer-events-none"></div>
                            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-500/70 pointer-events-none"></div>
                            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-500/70 pointer-events-none"></div>
                            
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageUpload} 
                                className="absolute inset-0 opacity-0 cursor-pointer z-20"
                            />
                            {!imagePreview ? (
                                <div className="text-center p-6">
                                    <p className="text-sm text-slate-300 font-bold mb-1">{t('adult_scanner_drag')}</p>
                                    <p className="text-xs text-slate-500 font-mono">{t('larvae_scanner_formats')}</p>
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
                                                                className="bg-slate-900 border shadow-lg rounded-md p-2 backdrop-blur-sm bg-slate-900/90 text-left w-max max-w-[140px] sm:max-w-[180px] md:max-w-[220px] pointer-events-auto"
                                                                animate={{
                                                                    borderColor: activeId === i ? "rgba(34, 211, 238, 0.8)" : "rgba(16, 185, 129, 0.5)",
                                                                    boxShadow: activeId === i ? "0 10px 15px -3px rgba(34, 211, 238, 0.2)" : "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                                                                }}
                                                            >
                                                                <div className={`flex items-center gap-1 sm:gap-2 mb-1 border-b pb-1 transition-colors ${activeId === i ? 'border-cyan-900/50' : 'border-emerald-900/50'}`}>
                                                                    <div className={`font-bold text-[10px] sm:text-xs uppercase tracking-wider overflow-hidden text-ellipsis transition-colors ${activeId === i ? 'text-cyan-400' : 'text-emerald-400'}`}>{p.class}</div>
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

                        <button 
                            onClick={handleForensicScan}
                            disabled={!imagePreview || isScanning}
                            className="px-6 py-3 rounded-lg font-bold font-sci-fi tracking-widest bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/50 hover:shadow-purple-500/50"
                        >
                            {isScanning ? t('adult_scanner_scanning') : t('adult_scanner_btn')}
                        </button>
                    </div>
                    
                    <div className="w-full lg:w-96 flex flex-col gap-6">
                        {diagnosis && (
                            <div className="bg-emerald-950/30 border-l-4 border-emerald-500 border-t border-r border-b border-emerald-500/30 rounded-r-xl p-4 sm:p-5 overflow-y-auto max-h-[500px] shadow-[0_0_20px_rgba(16,185,129,0.1)] relative">
                                <div className="absolute top-0 right-0 w-8 h-8 bg-[linear-gradient(135deg,transparent_50%,rgba(16,185,129,0.2)_50%)]"></div>
                                <h3 className="text-emerald-400 font-bold mb-4 font-sci-fi tracking-widest text-sm flex items-center gap-2">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping mr-1"></span>
                                    {t('adult_scanner_result_title')}
                                </h3>
                                <div className="text-sm text-slate-300 prose prose-invert prose-emerald max-w-none break-words">
                                    <ReactMarkdown>{diagnosis}</ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 3D Model Modal */}
            {show3DModel && (
                <Mosquito3DViewer onClose={() => setShow3DModel(false)} />
            )}
        </div>
    );
};

export default AdultMosquitoScanner;

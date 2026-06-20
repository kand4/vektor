import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import { analyzeAdultMosquito } from '../services/geminiService';

import { useLanguage } from '../contexts/LanguageContext';
import Mosquito3DViewer from './Mosquito3DViewer';
import ImageMagnifier from './ImageMagnifier';

import AegyptiImg from '../src/assets/images/Aegypti.jpg';
import AlbopictusImg from '../src/assets/images/Albopictus.jpg';

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
    
    // Adult Mosquito Poster References
    const AEGYPTI_POSTER_URL = AegyptiImg; 
    const ALBOPICTUS_POSTER_URL = AlbopictusImg; 

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
                            className="px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold font-sci-fi tracking-wider bg-purple-600 hover:bg-purple-500 text-white shadow-md hover:shadow-purple-500/30 transition-all hover:scale-[1.01] active:scale-[0.98]"
                        >
                            {isScanning ? t('adult_scanner_scanning') : t('adult_scanner_btn')}
                        </button>
                    </div>
                    
                    <div className="w-full lg:w-96 flex flex-col gap-6">
                        {diagnosis && (
                            <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden group">
                                {/* Decorative tech accents */}
                                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
                                <div className="absolute top-2 right-2 flex gap-1.5 opacity-40">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60"></span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/30"></span>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-500/20 pb-4 mb-5 flex-wrap">
                                    <div className="flex items-center gap-2.5">
                                        <div className="relative flex items-center justify-center">
                                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500/20 animate-ping"></span>
                                            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
                                                🔬
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-emerald-400 font-bold font-sci-fi tracking-widest text-sm flex items-center gap-2">
                                                {t('adult_scanner_result_title')}
                                            </h3>
                                            <p className="text-[9px] text-emerald-500/70 font-mono tracking-wider uppercase">Laporan Analisis Bio-Molekular Pintar</p>
                                        </div>
                                    </div>

                                    {/* Download / Print button */}
                                    <button 
                                        type="button"
                                        onClick={() => window.print()}
                                        className="self-start sm:self-auto px-2.5 py-1.5 rounded-lg border border-emerald-500/20 hover:border-emerald-500/50 bg-emerald-950/20 text-emerald-400 hover:text-emerald-300 font-mono text-[9px] font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-md active:scale-95 no-print"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                        </svg>
                                        CETAK LAPORAN
                                    </button>
                                </div>

                                <div className="bg-slate-950/90 border border-slate-900 p-5 rounded-xl shadow-inner max-h-[500px] overflow-y-auto scrollbar-thin">
                                    <div className="text-sm text-slate-300 prose prose-invert prose-emerald max-w-none break-words leading-relaxed selection:bg-emerald-500/20 text-left">
                                        <ReactMarkdown>{diagnosis}</ReactMarkdown>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center justify-between text-[9px] text-slate-500 font-mono border-t border-slate-900/40 pt-3 flex-wrap gap-2">
                                    <span>KLASIFIKASI: SEPARA-AUTOMASI</span>
                                    <span>SISTEM DISOKONG OLEH GEMINI LLM</span>
                                </div>
                            </div>
                        )}

                        {/* AEDES ALBOPICTUS QUICK REFERENCE BOX */}
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 shadow-2xl border-l-4 border-l-white/40 transition-all group"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                    🦟
                                </div>
                                <div>
                                    <h4 className="text-white font-bold font-sci-fi tracking-widest text-sm uppercase">Profil: Aedes albopictus</h4>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
                                        <p className="text-[9px] text-slate-500 font-mono-sci uppercase tracking-widest">Nyamuk Harimau Asia</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/50">
                                    <span className="text-[9px] text-slate-500 font-mono-sci block uppercase mb-1 tracking-tighter">Ciri Diskriminan Utama</span>
                                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                                        Perhatikan <span className="text-white font-black underline decoration-white/40">Satu Garisan Putih Tunggal</span> yang memanjang di tengah-tengah toraks. Ini adalah ciri utama pembeza berbanding <span className="italic text-slate-400">Aedes aegypti</span> (yang mempunyai corak 'Lyre').
                                    </p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-white/5 p-2 rounded border border-white/5">
                                        <span className="text-[8px] text-slate-500 block uppercase font-mono-sci">Habitat</span>
                                        <p className="text-[10px] text-slate-300 font-sans">Kawasan Luar / Vegetasi</p>
                                    </div>
                                    <div className="bg-white/5 p-2 rounded border border-white/5">
                                        <span className="text-[8px] text-slate-500 block uppercase font-mono-sci">Sifat</span>
                                        <p className="text-[10px] text-slate-300 font-sans">Sangat Agresif (Siang)</p>
                                    </div>
                                </div>

                                <div className="p-2 border border-white/5 rounded text-[9px] text-slate-400 font-sans italic leading-tight">
                                    *Vektor utama bagi virus Denggi dan Chikungunya di kawasan pinggir bandar dan luar bandar.
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* ADULT MOSQUITO POSTERS SECTION */}
                <div className="mt-12 pt-8 border-t border-slate-800 relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-lg bg-purple-950/50 border border-purple-500/30 flex items-center justify-center text-xl shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                            🔬
                        </div>
                        <div>
                            <h3 className="text-white font-bold font-sci-fi tracking-widest text-lg uppercase">Arkib Morfologi Vektor (Perbandingan)</h3>
                            <p className="text-[10px] text-slate-500 font-mono-sci uppercase tracking-widest">Manual Entomologi Lapangan (Poster Side-by-side)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Aedes aegypti Poster */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-white font-sci-fi uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                    AEDES AEGYPTI (UTAMA)
                                </h4>
                                <a 
                                    href={AEGYPTI_POSTER_URL} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[9px] bg-slate-800 hover:bg-slate-700 text-purple-400 border border-slate-700 px-3 py-1 rounded font-mono-sci uppercase transition-colors"
                                >
                                    FULL SIZE
                                </a>
                            </div>
                            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl overflow-hidden p-2 group">
                                <div className="relative aspect-[16/10] bg-slate-900 rounded-xl overflow-hidden">
                                    <ImageMagnifier 
                                        src={AEGYPTI_POSTER_URL} 
                                        alt="Poster Aedes aegypti"
                                        zoomLevel={2.5}
                                        imageClassName="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                                        className="w-full h-full flex items-center justify-center"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent pointer-events-none"></div>
                                </div>
                            </div>
                        </div>

                        {/* Aedes albopictus Poster */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-white font-sci-fi uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
                                    AEDES ALBOPICTUS (HUTAN)
                                </h4>
                                <a 
                                    href={ALBOPICTUS_POSTER_URL} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 px-3 py-1 rounded font-mono-sci uppercase transition-colors"
                                >
                                    FULL SIZE
                                </a>
                            </div>
                            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl overflow-hidden p-2 group">
                                <div className="relative aspect-[16/10] bg-slate-900 rounded-xl overflow-hidden">
                                    <ImageMagnifier 
                                        src={ALBOPICTUS_POSTER_URL} 
                                        alt="Poster Aedes albopictus"
                                        zoomLevel={2.5}
                                        imageClassName="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                                        className="w-full h-full flex items-center justify-center"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent pointer-events-none"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 p-4 bg-purple-950/10 border border-purple-900/20 rounded-xl flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                            📌
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                            <strong className="text-purple-400 uppercase tracking-tighter block mb-1">PRO-TIP ENTOMOLOGI:</strong> Perhatikan perbezaan <span className="text-white italic">Scutum</span> (toraks) di antara kedua-dua spesies. <span className="text-white">Aegypti</span> mempunyai corak lyre yang kompleks manakala <span className="text-white">Albopictus</span> mempunyai satu garisan putih tunggal yang sangat jelas. Gunakan perbandingan visual ini jika keputusan AI menunjukkan keyakinan (confidence) yang rendah.
                        </p>
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

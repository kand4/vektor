import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import { analyzeAdultMosquito } from '../services/geminiService';

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
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [predictions, setPredictions] = useState<Prediction[] | null>(null);
    const [dragPositions, setDragPositions] = useState<{[key: number]: {x: number, y: number}}>({});
    const [activeId, setActiveId] = useState<number | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [diagnosis, setDiagnosis] = useState<string | null>(null);
    const [isGeneratingDiagnosis, setIsGeneratingDiagnosis] = useState(false);
    const [imageDimensions, setImageDimensions] = useState<{naturalWidth: number, naturalHeight: number} | null>(null);
    
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
             setError(err.message || 'Ralat semasa membuat imbasan forensik AI.');
        } finally {
             setIsScanning(false);
        }
    };

    return (
        <div className="w-full flex justify-center py-6">
            <div className="max-w-4xl w-full bg-slate-900/80 border border-slate-700/50 rounded-xl p-6 backdrop-blur shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-sci-fi text-cyan-400 uppercase tracking-widest mb-1 shadow-cyan-500/20 drop-shadow-lg">Pengesan Nyamuk Dewasa Forensik</h2>
                        <p className="text-sm text-slate-400 font-mono-sci">Powered by Gemini Vision Forensic AI</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded text-red-300 font-mono text-sm max-w-2xl">
                        ⚠️ ralat: {error}
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
                                <div className="text-center p-6">
                                    <p className="text-sm text-slate-300 font-bold mb-1">Klik atau heret gambar nyamuk dewasa</p>
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
                                                {/* Similar overlay logic as LarvaeScanner */}
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
                            {isScanning ? 'MENGANALISA FOSILS/MORFOLOGI...' : 'IMBASAN FORENSIK ULTRA'}
                        </button>
                    </div>
                    
                    <div className="w-full md:w-80 flex flex-col gap-6">
                        {diagnosis && (
                            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-5 overflow-y-auto max-h-[400px]">
                                <h3 className="text-emerald-400 font-bold mb-3 font-sci-fi tracking-wide text-sm">LAPORAN FORENSIK AI</h3>
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

export default AdultMosquitoScanner;

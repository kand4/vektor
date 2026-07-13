import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface GBIFPanelProps {
    speciesName: string;
}

const GBIFDataPanel: React.FC<GBIFPanelProps> = ({ speciesName }) => {
    const [data, setData] = useState<any>(null);
    const [occurrenceCount, setOccurrenceCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchGBIF = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. Get species match
                const matchRes = await fetch(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(speciesName)}`);
                const matchData = await matchRes.json();

                if (matchData.usageKey) {
                    setData(matchData);
                    // 2. Get occurence counts
                    const countRes = await fetch(`https://api.gbif.org/v1/occurrence/search?taxonKey=${matchData.usageKey}&limit=0`);
                    const countData = await countRes.json();
                    setOccurrenceCount(countData.count);
                } else {
                    setError("SPESIES TIDAK DIJUMPAI DLM PANGKALAN GBIF");
                }
            } catch (err) {
                setError("GAGAL MENGHUBUNGI PELAYAN GBIF");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (speciesName) {
            fetchGBIF();
        }
    }, [speciesName]);

    return (
        <div className="bg-slate-900 border border-emerald-900/50 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.05)] relative p-4">
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(16,185,129,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:20px_20px] z-0"></div>
            
            <div className="relative z-10 flex items-center justify-between mb-4 border-b border-emerald-900/50 pb-2">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <h3 className="font-sci-fi text-emerald-400 text-sm tracking-widest uppercase">
                        GBIF GLOBAL DATABASE
                    </h3>
                </div>
                <div className="text-[10px] font-mono text-emerald-600 border border-emerald-900 rounded px-1.5 py-0.5 bg-emerald-950/30">
                    OPEN API
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                    <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-emerald-500 animate-spin"></div>
                    <p className="text-emerald-500/70 font-mono text-xs animate-pulse tracking-widest">MEMUAT TURUN DATA BIODIVERSITI GLOBAL...</p>
                </div>
            ) : error ? (
                <div className="py-4 text-center">
                    <p className="text-red-400 font-mono text-xs">{error}</p>
                </div>
            ) : data ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg">
                            <span className="block text-[10px] text-slate-500 font-mono uppercase mb-1">Taksonomi Carian</span>
                            <span className="block text-emerald-300 font-bold italic tracking-wide">{data.scientificName}</span>
                            <div className="flex flex-wrap gap-1 mt-2">
                                <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[9px] font-mono">{data.kingdom}</span>
                                <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[9px] font-mono">{data.phylum}</span>
                                <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[9px] font-mono">{data.class}</span>
                                <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[9px] font-mono">{data.order}</span>
                                <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[9px] font-mono">{data.family}</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg h-full flex flex-col justify-center">
                            <span className="block text-[10px] text-slate-500 font-mono uppercase mb-1">Rekod Penemuan Global (GBIF)</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl sm:text-3xl font-sci-fi text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                                    {occurrenceCount?.toLocaleString() || '---'}
                                </span>
                                <span className="text-[10px] text-cyan-700 font-mono">REKOD</span>
                            </div>
                            <a 
                                href={`https://www.gbif.org/species/${data.usageKey}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="mt-3 inline-flex items-center gap-1 text-[10px] font-mono text-emerald-500 hover:text-emerald-300 transition-colors"
                            >
                                LIHAT PETA TABURAN GLOBAL 
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default GBIFDataPanel;

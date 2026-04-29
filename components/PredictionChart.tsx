
import React from 'react';
import { iDengueData, RegionalDengueData } from '../types';

interface PredictionChartProps {
    preloadedNational?: iDengueData | null;
    preloadedRegional?: RegionalDengueData | null;
    isLoading?: boolean;
}

const IDengueLink: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
    <a 
        href="https://idengue.mysa.gov.my/" 
        target="_blank" 
        rel="noopener noreferrer" 
        className={`block hover:scale-[1.01] transition-transform group/link ${className}`}
    >
        {children}
    </a>
);

export const PredictionChart: React.FC<PredictionChartProps> = ({ 
    preloadedNational, 
    preloadedRegional, 
    isLoading 
}) => {
    
    if (isLoading && !preloadedNational) {
        return (
            <div className="space-y-4">
                <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl h-48 flex flex-col items-center justify-center text-slate-500">
                    <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div className="font-mono-sci text-[10px] animate-pulse tracking-widest uppercase">Mengkaji Data iDengue MYSA (Minggu Epidemiologi)...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            
            {/* 1. NATIONAL INTELLIGENCE HUB */}
            {preloadedNational && (
                <div className="bg-slate-950 border border-emerald-500/30 rounded-xl overflow-hidden shadow-2xl relative group">
                    <div className="bg-emerald-900/20 border-b border-emerald-500/20 p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            <h4 className="text-xs font-sci-fi font-black text-emerald-400 tracking-[0.2em] uppercase">
                                INTELLIGENCE NASIONAL <span className="text-white text-[10px] ml-2 font-mono-sci">[{preloadedNational.epidemiologicalWeek}]</span>
                            </h4>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="text-[9px] font-mono-sci text-emerald-500/50 uppercase">SUMBER: idengue.mysa.gov.my</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                        <IDengueLink className="p-6 flex flex-col items-center text-center hover:bg-emerald-500/5">
                            <span className="text-[9px] font-mono-sci text-slate-500 uppercase mb-1 tracking-widest">Kes Kumulatif (Kebangsaan)</span>
                            <div className="text-3xl font-black text-white font-mono-sci">
                                {preloadedNational.cumulativeCases.toLocaleString()}
                            </div>
                            <span className="text-[8px] text-emerald-500 mt-2 border border-emerald-500/30 px-2 py-0.5 rounded">SAHKAN DI PORTAL ↗</span>
                        </IDengueLink>
                        
                        <IDengueLink className="p-6 flex flex-col items-center text-center hover:bg-red-500/5">
                            <span className="text-[9px] font-mono-sci text-slate-500 uppercase mb-1 tracking-widest">Kematian Kumulatif</span>
                            <div className="text-3xl font-black text-red-500 font-mono-sci">
                                {preloadedNational.cumulativeDeaths.toLocaleString()}
                            </div>
                            <span className="text-[8px] text-red-500 mt-2 border border-red-500/30 px-2 py-0.5 rounded">SEMAK STATUS MAUT ↗</span>
                        </IDengueLink>

                        <IDengueLink className="p-6 flex flex-col items-center text-center hover:bg-amber-500/5">
                            <span className="text-[9px] font-mono-sci text-slate-500 uppercase mb-1 tracking-widest">Hotspot Aktif (Nasional)</span>
                            <div className="text-3xl font-black text-amber-500 font-mono-sci">
                                {preloadedNational.activeHotspots.toLocaleString()}
                            </div>
                            <span className="text-[8px] text-amber-500 mt-2 border border-amber-500/30 px-2 py-0.5 rounded">LIHAT PETA HOTSPOT ↗</span>
                        </IDengueLink>
                    </div>
                </div>
            )}

            {/* 2. REGIONAL SPOTLIGHT: PAHANG & TEMERLOH */}
            {preloadedRegional && (
                <div className="bg-slate-950 border border-cyan-500/30 rounded-xl overflow-hidden shadow-2xl relative group border-l-4">
                    <div className="bg-cyan-900/20 border-b border-cyan-500/20 p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
                            <h4 className="text-xs font-sci-fi font-black text-cyan-400 tracking-[0.2em] uppercase">
                                SPOTLIGHT: {preloadedRegional.stateName} & {preloadedRegional.districtName} <span className="text-slate-400 text-[10px] ml-2 font-mono-sci">[{preloadedRegional.epidemiologicalWeek}]</span>
                            </h4>
                        </div>
                        <span className="text-[9px] font-mono-sci text-cyan-500/50 uppercase">DATA RASMI MYSA</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                        <IDengueLink className="p-6 flex flex-col items-center text-center hover:bg-cyan-500/5">
                            <span className="text-[9px] font-mono-sci text-slate-500 uppercase mb-1 tracking-widest">Kes Negeri {preloadedRegional.stateName}</span>
                            <div className="text-3xl font-black text-cyan-300 font-mono-sci">{preloadedRegional.stateCases.toLocaleString()}</div>
                            <span className="text-[8px] text-cyan-500 mt-2">TREND NEGERI ↗</span>
                        </IDengueLink>

                        <IDengueLink className="p-6 flex flex-col items-center text-center hover:bg-slate-800">
                            <span className="text-[9px] font-mono-sci text-slate-500 uppercase mb-1 tracking-widest">Kes Daerah {preloadedRegional.districtName}</span>
                            <div className="text-3xl font-black text-white font-mono-sci">{preloadedRegional.districtCases.toLocaleString()}</div>
                            <span className="text-[8px] text-slate-400 mt-2">TREND DAERAH ↗</span>
                        </IDengueLink>

                        <IDengueLink className="p-6 flex flex-col items-center text-center hover:bg-red-500/5">
                            <span className="text-[9px] font-mono-sci text-slate-500 uppercase mb-1 tracking-widest">Hotspot {preloadedRegional.districtName}</span>
                            <div className={`text-3xl font-black font-mono-sci ${preloadedRegional.districtHotspots > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {preloadedRegional.districtHotspots.toLocaleString()}
                            </div>
                            <span className="text-[8px] text-red-400 mt-2">ZON BAHAYA ↗</span>
                        </IDengueLink>
                    </div>

                    <div className="bg-black/50 p-4 border-t border-slate-800 flex flex-col md:flex-row items-center gap-4">
                        <div className="flex items-center gap-3 shrink-0">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black font-mono-sci border ${
                                preloadedRegional.districtRiskLevel === 'EXTREME' || preloadedRegional.districtRiskLevel === 'HIGH' 
                                ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' 
                                : 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                            }`}>
                                {preloadedRegional.districtRiskLevel}
                            </div>
                            <div>
                                <div className="text-[9px] font-mono-sci text-slate-400 uppercase">Tahap Risiko Semasa</div>
                                <div className="text-xs font-bold text-white uppercase">{preloadedRegional.districtRiskLevel} RISK STATUS</div>
                            </div>
                        </div>
                        <div className="flex-1">
                             <div className="text-[11px] text-cyan-200/80 italic font-mono-sci leading-relaxed border-l-2 border-cyan-500/30 pl-3">
                                "{preloadedRegional.localAdvice}"
                             </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                             <a 
                                href="https://idengue.mysa.gov.my/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-emerald-400 hover:text-white transition-colors underline decoration-emerald-500/30"
                             >
                                Semak iDengue Secara Manual
                             </a>
                             <span className="text-[8px] font-mono-sci text-slate-600 uppercase">SYNC_MODE: EPID_WEEKLY</span>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="text-center">
                <p className="text-[10px] font-mono-sci text-slate-600 uppercase">
                    Penafian: Data diekstrak secara automatik dari iDengue MYSA mengikut Minggu Epidemiologi (ME) terkini yang dikesan.
                </p>
            </div>
        </div>
    );
};

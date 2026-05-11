
import React from 'react';
import { iDengueData, RegionalDengueData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface PredictionChartProps {
    preloadedNational?: iDengueData | null;
    preloadedRegional?: RegionalDengueData | null;
    isLoading?: boolean;
    onSync?: () => void;
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
    isLoading,
    onSync
}) => {
    const { t } = useLanguage();
    
    if (isLoading && !preloadedNational) {
        return (
            <div className="space-y-4">
                <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl h-48 flex flex-col items-center justify-center text-slate-500">
                    <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <div className="font-mono-sci text-[10px] animate-pulse tracking-widest uppercase">{t('analyzing_history')}</div>
                    <div className="text-[8px] text-emerald-500/50 mt-2">LINKING TO IDENGUE PORTAL...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></div>
                    <span className="text-[10px] font-mono-sci text-emerald-500 uppercase tracking-widest font-bold">LIVE_DENGUE_FEED_v3.1</span>
                </div>
                {preloadedNational && (
                    <button 
                        onClick={onSync}
                        disabled={isLoading}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded bg-slate-800 border border-emerald-500/30 text-[10px] font-mono-sci text-emerald-400 hover:bg-emerald-500/10 transition-all ${isLoading ? 'opacity-50 cursor-wait' : 'active:scale-95'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        {isLoading ? 'SYNCING...' : 'SYNC_PLATFORM'}
                    </button>
                )}
            </div>

            {!preloadedNational && !preloadedRegional && (
                <div className="bg-slate-900 border border-slate-700 border-dashed rounded-xl overflow-hidden p-8 flex flex-col items-center justify-center space-y-4 shadow-inner">
                    <div className="text-emerald-500/50 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                    </div>
                    <div className="text-center space-y-2 max-w-sm">
                        <h3 className="text-slate-300 font-bold font-sci-fi tracking-wider text-sm">SEMAKAN LOKALITI DENGGI</h3>
                        <p className="text-xs text-slate-500">
                            Sistem sedia memuat turun data secara berperingkat untuk memastikan kestabilan dan menjimatkan limit rate API.
                        </p>
                    </div>
                    <button 
                        onClick={onSync}
                        disabled={isLoading}
                        className={`mt-4 flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600/20 border border-emerald-500 text-sm font-bold text-emerald-400 hover:bg-emerald-600/30 transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] ${isLoading ? 'opacity-50 cursor-wait' : 'active:scale-95 hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        {isLoading ? 'SEDANG MEMUAT...' : 'PAPAR DATA LOKALITI & KES'}
                    </button>
                </div>
            )}

            {/* 1. NATIONAL INTELLIGENCE HUB */}
            {preloadedNational && (
                <div className="bg-slate-950 border border-emerald-500/30 rounded-xl overflow-hidden shadow-2xl relative group">
                    <div className="bg-emerald-900/20 border-b border-emerald-500/20 p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            <h4 className="text-xs font-sci-fi font-black text-emerald-400 tracking-[0.2em] uppercase">
                                {t('intel_national_title')} <span className="text-white text-[10px] ml-2 font-mono-sci">[{preloadedNational.epidemiologicalWeek}]</span>
                            </h4>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="text-[9px] font-mono-sci text-emerald-500/50 uppercase">{t('citation_source')}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                        <IDengueLink className="p-6 flex flex-col items-center text-center hover:bg-emerald-500/5">
                            <span className="text-[9px] font-mono-sci text-slate-500 uppercase mb-1 tracking-widest">{t('nat_cumulative_cases')}</span>
                            <div className="text-3xl font-black text-white font-mono-sci">
                                {preloadedNational.cumulativeCases.toLocaleString()}
                            </div>
                            <span className="text-[8px] text-emerald-500 mt-2 border border-emerald-500/30 px-2 py-0.5 rounded">{t('portal_verify')} ↗</span>
                        </IDengueLink>
                        
                        <IDengueLink className="p-6 flex flex-col items-center text-center hover:bg-red-500/5">
                            <span className="text-[9px] font-mono-sci text-slate-500 uppercase mb-1 tracking-widest">{t('nat_cumulative_deaths')}</span>
                            <div className="text-3xl font-black text-red-500 font-mono-sci">
                                {preloadedNational.cumulativeDeaths.toLocaleString()}
                            </div>
                            <span className="text-[8px] text-red-500 mt-2 border border-red-500/30 px-2 py-0.5 rounded">{t('check_death_status')} ↗</span>
                        </IDengueLink>

                        <IDengueLink className="p-6 flex flex-col items-center text-center hover:bg-amber-500/5">
                            <span className="text-[9px] font-mono-sci text-slate-500 uppercase mb-1 tracking-widest">{t('nat_active_hotspots')}</span>
                            <div className="text-3xl font-black text-amber-500 font-mono-sci">
                                {preloadedNational.activeHotspots.toLocaleString()}
                            </div>
                            <span className="text-[8px] text-amber-500 mt-2 border border-amber-500/30 px-2 py-0.5 rounded">{t('view_hotspot_map')} ↗</span>
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
                                {t('regional_spotlight')}: {preloadedRegional.stateName} & {preloadedRegional.districtName} <span className="text-slate-400 text-[10px] ml-2 font-mono-sci">[{preloadedRegional.epidemiologicalWeek}]</span>
                            </h4>
                        </div>
                        <span className="text-[9px] font-mono-sci text-cyan-500/50 uppercase">{t('official_mysa_data')}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                        <IDengueLink className="p-6 flex flex-col items-center text-center hover:bg-cyan-500/5">
                            <span className="text-[9px] font-mono-sci text-slate-500 uppercase mb-1 tracking-widest">{t('state_cases')} {preloadedRegional.stateName}</span>
                            <div className="text-3xl font-black text-cyan-300 font-mono-sci">{preloadedRegional.stateCases.toLocaleString()}</div>
                            <span className="text-[8px] text-cyan-500 mt-2">{t('state_trend')} ↗</span>
                        </IDengueLink>

                        <IDengueLink className="p-6 flex flex-col items-center text-center hover:bg-slate-800">
                            <span className="text-[9px] font-mono-sci text-slate-500 uppercase mb-1 tracking-widest">{t('district_cases')} {preloadedRegional.districtName}</span>
                            <div className="text-3xl font-black text-white font-mono-sci">{preloadedRegional.districtCases.toLocaleString()}</div>
                            <span className="text-[8px] text-slate-400 mt-2">{t('district_trend')} ↗</span>
                        </IDengueLink>

                        <IDengueLink className="p-6 flex flex-col items-center text-center hover:bg-red-500/5">
                            <span className="text-[9px] font-mono-sci text-slate-500 uppercase mb-1 tracking-widest">{t('district_hotspot')} {preloadedRegional.districtName}</span>
                            <div className={`text-3xl font-black font-mono-sci ${preloadedRegional.districtHotspots > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {preloadedRegional.districtHotspots.toLocaleString()}
                            </div>
                            <span className="text-[8px] text-red-400 mt-2">{t('danger_zone')} ↗</span>
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
                                <div className="text-[9px] font-mono-sci text-slate-400 uppercase">{t('current_risk_level')}</div>
                                <div className="text-xs font-bold text-white uppercase">{preloadedRegional.districtRiskLevel} {t('risk_status')}</div>
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
                                {t('check_manual')}
                             </a>
                             <span className="text-[8px] font-mono-sci text-slate-600 uppercase">SYNC_MODE: EPID_WEEKLY</span>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="text-center">
                <p className="text-[10px] font-mono-sci text-slate-600 uppercase">
                    {t('disclaimer_data')}
                </p>
            </div>
        </div>
    );
};

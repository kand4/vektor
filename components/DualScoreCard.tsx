import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export const DualScoreCard: React.FC<{ hygieneLevel: number, safetyLevel: number, isSavage: boolean }> = ({ hygieneLevel, safetyLevel, isSavage }) => {
    const { t } = useLanguage();
    const safeLevel = safetyLevel || hygieneLevel;
    const getColor = (level: number) => {
        if (level >= 4) return 'text-emerald-400 border-emerald-500';
        if (level === 3) return 'text-yellow-400 border-yellow-500';
        return 'text-red-500 border-red-500';
    };

    return (
        <div className="w-full relative overflow-hidden rounded-xl border border-slate-700 bg-slate-900/80 p-4 md:p-6 shadow-xl mb-4 transition-all duration-500">
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
             <div className="relative z-10 grid grid-cols-2 gap-4 md:gap-8 divide-x divide-slate-700">
                 <div className="flex flex-col items-center justify-center text-center">
                     <div className="text-[10px] font-mono-sci uppercase tracking-widest text-slate-400 mb-2">{t('label_hygiene')}</div>
                     <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full border-4 flex items-center justify-center bg-black/20 backdrop-blur mb-2 ${getColor(hygieneLevel)}`}>
                        <span className="text-xl md:text-3xl font-bold font-sci-fi">{hygieneLevel}</span>
                        <span className="text-[10px] opacity-60 mb-2">/5</span>
                     </div>
                 </div>
                 <div className="flex flex-col items-center justify-center text-center pl-4 md:pl-8">
                     <div className="text-[10px] font-mono-sci uppercase tracking-widest text-slate-400 mb-2">{t('label_safety')}</div>
                     <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full border-4 flex items-center justify-center bg-black/20 backdrop-blur mb-2 ${getColor(safeLevel)}`}>
                        <span className="text-xl md:text-3xl font-bold font-sci-fi">{safeLevel}</span>
                        <span className="text-[10px] opacity-60 mb-2">/5</span>
                     </div>
                 </div>
             </div>
             <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                 <span className={`text-xs md:text-sm font-sci-fi font-bold uppercase tracking-widest ${Math.min(hygieneLevel, safeLevel) < 3 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                     {isSavage ? `${t('verdict_honest')}: ` : `${t('verdict_status')}: `} 
                     {Math.min(hygieneLevel, safeLevel) === 1 ? t('status_closure') : Math.min(hygieneLevel, safeLevel) === 2 ? t('status_notice') : t('status_compliant')}
                 </span>
             </div>
        </div>
    );
};

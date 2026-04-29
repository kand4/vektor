
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface FooterProps {
  onOpenAbout?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onOpenAbout }) => {
  const { t } = useLanguage();
  return (
    <footer className="w-full border-t border-slate-800 bg-slate-950 py-6 mt-12 relative z-50">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-2">
           <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
           <span className="text-[10px] md:text-xs font-mono-sci text-emerald-600/70 tracking-[0.2em]">
             SECURE_TERMINAL_V2.5
           </span>
        </div>

        <div className="text-center md:text-right">
           <p className="text-[10px] md:text-xs font-mono-sci text-slate-500 tracking-widest uppercase cursor-default">
             {t('system_architect')}: 
             <button 
               onClick={onOpenAbout}
               className="ml-2 text-slate-300 font-bold hover:text-emerald-400 hover:underline decoration-emerald-500/50 underline-offset-4 transition-all"
             >
               PKAK MAIL
             </button> 
             <span className="mx-2 text-slate-700">|</span> 
             EST. 2025
             <span className="ml-1 animate-pulse">_</span>
           </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

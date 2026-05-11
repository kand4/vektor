
import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import DebugLogsModal from './DebugLogsModal';

interface FooterProps {
  onOpenAbout?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onOpenAbout }) => {
  const { t } = useLanguage();
  const [clicks, setClicks] = useState(0);
  const [showLogs, setShowLogs] = useState(false);

  const handleSecretClick = () => {
      setClicks(c => c + 1);
      if (clicks >= 4) { // 5th click
          setShowLogs(true);
          setClicks(0);
      }
  };

  return (
    <>
    <footer className="w-full border-t border-slate-800 bg-slate-950 py-6 mt-12 relative z-50">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div 
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={handleSecretClick}
            title="Sistem Diagnosis Tersembunyi (Klik 5 kali log ralat)"
        >
           <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
           <span className="text-[10px] md:text-xs font-mono-sci text-emerald-600/70 tracking-[0.2em] relative">
             SECURE_TERMINAL_V2.5
             {clicks > 0 && <span className="absolute -top-4 -right-4 text-[8px] text-slate-600">[{clicks}]</span>}
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
    <DebugLogsModal isOpen={showLogs} onClose={() => setShowLogs(false)} />
    </>
  );
};

export default Footer;


import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../constants/translations';

interface HeaderProps {
  onOpenAbout?: () => void;
  onGoHome?: () => void; 
}

const Header: React.FC<HeaderProps> = ({ onOpenAbout, onGoHome }) => {
  const { language, setLanguage, t } = useLanguage();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'ms', label: 'BM', flag: '🇲🇾' },
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
    { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
  ];

  return (
    <header className="fixed w-full top-0 z-50 border-b border-emerald-900/30 bg-slate-950/80 backdrop-blur-md transition-all duration-300 h-16 md:h-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        
        {/* Logo Section - Primary Home Navigation */}
        <div 
          className="flex items-center gap-2 md:gap-4 overflow-hidden cursor-pointer group hover:opacity-100 active:scale-95 transition-all origin-left pr-4" 
          onClick={onGoHome}
          title={t('nav_home')}
        >
          <div className="relative w-8 h-8 md:w-12 md:h-12 flex items-center justify-center shrink-0">
             <div className="absolute inset-0 bg-emerald-500/20 animate-pulse rounded-full blur-sm group-hover:bg-emerald-500/40 transition"></div>
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-9 md:h-9 text-emerald-400 relative z-10 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">
               <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
             </svg>
          </div>
          
          <div className="flex flex-col justify-center overflow-hidden">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl md:text-3xl font-sci-fi font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 drop-shadow-sm leading-tight truncate group-hover:from-white group-hover:to-emerald-400 transition-all">
                VECTOR<span className="text-slate-100">GUARD</span>.AI
              </h1>
              {/* Home Indicator */}
              <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-emerald-400">
                  <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                  <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875h-3.504a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75v4.5a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
               <span className="w-1 h-1 md:w-2 md:h-2 bg-red-500 rounded-full animate-ping shrink-0"></span>
               <p className="text-[9px] md:text-sm text-emerald-500 font-mono-sci tracking-[0.1em] md:tracking-[0.2em] uppercase truncate">
                 {t('app_subtitle')}
               </p>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3 md:gap-6">
           {/* Home Link explicitly for Mobile */}
           <button 
              onClick={onGoHome} 
              className="md:hidden flex items-center justify-center w-8 h-8 rounded border border-slate-700 bg-slate-900 active:bg-emerald-500 active:border-emerald-400 transition-colors"
           >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875h-3.504a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75v4.5a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
              </svg>
           </button>

           {/* Language Selector */}
           <div className="relative">
              <button 
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} 
                className="flex items-center gap-1 md:gap-2 bg-slate-900 border border-slate-700 px-2 py-1 md:px-3 md:py-1.5 rounded hover:border-emerald-500 transition-colors"
              >
                  <span className="text-sm md:text-base">{languages.find(l => l.code === language)?.flag}</span>
                  <span className="text-[10px] md:text-xs font-bold text-slate-300">{languages.find(l => l.code === language)?.label}</span>
              </button>
              
              {isLangMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsLangMenuOpen(false)}></div>
                  <div className="absolute right-0 top-full mt-2 w-32 bg-slate-900 border border-emerald-500/30 rounded-lg shadow-xl overflow-hidden z-20 flex flex-col">
                      {languages.map((lang) => (
                        <button 
                          key={lang.code}
                          onClick={() => { setLanguage(lang.code); setIsLangMenuOpen(false); }}
                          className={`flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800 transition-colors ${language === lang.code ? 'bg-emerald-900/30 text-emerald-400' : 'text-slate-300'}`}
                        >
                           <span>{lang.flag}</span>
                           <span className="text-xs font-bold">{lang.label}</span>
                        </button>
                      ))}
                  </div>
                </>
              )}
           </div>

           <div className="hidden md:block h-8 w-px bg-slate-700"></div>

           {/* About Button */}
           <button onClick={onOpenAbout} className="hidden md:flex items-center gap-2 group">
             <div className="w-8 h-8 rounded border border-slate-600 flex items-center justify-center bg-slate-900 group-hover:border-emerald-500 group-hover:bg-emerald-900/20 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-emerald-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
             </div>
             <div className="text-right hidden lg:block">
                <div className="text-[10px] text-slate-500 font-mono-sci group-hover:text-emerald-400 transition-colors">SYSTEM</div>
                <div className="text-xs text-white font-bold font-sci-fi tracking-widest">{t('nav_about')}</div>
             </div>
           </button>

           {/* Mobile About Icon */}
           <div className="md:hidden flex items-center gap-3">
             <button onClick={onOpenAbout} className="text-[10px] text-emerald-400 font-sci-fi border border-emerald-500/30 px-3 py-1.5 rounded bg-emerald-900/20 active:bg-emerald-500 active:text-white transition-colors">
               INFO
             </button>
           </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

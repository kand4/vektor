
import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../constants/translations';
import { useDeviceDetect } from '../utils/deviceDetect';

interface HeaderProps {
  onOpenAbout?: () => void;
  onOpenSettings?: () => void;
  onGoHome?: () => void;
  onGoLarvae?: () => void;
  onGoAdult?: () => void;
  onGoGame?: () => void;
  currentView?: 'HOME' | 'LARVAE_DETECTION' | 'ADULT_MOSQUITO_DETECTION' | 'MANUAL_SIMULATION' | 'GAME';
}

const Header: React.FC<HeaderProps> = ({ onOpenAbout, onOpenSettings, onGoHome, onGoLarvae, onGoAdult, onGoGame, currentView = 'HOME' }) => {
  const { language, setLanguage, t } = useLanguage();
  const { isMobile, isDesktop } = useDeviceDetect();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error("Error attempting to toggle fullscreen:", err);
    }
  };

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'ms', label: 'BM', flag: '🇲🇾' },
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
    { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
  ];

  return (
    <header className="fixed w-full top-0 z-[150] border-b border-emerald-900/30 bg-slate-950/85 backdrop-blur-md transition-all duration-300 h-16 md:h-20">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        
        {/* Logo Section - Primary Home Navigation */}
        <div 
          className="flex items-center gap-1.5 sm:gap-2 md:gap-3 overflow-hidden cursor-pointer group hover:opacity-100 active:scale-95 transition-all origin-left sm:pr-4" 
          onClick={onGoHome}
          title={t('nav_home')}
        >
          <div className="relative w-8 h-8 md:w-11 md:h-11 flex items-center justify-center shrink-0">
             <div className="absolute inset-0 bg-emerald-500/20 animate-pulse rounded-full blur-sm group-hover:bg-emerald-500/40 transition"></div>
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-8 md:h-8 text-emerald-400 relative z-10 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">
               {/* Shield */}
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
               {/* Mosquito/Bug inside */}
               <circle cx="12" cy="11" r="2.5" />
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.5v-2 M12 13.5v2 M9.5 11h-2 M16.5 11h2 M10.5 9.5l-1.5-1.5 M13.5 9.5l1.5-1.5 M10.5 12.5l-1.5 1.5 M13.5 12.5l1.5 1.5" />
             </svg>
          </div>
          
          <div className="flex flex-col justify-center overflow-hidden min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[13px] sm:text-xl md:text-2xl font-sci-fi font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 drop-shadow-sm leading-tight truncate group-hover:from-white group-hover:to-emerald-400 transition-all whitespace-nowrap">
                VECTOR<span className="text-slate-100">GUARD</span><span className="hidden sm:inline">.AI</span>
              </h1>
              
              {/* Device Mode Badge */}
              <span 
                className="text-[9px] font-mono-sci font-bold px-1.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-950/60 text-emerald-400 tracking-wider hidden sm:inline-flex items-center gap-1"
                title={isMobile ? "Papar Khas Mobil Aktif" : "Papar PC Desktop Aktif"}
              >
                {isMobile ? '📱 MOBIL' : '💻 PC'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
               <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping shrink-0"></span>
               <p className="text-[9px] md:text-xs text-emerald-500 font-mono-sci tracking-[0.1em] md:tracking-[0.15em] uppercase truncate whitespace-nowrap">
                 {t('app_subtitle')}
               </p>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-4 shrink-0">
           {/* Mobile Device Smart Indicator */}
           <span className="text-[8px] font-mono-sci font-bold px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 sm:hidden">
              {isMobile ? '📱 MOBIL' : '💻 PC'}
           </span>

           {/* Language Selector */}
           <div className="relative">
              <button 
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} 
                className="flex items-center gap-1 md:gap-2 bg-slate-900 border border-slate-700 px-2 py-1.5 sm:px-2.5 md:px-3 md:py-1.5 rounded hover:border-emerald-500 transition-colors min-h-[36px] sm:min-h-[40px]"
              >
                  <span className="text-xs sm:text-sm md:text-base leading-none">{languages.find(l => l.code === language)?.flag}</span>
                  <span className="text-[10px] md:text-xs font-bold text-slate-300 hidden sm:inline-block leading-none">{languages.find(l => l.code === language)?.label}</span>
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

           {/* Fullscreen Toggle Button */}
          <button 
             onClick={toggleFullscreen} 
             title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
             className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 rounded border border-slate-700 bg-slate-900 hover:border-emerald-500 active:bg-emerald-500 transition-colors text-slate-300 hover:text-emerald-400 min-h-[36px] sm:min-h-[40px] min-w-[36px] sm:min-w-[40px]"
          >
             {isFullscreen ? (
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3 3m12 6V4.5m0 4.5h4.5m-4.5 0l6-6M9 15v4.5M9 15H4.5m4.5 0l-6 6m6-6v4.5m0-4.5h4.5m-4.5 0l6-6" />
               </svg>
             ) : (
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
               </svg>
             )}
          </button>

           {/* Settings Button */}
           <button 
              onClick={onOpenSettings} 
              title="Settings & API Key"
              className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 rounded border border-slate-700 bg-slate-900 hover:border-emerald-500 active:bg-emerald-500 transition-all text-slate-300 hover:text-emerald-400 min-h-[36px] sm:min-h-[40px] min-w-[36px] sm:min-w-[40px]"
           >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
           </button>

           <div className="hidden md:block h-7 w-px bg-slate-700"></div>

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
           <div className="md:hidden flex items-center">
             <button title="Info System" onClick={onOpenAbout} className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 rounded border border-emerald-500/30 bg-emerald-900/20 text-emerald-400 active:bg-emerald-500 active:text-white transition-colors min-h-[36px] sm:min-h-[40px] min-w-[36px] sm:min-w-[40px]">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
             </button>
           </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

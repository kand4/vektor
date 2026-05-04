
import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../constants/translations';

interface HeaderProps {
  onOpenAbout?: () => void;
  onOpenSettings?: () => void;
  onGoHome?: () => void;
  onGoLarvae?: () => void;
  onGoAdult?: () => void;
  currentView?: 'HOME' | 'LARVAE_DETECTION' | 'ADULT_MOSQUITO_DETECTION';
}

const Header: React.FC<HeaderProps> = ({ onOpenAbout, onOpenSettings, onGoHome, onGoLarvae, onGoAdult, currentView = 'HOME' }) => {
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
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        
        {/* Logo Section - Primary Home Navigation */}
        <div 
          className="flex items-center gap-1.5 sm:gap-2 md:gap-4 overflow-hidden cursor-pointer group hover:opacity-100 active:scale-95 transition-all origin-left sm:pr-4" 
          onClick={onGoHome}
          title={t('nav_home')}
        >
          <div className="relative w-8 h-8 md:w-12 md:h-12 flex items-center justify-center shrink-0">
             <div className="absolute inset-0 bg-emerald-500/20 animate-pulse rounded-full blur-sm group-hover:bg-emerald-500/40 transition"></div>
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-9 md:h-9 text-emerald-400 relative z-10 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">
               {/* Shield */}
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
               {/* Mosquito/Bug inside */}
               <circle cx="12" cy="11" r="2.5" />
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.5v-2 M12 13.5v2 M9.5 11h-2 M16.5 11h2 M10.5 9.5l-1.5-1.5 M13.5 9.5l1.5-1.5 M10.5 12.5l-1.5 1.5 M13.5 12.5l1.5 1.5" />
             </svg>
          </div>
          
          <div className="flex flex-col justify-center overflow-hidden min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[13px] sm:text-xl md:text-3xl font-sci-fi font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 drop-shadow-sm leading-tight truncate group-hover:from-white group-hover:to-emerald-400 transition-all">
                VECTOR<span className="text-slate-100">GUARD</span><span className="hidden sm:inline">.AI</span>
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
        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-6 shrink-0">
           {/* Desktop Nav Items */}
           {/* Removed to be relocated to main screen */}

           {/* Language Selector */}
           <div className="relative">
              <button 
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} 
                className="flex items-center gap-1 md:gap-2 bg-slate-900 border border-slate-700 px-1.5 py-1 sm:px-2 md:px-3 md:py-1.5 rounded hover:border-emerald-500 transition-colors"
              >
                  <span className="text-[10px] sm:text-sm md:text-base leading-none">{languages.find(l => l.code === language)?.flag}</span>
                  <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-slate-300 hidden sm:inline-block leading-none">{languages.find(l => l.code === language)?.label}</span>
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

           {/* Settings Button */}
           <button 
              onClick={onOpenSettings} 
              title="Settings & API Key"
              className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 rounded border border-slate-700 bg-slate-900 hover:border-emerald-500 active:bg-emerald-500 transition-all text-slate-300 hover:text-emerald-400"
           >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
           </button>

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
           <div className="md:hidden flex items-center">
             <button title="Info System" onClick={onOpenAbout} className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 rounded border border-emerald-500/30 bg-emerald-900/20 text-emerald-400 active:bg-emerald-500 active:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
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

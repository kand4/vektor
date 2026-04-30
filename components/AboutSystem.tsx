import React, { useState } from 'react';

interface AboutSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutSystem: React.FC<AboutSystemProps> = ({ isOpen, onClose }) => {
  return (
    <div 
      className={`fixed inset-0 z-[100] transition-transform duration-700 ease-in-out flex flex-col ${isOpen ? 'translate-y-0' : '-translate-y-full'}`}
    >
      {/* Glass Backdrop */}
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"></div>
      
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_20px_#10b981]"></div>
      <div className="absolute bottom-0 left-0 w-full h-px bg-slate-800"></div>

      {/* Main Content Container */}
      <div className="relative flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 flex flex-col items-center">
        
        {/* Close Button */}
        <button 
            onClick={onClose}
            className="absolute top-6 right-6 md:top-10 md:right-10 group flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
            <span className="text-xs font-mono-sci tracking-widest uppercase group-hover:text-red-400 transition-colors">Close_Terminal</span>
            <div className="w-10 h-10 rounded-full border border-slate-600 flex items-center justify-center group-hover:border-red-500 group-hover:rotate-90 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </div>
        </button>

        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 mt-8">
            
            {/* Left Column: Developer Profile */}
            <div className="lg:col-span-4 flex flex-col items-center text-center space-y-6 animate-fade-in-up">
                <div className="relative group">
                    {/* Animated Hexagon Border */}
                    <div className="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                    
                    {/* Developer Image Container */}
                    <div className="relative w-48 h-48 md:w-64 md:h-64 hexagon-mask overflow-hidden border-4 border-slate-800 shadow-2xl group-hover:border-emerald-500/50 transition-colors bg-slate-900 flex items-center justify-center">
                        
                        {/* 
                          Developer Image Container 
                          This uses a local image file. 
                        */}
                        <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                            <img 
                               src="/architect.jpg" 
                               alt="System Architect" 
                               className="w-full h-full object-cover object-center scale-110 group-hover:scale-125 transition-transform duration-700"
                               onError={(e) => {
                                 (e.target as HTMLImageElement).src = "https://ui-avatars.com/api/?name=PKAK+MAIL&background=020617&color=10b981&size=256";
                               }}
                            />
                            {/* Overlay to catch clicks and prevent interaction */}
                            <div className="absolute inset-0 z-10"></div>
                        </div>

                        {/* Tech Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60 z-20"></div>
                    </div>
                    
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 border border-emerald-500/50 px-4 py-1 rounded text-emerald-400 text-xs font-mono-sci font-bold tracking-widest uppercase whitespace-nowrap shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover:bg-emerald-900/50 transition-colors z-30">
                        System Architect
                    </div>
                </div>

                <div>
                    <h2 className="text-3xl font-sci-fi font-bold text-white mb-1">PKAK MAIL</h2>
                    <p className="text-slate-400 text-sm font-mono-sci mb-4">INNOVATOR | EHO | DEVELOPER</p>
                    <p className="text-slate-300 text-sm leading-relaxed max-w-xs mx-auto italic border-t border-b border-slate-800 py-4">
                        "Masa depan kesihatan awam terletak pada gabungan kepakaran manusia dan ketepatan kecerdasan buatan. Kita tidak hanya melihat, kita menganalisis."
                    </p>
                </div>
            </div>

            {/* Right Column: System Info */}
            <div className="lg:col-span-8 flex flex-col justify-center space-y-8 animate-fade-in text-left">
                <div>
                   <h3 className="text-emerald-400 font-mono-sci tracking-[0.3em] uppercase text-sm mb-2">System Core</h3>
                   <h2 className="text-3xl md:text-5xl font-sci-fi font-bold text-white leading-tight mb-6 flex items-center gap-4">
                      POWERED BY <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">GEMINI 3.0 PRO</span>
                   </h2>
                </div>

                <div className="prose prose-invert prose-lg max-w-none text-slate-300 font-light leading-relaxed space-y-6">
                   <p>
                      <strong className="text-white">VectorGuard AI</strong> merupakan satu sistem perintis yang direka khusus untuk membantu pekerja kesihatan awam, terutamanya Penolong Pegawai Kesihatan Persekitaran (PPKP) dan Pembantu Kesihatan Awam (PKA).
                   </p>
                   <p>
                      Sistem ini menggunakan enjin <strong>Gemini 3.0 Pro</strong> yang terkini. Ia mempunyai keupayaan pemprosesan visual yang jauh lebih hebat daripada model sebelumnya, membolehkan pengecaman spesis vektor (nyamuk/lalat) yang lebih tepat dan analisis risiko mikrobiologi yang mendalam.
                   </p>
                   <p>
                      <strong>Ciri Pintar:</strong> Jika pelayan sesak, sistem ini dilengkapi teknologi <em>Smart Fallback</em> yang akan bertukar kepada Gemini 2.5 Flash secara automatik untuk memastikan anda sentiasa mendapat laporan tanpa gangguan.
                   </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-800">
                    <div className="bg-slate-900/50 p-4 border-l-2 border-emerald-500">
                       <h4 className="font-bold text-white mb-1">GEMINI 3.0 PRO</h4>
                       <p className="text-xs text-slate-400">Model AI paling bijak untuk analisis tepat.</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 border-l-2 border-cyan-500">
                       <h4 className="font-bold text-white mb-1">AUTO-SWITCH</h4>
                       <p className="text-xs text-slate-400">Bertukar ke mod laju jika server sibuk.</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 border-l-2 border-red-500">
                       <h4 className="font-bold text-white mb-1">PEMATUHAN AKTA</h4>
                       <p className="text-xs text-slate-400">Rujukan automatik kepada piawaian DOSH & KKM.</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AboutSystem;
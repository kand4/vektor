import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface AboutSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutSystem: React.FC<AboutSystemProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex flex-col overflow-y-auto animate-fade-in"
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
            <span className="text-xs font-mono-sci tracking-widest uppercase group-hover:text-red-400 transition-colors">{t('about_close')}</span>
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
                        {t('system_architect')}
                    </div>
                </div>

                <div>
                    <h2 className="text-3xl font-sci-fi font-bold text-white mb-1">PKAK MAIL</h2>
                    <p className="text-slate-400 text-sm font-mono-sci mb-4">INNOVATOR | EHO | DevOps</p>
                    <p className="text-slate-300 text-sm leading-relaxed max-w-xs mx-auto italic border-t border-b border-slate-800 py-4">
                        {t('architect_quote')}
                    </p>
                </div>
            </div>

            {/* Right Column: System Info */}
            <div className="lg:col-span-8 flex flex-col justify-center space-y-8 animate-fade-in text-left">
                <div>
                   <h3 className="text-emerald-400 font-mono-sci tracking-[0.3em] uppercase text-sm mb-2">{t('sys_core')}</h3>
                   <h2 className="text-3xl md:text-5xl font-sci-fi font-bold text-white leading-tight mb-6 flex items-center gap-4">
                      {t('powered_by')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">GEMINI 3.1 PRO</span>
                   </h2>
                </div>

                <div className="prose prose-invert prose-lg max-w-none text-slate-300 font-light leading-relaxed space-y-6">
                   <p>
                      {t('vg_desc_1')}
                   </p>
                   <p>
                      {t('vg_desc_2')}
                   </p>
                   <p>
                      {t('vg_desc_3')}
                   </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-800">
                    <div className="bg-slate-900/50 p-4 border-l-2 border-emerald-500">
                       <h4 className="font-bold text-white mb-1">{t('feature_ai_title')}</h4>
                       <p className="text-xs text-slate-400">{t('feature_ai_desc')}</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 border-l-2 border-cyan-500">
                       <h4 className="font-bold text-white mb-1">{t('feature_switch_title')}</h4>
                       <p className="text-xs text-slate-400">{t('feature_switch_desc')}</p>
                    </div>
                    <div className="bg-slate-900/50 p-4 border-l-2 border-red-500">
                       <h4 className="font-bold text-white mb-1">{t('feature_act_title')}</h4>
                       <p className="text-xs text-slate-400">{t('feature_act_desc')}</p>
                    </div>
                </div>

                {/* LOG KEMAS KINI SISTEM & VERSI */}
                <div className="pt-8 border-t border-slate-800 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h4 className="text-emerald-400 font-mono-sci text-xs uppercase tracking-widest">[ REKOD LOG INTEGRASI ]</h4>
                            <h3 className="text-xl font-bold font-sci-fi text-white tracking-widest uppercase">LOG KEMAS KINI & VERSI SISTEM</h3>
                        </div>
                        <div className="bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 text-emerald-400 rounded-lg font-mono-sci text-xs flex items-center gap-2 max-w-max shadow-lg shadow-emerald-950/25">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                            STATUS: v3.4.3-STABLE
                        </div>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800/60 p-5 rounded-xl space-y-4 font-sans text-xs">
                        <div className="text-slate-300 space-y-2 border-b border-slate-900 pb-4">
                            <span className="text-emerald-500 font-mono-sci font-bold uppercase tracking-wider block">ℹ️ Membaca Nombor Versi (Format SemVer):</span>
                            <p className="leading-relaxed">
                                Format versi yang digunakan bagi VectorGuard.AI adalah format piawai industri <strong className="text-emerald-400 font-mono">MAJOR.MINOR.PATCH</strong> (Contoh: <code className="text-emerald-400 bg-emerald-950/50 px-1 py-0.5 rounded font-mono">3.4.3</code>):
                            </p>
                            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400">
                                <li><strong className="text-slate-200 font-mono">MAJOR [3]</strong> : Perubahan reka bentuk struktur utama / penaiktarafan generasi sistem (v3 melambangkan migrasi AI penuh).</li>
                                <li><strong className="text-slate-200 font-mono">MINOR [4]</strong> : Kemas kini modul berskala besar seperti penyepaduan panel Pengkalan Data Biodiversiti Global (GBIF).</li>
                                <li><strong className="text-slate-200 font-mono">PATCH [3]</strong> : Pembaikan pepijat, sokongan eksport Telegram & Telegraph automatik.</li>
                            </ul>
                        </div>

                        {/* Timeline logs */}
                        <div className="space-y-4 pt-2">
                            <div className="relative border-l border-slate-800 pl-4 space-y-6">
                                {/* Item v3.4.3 */}
                                <div className="relative">
                                    <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-4 ring-emerald-950/60 animate-pulse"></span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded">v3.4.3</span>
                                        <span className="text-slate-500 font-mono text-[10px]">03 JUL 2026</span>
                                    </div>
                                    <h5 className="font-bold text-white mt-1 uppercase font-sci-fi tracking-wider">Integrasi Pelaporan Telegram & Telegraph</h5>
                                    <p className="text-slate-400 mt-1 leading-relaxed">
                                        Memperkenalkan modul perkongsian dan eksport terus ke Telegram (Kumpulan/Saluran/Bot) beserta penjanaan artikel Telegraph tanpa had imej, bagi menyokong operasi bilik gerakan dan siaran laporan kesihatan secara masa nyata.
                                    </p>
                                </div>

                                {/* Item v3.4.2 */}
                                <div className="relative">
                                    <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-4 ring-emerald-950/60 animate-pulse"></span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded">v3.4.2</span>
                                        <span className="text-slate-500 font-mono text-[10px]">22 JUN 2026</span>
                                    </div>
                                    <h5 className="font-bold text-white mt-1 uppercase font-sci-fi tracking-wider">Sinkronisasi Dinamik Data Taksonomi GBIF</h5>
                                    <p className="text-slate-400 mt-1 leading-relaxed">
                                        Panel pangkalan data antarabangsa GBIF dikemas kini agar paparan taksonomi dan taburan peta segerak dengan bacaan AI terkini. Pengelasan spesis nyamuk yang tidak terhad kepada <i>Aedes</i> (cth: <i>Culex</i>, <i>Anopheles</i>) akan menarik data API berkaitan secara pintar.
                                    </p>
                                </div>

                                {/* Item v3.4.1 */}
                                <div className="relative">
                                    <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-4 ring-emerald-950/60 animate-pulse"></span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded">v3.4.1</span>
                                        <span className="text-slate-500 font-mono text-[10px]">22 JUN 2026</span>
                                    </div>
                                    <h5 className="font-bold text-white mt-1 uppercase font-sci-fi tracking-wider">Lensa Pembesar Pintar & Pemetaan Anomali Spasial AI</h5>
                                    <p className="text-slate-400 mt-1 leading-relaxed">
                                        Pengoptimuman antara muka dengan fitur <i>Magnifier</i> yang tidak menghalang interaksi sentuhan diletakkan pada keseluruhan imej input di modul Nyamuk Dewasa dan Detektif Jejentik. Prom kejuruteraan sistem forensik AI Gemini dinaiktaraf untuk mendepani orientasi visual bukan-ideal secara cemerlang.
                                    </p>
                                </div>

                                {/* Item v3.4.0 */}
                                <div className="relative">
                                    <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-4 ring-emerald-950/60 animate-pulse"></span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded">v3.4.0</span>
                                        <span className="text-slate-500 font-mono text-[10px]">22 JUN 2026</span>
                                    </div>
                                    <h5 className="font-bold text-white mt-1 uppercase font-sci-fi tracking-wider">Penyepaduan "Global Biodiversity Information Facility" (GBIF)</h5>
                                    <p className="text-slate-400 mt-1 leading-relaxed">
                                        Memperkenalkan panel statistik canggih bersumberkan pangkalan data terbuka GBIF terus ke atas hasil pengimbasan "Detektif Jejentik" dan "Analisis Nyamuk Dewasa". Paparan rekabentuk Dark Cybertech ini menyalurkan taksonomi terperinci dan maklumat peta taburan vektor berskala global (tanpa API Key bertutup).
                                    </p>
                                </div>

                                {/* Item v3.3.0 */}
                                <div className="relative">
                                    <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-4 ring-emerald-950/60 animate-pulse"></span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded">v3.3.0</span>
                                        <span className="text-slate-500 font-mono text-[10px]">22 JUN 2026</span>
                                    </div>
                                    <h5 className="font-bold text-white mt-1 uppercase font-sci-fi tracking-wider">Permainan "Aedes Hunt", Penyah-tindihan & Kerangka Kerja Keselamatan</h5>
                                    <p className="text-slate-400 mt-1 leading-relaxed">
                                        Melancarkan secara rasmi modul latihan gamifikasi interaktif <strong>"Aedes Hunt"</strong> untuk mencabar kecekapan pegawai lapangan mengesan zon pembiakan virtual. Menyingkirkan ulasan "Saranan Kesihatan Awam" sekunder yang bertindih terus di bawah gambar imbasan bagi melunaskan reka bentuk bento-grid yang lebih padat dan kemas, manakala ulasan berwibawa di bawah modul "Hygiene Ancaman" dikekalkan seadanya. Menyediakan dokumentasi audit risiko keselamatan siber dan perbincangan gerbang API rasmi untuk kegunaan agensi/kerajaan.
                                    </p>
                                </div>

                                {/* Item v3.2.0 */}
                                <div className="relative">
                                    <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-4 ring-emerald-950/60 animate-pulse"></span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded">v3.2.0</span>
                                        <span className="text-slate-505 font-mono text-[10px]">18 JUN 2026</span>
                                    </div>
                                    <h5 className="font-bold text-white mt-1 uppercase font-sci-fi tracking-wider">Integrasi Poster Duo Morfologi & Profil Albopictus</h5>
                                    <p className="text-slate-400 mt-1 leading-relaxed">
                                        Memetakan modul perbandingan rujukan visual dua jenis nyamuk dewasa (Aedes aegypti dan Aedes albopictus) pada panel pengimbas. Mengguna pakai pautan GitHub asal (raw URL) secara terus dan menambah kotak info pantas diskriminasi morfologi scutum.
                                    </p>
                                </div>

                                {/* Item v3.1.0 */}
                                <div className="relative">
                                    <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-cyan-700 rounded-full ring-4 ring-cyan-950/60"></span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-cyan-400 font-bold bg-cyan-950/50 px-2 py-0.5 rounded">v3.1.0</span>
                                        <span className="text-slate-500 font-mono text-[10px]">17 JUN 2026</span>
                                    </div>
                                    <h5 className="font-bold text-white mt-1 uppercase font-sci-fi tracking-wider">Integrasi Carta Anatomi Jejentik & iDengue Hotlinks</h5>
                                    <p className="text-slate-400 mt-1 leading-relaxed">
                                        Pemasangan Carta Anatomi/Poster Induk Jejentik Entomologi v2.0 menggunakan pautan terus GitHub. Kemas kini pautan iDengue MYSA ke sistem web GIS did_ untuk penjejakan zon aktif waktu nyata.
                                    </p>
                                </div>

                                {/* Item v2.5.0 */}
                                <div className="relative">
                                    <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-slate-750 rounded-full ring-4 ring-slate-900/60"></span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-slate-400 font-bold bg-slate-900/50 px-2 py-0.5 rounded">v2.5.0</span>
                                        <span className="text-slate-500 font-mono text-[10px]">MAY 2026</span>
                                    </div>
                                    <h5 className="font-bold text-white mt-1 uppercase font-sci-fi tracking-wider">GPS Lokasi & Dashboard Amaran Awal KKM</h5>
                                    <p className="text-slate-400 mt-1 leading-relaxed">
                                        Penyambungan modul Geolocation API untuk mengesan daerah/negeri pengguna secara waktu nyata. Lokasi disasarkan langsung ke peta amaran awal KKM dlm paparan digital iDengue.
                                    </p>
                                </div>

                                {/* Item v1.0.0 */}
                                <div className="relative">
                                    <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-slate-800 rounded-full ring-4 ring-slate-950/60"></span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-slate-500 font-bold bg-slate-900/50 px-2 py-0.5 rounded">v1.0.0</span>
                                        <span className="text-slate-500 font-mono text-[10px]">NOV 2025</span>
                                    </div>
                                    <h5 className="font-bold text-slate-400 mt-1 uppercase font-sci-fi tracking-wider">Pelancaran Asas VectorGuard.AI</h5>
                                    <p className="text-slate-500 mt-1 leading-relaxed">
                                        Sistem permulaan pangkalan model ramalan AI, antaramuka dwi-skor amaran, simulator manual, dan arkib log sistem.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AboutSystem;
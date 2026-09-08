import React, { useState } from 'react';
import { AnalysisSession, RiskDetection } from '../../types';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { getSessionTimestamp, isOwnerAuthorized } from '../../utils/archiveHelpers';
import { OwnerAuthModal } from './OwnerAuthModal';
import { generateCleanSimulation, askRiskFollowUp, SimulationConfig } from '../../services/geminiService';

interface SimulationDetailViewProps {
  session: AnalysisSession;
  language?: string;
  onBack: () => void;
  onDeleteSession: (sessionId: string) => void;
  onDeleteSimulationOnly: (sessionId: string) => void;
  onUpdateSession: (updatedSession: AnalysisSession) => void;
}

export const SimulationDetailView: React.FC<SimulationDetailViewProps> = ({
  session,
  language = 'ms',
  onBack,
  onDeleteSession,
  onDeleteSimulationOnly,
  onUpdateSession
}) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authAction, setAuthAction] = useState<'DELETE_SESSION' | 'DELETE_SIMULATION'>('DELETE_SESSION');
  const [isGeneratingSim, setIsGeneratingSim] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  // Chat follow-up state
  const [activeRiskForChat, setActiveRiskForChat] = useState<RiskDetection | null>(null);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatAnswer, setChatAnswer] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const isOwner = isOwnerAuthorized();
  const timestamp = getSessionTimestamp(session);
  const dateObj = new Date(timestamp);
  const formattedDate = dateObj.toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const risks = session.result?.risks || [];
  const vectorRisks = risks.filter(r => r.category === 'VECTOR');
  const hygieneRisks = risks.filter(r => r.category === 'HYGIENE');
  const safetyRisks = risks.filter(r => r.category === 'SAFETY');

  // Trigger owner authorization before deleting
  const handleRequestDelete = (action: 'DELETE_SESSION' | 'DELETE_SIMULATION') => {
    if (!isOwnerAuthorized()) {
      setAuthAction(action);
      setShowAuthModal(true);
      return;
    }

    if (action === 'DELETE_SESSION') {
      if (window.confirm('Adakah anda pasti ingin memadam rekod analisis dan simulasi ini? Tindakan ini tidak boleh diundur.')) {
        onDeleteSession(session.id);
      }
    } else {
      if (window.confirm('Adakah anda pasti ingin memadam imej simulasi ini? Gambar asal dan rekod analisis akan kekal.')) {
        onDeleteSimulationOnly(session.id);
      }
    }
  };

  const handleAuthSuccess = () => {
    if (authAction === 'DELETE_SESSION') {
      onDeleteSession(session.id);
    } else {
      onDeleteSimulationOnly(session.id);
    }
  };

  // Generate Simulation on the fly if session doesn't have one yet
  const handleGenerateSimulation = async () => {
    setIsGeneratingSim(true);
    setSimError(null);
    try {
      const simConfig: SimulationConfig = {
        mode: 'SANITIZE_ONLY',
        humans: 'REMOVE',
        lighting: 'NATURAL',
        engine: 'GEMINI_IMAGEN',
        customPrompt: "Kawasan dibersihkan sepenuhnya mengikut piawaian KKM. Tiada takungan air, tiada longgokan sampah, kayu dan palet dinaikkan serta disanitasi bebas daripada sarang lipas dan tikus."
      };

      const result = await generateCleanSimulation(session.imageSrc, session.mimeType, simConfig);
      const updated: AnalysisSession = {
        ...session,
        simulationImage: result.imageUrl
      };
      onUpdateSession(updated);
    } catch (err: any) {
      console.error("Simulation generation error:", err);
      setSimError(err?.message || "Gagal menjana simulasi. Sila semak sambungan rangkaian atau kunci API.");
    } finally {
      setIsGeneratingSim(false);
    }
  };

  const handleAskQuestion = async (risk: RiskDetection) => {
    if (!chatQuestion.trim()) return;
    setIsChatLoading(true);
    setChatAnswer(null);
    try {
      const ans = await askRiskFollowUp(risk, chatQuestion, language);
      setChatAnswer(ans);
    } catch (e) {
      setChatAnswer("Ralat mendapatkan maklum balas AI. Sila cuba lagi.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleDownloadCleanImage = () => {
    if (!session.simulationImage) return;
    const a = document.createElement('a');
    a.href = session.simulationImage;
    a.download = `VectorGuard_Simulasi_Bersih_${session.id.slice(-8)}.jpg`;
    a.click();
  };

  return (
    <div className="w-full pb-16 animate-fade-in text-left">
      {/* Top Header Navigation */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 md:p-6 mb-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 border border-slate-700 hover:border-cyan-500/50 transition-all active:scale-95 shrink-0"
          >
            <span>←</span>
            <span>KEMBALI KE SENARAI TARIKH</span>
          </button>
          
          <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-xl font-bold font-sci-fi text-white tracking-wide truncate max-w-[280px] sm:max-w-md">
                {session.fileName}
              </h2>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${session.simulationImage ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                {session.simulationImage ? '✨ SIMULASI AKTIF' : '📸 ANALISIS SAHAJA'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Tarikh: <span className="text-slate-300 font-bold">{formattedDate}</span> jam <span className="text-slate-300">{formattedTime}</span> | ID: <span className="text-slate-500">{session.id.slice(0, 16)}...</span>
            </p>
          </div>
        </div>

        {/* Security & Action Tools */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Owner Status Badge */}
          {isOwner ? (
            <div className="inline-flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-[11px] font-mono px-3 py-1.5 rounded-lg shadow-sm" title="Dibenarkan memadam rekod (Akses Pemilik Sah)">
              <span>👑</span>
              <span className="font-bold">Mod Pemilik Sah</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 text-slate-400 text-[11px] font-mono px-3 py-1.5 rounded-lg" title="Hanya pemilik sah dibenarkan memadam rekod">
              <span>🔒</span>
              <span>Mod Pelawat (Paparan Sahaja)</span>
            </div>
          )}

          {/* Delete simulation button */}
          {session.simulationImage && (
            <button
              onClick={() => handleRequestDelete('DELETE_SIMULATION')}
              className="bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 hover:border-amber-400 px-3 py-2 rounded-xl text-xs font-mono font-bold transition-colors flex items-center gap-1.5"
              title="Padam imej simulasi sahaja"
            >
              <span>✨✕</span>
              <span className="hidden sm:inline">Padam Simulasi</span>
            </button>
          )}

          {/* Delete entire session record button */}
          <button
            onClick={() => handleRequestDelete('DELETE_SESSION')}
            className="bg-red-950/50 hover:bg-red-900/60 text-red-400 border border-red-500/40 hover:border-red-400 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-colors flex items-center gap-1.5"
            title="Hanya pemilik berdaftar sah boleh membuang rekod"
          >
            <span>🗑️</span>
            <span>{isOwner ? 'Padam Rekod' : 'Padam (Pemilik)'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: INTERACTIVE BEFORE / AFTER SLIDING CANVAS */}
      <div className="mb-8">
        {session.simulationImage ? (
          <div className="bg-slate-900/60 border border-cyan-500/30 rounded-3xl p-4 md:p-6 shadow-2xl backdrop-blur-sm">
            <BeforeAfterSlider
              originalImage={session.imageSrc}
              simulatedImage={session.simulationImage}
              title="PERBANDINGAN SLIDER SEBELUM & SELEPAS REMEDIASI"
              onDownloadClean={handleDownloadCleanImage}
            />
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 text-center flex flex-col items-center">
            <div className="relative w-full max-w-2xl h-80 rounded-2xl overflow-hidden border border-slate-700 mb-6 bg-slate-950">
              <img src={session.imageSrc} alt="Imej Asal" className="w-full h-full object-contain" />
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur border border-slate-600 text-slate-300 text-[10px] font-mono px-3 py-1 rounded-lg uppercase">
                IMEJ ASAL (BELUM DISIMULASIKAN)
              </div>
            </div>

            <h3 className="text-xl font-bold font-sci-fi text-cyan-400 mb-2">
              SIMULASI BERSIH BELUM DIJANA UNTUK REKOD INI
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm max-w-xl mb-6">
              Jana simulasi automatik menggunakan AI generatif untuk memvisualisasikan premis ini selepas dinyahkuman, sisa disingkirkan, dan habitat vektor dihapuskan.
            </p>

            {simError && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs font-mono max-w-md">
                ⚠️ {simError}
              </div>
            )}

            <button
              onClick={handleGenerateSimulation}
              disabled={isGeneratingSim}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold font-mono text-xs sm:text-sm px-8 py-3.5 rounded-xl shadow-lg shadow-cyan-900/40 transition-all flex items-center gap-2"
            >
              {isGeneratingSim ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>SEDANG MENJANA SIMULASI REMEDIASI...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>JANA SIMULASI REMEDIASI SEKARANG (AI)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* SECTION 2: EXECUTIVE MITIGATION PLAN (LANGKAH-LANGKAH YANG PERLU DIAMBIL) */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <h3 className="text-lg sm:text-xl font-bold font-sci-fi text-white tracking-wide uppercase">
              LANGKAH-LANGKAH KAWALAN & REMEDIASI PREMIS (KKM PROTOKOL)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
            STANDARD KESIHATAN AWAM
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Phase 1: 24 Hours Emergency */}
          <div className="bg-slate-900/70 border border-amber-500/40 rounded-2xl p-5 relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-bold bg-amber-950/80 text-amber-400 border border-amber-500/40 px-2.5 py-1 rounded-full">
                FASA 1: SERTA-MERTA
              </span>
              <span className="text-xs font-mono text-slate-400">⏱️ 24 Jam Pertama</span>
            </div>
            <h4 className="text-base font-bold text-white mb-2 font-sci-fi">Tindakan Fizikal & Penghapusan</h4>
            <ul className="text-xs text-slate-300 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold shrink-0">1.</span>
                <span><strong>Musnahkan Bekas Takung:</strong> Buang dan lupuskan semua tin, botol plastik, bekas makanan, dan tayar terpakai.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold shrink-0">2.</span>
                <span><strong>Tinggikan Palet & Kayu:</strong> Susun semula palet kayu/papan di atas rak bertingkat sekurang-kurangnya <strong>30cm dari lantai</strong> dan <strong>45cm dari dinding</strong> untuk hapuskan sarang tikus dan lipas.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 font-bold shrink-0">3.</span>
                <span><strong>Pembersihan Sisa Makanan:</strong> Buang sisa organik dan tutup tong sampah dengan rapat mengikut Peraturan-Peraturan Kebersihan Makanan 2009.</span>
              </li>
            </ul>
          </div>

          {/* Phase 2: Chemical & Biological Treatment */}
          <div className="bg-slate-900/70 border border-cyan-500/40 rounded-2xl p-5 relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-500/40 px-2.5 py-1 rounded-full">
                FASA 2: RAWATAN
              </span>
              <span className="text-xs font-mono text-slate-400">📅 Hari Ke 2 - 7</span>
            </div>
            <h4 className="text-base font-bold text-white mb-2 font-sci-fi">Kawalan Kimia & Biologi</h4>
            <ul className="text-xs text-slate-300 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold shrink-0">1.</span>
                <span><strong>Ubat Jentik-Jentik:</strong> Tabur larvisid Abate 1SG (10g bagi setiap 90 liter air) pada takungan kekal seperti kolam takungan atau longkang mati.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold shrink-0">2.</span>
                <span><strong>Umpan Tikus Bertutup:</strong> Pasangkan stesen umpan tikus (tamper-resistant bait station) pada laluan perimeter untuk elak risiko Leptospirosis.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold shrink-0">3.</span>
                <span><strong>Gel Racun Lipas:</strong> Titikkan gel racun lipas (Fipronil / Indoxacarb) di celah-celahan papan palet, bawah sinki, dan belakang peti ais.</span>
              </li>
            </ul>
          </div>

          {/* Phase 3: Prevention & Audit */}
          <div className="bg-slate-900/70 border border-emerald-500/40 rounded-2xl p-5 relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-full">
                FASA 3: PENGEKALAN
              </span>
              <span className="text-xs font-mono text-slate-400">🔄 Berterusan</span>
            </div>
            <h4 className="text-base font-bold text-white mb-2 font-sci-fi">Audit & Pencegahan Jangka Panjang</h4>
            <ul className="text-xs text-slate-300 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold shrink-0">1.</span>
                <span><strong>Program 10 Minit Cari & Musnah:</strong> Laksanakan rondaan kendiri setiap minggu di sekeliling premis untuk memastikan tiada takungan air baharu.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold shrink-0">2.</span>
                <span><strong>Penyelenggaraan Perparitan:</strong> Bersihkan longkang daripada endapan kelodak dan lumut supaya aliran air sentiasa lancar.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold shrink-0">3.</span>
                <span><strong>Pematuhan Borang KKM:</strong> Pastikan demerit kebersihan premis kekal sifar bagi mengekalkan Gred A Premis Makanan KKM.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* SECTION 3: VECTOR & SAFETY THREATS (ANCAMAN VEKTOR DAN KESELAMATAN) */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <h3 className="text-lg sm:text-xl font-bold font-sci-fi text-white tracking-wide uppercase">
              ANALISIS ANCAMAN VEKTOR & KESELAMATAN PERSEKITARAN
            </h3>
          </div>
          <span className="text-[10px] font-mono text-red-400 bg-red-950/60 border border-red-500/30 px-2.5 py-1 rounded-full uppercase">
            {risks.length} TITIK RISIKO DIKESAN
          </span>
        </div>

        {risks.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs sm:text-sm">
            Tiada ancaman bio atau vektor spesifik dikesan dalam fail ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {risks.map((risk, idx) => (
              <div
                key={risk.id || idx}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition-all shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                      risk.category === 'VECTOR' ? 'bg-red-950/80 border-red-500/50 text-red-400' :
                      risk.category === 'SAFETY' ? 'bg-amber-950/80 border-amber-500/50 text-amber-400' :
                      'bg-blue-950/80 border-blue-500/50 text-blue-400'
                    }`}>
                      {risk.category === 'VECTOR' ? '🦟 ANCAMAN VEKTOR' : risk.category === 'SAFETY' ? '⚠️ KESELAMATAN' : '🧼 KEBERSIHAN'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Keyakinan AI: {Math.round(risk.confidence * 100)}%
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white mb-2 font-sci-fi">
                    {risk.label}
                  </h4>

                  <div className="space-y-2 mb-4 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs font-mono">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-400 shrink-0">Ejen Vektor:</span>
                      <span className="text-red-400 font-bold text-right">{risk.agent || 'N/A'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-400 shrink-0">Patogen / Mikrobiologi:</span>
                      <span className="text-cyan-400 font-bold text-right">{risk.microbiology || 'N/A'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-400 shrink-0">Risiko Penyakit:</span>
                      <span className="text-amber-400 font-bold text-right">{risk.disease || 'N/A'}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    <strong>Pemerhatian Forensik:</strong> {risk.description}
                  </p>

                  <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3 mb-3 text-xs text-emerald-300 leading-relaxed">
                    <strong className="text-emerald-400">Solusi KKM:</strong> {risk.solution}
                  </div>

                  {risk.savageCommentary && (
                    <div className="bg-red-950/20 border-l-2 border-red-500 p-2.5 rounded-r-lg text-[11px] text-red-300/90 italic font-mono mb-3">
                      "{risk.savageCommentary}"
                    </div>
                  )}
                </div>

                {/* Follow-up Inquiry button */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setActiveRiskForChat(risk);
                      setChatQuestion('');
                      setChatAnswer(null);
                    }}
                    className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors"
                  >
                    <span>💬</span>
                    <span>Tanya Soalan Lanjut AI Mengenai Risiko Ini</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4: AI CONSULTANT DIALOG MODAL */}
      {activeRiskForChat && (
        <div className="fixed inset-0 z-[220] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-base font-bold font-sci-fi text-cyan-400 flex items-center gap-2">
                <span>🤖</span> SOAL JAWAB AI: {activeRiskForChat.label}
              </h4>
              <button
                onClick={() => setActiveRiskForChat(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 font-mono">
              Ejen: {activeRiskForChat.agent} | Penyakit: {activeRiskForChat.disease}
            </p>

            <div className="space-y-3 mb-4">
              <input
                type="text"
                value={chatQuestion}
                onChange={(e) => setChatQuestion(e.target.value)}
                placeholder="Contoh: Bagaimanakah cara hapuskan jentik-jentik atau tikus di sini?"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAskQuestion(activeRiskForChat);
                }}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => handleAskQuestion(activeRiskForChat)}
                  disabled={isChatLoading || !chatQuestion.trim()}
                  className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-mono font-bold px-4 py-2 rounded-xl transition-all"
                >
                  {isChatLoading ? 'Menganalisis...' : 'Hantar Soalan'}
                </button>
                <button
                  onClick={() => setActiveRiskForChat(null)}
                  className="bg-slate-800 text-slate-400 hover:text-white text-xs font-mono px-4 py-2 rounded-xl transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>

            {chatAnswer && (
              <div className="bg-slate-950 border border-cyan-500/30 rounded-xl p-4 text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-line max-h-60 overflow-y-auto">
                {chatAnswer}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Owner Auth Modal */}
      <OwnerAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
        targetActionDescription={authAction === 'DELETE_SESSION' ? 'memadam rekod analisis dan simulasi ini' : 'memadam imej simulasi ini'}
      />
    </div>
  );
};

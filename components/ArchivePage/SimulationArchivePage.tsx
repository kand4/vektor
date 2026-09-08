import React, { useState, useMemo } from 'react';
import { AnalysisSession } from '../../types';
import { 
  groupSessionsByDate, 
  getSessionTimestamp, 
  isOwnerAuthorized, 
  setOwnerAuthorized
} from '../../utils/archiveHelpers';
import { SimulationDetailView } from './SimulationDetailView';
import { OwnerAuthModal } from './OwnerAuthModal';

interface SimulationArchivePageProps {
  sessions: AnalysisSession[];
  language?: string;
  onBackToHome: () => void;
  onDeleteSession: (sessionId: string) => void;
  onDeleteSimulationOnly: (sessionId: string) => void;
  onUpdateSession: (updatedSession: AnalysisSession) => void;
  onClearAllSessions?: () => void;
  onLoadDefaultArchive?: () => void;
}

export const SimulationArchivePage: React.FC<SimulationArchivePageProps> = ({
  sessions,
  language = 'ms',
  onBackToHome,
  onDeleteSession,
  onDeleteSimulationOnly,
  onUpdateSession,
  onClearAllSessions,
  onLoadDefaultArchive
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'WITH_SIM' | 'MOSQUITO' | 'RODENT_COCKROACH' | 'KKM'>('ALL');
  const [sortOrder, setSortOrder] = useState<'NEWEST_FIRST' | 'OLDEST_FIRST'>('NEWEST_FIRST');

  // Owner authentication state
  const [isOwner, setIsOwner] = useState<boolean>(() => isOwnerAuthorized());
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [pendingDeleteAction, setPendingDeleteAction] = useState<{ type: 'SINGLE' | 'ALL'; sessionId?: string } | null>(null);

  // Selected session object for detail view
  const selectedSession = useMemo(() => {
    if (!selectedSessionId) return null;
    return sessions.find(s => s.id === selectedSessionId) || null;
  }, [selectedSessionId, sessions]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      // 1. Text search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = session.fileName.toLowerCase().includes(q);
        const adviceMatch = session.result?.generalAdvice?.toLowerCase().includes(q) || false;
        const riskMatch = session.result?.risks.some(r => 
          r.label.toLowerCase().includes(q) || 
          r.agent.toLowerCase().includes(q) || 
          r.disease.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
        ) || false;
        if (!nameMatch && !adviceMatch && !riskMatch) return false;
      }

      // 2. Category filter
      if (activeFilter === 'WITH_SIM') {
        return !!session.simulationImage;
      }
      if (activeFilter === 'MOSQUITO') {
        return session.result?.risks.some(r => 
          r.agent.toLowerCase().includes('aedes') || 
          r.agent.toLowerCase().includes('culex') || 
          r.label.toLowerCase().includes('jentik') || 
          r.label.toLowerCase().includes('nyamuk')
        );
      }
      if (activeFilter === 'RODENT_COCKROACH') {
        return session.result?.risks.some(r => 
          r.agent.toLowerCase().includes('tikus') || 
          r.agent.toLowerCase().includes('rattus') || 
          r.agent.toLowerCase().includes('lipas') || 
          r.agent.toLowerCase().includes('periplaneta') ||
          r.label.toLowerCase().includes('palet') ||
          r.label.toLowerCase().includes('kayu')
        );
      }
      if (activeFilter === 'KKM') {
        return session.mode === 'KKM_FOOD_STANDARD' || !!session.result?.kkmReport;
      }

      return true;
    });
  }, [sessions, searchQuery, activeFilter]);

  // Group filtered sessions by date
  const dateGroups = useMemo(() => {
    return groupSessionsByDate(filteredSessions, language, sortOrder);
  }, [filteredSessions, language, sortOrder]);

  // KPI calculations
  const totalReports = sessions.length;
  const totalSimulations = sessions.filter(s => !!s.simulationImage).length;
  const totalRisksDetected = sessions.reduce((acc, s) => acc + (s.result?.risks.length || 0), 0);

  // Security action triggers
  const handleTriggerDelete = (sessionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!isOwnerAuthorized()) {
      setPendingDeleteAction({ type: 'SINGLE', sessionId });
      setShowAuthModal(true);
      return;
    }

    if (window.confirm('Adakah anda pasti ingin memadam rekod ini dari pangkalan data?')) {
      onDeleteSession(sessionId);
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
      }
    }
  };

  const handleTriggerClearAll = () => {
    if (!isOwnerAuthorized()) {
      setPendingDeleteAction({ type: 'ALL' });
      setShowAuthModal(true);
      return;
    }

    if (window.confirm('AMARAN PEMILIK: Anda pasti ingin mengosongkan SEMUA rekod analisis dan simulasi?')) {
      if (onClearAllSessions) {
        onClearAllSessions();
      }
      setSelectedSessionId(null);
    }
  };

  const handleAuthSuccess = () => {
    setIsOwner(true);
    if (pendingDeleteAction?.type === 'SINGLE' && pendingDeleteAction.sessionId) {
      onDeleteSession(pendingDeleteAction.sessionId);
      if (selectedSessionId === pendingDeleteAction.sessionId) {
        setSelectedSessionId(null);
      }
    } else if (pendingDeleteAction?.type === 'ALL' && onClearAllSessions) {
      onClearAllSessions();
      setSelectedSessionId(null);
    }
    setPendingDeleteAction(null);
  };

  const handleToggleOwnerLock = () => {
    if (isOwner) {
      setOwnerAuthorized(false);
      setIsOwner(false);
    } else {
      setShowAuthModal(true);
    }
  };

  // If a session is selected for detailed inspection, render the rich detail view
  if (selectedSession) {
    return (
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4">
        <SimulationDetailView
          session={selectedSession}
          language={language}
          onBack={() => setSelectedSessionId(null)}
          onDeleteSession={(id) => {
            onDeleteSession(id);
            setSelectedSessionId(null);
          }}
          onDeleteSimulationOnly={(id) => {
            onDeleteSimulationOnly(id);
          }}
          onUpdateSession={onUpdateSession}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 text-left animate-fade-in">
      {/* Top Banner & Navigation */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 rounded-3xl p-6 md:p-8 mb-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={onBackToHome}
                className="text-xs font-mono font-bold text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 transition-colors bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700"
              >
                <span>←</span>
                <span>KEMBALI KE MENU UTAMA</span>
              </button>
              <span className="text-slate-600">|</span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/80 border border-cyan-500/40 px-2.5 py-1 rounded-full">
                ARKIB REKOD MENGIKUT TARIKH
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-sci-fi text-white tracking-wide flex items-center gap-3">
              <span>🗂️</span>
              <span>PANGKALAN REKOD & SIMULASI</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Kompilasi lengkap sejarah analisis forensik bio, habitat vektor, dan visualisasi simulasi remediasi premis yang disusun mengikut susunan tarikh rasmi.
            </p>
          </div>

          {/* Owner Identity Status Control */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl shrink-0">
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                STATUS KAWALAN PEMADAMAN:
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isOwner ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-mono font-bold text-emerald-300">
                      👑 MOD PEMILIK AKTIF (KUASA PENUH)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="text-xs font-mono font-bold text-slate-300">
                      🔒 MOD PELAWAT (PAPARAN SAHAJA)
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={handleToggleOwnerLock}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                isOwner
                  ? 'bg-slate-900 text-slate-400 hover:text-white border-slate-700 hover:border-slate-600'
                  : 'bg-red-950/60 hover:bg-red-900 text-red-300 border-red-500/40 hover:border-red-400'
              }`}
            >
              {isOwner ? 'Kunci Semula Pelawat' : 'Buka Kunci Pemilik'}
            </button>
          </div>
        </div>

        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-left">
            <span className="text-[10px] font-mono text-slate-400 uppercase">JUMLAH REKOD</span>
            <div className="text-xl sm:text-2xl font-bold font-sci-fi text-white mt-1">
              {totalReports}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-cyan-500/30 rounded-xl p-3 text-left">
            <span className="text-[10px] font-mono text-cyan-400 uppercase">SIMULASI REMEDIASI</span>
            <div className="text-xl sm:text-2xl font-bold font-sci-fi text-cyan-300 mt-1">
              {totalSimulations} <span className="text-xs font-normal text-slate-400">SIAP</span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-red-500/30 rounded-xl p-3 text-left">
            <span className="text-[10px] font-mono text-red-400 uppercase">ANCAMAN DIKESAN</span>
            <div className="text-xl sm:text-2xl font-bold font-sci-fi text-red-400 mt-1">
              {totalRisksDetected} <span className="text-xs font-normal text-slate-400">TITIK</span>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-emerald-500/30 rounded-xl p-3 text-left">
            <span className="text-[10px] font-mono text-emerald-400 uppercase">KUMPULAN TARIKH</span>
            <div className="text-xl sm:text-2xl font-bold font-sci-fi text-emerald-300 mt-1">
              {dateGroups.length} <span className="text-xs font-normal text-slate-400">HARI</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter, Search & Order Controls Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 mb-6 shadow-md flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari fail, spesies vektor (Aedes/Tikus), atau kata kunci..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 outline-none font-mono transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all ${
              activeFilter === 'ALL'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            Semua ({sessions.length})
          </button>

          <button
            onClick={() => setActiveFilter('WITH_SIM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all ${
              activeFilter === 'WITH_SIM'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            ✨ Simulasi Siap ({totalSimulations})
          </button>

          <button
            onClick={() => setActiveFilter('MOSQUITO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all ${
              activeFilter === 'MOSQUITO'
                ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            🦟 Nyamuk Aedes
          </button>

          <button
            onClick={() => setActiveFilter('RODENT_COCKROACH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all ${
              activeFilter === 'RODENT_COCKROACH'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            🐀 Tikus & Lipas
          </button>

          <button
            onClick={() => setActiveFilter('KKM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all ${
              activeFilter === 'KKM'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            📋 Piawaian KKM
          </button>
        </div>

        {/* Sorter & Bulk Option */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono rounded-xl px-3 py-2 outline-none focus:border-cyan-500"
          >
            <option value="NEWEST_FIRST">Tarikh Terkini</option>
            <option value="OLDEST_FIRST">Tarikh Terlama</option>
          </select>

          {onLoadDefaultArchive && (
            <button
              onClick={onLoadDefaultArchive}
              className="px-3 py-2 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 rounded-xl text-xs font-mono transition-colors flex items-center gap-1.5"
              title="Muat 3 Rekod Penanda Aras KKM (Mengikut Tarikh)"
            >
              <span>📥</span>
              <span className="hidden sm:inline">Data Contoh KKM</span>
            </button>
          )}

          {onClearAllSessions && sessions.length > 0 && (
            <button
              onClick={handleTriggerClearAll}
              className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 hover:border-red-400 rounded-xl text-xs font-mono transition-colors"
              title="Kosongkan Semua Rekod (Hanya Pemilik)"
            >
              🗑️ Padam Semua
            </button>
          )}
        </div>
      </div>

      {/* DATES TIMELINE ACCORDION / GROUPED LIST */}
      {dateGroups.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center">
          <div className="text-5xl mb-4">📂</div>
          <h3 className="text-xl font-bold font-sci-fi text-slate-300 mb-2">
            TIADA REKOD DITEMUI
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
            {sessions.length === 0
              ? 'Belum ada sebarang imej dianalisis atau disimulasikan. Sila muat naik imej baharu atau muat data contoh penanda aras KKM.'
              : 'Tiada rekod yang sepadan dengan tapisan carian anda. Sila tetapkan semula tapisan.'}
          </p>
          {sessions.length === 0 ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={onBackToHome}
                className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-lg shadow-cyan-950/50"
              >
                MULAKAN IMBASAN PERTAMA
              </button>
              {onLoadDefaultArchive && (
                <button
                  onClick={onLoadDefaultArchive}
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 font-mono font-bold text-xs px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <span>📥</span>
                  <span>MUAT CONTOH REKOD KKM (DENGAN TARIKH)</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('ALL');
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs px-6 py-2.5 rounded-xl transition-all"
            >
              RESET TAPISAN
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {dateGroups.map((group) => (
            <div key={group.dateKey} className="space-y-4">
              {/* Date Header Separator */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 px-4 py-1.5 rounded-xl shadow-sm">
                  <span className="text-base">📅</span>
                  <h3 className="text-sm sm:text-base font-bold font-sci-fi text-white tracking-wide">
                    {group.displayDate}
                  </h3>
                  {group.relativeBadge && (
                    <span className="text-[10px] font-mono font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 px-2 py-0.5 rounded-full ml-1 uppercase">
                      {group.relativeBadge}
                    </span>
                  )}
                </div>

                <div className="h-px flex-1 bg-gradient-to-r from-slate-700/80 to-transparent"></div>

                <span className="text-xs font-mono text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
                  {group.sessions.length} Rekod
                </span>
              </div>

              {/* Grid of Session Cards for This Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.sessions.map((session) => {
                  const ts = getSessionTimestamp(session);
                  const timeStr = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const risks = session.result?.risks || [];
                  const hasSimulation = !!session.simulationImage;
                  const hasMosquito = risks.some(r => r.agent.toLowerCase().includes('aedes') || r.agent.toLowerCase().includes('culex'));
                  const hasRodentOrRoach = risks.some(r => r.agent.toLowerCase().includes('tikus') || r.agent.toLowerCase().includes('lipas') || r.label.toLowerCase().includes('palet'));

                  return (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSessionId(session.id)}
                      className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/60 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-lg hover:shadow-cyan-950/30"
                    >
                      <div>
                        {/* Thumbnail Image with status pill */}
                        <div className="relative w-full h-48 rounded-xl overflow-hidden mb-3 bg-slate-950 border border-slate-800 group-hover:border-cyan-500/40 transition-colors">
                          <img
                            src={session.imageSrc}
                            alt={session.fileName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.onerror = null;
                              target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='250' viewBox='0 0 400 250' style='background:%230f172a'><rect width='400' height='250' fill='%230f172a'/><text x='50%25' y='45%25' fill='%2338bdf8' font-size='15' font-family='monospace' font-weight='bold' text-anchor='middle'>REKOD PEMERIKSAAN KKM</text><text x='50%25' y='60%25' fill='%2394a3b8' font-size='11' font-family='sans-serif' text-anchor='middle'>Klik untuk perincian analisis &amp; remediasi</text></svg>";
                            }}
                          />

                          {/* Simulation mini indicator */}
                          {hasSimulation && (
                            <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md border border-cyan-400/80 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-cyan-300 flex items-center gap-1 shadow-lg">
                              <span>✨</span>
                              <span>SLIDER BERSIH SIAP</span>
                            </div>
                          )}

                          {/* Mode Badge */}
                          <div className="absolute bottom-2 left-2 bg-slate-950/85 backdrop-blur-md border border-slate-700 px-2 py-0.5 rounded text-[9px] font-mono text-slate-300 uppercase">
                            {session.mode === 'KKM_FOOD_STANDARD' ? 'STANDARD KKM' : 'KAWALAN VEKTOR'}
                          </div>

                          {/* Date & Time badge */}
                          <div className="absolute bottom-2 right-2 bg-black/85 backdrop-blur border border-slate-700/80 px-2 py-0.5 rounded-lg text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 shadow">
                            <span>📅 {new Date(ts).toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-US', { day: 'numeric', month: 'short' })}</span>
                            <span className="text-slate-500">•</span>
                            <span>⏱️ {timeStr}</span>
                          </div>
                        </div>

                        {/* Title & File Name */}
                        <h4 className="text-sm font-bold font-sci-fi text-white truncate mb-1 group-hover:text-cyan-400 transition-colors">
                          {session.fileName}
                        </h4>

                        {/* Risk count and tags */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            risks.length > 0 ? 'bg-red-950/80 text-red-400 border border-red-500/30' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {risks.length > 0 ? `⚠️ ${risks.length} Risiko Dikesan` : '✅ Tiada Risiko'}
                          </span>

                          {hasMosquito && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-500/20">
                              🦟 Aedes/Culex
                            </span>
                          )}

                          {hasRodentOrRoach && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/20">
                              🐀 Tikus/Lipas
                            </span>
                          )}
                        </div>

                        {/* Brief Snippet */}
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                          {session.result?.generalAdvice || 'Klik untuk meneliti laporan penuh serta panduan remediasi KKM.'}
                        </p>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          <span>Buka Hasil Penuh</span>
                          <span>→</span>
                        </span>

                        {/* Delete button (owner protected) */}
                        <button
                          onClick={(e) => handleTriggerDelete(session.id, e)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors text-xs"
                          title={isOwner ? "Padam rekod ini" : "Khas untuk Pemilik Berdaftar"}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Owner Authentication Modal */}
      <OwnerAuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setPendingDeleteAction(null);
        }}
        onSuccess={handleAuthSuccess}
        targetActionDescription={pendingDeleteAction?.type === 'ALL' ? 'memadam SEMUA rekod pangkalan data' : 'memadam rekod analisis ini'}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { AnalysisResponse, KKMSectionResult } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface KKMReportProps {
  result: AnalysisResponse;
  onUpdateResult?: (updatedResult: AnalysisResponse) => void;
}

const KKMReport: React.FC<KKMReportProps> = ({ result, onUpdateResult }) => {
  const { language, t } = useLanguage();
  
  if (!result.kkmReport) {
    return <div className="p-4 text-center text-red-400 font-mono">Data Laporan KKM tidak ditemui.</div>;
  }

  const { grade, totalScore, totalDemerit, sections, summary, recommendation } = result.kkmReport;

  // State Management for Interactive Edits
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingSection, setEditingSection] = useState<KKMSectionResult | null>(null);
  const [editingSummary, setEditingSummary] = useState<boolean>(false);
  const [tempSummaryText, setTempSummaryText] = useState<string>('');
  
  // Temporary fields for section editor modal
  const [tempDemerit, setTempDemerit] = useState<number>(0);
  const [tempViolations, setTempViolations] = useState<string[]>([]);
  const [newViolationText, setNewViolationText] = useState<string>('');

  // Synchronize summary text buffer when entering summary edit mode
  useEffect(() => {
    if (editingSummary) {
      setTempSummaryText(summary || '');
    }
  }, [editingSummary, summary]);

  // Synchronize modal buffer fields when editing a KKM section
  useEffect(() => {
    if (editingSection) {
      setTempDemerit(editingSection.demeritReceived || 0);
      setTempViolations([...(editingSection.violations || [])]);
      setNewViolationText('');
    }
  }, [editingSection]);

  // Trigger Save to Parent State & Session Storage
  const triggerParentUpdate = (updatedSections: KKMSectionResult[], customSummary?: string) => {
    if (!onUpdateResult) return;

    const demeritSum = updatedSections.reduce((sum, s) => sum + (s.demeritReceived || 0), 0);
    const calculatedScore = Math.max(10, 100 - demeritSum);
    const finalSummary = customSummary !== undefined ? customSummary : summary;

    // Recalculate Gred & Recommendation berdasarkan official KKM standards
    let calculatedGrade: 'A' | 'B' | 'C' | 'D' | 'F' | 'TUTUP' = 'A';
    let calculatedRecommendation = '';

    if (calculatedScore >= 90) {
      calculatedGrade = 'A';
      calculatedRecommendation = language === 'ms' 
        ? 'PREMIS BERSIH & MEMUASKAN (LULUS)' 
        : 'CLEAN & SATISFACTORY PREMISE (PASS)';
    } else if (calculatedScore >= 80) {
      calculatedGrade = 'B';
      calculatedRecommendation = language === 'ms' 
        ? 'PREMIS DI TAHAP MEMUASKAN (LULUS)' 
        : 'SATISFACTORY PREMISE (PASS)';
    } else if (calculatedScore >= 70) {
      calculatedGrade = 'C';
      calculatedRecommendation = language === 'ms' 
        ? 'PREMIS DI BAWAH PEMANTAUAN (LULUS BERSYARAT - TINDAKAN PEMBETULAN DALAM 14 HARI)' 
        : 'PREMISE UNDER MONITORING (CONDITIONAL PASS - RECTIFICATION WITHIN 14 DAYS)';
    } else if (calculatedScore >= 50) {
      calculatedGrade = 'D';
      calculatedRecommendation = language === 'ms' 
        ? 'ARAHAN TINDAKAN PEMBETULAN KETAT DAN AMARAN KKM SEGERA' 
        : 'STRICT CORRECTIVE ACTION Directives & IMMEDIATE WARNING ISSUED';
    } else {
      calculatedGrade = 'TUTUP';
      calculatedRecommendation = language === 'ms' 
        ? 'ARAHAN PENUTUPAN PREMIS SERTA-MERTA DI BAWAH SEKSYEN 11 AKTA MAKANAN 1983' 
        : 'IMMEDIATE PREMISE CLOSURE MANDATE UNDER SECTION 11 OF FOOD ACT 1983';
    }

    const updatedKMReport = {
      ...result.kkmReport,
      sections: updatedSections,
      totalDemerit: demeritSum,
      totalScore: calculatedScore,
      grade: calculatedGrade,
      recommendation: calculatedRecommendation,
      summary: finalSummary
    };

    // Also update overall hygieneLevel rating to synchronize map/radar scores (ranges 1 to 5)
    // where hygieneLevel 1 is clean, 5 is closed. Map calculatedScore (100 -> level 1, 49 -> level 5)
    let dynamicHygieneLevel = 3;
    if (calculatedScore >= 90) dynamicHygieneLevel = 1;
    else if (calculatedScore >= 80) dynamicHygieneLevel = 2;
    else if (calculatedScore >= 70) dynamicHygieneLevel = 3;
    else if (calculatedScore >= 50) dynamicHygieneLevel = 4;
    else dynamicHygieneLevel = 5;

    onUpdateResult({
      ...result,
      hygieneLevel: dynamicHygieneLevel,
      kkmReport: updatedKMReport
    });
  };

  // Safe Add Violation
  const handleAddViolation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newViolationText.trim()) return;
    setTempViolations(prev => [...prev, newViolationText.trim()]);
    setNewViolationText('');
  };

  // Delete Violation
  const handleDeleteViolation = (index: number) => {
    setTempViolations(prev => prev.filter((_, idx) => idx !== index));
  };

  // Reset Section to Clean/Compliant (0 demerit points)
  const handleResetSection = () => {
    setTempDemerit(0);
    setTempViolations([]);
  };

  // Save changes for edited KKM Inspection Section
  const handleSaveSectionChanges = () => {
    if (!editingSection) return;

    // Safety fallback: ensure demerits never exceed maximum allowed range [0, totalPoints]
    const demerits = Math.max(0, Math.min(editingSection.totalPoints, tempDemerit));

    // If demerit is > 0, make sure there is at least a placeholder infraction listed
    let violationsToSave = [...tempViolations];
    if (demerits > 0 && violationsToSave.length === 0) {
      violationsToSave.push(language === 'ms' ? 'Kecacatan am bagi elemen.' : 'General non-conformances with KKM elements.');
    }

    const updatedSections = sections.map(sec => {
      if (sec.code === editingSection.code) {
        return {
          ...sec,
          demeritReceived: demerits,
          violations: demerits === 0 ? [] : violationsToSave
        };
      }
      return sec;
    });

    triggerParentUpdate(updatedSections);
    setEditingSection(null);
  };

  // Save Executive Summary text
  const handleSaveSummary = () => {
    triggerParentUpdate(sections, tempSummaryText.trim());
    setEditingSummary(false);
  };

  return (
    <div className="bg-white text-black rounded-lg overflow-hidden shadow-2xl animate-fade-in print:shadow-none font-sans max-w-4xl mx-auto border-2 border-black">
      {/* Header Borang KKM style - High Contrast */}
      <div className="border-b-4 border-black p-4 md:p-6 bg-gray-100 relative">
         {/* Edit Inspector Mode Switcher Tool (Hidden on PDF Prints) */}
         {onUpdateResult && (
           <div className="absolute top-2 right-2 md:top-4 md:right-4 no-print">
             <button
               onClick={() => setIsEditMode(!isEditMode)}
               className={`text-xs font-bold font-mono tracking-widest px-3 py-1.5 rounded border border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-0.5 ${
                 isEditMode 
                   ? 'bg-amber-400 text-black hover:bg-amber-300' 
                   : 'bg-black text-white hover:bg-gray-800'
               }`}
             >
               🛡️ {isEditMode ? (language === 'ms' ? 'BATAL MOD INSPEKTOR' : 'EXIT INSPECTOR MODE') : (language === 'ms' ? 'MOD EDIT INSPEKTOR' : 'INSPECTOR EDIT MODE')}
             </button>
           </div>
         )}

         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-8 md:mt-0">
             <div>
                <h2 className="text-xl md:text-2xl font-extrabold uppercase tracking-wide text-black">Laporan Pemeriksaan Premis</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                   <p className="text-sm font-bold text-black uppercase">FORMAT KKM / PBT (K-PPKM-01/03)</p>
                   {isEditMode && (
                     <span className="bg-red-600 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded shadow-[1px_1px_0px_rgba(0,0,0,1)] animate-pulse">
                       *EDITING RATINGS COMPLIANCE ACTIVE
                     </span>
                   )}
                </div>
                <p className="text-xs text-black mt-1 font-mono">Dijana oleh: VectorGuard AI (Simulasi)</p>
             </div>
             
             {/* Score Card Banner */}
             <div className="flex gap-4">
                <div className="text-center border-2 border-black p-2 md:p-3 bg-white min-w-[95px] shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                    <div className="text-[10px] font-bold uppercase mb-1 text-black tracking-wider">MARKAH</div>
                    <div className="text-2xl md:text-4xl font-black text-black">{totalScore}</div>
                </div>
                <div className={`text-center border-2 p-2 md:p-3 bg-white min-w-[95px] shadow-[4px_4px_0px_rgba(0,0,0,1)] ${
                  grade === 'TUTUP' || grade === 'F' || grade === 'D' 
                    ? 'border-red-600 text-red-600 bg-red-50' 
                    : 'border-black text-black'
                }`}>
                    <div className="text-[10px] font-bold uppercase mb-1 text-black tracking-wider">GRED KKM</div>
                    <div className="text-2xl md:text-4xl font-black">{grade}</div>
                </div>
             </div>
         </div>
         
         {isEditMode && (
           <div className="mt-4 bg-yellow-100 border-2 border-amber-600 p-2 text-xs text-amber-900 rounded font-bold no-print flex items-start gap-2">
             <span>💡</span>
             <p>
               {language === 'ms' 
                 ? 'MOD PENYUNTING KKM AKTIF: Sila klik pada mana-mana perkara di bawah untuk melaraskan demerit atau menambah kesalahan rasmi.' 
                 : 'KKM EDITING ACTIVE: Click any checklist item below to adjust demerits, write inspector violations, or mark as compliant.'}
             </p>
           </div>
         )}
      </div>

      {/* Main Content Table */}
      <div className="p-4 md:p-6 bg-white">
          {/* Ulasan Eksekutif - High Contrast Box */}
          <div className="mb-6 bg-amber-50/20 p-5 md:p-6 border-2 border-black rounded-lg shadow-[6px_6px_0px_rgba(0,0,0,1)] relative group">
              <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-3">
                 <h3 className="font-black text-sm md:text-base uppercase text-black tracking-wide">
                   ULASAN HASIL PEMERIKSAAN (PPKP):
                 </h3>
                 {isEditMode && !editingSummary && (
                   <button 
                     onClick={() => setEditingSummary(true)}
                     className="text-xs bg-black text-white hover:bg-slate-800 px-3 py-1 font-mono font-bold border border-black shadow-[1px_1px_0px_rgba(0,0,0,1)] no-print uppercase"
                   >
                     ✏️ {language === 'ms' ? 'KEMASKINI ULASAN' : 'UPDATE COMMENT'}
                   </button>
                 )}
              </div>
              
              {editingSummary ? (
                <div className="space-y-3 no-print">
                   <textarea
                     value={tempSummaryText}
                     onChange={(e) => setTempSummaryText(e.target.value)}
                     rows={3}
                     className="w-full bg-yellow-50/50 text-black border-2 border-black p-3 rounded font-mono font-bold text-sm outline-none"
                     placeholder={language === 'ms' ? 'Masukkan rumusan hasil pemeriksaan rasmi anda...' : 'Enter your official inspection findings summary narrative...'}
                   />
                   <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => setEditingSummary(false)} 
                        className="px-3 py-1 bg-gray-200 text-black border border-black font-bold text-xs"
                      >
                        ❌ {language === 'ms' ? 'BATAL' : 'CANCEL'}
                      </button>
                      <button 
                        onClick={handleSaveSummary} 
                        className="px-3 py-1 bg-black text-white border border-black font-bold text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                      >
                        💾 {language === 'ms' ? 'SIMPAN' : 'SAVE'}
                      </button>
                   </div>
                </div>
              ) : (
                <p className="text-base md:text-lg text-black font-extrabold leading-relaxed italic">
                  "{summary}"
                </p>
              )}
          </div>

          {/* Interactive Inspection Checklist Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse border-2 border-black">
                <thead className="bg-black text-white">
                    <tr>
                        <th className="border border-white p-2 text-left w-12">KOD</th>
                        <th className="border border-white p-2 text-left">PERKARA / ELEMEN PENILAIAN</th>
                        <th className="border border-white p-2 text-center w-20">PEMBERAT</th>
                        <th className="border border-white p-2 text-center w-20">DEMERIT</th>
                    </tr>
                </thead>
                <tbody>
                    {sections.map((sec, idx) => {
                        const hasDemerit = (sec.demeritReceived || 0) > 0;
                        return (
                          <tr 
                            key={idx} 
                            onClick={() => {
                              if (isEditMode) {
                                setEditingSection(sec);
                              }
                            }}
                            className={`border-b border-black select-none transition-colors ${
                              hasDemerit ? 'bg-red-50 hover:bg-red-100/70' : 'bg-white hover:bg-gray-100/50'
                            } ${isEditMode ? 'cursor-pointer border-l-4 border-l-transparent hover:border-l-amber-500' : ''}`}
                            title={isEditMode ? 'Klik untuk edit perkara ini' : undefined}
                          >
                              <td className="border-r border-black p-2.5 text-center font-bold text-black">{sec.code}</td>
                              <td className="border-r border-black p-2.5 relative">
                                  <div className="flex items-center justify-between">
                                      <div className="font-bold text-black uppercase text-xs">
                                        {sec.title}
                                      </div>
                                      
                                      {isEditMode && (
                                        <span className="no-print opacity-0 group-hover:opacity-100 text-xs text-amber-600 font-mono font-bold animate-pulse">
                                          ✏️ CLICK TO EDIT
                                        </span>
                                      )}
                                  </div>

                                  {hasDemerit && (
                                      <div className="mt-2.5 p-2 bg-white/70 border border-red-200 rounded">
                                         <span className="text-[9px] font-extrabold bg-red-600 text-white px-2 py-0.5 rounded shadow-[1px_1px_0px_rgba(0,0,0,1)] uppercase tracking-wider">
                                           {language === 'ms' ? 'REKOD AUDIT ADUAN' : 'AUDIT INFRACTIONS LIST'}
                                         </span>
                                         <ul className="list-decimal list-inside mt-1.5 text-black font-semibold text-xs pl-1 space-y-1">
                                             {(sec.violations || []).map((v, vIdx) => (
                                               <li key={vIdx} className="break-words leading-snug">{v}</li>
                                             ))}
                                         </ul>
                                      </div>
                                  )}
                              </td>
                              <td className="border-r border-black p-2.5 text-center font-bold text-gray-400">{sec.totalPoints}</td>
                              <td className={`p-2.5 text-center font-black text-lg ${
                                hasDemerit ? 'text-red-600 bg-red-100/40' : 'text-gray-300'
                              }`}>
                                  {hasDemerit ? `-${sec.demeritReceived}` : '0'}
                              </td>
                          </tr>
                        );
                    })}
                    {/* Summary Row */}
                    <tr className="bg-black text-white font-bold border-t-4 border-black">
                        <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-xs font-mono">
                          {language === 'ms' ? 'JUMLAH MARKAH DEMERIT DIPOTONG' : 'TOTAL DEMERIT POINTS DEDUCTED'}
                        </td>
                        <td className="p-3 text-center text-xl bg-gray-900 text-white">-{totalDemerit}</td>
                    </tr>
                </tbody>
            </table>
          </div>

          <div className={`mt-6 p-4 border-4 rounded-lg text-center font-bold uppercase shadow-lg ${
            grade === 'TUTUP' || grade === 'F' || grade === 'D' 
              ? 'border-red-600 bg-red-50 text-red-950 font-black' 
              : 'border-black bg-gray-50 text-black font-extrabold'
          }`}>
              <div className="text-xs mb-1 tracking-widest text-gray-500 font-mono-sci">
                {language === 'ms' ? 'KEPUTUSAN KELULUSAN PREMIS:' : 'PREMISE LICENSING STANDARDS DECISION:'}
              </div>
              <div className="text-lg md:text-2xl tracking-widest leading-snug">{recommendation}</div>
          </div>
      </div>

      {/* DETAILED INTERACTIVE ELEMENT EDITOR MODAL */}
      {editingSection && (
        <div className="fixed inset-0 z-[500] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 no-print animate-fade-in">
          <div className="bg-white border-4 border-black rounded-xl w-full max-w-lg shadow-[8px_8px_0px_rgba(0,0,0,1)] overflow-hidden">
             
             {/* Modal Header */}
             <div className="bg-black text-white p-4 flex justify-between items-center border-b-4 border-black">
                <div className="flex items-center gap-2">
                   <span className="text-xl">🛡️</span>
                   <div>
                      <h4 className="font-black text-sm md:text-base uppercase tracking-wider leading-none">
                        RUANGAN PPKP: ELEMEN {editingSection.code}
                      </h4>
                      <span className="text-[10px] font-mono font-bold text-yellow-300 uppercase mt-1 block">
                        KKM BORANG K-PPKM-01/03 UNIT INSPEKTORAT
                      </span>
                   </div>
                </div>
                <button 
                  onClick={() => setEditingSection(null)} 
                  className="bg-red-600 border-2 border-white hover:bg-red-500 text-white w-8 h-8 flex items-center justify-center rounded font-bold text-sm shadow-[2px_2px_0px_rgba(255,255,255,1)]"
                >
                  ✕
                </button>
             </div>

             {/* Modal Body */}
             <div className="p-5 space-y-5 text-left">
                
                {/* Element Description */}
                <div>
                   <label className="block text-[10px] font-extrabold text-blue-800 uppercase tracking-widest mb-1 font-mono">
                     {language === 'ms' ? 'NAMA ELEMENT KKM' : 'OFFICIAL ELEM COMPLIANCE'}
                   </label>
                   <p className="text-base font-extrabold text-black uppercase border-b border-gray-300 pb-2">
                     {editingSection.title}
                   </p>
                </div>

                {/* Score Controls */}
                <div className="bg-gray-100 border-2 border-black rounded-lg p-3.5 space-y-3">
                   <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-black uppercase">
                        {language === 'ms' ? 'HAD MARKAH DEMERIT:' : 'DEMERIT CEILING LIMIT:'}
                      </span>
                      <span className="bg-black text-white px-2 py-0.5 rounded font-mono font-extrabold text-xs">
                        {editingSection.totalPoints} PTS
                      </span>
                   </div>
                   
                   <div className="flex items-center gap-4">
                      <div className="flex-1">
                         <input 
                           type="range"
                           min={0}
                           max={editingSection.totalPoints}
                           value={tempDemerit}
                           onChange={(e) => setTempDemerit(parseInt(e.target.value))}
                           className="w-full accent-red-600 h-2 cursor-pointer bg-gray-300 rounded-lg"
                         />
                         <div className="flex justify-between mt-1 text-[9px] font-bold text-gray-500 uppercase">
                            <span>0 (CLEAN/MEMUASKAN)</span>
                            <span>{editingSection.totalPoints} (MAX PENALTI)</span>
                         </div>
                      </div>
                      <div className="w-16 text-center border-2 border-black rounded p-2 bg-white flex flex-col justify-center items-center">
                         <span className="text-[8px] font-bold text-gray-500 uppercase leading-none block mb-1">DEMERIT</span>
                         <span className="text-xl font-black text-red-600">-{tempDemerit}</span>
                      </div>
                   </div>
                </div>

                {/* Dynamic Violations/Observations list */}
                {tempDemerit > 0 && (
                  <div className="space-y-3">
                     <label className="block text-[10px] font-extrabold text-red-600 uppercase tracking-widest font-mono">
                       ⚠️ {language === 'ms' ? 'SABITAN ELEMEN KECACATAN PENEMUAN' : 'RECORDED INCIDENT EVIDENCE'} ({tempViolations.length})
                     </label>
                     
                     {tempViolations.length === 0 ? (
                       <p className="text-xs italic text-gray-500">
                         {language === 'ms' ? 'Sila taip aduan dsb. di bawah untuk diperincikan di dalam borang lampiran.' : 'Please add inspection comments below to details infractions.'}
                       </p>
                     ) : (
                       <div className="max-h-[140px] overflow-y-auto border-2 border-black rounded p-2 space-y-1.5 custom-scrollbar bg-gray-50">
                          {tempViolations.map((v, vIdx) => (
                            <div key={vIdx} className="flex justify-between items-start gap-2 bg-white text-black text-xs border border-gray-300 rounded p-2 shadow-sm font-semibold">
                               <span className="line-clamp-2 flex-1">{v}</span>
                               <button 
                                 type="button" 
                                 onClick={() => handleDeleteViolation(vIdx)}
                                 className="text-red-600 hover:text-red-500 font-bold px-1.5 py-0.5 rounded border border-red-300 hover:border-red-500 bg-red-50 transition-colors"
                                 title="Delete finding"
                               >
                                 ✕
                               </button>
                            </div>
                          ))}
                       </div>
                     )}

                     {/* Add New Violation Inline Form */}
                     <form onSubmit={handleAddViolation} className="flex gap-2">
                        <input
                          type="text"
                          value={newViolationText}
                          onChange={(e) => setNewViolationText(e.target.value)}
                          placeholder={language === 'ms' ? 'Contoh: Lantai retak, becak dan berminyak...' : 'E.g., Floor tiles broken and oily...'}
                          className="flex-1 bg-white border border-gray-400 p-2 text-xs rounded text-black font-semibold outline-none focus:border-black"
                        />
                        <button
                          type="submit"
                          disabled={!newViolationText.trim()}
                          className="px-3 bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white font-bold text-xs rounded border border-black shadow-[1px_1px_0px_rgba(0,0,0,1)] uppercase flex items-center justify-center"
                        >
                          ➕ {language === 'ms' ? 'TAMBAH' : 'ADD'}
                        </button>
                     </form>
                  </div>
                )}
             </div>

             {/* Modal Footer Controls */}
             <div className="bg-gray-100 p-4 border-t-2 border-black flex flex-wrap gap-2 justify-between">
                <button
                  type="button"
                  onClick={handleResetSection}
                  className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 border border-black text-black font-bold text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase"
                  title="Zero out demerit points and empty violations"
                >
                  🧹 {language === 'ms' ? 'PEMBERSIHAN 100%' : 'MARK COMPLIANT'}
                </button>
                
                <div className="flex gap-2">
                   <button
                     type="button"
                     onClick={() => setEditingSection(null)}
                     className="px-3 py-1.5 bg-white hover:bg-gray-200 border border-black text-black font-bold text-xs"
                   >
                     ❌ {language === 'ms' ? 'BATAL' : 'CANCEL'}
                   </button>
                   <button
                     type="button"
                     onClick={handleSaveSectionChanges}
                     className="px-4 py-1.5 bg-black hover:bg-gray-800 border-2 border-black text-white font-bold text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)] uppercase"
                   >
                     💾 {language === 'ms' ? 'SIMPAN REKOD' : 'SAVE CHANGES'}
                   </button>
                </div>
             </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default KKMReport;

import React, { useState, useRef } from 'react';
import { ComplianceAuditResult, RiskDetection } from '../../types';
import { verifyCleaningCompliance } from '../../services/geminiService';
import { BeforeAfterSlider } from '../ArchivePage/BeforeAfterSlider';

interface ComplianceAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalImageSrc: string;
  detectedRisks: RiskDetection[];
  existingAudit?: ComplianceAuditResult;
  onSaveAudit?: (auditResult: ComplianceAuditResult) => void;
  language?: string;
}

export const ComplianceAuditModal: React.FC<ComplianceAuditModalProps> = ({
  isOpen,
  onClose,
  originalImageSrc,
  detectedRisks,
  existingAudit,
  onSaveAudit,
  language = 'ms'
}) => {
  const [afterImage, setAfterImage] = useState<string | null>(existingAudit?.afterImageSrc || null);
  const [auditResult, setAuditResult] = useState<ComplianceAuditResult | null>(existingAudit || null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAfterImage(reader.result);
        setAuditResult(null);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Gagal membaca fail imej. Sila pilih fail JPG/PNG yang sah.');
    };
    reader.readAsDataURL(file);
  };

  const handleRunAudit = async () => {
    if (!afterImage) return;
    setIsAuditing(true);
    setErrorMsg(null);
    try {
      const res = await verifyCleaningCompliance(originalImageSrc, afterImage, detectedRisks, language);
      setAuditResult(res);
      if (onSaveAudit) {
        onSaveAudit(res);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ralat semasa menjalankan audit pematuhan AI.');
    } finally {
      setIsAuditing(false);
    }
  };

  const getVerdictBadge = (verdict: 'LULUS' | 'BERSYARAT' | 'GAGAL') => {
    if (verdict === 'LULUS') {
      return 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60';
    }
    if (verdict === 'BERSYARAT') {
      return 'bg-amber-950/90 text-amber-300 border-amber-500/60';
    }
    return 'bg-red-950/90 text-red-300 border-red-500/60';
  };

  const getStatusText = (status: 'RESOLVED' | 'PARTIAL' | 'UNRESOLVED') => {
    if (status === 'RESOLVED') return { label: 'SELESAI DIBERSIHKAN', color: 'text-emerald-400' };
    if (status === 'PARTIAL') return { label: 'SEBAHAGIAN SAHAJA', color: 'text-amber-400' };
    return { label: 'BELUM DISELESAIKAN', color: 'text-red-400' };
  };

  return (
    <div className="fixed inset-0 z-[260] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Bar */}
        <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <span>AUDIT PEMATUHAN SELEPAS PEMBERSIHAN</span>
              <span aria-hidden="true">·</span>
              <span>VERIFIKASI BUKTI SEBENAR</span>
            </div>
            <h2 className="text-lg sm:text-xl font-sci-fi font-bold text-white mt-0.5">
              Pengesahan Pembersihan Premis (Sebelum vs Selepas Sebenar)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700 transition-colors"
            title="Tutup"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6">
          {/* Upload / Action Bar */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Muat Naik Gambar Bukti Selepas Dicuci / Dibersihkan
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ambil gambar sudut premis yang sama selepas kerja pembersihan selesai untuk pengesahan pematuhan AI dan perbandingan gelangser.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-100 transition-colors"
              >
                {afterImage ? '📸 Tukar Gambar Selepas' : '📤 Pilih Gambar Selepas'}
              </button>
              {afterImage && (
                <button
                  onClick={handleRunAudit}
                  disabled={isAuditing}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-emerald-950/50 transition-all"
                >
                  {isAuditing ? '⏳ Mengaudit...' : '🔍 Jalankan Audit AI'}
                </button>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-950/60 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-xs">
              {errorMsg}
            </div>
          )}

          {/* Comparison Slider or Preview */}
          {afterImage ? (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-4">
              <BeforeAfterSlider
                originalImage={originalImageSrc}
                simulatedImage={afterImage}
                title="PERBANDINGAN BUKTI SEBENAR: SEBELUM (ASAL) vs SELEPAS DICUCI"
              />
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-950/50 hover:bg-slate-900/60 rounded-2xl p-10 text-center cursor-pointer transition-all"
            >
              <div className="text-4xl mb-3">📷</div>
              <h4 className="text-base font-bold text-slate-200">
                Klik di sini untuk memuat naik Gambar Selepas Pembersihan
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Sistem akan membandingkan secara automatik terhadap {detectedRisks.length} penemuan risiko asal dan mengeluarkan Skor Pematuhan Pembersihan (%).
              </p>
            </div>
          )}

          {/* Audit Result Section */}
          {isAuditing && (
            <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-8 text-center">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <h4 className="text-sm font-bold font-sci-fi text-emerald-400 tracking-wider uppercase">
                MEMBANDINGKAN BUKTI SEBELUM & SELEPAS SECARA FORENSIK...
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Menyemak sama ada bekas takungan, sisa, dan tempat pembiakan vektor telah dihapuskan.
              </p>
            </div>
          )}

          {auditResult && !isAuditing && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="text-xs font-mono text-slate-400">
                    KEPUTUSAN AUDIT PEMATUHAN KKM · {new Date(auditResult.verifiedAt).toLocaleString('ms-MY')}
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">
                    Sijil Pengesahan Pemulihan Premis
                  </h3>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[11px] font-mono text-slate-400">SKOR PEMATUHAN</div>
                    <div className="text-3xl font-extrabold font-sci-fi text-emerald-400">
                      {auditResult.complianceScore}%
                    </div>
                  </div>
                  <div className={`px-3.5 py-2 rounded-lg border font-mono text-xs font-bold ${getVerdictBadge(auditResult.verdict)}`}>
                    STATUS: {auditResult.verdict}
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/80 border-l-4 border-emerald-500 p-3.5 rounded-r-lg">
                {auditResult.summary}
              </p>

              {/* Item-by-item verification table */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2.5">
                  Semakan Setiap Penemuan Risiko Asal ({auditResult.items.length} Item)
                </h4>
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
                  {auditResult.items.map((item, idx) => {
                    const st = getStatusText(item.status);
                    return (
                      <div key={idx} className="p-3.5 bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="text-sm font-bold text-slate-100">
                            {idx + 1}. {item.riskLabel}
                          </div>
                          <div className="text-xs text-slate-400">{item.comment}</div>
                        </div>
                        <div className={`text-xs font-mono font-bold shrink-0 ${st.color}`}>
                          {st.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

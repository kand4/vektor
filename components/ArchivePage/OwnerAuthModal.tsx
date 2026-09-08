import React, { useState } from 'react';
import { OWNER_EMAIL, verifyOwnerPasskey, setOwnerAuthorized } from '../../utils/archiveHelpers';

interface OwnerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetActionDescription?: string;
}

export const OwnerAuthModal: React.FC<OwnerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetActionDescription = 'memadam rekod simulasi ini'
}) => {
  const [passkey, setPasskey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    if (verifyOwnerPasskey(passkey)) {
      setOwnerAuthorized(true);
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } else {
      setIsSubmitting(false);
      setErrorMsg('Kata laluan/PIN pemilik tidak tepat. Hanya legasiuka@gmail.com dibenarkan memadam rekod.');
    }
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border-2 border-red-500/60 rounded-2xl p-6 md:p-8 max-w-md w-full relative shadow-[0_0_50px_rgba(239,68,68,0.25)] text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 rounded-full w-8 h-8 flex items-center justify-center hover:bg-slate-700 transition-colors"
        >
          ✕
        </button>

        <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-500/50 flex items-center justify-center text-2xl mb-4 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
          🔒
        </div>

        <div className="inline-block bg-red-950/60 border border-red-500/40 text-red-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full mb-2 uppercase tracking-wider">
          KAWALAN KESELAMATAN PEMILIK
        </div>

        <h3 className="text-xl font-bold font-sci-fi text-white mb-2">
          PENGESAHAN IDENTITI PEMILIK
        </h3>

        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
          Hanya pemilik berdaftar (<span className="text-red-400 font-mono font-bold">{OWNER_EMAIL}</span>) yang mempunyai kebenaran rasmi untuk {targetActionDescription}.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
              KATA LALUAN / PIN PEMILIK:
            </label>
            <input
              type="password"
              value={passkey}
              onChange={(e) => {
                setPasskey(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Masukkan PIN / Kata Laluan Pemilik..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-red-400 focus:ring-1 focus:ring-red-400 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 font-mono outline-none transition-all"
              autoFocus
            />
            {errorMsg && (
              <p className="text-red-400 text-xs font-mono mt-2 flex items-center gap-1.5 animate-shake">
                <span>⚠️</span> {errorMsg}
              </p>
            )}
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 leading-relaxed font-sans">
            <span className="text-slate-300 font-bold">Nota Keselamatan:</span> Pelawat hanya diberikan akses bacaan (<span className="text-cyan-400">Read-Only</span>) untuk meneliti hasil simulasi, slider sebelum & selepas, serta panduan keselamatan KKM.
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-bold font-mono transition-colors"
            >
              BATAL
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !passkey.trim()}
              className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-bold font-mono tracking-wider transition-all shadow-lg shadow-red-950/50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'MEMPROSES...' : 'SAHKAN IDENTITI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

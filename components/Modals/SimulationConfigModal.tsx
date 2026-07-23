import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SimulationConfig } from '../../services/geminiService';

const OptionBtn = ({ label, selected, onClick }: any) => (
    <button 
      onClick={onClick} 
      className={`w-full p-3 rounded text-xs md:text-sm font-bold border transition-all flex items-center justify-center gap-2 ${selected ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
    >
      {label}
    </button>
);

interface SimulationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: SimulationConfig) => void;
}

export const SimulationConfigModal: React.FC<SimulationConfigModalProps> = ({ isOpen, onClose, onStart }) => {
  const { t } = useLanguage();
  const [mode, setMode] = React.useState<SimulationConfig['mode']>('SANITIZE_ONLY');
  const [humans, setHumans] = React.useState<SimulationConfig['humans']>('KEEP_PROTECTED');
  const [lighting, setLighting] = React.useState<SimulationConfig['lighting']>('CLINICAL_BLUE');
  const [engine, setEngine] = React.useState<SimulationConfig['engine']>('POLLINATIONS');
  const [customPrompt, setCustomPrompt] = React.useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in no-print">
        <div className="bg-slate-900 border border-cyan-500 rounded-xl p-6 w-full max-w-lg shadow-[0_0_50px_rgba(34,211,238,0.3)] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-xl font-sci-fi font-bold text-white mb-6 flex items-center gap-2">
               <span className="text-cyan-400">🧬 {t('sim_title')}</span>
            </h3>

            <div className="space-y-6">
                <div>
                   <label className="text-xs text-slate-400 font-mono-sci uppercase block mb-2">{t('sim_objective')}</label>
                   <div className="grid grid-cols-1 gap-2">
                      <OptionBtn label={t('opt_sanitize')} selected={mode === 'SANITIZE_ONLY'} onClick={() => setMode('SANITIZE_ONLY')} />
                      <OptionBtn label={t('opt_upgrade')} selected={mode === 'UPGRADE_FURNITURE'} onClick={() => setMode('UPGRADE_FURNITURE')} />
                      <OptionBtn label={t('opt_recon')} selected={mode === 'FULL_RECONSTRUCTION'} onClick={() => setMode('FULL_RECONSTRUCTION')} />
                   </div>
                </div>

                <div>
                   <label className="text-xs text-slate-400 font-mono-sci uppercase block mb-2">{t('sim_protocol')}</label>
                   <div className="grid grid-cols-2 gap-2">
                      <OptionBtn label={t('opt_keep_ppe')} selected={humans === 'KEEP_PROTECTED'} onClick={() => setHumans('KEEP_PROTECTED')} />
                      <OptionBtn label={t('opt_remove_humans')} selected={humans === 'REMOVE'} onClick={() => setHumans('REMOVE')} />
                   </div>
                </div>
                
                <div>
                   <label className="text-xs text-slate-400 font-mono-sci uppercase block mb-2">{t('label_atmosphere')}</label>
                   <div className="grid grid-cols-3 gap-2">
                      <OptionBtn label={t('opt_clinical')} selected={lighting === 'CLINICAL_BLUE'} onClick={() => setLighting('CLINICAL_BLUE')} />
                      <OptionBtn label={t('opt_natural')} selected={lighting === 'NATURAL'} onClick={() => setLighting('NATURAL')} />
                      <OptionBtn label={t('opt_warm')} selected={lighting === 'WARM'} onClick={() => setLighting('WARM')} />
                   </div>
                </div>

                <div>
                   <label className="text-xs text-slate-400 font-mono-sci uppercase block mb-2">{t('label_ai_engine')}</label>
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <OptionBtn label="✨ GEMINI (Imagen 4)" selected={engine === 'GEMINI_IMAGEN'} onClick={() => setEngine('GEMINI_IMAGEN')} />
                      <OptionBtn label="🌸 FLUX (Pollinations)" selected={engine === 'POLLINATIONS'} onClick={() => setEngine('POLLINATIONS')} />
                      <OptionBtn label="✍️ MANUAL (Web)" selected={engine === 'MANUAL'} onClick={() => setEngine('MANUAL')} />
                   </div>
                   <p className="text-[10px] text-slate-500 mt-2 italic leading-relaxed">
                       {t('sim_engine_tip')}
                   </p>
                </div>
                
                <div>
                    <label className="text-xs text-slate-400 font-mono-sci uppercase block mb-2">{t('sim_prompt')}</label>
                    <textarea 
                        className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white text-sm outline-none focus:border-cyan-500"
                        rows={3}
                        placeholder={t('sim_prompt_placeholder')}
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex gap-3 justify-end mt-8">
                <button onClick={onClose} className="px-5 py-2 rounded text-slate-400 font-bold hover:text-white transition">{t('btn_cancel')}</button>
                <button 
                  onClick={() => onStart({ mode, humans, lighting, engine, customPrompt })}
                  className="px-6 py-2 rounded bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/30 flex items-center gap-2"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576L8.279 5.044A.75.75 0 019 4.5z" clipRule="evenodd" /></svg>
                   {t('btn_generate_sim')}
                </button>
            </div>
        </div>
    </div>
  )
};

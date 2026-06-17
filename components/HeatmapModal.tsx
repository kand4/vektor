import React from 'react';

const HeatmapModal: React.FC<{isOpen: boolean, onClose: () => void}> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-emerald-500/50 p-4 sm:p-6 rounded-lg w-full max-w-5xl h-[85vh] flex flex-col relative">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg sm:text-xl font-bold text-emerald-400 font-sci-fi tracking-wider">Peta Kawasan Web Denggi (HACK MODE)</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center border border-slate-700 transition" aria-label="Tutup" title="Tutup">✕</button>
                </div>
                <div className="flex-1 w-full bg-slate-800 rounded mb-2 overflow-hidden border border-slate-700 relative">
                    <iframe 
                        src="https://idengue.mysa.gov.my/pageifv2/" 
                        title="Peta iDengue"
                        className="absolute inset-0 w-full h-full border-0"
                        allowFullScreen
                    ></iframe>
                </div>
                <div className="text-right mt-2 text-xs text-slate-500 font-mono-sci">
                    SUMBER: IDENGUE.MYSA.GOV.MY
                </div>
            </div>
        </div>
    );
};

export default HeatmapModal;

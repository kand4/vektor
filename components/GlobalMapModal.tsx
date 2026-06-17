import React from 'react';

const GlobalMapModal: React.FC<{isOpen: boolean, onClose: () => void}> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto">
            <div 
                className="bg-slate-900 border border-emerald-500/50 p-4 sm:p-6 rounded-lg flex flex-col relative resize overflow-hidden shadow-2xl"
                style={{ width: '80vw', height: '80vh', minWidth: '320px', minHeight: '300px', maxWidth: '100vw', maxHeight: '100vh' }}
            >
                <div className="flex justify-between items-center mb-4 cursor-move active:cursor-grabbing">
                    <h2 className="text-lg sm:text-xl font-bold text-emerald-400 font-sci-fi tracking-wider">Peta Wabak Global</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center border border-slate-700 transition flex-shrink-0" aria-label="Tutup" title="Tutup">✕</button>
                </div>
                <div className="flex-1 w-full bg-slate-800 rounded mb-2 overflow-hidden border border-slate-700 relative pointer-events-auto">
                    <iframe 
                        src="https://outbreaknow.org/map" 
                        title="Global Outbreak Map"
                        className="absolute inset-0 w-full h-full border-0"
                        allowFullScreen
                    ></iframe>
                </div>
                <div className="text-right mt-2 text-xs text-slate-500 font-mono-sci flex-shrink-0">
                    SUMBER: OUTBREAKNOW.ORG (Boleh Diresaiz / Resizable)
                </div>
                {/* Resizer Icon Indicator */}
                <div className="absolute bottom-0 right-0 w-5 h-5 pointer-events-none opacity-50 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-emerald-500">
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <polyline points="9 21 3 21 3 15"></polyline>
                        <line x1="21" y1="3" x2="14" y2="10"></line>
                        <line x1="3" y1="21" x2="10" y2="14"></line>
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default GlobalMapModal;

import React from 'react';

const HeatmapModal: React.FC<{isOpen: boolean, onClose: () => void}> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-emerald-500/50 p-6 rounded-lg w-full max-w-2xl text-center">
                <h2 className="text-xl font-bold text-emerald-400 mb-4">Peta Kawasan Web Denggi (HACK MODE)</h2>
                <div className="w-full h-64 bg-slate-800 rounded animate-pulse mb-4 flex items-center justify-center text-slate-500">Peta Sedang Dimuat...</div>
                <button onClick={onClose} className="px-4 py-2 bg-slate-800 border border-slate-600 rounded text-slate-300">Tutup</button>
            </div>
        </div>
    );
};

export default HeatmapModal;

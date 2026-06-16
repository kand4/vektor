import React from 'react';
import { motion } from 'motion/react';

interface Mosquito3DViewerProps {
    onClose: () => void;
}

const Mosquito3DViewer: React.FC<Mosquito3DViewerProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6 bg-black/95 backdrop-blur-3xl">
            {/* Cyberpunk Container */}
            <div className="relative w-full h-full sm:max-w-7xl sm:max-h-[90vh] bg-[#020604] sm:border border-emerald-500/30 sm:shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden font-sci-fi sm:rounded-2xl flex flex-col items-center justify-center">
                
                {/* 3D External Iframe */}
                <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden bg-black sketchfab-embed-wrapper">
                    <iframe 
                        title="Mosquito Aedes aegypti 3D" 
                        frameBorder="0"
                        allowFullScreen 
                        // @ts-ignore
                        mozallowfullscreen="true" 
                        webkitallowfullscreen="true" 
                        allow="autoplay; fullscreen; xr-spatial-tracking" 
                        xr-spatial-tracking="true" 
                        // @ts-ignore
                        execution-while-out-of-viewport="true" 
                        // @ts-ignore
                        execution-while-not-rendered="true" 
                        // @ts-ignore
                        web-share="true" 
                        src="https://sketchfab.com/models/4ec06fed125e476db97f5edc4179b325/embed?ui_theme=dark&dnt=1"
                        className="w-full h-full border-none opacity-100 scale-100"
                    ></iframe>
                </div>

                {/* Header & Controls Overlay */}
                <div className="absolute inset-0 z-40 pointer-events-none flex flex-col justify-between p-4 sm:p-8">
                    {/* Top HUD */}
                    <div className="flex justify-end items-start w-full">
                        {/* Close Button */}
                        <button 
                            onClick={onClose}
                            className="pointer-events-auto bg-black/50 border border-red-500/50 text-red-500 hover:bg-red-900/50 hover:text-red-300 p-3 flex items-center justify-center transition-all duration-300 backdrop-blur-sm group rounded-md"
                        >
                            <svg className="w-5 h-5 transform group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>

                {/* Decorative Tech Corners */}
                <div className="hidden sm:block absolute top-0 left-0 w-16 h-16 border-t-[3px] border-l-[3px] border-emerald-400 pointer-events-none opacity-80 shadow-[-5px_-5px_15px_rgba(16,185,129,0.3)]"></div>
                <div className="hidden sm:block absolute top-0 right-0 w-16 h-16 border-t-[3px] border-r-[3px] border-emerald-400 pointer-events-none opacity-80 shadow-[5px_-5px_15px_rgba(16,185,129,0.3)]"></div>
                <div className="hidden sm:block absolute bottom-0 left-0 w-16 h-16 border-b-[3px] border-l-[3px] border-emerald-400 pointer-events-none opacity-80 shadow-[-5px_5px_15px_rgba(16,185,129,0.3)]"></div>
                <div className="hidden sm:block absolute bottom-0 right-0 w-16 h-16 border-b-[3px] border-r-[3px] border-emerald-400 pointer-events-none opacity-80 shadow-[5px_5px_15px_rgba(16,185,129,0.3)]"></div>
                
            </div>
        </div>
    );
};

export default Mosquito3DViewer;

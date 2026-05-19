import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface Mosquito3DViewerProps {
    onClose: () => void;
}

const CALLOUTS = [
    {
        id: 'probosis',
        title: 'PROBOSIS',
        desc: 'Organ menusuk kulit & mengesan CO2. Saluran vektor aktif.',
        localPos: [0.5, 0.2, 0.5] 
    },
    {
        id: 'thorax',
        title: 'TORAKS "LYRE"',
        desc: 'Corak sisik putih kecapi (lyre). Pengecaman positif.',
        localPos: [0.2, 0.8, -0.2] 
    },
    {
        id: 'abdomen',
        title: 'ABDOMEN',
        desc: 'Kapasiti takungan darah. Struktur morfologi.',
        localPos: [-0.5, -0.2, 0.5] 
    },
    {
        id: 'legs',
        title: 'BELANG KAKI',
        desc: 'Sifat genus Aedes. Sendi hitam-putih.',
        localPos: [-0.2, -0.8, -0.5] 
    }
];

const Mosquito3DViewer: React.FC<Mosquito3DViewerProps> = ({ onClose }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    
    const [dynamicAnatomy, setDynamicAnatomy] = useState<Record<string, number[]>>({});
    const dynamicAnatomyRef = useRef<Record<string, number[]>>({});

    const [calibrationMode, setCalibrationMode] = useState<string | null>(null);
    const [calibrationKeys] = useState(['probosis', 'thorax', 'abdomen', 'legs']);
    
    // Kept for calibration logic reference
    const activeCalibRef = useRef<string | null>(null);
    const coordPollLoopRef = useRef<any>(null);
    const skfbApiRef = useRef<any>(null);

    useEffect(() => {
        activeCalibRef.current = calibrationMode;
    }, [calibrationMode]);

    useEffect(() => {
        // Sync ref
        dynamicAnatomyRef.current = dynamicAnatomy;
    }, [dynamicAnatomy]);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js';
        script.async = true;
        
        script.onload = () => {
            if (iframeRef.current && (window as any).Sketchfab) {
                const client = new (window as any).Sketchfab('1.12.1', iframeRef.current);
                const uid = '4ec06fed125e476db97f5edc4179b325';
                
                client.init(uid, {
                    success: function onSuccess(api: any) {
                        skfbApiRef.current = api;
                        (window as any).fooApi = api;
                        api.start();
                        api.addEventListener('viewerready', function() {
                            
                            // Tunggu model render sepenuhnya
                            setTimeout(() => {
                                setIsLoaded(true);
                                
                                api.getAnnotationList(function(err: any, annotations: any) {
                                    console.log("NATIVE ANNOTATIONS:", annotations);
                                });

                                // Start polling 2D coordinates for our custom HTML floating HUD labels
                                const pollCoords = async () => {
                                    try {
                                        if (!skfbApiRef.current) {
                                            console.log("pollCoords skipped: skfbApiRef.current is falsy");
                                            return;
                                        }
                                        console.log("pollCoords running, CALLOUTS:", CALLOUTS.length);
                                        
                                        const coordsMap: Record<string, {x: number, y: number, visible: boolean}> = {};
                                        
                                        for (let i = 0; i < CALLOUTS.length; i++) {
                                            const callout = CALLOUTS[i];
                                            let pos3D = dynamicAnatomyRef.current[callout.id] || callout.localPos;
                                            
                                            // Normalize position3D to number[]
                                            if (pos3D && !Array.isArray(pos3D) && typeof pos3D === 'object') {
                                                if ('x' in pos3D) pos3D = [pos3D.x, pos3D.y, pos3D.z];
                                                else if ('0' in pos3D) pos3D = [pos3D[0], pos3D[1], pos3D[2]];
                                            }
                                            if (Array.isArray(pos3D)) {
                                                pos3D = [Number(pos3D[0]), Number(pos3D[1]), Number(pos3D[2])];
                                            } else {
                                                pos3D = [0, 0, 0];
                                            }

                                            try {
                                                const coord2D: any = await new Promise((resolve) => {
                                                    const timeout = setTimeout(() => resolve(null), 100); // 100ms timeout per lookup
                                                    api.getWorldToScreenCoordinates(pos3D, function(err: any, res: any) {
                                                        clearTimeout(timeout);
                                                        if (err || !res) resolve(null);
                                                        else resolve(res);
                                                    });
                                                });

                                                if (coord2D && typeof coord2D.x === 'number' && typeof coord2D.y === 'number' && !isNaN(coord2D.x) && !isNaN(coord2D.y)) {
                                                    coordsMap[callout.id] = {
                                                        x: coord2D.x,
                                                        y: coord2D.y,
                                                        visible: true
                                                    };
                                                } else {
                                                    console.warn(`[DEBUG] Tracking failed for ${callout.id}: coord2D=${JSON.stringify(coord2D)}`);
                                                }
                                            } catch (e) {
                                                console.error(`[DEBUG] Exception in tracking ${callout.id}:`, e);
                                            }
                                        }
                                                    
                                        // UPDATE DOM DISINI 
                                        
                                        const containerWidth = iframeRef.current?.offsetWidth || window.innerWidth;
                                        const containerHeight = iframeRef.current?.offsetHeight || window.innerHeight;
                                        
                                        const debugEl = document.getElementById('debug-coords-hud');
                                        if (debugEl) {
                                            const debugData = CALLOUTS.map(c => {
                                                let p = dynamicAnatomyRef.current[c.id] || c.localPos;
                                                let pStr = '';
                                                if (Array.isArray(p)) pStr = p.map(n => Number(n).toFixed(2)).join(',');
                                                else if (p && typeof p === 'object') pStr = `${Number(p.x||p[0]).toFixed(2)},${Number(p.y||p[1]).toFixed(2)},${Number(p.z||p[2]).toFixed(2)}`;
                                                return `${c.id}\n3D:[${pStr}]\n2D:${coordsMap[c.id] ? Object.values(coordsMap[c.id]).map((v:any) => typeof v === 'number' ? v.toFixed(0) : v).join(',') : 'HIDE'}`;
                                            }).join(' | ');
                                            debugEl.innerText = `SYS: ${debugData}`;
                                        }

                                        CALLOUTS.forEach((c, idx) => {
                                            const coord = coordsMap[c.id];
                                            const lineEl = document.getElementById(`line-${c.id}`);
                                            const anchorEl = document.getElementById(`anchor-${c.id}`);
                                            const htmlEl = document.getElementById(`html-${c.id}`);
                                            
                                            if (!lineEl) console.warn(`[DEBUG] DOM element not found: line-${c.id}`);
                                            if (!anchorEl) console.warn(`[DEBUG] DOM element not found: anchor-${c.id}`);
                                            if (!htmlEl) console.warn(`[DEBUG] DOM element not found: html-${c.id}`);
                                            
                                            // Fallback safe rendering if coord is undefined (API error)
                                            if (coord) {
                                                const isLeft = idx % 2 === 0;
                                                
                                                // Adjust floating box positions safely
                                                const boxWidth = 200;
                                                const marginSides = 20; 
                                                
                                                let targetX = isLeft ? marginSides : Math.max(marginSides + boxWidth + 50, containerWidth - marginSides - boxWidth); 
                                                // Cap Y position to within screen boundaries
                                                const maxBoxY = Math.max(containerHeight - 150, 100);
                                                const idealY = 100 + (idx * 100);
                                                const targetY = Math.min(idealY, maxBoxY);

                                                if (lineEl) {
                                                    lineEl.setAttribute('d', `M ${coord.x} ${coord.y} C ${coord.x + (isLeft ? -50 : 50)} ${coord.y}, ${targetX + (isLeft ? 80 : -80)} ${targetY}, ${targetX + (isLeft ? boxWidth - 20 : 20)} ${targetY}`);
                                                    lineEl.style.display = 'block';
                                                }
                                                if (anchorEl) {
                                                    anchorEl.style.left = `${coord.x}px`;
                                                    anchorEl.style.top = `${coord.y}px`;
                                                    anchorEl.style.display = 'flex';
                                                }
                                                if (htmlEl) {
                                                    htmlEl.style.left = `${targetX}px`;
                                                    htmlEl.style.top = `${targetY}px`;
                                                    htmlEl.style.display = 'block';
                                                    htmlEl.style.opacity = '1';
                                                }
                                            } else {
                                                const isLeft = idx % 2 === 0;
                                                const boxWidth = 200;
                                                const marginSides = 20; 
                                                let targetX = isLeft ? marginSides : Math.max(marginSides + boxWidth + 50, containerWidth - marginSides - boxWidth); 
                                                const maxBoxY = Math.max(containerHeight - 150, 100);
                                                const targetY = Math.min(100 + (idx * 100), maxBoxY);

                                                if (lineEl) lineEl.style.display = 'none';
                                                if (anchorEl) anchorEl.style.display = 'none';
                                                if (htmlEl) {
                                                    htmlEl.style.left = `${targetX}px`;
                                                    htmlEl.style.top = `${targetY}px`;
                                                    htmlEl.style.display = 'block';
                                                    htmlEl.style.opacity = '0.5'; // Dimmed slightly to indicate missing tracking
                                                }
                                            }
                                        });
                                    } catch (err: any) {
                                        const debugEl = document.getElementById('debug-coords-hud');
                                        if (debugEl) debugEl.innerText = `SYS_ERR: ${err.message || err}`;
                                    } finally {
                                        coordPollLoopRef.current = setTimeout(pollCoords, 33);
                                    }
                                };
                                
                                coordPollLoopRef.current = setTimeout(pollCoords, 1500);

                            }, 1500);

                            // Listen to click for calibration hack
                            api.addEventListener('click', function(info: any) {
                                if (info.position3D && activeCalibRef.current) {
                                    const partId = activeCalibRef.current;
                                    setDynamicAnatomy(prev => ({
                                        ...prev,
                                        [partId]: info.position3D
                                    }));
                                    setCalibrationMode(null);
                                }
                            });
                        });
                    },
                    error: function onError(err: any) {
                        console.error('Sketchfab API error:', err);
                        setTimeout(() => setIsLoaded(true), 2000);
                    },
                    autostart: 1
                });
            }
        };

        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
            if (coordPollLoopRef.current) clearTimeout(coordPollLoopRef.current);
            skfbApiRef.current = null;
        };
    }, []);



    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 bg-black/95 backdrop-blur-xl">
            {/* Cyberpunk Container */}
            <div className="relative w-full h-full max-w-7xl max-h-[90vh] bg-[#050e0a] border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden font-sci-fi rounded-xl">
                
                {/* Embedded Sketchfab 3D Player */}
                <div className="absolute inset-0 z-0 flex items-center justify-center">
                    <iframe 
                        ref={iframeRef}
                        title="Aedes Aegypti" 
                        className="w-full h-full border-none outline-none opacity-90 mix-blend-screen"
                        allow="autoplay; fullscreen; xr-spatial-tracking"
                        {...{ "xr-spatial-tracking": "true" }}
                        {...{ "execution-while-out-of-viewport": "true" }}
                        {...{ "execution-while-not-rendered": "true" }}
                        {...{ "web-share": "true" }}
                        src="" // API will auto load it because we run client.init()
                    ></iframe>
                </div>

                {/* HUD Overlay */}
                <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-8">
                    {/* Top HUD */}
                    <div className="flex justify-between items-start">
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-emerald-950/60 border-l-4 border-emerald-500 p-3 sm:p-4 backdrop-blur-md"
                        >
                            <h2 className="text-emerald-400 text-lg sm:text-2xl tracking-[0.2em] animate-pulse">
                                SYSTEM.ANATOMY_TRACKER
                            </h2>
                            <p className="text-emerald-500/70 text-xs sm:text-sm font-mono tracking-widest mt-1">
                                SENSOR TARGET: AEDES AEGYPTI (3D)
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                                <span className="text-red-400 text-[10px] font-mono tracking-widest">LIVE GYROSCOPIC FEED</span>
                            </div>
                        </motion.div>

                        {/* Butang tutup */}
                        <button 
                            onClick={onClose}
                            className="pointer-events-auto bg-black/50 border border-red-500/50 text-red-500 hover:bg-red-900/50 hover:text-red-300 p-3 flex items-center justify-center transition-all duration-300 backdrop-blur-sm group rounded-md"
                        >
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 transform group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    {/* Target Reticle Tengah */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <motion.div 
                            initial={{ scale: 1.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="w-[70vw] h-[70vw] sm:w-[450px] sm:h-[450px] border border-emerald-500/20 rounded-full relative animate-[spin_40s_linear_infinite]"
                        >
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,1)]"></div>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,1)]"></div>
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,1)]"></div>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,1)]"></div>
                            <div className="absolute inset-8 border border-dashed border-emerald-500/30 rounded-full animate-[spin_20s_linear_reverse_infinite]"></div>
                        </motion.div>
                    </div>

                    {/* DEBUG PANEL */}
                    <div className="absolute top-24 left-4 z-[1000] bg-black/80 text-[8px] text-green-400 p-2 font-mono whitespace-pre-wrap pointer-events-none" id="debug-coords-hud">
                        SYS: BOOTING...
                    </div>

                    {/* Calibration UI */}
                    <div className="absolute bottom-4 left-4 z-50 pointer-events-auto">
                        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/50 backdrop-blur-md">
                            <h3 className="text-xs text-emerald-400 font-mono mb-2 tracking-widest border-b border-emerald-500/30 pb-1">HACK MODE: CALIBRATION</h3>
                            {calibrationMode && (
                                <div className="mb-2 p-2 bg-emerald-900/50 border border-emerald-500 rounded text-[10px] text-emerald-100 animate-pulse">
                                    Sila klik "{calibrationMode.toUpperCase()}" pada anatomi nyamuk 3D
                                </div>
                            )}
                            <div className="flex gap-2 flex-wrap max-w-[250px]">
                                {calibrationKeys.map(key => (
                                    <button 
                                        key={key}
                                        onClick={() => setCalibrationMode(key)}
                                        className={`px-3 py-1 text-[10px] sm:text-xs font-mono border rounded ${
                                            calibrationMode === key 
                                            ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                                            : (dynamicAnatomy[key] ? 'bg-emerald-900/40 border-emerald-500/40 text-emerald-300' : 'bg-slate-800 border-slate-600 text-slate-400')
                                        }`}
                                    >
                                        {dynamicAnatomy[key] ? '✓ ' : ''}{key.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Gyroscopic Callouts with SVG Lines */}
                    {isLoaded && (
                        <div className="absolute inset-0 pointer-events-none z-[100] overflow-hidden">
                            {/* SVG layer for drawing connecting lines */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                {CALLOUTS.map((callout) => (
                                    <g key={`group-${callout.id}`}>
                                        <path 
                                            id={`line-${callout.id}`}
                                            d=""
                                            fill="transparent" 
                                            stroke="red" 
                                            strokeWidth="3"
                                            strokeDasharray="0"
                                            style={{ display: 'none' }}
                                        />
                                    </g>
                                ))}
                            </svg>

                            {/* HTML Anchors (Numbers on the 3D model) */}
                            {CALLOUTS.map((callout, idx) => (
                                <div 
                                    key={`anchor-${callout.id}`}
                                    id={`anchor-${callout.id}`}
                                    className="absolute transform -translate-x-1/2 -translate-y-1/2 z-[101] flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-bold font-mono text-xs md:text-sm shadow-[0_0_10px_rgba(16,185,129,0.5)] cursor-pointer pointer-events-auto hover:bg-emerald-800 transition-colors"
                                    style={{ display: 'none' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Optional: trigger some interaction when clicked
                                    }}
                                >
                                    {idx + 1}
                                    <div className="absolute inset-0 rounded-full border border-emerald-400 animate-ping opacity-50"></div>
                                </div>
                            ))}

                            {/* HTML floating boxes */}
                            {CALLOUTS.map((callout, idx) => (
                                <div 
                                    key={callout.id}
                                    id={`html-${callout.id}`}
                                    className="absolute transition-all duration-75 ease-linear pointer-events-auto"
                                    style={{
                                        display: 'none',
                                        opacity: 0,
                                        transform: 'translateY(-50%)',
                                    }}
                                >
                                    <div className="border border-emerald-500/80 p-2 md:p-3 bg-black/80 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.3)] w-40 md:w-52 relative overflow-hidden group">
                                        {/* Tech corner accents */}
                                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-emerald-300"></div>
                                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-emerald-300"></div>
                                        
                                        <h4 className="flex items-center gap-2 text-emerald-300 font-bold tracking-widest text-[10px] md:text-sm mb-1 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)] leading-tight">
                                            <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-100">{idx + 1}</span>
                                            {callout.title}
                                        </h4>
                                        <p className="text-emerald-500/90 text-[8px] md:text-[10px] font-mono leading-tight">{callout.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!isLoaded && (
                         <div className="absolute inset-0 pointer-events-none flex items-center justify-center flex-col gap-4">
                              <span className="w-12 h-12 rounded-full border-t-2 border-r-2 border-emerald-500 animate-spin"></span>
                              <span className="text-emerald-500 font-mono text-sm tracking-widest animate-pulse">MEMULAKAN ENJIN 3D...</span>
                         </div>
                    )}

                    {/* Bottom HUD */}
                    <div className="flex justify-between items-end pb-2">
                        <div className="flex flex-col gap-1 w-32 md:w-48">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.random() * 50 + 50}%` }}
                                    transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity, repeatType: "reverse", repeatDelay: Math.random() * 2 }}
                                    className="h-[2px] bg-emerald-500/60"
                                />
                            ))}
                            <span className="text-[9px] text-emerald-600 font-mono mt-1">DATA STREAM WEBGL</span>
                        </div>
                        
                        <div className="text-right pointer-events-none">
                            <h3 className="text-emerald-400 font-mono text-[10px] md:text-xs tracking-widest bg-emerald-950/80 p-2 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                STATUS: TRACKING AKTIF
                            </h3>
                            <p className="text-emerald-500/60 text-[9px] md:text-[10px] font-mono mt-1 animate-pulse">
                                LERET UNTUK PUTAR / CUBIT UNTUK ZOOM
                            </p>
                        </div>
                    </div>
                </div>

                {/* Decorative Cyberpunk Corners */}
                <div className="absolute top-0 left-0 w-8 md:w-16 h-8 md:h-16 border-t-[3px] border-l-[3px] border-emerald-400 pointer-events-none opacity-80 shadow-[-5px_-5px_15px_rgba(16,185,129,0.3)]"></div>
                <div className="absolute top-0 right-0 w-8 md:w-16 h-8 md:h-16 border-t-[3px] border-r-[3px] border-emerald-400 pointer-events-none opacity-80 shadow-[5px_-5px_15px_rgba(16,185,129,0.3)]"></div>
                <div className="absolute bottom-0 left-0 w-8 md:w-16 h-8 md:h-16 border-b-[3px] border-l-[3px] border-emerald-400 pointer-events-none opacity-80 shadow-[-5px_5px_15px_rgba(16,185,129,0.3)]"></div>
                <div className="absolute bottom-0 right-0 w-8 md:w-16 h-8 md:h-16 border-b-[3px] border-r-[3px] border-emerald-400 pointer-events-none opacity-80 shadow-[5px_5px_15px_rgba(16,185,129,0.3)]"></div>

                <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAiLz4KPHBhdGggZD0iTTAgMEg0djFIMFpNMCAyaDR2MUgweiIgZmlsbD0icmdiYSgxNiwxODUsMTI5LDAuMDUpIi8+Cjwvc3ZnPg==')] opacity-40 mix-blend-screen"></div>

                <motion.div 
                    animate={{ top: ['-10%', '110%'] }}
                    transition={{ duration: 6, ease: "linear", repeat: Infinity }}
                    className="absolute left-0 right-0 h-2 bg-emerald-400/20 shadow-[0_0_30px_rgba(16,185,129,0.8)] pointer-events-none z-20"
                />
            </div>
        </div>
    );
};

export default Mosquito3DViewer;

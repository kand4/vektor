import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

interface Mosquito3DViewerProps {
    onClose: () => void;
}

const CALLOUTS = [
    {
        id: 'probosis',
        title: 'PROBOSIS',
        desc: 'Organ menusuk kulit & mengesan CO2. Saluran vektor aktif.',
    },
    {
        id: 'thorax',
        title: 'THORAX (TORAKS)',
        desc: 'Corak sisik putih kecapi (lyre). Pengecaman positif.',
    },
    {
        id: 'abdomen',
        title: 'ABDOMEN',
        desc: 'Kapasiti takungan darah. Struktur morfologi.',
    },
    {
        id: 'legs',
        title: 'KAKI / BELANG (AEDES)',
        desc: 'Sendi hitam-putih. Penanda diagnostik utama.',
    }
];

const wireMat = new THREE.MeshStandardMaterial({
    color: '#10b981',
    wireframe: true,
    emissive: '#059669',
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.8
});

const dangerMat = new THREE.MeshStandardMaterial({
    color: '#ef4444',
    emissive: '#dc2626',
    emissiveIntensity: 0.9,
    wireframe: true
});

const stripeWhiteMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#ffffff',
    emissiveIntensity: 0.8,
});

const stripeDarkMat = new THREE.MeshStandardMaterial({
    color: '#111111',
    emissive: '#000000',
    emissiveIntensity: 0,
});

const wingMat = new THREE.MeshStandardMaterial({
    color: '#67e8f9',
    emissive: '#0891b2',
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide
});

const MosquitoModel = ({ anchorsRef }: { anchorsRef: React.MutableRefObject<Record<string, THREE.Object3D | null>> }) => {
    const group = useRef<THREE.Group>(null);
    const wingsGroup = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (group.current) {
            group.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.3;
            group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
            group.current.rotation.x = Math.sin(state.clock.elapsedTime * 1) * 0.05;
        }
        if (wingsGroup.current) {
            const time = state.clock.elapsedTime;
            wingsGroup.current.children[0].rotation.z = Math.abs(Math.sin(time * 40)) * 0.6;
            wingsGroup.current.children[1].rotation.z = -Math.abs(Math.sin(time * 40)) * 0.6;
        }
    });

    return (
        <group ref={group} scale={1.2} position={[0, 0, 0]}>
            <pointLight position={[0, 0, 0]} color="#10b981" intensity={2} distance={10} />

            {/* Head */}
            <mesh position={[0, 0, 1.5]}>
                <sphereGeometry args={[0.3, 16, 16]} />
                <primitive object={wireMat} attach="material" />
            </mesh>

            {/* Eyes */}
            <mesh position={[0.2, 0.1, 1.6]}>
                <sphereGeometry args={[0.15, 8, 8]} />
                <primitive object={dangerMat} attach="material" />
            </mesh>
            <mesh position={[-0.2, 0.1, 1.6]}>
                <sphereGeometry args={[0.15, 8, 8]} />
                <primitive object={dangerMat} attach="material" />
            </mesh>

            {/* Proboscis */}
            <mesh position={[0, -0.2, 2.5]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.02, 0.04, 2, 8]} />
                <primitive object={dangerMat} attach="material" />
                <group ref={(el) => { if (el) anchorsRef.current['probosis'] = el; }} position={[0, -1, 0]} />
            </mesh>

            {/* Thorax */}
            <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 12, 0, 0]}>
                <capsuleGeometry args={[0.5, 1.0, 8, 16]} />
                <primitive object={wireMat} attach="material" />
                <group ref={(el) => { if (el) anchorsRef.current['thorax'] = el; }} position={[0, 0.5, 0]} />
            </mesh>

            {/* Abdomen */}
            <mesh position={[0, -0.2, -1.8]} rotation={[-Math.PI / 8, 0, 0]}>
                <capsuleGeometry args={[0.35, 2.5, 8, 16]} />
                <primitive object={wireMat} attach="material" />
                <group ref={(el) => { if (el) anchorsRef.current['abdomen'] = el; }} position={[0, 0, -1.2]} />
            </mesh>

            {/* Wings */}
            <group ref={wingsGroup} position={[0, 1.1, -0.2]}>
                <group position={[0.4, 0, 0]}>
                    <mesh position={[1.5, 0, -1]} rotation={[-Math.PI / 8, 0, 0]}>
                        <planeGeometry args={[1, 4]} />
                        <primitive object={wingMat} attach="material" />
                    </mesh>
                </group>
                <group position={[-0.4, 0, 0]}>
                    <mesh position={[-1.5, 0, -1]} rotation={[-Math.PI / 8, 0, 0]}>
                        <planeGeometry args={[1, 4]} />
                        <primitive object={wingMat} attach="material" />
                    </mesh>
                </group>
            </group>

            {/* Legs */}
            <group position={[0, 0, 0]}>
                {[0, 1, 2].map((i) => {
                    const zOffset = 0.5 - i * 1.0;
                    const rotationY = Math.PI / 6 + i * 0.2;
                    return (
                        <group key={`legs-${i}`}>
                            <group position={[0.4, 0.2, zOffset]} rotation={[0, rotationY, -Math.PI / 4]}>
                                <mesh position={[1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                                    <cylinderGeometry args={[0.04, 0.03, 2, 8]} />
                                    <primitive object={stripeDarkMat} attach="material" />
                                </mesh>
                                <group position={[2, 0, 0]} rotation={[0, 0, -Math.PI / 2.5]}>
                                    {[0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8].map((offset, j) => (
                                        <mesh key={`tibia-r-${i}-${j}`} position={[offset + 0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                                            <cylinderGeometry args={[0.025, 0.02, 0.4, 8]} />
                                            <primitive object={j % 2 === 0 ? stripeWhiteMat : stripeDarkMat} attach="material" />
                                        </mesh>
                                    ))}
                                    {i === 1 && <group ref={(el) => { if (el) anchorsRef.current['legs'] = el; }} position={[1.4, 0, 0]} />}
                                </group>
                            </group>

                            <group position={[-0.4, 0.2, zOffset]} rotation={[0, -rotationY, Math.PI / 4]}>
                                <mesh position={[-1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                                    <cylinderGeometry args={[0.04, 0.03, 2, 8]} />
                                    <primitive object={stripeDarkMat} attach="material" />
                                </mesh>
                                <group position={[-2, 0, 0]} rotation={[0, 0, Math.PI / 2.5]}>
                                    {[0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8].map((offset, j) => (
                                        <mesh key={`tibia-l-${i}-${j}`} position={[-offset - 0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                                            <cylinderGeometry args={[0.025, 0.02, 0.4, 8]} />
                                            <primitive object={j % 2 === 0 ? stripeWhiteMat : stripeDarkMat} attach="material" />
                                        </mesh>
                                    ))}
                                </group>
                            </group>
                        </group>
                    );
                })}
            </group>
        </group>
    );
};

const OverlayTracker = ({ anchorsRef, containerRef }: { anchorsRef: React.MutableRefObject<Record<string, THREE.Object3D | null>>, containerRef: React.RefObject<HTMLDivElement> }) => {
    const { camera, size } = useThree();

    useFrame(() => {
        if (!containerRef.current) return;

        CALLOUTS.forEach((c, idx) => {
            const anchorObj = anchorsRef.current[c.id];
            if (!anchorObj) return;

            const vec = new THREE.Vector3();
            anchorObj.getWorldPosition(vec);
            vec.project(camera);

            const isBehindCamera = vec.z > 1.0;

            const x = (vec.x * 0.5 + 0.5) * size.width;
            const y = (vec.y * -0.5 + 0.5) * size.height;

            const htmlEl = document.getElementById(`html-${c.id}`);
            const lineEl = document.getElementById(`line-${c.id}`);
            const dotEl = document.getElementById(`anchor-${c.id}`);

            if (htmlEl && lineEl && dotEl) {
                if (isBehindCamera) {
                    htmlEl.style.opacity = '0';
                    lineEl.style.opacity = '0';
                    dotEl.style.opacity = '0';
                } else {
                    const isLeft = idx % 2 === 0;
                    
                    const boxWidth = htmlEl.offsetWidth || 220; 
                    const marginSides = size.width < 600 ? 10 : 40; 
                    
                    const topPadding = 120;
                    const verticalSpacing = (size.height - 200) / Math.max(1, Math.ceil(CALLOUTS.length / 2));
                    const orderInSide = Math.floor(idx / 2);
                    
                    const idealY = topPadding + (orderInSide * verticalSpacing);
                    const targetY = Math.min(idealY, size.height - 100);
                    let targetX = isLeft ? marginSides : size.width - marginSides - boxWidth;
                    
                    const boxAttachX = targetX + (isLeft ? boxWidth : 0);
                    const boxAttachY = targetY;
                    
                    const cx1 = x + (isLeft ? -70 : 70);
                    const cy1 = y;
                    const cx2 = boxAttachX + (isLeft ? 50 : -50);
                    const cy2 = boxAttachY;
                    
                    lineEl.setAttribute('d', `M ${x} ${y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${boxAttachX} ${boxAttachY}`);
                    lineEl.style.opacity = '1';
                    
                    dotEl.style.left = `${x}px`;
                    dotEl.style.top = `${y}px`;
                    dotEl.style.opacity = '1';
                    
                    htmlEl.style.left = `${targetX}px`;
                    htmlEl.style.top = `${targetY}px`;
                    htmlEl.style.opacity = '1';
                    htmlEl.style.transform = `translateY(-50%) perspective(1000px) rotateY(${isLeft ? '10deg' : '-10deg'}) rotateX(0deg)`;
                }
            }
        });
    });

    return null;
}

const Mosquito3DViewer: React.FC<Mosquito3DViewerProps> = ({ onClose }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const anchorsRef = useRef<Record<string, THREE.Object3D | null>>({});

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6 bg-black/95 backdrop-blur-3xl">
            {/* Cyberpunk Container */}
            <div 
                ref={containerRef}
                className="relative w-full h-full sm:max-w-7xl sm:max-h-[90vh] bg-[#020604] sm:border border-emerald-500/30 sm:shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden font-sci-fi sm:rounded-2xl"
            >
                
                {/* 3D Canvas Native Rendering Engine */}
                <div className="absolute inset-0 z-0">
                    <Canvas camera={{ position: [6, 4, 10], fov: 45 }}>
                        <color attach="background" args={['#020604']} />
                        <ambientLight intensity={0.5} />
                        <directionalLight position={[10, 10, 5]} intensity={1} color="#34d399" />
                        <directionalLight position={[-10, 5, -5]} intensity={0.5} color="#0284c7" />
                        
                        <Stars radius={50} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
                        
                        <MosquitoModel anchorsRef={anchorsRef} />
                        <OverlayTracker anchorsRef={anchorsRef} containerRef={containerRef} />

                        <OrbitControls 
                            enablePan={false}
                            minDistance={4}
                            maxDistance={25}
                            autoRotate
                            autoRotateSpeed={0.5}
                            maxPolarAngle={Math.PI / 1.5}
                        />
                    </Canvas>
                </div>

                {/* Tracking SVG Layer */}
                <div className="absolute inset-0 pointer-events-none z-10">
                    <svg className="absolute inset-0 w-full h-full overflow-visible">
                        {CALLOUTS.map((callout) => (
                            <path 
                                key={`path-${callout.id}`}
                                id={`line-${callout.id}`}
                                d="M 0 0"
                                fill="transparent" 
                                stroke="#10b981" 
                                strokeWidth="1.5"
                                strokeDasharray="4 4"
                                className="transition-opacity duration-75 opacity-0"
                                style={{ filter: 'drop-shadow(0 0 5px rgba(16,185,129,0.8))' }}
                            />
                        ))}
                    </svg>

                    {/* Tracking Anchors on Body */}
                    {CALLOUTS.map((callout) => (
                        <div 
                            key={`anchor-${callout.id}`}
                            id={`anchor-${callout.id}`}
                            className="absolute w-3 h-3 bg-emerald-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-[0_0_15px_rgba(16,185,129,1)] opacity-0 transition-opacity duration-75"
                        >
                            <div className="absolute inset-0 rounded-full border border-emerald-200 animate-ping opacity-70"></div>
                        </div>
                    ))}

                    {/* HTML 3D Floating Labels */}
                    {CALLOUTS.map((callout, idx) => (
                        <div 
                            key={`html-${callout.id}`}
                            id={`html-${callout.id}`}
                            className="absolute z-30 transition-all duration-75 pointer-events-auto opacity-0 w-44 sm:w-56"
                            style={{ transformOrigin: idx % 2 === 0 ? 'left center' : 'right center' }}
                        >
                            <div className="border border-emerald-500/80 p-3 sm:p-4 bg-black/85 backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.4)] relative group hover:bg-emerald-950/80 transition-colors">
                                {/* Tech corner accents */}
                                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-emerald-300"></div>
                                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-emerald-300"></div>
                                
                                <h4 className="flex items-center gap-2 text-emerald-300 font-bold tracking-widest text-[10px] sm:text-xs mb-1.5 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)] leading-tight uppercase">
                                    <span className="bg-emerald-500/20 border border-emerald-500/50 px-1.5 py-0.5 rounded text-emerald-100">{idx + 1}</span>
                                    {callout.title}
                                </h4>
                                <p className="text-emerald-500/80 text-[10px] sm:text-xs font-mono leading-tight">{callout.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Header & Controls Overlay */}
                <div className="absolute inset-0 z-40 pointer-events-none flex flex-col justify-between p-4 sm:p-8">
                    {/* Top HUD */}
                    <div className="flex justify-between items-start">
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-emerald-950/80 border-l-4 border-emerald-500 p-3 sm:p-4 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.2)] pointer-events-auto"
                        >
                            <h2 className="text-emerald-400 text-sm sm:text-lg tracking-[0.2em] font-bold">
                                HOLOGRAPHIC <span className="text-white">BIO-SCAN</span>
                            </h2>
                            <p className="text-emerald-500/70 text-[9px] sm:text-[10px] font-mono tracking-widest mt-1 uppercase">
                                Enjin Rentetan 3D Native Aktif
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                                <span className="text-red-400 text-[9px] font-mono tracking-widest uppercase">Live Tracking System</span>
                            </div>
                        </motion.div>

                        {/* Close Button */}
                        <button 
                            onClick={onClose}
                            className="pointer-events-auto bg-black/50 border border-red-500/50 text-red-500 hover:bg-red-900/50 hover:text-red-300 p-3 flex items-center justify-center transition-all duration-300 backdrop-blur-sm group rounded-md"
                        >
                            <svg className="w-5 h-5 transform group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    {/* Bottom HUD */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-2">
                        <div className="flex flex-col gap-1 w-32 sm:w-48 bg-emerald-950/60 p-2 border border-emerald-500/30 rounded backdrop-blur-sm shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.random() * 50 + 50}%` }}
                                    transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity, repeatType: "reverse", repeatDelay: Math.random() * 2 }}
                                    className="h-[2px] bg-emerald-500/60"
                                />
                            ))}
                            <span className="text-[8px] sm:text-[9px] text-emerald-400 font-mono mt-1">WEBGL PROCEDURAL GEN</span>
                        </div>
                        
                        <div className="text-right mt-auto self-end pointer-events-auto">
                            <h3 className="text-emerald-400 font-mono text-[9px] md:text-xs tracking-widest bg-emerald-950/80 p-2 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                STATUS: 3D RENDER AKTIF
                            </h3>
                            <p className="text-emerald-500/60 text-[8px] md:text-[9px] font-mono mt-1 animate-pulse">
                                MOUSE KLIK: PUTAR | SCROLL: ZOOM
                            </p>
                        </div>
                    </div>
                </div>

                {/* Decorative Tech Corners */}
                <div className="hidden sm:block absolute top-0 left-0 w-16 h-16 border-t-[3px] border-l-[3px] border-emerald-400 pointer-events-none opacity-80 shadow-[-5px_-5px_15px_rgba(16,185,129,0.3)]"></div>
                <div className="hidden sm:block absolute top-0 right-0 w-16 h-16 border-t-[3px] border-r-[3px] border-emerald-400 pointer-events-none opacity-80 shadow-[5px_-5px_15px_rgba(16,185,129,0.3)]"></div>
                <div className="hidden sm:block absolute bottom-0 left-0 w-16 h-16 border-b-[3px] border-l-[3px] border-emerald-400 pointer-events-none opacity-80 shadow-[-5px_5px_15px_rgba(16,185,129,0.3)]"></div>
                <div className="hidden sm:block absolute bottom-0 right-0 w-16 h-16 border-b-[3px] border-r-[3px] border-emerald-400 pointer-events-none opacity-80 shadow-[5px_5px_15px_rgba(16,185,129,0.3)]"></div>

                <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAiLz4KPHBhdGggZD0iTTAgMEg0djFIMFpNMCAyaDR2MUgweiIgZmlsbD0icmdiYSgxNiwxODUsMTI5LDAuMDQpIi8+Cjwvc3ZnPg==')] opacity-40 mix-blend-screen mix-blend-overlay"></div>
                
            </div>
        </div>
    );
};

export default Mosquito3DViewer;

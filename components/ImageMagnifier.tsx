import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ImageMagnifierProps {
    src: string;
    alt: string;
    width?: string;
    height?: string;
    magnifierHeight?: number;
    magnifierWidth?: number;
    zoomLevel?: number;
    className?: string;
    imageClassName?: string;
}

const ImageMagnifier: React.FC<ImageMagnifierProps> = ({
    src,
    alt,
    width = '100%',
    height = '100%',
    magnifierHeight = 250,
    magnifierWidth = 250,
    zoomLevel = 2.5,
    className = '',
    imageClassName = ''
}) => {
    const [[x, y], setXY] = useState([0, 0]);
    const [[clientX, clientY], setClientPos] = useState([0, 0]);
    const [[imgWidth, imgHeight], setSize] = useState([0, 0]);
    const [showMagnifier, setShowMagnifier] = useState(false);
    const [isTouch, setIsTouch] = useState(false);

    const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
        setIsTouch(false);
        const elem = e.currentTarget;
        const { width, height, left, top } = elem.getBoundingClientRect();
        setSize([width, height]);
        setXY([e.clientX - left, e.clientY - top]);
        setClientPos([e.clientX, e.clientY]);
        setShowMagnifier(true);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
        const elem = e.currentTarget;
        const { top, left } = elem.getBoundingClientRect();
        
        // Calculate cursor position on the image
        setXY([e.clientX - left, e.clientY - top]);
        setClientPos([e.clientX, e.clientY]);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setShowMagnifier(false);
    }, []);

    // Touch events for mobile
    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLImageElement>) => {
        setIsTouch(true);
        const elem = e.currentTarget;
        const { width, height, left, top } = elem.getBoundingClientRect();
        setSize([width, height]);
        
        const touch = e.touches[0];
        setXY([touch.clientX - left, touch.clientY - top]);
        setClientPos([touch.clientX, touch.clientY]);
        setShowMagnifier(true);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLImageElement>) => {
        const elem = e.currentTarget;
        const { left, top } = elem.getBoundingClientRect();
        
        const touch = e.touches[0];
        setXY([touch.clientX - left, touch.clientY - top]);
        setClientPos([touch.clientX, touch.clientY]);
    }, []);

    const handleTouchEnd = useCallback(() => {
        setShowMagnifier(false);
    }, []);

    // Constrain magnifier within the image boundaries (optional, but good for UX)
    const active = showMagnifier && x >= 0 && x <= imgWidth && y >= 0 && y <= imgHeight;

    // Calculate smart offset for touch to prevent finger from blocking the lens
    let offsetY = isTouch ? 130 : 0;
    // If placing it above the finger would clip it at the top of viewport, place it below the finger instead
    if (isTouch && clientY - magnifierHeight / 2 - offsetY < 0) {
        offsetY = -130;
    }

    const magnifierLens = active && typeof document !== 'undefined' ? createPortal(
        <div
            style={{
                position: "fixed",
                pointerEvents: "none",
                height: `${magnifierHeight}px`,
                width: `${magnifierWidth}px`,
                top: `${clientY - magnifierHeight / 2 - offsetY}px`,
                left: `${clientX - magnifierWidth / 2}px`,
                opacity: "1",
                border: "3px solid rgba(34, 211, 238, 0.9)", // text-cyan-400
                borderRadius: "50%",
                backgroundColor: "white",
                backgroundImage: `url('${src}')`,
                backgroundRepeat: "no-repeat",
                // Calculate zoomed image size based on original image size and zoom level
                backgroundSize: `${imgWidth * zoomLevel}px ${imgHeight * zoomLevel}px`,
                // Center the zoomed position
                backgroundPositionX: `${-x * zoomLevel + magnifierWidth / 2}px`,
                backgroundPositionY: `${-y * zoomLevel + magnifierHeight / 2}px`,
                boxShadow: "0 0 0 4px rgba(0,0,0,0.5), 0 10px 25px -5px rgba(34, 211, 238, 0.3)",
                zIndex: 99999,
            }}
        >
            {/* Crosshair indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-400/50">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 pointer-events-none">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
            </div>
            
            {/* Zoom indicator label */}
            <div className="absolute bottom-2 right-4 text-[#00E5FF] bg-black/60 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm">
                {zoomLevel}x
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <div
            className={`relative inline-block cursor-crosshair ${className}`}
            style={{ width, height }}
        >
            <img
                src={src}
                alt={alt}
                draggable={false}
                style={{ WebkitTouchCallout: 'none' }}
                className={`${imageClassName} touch-none select-none`}
                onContextMenu={(e) => { e.preventDefault(); return false; }}
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                referrerPolicy="no-referrer"
            />

            {/* Magnifier Lens via Portal */}
            {magnifierLens}
            
            {/* Hover hint if not hovering */}
            {!active && (
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur border border-slate-700 text-slate-300 px-3 py-1.5 rounded-md text-xs font-mono pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-cyan-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <span>Hover untuk Zoom</span>
                </div>
            )}
        </div>
    );
};

export default ImageMagnifier;

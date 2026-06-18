import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls } from 'motion/react';
import { RiskDetection, BoundingBox } from '../types';

interface ImageAnnotatorProps {
  imageSrc: string;
  risks: RiskDetection[];
  onRiskSelect: (risk: RiskDetection) => void;
  selectedId?: string | null;
  isEditing?: boolean;
  onRegionDrawn?: (box: BoundingBox) => void;
  fullWidthMode?: boolean;
}

const ImageAnnotator: React.FC<ImageAnnotatorProps> = ({ 
  imageSrc, 
  risks, 
  onRiskSelect, 
  selectedId: propSelectedId,
  isEditing = false,
  onRegionDrawn,
  fullWidthMode = false
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [dragPositions, setDragPositions] = useState<{[key: string]: {x: number, y: number}}>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setDragPositions({});
  }, [imageSrc]);
  
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  const [currentBox, setCurrentBox] = useState<BoundingBox | null>(null);

  const updateDimensions = () => {
    if (containerRef.current) {
      setDimensions({ 
        width: containerRef.current.clientWidth, 
        height: containerRef.current.clientHeight 
      });
    }
  };

  useEffect(() => {
    if (propSelectedId !== undefined) {
      setInternalSelectedId(propSelectedId);
    }
  }, [propSelectedId]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
       updateDimensions();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
      updateDimensions();
    }
    
    // Check periodically for the first few seconds if fonts/images shift layout
    const interval = setInterval(updateDimensions, 500);
    setTimeout(() => clearInterval(interval), 3000);

    return () => {
        observer.disconnect();
        clearInterval(interval);
    };
  }, [isFullscreen, imageSrc]); // Re-observe upon toggle or image change


  // CSS Converter: 0-1000 Scale -> Percentages
  // Math.min/max logic ensures box stays within image bounds visually
  const getStyle = (box: BoundingBox) => ({
    top: `${Math.max(0, Math.min(100, box.ymin / 10))}%`,
    left: `${Math.max(0, Math.min(100, box.xmin / 10))}%`,
    width: `${Math.max(2, Math.min(100, (box.xmax - box.xmin) / 10))}%`,
    height: `${Math.max(2, Math.min(100, (box.ymax - box.ymin) / 10))}%`,
  });

  const handleBoxClick = (e: React.MouseEvent, risk: RiskDetection) => {
    if (isEditing) return; 
    e.preventDefault();
    e.stopPropagation();
    setInternalSelectedId(risk.id);
    onRiskSelect(risk);
  };

  const handleImageClick = () => {
    if (isEditing) return;
    setIsFullscreen(!isFullscreen);
  };

  const activeId = propSelectedId !== undefined ? propSelectedId : internalSelectedId;

  // Manual Drawing Logic
  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    // Normalize to 0-1000 scale
    const x = Math.max(0, Math.min(1000, ((clientX - rect.left) / rect.width) * 1000));
    const y = Math.max(0, Math.min(1000, ((clientY - rect.top) / rect.height) * 1000));
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isEditing) return;
    setIsDrawing(true);
    const coords = getCoords(e);
    setStartPos(coords);
    setCurrentBox({ ymin: coords.y, xmin: coords.x, ymax: coords.y, xmax: coords.x });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !startPos || !isEditing) return;
    const current = getCoords(e);
    
    const ymin = Math.min(startPos.y, current.y);
    const xmin = Math.min(startPos.x, current.x);
    const ymax = Math.max(startPos.y, current.y);
    const xmax = Math.max(startPos.x, current.x);

    setCurrentBox({ ymin, xmin, ymax, xmax });
  };

  const justDrew = useRef(false);

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox || !isEditing) return;
    setIsDrawing(false);
    // Minimum size check (20 units = 2% of screen)
    if ((currentBox.xmax - currentBox.xmin) > 20 && (currentBox.ymax - currentBox.ymin) > 20) {
        onRegionDrawn?.(currentBox);
        justDrew.current = true;
        setTimeout(() => justDrew.current = false, 200);
    }
    setStartPos(null);
    setCurrentBox(null);
  };

  const wrapperClasses = isFullscreen 
    ? "fixed inset-0 z-[9999] bg-black/95 flex justify-center items-center overflow-auto cursor-zoom-out p-4 md:p-10"
    : `w-full flex justify-center items-center relative group ${fullWidthMode ? 'xl:w-full' : ''}`;

  const containerClasses = isFullscreen
    ? "relative bg-black shadow-[0_0_50px_rgba(34,211,238,0.2)] border border-slate-700 cursor-auto mx-auto inline-block rounded-xl overflow-hidden"
    : `relative inline-block rounded bg-black overflow-hidden group shadow-2xl border border-slate-800 ${isEditing ? 'cursor-crosshair touch-none' : 'cursor-zoom-in touch-pan-y'}`;

  const imgClasses = isFullscreen 
    ? "h-auto max-w-[95vw] max-h-[85vh] block select-none"
    : "max-w-full h-auto max-h-[70vh] block select-none opacity-90 relative z-10 transition-opacity duration-300 group-hover:opacity-100";

  const content = (
    <div className={wrapperClasses} onClick={isFullscreen ? () => setIsFullscreen(false) : undefined}>
      {isFullscreen && (
          <button onClick={() => setIsFullscreen(false)} className="fixed top-4 right-4 md:top-6 md:right-6 bg-slate-800 hover:bg-slate-700 text-white w-10 h-10 md:w-12 md:h-12 rounded-full border border-slate-600 font-bold z-50 flex items-center justify-center shadow-lg transition-transform hover:scale-110">✕</button>
      )}
      <div 
        className={containerClasses} 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        onClick={(e) => { 
            if (isFullscreen) { e.stopPropagation(); }
            else if (!isEditing && !justDrew.current) { handleImageClick(); }
        }}
      >
        <div className="relative rounded">
            <img 
              ref={imageRef}
              src={imageSrc} 
              alt="Analyzed" 
              className={imgClasses} 
            />
            
            <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.1)_1px,transparent_1px)] bg-[size:40px_40px] opacity-0 group-hover:opacity-20 pointer-events-none z-10 transition-opacity duration-500"></div>
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-20"></div>
        </div>

        {isEditing && !isFullscreen && (
           <div className="absolute top-2 left-2 z-50 bg-red-600/90 text-white text-xs font-mono-sci px-2 py-1 rounded animate-pulse pointer-events-none border border-red-400 shadow-[0_0_10px_red]">
              TARGETING MODE // DRAG TO SELECT
           </div>
        )}

        {currentBox && isEditing && !isFullscreen && (
          <div style={getStyle(currentBox)} className="absolute z-50 border-2 border-dashed border-emerald-400 bg-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.5)] pointer-events-none">
             <div className="absolute top-0 right-0 -mt-5 text-[10px] text-emerald-400 font-mono-sci">ACQUIRING...</div>
          </div>
        )}

        {/* Existing Risks */}
        <div className="absolute inset-0 z-40 pointer-events-none">
          {/* SVG Lines Overlay */}
          {!isEditing && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible">
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              {risks.map((risk) => {
                if (!risk.box_2d || typeof risk.box_2d.xmin !== 'number') return null;
                
                const isSelected = activeId === risk.id;
                
                const boxXmin = risk.box_2d.xmin;
                const boxXmax = risk.box_2d.xmax;
                const boxYmin = risk.box_2d.ymin;
                const boxYmax = risk.box_2d.ymax;

                const { width: containerWidth, height: containerHeight } = dimensions;

                const isTooHigh = boxYmin < 160;
                
                // Anchor point is precise center of the bounding box
                const anchorX = ((boxXmin + boxXmax) / 2000) * containerWidth; 
                const anchorY = ((boxYmin + boxYmax) / 2000) * containerHeight; 
                
                let leftPercent = (boxXmin + boxXmax) / 20;
                let offsetX = -60; // Shrunk width calls for smaller offset
                if (leftPercent < 15) offsetX = 0;
                else if (leftPercent > 85) offsetX = -120;
                
                const baseTopPercent = isTooHigh ? (boxYmax / 10) : (boxYmin / 10);
                const offsetY = isTooHigh ? 10 : -50;
                
                const dragPos = dragPositions[risk.id] || { x: 0, y: 0 };
                
                // Target X and Y mathematically to the center of the Callout layout
                const targetX = (leftPercent / 100) * containerWidth + offsetX + 60 + dragPos.x;
                const targetY = (baseTopPercent / 100) * containerHeight + offsetY + 25 + dragPos.y;

                // Fluid Bezier curve connection
                const controlY1 = anchorY + (targetY - anchorY) * 0.2;
                const controlY2 = targetY - (targetY - anchorY) * 0.2;
                const pathD = `M ${anchorX} ${anchorY} C ${anchorX} ${controlY1}, ${targetX} ${controlY2}, ${targetX} ${targetY}`;

                let strokeColor = (risk.category === 'HYGIENE') ? "#f59e0b" : (risk.category === 'SAFETY' ? "#facc15" : "#ef4444");
                if (isSelected) strokeColor = "#22d3ee"; 

                return (
                  <g key={`line-group-${risk.id}`}>
                    <motion.path
                      d={pathD}
                      animate={{
                        d: pathD,
                        stroke: strokeColor,
                        strokeWidth: isSelected ? (isFullscreen ? 3 : 4) : 2,
                        opacity: isSelected ? 0.3 : 0.1
                      }}
                      filter="url(#glow)"
                      fill="none"
                      initial={false}
                    />
                    <motion.path
                      d={pathD}
                      animate={{
                        d: pathD,
                        stroke: strokeColor,
                        strokeWidth: isSelected ? 1.5 : 1,
                        opacity: isSelected ? 0.9 : 0.5
                      }}
                      strokeDasharray={isSelected ? "none" : "4,4"}
                      fill="none"
                      strokeLinecap="round"
                      initial={false}
                    />
                    {/* Dots are hidden per user request to make it elegantly connect */}
                  </g>
                );
              })}
            </svg>
          )}

          {risks.map((risk, index) => {
            if (!risk.box_2d || typeof risk.box_2d.xmin !== 'number') return null;

            const isSelected = activeId === risk.id;
            
            let borderColor = 'border-red-500';
            let bgColor = 'bg-red-500';
            let textColor = 'text-red-500';
            let pulseColor = 'shadow-[0_0_10px_rgba(239,68,68,0.5)]';

            if (risk.category === 'HYGIENE') {
                borderColor = 'border-amber-500';
                bgColor = 'bg-amber-500';
                textColor = 'text-amber-500';
                pulseColor = 'shadow-[0_0_10px_rgba(245,158,11,0.5)]';
            } 
            else if (risk.category === 'SAFETY') {
                borderColor = 'border-yellow-400';
                bgColor = 'bg-yellow-400';
                textColor = 'text-yellow-400';
                pulseColor = 'shadow-[0_0_10px_rgba(250,204,21,0.6)]';
            }

            if (isSelected) {
                borderColor = 'border-cyan-400';
                bgColor = 'bg-cyan-400';
                textColor = 'text-cyan-400';
                pulseColor = 'shadow-[0_0_20px_rgba(34,211,238,0.8)]';
            }

            return (
              <React.Fragment key={risk.id}>
                <div 
                  className={`absolute pointer-events-auto transition-all duration-300 group/box
                    ${isEditing && !isFullscreen ? 'opacity-30 pointer-events-none' : 'opacity-90 hover:opacity-100 cursor-pointer'} 
                  `}
                  style={{
                    ...getStyle(risk.box_2d),
                    zIndex: isSelected ? 90 : 40
                  }}
                  onClick={(e) => handleBoxClick(e, risk)} 
                >
                    {/* Crosshair Reticles for Tech Look */}
                    <div className={`absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 ${borderColor}`}></div>
                    <div className={`absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 ${borderColor}`}></div>
                    <div className={`absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 ${borderColor}`}></div>
                    <div className={`absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 ${borderColor}`}></div>

                    {/* Main Box */}
                    <div className={`
                        absolute inset-0 border-2 ${borderColor} transition-all duration-300
                        opacity-100 bg-white/10 ${pulseColor}
                    `}></div>

                    {/* Center Point */}
                    <div className={`absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full opacity-50 ${isSelected ? 'block' : 'hidden'}`}></div>

                    {/* Index Indicator on Box */}
                    <div className={`
                        absolute -top-3 -left-3 w-5 h-5 flex items-center justify-center 
                        text-[10px] font-bold font-mono-sci shadow-lg z-50
                        ${bgColor} text-black rounded-sm border border-black/20
                    `}>
                        {index + 1}
                    </div>
                </div>

                {/* Draggable HUD Callout */}
                {(!isEditing || isFullscreen) && (
                  <HUDCallout 
                    risk={risk} 
                    isSelected={isSelected} 
                    index={index}
                    borderColor={borderColor}
                    textColor={textColor}
                    containerRef={containerRef}
                    onSelect={() => {
                      setInternalSelectedId(risk.id);
                      onRiskSelect(risk);
                    }}
                    onDragUpdate={(delta) => {
                      setDragPositions(prev => ({
                        ...prev,
                        [risk.id]: {
                          x: (prev[risk.id]?.x || 0) + delta.x,
                          y: (prev[risk.id]?.y || 0) + delta.y
                        }
                      }));
                    }}
                    isFullscreen={isFullscreen}
                    dragPos={dragPositions[risk.id] || { x: 0, y: 0 }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return createPortal(content, document.body);
  }

  return content;
};

// --- HUD CALLOUT COMPONENT WITH STABLE DRAG HANDLE ---
interface HUDCalloutProps {
  risk: RiskDetection;
  isSelected: boolean;
  index: number;
  borderColor: string;
  textColor: string;
  containerRef: React.RefObject<HTMLDivElement>;
  onSelect: () => void;
  onDragUpdate: (delta: { x: number, y: number }) => void;
  isFullscreen: boolean;
  dragPos: { x: number, y: number };
}

const HUDCallout: React.FC<HUDCalloutProps> = ({ risk, isSelected, index, borderColor, textColor, containerRef, onSelect, onDragUpdate, isFullscreen, dragPos }) => {
  const isTooHigh = (risk.box_2d?.ymin || 0) < 160; 
  
  let leftPercent = ((risk.box_2d?.xmin || 0) + (risk.box_2d?.xmax || 0)) / 20;
  
  let offsetX = -60;
  if (leftPercent < 15) offsetX = 0;
  else if (leftPercent > 85) offsetX = -120;

  const offsetY = isTooHigh ? 10 : -40;

  // Track dragging state using local React refs to avoid lag
  const isDraggingRef = useRef(false);
  const lastPointerPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onSelect();
    
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    lastPointerPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation();
    
    const deltaX = e.clientX - lastPointerPos.current.x;
    const deltaY = e.clientY - lastPointerPos.current.y;
    
    if (deltaX !== 0 || deltaY !== 0) {
      onDragUpdate({ x: deltaX, y: deltaY });
      lastPointerPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      e.stopPropagation();
      e.currentTarget.releasePointerCapture(e.pointerId);
      isDraggingRef.current = false;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="absolute pointer-events-auto cursor-grab active:cursor-grabbing select-none"
      style={{
        left: `calc(${leftPercent}% + ${offsetX}px)`,
        top: isTooHigh ? `calc(${(risk.box_2d?.ymax || 0) / 10}% + ${offsetY}px)` : `calc(${(risk.box_2d?.ymin || 0) / 10}% + ${offsetY}px)`,
        touchAction: "none",
        zIndex: isSelected ? 300 : 100,
        x: dragPos.x,
        y: dragPos.y,
      }}
    >
        <div
          className={`
            relative bg-slate-900/90 backdrop-blur-md border rounded-md p-1.5 shadow-2xl
            w-[120px] md:w-[140px] border-l-4
            ${isSelected ? 'scale-110 shadow-cyan-500/20 ring-1 ring-cyan-500/50' : 'scale-100'} 
            transition-all duration-300 ${borderColor}
            group/callout
          `}
        >
          {/* DRAG HANDLE INDICATOR */}
          <div className="absolute -top-1.5 -right-1.5 bg-slate-800 border border-slate-700 rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover/callout:opacity-100 transition-opacity z-[110]">
              <span className="text-[7px] text-white font-bold">✥</span>
          </div>

          <div className="flex items-center justify-between gap-1 mb-1 border-b border-slate-800 pb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`flex-shrink-0 flex items-center justify-center w-3 h-3 text-[8px] font-bold rounded-sm ${isSelected ? 'bg-cyan-400 text-black' : 'bg-slate-700 text-white'}`}>
                {index + 1}
              </span>
              <span className={`text-[7px] font-bold uppercase tracking-wider leading-tight ${textColor} truncate`}>
                 {risk.label}
              </span>
            </div>
          </div>
          
          <div className="text-[7px] text-slate-400 leading-tight line-clamp-2 italic font-mono-sci mb-0.5">
             {risk.agent || risk.description.split('.')[0]}
          </div>

          {isSelected && (
            <div className="flex items-center gap-1 mt-0.5 text-[6px] text-cyan-400 font-bold uppercase animate-pulse">
               <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
               DATA_LINK_ENGAGED
            </div>
          )}
        </div>
    </motion.div>
  );
};

export default ImageAnnotator;
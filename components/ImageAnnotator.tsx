import React, { useState, useRef, useEffect } from 'react';
import { motion, useDragControls } from 'motion/react';
import { RiskDetection, BoundingBox } from '../types';

interface ImageAnnotatorProps {
  imageSrc: string;
  risks: RiskDetection[];
  onRiskSelect: (risk: RiskDetection) => void;
  selectedId?: string | null;
  isEditing?: boolean;
  onRegionDrawn?: (box: BoundingBox) => void;
}

const ImageAnnotator: React.FC<ImageAnnotatorProps> = ({ 
  imageSrc, 
  risks, 
  onRiskSelect, 
  selectedId: propSelectedId,
  isEditing = false,
  onRegionDrawn
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [dragPositions, setDragPositions] = useState<{[key: string]: {x: number, y: number}}>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  const [currentBox, setCurrentBox] = useState<BoundingBox | null>(null);

  useEffect(() => {
    if (propSelectedId !== undefined) {
      setInternalSelectedId(propSelectedId);
    }
  }, [propSelectedId]);

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

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox || !isEditing) return;
    setIsDrawing(false);
    // Minimum size check (20 units = 2% of screen)
    if ((currentBox.xmax - currentBox.xmin) > 20 && (currentBox.ymax - currentBox.ymin) > 20) {
        onRegionDrawn?.(currentBox);
    }
    setStartPos(null);
    setCurrentBox(null);
  };

  return (
    <div className="w-full relative group">
      <div 
        className={`relative w-full rounded bg-black group shadow-2xl border border-slate-800 ${isEditing ? 'cursor-crosshair touch-none' : 'cursor-default touch-pan-y'}`} 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
    >
      <div className="relative overflow-hidden rounded">
          <img 
            ref={imageRef}
            src={imageSrc} 
            alt="Analyzed" 
            className="w-full h-auto object-contain block select-none opacity-90 relative z-10 transition-opacity duration-300 group-hover:opacity-70" 
          />
          
          <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.1)_1px,transparent_1px)] bg-[size:40px_40px] opacity-0 group-hover:opacity-20 pointer-events-none z-10 transition-opacity duration-500"></div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-20"></div>
      </div>

      {isEditing && (
         <div className="absolute top-2 left-2 z-50 bg-red-600/90 text-white text-xs font-mono-sci px-2 py-1 rounded animate-pulse pointer-events-none border border-red-400 shadow-[0_0_10px_red]">
            TARGETING MODE // DRAG TO SELECT
         </div>
      )}

      {currentBox && isEditing && (
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
              const dragPos = dragPositions[risk.id] || { x: 0, y: 0 };
              
              // Anchor point: center of the detection box
              const anchorX = (risk.box_2d.xmin + risk.box_2d.xmax) / 20; 
              const anchorY = (risk.box_2d.ymin + risk.box_2d.ymax) / 20; 
              
              const containerWidth = containerRef.current?.offsetWidth || 1;
              const containerHeight = containerRef.current?.offsetHeight || 1;
              
              const isTooHigh = (risk.box_2d?.ymin || 0) < 160;
              
              // Calculate target center of the label correctly
              // We need to match the HUDCallout's actual visual center
              let leftPercent = ((risk.box_2d?.xmin || 0) + (risk.box_2d?.xmax || 0)) / 20;
              const targetX = leftPercent + (dragPos.x / containerWidth * 100);
              
              // Standard offset logic matching HUDCallout style
              const baseTop = isTooHigh ? ((risk.box_2d?.ymax || 0) / 10) : ((risk.box_2d?.ymin || 0) / 10);
              const verticalOffsetPercent = isTooHigh ? 18 : -18; // approx center of callout relative to its attachment point
              const targetY = baseTop + (dragPos.y / containerHeight * 100) + verticalOffsetPercent;

              let strokeColor = (risk.category === 'HYGIENE') ? "#f59e0b" : (risk.category === 'SAFETY' ? "#facc15" : "#ef4444");
              if (isSelected) strokeColor = "#22d3ee"; 

              return (
                <g key={`line-group-${risk.id}`}>
                  {/* Outer Glow Line */}
                  <motion.path
                    d={`M ${anchorX}% ${anchorY}% L ${targetX}% ${targetY}%`}
                    animate={{
                      d: `M ${anchorX}% ${anchorY}% L ${targetX}% ${targetY}%`,
                      stroke: strokeColor,
                      strokeWidth: isSelected ? 4 : 2,
                      opacity: isSelected ? 0.3 : 0.1
                    }}
                    filter="url(#glow)"
                    fill="none"
                    initial={false}
                  />
                  {/* Main Tether Line */}
                  <motion.path
                    d={`M ${anchorX}% ${anchorY}% L ${targetX}% ${targetY}%`}
                    animate={{
                      d: `M ${anchorX}% ${anchorY}% L ${targetX}% ${targetY}%`,
                      stroke: strokeColor,
                      strokeWidth: isSelected ? 1.5 : 0.8,
                      opacity: isSelected ? 1 : 0.3
                    }}
                    strokeDasharray={isSelected ? "none" : "3,3"}
                    fill="none"
                    strokeLinecap="round"
                    initial={false}
                  />
                  {/* Joint circle at the box */}
                  <motion.circle 
                    cx={`${anchorX}%`} 
                    cy={`${anchorY}%`} 
                    r={isSelected ? "2.5" : "1.5"} 
                    fill={strokeColor}
                    animate={{ opacity: isSelected ? 1 : 0.4 }}
                  />
                  {/* Join circle at the callout attachment point */}
                  <motion.circle 
                    cx={`${targetX}%`} 
                    cy={`${targetY}%`} 
                    r={isSelected ? "2" : "1"} 
                    fill={strokeColor}
                    animate={{ opacity: isSelected ? 0.8 : 0.2 }}
                  />
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
                  ${isEditing ? 'opacity-30 pointer-events-none' : 'opacity-90 hover:opacity-100 cursor-pointer'} 
                  ${isSelected ? 'z-[60]' : 'z-[40]'}
                `}
                style={getStyle(risk.box_2d)}
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
                      absolute -top-3 -left-3 w-6 h-6 flex items-center justify-center 
                      text-[12px] font-bold font-mono-sci shadow-lg z-50
                      ${bgColor} text-black rounded-sm border border-black/20
                  `}>
                      {index + 1}
                  </div>
              </div>

              {/* Draggable HUD Callout */}
              {!isEditing && (
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
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  </div>
  );
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
}

const HUDCallout: React.FC<HUDCalloutProps> = ({ risk, isSelected, index, borderColor, textColor, containerRef, onSelect, onDragUpdate }) => {
  // Smart detect if callout should flip to bottom if original position (top) is too high
  const isTooHigh = (risk.box_2d?.ymin || 0) < 160; 
  
  // Smart horizontal positioning to prevent clipping on edges
  let leftPercent = ((risk.box_2d?.xmin || 0) + (risk.box_2d?.xmax || 0)) / 20;
  let translateX = '-50%';
  
  if (leftPercent < 15) {
    translateX = '0%';    // align left edge if too close to left
  } else if (leftPercent > 85) {
    translateX = '-100%'; // align right edge if too close to right
  }

  return (
    <motion.div
      drag
      dragControls={undefined}
      dragListener={true}
      dragMomentum={false}
      dragElastic={0.1}
      dragConstraints={containerRef}
      onDragStart={onSelect}
      onDrag={(e, info) => onDragUpdate(info.delta)}
      className={`absolute z-[100] pointer-events-auto ${isTooHigh ? 'origin-top' : 'origin-bottom'} cursor-grab active:cursor-grabbing`}
      style={{
        left: `${leftPercent}%`,
        // If too high, position callout below the box instead of above
        top: isTooHigh ? `${(risk.box_2d?.ymax || 0) / 10}%` : `${(risk.box_2d?.ymin || 0) / 10}%`,
        translateX: translateX,
        translateY: isTooHigh ? '10%' : '-115%',
        touchAction: "none",
        willChange: 'transform'
      }}
    >
      <div
        onClick={onSelect}
        className={`
          relative bg-slate-900/90 backdrop-blur-md border rounded-md p-2 shadow-2xl
          w-max min-w-[140px] max-w-[180px] sm:max-w-[220px] border-l-4
          ${isSelected ? 'scale-110 shadow-cyan-500/20 ring-1 ring-cyan-500/50' : 'scale-100'} 
          transition-all duration-300 ${borderColor}
          cursor-grab active:cursor-grabbing group/callout
        `}
      >
        {/* DRAG HANDLE INDICATOR */}
        <div className="absolute -top-2 -right-2 bg-slate-800 border border-slate-700 rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover/callout:opacity-100 transition-opacity z-[110]">
            <span className="text-[8px] text-white font-bold">✥</span>
        </div>

        <div className="flex items-center justify-between gap-2 mb-1 border-b border-slate-800 pb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`flex-shrink-0 flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-sm ${isSelected ? 'bg-cyan-400 text-black' : 'bg-slate-700 text-white'}`}>
              {index + 1}
            </span>
            <span className={`text-[9px] font-bold uppercase tracking-wider leading-tight ${textColor}`}>
               {risk.label}
            </span>
          </div>
        </div>
        
        <div className="text-[9px] text-slate-300 leading-snug line-clamp-2 italic font-mono-sci mb-1">
           {risk.agent || risk.description.split('.')[0]}
        </div>

        {isSelected && (
          <div className="flex items-center gap-1 mt-1 text-[7px] text-cyan-400 font-bold uppercase animate-pulse">
             <div className="w-1 h-1 bg-cyan-400 rounded-full"></div>
             DATA_LINK_ENGAGED
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ImageAnnotator;
import React, { useState, useRef, useEffect } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  
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
    <div 
      className={`relative w-full rounded bg-black group shadow-2xl border border-slate-800 overflow-hidden ${isEditing ? 'cursor-crosshair touch-none' : 'cursor-default touch-pan-y'}`} 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
    >
      <div className="relative">
          <img src={imageSrc} alt="Analyzed" className="w-full h-auto object-contain block select-none opacity-90 relative z-10 transition-opacity duration-300 group-hover:opacity-70" />
          
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:40px_40px] opacity-0 group-hover:opacity-20 pointer-events-none z-10 transition-opacity duration-500"></div>
          
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
              borderColor = 'border-white';
              bgColor = 'bg-white';
              textColor = 'text-white';
              pulseColor = 'shadow-[0_0_20px_rgba(255,255,255,0.8)]';
          }

          return (
            <div key={risk.id} 
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

                {/* Label Tag */}
                <div className={`
                    absolute -top-6 left-0 flex items-center transition-all duration-300 origin-bottom-left
                    ${isSelected ? 'scale-110 z-50' : 'scale-100 z-40'}
                `}>
                    <div className={`
                        flex items-center justify-center w-5 h-5 text-[10px] font-bold font-mono-sci 
                        ${bgColor} text-black shadow-lg
                    `}>
                        {index + 1}
                    </div>

                    <div className={`
                        overflow-hidden whitespace-nowrap bg-slate-900 border-y border-r ${borderColor}
                        transition-all duration-300 ease-out flex items-center
                        max-w-[200px] px-2 opacity-100
                    `}>
                        {risk.category === 'SAFETY' && <span className="mr-1 text-[10px]">⚠️</span>}
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${textColor}`}>
                            {risk.label}
                        </span>
                    </div>
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ImageAnnotator;
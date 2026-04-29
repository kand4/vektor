
import React, { useCallback, useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Toast } from './Toast';

interface UploadZoneProps {
  onImagesSelected: (files: File[]) => void;
  disabled: boolean;
  isAnalyzing?: boolean;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onImagesSelected, disabled, isAnalyzing = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toastMsg, setToastMsg] = useState<{msg: string, type: 'error' | 'success'} | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (isAnalyzing) {
       setProgress(0);
       const interval = setInterval(() => {
           setProgress(prev => {
             if (prev >= 95) return 99; 
             const inc = Math.random() * 5 + 1; 
             return Math.min(prev + inc, 99);
           });
       }, 150);
       return () => clearInterval(interval);
    } else {
       setProgress(0);
    }
  }, [isAnalyzing]);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const validFiles: File[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (file.type.startsWith('image/')) {
            validFiles.push(file);
        }
    }
    
    if (validFiles.length > 0) {
        onImagesSelected(validFiles);
    } else {
        setToastMsg({ msg: 'ACCESS DENIED: Invalid File Type. Only Images allowed.', type: 'error' });
    }
  }, [onImagesSelected]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return; 
      const items = e.clipboardData?.items;
      if (!items) return;
      const pastedFiles: File[] = [];
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) pastedFiles.push(blob);
        }
      }
      if (pastedFiles.length > 0) {
        onImagesSelected(pastedFiles);
        e.preventDefault(); 
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onImagesSelected, disabled]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const containerClasses = `
    relative overflow-hidden transition-all duration-500 text-center outline-none
    bg-slate-900/80 backdrop-blur-md min-h-[220px] md:min-h-[300px] flex items-center justify-center
    ${isAnalyzing 
      ? 'border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.5)]' 
      : isDragging 
        ? 'border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.3)] cursor-pointer' 
        : 'border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/90 cursor-pointer'
    }
    ${(disabled && !isAnalyzing) ? 'opacity-50 cursor-not-allowed grayscale' : ''}
  `;

  return (
    <div 
      className={containerClasses}
      style={{
        borderWidth: '1px'
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => !disabled && document.getElementById('fileInput')?.click()}
    >
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none z-0"
        style={{
           backgroundImage: `
             linear-gradient(to right, rgba(16,185,129,0.3) 1px, transparent 1px),
             linear-gradient(to bottom, rgba(16,185,129,0.3) 1px, transparent 1px)
           `,
           backgroundSize: '40px 40px'
        }}
      ></div>

      {!disabled && !isAnalyzing && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="w-full h-[40%] absolute -top-[40%] left-0 animate-[scan-line_3s_linear_infinite]">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-emerald-500/20"></div>
                <div 
                    className="absolute inset-0 opacity-60"
                    style={{
                    backgroundImage: `
                        linear-gradient(to right, rgba(52,211,153,0.8) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(52,211,153,0.8) 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px',
                    maskImage: 'linear-gradient(to bottom, transparent, black 90%, black 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 90%, black 100%)'
                    }}
                ></div>
                <div className="absolute bottom-0 w-full h-[2px] bg-emerald-400 shadow-[0_0_20px_#34d399,0_0_40px_#10b981]"></div>
            </div>
        </div>
      )}

      <div className={`absolute top-0 left-0 w-4 h-4 md:w-6 md:h-6 border-t-2 border-l-2 z-10 ${isAnalyzing ? 'border-emerald-400 animate-pulse' : 'border-emerald-500'}`}></div>
      <div className={`absolute top-0 right-0 w-4 h-4 md:w-6 md:h-6 border-t-2 border-r-2 z-10 ${isAnalyzing ? 'border-emerald-400 animate-pulse' : 'border-emerald-500'}`}></div>
      <div className={`absolute bottom-0 left-0 w-4 h-4 md:w-6 md:h-6 border-b-2 border-l-2 z-10 ${isAnalyzing ? 'border-emerald-400 animate-pulse' : 'border-emerald-500'}`}></div>
      <div className={`absolute bottom-0 right-0 w-4 h-4 md:w-6 md:h-6 border-b-2 border-r-2 z-10 ${isAnalyzing ? 'border-emerald-400 animate-pulse' : 'border-emerald-500'}`}></div>

      {isAnalyzing && (
         <div className="absolute inset-0 bg-emerald-500/10 z-0 animate-pulse"></div>
      )}

      <input 
        type="file" 
        id="fileInput" 
        className="hidden" 
        accept="image/*"
        multiple 
        onChange={onInputChange}
        disabled={disabled}
      />
      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
      
      <div className="relative z-10 w-full p-4 md:p-6">
        {isAnalyzing ? (
           <div className="flex flex-col items-center justify-center animate-fade-in w-full max-w-xs mx-auto z-20">
              <div className="relative w-20 h-20 md:w-28 md:h-28 mb-4 md:mb-6">
                 <div className="absolute inset-0 border-4 border-slate-800/50 rounded-full"></div>
                 <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent border-l-transparent rounded-full animate-spin"></div>
                 <div className="absolute inset-2 border-2 border-cyan-500/50 border-b-transparent border-r-transparent rounded-full animate-[spin_2s_linear_infinite_reverse]"></div>
                 <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="font-bold text-white font-mono-sci text-xl md:text-2xl drop-shadow-[0_0_10px_rgba(16,185,129,0.8)] tabular-nums">
                        {Math.floor(progress)}%
                    </span>
                 </div>
              </div>
              
              <p className="text-base md:text-xl font-sci-fi text-white animate-pulse tracking-widest mb-2">
                {t('uploading')}
              </p>
              
              <div className="w-full h-2 bg-slate-900 border border-slate-700 rounded-full overflow-hidden relative">
                 <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
                 <div 
                    className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600 transition-all duration-100 shadow-[0_0_15px_#10b981]" 
                    style={{ width: `${progress}%` }}
                 ></div>
              </div>
              
              <div className="flex justify-between w-full mt-2">
                  <span className="text-[9px] font-mono-sci text-emerald-500/70">PACKET_SENDING</span>
                  <span className="text-[9px] font-mono-sci text-emerald-500/70">{progress < 100 ? 'SYNCING' : 'DONE'}</span>
              </div>
           </div>
        ) : (
           <div className="flex flex-col items-center justify-center space-y-3 md:space-y-5 animate-fade-in">
              <div className={`
                 p-5 md:p-7 rounded-full bg-slate-950/80 border border-emerald-500/50 text-emerald-400 
                 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all duration-300 relative overflow-hidden
              `}>
                <div className="absolute inset-0 bg-emerald-500/20 animate-pulse rounded-full blur-md"></div>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 md:w-12 md:h-12 relative z-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <div className="space-y-2 md:space-y-3 relative z-10">
                <p className="text-lg md:text-2xl font-sci-fi font-bold text-emerald-100 tracking-wide drop-shadow-md">
                  {t('upload_title')}
                </p>
                <p className="text-xs md:text-base font-mono-sci text-emerald-500/90 bg-black/40 px-2 py-1 rounded inline-block">
                  {t('upload_subtitle')}
                </p>
                <p className="text-[10px] md:text-xs text-slate-500 font-mono-sci">
                   {t('upload_drag')}
                </p>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default UploadZone;

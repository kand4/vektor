import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { AnalysisResponse, BoundingBox } from '../types';
import { Toast } from './Toast';

interface ManualJsonBypassPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyJson: (parsedResult: AnalysisResponse) => void;
  activeImageSrc?: string;
  activeMode?: 'VECTOR_CONTROL' | 'KKM_FOOD_STANDARD';
}

export const ManualJsonBypassPanel: React.FC<ManualJsonBypassPanelProps> = ({
  isOpen,
  onClose,
  onApplyJson,
  activeImageSrc,
  activeMode = 'VECTOR_CONTROL',
}) => {
  const { t, language } = useLanguage();
  const [jsonInput, setJsonInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<'AISTUDIO' | 'LMSYS' | 'CLAUDE' | 'CHATGPT'>('AISTUDIO');
  const [toastMsg, setToastMsg] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  // Optimized operational system prompt for grounding & JSON output structures
  const getPromptString = () => {
    const targetLang = language === 'ms' ? 'Bahasa Melayu' : 'English / Scientific';
    return `You are a Senior Public Health and Bio-Forensic Inspector. 
Analyze the uploaded image for environmental bio-threats, vectors (larvae, mosquitoes, static pooling water, organic build-up) or sanitation/food safety risks.

You MUST visually identify bounding boxes for each hazard pinpointed on a coordinates grid of 1000x1000 pixels:
[ymin, xmin, ymax, xmax] where (0,0) is top-left, and (1000,1000) is bottom-right.

RETURN AN ABSOLUTELY VALID JSON RAW OBJECT STICKING PRECISELY TO THIS SCHEMA:
{
  "risks": [
    {
      "label": "Threat/Hazard Name (In ${targetLang}, e.g. 'Air Bertakung')",
      "category": "VECTOR" or "HYGIENE" or "SAFETY",
      "agent": "Scientific/Latin taxonomical name (In strictly English, e.g. 'Aedes aegypti')",
      "microbiology": "Associated pathogen or microbiome (In strictly English/Scientific, e.g. 'Dengue Virus' or 'None')",
      "disease": "Associated disease or health consequence (In English/Scientific, e.g. 'Dengue Fever' or 'N/A')",
      "description": "Forensic, environmental inspection observation notes (In ${targetLang})",
      "solution": "Public Health Intervention, sanitation advice, or enforcement solution (In ${targetLang})",
      "box_2d": {
        "ymin": number (0-1000),
        "xmin": number (0-1000),
        "ymax": number (0-1000),
        "xmax": number (0-1000)
      },
      "confidence": number (1-100)
    }
  ],
  "generalAdvice": "Unified technical summary and directive for authorities (In ${targetLang})",
  "savageCommentary": "An engaging, direct, dramatic, or slightly humorous sarcastic review of the scene to provoke urgent hygiene correction in ${targetLang}",
  "hygieneLevel": number (1-5 where 1 is cleanest/best/perfect, 5 is worst/critical hazard/immediate closure),
  "safetyLevel": number (1-5 where 1 is safest/best/perfect, 5 is worst/critical bio-hazard)
}

DO NOT include markdown tags like \`\`\`json or backticks. Return the json object as plain raw text.`;
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(getPromptString());
      setIsCopied(true);
      setToastMsg({ msg: "Prompt bimbingan AI berjaya disalin! Sila tampal di Arena/Studio.", type: 'success' });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      setToastMsg({ msg: "Gagal salin automatik. Sila salin manual.", type: 'error' });
    }
  };

  // Dedicated visual grounding coordinate sanitizer
  const sanitizeCustomJSON = (rawStr: string): AnalysisResponse => {
    // Basic cleanup of starting/trailing code blocks
    let cleanStr = rawStr.trim();
    if (cleanStr.startsWith('```')) {
      cleanStr = cleanStr.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(cleanStr) as AnalysisResponse;

    if (!parsed.risks) parsed.risks = [];

    // Map through risks & validate structure
    parsed.risks = parsed.risks.map((r: any, idx: number) => {
      // Handle string fallback if the LLM returned strings
      if (typeof r === 'string') {
        r = {
          label: r,
          category: 'HYGIENE',
          agent: 'General Threat',
          microbiology: 'N/A',
          disease: 'N/A',
          description: r,
          solution: 'Please manually clean custom areas.',
          box_2d: { ymin: 100, xmin: 100, ymax: 500, xmax: 500 }
        };
      }

      // Ensure stable id
      if (!r.id) r.id = `ext-res-${Date.now()}-${idx}`;

      // Convert array box_2d to object if returned that way
      if (Array.isArray(r.box_2d)) {
        const [ymin, xmin, ymax, xmax] = r.box_2d;
        r.box_2d = { ymin, xmin, ymax, xmax };
      }

      // Setup default boxes if completely missing
      if (!r.box_2d || typeof r.box_2d.ymin !== 'number') {
        const gridX = (idx % 3) * 330;
        const gridY = (Math.floor(idx / 3)) * 330;
        r.box_2d = { ymin: gridY, xmin: gridX, ymax: gridY + 300, xmax: gridX + 300 };
      }

      // Force integer scales of 1000
      const b = r.box_2d;
      if (b.ymax <= 1 && b.xmax <= 1) {
        b.ymin = Math.floor(b.ymin * 1000);
        b.xmin = Math.floor(b.xmin * 1000);
        b.ymax = Math.floor(b.ymax * 1000);
        b.xmax = Math.floor(b.xmax * 1000);
      }

      // Safe clipping bounds
      b.ymin = Math.max(0, Math.min(1000, b.ymin));
      b.xmin = Math.max(0, Math.min(1000, b.xmin));
      b.ymax = Math.max(0, Math.min(1000, b.ymax));
      b.xmax = Math.max(0, Math.min(1000, b.xmax));

      // Make sure width/height is at least minimum 50px
      if (b.ymax - b.ymin < 50) b.ymax = Math.min(1000, b.ymin + 100);
      if (b.xmax - b.xmin < 50) b.xmax = Math.min(1000, b.xmin + 100);

      // Category defaults
      if (!r.category) {
        const lbl = r.label.toLowerCase();
        if (['wire', 'trip', 'safety', 'danger', 'shards'].some(k => lbl.includes(k))) {
          r.category = 'SAFETY';
        } else if (['larvae', 'mosq', 'vector', 'aedes'].some(k => lbl.includes(k))) {
          r.category = 'VECTOR';
        } else {
          r.category = 'HYGIENE';
        }
      }

      if (!r.confidence) r.confidence = 90;
      if (!r.microbiology) r.microbiology = 'N/A';
      if (!r.disease) r.disease = 'N/A';
      if (!r.statistics) r.statistics = 'N/A';
      if (!r.citations) r.citations = [];

      return r;
    });

    if (typeof parsed.hygieneLevel !== 'number') parsed.hygieneLevel = 3;
    if (typeof parsed.safetyLevel !== 'number') parsed.safetyLevel = 4;
    parsed.mode = activeMode;
    parsed.sensitivityUsed = 'EXTREME';
    parsed.timestamp = Date.now();

    return parsed;
  };

  const handleApply = () => {
    setValidationError(null);
    if (!jsonInput.trim()) {
      setValidationError("Ralat: Sila pastikan anda menampal rentetan JSON yang sah.");
      return;
    }

    try {
      const sanitized = sanitizeCustomJSON(jsonInput);
      onApplyJson(sanitized);
      setToastMsg({ msg: "Keputusan log visual luaran berjaya diimport!", type: 'success' });
      // Clear and close
      setJsonInput('');
      setTimeout(onClose, 800);
    } catch (err: any) {
      setValidationError(`Format JSON Tidak Sah: ${err.message || 'Pasti tiada baki teks perbualan LLM sahaja di luar struktur JSON.'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
      
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col my-auto">
        
        {/* Diagnostic background pattern */}
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none z-0"
          style={{
             backgroundImage: `
               linear-gradient(to right, rgba(16,185,129,0.3) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(16,185,129,0.3) 1px, transparent 1px)
             `,
             backgroundSize: '24px 24px'
          }}
        ></div>

        {/* Framing brackets */}
        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-500/80"></div>
        <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-500/80"></div>
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-500/80"></div>
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-500/80"></div>

        {/* Modal Header */}
        <div className="flex justify-between items-start z-10 border-b border-slate-800 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
              <span className="text-[10px] font-mono-sci text-emerald-400 tracking-[0.2em] uppercase">Bypass Kuota API</span>
            </div>
            <h3 className="text-xl font-sci-fi font-bold text-white tracking-widest mt-1">MOD PENGESANAN LUARAN</h3>
          </div>
          <button 
            onClick={onClose}
            aria-label="Tutup"
            title="Tutup"
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center border border-slate-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Tabs for External Platforms instructions */}
        <div className="z-10 bg-slate-950/80 p-4 border border-slate-800 rounded-xl mb-4 space-y-3">
          <span className="text-[10px] text-slate-400 font-mono-sci uppercase tracking-[0.1em] block">LANGKAH 1: PILIH PLATFORM AI LUARAN PIASAN</span>
          
          <div className="grid grid-cols-4 gap-2">
            <button 
              onClick={() => setActivePlatform('AISTUDIO')}
              className={`py-2 px-3 rounded text-xs font-bold font-sci-fi border transition ${activePlatform === 'AISTUDIO' ? 'bg-emerald-950/50 border-emerald-500/80 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
            >
              Google AI Studio
            </button>
            <button 
              onClick={() => setActivePlatform('LMSYS')}
              className={`py-2 px-3 rounded text-xs font-bold font-sci-fi border transition ${activePlatform === 'LMSYS' ? 'bg-emerald-950/50 border-emerald-500/80 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
            >
              LMSYS Arena.ai
            </button>
            <button 
              onClick={() => setActivePlatform('CLAUDE')}
              className={`py-2 px-3 rounded text-xs font-bold font-sci-fi border transition ${activePlatform === 'CLAUDE' ? 'bg-emerald-950/50 border-emerald-500/80 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
            >
              Claude
            </button>
            <button 
              onClick={() => setActivePlatform('CHATGPT')}
              className={`py-2 px-3 rounded text-xs font-bold font-sci-fi border transition ${activePlatform === 'CHATGPT' ? 'bg-emerald-950/50 border-emerald-500/80 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
            >
              ChatGPT
            </button>
          </div>

          <div className="text-xs text-slate-300 space-y-1.5 pt-1">
            {activePlatform === 'AISTUDIO' && (
              <>
                <p>1. Buka <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-cyan-400 font-bold hover:underline">Google AI Studio</a> (Percuma & Tiada Had).</p>
                <p>2. Muatkan imej anda, salin membimbing arahan prompt di bawah.</p>
                <p>3. Pilih model <b>Gemini 1.5 Pro atau Gemini 2.5 Flash</b> lalu tekan Run.</p>
              </>
            )}
            {activePlatform === 'LMSYS' && (
              <>
                <p>1. Pergi ke <a href="https://arena.ai/" target="_blank" rel="noreferrer" className="text-cyan-400 font-bold hover:underline">Arena.ai</a>.</p>
                <p>2. Pilih tab <b>"Direct Chat"</b>, pilih model Multimodal (Gemini, Claude-3.5-Sonnet, GPT-4o).</p>
                <p>3. Upload imej anda bersama template prompt di bawah.</p>
              </>
            )}
            {activePlatform === 'CLAUDE' && (
              <>
                <p>1. Log masuk ke akaun <a href="https://claude.ai/" target="_blank" rel="noreferrer" className="text-cyan-400 font-bold hover:underline">Claude.ai</a> biasa anda.</p>
                <p>2. Jalankan arahan bersama gambar ancaman bio persekitaran anda.</p>
              </>
            )}
            {activePlatform === 'CHATGPT' && (
              <>
                <p>1. Log masuk ke akaun <a href="https://chatgpt.com/" target="_blank" rel="noreferrer" className="text-cyan-400 font-bold hover:underline">ChatGPT</a> biasa anda.</p>
                <p>2. Jalankan arahan bersama gambar ancaman bio persekitaran anda.</p>
              </>
            )}
          </div>

          <button 
            onClick={handleCopyPrompt}
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded text-xs font-mono-sci uppercase tracking-wider flex items-center justify-center gap-2 transition"
          >
            <span>{isCopied ? "✓ BERJAYA DISALIN" : "📋 SALIN PROMPT DAN ARAHAN PEMBUATAN JSON"}</span>
          </button>
        </div>

        {/* Input Text Area block */}
        <div className="z-10 flex-grow flex flex-col space-y-2">
          <label className="text-[10px] text-slate-400 font-mono-sci uppercase tracking-[0.1em] block">
            LANGKAH 2: TAMPAL HASIL JAWAPAN JSON DARI AI DI SINI
          </label>
          <div className="relative">
            <textarea
              className="w-full h-44 bg-slate-950/90 border border-slate-800 focus:border-emerald-500/50 rounded-xl p-3 text-xs font-mono text-emerald-300 placeholder-slate-700 focus:outline-none transition-all resize-none"
              placeholder='Tampal teks JSON. Contoh: {"risks": [...], "generalAdvice": "..."}'
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value);
                setValidationError(null);
              }}
            />
            {activeImageSrc && (
              <div className="absolute top-2 right-2 w-12 h-12 rounded border border-slate-700 overflow-hidden opacity-40 hover:opacity-100 transition-opacity">
                <img src={activeImageSrc} className="w-full h-full object-cover" alt="Inspection target" />
              </div>
            )}
          </div>
          
          {validationError && (
            <div className="p-2 border border-red-500/30 bg-red-950/20 text-red-400 rounded-lg text-xs font-mono">
              ⚠️ {validationError}
            </div>
          )}
        </div>

        {/* Confirm Footer */}
        <div className="z-10 mt-5 pt-4 border-t border-slate-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs font-sci-fi tracking-widest transition"
          >
            BATAL
          </button>
          <button 
            onClick={handleApply}
            className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 font-bold rounded-lg text-xs font-sci-fi tracking-widest text-black shadow-lg shadow-emerald-500/20 active:scale-95 transition"
          >
            PROSES ANOTASI & PAPAR
          </button>
        </div>

      </div>
    </div>
  );
};

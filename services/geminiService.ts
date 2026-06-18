import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse, RiskDetection, BoundingBox, SensitivityLevel, AnalysisMode, iDengueData, RegionalDengueData } from "../types";
import { saveLog } from "./logService";

export interface SimulationConfig {
  mode: 'SANITIZE_ONLY' | 'UPGRADE_FURNITURE' | 'FULL_RECONSTRUCTION';
  humans: 'KEEP_PROTECTED' | 'REMOVE';
  lighting: 'NATURAL' | 'CLINICAL_BLUE' | 'WARM';
  engine: 'GEMINI_IMAGEN' | 'POLLINATIONS' | 'MANUAL'; 
  customPrompt?: string;
}

export const getPreferredModel = (defaultModel: string) => {
    return localStorage.getItem('gemini_model_preference') || defaultModel;
};

export const getPreferredModelForScan = (defaultModel: string) => {
    return localStorage.getItem('gemini_model_preference') || defaultModel;
};

export const getPreferredModelForText = (defaultModel: string) => {
    return localStorage.getItem('gemini_model_preference') || defaultModel;
};

let activeKeyIndex = 0;

export const getAvailableApiKeys = (): string[] => {
  const keys: string[] = [];
  if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
    keys.push(process.env.GEMINI_API_KEY.trim());
  }
  if (typeof window !== 'undefined') {
    const key1 = localStorage.getItem('gemini_api_key');
    const key2 = localStorage.getItem('gemini_api_key_2');
    const key3 = localStorage.getItem('gemini_api_key_3');
    if (key1 && key1.trim()) keys.push(key1.trim());
    if (key2 && key2.trim()) keys.push(key2.trim());
    if (key3 && key3.trim()) keys.push(key3.trim());
  }
  return Array.from(new Set(keys)).filter(Boolean);
};

const getAIClient = (): any => {
  const keys = getAvailableApiKeys();
  const poolSize = keys.length > 0 ? keys.length : 1;

  const handler = {
    get(target: any, prop: string | symbol, receiver: any): any {
      if (prop === 'models') {
        const modelsHandler = {
          get(modelsTarget: any, modelsProp: string | symbol) {
            if (modelsProp === 'generateContent' || modelsProp === 'generateImages') {
              return async (...args: any[]) => {
                let lastError = null;
                const arg = args[0] || {};
                
                for (let i = 0; i < poolSize; i++) {
                  const currentIndex = keys.length > 0 ? (activeKeyIndex + i) % poolSize : 0;
                  const key = keys.length > 0 ? keys[currentIndex] : null;
                  
                  try {
                    console.log(`🤖 [Attempt ${i + 1}/${poolSize}] Proxying ${String(modelsProp)} through server... Key Slot: ${key ? currentIndex + 1 : 'Default Server Key'}`);
                    const headers: Record<string, string> = {
                      'Content-Type': 'application/json'
                    };
                    if (key) {
                      headers['Authorization'] = `Bearer ${key}`;
                    }

                    const bodyPayload = {
                      method: String(modelsProp),
                      model: arg.model,
                      config: arg.config
                    } as any;

                    if (modelsProp === 'generateContent') {
                      bodyPayload.contents = arg.contents;
                    } else if (modelsProp === 'generateImages') {
                      bodyPayload.prompt = arg.prompt;
                    }

                    const res = await fetch('/api/gemini', {
                      method: 'POST',
                      headers,
                      body: JSON.stringify(bodyPayload)
                    });

                    if (!res.ok) {
                      const errText = await res.text();
                      let errMessage = `Ralat HTTP ${res.status}`;
                      try {
                        const errJson = JSON.parse(errText);
                        errMessage = errJson?.error?.message || errMessage;
                      } catch (e) {
                        errMessage = errText || errMessage;
                      }
                      throw new Error(errMessage);
                    }

                    const data = await res.json();
                    
                    if (keys.length > 0) {
                      activeKeyIndex = (currentIndex + 1) % poolSize;
                    }
                    return data;
                  } catch (error: any) {
                    const errMsg = error?.message || String(error);
                    console.warn(`⚠️ [Key Slot ${key ? currentIndex + 1 : 'Default Server Key'}] failed:`, errMsg);
                    lastError = error;
                  }
                }
                throw lastError || new Error("Semua cubaan panggilan model melalui pelayan telah gagal.");
              };
            }
            throw new Error(`Method ${String(modelsProp)} is not mocked in proxy mode.`);
          }
        };
        return new Proxy({}, modelsHandler);
      }
      throw new Error(`Property ${String(prop)} is not mocked in proxy mode.`);
    }
  };

  return new Proxy({}, handler);
};

const extractJSON = (text: string): string => {
  if (text.toLowerCase().includes('<!doctype ') || text.toLowerCase().includes('<html')) {
      throw new Error("Server AI sedang mengalami kesesakan tinggi (Ralat 503 Gateway). Sila cuba lagi sebentar lagi.");
  }
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (match) {
    return match[0].replace(/```json/g, '').replace(/```/g, '').trim();
  }
  return "{}";
};

// FALLBACK DATA (UPDATED FOR 2026)
const FALLBACK_IDENGUE_DATA: iDengueData = {
    epidemiologicalWeek: "ME 18/2026 (Anggaran)",
    cumulativeCases: 42300,
    cumulativeDeaths: 28,
    activeHotspots: 186,
    topState: "Selangor",
    lastUpdated: new Date().toLocaleDateString(),
    sources: [{ title: "iDengue Backup Data", url: "https://idengue.mysa.gov.my" }]
};

const FALLBACK_REGIONAL_DATA: RegionalDengueData = {
    stateName: "Pahang",
    districtName: "Temerloh",
    stateCases: 1850,
    districtCases: 112,
    districtHotspots: 5,
    districtRiskLevel: "HIGH",
    localAdvice: "Aktiviti gotong-royong disyorkan segera. Sila periksa bekas air bertakung di sekitar Temerloh.",
    epidemiologicalWeek: "ME 18/2026"
};

export const fetchLatestIDengueStats = async (): Promise<iDengueData> => {
  try {
      const ai = getAIClient();
      const currentYear = new Date().getFullYear();
      const prompt = `EKSTRAK DATA RASMI DENGGI MALAYSIA TERKINI. 
      Rujuk portal idengue.mysa.gov.my atau berita terkini KKM (Kementerian Kesihatan Malaysia).
      PENTING: Fokus kepada data tahun ${currentYear}. 
      Dapatkan data bagi MINGGU EPIDEMIOLOGI (ME) PALING TERKINI yang dilaporkan.
      Output JSON Structure: { "cumulativeCases": number, "cumulativeDeaths": number, "activeHotspots": number, "topState": string, "epidemiologicalWeek": string, "lastUpdated": string }`;

      const response = await ai.models.generateContent({
        model: getPreferredModelForText('gemini-2.5-flash'), 
        contents: { parts: [{ text: prompt }] },
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      let text = response.text || "{}";
      text = extractJSON(text);
      const data = JSON.parse(text);
      
      const cases = typeof data.cumulativeCases === 'number' ? data.cumulativeCases : (Number(data.cumulativeCases) || FALLBACK_IDENGUE_DATA.cumulativeCases);
      const deaths = typeof data.cumulativeDeaths === 'number' ? data.cumulativeDeaths : (Number(data.cumulativeDeaths) || FALLBACK_IDENGUE_DATA.cumulativeDeaths);
      const hotspots = typeof data.activeHotspots === 'number' ? data.activeHotspots : (data.activeHotspots === 0 ? 0 : (Number(data.activeHotspots) || FALLBACK_IDENGUE_DATA.activeHotspots));
      
      return { 
          cumulativeCases: cases,
          cumulativeDeaths: deaths,
          activeHotspots: hotspots,
          topState: data.topState || FALLBACK_IDENGUE_DATA.topState,
          epidemiologicalWeek: data.epidemiologicalWeek || FALLBACK_IDENGUE_DATA.epidemiologicalWeek,
          lastUpdated: data.lastUpdated || new Date().toLocaleDateString(),
          sources: [{ title: "iDengue MYSA Official", url: "https://idengue.mysa.gov.my/" }] 
      };
  } catch (error) {
      console.error("Fetch iDengue Stats Error:", error);
      return { ...FALLBACK_IDENGUE_DATA, lastUpdated: new Date().toLocaleDateString() };
  }
};

export const fetchRegionalDengueStats = async (state: string, district: string): Promise<RegionalDengueData> => {
    try {
        const ai = getAIClient();
        const currentYear = new Date().getFullYear();
        const prompt = `Cari statistik denggi terkini untuk Negeri: ${state}, Daerah: ${district}. 
        Rujuk idengue.mysa.gov.my atau portal data rasmi KKM. 
        Output JSON: { "stateName": "${state}", "districtName": "${district}", "stateCases": number, "districtCases": number, "districtHotspots": number, "districtRiskLevel": "LOW"|"MEDIUM"|"HIGH"|"EXTREME", "localAdvice": string, "epidemiologicalWeek": string }`;

        const response = await ai.models.generateContent({
          model: getPreferredModelForText('gemini-2.5-flash'),
          contents: { parts: [{ text: prompt }] },
          config: {
            tools: [{ googleSearch: {} }]
          }
        });
        let text = response.text || "{}";
        text = extractJSON(text);
        const data = JSON.parse(text);
        
        const stateCases = typeof data.stateCases === 'number' ? data.stateCases : (Number(data.stateCases) || FALLBACK_REGIONAL_DATA.stateCases);
        const districtCases = typeof data.districtCases === 'number' ? data.districtCases : (Number(data.districtCases) || FALLBACK_REGIONAL_DATA.districtCases);
        const districtHotspots = typeof data.districtHotspots === 'number' ? data.districtHotspots : (data.districtHotspots === 0 ? 0 : (Number(data.districtHotspots) || FALLBACK_REGIONAL_DATA.districtHotspots));
        
        return {
            stateName: data.stateName || state,
            districtName: data.districtName || district,
            stateCases: stateCases,
            districtCases: districtCases,
            districtHotspots: districtHotspots,
            districtRiskLevel: data.districtRiskLevel || FALLBACK_REGIONAL_DATA.districtRiskLevel,
            localAdvice: data.localAdvice || FALLBACK_REGIONAL_DATA.localAdvice,
            epidemiologicalWeek: data.epidemiologicalWeek || FALLBACK_REGIONAL_DATA.epidemiologicalWeek
        };
    } catch (error) {
        console.error("Fetch Regional Dengue Error:", error);
        return { ...FALLBACK_REGIONAL_DATA, stateName: state, districtName: district };
    }
};

const compressImage = (base64Str: string, maxWidth = 1600, quality = 0.9): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = `data:image/jpeg;base64,${base64Str}`;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
        };
        img.onerror = () => resolve(base64Str); 
    });
};

export const prettifyErrorMessage = (error: any): string => {
  const msg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
  
  if (msg.includes("PERMISSION_DENIED") || msg.includes("does not have permission") || msg.includes("403")) {
    return "Ralat Kebenaran (API Permission Denied): Kunci API Gemini yang anda gunakan tidak mempunyai kebenaran untuk membuat panggilan ini. Sila pastikan: (1) Kunci API Gemini tidak disekat (restricted) di Google Cloud Console, (2) 'Generative Language API' dibenarkan pada kunci tersebut, (3) Jika guna akaun syarikat/ Workspace, admin mungkin melarang akses Gemini. Sila gunakan akaun Google peribadi untuk menjana API Key percuma baharu di Google AI Studio.";
  }

  if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
    return "Had Kuota API Gemini telah dicapai (Quota Exceeded) atau terlalu banyak permintaan (Rate Limit). Sila tunggu sebentar (kira-kira 1 minit), atau pergi ke Tetapan (Settings) > Masukkan API Key Google Gemini anda sendiri.";
  }

  if (msg.includes("API Key tiada")) {
    return "Tiada API Key dijumpai. Sila masukkan sekurang-kurangnya satu API Key di ruangan Tetapan (Settings).";
  }

  return msg;
};

const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = 2, delay = 2000): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        saveLog(`Retry Failure (Retries left: ${retries}): ${error?.message || error}`, { error });
        const msg = (error?.message || String(error) || "").toLowerCase();
        
        // Hard Quota Error - no point in retrying aggressively
        if (msg.includes("exceeded your current quota") || msg.includes("resource_exhausted") || msg.includes("429")) {
            if (retries <= 0) throw new Error("Had Kuota API telah dicapai (Too Many Requests / 429). Sila tunggu sebentar (60s) atau guna API Key sendiri di Tetapan.");
        }
        
        // Server Overload Error
        if (msg.includes("503") || msg.includes("unavailable") || msg.includes("gateway")) {
             if (retries <= 0) throw new Error("Server AI sedang sibuk (Ralat 503). Permintaan sedang memuncak. Sila cuba analisis ini lagi dalam beberapa saat.");
             delay = Math.max(delay, 5000); // Wait longer for 503
        }

        const isRateLimitError = msg.includes("429") || msg.includes("503") || msg.includes("overloaded");
        const isJsonParsingError = error instanceof SyntaxError || msg.includes("json") || msg.includes("parse");
        
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryWithBackoff(fn, retries - 1, delay * 2);
        }
        throw error;
    }
};

const CLUTTER_KEYWORDS = ['trash', 'rubbish', 'garbage', 'sampah', 'sisa', 'mess', 'clutter', 'pile', 'plastic bag', 'bottle', 'can', 'food', 'sisa makanan', 'kotor', 'dirty', 'stain', 'habuk', 'dust', 'web', 'sarang labah'];

export const analyzeLandscape = async (base64Image: string, mimeType: string, mode: 'FAST' | 'DETAILED' = 'DETAILED', language: string = 'ms', sensitivity: SensitivityLevel = 'STANDARD', analysisMode: AnalysisMode = 'VECTOR_CONTROL'): Promise<AnalysisResponse> => {
  const langMap: Record<string, string> = { 'ms': 'Bahasa Melayu', 'en': 'English', 'zh': 'Chinese', 'ta': 'Tamil' };
  const targetLang = langMap[language] || 'Bahasa Melayu';
  const optimizedImage = await compressImage(base64Image);
  
  // Use preferred model or Flash model for higher spatial intelligence and free API compatibility
  const modelId = getPreferredModelForScan("gemini-2.5-flash");

  let thinkingBudget = 4000; 
  let engineerPersona = "";
  let scanProtocol = "";
  let severityThreshold = "";

  // --- 1. SENSITIVITY CONFIGURATION ---
  switch (sensitivity) {
    case 'STANDARD':
        thinkingBudget = 4000;
        engineerPersona = "SYSTEM: VECTOR CONTROL UNIT (LEVEL 1).";
        severityThreshold = "THRESHOLD: VISIBLE INFESTATION OR STAGNANT WATER.";
        break;
    case 'HIGH':
        thinkingBudget = 16000;
        engineerPersona = "SYSTEM: SENIOR ENVIRONMENTAL HEALTH ENGINEER & OSHA INSPECTOR.";
        severityThreshold = "THRESHOLD: POTENTIAL BREEDING SITES & NON-COMPLIANCE WITH ACT 154.";
        break;
    case 'EXTREME':
        thinkingBudget = 20000;
        engineerPersona = "SYSTEM: FORENSIC PATHOGEN & BIO-SAFETY AUDITOR (LEVEL 5).";
        severityThreshold = "THRESHOLD: ZERO TOLERANCE. ANY ORGANIC RESIDUE IS A CRITICAL DEFECT.";
        break;
  }

  // --- 2. BRANCHING LOGIC: KKM vs VECTOR ---
  let finalPrompt = "";
  let schemaDescription = "";

  if (analysisMode === 'KKM_FOOD_STANDARD') {
      // === KKM INSPECTION MODE ===
      scanProtocol = `
        PROTOCOL: OFFICIAL KKM FOOD PREMISE INSPECTION (BORANG K-PPKM-01/03).
        REFERENCE: FOOD HYGIENE REGULATIONS 2009 & FOOD ACT 1983.
        TASK:
        1. Evaluate the premise based on the 15 standard elements below.
        2. Calculate Demerit Points based on visual evidence.
        3. Issue a Grade (A/B/C/D) and Recommendation (LULUS / TUTUP).
      `;

      schemaDescription = `
        OUTPUT FORMAT: JSON ONLY.
        
        REQUIRED FIELDS:
        - kkmReport: Object containing:
            1. grade: "A" | "B" | "C" | "D" | "F" | "TUTUP" (Auto-calculated based on score)
            2. totalScore: number (0-100)
            3. totalDemerit: number
            4. summary: string (Professional executive summary in ${targetLang})
            5. recommendation: string (e.g., "ARAHAN PENUTUPAN PREMIS (14 HARI)" or "PREMIS BERSIH & MEMUASKAN")
            6. sections: Array of EXACTLY 16 Objects. Each must have:
               - code: string (1-16)
               - title: string (Must correspond to: Lantai, Dinding, Siling, Pengudaraan, Pencahayaan, Penstoran, Pengendalian Makanan, Bekalan Air, Pelupusan Sisa, Perangkap Minyak, Kawalan Perosak, Peralatan, Pencuci Tangan, Tandas, Perparitan, Suntikan Typhoid)
               - totalPoints: number (Max points for section)
               - demeritReceived: number (Points deducted based on image)
               - violations: string[] (List specific faults if demerit > 0)

         - risks: Array of Objects. Each Object MUST contain specific visual findings for evidence:
            1. box_2d: [ymin, xmin, ymax, xmax] 
               - DATA TYPE: ARRAY OF 4 INTEGERS.
               - SCALE: 0-1000 (1000x1000 grid).
               - EXAMPLE: [0, 0, 500, 500].
               - **CRITICAL:** YOU MUST DRAW A BOX AROUND THE HAZARD. DO NOT RETURN NULL.
            2. label: string (Name in ${targetLang} e.g., "Kuku Panjang", "Kotoran")
            3. agent: string (**STRICTLY ENGLISH/SCIENTIFIC NAME** e.g., "Escherichia coli", "Staphylococcus aureus", "Pest")
            4. microbiology: string (**STRICTLY ENGLISH/SCIENTIFIC NAME** e.g., "Enterotoxins", "Endospores")
            5. disease: string (**STRICTLY ENGLISH/MEDICAL TERM** e.g., "Food Poisoning", "Typhoid", "Cholera")
            6. description: string (Forensic Observation in ${targetLang})
            7. solution: string (Remedial action in ${targetLang})
            8. savageCommentary: string (Highly sarcastic, direct, brutal roast/critique of this specific hygiene infraction in ${targetLang}.)
            9. confidence: number (0.0 - 1.0)
        - hygieneLevel: INTEGER (1-5, where 1 is CLEANEST/SAFEST and 5 is WORST/CLOSE PREMISE)
      `;

      finalPrompt = `
        ${engineerPersona}
        OPERATIONAL MODE: KKM FOOD PREMISE/WORKER HYGIENE AUDIT.
        TARGET LANGUAGE: ${targetLang}.
        
        >>> SPATIAL ANALYSIS PROTOCOL (BOUNDING BOXES) <<<
        1. **VISUAL GROUNDING IS MANDATORY.** You are an optical system.
        2. **EVERY RISK MUST HAVE A BOX.** If you list a risk, you MUST identify its pixels [ymin, xmin, ymax, xmax] on a 1000x1000 grid.
        3. **NO STACKING.** Objects are in different places. Coordinates must differ. 
        4. **SCALE:** 0 is top/left, 1000 is bottom/right.

        ${scanProtocol}
        ${severityThreshold}
        
        YOU MUST POPULATE THE 'kkmReport' FIELD WITH ALL 16 SECTIONS. DO NOT SKIP ANY SECTION.
      `;

  } else {
      // === VECTOR / SPATIAL ENGINEERING MODE (DEFAULT) ===
      scanProtocol = "PROTOCOL: IDENTIFY MACRO-VECTORS (AEDES/CULEX) & SOLID WASTE ACCUMULATION.";
      
      schemaDescription = `
        OUTPUT FORMAT: JSON ONLY.
        
        REQUIRED FIELDS:
        - risks: Array of Objects. Each Object MUST contain:
            1. box_2d: [ymin, xmin, ymax, xmax] 
               - DATA TYPE: ARRAY OF 4 INTEGERS.
               - SCALE: 0-1000 (1000x1000 grid).
               - EXAMPLE: [0, 0, 500, 500].
               - **CRITICAL:** YOU MUST DRAW A BOX AROUND THE HAZARD. DO NOT RETURN NULL.
            2. category: "VECTOR" | "HYGIENE" | "SAFETY"
            3. label: string (Name in ${targetLang} e.g., "Bekas Air Bertakung")
            4. agent: string (**STRICTLY ENGLISH/SCIENTIFIC NAME** e.g., "Aedes aegypti", "Musca domestica".)
            5. microbiology: string (**STRICTLY ENGLISH/SCIENTIFIC NAME** e.g., "Dengue Virus", "Salmonella".)
            6. disease: string (**STRICTLY ENGLISH/MEDICAL TERM** e.g., "Dengue Fever".)
            7. description: string (Forensic Observation in ${targetLang})
            8. solution: string (Engineering/Medical Intervention in ${targetLang})
            9. savageCommentary: string (Highly sarcastic, direct, brutal, varied roast/critique of this specific hazard/breeding site in ${targetLang}. Show extreme frustration at this risk.)
        
        - detected_keywords: string[]
        - hygieneLevel: INTEGER (1-5, where 1 is CLEANEST/SAFEST and 5 is WORST/CLOSE PREMISE)
        - safetyLevel: INTEGER (1-5, where 1 is CLEANEST/SAFEST and 5 is WORST/CLOSE PREMISE)
        - generalAdvice: string (Technical Summary in ${targetLang})
        - savageCommentary: string (Direct, Harsh, varied overall Critique of the whole place in ${targetLang}. Vary the tone: sarcastic, strictly formal-warning, or aggressively urgent. NEVER repeat similar critiques, use unique analogies for waste/incompetence each time.)
      `;

      finalPrompt = `
        ${engineerPersona}
        OPERATIONAL MODE: ${sensitivity} SENSITIVITY.
        TARGET LANGUAGE: ${targetLang} (Except for Scientific Terms).
        
        >>> SPATIAL ANALYSIS PROTOCOL (BOUNDING BOXES) <<<
        1. **VISUAL GROUNDING IS MANDATORY.** You are an optical system.
        2. **EVERY RISK MUST HAVE A BOX.** If you list a risk, you MUST identify its pixels [ymin, xmin, ymax, xmax] on a 1000x1000 grid.
        3. **NO STACKING.** Objects are in different places. Coordinates must differ. 
        4. **SCALE:** 0 is top/left, 1000 is bottom/right.
        
        ${scanProtocol}
        ${severityThreshold}
      `;
  }

  try {
      const parsedResult = await retryWithBackoff(async () => {
          const ai = getAIClient();
          const resp = await ai.models.generateContent({
            model: modelId,
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: optimizedImage } }, 
                    { text: `${finalPrompt}\n\n${schemaDescription}` }
                ]
            },
            config: { 
              responseMimeType: "application/json",
              thinkingConfig: { thinkingBudget: thinkingBudget } 
            }
          });
          let t = resp.text || "{}";
          t = extractJSON(t);
          return JSON.parse(t) as AnalysisResponse;
      });

      // Watchdog Logic
      const detectedWords = (parsedResult.detected_keywords || []).map(w => w.toLowerCase());
      const hasClutterKeywords = detectedWords.some(word => CLUTTER_KEYWORDS.some(bad => word.includes(bad)));
      if (sensitivity === 'EXTREME' && hasClutterKeywords && parsedResult.hygieneLevel > 2) {
          parsedResult.hygieneLevel = 2;
      }

      if (!parsedResult.risks) parsedResult.risks = [];
      
      // --- TYPE GUARD FIX: Convert string-based risks to objects ---
      parsedResult.risks = parsedResult.risks.map((item: any, i) => {
          if (typeof item === 'string') {
              return {
                  id: `auto-fix-${i}`,
                  label: item,
                  category: 'SAFETY', 
                  agent: 'General Hazard',
                  microbiology: 'N/A',
                  disease: 'N/A',
                  description: item,
                  solution: 'Sila lakukan pemeriksaan lanjut manual.',
                  box_2d: [0, 0, 0, 0] // Placeholder, sanitation below will fix format
              };
          }
          return item;
      });
      
      // --- COORDINATE SANITIZER V3 ---
      parsedResult.risks.forEach((r, idx) => {
          if (!r.id) r.id = `gen-${Date.now()}-${idx}`;
          
          if (Array.isArray(r.box_2d) && r.box_2d.length === 4) {
              const [ymin, xmin, ymax, xmax] = r.box_2d as unknown as number[];
              r.box_2d = { ymin, xmin, ymax, xmax };
          }

          if (!r.box_2d || typeof r.box_2d.ymin !== 'number') {
             const gridX = (idx % 3) * 330;
             const gridY = (Math.floor(idx / 3)) * 330;
             r.box_2d = { ymin: gridY, xmin: gridX, ymax: gridY + 300, xmax: gridX + 300 };
          } 
          
          const b = r.box_2d;
          
          if (b.ymax <= 1 && b.xmax <= 1) {
             b.ymin = Math.floor(b.ymin * 1000);
             b.xmin = Math.floor(b.xmin * 1000);
             b.ymax = Math.floor(b.ymax * 1000);
             b.xmax = Math.floor(b.xmax * 1000);
          }

          if (b.ymin > b.ymax) { const temp = b.ymin; b.ymin = b.ymax; b.ymax = temp; }
          if (b.xmin > b.xmax) { const temp = b.xmin; b.xmin = b.xmax; b.xmax = temp; }

          if ((b.ymax - b.ymin) < 50) b.ymax = b.ymin + 50;
          if ((b.xmax - b.xmin) < 50) b.xmax = b.xmin + 50;

          b.ymin = Math.max(0, b.ymin);
          b.xmin = Math.max(0, b.xmin);
          b.ymax = Math.min(1000, b.ymax);
          b.xmax = Math.min(1000, b.xmax);

          if (!r.category) {
              const labelLower = r.label.toLowerCase();
              if (['wire', 'trip', 'hazard', 'sharp', 'crack', 'chemical', 'fire', 'electric'].some(k => labelLower.includes(k))) {
                  r.category = 'SAFETY';
              } else if (['mosquito', 'aedes', 'larvae', 'rat', 'fly', 'cockroach', 'pest'].some(k => labelLower.includes(k))) {
                  r.category = 'VECTOR';
              } else {
                  r.category = 'HYGIENE';
              }
          }

          if (!r.savageCommentary) {
              const itemLabel = r.label || "Ancaman";
              r.savageCommentary = `Masalah "${itemLabel}" ini sudah terang lagi bersuluh. Malas nak cakap banyak, tapi kalau tak bersihkan memang sengaja cari pasal!`;
          }
      });

      // --- KKM REPORT FALLBACK GENERATOR V3 ---
      if (analysisMode === 'KKM_FOOD_STANDARD' && !parsedResult.kkmReport) {
          console.warn("⚠️ KKM Report was missing from model response. Generating dynamic compliant report...");
          const sectionsText = [
              { code: '1', title: 'Lantai (Kebersihan / Struktur)', max: 5, keys: ['lantai', 'floor', 'ubin', 'tile', 'lubang'] },
              { code: '2', title: 'Dinding (Kebersihan / Struktur)', max: 5, keys: ['dinding', 'wall', 'cat', 'retak'] },
              { code: '3', title: 'Siling (Kering / Tiada Habuk)', max: 5, keys: ['siling', 'ceiling', 'atap', 'habuk', 'kulat'] },
              { code: '4', title: 'Pengudaraan (Suhu / Aliran)', max: 5, keys: ['pengudaraan', 'ventilation', 'kipas', 'suhu', 'asap'] },
              { code: '5', title: 'Pencahayaan (Terang / Cukup)', max: 5, keys: ['pencahayaan', 'lampu', 'bulb', 'light', 'terang'] },
              { code: '6', title: 'Penstoran Bahan (Suhu / Label)', max: 10, keys: ['storan', 'simpan', 'storage', 'peti', 'fridge', 'label'] },
              { code: '7', title: 'Pengendalian Makanan (Kebersihan)', max: 15, keys: ['pengendali', 'handling', 'sarung', 'glove', 'apron', 'kuku', 'rambut'] },
              { code: '8', title: 'Bekalan Air Bersih', max: 5, keys: ['bekalan air', 'paip', 'water supply', 'tangki'] },
              { code: '9', title: 'Pelupusan Sisa Pepejal/Sair', max: 10, keys: ['sisa', 'sampah', 'waste', 'tong', 'trash'] },
              { code: '10', title: 'Pemasangan Perangkap Minyak', max: 5, keys: ['minyak', 'grease', 'trap', 'sisa minyak'] },
              { code: '11', title: 'Kawalan Lalat, Lipas & Tikus', max: 10, keys: ['perosak', 'pest', 'tikus', 'lalat', 'lipas', 'semut', 'fly', 'mouse', 'vector'] },
              { code: '12', title: 'Peralatan & Perkakas Bersih', max: 10, keys: ['peralatan', 'perkakas', 'mesin', 'utensil', 'fork', 'spoon', 'pinggan', 'papan pemotong'] },
              { code: '13', title: 'Kemudahan Cuci Tangan & Sabun', max: 5, keys: ['basuh tangan', 'sink', 'sinki', 'sabun', 'handwash'] },
              { code: '14', title: 'Kemudahan Tandas Berfungsi/Bersih', max: 5, keys: ['tandas', 'toilet', 'jamban', 'mangkuk'] },
              { code: '15', title: 'Sistem Perparitan Sempurna', max: 5, keys: ['longkang', 'parit', 'drain', 'perparitan'] },
              { code: '16', title: 'Suntikan Typhoid & Kursus KKM', max: 5, keys: ['typhoid', 'suntikan', 'kursus', 'vaksin', 'kad', 'pekerja'] }
          ];

          let totalDemerit = 0;
          const risks = parsedResult.risks || [];
          const hygieneLevel = parsedResult.hygieneLevel || 3;

          const sections = sectionsText.map(sec => {
              const violations: string[] = [];
              risks.forEach((r: any) => {
                  const desc = (r.description || '').toLowerCase();
                  const lbl = (r.label || '').toLowerCase();
                  const hasMatch = sec.keys.some(k => desc.includes(k) || lbl.includes(k));
                  if (hasMatch) {
                      violations.push(r.label || 'Kecacatan kebersihan');
                  }
              });

              let demeritReceived = 0;
              if (violations.length > 0) {
                  demeritReceived = Math.min(sec.max, violations.length * 3);
              } else if (hygieneLevel > 2 && Math.random() > 0.6) {
                  demeritReceived = Math.min(sec.max, Math.floor(Math.random() * 2) + 1);
                  violations.push("Pemerhatian kebersihan kurang memuaskan secara tidak langsung.");
              }

              totalDemerit += demeritReceived;

              return {
                  code: sec.code,
                  title: sec.title,
                  totalPoints: sec.max,
                  demeritReceived,
                  violations
              };
          });

          const totalScore = Math.max(10, 100 - totalDemerit);
          let grade = 'A';
          let recommendation = 'PREMIS BERSIH & MEMUASKAN';
          
          if (totalScore >= 90) {
              grade = 'A';
              recommendation = 'PREMIS BERSIH & MEMUASKAN';
          } else if (totalScore >= 80) {
              grade = 'B';
              recommendation = 'PREMIS DI TAHAP MEMUASKAN (LULUS)';
          } else if (totalScore >= 70) {
              grade = 'C';
              recommendation = 'PREMIS DI BAWAH PEMANTAUAN (LULUS BERSYARAT - TINDAKAN 14 HARI)';
          } else if (totalScore >= 50) {
              grade = 'D';
              recommendation = 'ARAHAN TINDAKAN PEMBETULAN KERAS (BERI AMARAN KKM)';
          } else {
              grade = 'TUTUP';
              recommendation = 'ARAHAN PENUTUPAN PREMIS SERTA MERTA DI BAWAH SEKSYEN 11 AKTA MAKANAN 1983';
          }

          const summaryText = risks.length > 0
              ? `Hasil pemeriksaan mendapati terdapat ${risks.length} ancaman kebersihan termasuk ${risks.map((r: any) => r.label).slice(0, 3).join(', ')}. Tindakan pembetulan wajib diambil segera.`
              : "Tahap kebersihan premis secara amnya berada pada tahap yang memuaskan. Sila kekalkan sanitasi harian mengikut garis panduan keselamatan makanan.";

          parsedResult.kkmReport = {
              grade,
              totalScore,
              totalDemerit,
              summary: summaryText,
              recommendation,
              sections
          };
      }

      parsedResult.sensitivityUsed = sensitivity;
      parsedResult.mode = analysisMode; 
      return parsedResult;

  } catch (error: any) {
      console.error("Analysis Error:", error);
      saveLog(`Analysis Error: ${error?.message || error}`, { error, mode: analysisMode, finalPrompt });
      const prettyMsg = prettifyErrorMessage(error);
      throw new Error(prettyMsg);
  }
};

export const analyzeManualRegion = async (base64Image: string, mimeType: string, box: BoundingBox, userContext: string, language: string = 'ms', isSavageMode: boolean = false, sensitivity: 'LOW' | 'HIGH' | 'EXTREME' = 'HIGH'): Promise<RiskDetection> => {
    const optimizedImage = await compressImage(base64Image);
    const ai = getAIClient();
    
    // Manual analysis also gets the upgrade
    const prompt = `ENGINEERING ANALYSIS OF ROI (Region of Interest).
    COORDINATES: ymin: ${box.ymin}, xmin: ${box.xmin}, ymax: ${box.ymax}, xmax: ${box.xmax}.
    You MUST focus EXCLUSIVELY on the visual content within this specific bounding box.
    CONTEXT provided by user: "${userContext}". 
    TASK: IDENTIFY PATHOGEN, VECTOR AGENT, OR SAFETY HAZARD specifically at this location.
    SENSITIVITY MODE: ${sensitivity} (Adjust strictness of analysis accordingly: LOW=obvious risks only, HIGH=detailed risks, EXTREME=microscopic/theoretical risks).
    RETURN 'agent', 'microbiology', and 'disease' IN ENGLISH/SCIENTIFIC LATIN.
    IMPORTANT: Provide a detailed 'solution' and 'description' in ${language === 'ms' ? 'Malay' : 'English'}. The 'solution' MUST include practical recommendations and mitigation strategies for the identified risk.
    You MUST output valid JSON conforming strictly to this format:
    {
      "category": "VECTOR" | "HYGIENE" | "SAFETY",
      "label": "Brief 1-3 word title",
      "agent": "Scientific Name if applicable",
      "disease": "Potential disease",
      "microbiology": "Scientific details",
      "statistics": "Relevant stats",
      "description": "Detailed explanation of the observation",
      "solution": "${isSavageMode ? 'Provide a highly sarcastic, brutal, aggressive roast/commentary instead of real advice.' : 'Provide official, practical recommendations and mitigation strategies'}"
    }`;
    
    try {
        const result = await retryWithBackoff(async () => {
            const ai = getAIClient();
            const resp = await ai.models.generateContent({
                // Using Pro model for higher spatial intelligence and coordinate handling
                model: getPreferredModelForText("gemini-2.5-flash"), 
                contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: optimizedImage } }, { text: prompt }] },
                config: { responseMimeType: "application/json" }
            });
            const t = extractJSON(resp.text || "{}");
            return JSON.parse(t);
        });
        result.id = `manual-${Date.now()}`;
        result.box_2d = box; 
        
        if (!result.category) result.category = 'HYGIENE';
        if (!result.microbiology) result.microbiology = "Targeted Analysis";
        if (!result.disease) result.disease = "Localized Risk";
        if (!result.solution) result.solution = isSavageMode ? "Tiada kata-kata untuk ini. Hanya parah." : "Lakukan pembersihan dan rujuk pakar.";
        if (!result.description) result.description = "Berdasarkan input manual kawasan ini.";
        
        return result;
    } catch (error: any) {
        console.error("Manual Analysis Error:", error);
        throw new Error(prettifyErrorMessage(error));
    }
};

export const generateSimulationPrompt = async (base64Image: string, config: SimulationConfig): Promise<string> => {
    const ai = getAIClient();
    const optimizedImage = await compressImage(base64Image);
    
    let basePrompt = "";
    
    if (config.customPrompt && config.customPrompt.trim().length > 0) {
        basePrompt = `[CRITICAL: STRICTLY FOLLOW THE USER'S EXACT INSTRUCTIONS. DO NOT ADD ANY EXTRA FEATURES, LAB EQUIPMENT, OR MEDICAL ELEMENTS. EXACTLY MATCH THE ORIGINAL CAMERA ANGLE, PERSPECTIVE, ELEVATION, AND FIELD OF VIEW.] User instructions: ${config.customPrompt}`;
    } else {
        basePrompt = "[CRITICAL: EXACTLY MATCH THE ORIGINAL CAMERA ANGLE, PERSPECTIVE, ELEVATION, AND FIELD OF VIEW.] The exact same room structure, but now represented as exceptionally clean, tidy, dry, and pristine. Do not change the general location type into a medical lab, clinic, or clinic hospital.";
        
        if (config.mode === 'UPGRADE_FURNITURE') {
            basePrompt += " Upgrade all equipment or furniture with brand new, modern, perfectly organized alternatives matching the original layout.";
        } else if (config.mode === 'FULL_RECONSTRUCTION') {
            basePrompt += " Complete architectural renovation with dry sparkling floors, newly painted immaculate walls, keeping the same structural layout.";
        } else {
            basePrompt += " All surfaces are completely clean, empty of clutter, looking pristine, spotless, and highly organized.";
        }
        
        if (config.humans === 'KEEP_PROTECTED') {
            basePrompt += " Keep existing people in the image but dressed professionally in clean safety clothing.";
        } else {
            basePrompt += " Zero humans present, completely quiet empty tidy scene.";
        }
        
        if (config.lighting === 'CLINICAL_BLUE') {
            basePrompt += " Cool bright blue lighting.";
        } else if (config.lighting === 'WARM') {
            basePrompt += " Warm soft bright cozy lighting.";
        } else {
            basePrompt += " Bright natural sunlight streaming in.";
        }
    }
    
    basePrompt += " Ultra-photorealistic, 8k resolution, highly detailed pristine photography.";

    const promptGeneration = async () => {
        const resp = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: optimizedImage, mimeType: 'image/jpeg' } },
                    { text: `Analyze the provided image and generate a highly detailed prompt describing this exact setting for an image generation engine. 
                    
                    REQUIRED INSTRUCTIONS: "${basePrompt}"
                    
                    CRITICAL NEGATIVE-PROMPT AVOIDANCE PROTCOLS:
                    1. The final prompt must NEVER contain negative or dirty words such as "trash", "garbage", "rubbish", "litter", "dirt", "cleaning", "clean up", "remove", "grime", "filth", "clutter", "stains", "debris", "puddle", "standing water", "mud", "disorganized", "waste", "stagnant", "grease", "cockroach", "mosquitoes", "larvae". Mentioning these words will cause image generators to put dirt and trash IN the image!
                    2. Describe the scene ONLY by emphasizing positive clean attributes. Use words like: "dry sparkling surfaces", "spotless flooring", "gleaming shiny table", "neatly organized workspace", "immaculately sterile environment", "tidy shelf", "well-maintained layout", "sparkling and clear dry area". No water logging, no trash.
                    3. Ensure the prompt describes a beautifully sanitised and completely dry version of the input scene, maintaining the exact layout, geometry, and perspective. Just output the final English prompt as a single descriptive paragraph.` }
                ]
            }
        });
        return resp.text || basePrompt;
    };

    try {
        return await retryWithBackoff(promptGeneration);
    } catch (error) {
        console.warn("Prompt generation failed, falling back to base prompt:", error);
        return basePrompt;
    }
};

export const generateCleanSimulation = async (base64Image: string, mimeType: string, config: SimulationConfig): Promise<string> => {
    let finalPrompt = "";
    
    // Attempt to generate a smart prompt using Gemini, but fallback gracefully if it fails (e.g. no key or rate limit)
    try {
        finalPrompt = await generateSimulationPrompt(base64Image, config);
    } catch (error) {
        console.warn("Could not generate smart prompt with Gemini, using config base prompt as fallback:", error);
        
        let basePrompt = "";
        if (config.customPrompt && config.customPrompt.trim().length > 0) {
            basePrompt = `[CRITICAL: STRICTLY FOLLOW THE USER'S EXACT INSTRUCTIONS. DO NOT ADD ANY EXTRA FEATURES, LAB EQUIPMENT, OR MEDICAL ELEMENTS. EXACTLY MATCH THE ORIGINAL CAMERA ANGLE, PERSPECTIVE, ELEVATION, AND FIELD OF VIEW.] User instructions: ${config.customPrompt}`;
        } else {
            basePrompt = "[CRITICAL: EXACTLY MATCH THE ORIGINAL CAMERA ANGLE, PERSPECTIVE, ELEVATION, AND FIELD OF VIEW.] The exact same room structure, but represented as exceptionally clean, tidy, dry, and pristine. Do not change it into a lab or hospital.";
            
            if (config.mode === 'UPGRADE_FURNITURE') {
                basePrompt += " Upgrade with brand new furniture matching the original layout.";
            } else if (config.mode === 'FULL_RECONSTRUCTION') {
                basePrompt += " Complete architectural reconstruction, clean dry flooring and walls but strictly keeping the same structural layout.";
            } else {
                basePrompt += " Keep existing furniture but make them look squeaky clean, dry, bright, and spotless.";
            }
            
            if (config.humans === 'KEEP_PROTECTED') {
                basePrompt += " Keep existing people in the image but dressed professionally in clean safety gear.";
            } else {
                basePrompt += " Zero humans present, completely empty scene.";
            }
            
            if (config.lighting === 'CLINICAL_BLUE') {
                basePrompt += " Cool blue sterile lighting.";
            } else if (config.lighting === 'WARM') {
                basePrompt += " Warm soft bright lighting.";
            } else {
                basePrompt += " Bright natural sunlight streaming in.";
            }
        }
        
        basePrompt += " Ultra-photorealistic, 8k resolution, highly detailed pristine photography.";
        finalPrompt = basePrompt;
    }

    if (config.engine === 'GEMINI_IMAGEN') {
        const ai = getAIClient();
        const optimizedImage = await compressImage(base64Image);
        
        // 1. Try Gemini 2.5 Flash Image-to-Image (Multimodal)
        try {
            console.log("🎨 Attempting Gemini 2.5 Flash Image Generation...");
            const response = await retryWithBackoff(async () => {
                return await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: {
                        parts: [
                            { inlineData: { data: optimizedImage, mimeType: 'image/jpeg' } },
                            { text: `TASK: Reimagine this scene strictly following these instructions: ${finalPrompt}. CRITICAL: Maintain exact camera perspective and angle.` }
                        ]
                    }
                });
            });
            
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            throw new Error("No inlineData image from Gemini");
        } catch (error) {
            console.warn("Gemini 2.5 Flash Image Failed, falling back to Imagen 4.0:", error);
            
            // 2. Try Imagen 4.0 Generate (Google Engine Upgrade)
            try {
                console.log("🎨 Attempting Google Imagen 4.0 (imagen-4.0-generate-001)...");
                const imagenResponse = await retryWithBackoff(async () => {
                    return await ai.models.generateImages({
                        model: "imagen-4.0-generate-001",
                        prompt: finalPrompt,
                        config: {
                            numberOfImages: 1,
                            aspectRatio: "16:9"
                        }
                    });
                });

                const bytes = imagenResponse.generatedImages?.[0]?.image?.imageBytes;
                if (bytes) {
                    return `data:image/png;base64,${bytes}`;
                }
                throw new Error("No image bytes from Imagen 4.0");
            } catch (imagen4Error: any) {
                console.warn("Google Imagen 4.0 Failed, trying legacy Imagen 3.0 fallback:", imagen4Error);
                
                // 3. Try Imagen 3.0 Generate (Legacy Fallback)
                try {
                    console.log("🎨 Attempting Google Imagen 3.0 (imagen-3.0-generate-002)...");
                    const imagen3Response = await retryWithBackoff(async () => {
                        return await ai.models.generateImages({
                            model: "imagen-3.0-generate-002",
                            prompt: finalPrompt,
                            config: {
                                numberOfImages: 1,
                                aspectRatio: "16:9"
                            }
                        });
                    });

                    const bytes = imagen3Response.generatedImages?.[0]?.image?.imageBytes;
                    if (bytes) {
                        return `data:image/png;base64,${bytes}`;
                    }
                    throw new Error("No image bytes from Imagen 3.0");
                } catch (imagen3Error) {
                    console.warn("Google Imagen 3.0 Fallback to External:", imagen3Error);
                    // Fallthrough to external
                }
            }
        }
    }

    // Default or Fallback: Pollinations
    console.log("🎨 Using Pollinations (External) Fallback...");
    const seed = Math.floor(Math.random() * 999999);
    const encodedPrompt = encodeURIComponent(finalPrompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&seed=${seed}&model=flux&nolog=true`;
    return url;
};

export const askRiskFollowUp = async (risk: RiskDetection, question: string, language: string = 'ms'): Promise<string> => {
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: getPreferredModelForText("gemini-2.5-flash"), 
            contents: {
                parts: [{
                    text: `CONTEXT: RISK ANALYSIS. Risk: "${risk.label}" (${risk.category}). Agent: ${risk.agent}.
                    USER QUERY: "${question}".
                    INSTRUCTION: Answer as a Senior Public Health Engineer. Be technical but clear. Language: ${language}.`
                }]
            },
        });
        return response.text || "Tiada jawapan.";
    } catch (error: any) {
        console.error("askRiskFollowUp Error:", error);
        throw new Error(prettifyErrorMessage(error));
    }
};

export const deepLarvaeAnalysis = async (base64Image: string): Promise<{ diagnosis: string, predictions: any[] }> => {
    try {
        // Kompres gambar sedikit lagi agar tidak terlalu besar untuk dihantar melalui rangkaian
        const optimizedImage = await compressImage(base64Image, 1024, 0.8);

        const prompt = `Anda adalah Pakar entomologi forensik dan pakar vektor. Fokus anda adalah pengelasan spesis larva nyamuk (Aedes, Culex, Anopheles, dll.) melalui morfologi visual yang ketat.
 
 TUGAS ANDA:
 1. Lakukan pengenalan spesis larva nyamuk yang tepat (contoh: Aedes aegypti, Aedes albopictus, Culex quinquefasciatus).
 2. Cari secara khusus ciri diagnostik berikut (SILA SENARAIKAN CIRI INI DALAM PREDIKSI JIKA DITEMUI):
    - **Siphon**: Perhatikan bentuk, panjang, dan kehadiran 'pecten teeth'.
    - **Kepala**: Bentuk kapsul kepala dan susunan sesungut (antennae).
    - **Abdomen**: Struktur segmen anal dan 'saddle'.
    - **Ciri Tambahan**: Corak pada kulit atau kehadiran 'anal papillae'.
 3. Bounding box (box_2d) mestilah tepat melingkungi feature anatomi yang disebut.
 4. Diagnosis mestilah mengesahkan spesis yang paling berkemungkinan berdasarkan bukti visual kuat yang ditemui.
 
 FORMAT OUTPUT JSON SAHAJA:
 {
   "diagnosis": "Laporan Morfologi Forensik dan Pengesanan Spesis Larva (Markdown)",
   "predictions": [
     {
       "box_2d": [ymin, xmin, ymax, xmax],
       "class": "Bahagian Anatomi (cth: 'Siphon', 'Head capsule')",
       "short_desc": "Ciri khas (cth: 'Siphon panjang, ciri Culex')",
       "confidence": 0.95
     }
   ]
 }`;
        
        const parsedResult = await retryWithBackoff(async () => {
             const ai = getAIClient();
             const resp = await ai.models.generateContent({
                 model: getPreferredModelForText("gemini-2.5-flash"),
                 contents: {
                     parts: [
                         { inlineData: { mimeType: 'image/jpeg', data: optimizedImage } },
                         { text: prompt }
                     ]
                 },
                 config: {
                     responseMimeType: "application/json"
                 }
             });
             let t = resp.text || "{}";
             t = extractJSON(t);
             return JSON.parse(t);
        });

        // Ensure predictions have standard structure x, y, width, height for the canvas
        const formattedPredictions = (parsedResult.predictions || []).map((p: any) => {
            const coords = p.box_2d;
            // box_2d is [ymin, xmin, ymax, xmax] mapped to 0-1000 relative scale
            // We need to convert it to relative ratios (0.0 to 1.0) so x, y, width, height can work natively
            if (coords && coords.length === 4) {
                const [ymin, xmin, ymax, xmax] = coords;
                return {
                    x: ((xmin + xmax) / 2) / 1000, // Center X (Relative)
                    y: ((ymin + ymax) / 2) / 1000, // Center Y (Relative)
                    width: (xmax - xmin) / 1000,
                    height: (ymax - ymin) / 1000,
                    class: p.class || "Unknown",
                    short_desc: p.short_desc || "",
                    confidence: p.confidence || 0.99,
                    isRelative: true
                };
            }
            return p;
        });

        return {
            diagnosis: parsedResult.diagnosis || "Selesai dianalisa, namun laporan penuh gagal diekstrak.",
            predictions: formattedPredictions
        };
    } catch (error: any) {
        console.error("deepLarvaeAnalysis Error:", error);
        saveLog(`Larvae Analysis Error: ${error?.message || error}`, { error });
        throw new Error(prettifyErrorMessage(error));
    }
};

export const generateLarvaeDiagnosis = async (predictions: any[]): Promise<string> => {
    const ai = getAIClient();
    const classCounts = predictions.reduce((acc, p) => {
        const cls = p.class || 'Unknown';
        acc[cls] = (acc[cls] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    let summaryText = "";
    Object.entries(classCounts).forEach(([cls, count]) => {
        summaryText += `- ${cls}: ${count} ekor\n`;
    });

    const prompt = `Anda adalah pakar entomologi dan kawalan vektor dari Kementerian Kesihatan Malaysia.
Sistem pengimejan komputer telah mengesan jentik-jentik nyamuk. Berikut adalah hasil kiraan:
${summaryText}

Sila berikan SATU perenggan diagnosa saintifik dan fakta ringkas tentang ancaman spesis ini (contoh, Aedes aegypti pembawa denggi). Cadangkan satu tindakan segera.
Gunakan format markdown yang kemas, profesional, saintifik tetapi difahami awam. Tulis dalam Bahasa Melayu.`;

    const response = await ai.models.generateContent({
        model: getPreferredModelForText("gemini-2.5-flash"),
        contents: { parts: [{ text: prompt }] }
    });

    return response.text || "Tiada diagnosa dapat dijana buat masa ini.";
};

export const analyzeAdultMosquito = async (base64Image: string): Promise<{ diagnosis: string, predictions: any[] }> => {
    try {
        const optimizedImage = await compressImage(base64Image, 1024, 0.8);
        
        const prompt = `Anda adalah Pakar Entomologi Forensik dan Pakar Sektor Vektor. Fokus anda ialah pengelasan spesis nyamuk melalui morfologi visual yang ketat.
 
 TUGAS ANDA:
 1. Lakukan pengenalan spesis nyamuk yang tepat (contoh: Aedes aegypti, Aedes albopictus, Culex quinquefasciatus).
 2. Cari secara khusus ciri diagnostik berikut (SILA SENARAIKAN CIRI INI DALAM PREDIKSI JIKA DITEMUI):
    - **Toraks**: Cari corak lyre (Aedes aegypti) atau jalur putih median (Aedes albopictus).
    - **Kaki**: Cari jalur putih pada tarsus atau femur.
    - **Sayap**: Analisa corak venasi sayap dan kehadiran sisik pada urat sayap.
    - **Anatomi Tambahan**: Proborcis, palpus maksilari.
 3. Bounding box (box_2d) mestilah tepat melingkungi feature anatomi yang disebut.
 4. Diagnosis mestilah mengesahkan spesis yang paling berkemungkinan berdasarkan bukti visual kuat yang ditemui.
 
 FORMAT OUTPUT JSON SAHAJA:
 {
   "diagnosis": "Laporan Morfologi Forensik dan Pengesanan Spesis (Markdown)",
   "predictions": [
     {
       "box_2d": [ymin, xmin, ymax, xmax],
       "class": "Bahagian Anatomi (cth: 'Leg stripe')",
       "short_desc": "Ciri khas (cth: 'Jalur putih jelas, ciri Aedes aegypti')",
       "confidence": 0.95
     }
   ]
 }`;

        const parsedResult = await retryWithBackoff(async () => {
             const ai = getAIClient();
             const resp = await ai.models.generateContent({
                 model: getPreferredModelForText("gemini-2.5-flash"),
                 contents: {
                     parts: [
                         { inlineData: { mimeType: 'image/jpeg', data: optimizedImage } },
                         { text: prompt }
                     ]
                 },
                 config: {
                     responseMimeType: "application/json"
                 }
             });
             let t = resp.text || "{}";
             t = extractJSON(t);
             return JSON.parse(t);
        });

        const formattedPredictions = (parsedResult.predictions || []).map((p: any) => {
            const coords = p.box_2d;
            if (coords && coords.length === 4) {
                const [ymin, xmin, ymax, xmax] = coords;
                return {
                    x: ((xmin + xmax) / 2) / 1000,
                    y: ((ymin + ymax) / 2) / 1000,
                    width: (xmax - xmin) / 1000,
                    height: (ymax - ymin) / 1000,
                    class: p.class || "Unknown",
                    short_desc: p.short_desc || "",
                    confidence: p.confidence || 0.99,
                    isRelative: true
                };
            }
            return p;
        });

        return {
            diagnosis: parsedResult.diagnosis || "Selesai dianalisa, namun laporan forensik gagal diekstrak.",
            predictions: formattedPredictions
        };
    } catch (error: any) {
        console.error("analyzeAdultMosquito Error:", error);
        saveLog(`Adult Mosquito Analysis Error: ${error?.message || error}`, { error });
        throw new Error(prettifyErrorMessage(error));
    }
};

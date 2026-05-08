import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResponse, RiskDetection, BoundingBox, SensitivityLevel, AnalysisMode, iDengueData, RegionalDengueData } from "../types";

export interface SimulationConfig {
  mode: 'SANITIZE_ONLY' | 'UPGRADE_FURNITURE' | 'FULL_RECONSTRUCTION';
  humans: 'KEEP_PROTECTED' | 'REMOVE';
  lighting: 'NATURAL' | 'CLINICAL_BLUE' | 'WARM';
  engine: 'GEMINI_IMAGEN' | 'POLLINATIONS'; 
  customPrompt?: string;
}

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
};

const extractJSON = (text: string): string => {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (match) {
    return match[0].replace(/```json/g, '').replace(/```/g, '').trim();
  }
  return "{}";
};

// FALLBACK DATA (UNCHANGED)
const FALLBACK_IDENGUE_DATA: iDengueData = {
    epidemiologicalWeek: "ME 08/2025 (Anggaran)",
    cumulativeCases: 28500,
    cumulativeDeaths: 18,
    activeHotspots: 142,
    topState: "Selangor",
    lastUpdated: new Date().toLocaleDateString(),
    sources: [{ title: "iDengue Backup Data", url: "https://idengue.mysa.gov.my" }]
};

const FALLBACK_REGIONAL_DATA: RegionalDengueData = {
    stateName: "Pahang",
    districtName: "Temerloh",
    stateCases: 1250,
    districtCases: 85,
    districtHotspots: 3,
    districtRiskLevel: "HIGH",
    localAdvice: "Aktiviti gotong-royong disyorkan segera. Sila periksa bekas air bertakung.",
    epidemiologicalWeek: "ME 08/2025"
};

export const fetchLatestIDengueStats = async (): Promise<iDengueData> => {
  try {
      const ai = getAIClient();
      const prompt = `EKSTRAK DATA RASMI DENGGI MALAYSIA. 
      Rujuk portal idengue.mysa.gov.my atau berita terkini KKM.
      Dapatkan data bagi MINGGU EPIDEMIOLOGI (ME) TERKINI 2024/2025.
      Output JSON Structure: { "cumulativeCases": number, "cumulativeDeaths": number, "activeHotspots": number, "topState": string, "epidemiologicalWeek": string }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', 
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cumulativeCases: { type: Type.NUMBER },
              cumulativeDeaths: { type: Type.NUMBER },
              activeHotspots: { type: Type.NUMBER },
              topState: { type: Type.STRING },
              lastUpdated: { type: Type.STRING },
              epidemiologicalWeek: { type: Type.STRING }
            },
            required: ["cumulativeCases", "cumulativeDeaths", "activeHotspots", "topState", "epidemiologicalWeek"]
          }
        }
      });
      let text = response.text || "{}";
      text = extractJSON(text);
      const data = JSON.parse(text);
      if (!data.cumulativeCases) throw new Error("Empty Data");
      return { ...data, sources: [{ title: "iDengue MYSA Official", url: "https://idengue.mysa.gov.my/" }] };
  } catch (error) {
      return FALLBACK_IDENGUE_DATA;
  }
};

export const fetchRegionalDengueStats = async (state: string, district: string): Promise<RegionalDengueData> => {
    try {
        const ai = getAIClient();
        const prompt = `Cari statistik denggi untuk Negeri: ${state}, Daerah: ${district}. Rujuk idengue.mysa.gov.my. Output JSON: { "stateName": "${state}", "districtName": "${district}", "stateCases": number, "districtCases": number, "districtHotspots": number, "districtRiskLevel": "LOW"|"MEDIUM"|"HIGH"|"EXTREME", "localAdvice": string, "epidemiologicalWeek": string }`;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                stateName: { type: Type.STRING },
                districtName: { type: Type.STRING },
                stateCases: { type: Type.NUMBER },
                districtCases: { type: Type.NUMBER },
                districtHotspots: { type: Type.NUMBER },
                districtRiskLevel: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "EXTREME"] },
                localAdvice: { type: Type.STRING },
                epidemiologicalWeek: { type: Type.STRING }
              },
              required: ["stateName", "districtName", "stateCases", "districtCases", "districtHotspots", "districtRiskLevel", "epidemiologicalWeek"]
            }
          }
        });
        let text = response.text || "{}";
        text = extractJSON(text);
        const data = JSON.parse(text);
        if (!data.stateCases) throw new Error("Empty Regional Data");
        return data;
    } catch (error) {
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

const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = 2, delay = 2000): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        const msg = error.message || "";
        const isQuotaError = msg.includes("429") || msg.includes("503") || msg.includes("overloaded");
        if (isQuotaError && retries > 0) {
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
  
  // Use Pro model for higher spatial intelligence
  const modelId = "gemini-3.1-pro-preview";

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
        thinkingBudget = 32000;
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
        - hygieneLevel: INTEGER (1-5)
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
        
        - detected_keywords: string[]
        - hygieneLevel: INTEGER (1-5)
        - safetyLevel: INTEGER (1-5)
        - generalAdvice: string (Technical Summary in ${targetLang})
        - savageCommentary: string (Direct, Harsh Critique in ${targetLang})
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
      const response = await retryWithBackoff(async () => {
          const ai = getAIClient();
          return await ai.models.generateContent({
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
      });

      let text = response.text || "{}";
      text = extractJSON(text);
      const parsedResult = JSON.parse(text) as AnalysisResponse;

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
      });

      parsedResult.sensitivityUsed = sensitivity;
      parsedResult.mode = analysisMode; 
      return parsedResult;

  } catch (error: any) {
      console.error("Analysis Error:", error);
      throw new Error("Sistem Bio-Analisis sibuk. Sila cuba sebentar lagi.");
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
    
    const response = await retryWithBackoff(async () => {
        const ai = getAIClient();
        return await ai.models.generateContent({
            // Using Pro model for higher spatial intelligence and coordinate handling
            model: "gemini-3.1-pro-preview", 
            contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: optimizedImage } }, { text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
    });
    const text = extractJSON(response.text || "{}");
    const result = JSON.parse(text);
    result.id = `manual-${Date.now()}`;
    result.box_2d = box; 
    
    if (!result.category) result.category = 'HYGIENE';
    if (!result.microbiology) result.microbiology = "Targeted Analysis";
    if (!result.disease) result.disease = "Localized Risk";
    if (!result.solution) result.solution = isSavageMode ? "Tiada kata-kata untuk ini. Hanya parah." : "Lakukan pembersihan dan rujuk pakar.";
    if (!result.description) result.description = "Berdasarkan input manual kawasan ini.";
    
    return result;
};

export const generateCleanSimulation = async (base64Image: string, mimeType: string, config: SimulationConfig): Promise<string> => {
    const ai = getAIClient();
    const optimizedImage = await compressImage(base64Image);
    
    // STEP 1: Generate a text-based prompt using gemini-2.5-flash
    let basePrompt = "Sterile high-tech modern clean room, highly professional medical lab, ultra-safe environment, spotless clean.";
    if (config.mode === 'UPGRADE_FURNITURE') {
        basePrompt += " Features brand new stainless steel tables, ergonomic lab chairs, advanced sealed cabinets.";
    } else if (config.mode === 'FULL_RECONSTRUCTION') {
        basePrompt += " Complete architectural reconstruction, futuristic modular lab walls, epoxy seamless flooring, negative pressure HVAC vents overhead.";
    }
    
    if (config.humans === 'KEEP_PROTECTED') {
        basePrompt += " Includes professional staff wearing full Level A biohazard PPE suits, conducting inspections safely.";
    } else {
        basePrompt += " Zero humans present, completely empty and sterile to prevent contamination.";
    }
    
    if (config.lighting === 'CLINICAL_BLUE') {
        basePrompt += " Clinical cool blue and bright white LED overhead lighting, sharp clinical shadows.";
    } else if (config.lighting === 'WARM') {
        basePrompt += " Warm soft incandescent glow, welcoming and safe hospital recovery room lighting.";
    } else {
        basePrompt += " Natural sunlight streaming through large sealed windows, bright and airy feel.";
    }
    if (config.customPrompt) {
        basePrompt += ` SPECIFIC INSTRUCTIONS: ${config.customPrompt}`;
    }
    basePrompt += " Ultra-photorealistic, 8k resolution, highly detailed, professional cinematography.";

    // Logic Refinement: Primary -> Multi-modal Gemini 2.5 Flash, Fallback -> Imagen 3, Fallback -> External
    const promptGeneration = async () => {
        const resp = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: optimizedImage, mimeType: 'image/jpeg' } },
                    { text: `Based on this room image, generate a highly detailed image generation prompt for a clean, sterile version of it. Include layout details from the original. Requirements: ${basePrompt}` }
                ]
            }
        });
        return resp.text || basePrompt;
    };

    const finalPrompt = await retryWithBackoff(promptGeneration);

    if (config.engine === 'GEMINI_IMAGEN') {
        // 1. Try Gemini 2.5 Flash Image-to-Image (Multimodal)
        try {
            console.log("🎨 Attempting Gemini 2.5 Flash Image Generation...");
            const response = await retryWithBackoff(async () => {
                return await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: {
                        parts: [
                            { inlineData: { data: optimizedImage, mimeType: 'image/jpeg' } },
                            { text: `TASK: Reimagine this room as a ${finalPrompt}. Keep layout but remove all dirt.` }
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
            console.warn("Gemini 2.5 Flash Image Failed, falling back to Imagen 3.0:", error);
            
            // 2. Try Imagen 3.0 Generate (Google Engine Fallback)
            try {
                console.log("🎨 Attempting Google Imagen 3.0...");
                const imagenResponse = await retryWithBackoff(async () => {
                    return await ai.models.generateImages({
                        model: "imagen-3.0-generate-001",
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
                throw new Error("No image bytes from Imagen 3.0");
            } catch (imagenError) {
                console.error("Google Imagen 3.0 Failed:", imagenError);
                // Fallthrough to external
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
    const ai = getAIClient();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", 
        contents: `CONTEXT: RISK ANALYSIS. Risk: "${risk.label}" (${risk.category}). Agent: ${risk.agent}.
        USER QUERY: "${question}".
        INSTRUCTION: Answer as a Senior Public Health Engineer. Be technical but clear. Language: ${language}.`,
    });
    return response.text || "Tiada jawapan.";
};

export const deepLarvaeAnalysis = async (base64Image: string): Promise<{ diagnosis: string, predictions: any[] }> => {
    const ai = getAIClient();
    // Kompres gambar sedikit lagi agar tidak terlalu besar untuk dihantar melalui rangkaian
    const optimizedImage = await compressImage(base64Image, 1024, 0.8);
    
    const prompt = `Anda adalah sistem entomologi forensik pakar dan kawalan vektor (Tahap 5).
Pengguna memuat naik imej jejentik (mosquito larvae).

TUGAS ANDA:
1. Analisa imej ini secara forensik dan mendalam. Fokus kepada profil MORFOLOGI DAN ANATOMI jejentik.
2. Kesan bahagian-bahagian anatomi utama jejentik (contoh: Siphon/Corong pernafasan, Thorax, Kepala, Bulu/Setae, Anal Papillae, Segmen Abdomen).
3. Bagi SETIAP bahagian anatomi yang jelas kelihatan, berikan koordinat kotak perlindungan (box_2d) dalam grid skala 0 hingga 1000 ([ymin, xmin, ymax, xmax]).
4. Sediakan diagnosis saintifik yang komprehensif merangkumi kesimpulan spesis (Aedes, Culex, Anopheles, dll) berdasarkan bukti morfologi anatomi tersebut.

FORMAT OUTPUT MESTILAH JSON SAHAJA:
{
  "diagnosis": "Laporan Saintifik Penuh (Markdown) mengenal pasti spesis",
  "predictions": [
    {
      "box_2d": [ymin, xmin, ymax, xmax],
      "class": "Bahagian (cth: 'Siphon')",
      "short_desc": "Penerangan ringkas (cth: 'Pendek & gelap, khas Aedes')",
      "confidence": 0.90
    }
  ]
}`;

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
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

    let text = response.text || "{}";
    text = extractJSON(text);
    const parsedResult = JSON.parse(text);

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
        model: "gemini-3-flash-preview",
        contents: prompt
    });

    return response.text || "Tiada diagnosa dapat dijana buat masa ini.";
};

export const analyzeAdultMosquito = async (base64Image: string): Promise<{ diagnosis: string, predictions: any[] }> => {
    const ai = getAIClient();
    const optimizedImage = await compressImage(base64Image, 1024, 0.8);
    
    const prompt = `Anda adalah saintis forensik pakar dalam morfologi dan anatomi nyamuk dewasa. Anda mempunyai kepakaran peringkat 5 dalam pengelasan nyamuk (Aedes, Culex, Anopheles, dll).

TUGAS ANDA:
1. Analisa imej nyamuk dewasa ini secara forensik dan mendalam.
2. Fokus kepada ciri morfologi utama:
   - Corak sisik pada toraks/abdomen.
   - Struktur kaki (jalur putih/gelap).
   - Bentuk sayap dan venasi sayap.
   - Proborcis dan palpus.
3. Kesan bahagian-bahagian anatomi ini dan berikan kotak bounding (box_2d) dalam grid skala 0-1000.
4. Berikan diagnosa forensik saintifik yang merangkumi pengenalan spesis nyamuk tersebut.

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

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
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

    let text = response.text || "{}";
    text = extractJSON(text);
    const parsedResult = JSON.parse(text);

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
};

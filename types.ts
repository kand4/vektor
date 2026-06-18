
export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export type RiskCategory = 'VECTOR' | 'HYGIENE' | 'SAFETY';
export type SensitivityLevel = 'STANDARD' | 'HIGH' | 'EXTREME';
export type AnalysisMode = 'VECTOR_CONTROL' | 'KKM_FOOD_STANDARD';

export interface Citation {
  id: number;
  source: string;
  title: string;
  url: string;
}

export interface RiskDetection {
  id: string;
  category: RiskCategory; 
  label: string; 
  agent: string; 
  disease: string; 
  microbiology: string;
  statistics: string;
  description: string;
  solution: string; 
  savageCommentary?: string;
  box_2d: BoundingBox;
  citations: Citation[];
  microscopeVideoUrl?: string;
  confidence: number;
}

export interface KKMSectionResult {
  code: string;
  title: string;
  totalPoints: number;
  demeritReceived: number;
  violations: string[];
}

export interface KKMReport {
  grade: 'A' | 'B' | 'C' | 'D' | 'F' | 'TUTUP';
  totalScore: number;
  totalDemerit: number;
  sections: KKMSectionResult[];
  summary: string;
  recommendation: string;
}

export interface iDengueData {
  cumulativeCases: number;
  cumulativeDeaths: number;
  activeHotspots: number;
  topState: string;
  lastUpdated: string;
  epidemiologicalWeek?: string;
  sources: { title: string; url: string }[];
  isSimulated?: boolean;
}

export interface RegionalDengueData {
  stateName: string;
  districtName: string;
  stateCases: number;
  districtCases: number;
  districtHotspots: number;
  districtRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  localAdvice: string;
  epidemiologicalWeek?: string;
  isSimulated?: boolean;
}

export interface EpidemicTrend {
  weeks: string[];
  cases: number[];
  trend: 'RISING' | 'FALLING' | 'STABLE';
  totalCasesLastWeek: number;
}

export interface AnalysisResponse {
  risks: RiskDetection[];
  generalAdvice: string;
  savageCommentary?: string;
  groundingChunks?: GroundingChunk[];
  hygieneLevel: number;
  safetyLevel: number;
  timestamp?: number;
  sensitivityUsed?: SensitivityLevel;
  predictedOutbreakChance?: number;
  legalSection?: string;
  kkmReport?: KKMReport;
  mode?: AnalysisMode;
  isSimulated?: boolean;
  iDengueIntel?: iDengueData;
  regionalIntel?: RegionalDengueData;
  detected_keywords?: string[]; // New field for logic watchdog
}

export interface AnalysisSession {
  id: string;
  imageSrc: string;
  mimeType: string;
  fileName: string;
  status: 'PENDING' | 'ANALYZING' | 'SUCCESS' | 'ERROR';
  result?: AnalysisResponse;
  error?: string;
  simulationImage?: string;
  mode?: AnalysisMode;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface OutbreakAlert {
  id: string;
  disease: string;
  location: string;
  region: 'ASIA' | 'AFRICA' | 'AMERICAS' | 'EUROPE' | 'OCEANIA';
  coordinates: { x: number; y: number };
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'WATCH';
  cases: string;
  source: 'WHO' | 'CDC' | 'MOH' | 'PROMED' | 'PAHO/WHO' | 'ECDC';
  description: string;
  vector: string;
}

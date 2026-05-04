const fs = require('fs');
const content = fs.readFileSync('constants/translations.ts', 'utf8');

const newMs = `
    log_initializing: "GEMINI 3.0 PRO: MEMASUKKAN DATA...",
    log_deep_thinking: "PENAKULAN MENDALAM: MENGANALISIS 32K TOKEN...",
    log_grid_search: "PENCARIAN GRID: MEMBURU KOTORAN & SISA...",
    log_law_ref: "RUJUKAN UNDANG-UNDANG: AKTA MAKANAN 1983...",
    log_calculating: "MENGIRA SKOR DEMERIT...",
    log_finalizing: "MENYIAPKAN LAPORAN FINAL...",
    log_clutter: "PENGESANAN SELERAK: MENCARI SARANG TERSEMBUNYI...",
    log_vector: "JEJAK VEKTOR: TIKUS, LALAT, NYAMUK...",
    log_pathogen: "PADANAN PATOGEN: CARIAN PANGKALAN DATA...",
    log_generating: "MENJANA LAPORAN FORENSIK...",
    map_latency: "LATENSI: SIMULASI MASA-NYATA"`;

const newEn = `
    log_initializing: "GEMINI 3.0 PRO: INITIALIZING...",
    log_deep_thinking: "DEEP THINKING: ANALYZING 32K TOKENS...",
    log_grid_search: "GRID SEARCH: HUNTING FOR STAINS & RESIDUE...",
    log_law_ref: "LAW REFERENCE: FOOD ACT 1983...",
    log_calculating: "CALCULATING DEMERIT SCORE...",
    log_finalizing: "FINALIZING REPORT...",
    log_clutter: "CLUTTER DETECTION: SEEKING HIDDEN NESTS...",
    log_vector: "VECTOR TRACING: RATS, FLIES, MOSQUITOES...",
    log_pathogen: "PATHOGEN MATCHING: DATABASE LOOKUP...",
    log_generating: "GENERATING FORENSIC REPORT...",
    map_latency: "LATENCY: REAL-TIME SIM"`;

const newZh = `
    log_initializing: "GEMINI 3.0 PRO：正在初始化...",
    log_deep_thinking: "深度思考：正在分析 32K 令牌...",
    log_grid_search: "网格搜索：正在寻找污渍和残留物...",
    log_law_ref: "法律参考：1983 年食品法...",
    log_calculating: "正在计算扣分...",
    log_finalizing: "正在完成报告...",
    log_clutter: "杂物检测：正在寻找隐藏的巢穴...",
    log_vector: "病媒追踪：老鼠、苍蝇、蚊子...",
    log_pathogen: "病原体匹配：数据库查询...",
    log_generating: "正在生成法医报告...",
    map_latency: "延迟：实时仿真"`;

const newTa = `
    log_initializing: "ஜெமினி 3.0 ப்ரோ: தொடங்குகிறது...",
    log_deep_thinking: "ஆழ்ந்த சிந்தனை: 32K டோக்கன்களை பகுப்பாய்வு செய்கிறது...",
    log_grid_search: "கிரிட் தேடல்: கறைகள் மற்றும் எச்சங்களைத் தேடுகிறது...",
    log_law_ref: "சட்டக் குறிப்பு: உணவுச் சட்டம் 1983...",
    log_calculating: "குறைபாடு மதிப்பெண்ணைக் கணக்கிடுகிறது...",
    log_finalizing: "அறிக்கையை முடிக்கிறது...",
    log_clutter: "குழப்பத்தைக் கண்டறிதல்: மறைக்கப்பட்ட கூடுகளைத் தேடுகிறது...",
    log_vector: "வெக்டர் ட்ரேசிங்: எலிகள், ஈக்கள், கொசுக்கள்...",
    log_pathogen: "நோய்க்கிருமி பொருத்தம்: தரவுத்தள தேடல்...",
    log_generating: "தடயவியல் அறிக்கையை உருவாக்குகிறது...",
    map_latency: "தாமதம்: நிகழ்நேர உருவகப்படுத்துதல்"`;

const parts = content.split('},');

let ms = parts[0] + ',' + newMs;
let en = parts[1] + ',' + newEn;
let zh = parts[2] + ',' + newZh;
let ta = parts[3].replace(/}\\n};/s, '').replace(/}\\s*};/s, '').replace(/};/s, '').trim();
if (ta.endsWith('}')) ta = ta.slice(0, -1);

let finalTa = ta + ',' + newTa + '}\n};';

fs.writeFileSync('constants/translations.ts', ms + '},' + en + '},' + zh + '},' + finalTa);
console.log("Success");

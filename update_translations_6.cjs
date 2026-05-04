const fs = require('fs');
const content = fs.readFileSync('constants/translations.ts', 'utf8');

const newMs = `
    manual_label: "MANUAL",
    opt_sanitize: "🧹 SANITASI",
    opt_upgrade: "🛋️ NAIK TARAF PERABOT",
    opt_recon: "🏗️ REKONSTRUKSI PENUH",
    opt_keep_ppe: "👥 KEKAL (Guna PPE)",
    opt_remove_humans: "🚫 KELUARKAN MANUSIA",
    label_atmosphere: "ATMOSFERA / PENCAHAYAAN",
    label_ai_engine: "PENJANA ENJIN AI",
    sim_prompt_placeholder: "e.g. Pastikan meja bersih sepenuhnya...",
    manual_placeholder: "e.g. Lihat pada tompok gelap itu...",
    scanning_wait: "MENGIMBAS...",
    btn_analyze: "ANALISIS",
    label_targeting: "SASARAN",
    no_risk_desc: "Premis kelihatan bersih dalam gambar ini. Walau bagaimanapun, sila gunakan 'Manual Scan' jika anda melihat sesuatu yang terlepas pandang.",
    hidden_risk_desc: "Markah kebersihan rendah dikesan, tetapi AI tidak dapat menanda objek khusus. Sila gunakan Manual Scan.",
    chat_you: "ANDA: ",
    chat_ai: "AI: "`;

const newEn = `
    manual_label: "MANUAL",
    opt_sanitize: "🧹 SANITIZE",
    opt_upgrade: "🛋️ UPGRADE FURNITURE",
    opt_recon: "🏗️ FULL RECONSTRUCTION",
    opt_keep_ppe: "👥 KEEP (PPE Gear)",
    opt_remove_humans: "🚫 REMOVE HUMANS",
    label_atmosphere: "ATMOSPHERE / LIGHTING",
    label_ai_engine: "AI ENGINE GENERATOR",
    sim_prompt_placeholder: "e.g. Ensure table is fully cleaned...",
    manual_placeholder: "e.g. Look at the dark spot...",
    scanning_wait: "SCANNING...",
    btn_analyze: "ANALYZE",
    label_targeting: "TARGETING",
    no_risk_desc: "The premises look clean in this image. However, please use 'Manual Scan' if you spot something overlooked.",
    hidden_risk_desc: "Low hygiene score detected, but AI could not mark a specific object. Use Manual Scan to mark dirty areas.",
    chat_you: "YOU: ",
    chat_ai: "AI: "`;

const newZh = `
    manual_label: "手动",
    opt_sanitize: "🧹 消毒",
    opt_upgrade: "🛋️ 升级家具",
    opt_recon: "🏗️ 全面重建",
    opt_keep_ppe: "👥 保留（佩戴防护装备）",
    opt_remove_humans: "🚫 移除人员",
    label_atmosphere: "氛围 / 照明",
    label_ai_engine: "AI 引擎生成器",
    sim_prompt_placeholder: "例如：确保桌子完全清洁...",
    manual_placeholder: "例如：看那个黑点...",
    scanning_wait: "扫描中...",
    btn_analyze: "分析",
    label_targeting: "瞄准中",
    no_risk_desc: "图片显示场所很干净。但如果您发现被忽略的地方，请使用“手动扫描”。",
    hidden_risk_desc: "检测到卫生评分较低，但 AI 无法标记具体物体。请使用手动扫描标记脏污区域。",
    chat_you: "您: ",
    chat_ai: "AI: "`;

const newTa = `
    manual_label: "கைமுறை",
    opt_sanitize: "🧹 சுத்திகரிப்பு",
    opt_upgrade: "🛋️ மரச்சாமான்களை மேம்படுத்து",
    opt_recon: "🏗️ முழு மறுசீரமைப்பு",
    opt_keep_ppe: "👥 வைத்திருங்கள் (PPE கவசம்)",
    opt_remove_humans: "🚫 மனிதர்களை அகற்று",
    label_atmosphere: "வளிமண்டலம் / விளக்கு",
    label_ai_engine: "AI இன்ஜின் ஜெனரேட்டர்",
    sim_prompt_placeholder: "உதாரணமாக: மேசை முழுமையாக சுத்தமாக இருப்பதை உறுதி செய்யவும்...",
    manual_placeholder: "உதாரணமாக: அந்த கருப்பு புள்ளியை பாருங்கள்...",
    scanning_wait: "ஸ்கேன் செய்கிறது...",
    btn_analyze: "பகுப்பாய்வு",
    label_targeting: "இலக்கு",
    no_risk_desc: "இந்த படத்தில் வளாகம் சுத்தமாக தெரிகிறது. இருப்பினும், நீங்கள் கவனிக்காத ஒன்றை பார்த்தால் 'கைமுறை ஸ்கேன்' பயன்படுத்தவும்.",
    hidden_risk_desc: "குறைந்த சுகாதார மதிப்பெண் கண்டறியப்பட்டது, ஆனால் AI ஒரு குறிப்பிட்ட பொருளைக் குறிக்க முடியவில்லை. அழுக்கு பகுதிகளைக் குறிக்க கைமுறை ஸ்கேனைப் பயன்படுத்தவும்.",
    chat_you: "நீங்கள்: ",
    chat_ai: "AI: "`;

const parts = content.split('},');

let ms = parts[0] + ',' + newMs;
let en = parts[1] + ',' + newEn;
let zh = parts[2] + ',' + newZh;
let ta = parts[3].replace(/}\\n};/s, '') + ',' + newTa + '}\\n};';

fs.writeFileSync('constants/translations.ts', ms + '},' + en + '},' + zh + '},' + ta);
console.log("Success");

const fs = require('fs');
const content = fs.readFileSync('constants/translations.ts', 'utf8');

const newMs = `
    btn_safety_video: "Video Garis Panduan Keselamatan",
    btn_microscope: "Siasatan Mikroskopik AI",
    analysis_pending: "Analisis Sedang Berjalan...",
    label_stats: "STAT:",
    chat_error: "Ralat menghubungi AI.",
    savage_fallback: "Masalah besar."`;

const newEn = `
    btn_safety_video: "Safety Guidelines Video",
    btn_microscope: "AI Microscopic Investigation",
    analysis_pending: "Analysis Pending...",
    label_stats: "STATS:",
    chat_error: "Error contacting AI.",
    savage_fallback: "Disaster."`;

const newZh = `
    btn_safety_video: "安全准则视频",
    btn_microscope: "AI 显微镜调查",
    analysis_pending: "分析中...",
    label_stats: "统计：",
    chat_error: "联系 AI 出错。",
    savage_fallback: "灾难。"`;

const newTa = `
    btn_safety_video: "பாதுகாப்பு வழிகாட்டுதல்கள் வீடியோ",
    btn_microscope: "AI நுண்ணோக்கி விசாரணை",
    analysis_pending: "பகுப்பாய்வு நிலுவையில் உள்ளது...",
    label_stats: "புள்ளிவிவரங்கள்:",
    chat_error: "AI ஐத் தொடர்புகொள்வதில் பிழை.",
    savage_fallback: "பேரழிவு."`;

const parts = content.split('},');

let ms = parts[0] + ',' + newMs;
let en = parts[1] + ',' + newEn;
let zh = parts[2] + ',' + newZh;
let ta = parts[3].replace(/}\\n};/s, '') + ',' + newTa + '}\\n};';

fs.writeFileSync('constants/translations.ts', ms + '},' + en + '},' + zh + '},' + ta);
console.log("Success");

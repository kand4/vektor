const fs = require('fs');
const content = fs.readFileSync('constants/translations.ts', 'utf8');

const newMs = `
    processing_time_info: "Masa Proses: ~45-90 Saat (Logik Mendalam Aktif)"`;

const newEn = `
    processing_time_info: "Processing Time: ~45-90 Seconds (Deep Logic Active)"`;

const newZh = `
    processing_time_info: "处理时间：约 45-90 秒（深度逻辑已激活）"`;

const newTa = `
    processing_time_info: "செயலாக்க நேரம்: ~45-90 வினாடிகள் (ஆழ்ந்த லாஜிக் செயலில் உள்ளது)"`;

const parts = content.split('},');

let ms = parts[0] + ',' + newMs;
let en = parts[1] + ',' + newEn;
let zh = parts[2] + ',' + newZh;
let ta = parts[3].replace(/}\\n};/s, '') + ',' + newTa + '}\\n};';

fs.writeFileSync('constants/translations.ts', ms + '},' + en + '},' + zh + '},' + ta);
console.log("Success");

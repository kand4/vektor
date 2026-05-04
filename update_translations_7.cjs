const fs = require('fs');
const content = fs.readFileSync('constants/translations.ts', 'utf8');

const newMs = `
    opt_clinical: "🔵 KLINIKAL",
    opt_natural: "☀️ SEMULAJADI",
    opt_warm: "💡 SUAM (WARM)"`;

const newEn = `
    opt_clinical: "🔵 CLINICAL",
    opt_natural: "☀️ NATURAL",
    opt_warm: "💡 WARM"`;

const newZh = `
    opt_clinical: "🔵 临床级",
    opt_natural: "☀️ 自然光",
    opt_warm: "💡 暖色调"`;

const newTa = `
    opt_clinical: "🔵 கிளினிக்கல்",
    opt_natural: "☀️ இயற்கை",
    opt_warm: "💡 இதமான விளக்கு"`;

const parts = content.split('},');

let ms = parts[0] + ',' + newMs;
let en = parts[1] + ',' + newEn;
let zh = parts[2] + ',' + newZh;
let ta = parts[3].replace(/}\\n};/s, '') + ',' + newTa + '}\\n};';

fs.writeFileSync('constants/translations.ts', ms + '},' + en + '},' + zh + '},' + ta);
console.log("Success");

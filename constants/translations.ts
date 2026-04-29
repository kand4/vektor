
export type Language = 'ms' | 'en' | 'zh' | 'ta';

export const translations = {
  ms: {
    app_subtitle: "Sistem Pertahanan Bio",
    nav_home: "UTAMA",
    nav_about: "TENTANG",
    nav_settings: "TETAPAN",
    status_online: "STATUS: ONLINE",
    status_free: "PERCUMA",
    activate_access: "AKTIFKAN AKSES",
    access_granted: "AKSES DIAKTIFKAN",
    
    // Upload Zone
    upload_title: "MULAKAN IMBASAN BIO",
    upload_subtitle: "MUAT NAIK PELBAGAI IMEJ",
    upload_drag: "SERET & LEPAS // ANALISIS KELOMPOK SEDIA",
    uploading: "MEMUAT NAIK...",
    
    // App Main
    hero_title: "PENGESANAN",
    hero_title_highlight: "ANCAMAN BIO",
    hero_subtitle: "FORENSIK AI LANJUTAN UNTUK VEKTOR & PATOGEN",
    btn_ar_scan: "AKTIFKAN IMBASAN AR",
    secure_link: "PAUTAN MUAT NAIK SELAMAT DIWUJUDKAN",
    evidence_board: "PAPAN BUKTI",
    btn_add: "TAMBAH",
    btn_clear: "PADAM",
    waiting_queue: "MENUNGGU GILIRAN...",
    processing_target: "Sistem sedang memproses sasaran.",
    analysis_failed: "ANALISIS TERGANGGU",
    btn_retry: "CUBA SEMULA",

    // Results
    btn_manual_scan: "IMBAS MANUAL",
    btn_simulation: "SIMULASI BIO-BERSIH",
    btn_export: "EKSPORT KE AI LUAR",
    btn_view_report: "LIHAT LAPORAN",
    tab_official: "RASMI",
    tab_savage: "PEDAS",
    
    risk_vector: "ANCAMAN VEKTOR",
    risk_hygiene: "KEBERSIHAN",
    risk_safety: "KESELAMATAN",
    
    card_source: "SUMBER (GOOGLE SEARCH)",
    card_analysis: "ANALISIS",
    card_microbio: "MIKROBIOLOGI",
    card_stats: "STATISTIK MAUT",
    card_verdict: "KEPUTUSAN",
    card_recommendation: "CADANGAN RASMI",
    card_savage_verdict: "KOMEN PEDAS",
    
    btn_microscope: "LIHAT RAKAMAN MIKROSKOP",
    btn_safety_video: "LIHAT KES KEMALANGAN/SOP",
    chat_placeholder: "Tanya soalan lanjut tentang risiko ini...",
    
    results_title: "LAPORAN ANALISIS",
    
    // Savage Levels
    savage_1_title: "KANDANG BABI",
    savage_1_desc: "NAJIS MUGHALLAZAH TAHAP DEWA.",
    savage_2_title: "TANDAS AWAM",
    savage_2_desc: "BAU HANCING & MELEKIT.",
    savage_3_title: "RUMAH HANTU",
    savage_3_desc: "SYURGA LILATI (LIPAS LALAT TIKUS).",
    savage_4_title: "KLINIK DESA",
    savage_4_desc: "BOLEH TAHAN, TAPI JANGAN SELESA.",
    savage_5_title: "MAKMAL NASA",
    savage_5_desc: "KUMAN PUN TAKUT NAK MASUK.",

    // Footer
    system_architect: "JURUBINA SISTEM",
    
    // Settings
    settings_title: "Tetapan Kod Akses",
    settings_subtitle: "Kunci Digital untuk mengaktifkan AI.",
    settings_paste_label: "Tampal Kod (API Key) Di Sini:",
    settings_save: "SIMPAN & AKTIFKAN",
    settings_saved: "BERJAYA!",
    settings_close: "Tutup",
    settings_reset: "Padam Kod Akses (Reset)",
    
    // Tutorial Steps (Simple Language)
    tutorial_header: "CARA DAPATKAN KOD (PANDUAN MUDAH)",
    t_step_1: "Tekan butang biru di bawah 'BUKA GOOGLE AI STUDIO'.",
    t_step_2: "Login guna akaun Google/Gmail anda seperti biasa.",
    t_step_3: "Cari butang biru besar bertulis 'Get API key' di sebelah kiri.",
    t_step_4: "Tekan 'Create API key'. Jika dia tanya, pilih 'Create API key in new project'.",
    t_step_5: "Satu kod panjang akan muncul. Tekan 'Copy'.",
    t_step_6: "Masuk semula sini, dan 'Paste' dalam kotak di bawah.",
    btn_open_studio: "BUKA GOOGLE AI STUDIO"
  },
  
  en: {
    app_subtitle: "Bio-Defense System",
    nav_home: "HOME",
    nav_about: "ABOUT",
    nav_settings: "SETTINGS",
    status_online: "STATUS: ONLINE",
    status_free: "FREE TIER",
    activate_access: "ACTIVATE ACCESS",
    access_granted: "ACCESS GRANTED",
    
    upload_title: "INITIATE BIO-SCAN",
    upload_subtitle: "UPLOAD MULTIPLE IMAGES",
    upload_drag: "DRAG & DROP // BATCH ANALYSIS READY",
    uploading: "UPLOADING...",
    
    hero_title: "BIO-THREAT",
    hero_title_highlight: "DETECTION",
    hero_subtitle: "ADVANCED AI FORENSICS FOR VECTORS & PATHOGENS",
    btn_ar_scan: "ACTIVATE AR SCAN",
    secure_link: "SECURE UPLOAD LINK ESTABLISHED",
    evidence_board: "EVIDENCE BOARD",
    btn_add: "ADD",
    btn_clear: "CLEAR",
    waiting_queue: "WAITING IN QUEUE...",
    processing_target: "System processing multiple targets.",
    analysis_failed: "ANALYSIS INTERRUPTED",
    btn_retry: "RETRY SCAN",

    btn_manual_scan: "MANUAL SCAN",
    btn_simulation: "BIO-CLEANSE SIM",
    btn_export: "EXPORT TO EXT. AI",
    btn_view_report: "VIEW REPORT",
    tab_official: "OFFICIAL",
    tab_savage: "SAVAGE",
    
    risk_vector: "VECTOR THREAT",
    risk_hygiene: "HYGIENE",
    risk_safety: "SAFETY",
    
    card_source: "VERIFIED SOURCES",
    card_analysis: "ANALYSIS",
    card_microbio: "MICROBIOLOGY",
    card_stats: "FATALITY STATS",
    card_verdict: "VERDICT",
    card_recommendation: "OFFICIAL RECOMMENDATION",
    card_savage_verdict: "THE NIGHTMARE VERDICT",
    
    btn_microscope: "WATCH MICROSCOPE FOOTAGE",
    btn_safety_video: "WATCH ACCIDENT/SOP VIDEO",
    chat_placeholder: "Ask follow-up questions...",

    results_title: "ANALYSIS REPORT",
    
    savage_1_title: "BIOHAZARD ZERO",
    savage_1_desc: "ABSOLUTE FILTH. BURN IT DOWN.",
    savage_2_title: "PUBLIC TOILET",
    savage_2_desc: "SMELLS LIKE REGRET & BACTERIA.",
    savage_3_title: "HAUNTED HOUSE",
    savage_3_desc: "PARADISE FOR RATS & ROACHES.",
    savage_4_title: "RURAL CLINIC",
    savage_4_desc: "DECENT, BUT DON'T GET COMFY.",
    savage_5_title: "NASA LAB",
    savage_5_desc: "GERMS ARE SCARED TO ENTER.",

    system_architect: "SYSTEM ARCHITECT",

    settings_title: "Access Key Settings",
    settings_subtitle: "Digital Key to activate the AI.",
    settings_paste_label: "Paste Code (API Key) Here:",
    settings_save: "SAVE & ACTIVATE",
    settings_saved: "SUCCESS!",
    settings_close: "Close",
    settings_reset: "Delete Access Key (Reset)",

    // Tutorial Steps
    tutorial_header: "HOW TO GET KEY (EASY GUIDE)",
    t_step_1: "Click the blue button below 'OPEN GOOGLE AI STUDIO'.",
    t_step_2: "Login with your Gmail account as usual.",
    t_step_3: "Find the big blue button 'Get API key' on the left.",
    t_step_4: "Click 'Create API key'. Select 'Create API key in new project' if asked.",
    t_step_5: "A long code will appear. Click 'Copy'.",
    t_step_6: "Come back here, and 'Paste' inside the box below.",
    btn_open_studio: "OPEN GOOGLE AI STUDIO"
  },

  zh: {
    app_subtitle: "生物防御系统",
    nav_home: "主页",
    nav_about: "关于",
    nav_settings: "设置",
    status_online: "状态：在线",
    status_free: "免费版",
    activate_access: "激活访问",
    access_granted: "已授权访问",
    
    upload_title: "启动生物扫描",
    upload_subtitle: "上传多张图片",
    upload_drag: "拖放 // 批量分析就绪",
    uploading: "上传中...",
    
    hero_title: "生物威胁",
    hero_title_highlight: "检测",
    hero_subtitle: "针对载体和病原体的高级 AI 取证",
    btn_ar_scan: "启动 AR 扫描",
    secure_link: "安全上传链接已建立",
    evidence_board: "证据板",
    btn_add: "添加",
    btn_clear: "清除",
    waiting_queue: "排队中...",
    processing_target: "系统正在处理多个目标。",
    analysis_failed: "分析中断",
    btn_retry: "重试扫描",

    btn_manual_scan: "手动扫描",
    btn_simulation: "生物净化模拟",
    btn_export: "导出至外部 AI",
    btn_view_report: "查看报告",
    tab_official: "官方",
    tab_savage: "毒舌模式",
    
    risk_vector: "载体威胁",
    risk_hygiene: "卫生隐患",
    risk_safety: "安全隐患",
    
    card_source: "验证来源 (GOOGLE)",
    card_analysis: "分析",
    card_microbio: "微生物学",
    card_stats: "死亡率统计",
    card_verdict: "结论",
    card_recommendation: "官方建议",
    card_savage_verdict: "噩梦毒舌",
    
    btn_microscope: "观看显微镜录像",
    btn_safety_video: "观看安全事故/培训",
    chat_placeholder: "询问有关此风险的后续问题...",

    results_title: "分析报告",
    
    savage_1_title: "猪圈",
    savage_1_desc: "绝对的污秽。建议直接烧毁。",
    savage_2_title: "公厕",
    savage_2_desc: "充满遗憾和细菌的味道。",
    savage_3_title: "鬼屋",
    savage_3_desc: "老鼠和蟑螂的天堂。",
    savage_4_title: "乡村诊所",
    savage_4_desc: "还行，但别太舒服。",
    savage_5_title: "NASA 实验室",
    savage_5_desc: "连细菌都不敢进来。",

    system_architect: "系统架构师",

    settings_title: "访问密钥设置",
    settings_subtitle: "激活 AI 的数字密钥。",
    settings_paste_label: "在此粘贴代码 (API Key)：",
    settings_save: "保存并激活",
    settings_saved: "成功！",
    settings_close: "关闭",
    settings_reset: "删除访问密钥 (重置)",

    // Tutorial Steps
    tutorial_header: "如何获取密钥 (简易指南)",
    t_step_1: "点击下方蓝色按钮 'OPEN GOOGLE AI STUDIO'。",
    t_step_2: "像往常一样登录您的 Gmail 帐户。",
    t_step_3: "找到左侧的蓝色大按钮 'Get API key'。",
    t_step_4: "点击 'Create API key'。如果被询问，选择 'Create API key in new project'。",
    t_step_5: "会出现一长串代码。点击 'Copy'。",
    t_step_6: "回到这里，粘贴到下面的框中。",
    btn_open_studio: "打开 GOOGLE AI STUDIO"
  },

  ta: {
    app_subtitle: "உயிர் பாதுகாப்பு அமைப்பு",
    nav_home: "முகப்பு",
    nav_about: "பற்றி",
    nav_settings: "அமைப்புகள்",
    status_online: "நிலை: ஆன்லைன்",
    status_free: "இலவசம்",
    activate_access: "அணுகலை இயக்கு",
    access_granted: "அணுகல் வழங்கப்பட்டது",
    
    upload_title: "உயிர் ஸ்கேன் தொடங்கவும்",
    upload_subtitle: "படங்களை பதிவேற்றவும்",
    upload_drag: "இழுத்துவிடவும் // பகுப்பாய்வு தயார்",
    uploading: "பதிவேற்றுகிறது...",
    
    hero_title: "உயிரியல் அச்சுறுத்தல்",
    hero_title_highlight: "கண்டறிதல்",
    hero_subtitle: "பூச்சிகள் மற்றும் நோய்க்கிருமிகளுக்கான மேம்பட்ட AI தடயவியல்",
    btn_ar_scan: "AR ஸ்கேன்",
    secure_link: "பாதுகாப்பான இணைப்பு நிறுவப்பட்டது",
    evidence_board: "ஆதார பலகை",
    btn_add: "சேர்",
    btn_clear: "அழி",
    waiting_queue: "வரிசையில் காத்திருக்கிறது...",
    processing_target: "கணினி இலக்குகளை செயலாக்குகிறது.",
    analysis_failed: "பகுப்பாய்வு தடைபட்டது",
    btn_retry: "மீண்டும் முயலவும்",

    btn_manual_scan: "கையேடு ஸ்கேன்",
    btn_simulation: "சுத்திகரிப்பு சிமுலேஷன்",
    btn_export: "வெளிப்புற AI",
    btn_view_report: "அறிக்கையைப் பார்",
    tab_official: "அதிகாரப்பூர்வ",
    tab_savage: "கடுமையான",
    
    risk_vector: "பூச்சி அச்சுறுத்தல்",
    risk_hygiene: "சுகாதாரம்",
    risk_safety: "பாதுகாப்பு",
    
    card_source: "சரிபார்க்கப்பட்ட ஆதாரங்கள்",
    card_analysis: "பகுப்பாய்வு",
    card_microbio: "நுண்ணுயிரியல்",
    card_stats: "இறப்பு புள்ளிவிவரங்கள்",
    card_verdict: "தீர்ப்பு",
    card_recommendation: "பரிந்துரை",
    card_savage_verdict: "கடுமையான விமர்சனம்",
    
    btn_microscope: "நுண்ணோக்கி காட்சிகளைப் பாருங்கள்",
    btn_safety_video: "பாதுகாப்பு வீடியோவைப் பாருங்கள்",
    chat_placeholder: "கேள்விகளைக் கேளுங்கள்...",

    results_title: "பகுப்பாய்வு அறிக்கை",
    
    savage_1_title: "பன்றி தொழுவம்",
    savage_1_desc: "மிகவும் அசுத்தம். உடனடியாக சுத்தம் தேவை.",
    savage_2_title: "பொது கழிப்பறை",
    savage_2_desc: "துர்நாற்றம் மற்றும் பாக்டீரியா.",
    savage_3_title: "பேய் வீடு",
    savage_3_desc: "எலிகள் மற்றும் கரப்பான் பூச்சிகளின் சொர்க்கம்.",
    savage_4_title: "கிராம மருத்துவமனை",
    savage_4_desc: "பரவாயில்லை, ஆனால் சிறந்தது அல்ல.",
    savage_5_title: "NASA ஆய்வகம்",
    savage_5_desc: "கிருமிகள் நுழைய பயப்படும்.",

    system_architect: "கணினி கட்டிடக் கலைஞர்",

    settings_title: "அணுகல் விசை அமைப்புகள்",
    settings_subtitle: "டிஜிட்டல் சாவி AI ஐ செயல்படுத்த.",
    settings_paste_label: "குறியீட்டை இங்கே ஒட்டவும்:",
    settings_save: "சேமி & இயக்கு",
    settings_saved: "வெற்றி!",
    settings_close: "மூடு",
    settings_reset: "விசையை நீக்கு (Reset)",

    // Tutorial Steps
    tutorial_header: "சாவியைப் பெறுவது எப்படி (எளிய வழி)",
    t_step_1: "கீழே உள்ள 'OPEN GOOGLE AI STUDIO' என்ற நீல நிற பொத்தானை அழுத்தவும்.",
    t_step_2: "வழக்கம் போல் உங்கள் Gmail கணக்கில் உள்நுழையவும்.",
    t_step_3: "இடதுபுறத்தில் 'Get API key' என்ற பெரிய நீல நிற பொத்தானைக் கண்டறியவும்.",
    t_step_4: "'Create API key' என்பதைக் கிளிக் செய்யவும். கேட்கப்பட்டால், 'Create API key in new project' என்பதைத் தேர்ந்தெடுக்கவும்.",
    t_step_5: "நீண்ட குறியீடு தோன்றும். 'Copy' என்பதைக் கிளிக் செய்யவும்.",
    t_step_6: "இங்கே திரும்பி வந்து, கீழே உள்ள பெட்டியில் ஒட்டவும்.",
    btn_open_studio: "GOOGLE AI STUDIO திறக்கவும்"
  }
};

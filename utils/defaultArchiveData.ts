import { AnalysisSession } from '../types';

// Helper to generate crisp premises SVG data URIs
const createPremiseSvg = (
  bgColor: string,
  title: string,
  elements: { type: string; color: string; label: string; x: number; y: number; w: number; h: number }[],
  isSanitized: boolean = false
): string => {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <defs>
    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${isSanitized ? '#0284c7' : '#334155'}" />
      <stop offset="100%" stop-color="${bgColor}" />
    </linearGradient>
    <linearGradient id="groundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${isSanitized ? '#1e293b' : '#1c1917'}" />
      <stop offset="100%" stop-color="${isSanitized ? '#0f172a' : '#0c0a09'}" />
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${isSanitized ? 'rgba(56, 189, 248, 0.1)' : 'rgba(239, 68, 68, 0.1)'}" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Background Wall / Sky -->
  <rect width="800" height="320" fill="url(#skyGrad)" />
  
  <!-- Ground Floor -->
  <rect y="320" width="800" height="180" fill="url(#groundGrad)" />
  <rect y="320" width="800" height="180" fill="url(#grid)" />

  <!-- Perimeter Wall / Horizon Line -->
  <line x1="0" y1="320" x2="800" y2="320" stroke="${isSanitized ? '#38bdf8' : '#78716c'}" stroke-width="3" />

  <!-- Elements -->
  ${elements.map(el => `
    <g transform="translate(${el.x}, ${el.y})">
      <rect width="${el.w}" height="${el.h}" rx="6" fill="${el.color}" stroke="#000" stroke-width="2" />
      <text x="${el.w / 2}" y="${el.h / 2 + 5}" fill="#ffffff" font-size="12" font-family="sans-serif" font-weight="bold" text-anchor="middle">
        ${el.label}
      </text>
    </g>
  `).join('')}

  <!-- Status Watermark / Header -->
  <rect x="20" y="20" width="340" height="40" rx="8" fill="rgba(0,0,0,0.75)" stroke="${isSanitized ? '#10b981' : '#ef4444'}" stroke-width="2" />
  <text x="35" y="45" fill="${isSanitized ? '#34d399' : '#f87171'}" font-size="14" font-family="monospace" font-weight="bold">
    ${isSanitized ? '✓ SIMULASI PENJAGAAN KKM SIAP' : '⚠ KEADAAN ASAL PREMIS DIKESAN'}
  </text>
  
  <!-- Title Badge -->
  <rect x="20" y="445" width="400" height="35" rx="6" fill="rgba(0,0,0,0.85)" />
  <text x="35" y="468" fill="#e2e8f0" font-size="13" font-family="sans-serif" font-weight="bold">
    ${title}
  </text>
</svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/**
 * Generates initial benchmark inspection records with real timestamps (Today, Yesterday, Last Week).
 * This ensures the date-grouped archive is immediately populated on fresh Vercel deployments.
 */
export const getDefaultArchiveSessions = (): AnalysisSession[] => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  // Session 1: TODAY (Pemeriksaan Timbunan Palet Kayu & Takungan Air)
  const todaySession: AnalysisSession = {
    id: `session-sample-today-${now}`,
    fileName: 'Zon_Gudang_Logistik_Palet_Kayu.jpg',
    imageSrc: createPremiseSvg(
      '#1e293b',
      'Pemeriksaan Logistik: Timbunan Palet Kayu & Takungan Bekas',
      [
        { type: 'pallet', color: '#854d0e', label: 'Timbunan Palet Kayu (Sarang Tikus)', x: 80, y: 240, w: 260, h: 100 },
        { type: 'water', color: '#0284c7', label: 'Bekas Air Bertakung (Aedes)', x: 400, y: 340, w: 120, h: 70 },
        { type: 'waste', color: '#475569', label: 'Sisa Kotak & Sampah', x: 580, y: 290, w: 140, h: 90 }
      ],
      false
    ),
    simulationImage: createPremiseSvg(
      '#0f172a',
      'Simulasi Bersih KKM: Palet Ditinggikan & Air Dihapuskan',
      [
        { type: 'pallet_rack', color: '#059669', label: 'Rak Palet Dinaikkan 30cm (Bebas Tikus)', x: 80, y: 200, w: 260, h: 120 },
        { type: 'bait', color: '#10b981', label: 'Stesen Umpan Tikus Piawai', x: 380, y: 350, w: 160, h: 50 },
        { type: 'clean', color: '#0284c7', label: 'Kawasan Sanitasi Bebas Sisa', x: 580, y: 310, w: 150, h: 80 }
      ],
      true
    ),
    mimeType: 'image/svg+xml',
    status: 'SUCCESS',
    mode: 'VECTOR_CONTROL',
    createdAt: now - (2 * 3600 * 1000), // 2 hours ago today
    result: {
      hygieneLevel: 2,
      safetyLevel: 3,
      generalAdvice: "Sistem forensik mengesan timbunan palet kayu terbiar di atas tanah serta takungan air dalam bekas plastik terdedah. PENTING: Palet kayu TIDAK menakung air nyamuk, sebaliknya ia membentuk rongga gelap (harborage) punca ancaman pembiakan koloni tikus (Leptospirosis) dan lipas. Bekas plastik kalis air bersebelahan pula berisiko tinggi pembiakan jentik-jentik Aedes.",
      savageCommentary: "Menyangka timbunan palet kayu ini tempat nyamuk bertelur adalah tidak tepat—ini kondominium mewah bertaraf 5 bintang untuk tikus kencing merata dan lipas bersarang!",
      risks: [
        {
          id: 'risk-today-1',
          category: 'VECTOR',
          label: 'Timbunan Palet Kayu & Papan (Sarang Tikus & Lipas)',
          agent: 'Rattus norvegicus / Periplaneta americana',
          disease: 'Leptospirosis (Kencing Tikus) & Keracunan Makanan / Alahan',
          microbiology: 'Leptospira interrogans / Salmonella enterica',
          statistics: 'Timbunan palet di lantai menyumbang 68% sarang tikus bandar di sektor pergudangan.',
          description: 'Palet kayu berliang membentuk rongga terlindung yang menjadi tempat sarang tikus dan lipas. Kayu ini tidak menakung air, tetapi menarik vektor mamalia dan serangga merayap.',
          solution: 'Naikkan palet kayu sekurang-kurangnya 30cm dari paras lantai menggunakan rak pallet keluli dan pasang stesen umpan tikus bertutup.',
          box_2d: { ymin: 480, xmin: 100, ymax: 680, xmax: 420 },
          citations: [],
          confidence: 0.96
        },
        {
          id: 'risk-today-2',
          category: 'VECTOR',
          label: 'Takungan Air Bertakung Dalam Bekas Kalis Air',
          agent: 'Aedes aegypti',
          disease: 'Denggi Berdarah (Dengue Hemorrhagic Fever)',
          microbiology: 'Dengue Flavivirus',
          statistics: 'Takungan jernih sekecil 50 sen berupaya menghasilkan 100+ ekor nyamuk Aedes seminggu.',
          description: 'Takungan air jernih terdedah dalam bekas plastik buangan yang merupakan habitat pembiakan prima bagi nyamuk Aedes.',
          solution: 'Buang air bertakung dengan serta-merta, musnahkan bekas yang tidak digunakan, atau simpan di bawah bumbung terlindung.',
          box_2d: { ymin: 680, xmin: 500, ymax: 820, xmax: 650 },
          citations: [],
          confidence: 0.94
        }
      ]
    }
  };

  // Session 2: YESTERDAY (Operasi Gempur Premis Kediaman & Longkang)
  const yesterdaySession: AnalysisSession = {
    id: `session-sample-yesterday-${now - oneDay}`,
    fileName: 'Premis_Kediaman_Lorong_Belakang_Taman.jpg',
    imageSrc: createPremiseSvg(
      '#334155',
      'Pemeriksaan Kediaman: Longkang Tersumbat & Tayar Terbuang',
      [
        { type: 'tire', color: '#18181b', label: 'Tayar Terpakai Terbiar (Aedes)', x: 100, y: 280, w: 180, h: 110 },
        { type: 'drain', color: '#475569', label: 'Longkang Tersumbat Daun', x: 360, y: 340, w: 340, h: 80 }
      ],
      false
    ),
    simulationImage: createPremiseSvg(
      '#0f172a',
      'Simulasi Bersih KKM: Saliran Lancar & Tayar Dilupuskan',
      [
        { type: 'drain_clean', color: '#0284c7', label: 'Saliran Konkrit Mengalir Sempurna', x: 100, y: 310, w: 600, h: 90 },
        { type: 'clean_zone', color: '#10b981', label: 'Zon Hijau Bebas Sampah Longgok', x: 250, y: 220, w: 300, h: 70 }
      ],
      true
    ),
    mimeType: 'image/svg+xml',
    status: 'SUCCESS',
    mode: 'VECTOR_CONTROL',
    createdAt: now - oneDay - (4 * 3600 * 1000), // Yesterday
    result: {
      hygieneLevel: 2,
      safetyLevel: 2,
      generalAdvice: "Pemeriksaan di kawasan lorong belakang kediaman mendapati saliran parit monsun tersumbat dengan kelodak dan tayar terpakai menakung air hujan. Nyamuk Aedes albopictus dan Culex dikesan berpotensi membiak dalam kitaran 7 hari.",
      savageCommentary: "Tayar terpakai ini sudah menjadi pusat peranginan spa lengkap untuk jentik-jentik membiak secara percuma!",
      risks: [
        {
          id: 'risk-yest-1',
          category: 'VECTOR',
          label: 'Takungan Air Dalam Tayar Terpakai',
          agent: 'Aedes albopictus',
          disease: 'Denggi & Chikungunya',
          microbiology: 'Flaviviridae',
          statistics: 'Tayar getah mengekalkan suhu air optimum untuk penetasan telur nyamuk.',
          description: 'Tayar kenderaan terbiar di kawasan lapang menakung air hujan tanpa disedari penduduk.',
          solution: 'Tebuk lubang pada tayar terpakai atau hantar ke pusat kitar semula berdaftar.',
          box_2d: { ymin: 560, xmin: 120, ymax: 780, xmax: 350 },
          citations: [],
          confidence: 0.98
        },
        {
          id: 'risk-yest-2',
          category: 'HYGIENE',
          label: 'Saliran Parit Tersumbat Sisa Organik',
          agent: 'Culex quinquefasciatus',
          disease: 'Filariasis & Ensefalitis',
          microbiology: 'Wuchereria bancrofti',
          statistics: 'Air parit bertakung kotor merupakan habitat primer Culex.',
          description: 'Aliran parit terhalang oleh dedaun kering dan sampah domestik.',
          solution: 'Lakukan gotong-royong pembersihan parit dan tabur larvasid biologi Abate 1SG.',
          box_2d: { ymin: 680, xmin: 450, ymax: 840, xmax: 875 },
          citations: [],
          confidence: 0.93
        }
      ]
    }
  };

  // Session 3: 4 DAYS AGO (Audit Premis Makanan KKM)
  const pastSession: AnalysisSession = {
    id: `session-sample-past-${now - (4 * oneDay)}`,
    fileName: 'Audit_Restoran_Kawasan_Dapur_Basah.jpg',
    imageSrc: createPremiseSvg(
      '#475569',
      'Audit Premis Makanan: Perangkap Minyak & Sisa Makanan',
      [
        { type: 'grease', color: '#713f12', label: 'Perangkap Minyak Berkerak', x: 120, y: 310, w: 220, h: 100 },
        { type: 'food', color: '#dc2626', label: 'Tong Sisa Makanan Terbuka (Lipas/Lalat)', x: 440, y: 260, w: 220, h: 120 }
      ],
      false
    ),
    simulationImage: createPremiseSvg(
      '#0f172a',
      'Simulasi Bersih KKM: Sanitasi Meja & Tong Berpedal Bertutup',
      [
        { type: 'clean_grease', color: '#0284c7', label: 'Perangkap Minyak Stainless Steel Bersih', x: 120, y: 310, w: 220, h: 100 },
        { type: 'sealed_bin', color: '#10b981', label: 'Tong Sisa Berpedal Kaki Bertutup Rapat', x: 440, y: 260, w: 220, h: 120 }
      ],
      true
    ),
    mimeType: 'image/svg+xml',
    status: 'SUCCESS',
    mode: 'KKM_FOOD_STANDARD',
    createdAt: now - (4 * oneDay), // 4 days ago
    result: {
      hygieneLevel: 2,
      safetyLevel: 3,
      generalAdvice: "Pengauditan premis makanan di bawah Peraturan-Peraturan Kebersihan Makanan 2009. Ditemukan perlanggaran penyimpanan sisa buangan dan saliran perangkap minyak.",
      savageCommentary: "Keadaan dapur basah ini mengundang notis penutupan premis 14 hari di bawah Seksyen 11 Akta Makanan 1983!",
      kkmReport: {
        grade: 'C',
        totalScore: 64,
        totalDemerit: 36,
        sections: [
          {
            code: 'SEC-B',
            title: 'Pengendalian & Penyimpanan Sisa Makanan',
            totalPoints: 20,
            demeritReceived: 15,
            violations: ['Tong sampah tidak bertutup rapat', 'Tiada pedal kaki', 'Tarikan lalat dan lipas']
          },
          {
            code: 'SEC-D',
            title: 'Sistem Perangkap Minyak & Saliran',
            totalPoints: 20,
            demeritReceived: 12,
            violations: ['Mendapan lemak melebihi had', 'Bau busuk mencemari zon persediaan']
          }
        ],
        summary: 'Premis berisiko dikenakan kompaun dan arahan pembersihan mandatori.',
        recommendation: 'Laksanakan kerja disinfeksi menyeluruh dalam tempoh 48 jam.'
      },
      risks: [
        {
          id: 'risk-past-1',
          category: 'HYGIENE',
          label: 'Sisa Makanan Terbuka (Tarikan Lalat & Lipas)',
          agent: 'Blattella germanica / Musca domestica',
          disease: 'Salmonellosis & Keracunan Makanan Akut',
          microbiology: 'Salmonella enterica',
          statistics: 'Penyebab 75% insiden keracunan makanan di premis makan awam.',
          description: 'Sisa makanan organik tidak diasingkan dan dibiarkan dalam bekas tanpa penutup kedap.',
          solution: 'Wajibkan penggunaan tong sampah berpenutup pedal kaki dan pelapik plastik sampah.',
          box_2d: { ymin: 520, xmin: 550, ymax: 760, xmax: 825 },
          citations: [],
          confidence: 0.95
        }
      ]
    }
  };

  return [todaySession, yesterdaySession, pastSession];
};

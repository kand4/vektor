import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { getAIClient } from '../services/geminiService';
import { resizeAndCompressImage } from '../utils/imageUtils';
import { AnalysisSession } from '../types';
import dirtyBackyardImg from '../src/assets/images/dirty_backyard_1782120370343.jpg';
import dirtyAlleywayImg from '../src/assets/images/dirty_alleyway_1782120387258.jpg';
import cleanBackyardImg from '../src/assets/images/clean_backyard_1782120587128.jpg';
import cleanAlleywayImg from '../src/assets/images/clean_alley_aligned_1782121086275.jpg';

// --- SOUND UTILITY USING WEB AUDIO API (Offline-Safe & No Asset Downloads Needed) ---
const playSound = (type: 'tap' | 'success' | 'win' | 'error' | 'sparkle') => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (type === 'tap') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'sparkle') {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.1, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.05 + 0.15);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.2);
      });
    } else if (type === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'win') {
      const now = ctx.currentTime;
      // Play a beautiful triumphant major chord triad arpeggio
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.15, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.3);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.4);
      });
    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    console.warn("Audio context not supported/blocked", e);
  }
};

// --- GAME TYPES ---
interface HuntQuiz {
  question: string;
  questionEn: string;
  options: string[];
  optionsEn: string[];
  correctIndex: number;
  explanation: string;
  explanationEn: string;
}

interface HuntSpot {
  id: string;
  name: string;
  nameEn: string;
  // Box coordinates as % of container
  left: number;  // 0 - 100
  top: number;   // 0 - 100
  width: number; // 0 - 100
  height: number;// 0 - 100
  hazard: string;
  hazardEn: string;
  disease: string;
  diseaseEn: string;
  description: string;
  descriptionEn: string;
  solution: string;
  solutionEn: string;
  isCustom?: boolean;
  quiz?: HuntQuiz;
}

interface GameScene {
  id: string;
  title: string;
  titleEn: string;
  image: string;
  cleanImage?: string;
  spots: HuntSpot[];
}

// --- PRESET SCENES ---
const PRESET_SCENES: GameScene[] = [
  {
    id: 'backyard',
    title: 'Halaman Belakang Rumah (Backyard Clutter)',
    titleEn: 'Residential Backyard Clutter',
    image: dirtyBackyardImg,
    cleanImage: cleanBackyardImg,
    spots: [
      {
        id: 'spot-tire',
        name: 'Tayar Buruk Terdedah',
        nameEn: 'Discarded Old Tire',
        left: 42,
        top: 55,
        width: 18,
        height: 16,
        hazard: 'Takungan Larva Aedes & Kulat Aspergillus',
        hazardEn: 'Aedes Vector Incubator & Surface Aspergillus Mold',
        disease: 'Virus Denggi, Zika & Mikosis Spora',
        diseaseEn: 'Dengue Virus, Zika & Spore Mycosis',
        description: 'Struktur melengkung tayar yang lembap dan hangat menampung air hujan jernih terlindung daripada cahaya matahari terus. Keadaan organik ini juga subur mendatangkan kulat permukaan Aspergillus berbahaya yang membebaskan spora toksik ke udara.',
        descriptionEn: 'The damp, warm inner curve of tires traps static rainwater shaded from direct sun rays. This pristine incubator also nurtures Aspergillus surface molds, shedding microspores into adjacent residential airspaces.',
        solution: 'Buang takungan air sepenuhnya, sental piring tayar, taburkan serbuk larvasid Abate (Temephos), simpan di bawah bumbung kalis air, atau kitar semula secara selamat.',
        solutionEn: 'Drain water fully, scrub internal walls to dislodge eggs, sprinkle Abate (Temephos) powder, store under dry covers, or hand over to recycle plants.',
        quiz: {
          question: "Apakah nama virus yang disebarkan oleh nyamuk Aedes aegypti dan apakah masa menggigit utamanya?",
          questionEn: "What is the virus transmitted by Aedes aegypti and its primary peak biting times?",
          options: [
            "Virus Denggi, puncak gigitan pada awal pagi dan lewat petang (diurnal)",
            "Bakteria Leptospira, bertindak aktif pada waktu tengah malam sahaja",
            "Virus Malaria, aktif mengikut denyutan suhu dalam bilik tidur",
            "Fungus Aspergillus, tersebar melalui air minuman bersuhu panas sekali",
            "Virus Demam Kuning, aktif hanya pada waktu subuh dingin"
          ],
          optionsEn: [
            "Dengue virus, active predominantly during early mornings and late afternoons (diurnal)",
            "Leptospira bacteria, highly active exclusively during midnight hours",
            "Malaria parasite, shifts patterns depending on local bedroom insulation",
            "Aspergillus mold spores, transmitted through ingestion of boiling tap water",
            "Yellow Fever virus, active strictly during freezing winter dawning"
          ],
          correctIndex: 0,
          explanation: "Nyamuk Aedes betina lebih aktif mencari mangsa dlm suhu sederhana pada awal pagi dan senja (diurnal daytime biter). Rujukan Sains: Wikipedia 'Aedes aegypti' & CDC Guidelines (PubMed PMC3113833).",
          explanationEn: "Female Aedes are diurnal daytime feeders, peaking in early mornings and late afternoons. Source: Wikipedia 'Aedes aegypti' & CDC Vector Control guidelines (PubMed PMC3113833)."
        }
      },
      {
        id: 'spot-tin',
        name: 'Tin Tin Terbuka',
        nameEn: 'Rusty Open Cans',
        left: 23,
        top: 72,
        width: 10,
        height: 10,
        hazard: 'Takungan Air Jernih Bertakung',
        hazardEn: 'Stagnant Clear Rainwater Vessel',
        disease: 'Demam Denggi / Virus Zika',
        diseaseEn: 'Dengue / Zika Virus transmission',
        description: 'Tin kosong boleh menampung air hujan yang jernih selama berhari-hari. Malah air sekecil sudu teh pun sudah memadai untuk nyamuk Aedes menetaskan kitaran telur dan jejentik.',
        descriptionEn: 'Empty tin cans retain clear rainwater for days. Even a tea-spoon sized water collection is fully sufficient for female Aedes to initiate egg hatching and trigger larval cycles.',
        solution: 'Kemikkan tin kosong sebelum dibuang, atau kumpulkan ke dalam tong kitar semula tertutup.',
        solutionEn: 'Crush the cans before disposal or discard into closed recycling bins immediately.',
        quiz: {
          question: "Berapakah kuantiti air minimum yang diperlukan oleh nyamuk Aedes betina untuk bertelur dan menetaskan jorongan larva?",
          questionEn: "What is the minimum volume of water required for an Aedes mosquito to successfully spawn eggs and hatch larvae?",
          options: [
            "Sekurang-kurangnya 10 liter air suam mengalir",
            "Sekecil sudu teh air bertakung jernih atau saputan pelembap tipis",
            "Mesti berukuran sekurang-kurangnya 1 liter air sabun suam",
            "Nyamuk Aedes langsung tidak memerlukan air untuk bertelur",
            "Satu gelas besar air mineral tulen bergas karbondioksida"
          ],
          optionsEn: [
            "At least 10 liters of warm flowing creek water",
            "As minimal as a teaspoon of stagnant clear liquid or a thin moisture film",
            "A minimum threshold of 1 liter of warm soapy fluid",
            "Aedes mosquitoes do not require any water medium to hatch eggs",
            "One large glass of pure sparkling mineral water filled with CO2"
          ],
          correctIndex: 1,
          explanation: "Nyamuk Aedes memilih habitat bekas buatan manusia (container breeder). Air sekecil satu sudu teh (sekitar 5 ml) memadai untuk memulakan kitaran larva. Rujukan Sains: WHO Vector Control Manual & Wikipedia 'Aedes' (PubMed PMC4012061).",
          explanationEn: "Aedes is a container-breeding species requiring minimal volume. A simple teaspoon of fluid (~5ml) provides enough moisture to hatch larvae. Source: WHO Vector Control Guidance & Wikipedia 'Aedes' (PubMed PMC4012061)."
        }
      },
      {
        id: 'spot-pot',
        name: 'Piring Pasu Bunga',
        nameEn: 'Flower Pot Underplate',
        left: 68,
        top: 66,
        width: 12,
        height: 12,
        hazard: 'Tadahan Air Siraman Air',
        hazardEn: 'Stagnant Irrigation Water Collection',
        disease: 'Demam Denggi',
        diseaseEn: 'Dengue Fever Outbreak Risk',
        description: 'Piring di bawah pasu selalu tersimpan limpahan air semburan harian. Ini membiarkan larva membesar dengan tenang di sela pasu bunga tanpa gangguan.',
        descriptionEn: 'The plates under flower pots consistently store regular overflow of daily plant watering, offering a quiet, perfect, nutritious pool for larvae development right in the garden.',
        solution: 'Bersihkan piring secara mingguan, atau bubuh sedikit garam/pasir perangkap air untuk pemusnahan mekanikal telur jentajik.',
        solutionEn: 'Clean plates weekly or sprinkle sand filter / table salt to eliminate physical egg stickiness.',
        quiz: {
          question: "Apakah fungsi utama meletakkan garam halus atau serbuk perangkap kalsium ke dalam piring pasu bunga untuk kawalan vektor?",
          questionEn: "What is the main chemical/physical effect of introducing granular salts or Abate into flower pot underplates?",
          options: [
            "Meningkatkan kadar kemasinan air yang mengganggu regulasi osmosis sel jejentik lalu merosakkan dinding badannya",
            "Untuk meracun akar pokok bunga hiasan",
            "Menarik perhatian katak dewasa bertelur",
            "Mencerahkan warna daun pokok secara semula jadi",
            "Membuang sisa kalsium kapur daripada tanah liat kering"
          ],
          optionsEn: [
            "Increases osmotic pressure, disrupting the fragile electrolyte regulation of larval skin and cells, leading to physical lysis",
            "To poison the roots of proximate decorative landscape flora",
            "To invite adult amphibians to spawn insectivorous tadpoles",
            "To whiten the color of adjacent garden leaves instantly",
            "To strip calcareous lime residues from surrounding dry garden clays"
          ],
          correctIndex: 0,
          explanation: "Temephos (Abate) menekan enzim asetilkolinesterase pada sistem saraf larva, manakala pendedahan kepekatan natrium klorida (garam) mengganggu kestabilan osmoregulasi sel membran larva. Rujukan Sains: Wikipedia 'Temephos' & PubMed PMC3510909.",
          explanationEn: "Temephos (Abate) inhibits acetylcholinesterase in larval central nervous systems, while high sodium chloride (salt) disrupts vital osmoregulation of larval soft bodies. Source: Wikipedia 'Temephos' & PubMed PMC3510909."
        }
      },
      {
        id: 'spot-debris',
        name: 'Timbunan Kayu Lusuh & Kotak',
        nameEn: 'Rotting Wood & Clutter',
        left: 12,
        top: 40,
        width: 22,
        height: 25,
        hazard: 'Sarang Kediaman Tikus & Bakteria Leptospira',
        hazardEn: 'Shelter for Rodents & Leptospira bacteria',
        disease: 'Penyakit Kencing Tikus (Leptospirosis)',
        diseaseEn: 'Leptospirosis (Rat Urine Disease)',
        description: 'Timbunan kayu terbiar lembap mewujudkan terowong gelap ideal untuk pembiakan kencing tikus serta pelbagai serangga merangkak pembawa mikroba Salmonella.',
        descriptionEn: 'Damp stacked rotting timber generates perfect dark tunnels for rodents to build nests, leading to high exposure of Leptospira pathogen spreads via rodent excretions.',
        solution: 'Tinggikan kayu dari tanah sekurang-kurangnya 30cm, susun teratur serta pastikan sinaran matahari dapat menerobos sela longgokan.',
        solutionEn: 'Elevate timber at least 30cm off the ground, arrange tidily, and verify sunlight penetration to deter rodents.',
        quiz: {
          question: "Apakah patogen jenis bakteria heliks yang boleh mendatangkan maut dan ditransmisikan melalui air kencing tikus di longgokan sampah lembap?",
          questionEn: "What lethal helical-shaped bacterium is shed in rodent urine and contaminates damp wooden debris or stagnant puddles?",
          options: [
            "Bakteria Leptospira interrogans (Leptospirosis)",
            "Virus Chikungunya yang merosakkan sendi tulang",
            "Fungus Candida albicans ragi",
            "Parasit Plasmodium malariae sporozoit",
            "Virus Rabies bawaan gigitan anjing liar"
          ],
          optionsEn: [
            "Leptospira interrogans bacterium (Leptospirosis)",
            "Chikungunya virus strain targeting bone joint fluids",
            "Candida albicans fungal yeast colony",
            "Plasmodium malariae intracellular parasite stage",
            "Rabies lyssavirus transmitted via wild canine bites"
          ],
          correctIndex: 0,
          explanation: "Bakteria spiroseta Leptospira interrogans berkoloni di dalam tubul renal tikus (rodentia) dan dilepaskan melalui air kencing ke persekitaran lembap, menyusup ke tubuh manusia melalui luka kulit. Rujukan Sains: Wikipedia 'Leptospirosis' & PubMed PMC2231384.",
          explanationEn: "The spirochete Leptospira interrogans colonizes renal tubules of rodent reservoirs and is shed via urine into damp ecosystems, entering humans through skin micro-abrasions. Source: Wikipedia 'Leptospirosis' & PubMed PMC2231384."
        }
      },
      {
        id: 'spot-bottle',
        name: 'Botol Plastik Terserak',
        nameEn: 'Littered Plastic Bottle',
        left: 58,
        top: 78,
        width: 8,
        height: 12,
        hazard: 'Bahan Plastik Menakung Air Ghaib',
        hazardEn: 'Micro Rainwater Collector',
        disease: 'Demam Denggi / Chikungunya',
        diseaseEn: 'Dengue Vector Incubation',
        description: 'Botol plastik lutsinar yang bertaburan menyerap haba hangat dan memerangkap takungan air hujan, mempercepatkan proses penetasan larva jejentik Aedes.',
        descriptionEn: 'Discarded clear plastic bottles absorb warm sunlight and lock in micro rainwater volumes, accelerating larvae incubation rates due to warm localized temperatures.',
        solution: 'Kumpul, kosongkan cecair di dalam, sental leher botol dan buang ke tong kitar semula sewajarnya.',
        solutionEn: 'Collect, drain remaining liquids, scrape bottle necks to remove eggs, and dispose of in recycling systems.',
        quiz: {
          question: "Mengapakah bekas plastik lutsinar lut cahaya meningkatkan kelajuan pembiakan larva berbanding bekas legap?",
          questionEn: "Why do transparent plastic bottles speed up larval development faster than opaque containers?",
          options: [
            "Gas pemanasan solar (efek rumah hijau mikro) menstabilkan cecair suam, mempercepatkan kadar pembelahan sel larva",
            "Kerana nyamuk seronok bermain bayang-bayang di permukaan lutsinar",
            "Suhu sejuk melampau terkumpul dari plastik bertindak memperkukuh protein larva",
            "Plastik lutsinar menapis bahan larvasid menjadi nutrien makanan nyamuk",
            "Merangsang pembentukan gelembung oksigen magnetik dari liang dinding botol"
          ],
          optionsEn: [
            "Solar radiation creates an insulated micro greenhouse, warming stagnant water to optimize and double larval metabolic rates",
            "Mosquitoes are behaviorally attracted to shadow patterns seen through transparent sheets",
            "Extreme sub-zero cooling waves accumulate from glass/clear bodies to solidify shell structures",
            "Transparent plastics filter ambient larvicides, magically converting them to larvae nutrients",
            "Stimulates production of magnetic oxygen bubbles emitted through micro bottle pores"
          ],
          correctIndex: 0,
          explanation: "Peningkatan suhu mikro air dalam bekas lutsinar mempercepatkan kadar metabolisme enzim dan saringan kitaran hidup larva daripada 10 hari kepada 6 hari sahaja. Rujukan Sains: Journal of Medical Entomology & PubMed PMC5133611.",
          explanationEn: "Elevated water temperatures in transparent containers accelerate larval enzyme systems and metabolisms, shortening the overall pupation cycle. Source: Journal of Medical Entomology & PubMed PMC5133611."
        }
      },
      {
        id: 'spot-bucket-backyard',
        name: 'Pasu Tanah Liat Terbiar',
        nameEn: 'Abandoned Clay Pot',
        left: 4,
        top: 68,
        width: 12,
        height: 14,
        hazard: 'Takungan Air & Larva Aedes Albopictus',
        hazardEn: 'Stagnant Water & Aedes Albopictus Larvae',
        disease: 'Zika / Chikungunya / Denggi Baru',
        diseaseEn: 'Zika / Chikungunya / Dengue Risk Outpost',
        description: 'Pasu tanah liat kosong yang dibiarkan terbalik atau tegak menampung kuantiti air yang bersih dan teduh di bawah dahan pokok, menjadikannya syurga bagi sub-spesies nyamuk Aedes albopictus.',
        descriptionEn: 'Abandoned empty flower pots retain clean, shaded water pockets underneath trees, creating a premium breeding hotspot specifically preferred by the Aedes albopictus vector.',
        solution: 'Pecahkan pasu terbiar, atau terbalikkan sepenuhnya agar air hujan tidak terjatuh di dalamnya.',
        solutionEn: 'Break broken pots, or turn them strictly upside down to prevent pooling after precipitation.',
        quiz: {
          question: "Apakah perbezaan utama tabiat pembiakan nyamuk Aedes albopictus berbanding Aedes aegypti?",
          questionEn: "What is the primary difference in breeding behaviors between Aedes albopictus and Aedes aegypti?",
          options: [
            "Aedes albopictus membiak aktif di luar rumah (outdoor/tumbuhan) manakala Aedes aegypti lebih gemar dalam rumah (indoor)",
            "Aedes albopictus hanya membiak di dalam air parit yang kotor dan berkeladak pekat",
            "Aedes albopictus tidak bertelur dalam bekas buatan manusia langsung",
            "Aedes albopictus memerlukan air bersuhu mendidih untuk menetaskan larvanya secara murni",
            "Aedes aegypti bertelur secara murni di lopak tasik geologi air mengalir deras"
          ],
          optionsEn: [
            "Aedes albopictus breeds predominantly outdoors in natural vegetation holes/containers, whereas Aedes aegypti is highly domesticated in indoor containers",
            "Aedes albopictus breeds strictly in heavily contaminated organic septic drainage channels",
            "Aedes albopictus avoids synthetic or man-made artificial jars entirely",
            "Aedes albopictus requires boiling water thresholds to break its eggshell shell",
            "Aedes aegypti spawns naturally in widespread natural geological bodies like swift freshwater rivers"
          ],
          correctIndex: 0,
          explanation: "Aedes albopictus lebih gemar persekitaran separa liar/luar rumah (sylvatic/semi-urban), bertelur di dalam lopak pokok atau bekas terbiar di taman. Rujukan: WHO Entomology Guide & Pubmed PMC6088235.",
          explanationEn: "Aedes albopictus is a highly adaptive outdoor breeder (forest edge/suburban vegetation), while Aedes aegypti is strictly domestic/indoor-oriented. Source: WHO Guidelines & Pubmed PMC6088235."
        }
      },
      {
        id: 'spot-tarp',
        name: 'Kanvas Plastik Terlipat',
        nameEn: 'Folded Tarpaulin Canvas',
        left: 36,
        top: 44,
        width: 14,
        height: 10,
        hazard: 'Lembatan Air di Celahan Plastik',
        hazardEn: 'Rainwater Traps inside Creased Tarp',
        disease: 'Demam Denggi & Kulat Spora',
        diseaseEn: 'Dengue Fever & Spore Mold propagation',
        description: 'Kanvas kanji berkualiti tebal yang terlipat menampung ratusan poket air hujan yang hangat dan terlindung sisa dedaun. Ini mewujudkan ekosistem inkubasi mikro herba nyamuk Aedes.',
        descriptionEn: 'Gathered plastic tarpaulin sheets keep dozens of warm micro rainwater pockets hidden under overlapping canvas sheets, forming a protected hot breeding area for Aedes vectors.',
        solution: 'Kibaskan terpal kanvas basah, gantung menegak bagi menghentikan lekukan takungan air.',
        solutionEn: 'Shake off wet canvas wraps, and hang them vertically to destroy multiple internal water pockets.',
        quiz: {
          question: "Apakah punca utama kanvas plastik biru/hijau terbiar sering menjadi sarang nyamuk yang gagal dikesan?",
          questionEn: "Why do discarded tarpaulin creases serve as a major hidden hazard for vector breeding?",
          options: [
            "Lipatan kedutan plastik mengumpul takunan air kecil (cryptic breeding site) yang terselindung dari pandangan mata kasar",
            "Plastik terpal membebaskan hormon feromon yang memanggil nyamuk jantan sahaja untuk bersenggama",
            "Permukaan kanvas membekalkan protein selulosa tinggi terus kepada larva nyamuk",
            "Kanvas plastik mengekalkan kelembapan sejuk di bawah sifar Celsius",
            "Air dalam lipatan plastik dilindungi oleh racun semulajadi yang mematikan pemangsa larva nyamuk"
          ],
          optionsEn: [
            "Plastic creases form multiple hidden water cavities (cryptic breeding sites) that are highly difficult to locate during standard inspections",
            "Plastic sheets release pheromone chemicals attracting ONLY non-biting male vector mosquitoes",
            "Tarpaulin synthetic coatings directly supply high cellulose proteins for larval ingestion",
            "Synthetic canvas sheets physically generate sub-zero cooling temperatures that accelerate life cycles",
            "The water trapped in plastic wraps contains organic chemicals that instantly paralyzes natural larval predators"
          ],
          correctIndex: 0,
          explanation: "Sarang terselindung (cryptic breeding sites) seperti lipatan kanvas atau kanopi plastik sangat sukar dikesan semasa operasi semburan kabus (fogging) biasa. Rujukan: CDC & PubMed PMC3962451.",
          explanationEn: "Cryptic breeding spots like sheet creases or fabric overlaps shield vector colonies from standard ULV aerosol search and chemical vector controls. Source: CDC & PubMed PMC3962451."
        }
      },
      {
        id: 'spot-gutters-backyard',
        name: 'Palung Hujan Atas Bumbung',
        nameEn: 'Clogged Roof Gutter',
        left: 45,
        top: 12,
        width: 35,
        height: 8,
        hazard: 'Palung Tersumbat Dedaun Organik',
        hazardEn: 'Gutter Clogged with Organic Leaf Litter',
        disease: 'Nyamuk Culex / West Nile Virus',
        diseaseEn: 'Culex Vector / West Nile Risk transmission',
        description: 'Palung pancur bumbung tersumbat longgokan daun kering, menghalang aliran air hujan dan menghasilkan rantaian koloni air tenang berkeladak organik tebal.',
        descriptionEn: 'Roof gutters clogged by organic leaf litter block drainage patterns, generating massive, highly organic static water corridors elevated over residential domains.',
        solution: 'Bersihkan palung bumbung secara berkala daripada dedaun kering dan pasang penapis mesh plastik.',
        solutionEn: 'Clear roof gutters of leaves regularly and install specialized mesh covers to facilitate runoff streams.',
        quiz: {
          question: "Apakah penyakit berbahaya bawaan nyamuk Culex yang membiak di saliran tinggi bumbung terbiar ini?",
          questionEn: "Which major pathology is transmitted by Culex vectors that commonly breed in elevated roof gutters?",
          options: [
            "Ensefalitis Jepun (Japanese Encephalitis) & Filariasis Limfatik",
            "Demam Kuning (Yellow Fever) melampau",
            "Penyakit Kencing Tikus spiroseta",
            "Amebiasis Dysentery melalui air paip",
            "Demam Kepialu Typhoid bawaan sisa kotoran lalat"
          ],
          optionsEn: [
            "Japanese Encephalitis & Lymphatic Filariasis (Wuchereria bancrofti)",
            "Extreme Yellow Fever epidemic",
            "Spirochetal Weil's disease (Leptospirosis)",
            "Water-borne intestinal Amebiasis via tap water",
            "Enteric Typhoid fever via mechanical flies and feces"
          ],
          correctIndex: 0,
          explanation: "Culex quinquefasciatus menyebarkan cacing filaria Wuchereria bancrofti pembawa untut (elephantiasis) dan virus Ensefalitis Jepun. Rujukan: WHO & Wikipedia 'Culex'.",
          explanationEn: "Culex quinquefasciatus is the primary global vector of Lymphatic Filariasis (elephantiasis) and Japanese Encephalitis virus. Source: WHO & Wikipedia 'Culex'."
        }
      },
      {
        id: 'spot-ac-backyard',
        name: 'Air Pemampat AC',
        nameEn: 'AC Compressor Drainage',
        left: 80,
        top: 28,
        width: 14,
        height: 18,
        hazard: 'Air Kondensasi Pemampat AC',
        hazardEn: 'Dynamic AC Condensate Dripping Point',
        disease: 'Nyamuk Aedes / Legionellosis',
        diseaseEn: 'Aedes Breeding / Legionella Risk containment',
        description: 'Paip pelepasan AC menitiskan air tulin ber-pH stabil tanpa henti. Bekas kecil atau lopak yang diletakkan di bawah menakung air jernih ini secara konsisten.',
        descriptionEn: 'AC unit condensate outputs pure stable-pH fresh water continuously into dripping collection cups or floor depressions, producing clean, consistent water volumes.',
        solution: 'Salurkan paip penitis AC terus ke longkang beraliran lancar atau pasang takungan tertutup Abate.',
        solutionEn: 'Channel AC drain lines directly to functional running sewers or apply Abate treatment nodes.',
        quiz: {
          question: "Mengapakah air kondensasi AC (air penyaman udara) sangat disukai oleh nyamuk betina Aedes betina sebagai port bertelur?",
          questionEn: "Why is air conditioner (AC) condensation fluid heavily favored by pregnant female Aedes for oviposition?",
          options: [
            "Ia merupakan air tawar jernih, suam, dan terselamat daripada bahan klorin paip mekanikal biasa",
            "Mengandungi bahan glukosa manis limpahan freon sistem pendingin",
            "Penuh dengan kuman cacing tanah yang memberi makanan protein percuma kepada nyamuk betina",
            "Kerana ia memancarkan gelombang sonik sejuk mikro yang memanggil kelakuan vektor",
            "Mengandungi sisa logam plumbum kuat yang mempercepat kematangan kitaran sel larva"
          ],
          optionsEn: [
            "It represents clean, stagnant, non-chlorinated fresh water with stable warm microclimate temperatures",
            "It contains high concentrations of sweet glucose leaked from cooling freon gases",
            "It is rich in earthworm larvae providing free protein prey to adult mosquitoes",
            "Because AC motors emit unique cooling sound-waves that invoke insect mating",
            "It houses thick lead particles that chemically super-sizes mosquito larvae bodies"
          ],
          correctIndex: 0,
          explanation: "Nyamuk Aedes betina sangat sensitif kepada kehadiran klorin. Air kondensasi AC bebas-klorin memicu isyarat oviposisi (oviposition cue) yang subur. Rujukan: PubMed PMC4329249.",
          explanationEn: "Pregnant Aedes mosquitoes are highly chlorine-averse. Chlorine-free fresh AC condensate provides an ideal chemical profile for oviposition cues. Source: PubMed PMC4329249."
        }
      },
      {
        id: 'spot-ivy',
        name: 'Semak Belukar Tebal',
        nameEn: 'Overgrown Backyard Bush',
        left: 84,
        top: 60,
        width: 15,
        height: 35,
        hazard: 'Semak Lebat & Sarang Tikus Flea',
        hazardEn: 'Thick Undergrowth & Rodent Harborages',
        disease: 'Tifus Belukar (Scrub Typhus)',
        diseaseEn: 'Scrub Typhus (Orientia tsutsugamushi) vector',
        description: 'Rumput dan belukar tebal menyediakan teduhan lembap siang hari bagi nyamuk berehat serta menyembunyikan laluan tikus liar pembawa kutu merah pembawa patogen Orientia tsutsugamushi.',
        descriptionEn: 'Thick overgrown garden shrubs provide high midday humidity for rest-seeking vectors and hide nests of wild host rodents harboring red larval mites (chiggers) that spread Scrub Typhus.',
        solution: 'Racun belukar liar, cantas daun sehingga sinaran terik matahari terdedah terus ke tanah halaman.',
        solutionEn: 'Trim overgrown shrubs and mow lawn grasses down to disrupt hiding humidity baselines.',
        quiz: {
          question: "Apakah vektor utama yang menyebarkan patogen Tifus Belukar (Scrub Typhus) di kawasan semak belukar yang tidak terurus?",
          questionEn: "What is the key vector transmitter of Scrub Typhus (Orientia tsutsugamushi) inside neglected high grass?",
          options: [
            "Tungau larva chigger (Leptotrombidium)",
            "Lalat tsetse pembawa tiduran parasit",
            "Nyamuk betina Aedes albopictus luar rumah",
            "Kutu katil (bedbugs) biasa di lipatan fabrik tidur",
            "Kulat spora Aspergillus niger kering ditiup angin"
          ],
          optionsEn: [
            "Larval trombiculid mites or chiggers (Leptotrombidium)",
            "Tsetse fly associated sleeping sickness vector",
            "Aedes albopictus aerial outdoor mosquitoes",
            "Common commercial bedbugs (Cimex lectularius) hidden in bed sheet folds",
            "Aspergillus black fungal spores carried in high winds"
          ],
          correctIndex: 0,
          explanation: "Penyakit Scrub Typhus disebabkan oleh bakteria obligat intrasel Orientia tsutsugamushi yang dihantar melalui gigitan anak tungau chiggers (Leptotrombidium). Rujukan: Wikipedia 'Scrub Typhus' & PubMed PMC3395995.",
          explanationEn: "Scrub Typhus is caused by Orientia tsutsugamushi bacterium, transmitted through bite wounds of microscopic larval trombiculid mites called chiggers. Source: Wikipedia 'Scrub Typhus' & PubMed PMC3395995."
        }
      }
    ]
  },
  {
    id: 'alleyway',
    title: 'Kawasan Lorong Belakang (Urban Alleyway)',
    titleEn: 'Urban Alleyway Clutter',
    image: dirtyAlleywayImg,
    cleanImage: cleanAlleywayImg,
    spots: [
      {
        id: 'spot-bucket',
        name: 'Bekas Plastik Cat Terbiar',
        nameEn: 'Abandoned Paint Bucket',
        left: 48,
        top: 52,
        width: 15,
        height: 20,
        hazard: 'Sarang Nyamuk & Takungan Jernih',
        hazardEn: 'Deep Reservoir for Mosquito Breeding',
        disease: 'Demam Denggi / Virus Zika',
        diseaseEn: 'Dengue Virus propagation risk',
        description: 'Bekas silinder dalam menakung kuantiti air yang tebal. Sekiranya tidak disedari, ia mampu melahirkan ratusan jentik-jentik serentak dlm satu kitaran hujan.',
        descriptionEn: 'Deep cylindrical buckets aggregate major water volumes. If left unnoticed, they can nurture hundreds of larvae simultaneously after single rainfall events.',
        solution: 'Terbalikkan semua baldi, tebuk lubang saliran bawah, atau tutup kedap permukaannya menggunakan jejaring halus.',
        solutionEn: 'Turn all buckets upside down, drill drain holes, or seal securely using fine screen nets.',
        quiz: {
          question: "Berapakah lamakah purata jangkahayat telur nyamuk Aedes betina bertahan dlm keadaan kering kontaminasi tanpa air?",
          questionEn: "For how long can the dry dehydrated eggs of an Aedes mosquito lay dormant before hatching successfully upon flooding?",
          options: [
            "Sekitar 1 hingga 2 hari sahaja",
            "Hampir 9 bulan dalam keadaan kering mengeras",
            "Hanya 2 minggu sebelum permukaan telur mengecut",
            "Selama-lamanya walaupun terkena sisa asid kimia pekat",
            "Maksimum 6 bulan jika ditaruh di bawah suhu ais pembeku rumah"
          ],
          optionsEn: [
            "Only about 1 to 2 days maximum",
            "Up to 9 months in dry, desiccated status on dry container edges",
            "No longer than 2 weeks before the egg shell shrivels",
            "Indefinitely, even if doused in ultra-pure chemical acid cleaners",
            "A maximum of 6 months if kept beneath deep kitchen freezer points"
          ],
          correctIndex: 1,
          explanation: "Telur Aedes menjalani proses diapaus luaran di mana lapisan lipid keras (waxy serosal cuticle) mengelakkan kekeringan embrio sehingga 9 bulan. Rujukan Sains: Wikipedia 'Diapause' & PubMed PMC2916960.",
          explanationEn: "Aedes eggs enter dry embryonic diapause, protected by a specialized lipid-rich waxy serosal cuticle that prevents desiccation for up to 9 months. Source: Wikipedia 'Diapause' & PubMed PMC2916960."
        }
      },
      {
        id: 'spot-bin',
        name: 'Tong Sampah Tanpa Tutup',
        nameEn: 'Lidless Trash Bin',
        left: 73,
        top: 38,
        width: 16,
        height: 32,
        hazard: 'Syurga Pembiakan Lalat & Lipas (Sarang Patogen)',
        hazardEn: 'Bacterial Hatchery for Flies & Roaches (Pathogen Incubator)',
        disease: 'Kolera / Dysentery / Salmonella',
        diseaseEn: 'Cholera / Dysentery / Salmonella Poisoning',
        description: 'Sisa organik basah terdedah mengundang lalat hijau menyebarkan bakteria berbahaya ke atas sisa makanan dan permukaan berdekatan dlm masa singkat.',
        descriptionEn: 'Exposed organic damp waste attracts blowflies to lay eggs and transmit fatal pathogen contaminations to proximate human environments quickly.',
        solution: 'Gunakan tong sampah berpenutup kedap udara, cuci bahagian dalam secara mingguan, dan gantikan beg plastik secara berkala.',
        solutionEn: 'Deploy tight airtight secure-lid bins, clean the interior container weekly, and refresh bag liners regularly.',
        quiz: {
          question: "Apakah lalat mekanikal utama pembawa keracunan makanan yang memindahkan patogen berbahaya dari sisa busuk ke makanan manusia?",
          questionEn: "Which mechanical vector fly is predominantly responsible for transmitting enteric pathogens from decaying organic waste to food?",
          options: [
            "Lalat Rumah (Musca domestica) & Lalat Hijau (Chrysomya megacephala)",
            "Nyamuk betina Anopheles stephensi murni pembawa malaria",
            "Lebah madu Apis mellifera pengumpul madu botani",
            "Rama-rama pemakan tumbuhan sayuran",
            "Lipas hitam kerdil penghuni pasir masin"
          ],
          optionsEn: [
            "Houseflies (Musca domestica) & Blowflies (Chrysomya megacephala)",
            "Anopheles stephensi female mosquitoes transmitting malaria",
            "Apis mellifera European honeybees collecting sweet nectar",
            "Common plant-eating cabbage butterflies",
            "Black dwarf roaches inhabiting salty sand dunes"
          ],
          correctIndex: 0,
          explanation: "Rerambut tarsal (tarsal bristles) pada kaki lalat Musca domestica secara tak langsung memindahkan Escherichia coli, Salmonella enterica, dan Vibrio cholerae daripada sampah organik ke hidangan makanan terbuka. Rujukan Sains: Wikipedia 'Housefly' & PubMed PMC4711667.",
          explanationEn: "The physical tarsal bristles of Musca domestica mechanically transfer enteric pathogens like Escherichia coli and Salmonella enterica directly from feces and decay to food surfaces. Source: Wikipedia 'Housefly' & PubMed PMC4711667."
        }
      },
      {
        id: 'spot-foodbox',
        name: 'Wadah Polisterin Terserak',
        nameEn: 'Polystyrene Food Boxes',
        left: 28,
        top: 80,
        width: 12,
        height: 10,
        hazard: 'Bekas Sampah Menadah Air Hujan',
        hazardEn: 'Static Rainfall Trapping Container',
        disease: 'Demam Denggi baru',
        diseaseEn: 'Dengue Vector Breeding risk output',
        description: 'Wadah makanan polisterin dibuang sewenang-wenangnya. Ia sangat ringan, kalis air dan bertahan lama di persekitaran, bertindak sebagai takungan mikro Aedes.',
        descriptionEn: 'Polystyrene food packaging is lightweight, fully waterproof, non-biodegradable, and persists for years trapping rainwater pockets for vectors.',
        solution: 'Kurangkan kegunaan polisterin plastik sekali guna, pastikan ia dipecahkan sebelum dilupuskan terus di tong sisa tertutup.',
        solutionEn: 'Refrain from using single-use polystyrene containers, crush before discard, and throw inside closed litter bins.',
        quiz: {
          question: "Mengapakah wadah polisterin terbiar bertindak sebagai tapak pembiakan mikro kontena yang sangat bahaya untuk nyamuk Aedes?",
          questionEn: "Why do discarded polystyrene (styrofoam) container segments represent a critical threat in container-breeding vector epidemics?",
          options: [
            "Ia kalis air, mengumpul air hujan statik ber-pH neutral, dan lambat mereput secara biologi",
            "Kerana ia membendung haba sejuk ekstrem membekukan pembiakan baka nyamuk",
            "Ia larut serta merta mengeluarkan wap tar organik bergas oksigen tulen",
            "Ia membekalkan nutrien serat selulosa yang diperlukan oleh telur burung perkicau",
            "Menapis air hujan menjadi ramuan racun masin bagi predator nyamuk"
          ],
          optionsEn: [
            "They are fully water-resistant, accumulate static neutral-pH rainwater, and resist biological degradation for decades",
            "Because they store absolute sub-zero temperatures that inhibit bacterial mold",
            "They dissolve instantly to generate organic tar fumes with pure oxygen bubbles",
            "They provide dense cellulose fiber nutrients necessary for nesting forest birds",
            "They chemically alter rainwater into deep salty blends that destroy natural predators"
          ],
          correctIndex: 0,
          explanation: "Polisterin kalis air dan bertahan berdekad-dekad tanpa mereput secara biologi, mengumpul takungan air hujan yang tenang ber-pH neutral tanpa arus, ideal untuk oviposisi dan inkubasi larva. Rujukan Sains: Wikipedia 'Polystyrene' & PubMed PMC10224445.",
          explanationEn: "Synthetic expanded polystyrene remains non-biodegradable for decades, preserving static neutral-pH rainwater pools protected from wind bioturbation, creating a premium sanctuary for container-breeding mosquitoes. Source: Wikipedia 'Polystyrene' & PubMed PMC10224445."
        }
      },
      {
        id: 'spot-gutter',
        name: 'Saluran Air Tersumbat',
        nameEn: 'Clogged Drainage Gutter',
        left: 5,
        top: 86,
        width: 90,
        height: 8,
        hazard: 'Sistem Saliran Air Organik Pekat Tersumbat',
        hazardEn: 'Organic Stagnant Gutter System',
        disease: 'Denggi / Demam Malaria / Leptospirosis baru',
        diseaseEn: 'Dengue / Malaria / Leptospirosis vector node',
        description: 'Gutter penuh minyak dan daun mereput menghentikan pengaliran air, menghasilkan lopak keruh berkuman amat disukai nyamuk culex dan lalat penghisap darah.',
        descriptionEn: 'Gutters choked with kitchen grease and leaves halt water flow. This converts the drain into a murky vector paradise for Culex, pest flies, and rodents.',
        solution: 'Lalukan silinder pembersihan drain secara mingguan, buang daun-daunan mereput serta buat penyelenggaraan saliran salis.',
        solutionEn: 'Flush drainage blockages weekly, extract composted leaves, to secure a healthy free-flowing system.',
        quiz: {
          question: "Apakah spesies nyamuk utama yang membiak rancak di dalam lopak air parit kotor tersumbat bercampur sisa minyak pepejal organik pekat?",
          questionEn: "Which major mosquito group prefers highly organic, dirty, heavily polluted stagnant water channels like clogged sewers and city drains?",
          options: [
            "Nyamuk Culex (pembawa herba Japanese Encephalitis & Filariasis)",
            "Nyamuk Anopheles (pembawa utama parasit Demam Malaria)",
            "Nyamuk Aedes aegypti murni",
            "Lipas pasir bertanduk hitam",
            "Nyamuk Mansonia pembawa dehidrasi akut"
          ],
          optionsEn: [
            "Culex mosquito genus (the key vector of Japanese Encephalitis & Filariasis)",
            "Anopheles genus (the primary vector of typical Malaria Parasite)",
            "Aedes aegypti (requires clean holding rain containers exclusively)",
            "Chariot horned sand-dwelling roaches",
            "Mansonia genus responsible for acute dehydration signs"
          ],
          correctIndex: 0,
          explanation: "Nyamuk Culex quinquefasciatus teradaptasi tinggi untuk membiak di dalam air tercemarnya sisa organik (nilai BOD tinggi) di mana larva menapis biofilm bakteria sekeliling sebagai diet utama. Rujukan Sains: Wikipedia 'Culex' & PubMed PMC3424365.",
          explanationEn: "Culex quinquefasciatus mosquitoes thrive in highly organic polluted waters with elevated biochemical oxygen demand (BOD) because larvae feed actively on microbial suspended biofilms. Source: Wikipedia 'Culex' & PubMed PMC3424365."
        }
      },
      {
        id: 'spot-tank',
        name: 'Tangki Air Lama Bocor',
        nameEn: 'Dilapidated Water Tank',
        left: 24,
        top: 18,
        width: 20,
        height: 28,
        hazard: 'Takungan Berkapasiti Tinggi Terdedah',
        hazardEn: 'High Volume Non-Secured Reservoir',
        disease: 'Denggi / Malaria baru',
        diseaseEn: 'Dengue / Malaria Outbreaks surveillance',
        description: 'Tangki air yang kehilangan penutup atas mendedahkan ratusan liter air statik tanpa pemangsa, membolehkan jutaan jentik-jentik menetas tanpa sebarang gangguan.',
        descriptionEn: 'Water tanks that lose their top lids expose massive reservoirs of static water. This acts as a giant breeding machine generating thousands of adult vectors.',
        solution: 'Tutup rapat dengan penutup logam kukuh, pasang skrin jejaring dawai halus, atau kosongkan tangki tidak digunakan.',
        solutionEn: 'Seal with secure metal alloy lids, apply custom mosquito nylon mesh, or drain completely if inactive.',
        quiz: {
          question: "Apakah kaedah biopemulihan terbaik untuk membunuh jejentik nyamuk dlm tangki air kelantangan besar tanpa racun kimia membahayakan pengguna?",
          questionEn: "What is the most effective biological remediation to control mosquito larvae in large industrial water container vaults?",
          options: [
            "Memperkenalkan ikan pemangsa jentik seperti Gupi (Poecilia reticulata)",
            "Menuang seliter minyak petrol ke atas air minuman komuniti",
            "Menukarkan tangki air menjadi takungan garam asid klorida bersuhu beku",
            "Mengecat permukaan air dengan sisa cat resin kalis serangga kimia",
            "Memasukkan bahan larutan herba herba penguat imun flora hiasan"
          ],
          optionsEn: [
            "Introduce predatory larvivorous fish species such as Guppies (Poecilia reticulata)",
            "Pouring a liter of petrol/diesel over household drinking water",
            "Transforming the container into frozen hydrochloric acid solutions",
            "Coating water surfaces with residual dry insect-resistant resin polymers",
            "Recharging the reservoir with botanical plant immune strengthening herbs"
          ],
          correctIndex: 0,
          explanation: "Ikan Poecilia reticulata (Gupi) bertindak sebagai agen biopemulihan terbaik membaham beratus-ratus larva nyamuk secara aktif sehari tanpa meracuni air kediaman manusia. Rujukan Sains: Wikipedia 'Poecilia reticulata' & PubMed PMC3225132.",
          explanationEn: "Poecilia reticulata (Guppies) consume up to 100 larvae daily, serving as a highly effective, non-chemical, pesticide-free biological vector control agent. Source: Wikipedia 'Poecilia reticulata' & PubMed PMC3225132."
        }
      },
      {
        id: 'spot-puddle',
        name: 'Lopak Lumpur Statik',
        nameEn: 'Static Muddy Puddle',
        left: 38,
        top: 76,
        width: 18,
        height: 10,
        hazard: 'Lopak Lumpur Rentan Urina Tikus',
        hazardEn: 'Contaminated Muddy Water Spot',
        disease: 'Penyakit Kencing Tikus (Leptospirosis)',
        diseaseEn: 'Leptospirosis (Weil\'s Disease)',
        description: 'Lopak air hujan di lekukan jalan yang tercemar dekomposisi organik dan air kencing tikus liar. Air bertakung ini menjadi sarang transmisi spiroseta Leptospira.',
        descriptionEn: 'Rainwater pooling on uneven muddy pavement contaminated by urban rodent debris. This static liquid acts as an open transmitter node for Leptospira spirochetes.',
        solution: 'Timbus jalan berlubang, baiki tar bagi mengelakkan lopak dilitupi kuman kencing tikus.',
        solutionEn: 'Fill road craters and fix pavements to avoid rainwater ponds storing rodent residues.',
        quiz: {
          question: "Bagaimanakah bakteria Leptospirosis masuk menembusi tubuh badan manusia dari air lopak banjir/air lumpur kotor?",
          questionEn: "How does the Leptospirosis spirochete infect and enter the human body from mud puddles or contaminated floods?",
          options: [
            "Melalui luka mikro terbuka pada kulit atau selaput mukosa mulut, mata, dan hidung",
            "Melalui gigitan nyamuk Aedes betina sahaja",
            "Disedut melalui wap pernafasan herba di pokok terdekat",
            "Melalui selaput kuku tangan sekiranya dibiarkan panjang",
            "Diserap secara magnetik melalui pakaian baldu berwarna gelap"
          ],
          optionsEn: [
            "Through minor skin scraps, cuts, or fine membranes of the mouth, eyes, and nasal passages",
            "Exclusively via typical Aedes female bite injections",
            "By breathing in floral vapors emitted from proximal trees",
            "Directly through the internal layers of overgrown fingernails",
            "Magnetically absorbed via heavy dark fabric materials"
          ],
          correctIndex: 0,
          explanation: "Bakteria spiroseta Leptospira bergerak aktif dalam cecair basah dan menyusup pantas melalui luka guris kulit halus (abrasions) atau konjunktiva mata. Rujukan: WHO & PubMed PMC3437554.",
          explanationEn: "Leptospira spirochetes are highly motile, swimming through static muddy waters to penetrate skin micro-abrasions or eyeball conjunctival layers. Source: WHO & PubMed PMC3437554."
        }
      },
      {
        id: 'spot-drum',
        name: 'Tong Besi Terbuka',
        nameEn: 'Open Metal Drum',
        left: 64,
        top: 50,
        width: 12,
        height: 22,
        hazard: 'Takungan Air Karat Berkelantangan Tinggi',
        hazardEn: 'High Capacity Rusting Oil Drum',
        disease: 'Demam Denggi / Chikungunya baru',
        diseaseEn: 'Dengue / Chikungunya Vectors surveillance',
        description: 'Tong drum logam berkarat menampung air hujan statik tinggi dlm tempoh lama. Tempat ini menghasilkan haba pemanasan optimum untuk jutaan pembiakan Aedes.',
        descriptionEn: 'Discarded metal oil drums catch deep volumes of stagnant rain water, acting as large-scale open vector spawning pools in dark urban corners.',
        solution: 'Terbalikkan dram besi kosong, atau pasangkan kepingan kanvas ketat anti-hujan.',
        solutionEn: 'Invert empty oil drums, or seal them completely using heavy waterproof canvas sheets.',
        quiz: {
          question: "Apakah nama racun larvasid serbuk yang diluluskan KKM untuk ditaburkan dlm bekas tangki/drum simpanan air bagi membunuh jejentik?",
          questionEn: "What chemical larvicide powder is globally approved to treat large-capacity storage drums to safely eliminate vector larvae?",
          options: [
            "Temephos (Serbuk Abate 1G)",
            "Natrium Bikarbonat kalsium karbonat",
            "Serbuk lada hitam herba pekat",
            "Klorida plumbum tebal beracun",
            "Ubat gegat naftalena berbentuk bebola"
          ],
          optionsEn: [
            "Temephos (Abate 1G organophosphate)",
            "Pure Sodium Bicarbonate baking powder",
            "Concentrated organic black pepper seed dust",
            "Industrial lead chloride powder",
            "Naphthalene mothball chunk formulations"
          ],
          correctIndex: 0,
          explanation: "Temephos (Abate) merupakan bahan organofosfat bertoksik rendah pada mamalia yang menyekat fungsi kolinesterase pada sel saraf jentik-jentik nyamuk. Rujukan: WHO Pesticide Specifications & Wikipedia.",
          explanationEn: "Temephos (Abate) is a low-dosage organophosphate that attacks the cholinesterase nervous enzymes in larvae with high safety margins for larger mammals. Source: WHO & Wikipedia."
        }
      },
      {
        id: 'spot-pipes',
        name: 'Kebocoran Paip Kumbahan',
        nameEn: 'Leaking Sewage Pipe',
        left: 3,
        top: 48,
        width: 12,
        height: 24,
        hazard: 'Aliran Cecair Organik Kumbahan Hitam',
        hazardEn: 'Leaking Rich Sewage Sewer Sump',
        disease: 'Kolera & Typhoid parit',
        diseaseEn: 'Cholera & Typhoid Enteritis hazard',
        description: 'Sumbatan kumbahan basah retak melepaskan air kotor pekat. Aliran ini kaya bakteria Vibrio cholerae yang menarik ribuan lalat menyampat patogen ke ruang kediaman dari parit.',
        descriptionEn: 'Sewage sumps cracked by root systems leak dense biological fluids rich in Salmonella enterica and Vibrio cholerae, drawing high swarms of mechanical vector flies.',
        solution: 'Tampal kebocoran saluran dengan pelekat kedap simen epoxy gred industri.',
        solutionEn: 'Patch sewage system leaks using industrial grade waterproof epoxy seals.',
        quiz: {
          question: "Apakah jenis jangkitan pepasangan patogen pembunuh usus (enteric pathogen) yang tersebar melalui jangkitan bakteria kolera?",
          questionEn: "Which severe enteric bacterium is responsible for Cholera spreads causing dehydrating watery diarrhea?",
          options: [
            "Vibrio cholerae",
            "Plasmodium falciparum parasit darah",
            "Mycobacterium tuberculosis parit",
            "Poxvirus variola cacar air",
            "Orientia tsutsugamushi selulosa"
          ],
          optionsEn: [
            "Vibrio cholerae bacterium",
            "Plasmodium falciparum parasite",
            "Mycobacterium tuberculosis rod",
            "Variola major smallpox virus",
            "Orientia tsutsugamushi pathogen"
          ],
          correctIndex: 0,
          explanation: "Vibrio cholerae mengeluarkan toksin kolera dlm usus kecil manusia, merangsang pengeluaran air cecair mendadak berbahaya. Rujukan: WHO & Wikipedia 'Cholera'.",
          explanationEn: "Vibrio cholerae produces cholera enterotoxin in the small intestines, evoking life-threatening dehydration outputs. Source: WHO & Wikipedia 'Cholera'."
        }
      },
      {
        id: 'spot-boxes',
        name: 'Longgokan Kadbod Basah',
        nameEn: 'Stacked Damp Cardboards',
        left: 14,
        top: 58,
        width: 16,
        height: 18,
        hazard: 'Kelembapan Selulosa & Sarang Lipas',
        hazardEn: 'High Humidity Cellulose Roach Nest',
        disease: 'Salmonellosis / Alergi Dermatitis baru',
        diseaseEn: 'Salmonella & Dermatitis Allergens outfall',
        description: 'Timbunan kertas dan kotak kadbod basah di lorong sempit mengalami pereputan selulosa hangat, menggayakan kediaman ratusan koloni lipas pembawa kuman.',
        descriptionEn: 'Discarded wet cardboard boxes absorb humidity, creating a moldy fiber nest that harbors large colonies of Blatella germanica roaches spreading enteric pathogens.',
        solution: 'Kitar semula kadbod basah, dedahkan ruang agar tiada longgokan kertas bertimbun merayap.',
        solutionEn: 'Recycle damp cardboard sheets immediately and maintain clear dry floors to deter cockroach nests.',
        quiz: {
          question: "Apakah jenis patogen keracunan yang dipindahkan oleh serangga lipas (Roaches) ke hidangan manusia dari longgokan terserak kotor ini?",
          questionEn: "What is the primary mode of food contamination triggered by pest cockroaches running from damp trash sites?",
          options: [
            "Memindahkan patogen seperti Salmonella dan Escherichia coli secara sentuhan kotor badannya",
            "Menyuntik racun neurotoksin aktif ke permukaan nasi dingin",
            "Memakan seluruh sisa hidangan keluarga sehingga bertukar warna hijau",
            "Membebaskan gas sulfur dioksida berasid tinggi yang meracun udara dapur",
            "Menyebarkan bebola spora cacing pita terbang secara aktif ditiup angin"
          ],
          optionsEn: [
            "Mechanically transferring Salmonella enterica & E. coli bacterias via contaminated body plates and fecal deposits",
            "Injecting direct neurotoxic venom into raw food structures",
            "Ingesting entire human meal plates until they change chemical colors",
            "Releasing highly toxic sulfur dioxide gases over dinner areas",
            "Spreading airborne tropical tapeworm spores via active wind carrying"
          ],
          correctIndex: 0,
          explanation: "Lipas merupakan vektor mekanikal. Badannya mengumpul patogen Salmonella dlm usus dan daki kaki, memindahkannya ketika merayap dlm dapur. Rujukan: PubMed PMC5392237.",
          explanationEn: "Cockroaches (Blattodea) accumulate pathogens like Salmonella within their crop/feet and mechanically drag them to food preparation plates. Source: PubMed PMC5392237."
        }
      },
      {
        id: 'spot-bag',
        name: 'Beg Sampah Robek Bekas',
        nameEn: 'Torn Rubbish Garbage Bag',
        left: 46,
        top: 68,
        width: 14,
        height: 14,
        hazard: 'Tumpahan Cecair Lindi Busuk Berbakteria',
        hazardEn: 'Leachate Liquid Spill & Fly Infestation risk',
        disease: 'Dysentery / Keracunan Makanan tegar',
        diseaseEn: 'Dysentery / Enteric Pathogen breakout risk',
        description: 'Beg plastik hitam koyak menyebarkan cecair lindi berasid teruk (leachate). Bau busuk bertindak memanggil ribuan lalat hijau bertelur dan menyebarkan jangkitan usus.',
        descriptionEn: 'Torn plastic garbage bags leak sour acidic leachate pools, creating a dense biological soup that attracts blowflies to multiply and spread Shigella dysentery.',
        solution: 'Sangku beg sampah dlm tong besi tertutup rapat bagi mengelak dirobek binatang jalanan.',
        solutionEn: 'Store waste bags inside fully closed metallic rigid bins to block stray animal access and prevent tearing.',
        quiz: {
          question: "Apakah patogen mikrob penyebab penyakit demam disentri berdarah (Dysentery) yang kerap dipindahkan oleh lalat dari tumpahan sisa bau busuk?",
          questionEn: "Which highly infectious bacterium causes bacillary dysentery (severe bloody diarrhea) transmitted by flies feeding on garbage leachate?",
          options: [
            "Shigella dysenteriae",
            "Corynebacterium diphtheriae saluran pernafasan",
            "Clostridium tetani anaerobik racun",
            "Streptococcus pneumoniae kuman paru-paru",
            "Plasmodium vivax malaria sejuk gila"
          ],
          optionsEn: [
            "Shigella dysenteriae bacterium",
            "Corynebacterium diphtheriae respiratory rod",
            "Clostridium tetani anaerobic lockjaw toxin",
            "Streptococcus pneumoniae bacterial pneumonia",
            "Plasmodium vivax malaria protozoan"
          ],
          correctIndex: 0,
          explanation: "Bakteria Shigella dysenteriae menyebabkan disentri basilaris berbahaya dengan dos jangkitan sangat rendah (sekecil 10 bakteria boleh menjangkiti manusia). Rujukan: WHO & Wikipedia.",
          explanationEn: "Shigella dysenteriae has an extremely low infectious dose (as few as 10 organisms), causing violent bloody diarrhea when flies transfer bacteria to food. Source: WHO & Wikipedia."
        }
      }
    ]
  }
];

// --- QUIZ OPTION SHUFFLER UTILITY ---
function shuffleQuizOptions(quiz: HuntQuiz): HuntQuiz {
  const numOptions = quiz.options.length;
  // create array of indices [0, 1, ..., numOptions - 1]
  const indices = Array.from({ length: numOptions }, (_, i) => i);
  
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  
  const shuffledOptions = indices.map(idx => quiz.options[idx]);
  const shuffledOptionsEn = indices.map(idx => quiz.optionsEn[idx]);
  const newCorrectIndex = indices.indexOf(quiz.correctIndex);
  
  return {
    ...quiz,
    options: shuffledOptions,
    optionsEn: shuffledOptionsEn,
    correctIndex: newCorrectIndex === -1 ? 0 : newCorrectIndex
  };
}

// --- CITATION LINK PARSER UTILITY ---
function renderExplanationWithLinks(text: string, isMalay: boolean) {
  if (!text) return null;

  // Split on matches of PubMed PMC, Wikipedia citations, WHO or CDC mentions
  const regex = /(PubMed\s+PMC\d+|Pubmed\s+PMC\d+|PMC\d+|Wikipedia\s+'[^']+'|Wikipedia\s+"[^"]+"|\bWikipedia\b|WHO\s+Entomology\s+Guide|WHO\s+Vector\s+Control\s+Manual|WHO\s+Guidelines|CDC\s+Guidelines|CDC\s+Vector\s+Control)/gi;

  const parts = text.split(regex);
  if (parts.length === 1) {
    return text;
  }

  return parts.map((part, index) => {
    // Check for PubMed/PMC match
    const pmcMatch = part.match(/(?:PubMed\s+PMC|Pubmed\s+PMC|PMC)(\d+)/i);
    if (pmcMatch) {
      const pmcId = pmcMatch[1];
      const url = `https://pmc.ncbi.nlm.nih.gov/articles/PMC${pmcId}/`;
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          referrerPolicy="no-referrer"
          rel="noopener noreferrer"
          className="text-amber-400 hover:text-amber-300 underline font-semibold inline-flex items-center gap-0.5"
          title={isMalay ? `Buka rujukan kajian saintifik PMC${pmcId} di NCBI` : `Open NCBI scientific research PMC${pmcId}`}
        >
          {part}
          <span className="text-[9px] leading-none shrink-0">↗</span>
        </a>
      );
    }

    // Check for Wikipedia 'topic'
    const wikiMatch = part.match(/Wikipedia\s+['"]([^'"]+)['"]/i);
    if (wikiMatch) {
      const topic = wikiMatch[1];
      const lang = isMalay ? 'ms' : 'en';
      const formattedTopic = encodeURIComponent(topic.trim().replace(/\s+/g, '_'));
      const url = `https://${lang}.wikipedia.org/wiki/${formattedTopic}`;
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          referrerPolicy="no-referrer"
          rel="noopener noreferrer"
          className="text-teal-400 hover:text-teal-300 underline font-semibold inline-flex items-center gap-0.5"
          title={isMalay ? `Lihat ensiklopedia Wikipedia untuk "${topic}"` : `View Wikipedia article for "${topic}"`}
        >
          {part}
          <span className="text-[9px] leading-none shrink-0">↗</span>
        </a>
      );
    }

    // Check for WHO and CDC guidelines
    const isWho = /WHO\s+(?:Entomology\s+Guide|Vector\s+Control\s+Manual|Guidelines)/i.test(part);
    if (isWho) {
      const url = 'https://www.who.int/teams/control-of-neglected-tropical-diseases/vector-ecology-and-management';
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          referrerPolicy="no-referrer"
          rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-300 underline font-semibold inline-flex items-center gap-0.5"
          title="World Health Organization Vector Ecology"
        >
          {part}
          <span className="text-[9px] leading-none shrink-0">↗</span>
        </a>
      );
    }

    const isCdc = /CDC\s+(?:Guidelines|Vector\s+Control)/i.test(part);
    if (isCdc) {
      const url = 'https://www.cdc.gov/mosquitoes/index.html';
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          referrerPolicy="no-referrer"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300 underline font-semibold inline-flex items-center gap-0.5"
          title="CDC Mosquito Vector Division"
        >
          {part}
          <span className="text-[9px] leading-none shrink-0">↗</span>
        </a>
      );
    }

    // Check for general Wikipedia
    if (/Wikipedia/i.test(part)) {
      const lang = isMalay ? 'ms' : 'en';
      const url = `https://${lang}.wikipedia.org/`;
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          referrerPolicy="no-referrer"
          rel="noopener noreferrer"
          className="text-teal-400 hover:text-teal-300 underline font-semibold inline-flex items-center gap-0.5"
        >
          {part}
          <span className="text-[9px] leading-none shrink-0">↗</span>
        </a>
      );
    }

    return part;
  });
}

export interface AedesHuntGameProps {
  sessions?: AnalysisSession[];
}

export const AedesHuntGame: React.FC<AedesHuntGameProps> = ({ sessions }) => {

  const { language, t } = useLanguage();
  const isMalay = language === 'ms';

  // State Management
  const [activeScene, setActiveScene] = useState<GameScene>(PRESET_SCENES[0]);
  const [isAiMode, setIsAiMode] = useState<boolean>(false);
  
  // Custom uploaded image state
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [cleanImage, setCleanImage] = useState<string | null>(null);
  const [customSpots, setCustomSpots] = useState<HuntSpot[]>([]);
  const [isAiScanning, setIsAiScanning] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Active playing spots state
  const [foundSpots, setFoundSpots] = useState<string[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<HuntSpot | null>(null);
  const [quizFailedAttempts, setQuizFailedAttempts] = useState<Record<string, number[]>>({});
  const [score, setScore] = useState<number>(0);
  const [gameCompleted, setGameCompleted] = useState<boolean>(false);
  const [showClues, setShowClues] = useState<boolean>(false);
  const [isViewCleanWhole, setIsViewCleanWhole] = useState<boolean>(false);

  const [showSessionPrompt, setShowSessionPrompt] = useState<boolean>(true);
  const [sessionScenes, setSessionScenes] = useState<GameScene[]>([]);
  const hasPopulatedSessions = useRef(false);

  // Generate scenes from sessions
  useEffect(() => {
    if (sessions && sessions.length > 0 && !hasPopulatedSessions.current) {
      const parsedScenes: GameScene[] = [];
      sessions.forEach(session => {
        if (session.result && session.result.risks && session.result.risks.length > 0) {
          const spots: HuntSpot[] = session.result.risks.map((risk, index) => {
            // Convert bounding box (0-1000 scale) to percentage (0-100) for left, top, width, height
            const width = Math.max(0, risk.box_2d.xmax - risk.box_2d.xmin) / 10;
            const height = Math.max(0, risk.box_2d.ymax - risk.box_2d.ymin) / 10;
            const left = risk.box_2d.xmin / 10;
            const top = risk.box_2d.ymin / 10;

            const baseSpot: HuntSpot = {
              id: `session-spot-${session.id}-${index}`,
              name: risk.label,
              nameEn: risk.label,
              left: Math.min(Math.max(left, 0), 100),
              top: Math.min(Math.max(top, 0), 100),
              width: Math.min(Math.max(width, 2), 100),
              height: Math.min(Math.max(height, 2), 100),
              hazard: risk.description,
              hazardEn: risk.description,
              disease: risk.disease,
              diseaseEn: risk.disease,
              description: risk.description,
              descriptionEn: risk.description,
              solution: risk.solution,
              solutionEn: risk.solution,
            };

            // Enhance with AI quiz if we have enough risk text
            baseSpot.quiz = {
              question: `Apakah langkah pembasmian paling sesuai untuk risiko "${risk.label}"?`,
              questionEn: `What is the most appropriate remedy for the risk "${risk.label}"?`,
              options: [
                risk.solution,
                "Mengabaikan kawasan tersebut untuk kering secara semula jadi bersama angin",
                "Menyiram air paip bersih untuk mengalirkan sisa secara mekanikal",
                "Menimbus kotoran menggunakan serpihan pasu untuk estetik taman",
                "Membakar plastik atau sampah terbuka berdekatan tanpa kawalan keselamatan"
              ],
              optionsEn: [
                risk.solution,
                "Ignoring the area to dry naturally via wind exposure",
                "Spraying tap water to flush the waste out mechanically",
                "Burying the debris using ceramic fragments for garden aesthetics",
                "Burning open plastic clusters blindly nearby without security limits"
              ],
              correctIndex: 0,
              explanation: `Gorgon Hamsay Akan Berkata: ${risk.solution}. ${risk.savageCommentary || risk.description}`,
              explanationEn: `Analysis: ${risk.solution}. ${risk.savageCommentary || risk.description}`
            };

            return baseSpot;
          });

          parsedScenes.push({
            id: `session-scene-${session.id}`,
            title: `Analisis Papan Bukti Harian - ${session.fileName || 'Imej Pengguna'}`,
            titleEn: `Evidence Board Scan - ${session.fileName || 'User Image'}`,
            image: session.imageSrc,
            cleanImage: session.simulationImage || session.imageSrc,
            spots: spots
          });
        }
      });
      // Only set showSessionPrompt if we have valid scenes parsed
      if (parsedScenes.length > 0) {
        setSessionScenes(parsedScenes);
        setShowSessionPrompt(true);
      } else {
        setShowSessionPrompt(false);
      }
      hasPopulatedSessions.current = true;
    } else if (!sessions || sessions.length === 0) {
      setShowSessionPrompt(false);
    }
  }, [sessions]);

  const allAvailableScenes = [...PRESET_SCENES, ...sessionScenes];
  const [shuffledActiveSpots, setShuffledActiveSpots] = useState<HuntSpot[]>([]);

  useEffect(() => {
    let spotsToShuffle = isAiMode ? customSpots : activeScene.spots;
    const processed = spotsToShuffle.map(spot => {
      if (spot.quiz) {
        return {
          ...spot,
          quiz: shuffleQuizOptions(spot.quiz)
        };
      }
      return spot;
    });
    setShuffledActiveSpots(processed);
  }, [isAiMode, activeScene, customSpots]);

  // Animation sparkling state when clicked
  const [sparklePos, setSparklePos] = useState<{ x: number; y: number } | null>(null);

  // Image zoom magnify helper inside the game viewport
  const [isHoverLens, setIsHoverLens] = useState<boolean>(false);
  const [xyCoord, setXyCoord] = useState<[number, number]>([0, 0]);
  const [clientXy, setClientXy] = useState<[number, number]>([0, 0]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset Game function
  const resetGame = useCallback((sceneToSet: GameScene, useCustom = false) => {
    playSound('tap');
    setShowClues(false);
    setIsViewCleanWhole(false);
    setQuizFailedAttempts({});
    if (useCustom) {
      setFoundSpots([]);
      setSelectedSpot(null);
      setScore(0);
      setGameCompleted(false);
    } else {
      setActiveScene(sceneToSet);
      setFoundSpots([]);
      setSelectedSpot(null);
      setScore(0);
      setGameCompleted(false);
    }
  }, []);

  // Handle Preset Selection
  const handleSceneChange = (sceneId: string) => {
    const scene = allAvailableScenes.find(s => s.id === sceneId);
    if (scene) {
      setIsAiMode(false);
      resetGame(scene);
    }
  };

  // Trigger Custom Image Upload & Analysis via Gemini
  const handleCustomImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsAiScanning(true);
    setAiError(null);
    playSound('tap');

    try {
      const { base64, mimeType, preview } = await resizeAndCompressImage(file);
      if (!base64 || !preview) throw new Error("Gagal memproses gambar.");

      setCustomImage(preview);
      setCleanImage(null); // Reset optional clean overlay
      setIsAiMode(true);
      setFoundSpots([]);
      setSelectedSpot(null);
      setScore(0);
      setGameCompleted(false);

      // Initialize Gemini Client
      const ai = getAIClient();
      const cleanBase64 = base64.split(',')[1] || base64;

      const prompt = `Anda adalah saintis Entomologi Kesihatan Awam KKM dalam permainan edukasi 'Vector Detective'. Sila analisa foto yang dimuatnaik ini secara ekstrem (TAHAP SARINGAN TINGGI/EXTREME SCANNERS ALERT).
Cari dan kenal pasti 3 hingga 5 barang atau sudut berpotensi tinggi untuk pembiakan nyamuk (Aedes/Culex), pembiakan tikus pemusnah, lalat hijau, lipas, atau pembentukan kulat permukaan toksik (surface fungi) dan jangkitan bakteria basah (pathogens like Leptospira, Salmonella, Vibrio).
Tandakan herba daun mereput, lekukan plastik terserak, botol pecah, takungan kedinginan ac, parit sumbat, atau longgokan sampah basah sebagai ancaman biologi tegar.
Wajib berikan koordinat kotak sempadan objek (bounding box) dlm format peratusan (0-100) berasaskan saiz visual gambar. xmin ialah jarak peratus dari kiri, ymin peratus jarak dari atas, dsb.

Format maklum balas WAJIB mengikut struktur JSON ini sahaja tanpa sebarang penjelasan markdown biasa di luar teks JSON:
{
  "spots": [
    {
      "id": "custom-spot-1",
      "name": "Nama Objek dlm BM (e.g. Takungan Sampah Organik Lembap)",
      "nameEn": "Nama Objek dlm EN (e.g. Damp Uncovered Organic Rubbish Pile)",
      "left": 40,  // peratus xmin mula (0-100)
      "top": 50,   // peratus ymin mula (0-100)
      "width": 15, // peratus lebar kotak (xmax - xmin, mestilah angka positif 5 hingga 35)
      "height": 15,// peratus tinggi kotak (ymax - ymin, mestilah angka positif 5 hingga 35)
      "hazard": "Jenis Bahaya Ekstrem di BM (e.g. Pembiakan Pathogen Leptospira & Spora Kulat Hitam)",
      "hazardEn": "Jenis Bahaya Ekstrem di EN (e.g. Leptospira Pathogen Incubator & Toxic Surface Mold)",
      "disease": "Pathogen & Penyakit di BM (e.g. Kencing Tikus (Leptospirosis) & Alergi Spora Mycosis)",
      "diseaseEn": "Pathogen & Penyakit di EN (e.g. Leptospirosis & Fungal Spores Allergen)",
      "description": "Huraian sains perubatan & entomologi mendalam dlm BM mengapa sudut ini habitat vektor tikus/lipas/nyamuk & pathogen patologis bersangkut paut.",
      "descriptionEn": "Huraian mendalam biologi kesihatan awam dlm EN.",
      "solution": "Cara sanitasi ekstrem disyorkan KKM dlm BM (e.g. Sembur cecair disinfektan klorin, buang habuk sisa, dedahkan cahaya UV matahari)",
      "solutionEn": "Cara sanitasi dlm EN",
      "quiz": {
        "question": "Soalan kuiz pendidikan patogen/spesies bersesuaian dlm BM (pilihan objektif berkaitan objek/patogen dikesan)?",
        "questionEn": "Science pathogen/vector educational quiz question in EN?",
        "options": ["Pilihan A (Jawapan Betul)", "Pilihan B", "Pilihan C", "Pilihan D", "Pilihan E"],
        "optionsEn": ["Option A (Correct Answer)", "Option B", "Option C", "Option D", "Option E"],
        "correctIndex": 0, // Indeks jawapan yang betul kekal 0 hingga 4
        "explanation": "Ulasan ulasan jawapan sains perubatan berkesan dlm BM...",
        "explanationEn": "Detailed health science feedback in EN..."
      }
    }
  ]
}`;

      const textResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: cleanBase64 } }
            ]
          }
        ]
      });

      const text = textResponse.text || "{}";
      const cleanedJsonText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanedJsonText);

      if (parsed && Array.isArray(parsed.spots) && parsed.spots.length > 0) {
        // Sanitize coordinates to make sure they are within bounds
        const formatted: HuntSpot[] = parsed.spots.map((s: any, idx: number) => {
          // Dynamic quiz verification setup
          const quizOb = s.quiz ? {
            question: s.quiz.question || "Apakah tindakan kebersihan awam termulia untuk meneutralkan sarang ini?",
            questionEn: s.quiz.questionEn || "What represent the best health practice to neutralize this nest?",
            options: Array.isArray(s.quiz.options) && s.quiz.options.length === 5 ? s.quiz.options : [
              "Sanitasi menyeluruh dan pengaliran udara kering matahari",
              "Membiarkan kelembapan terus membiakkan koloni kuman",
              "Menapis air suling tanpa menggosok permukaannya",
              "Menimbun sampah hiasan baharu di atasnya",
              "Membakar plastik tanpa menguruskan punca sisa takungan"
            ],
            optionsEn: Array.isArray(s.quiz.optionsEn) && s.quiz.optionsEn.length === 5 ? s.quiz.optionsEn : [
              "Thorough sanitation and air drying via solar UV sunlight",
              "Leave the dampness to continue incubating bacterial colonies",
              "Filter static rain water without brushing physical container walls",
              "Pile active new garbage clusters over current nodes",
              "Incinerate single-use plastics without managing the source pool"
            ],
            correctIndex: typeof s.quiz.correctIndex === 'number' ? Math.max(0, Math.min(4, s.quiz.correctIndex)) : 0,
            explanation: s.quiz.explanation || "Menyingkirkan punca takungan dan kotoran basah menyahaktifkan sisa hidup patogen terus.",
            explanationEn: s.quiz.explanationEn || "Extracting damp nests completely dehydrates and deactivates residual pathogen cycles."
          } : {
            question: "Apakah kaedah terbaik menyahaktifkan takungan jangkitan mikrob kuman di parit/bekas terserak ini?",
            questionEn: "What represents the safest option to deactivate microclimatic pathogens in static water/litters?",
            options: [
              "Melakukan semburan klorin disinfektan atau menuang ejen larvasid anti-larva",
              "Memendapkan takunan lumpur basah lama hingga kering separuh",
              "Menutup kawasan terjejas dengan helaian plastik hitam kedap udara tanpa serbuk Abate",
              "Menyiram air paip biasa berulang kali tanpa saliran keluar",
              "Membiarkan sistem parit tersumbat mengalir sendiri secara mekanikal"
            ],
            optionsEn: [
              "Execute chlorine disinfectant spray or apply anti-larvae larvicide agents",
              "Let the static damp sludge pool dry up half-way naturally",
              "Cover the affected nodes with airtight black trash wraps without Abate larvicide",
              "Drench static spots in regular tap water without constructing exit drainage holes",
              "Allowing the clogged drainage to self-clean dynamically without treatment"
            ],
            correctIndex: 0,
            explanation: "Semburan disinfektan klorin menyembuhkan takungan dengan mematikan dinding sel spora kulat dan hidupan kuman patogen.",
            explanationEn: "Chlorine disinfectants break cellular wraps, destroying fungal molds and active micro pathogens instantly."
          };

          return {
            id: s.id || `custom-spot-${idx}-${Date.now()}`,
            name: s.name || 'Permukaan Tercemar',
            nameEn: s.nameEn || 'Contaminated Surface',
            left: Math.max(2, Math.min(90, Number(s.left))),
            top: Math.max(2, Math.min(90, Number(s.top))),
            width: Math.max(8, Math.min(40, Number(s.width))),
            height: Math.max(8, Math.min(40, Number(s.height))),
            hazard: s.hazard || 'Kawasan Lembap Sakit & Sisa Patogen',
            hazardEn: s.hazardEn || 'Sick Damp Area & Pathogen Residues',
            disease: s.disease || 'Jangkitan Makhluk Vektor & Patogen',
            diseaseEn: s.diseaseEn || 'Vector Pest & Pathogen Infection',
            description: s.description || 'Kawasan terserak ini membenarkan air bertakung, pertumbuhan kulat permukaan lebam, serta pembiakan lipas pemusnah/vektor tikus liar.',
            descriptionEn: s.descriptionEn || 'This scattered area retains static humidity, grows surface fungal colonies, and triggers pest/rodent shelters.',
            solution: s.solution || 'Singkirkan habuk, sembur cecair disinfektan pemati kuman, dedahkan kepada matahari, serta rawat dengan larvasid.',
            solutionEn: s.solutionEn || 'Purge litter contents, spray microdisinfectant chemical treatments, expose to direct solar paths, and dry completely.',
            quiz: quizOb
          };
        });
        setCustomSpots(formatted);
        playSound('success');
      } else {
        throw new Error("Tiada sasaran jentik-jentik atau vektor ditemui oleh AI. Sila cuba gambar lain yang lebih terperinci!");
      }
    } catch (err: any) {
      console.error(err);
      setAiError(isMalay ? `Eror: ${err.message || 'Gagal menganalisa sampel'}` : `Error: ${err.message || 'Failed to scan sample'}`);
      playSound('error');
    } finally {
      setIsAiScanning(false);
    }
  };

  const handleCleanImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playSound('tap');
    try {
      const { preview } = await resizeAndCompressImage(file);
      if (!preview) throw new Error("Gagal memproses gambar bersih.");
      setCleanImage(preview);
      playSound('success');
    } catch (err: any) {
      console.error(err);
      alert(isMalay ? "Gagal memodulasi gambar bersih." : "Failed to load clean canvas.");
    }
  };

  // Instant full-sanitization bypass (Auto-solve cheat helper)
  const handleSanitizeAll = () => {
    playSound('win');
    const allIds = activeSpots.map(s => s.id);
    setFoundSpots(allIds);
    setScore(allIds.length * 20);
    setGameCompleted(true);
    if (activeSpots.length > 0) {
      setSelectedSpot(activeSpots[0]);
    }
  };

  // Handle Clicking on a Target Zone
  const handleSpotClick = (spot: HuntSpot, e: React.MouseEvent<HTMLDivElement>) => {
    playSound('tap');
    setSelectedSpot(spot);

    // Capture click offset inside target container for sparkles
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const xClick = e.clientX - rect.left;
      const yClick = e.clientY - rect.top;
      setSparklePos({ x: xClick, y: yClick });
      setTimeout(() => setSparklePos(null), 1000);
    }

    // Scroll down to the question/detail card section smoothly
    setTimeout(() => {
      const element = document.getElementById('spot-detail-card');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 120);
  };

  // Handle Quiz Submission
  const handleQuizAnswerSubmit = (spot: HuntSpot, index: number) => {
    if (foundSpots.includes(spot.id)) return;

    // Use correctIndex from spot.quiz, default to 0
    const correctIndex = spot.quiz?.correctIndex ?? 0;
    const isCorrect = index === correctIndex;

    if (isCorrect) {
      playSound('sparkle');
      playSound('success');
      
      const updatedFound = [...foundSpots, spot.id];
      setFoundSpots(updatedFound);
      setScore(prev => prev + 30); // 30 points for CORRECT quiz answer & sanitization!
      
      // Check win condition
      const totalToFind = activeSpots.length;
      if (updatedFound.length === totalToFind) {
        setTimeout(() => {
          setGameCompleted(true);
          playSound('win');
        }, 800);
      }
    } else {
      playSound('error');
      // Record failed option
      setQuizFailedAttempts(prev => ({
        ...prev,
        [spot.id]: [...(prev[spot.id] || []), index]
      }));
      setScore(prev => Math.max(0, prev - 5)); // penalty of 5 points for incorrect diagnosis!
    }
  };

  const activeSpots = shuffledActiveSpots;
  const progressPercent = activeSpots.length > 0 
    ? Math.round((foundSpots.length / activeSpots.length) * 100) 
    : 0;

  // Track cursor coordinates for visual cursor lens
  const handleMouseMoveOrTouch = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    let isTouch = false;
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      isTouch = true;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setXyCoord([x, y]);
    setClientXy([clientX, clientY]);
  };

  const renderSelectedSpotDetail = () => {
    if (!selectedSpot) {
      return (
        /* Idle Sidebar waiting for first user click action */
        <div id="spot-detail-card" className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-6 text-center min-h-[300px] flex flex-col items-center justify-center">
          <span className="text-4xl mb-3 animate-pulse">🎯</span>
          <h4 className="text-sm font-sci-fi font-bold text-slate-400 uppercase tracking-widest mb-2">
            {isMalay ? 'SEDANG MENGUMPUL BUKTI' : 'SEARCH ACTIVE'}
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed max-w-[240px]">
            {isMalay 
              ? 'Guna kanta pembesar terapung dan cari bintik-bintik pembiakan di sebelah kiri. Maklumat saringan perubatan akan muncul di sini.' 
              : 'Tap on potential breeding markers in the screen view. Detailed vector information will populate this dock.'}
          </p>
        </div>
      );
    }

    const isFound = foundSpots.includes(selectedSpot.id);
    const failedList = quizFailedAttempts[selectedSpot.id] || [];

    return (
      /* Educational Card showing current selected object details & quiz */
      <motion.div 
        id="spot-detail-card"
        key={selectedSpot.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col gap-4"
      >
        {/* Colored Top Bar */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
          isFound ? 'from-emerald-500 to-teal-400' : 'from-red-500 to-amber-500'
        }`}></div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xl font-sci-fi font-bold text-white uppercase tracking-wider">
              {isMalay ? selectedSpot.name : selectedSpot.nameEn}
            </h4>
            <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 transition border ${
              isFound 
                ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400' 
                : 'bg-red-950/50 border-red-500/30 text-red-400'
            }`}>
              {isMalay ? selectedSpot.disease : selectedSpot.diseaseEn}
            </span>
          </div>
          <p className="text-[10px] text-amber-400 font-mono tracking-widest mt-1 uppercase flex items-center gap-1">
            <span>💀</span> {isMalay ? selectedSpot.hazard : selectedSpot.hazardEn}
          </p>
        </div>

        <div className="border-t border-slate-800/80 pt-3">
          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{isMalay ? 'KENAPA SANGAT BAHAYA?' : 'WHY IS THIS DANGEROUS?'}</h5>
          <p className="text-xs text-slate-300 leading-relaxed font-light">
            {isMalay ? selectedSpot.description : selectedSpot.descriptionEn}
          </p>
        </div>

        {/* KKM Sanitation Action Guideline */}
        <div className="bg-emerald-950/10 border border-emerald-500/10 rounded-2xl p-3">
          <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1">
            <span>🚀</span> {isMalay ? 'CARA SANITASI DISUNTIK' : 'KKM SANITATION PROTOCOL'}
          </h5>
          <p className="text-xs text-emerald-200/90 leading-relaxed">
            {isMalay ? selectedSpot.solution : selectedSpot.solutionEn}
          </p>
        </div>

        {/* Pathogen quiz question panel */}
        {selectedSpot.quiz && (
          <div className="border-t border-slate-800/80 pt-3">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                {isMalay ? '🔬 UJIAN DIAGNOSIS PATOGEN' : '🔬 PATHOGEN DIAGNOSIS QUIZ'}
              </h5>
              <span className={`font-mono text-[8px] px-1.5 py-0.5 rounded uppercase font-bold ${
                isFound ? 'bg-emerald-500 text-black' : 'bg-amber-500/20 text-amber-400 animate-pulse'
              }`}>
                {isFound ? (isMalay ? 'SELESAI' : 'VERIFIED') : (isMalay ? 'DIPERLUKAN' : 'LOCKED')}
              </span>
            </div>

            {/* Quiz Question Box */}
            <div className="bg-slate-950/80 border border-slate-800/60 p-3.5 rounded-2xl mb-3">
              <p className="text-xs text-white leading-relaxed font-semibold">
                {isMalay ? selectedSpot.quiz.question : selectedSpot.quiz.questionEn}
              </p>
            </div>

            {/* Render option list based on found validation status */}
            {!isFound ? (
              <div className="flex flex-col gap-2">
                {(isMalay ? selectedSpot.quiz.options : selectedSpot.quiz.optionsEn).map((opt, oIdx) => {
                  const isFailed = failedList.includes(oIdx);
                  return (
                    <button
                      key={oIdx}
                      disabled={isFailed}
                      onClick={() => handleQuizAnswerSubmit(selectedSpot, oIdx)}
                      className={`w-full text-left text-xs p-3 rounded-xl border transition-all flex items-start gap-2 ${
                        isFailed
                          ? 'bg-red-950/15 border-red-900/40 text-red-400 line-through cursor-not-allowed opacity-60'
                          : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-indigo-500/60 shadow-sm'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5 ${
                        isFailed ? 'bg-red-500 text-black' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isFailed ? '✗' : String.fromCharCode(65 + oIdx)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Correct state: Showcase biological feedback of the pathogen */
              <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-4.5">
                <div className="flex items-center gap-1 text-xs font-bold text-indigo-400 mb-1.5 uppercase">
                  <span>✅</span> {isMalay ? 'ULASAN PAKAR VEKTOR' : 'VECTOR EXPERT DISCOVERY'}
                </div>
                <p className="text-xs text-indigo-200/90 leading-relaxed italic">
                  {renderExplanationWithLinks(isMalay ? selectedSpot.quiz.explanation : selectedSpot.quiz.explanationEn, isMalay)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Micro educational validation token info */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-[10px] text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <span>SYSTEM CODE:</span>
            <span className="text-slate-400">DETECTIVE_SCAN_ALERT</span>
          </span>
          <span className={`font-bold uppercase ${
            isFound ? 'text-emerald-400' : 'text-amber-500 animate-pulse'
          }`}>
            {isFound ? 'STATUS_RESOLVED_CONFIRMED' : 'WAITING_BIOLOGICAL_DIAGNOSIS'}
          </span>
        </div>
      </motion.div>
    );
  };

  return (
    <div id="aedes-detector-game" className="bg-slate-950 border border-slate-800 text-slate-200 p-4 rounded-3xl w-full max-w-7xl mx-auto shadow-2xl relative overflow-hidden backdrop-blur-md">
      
      {showSessionPrompt && sessionScenes.length > 0 && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md rounded-3xl">
           <div className="bg-slate-900 border border-emerald-500/50 p-6 sm:p-8 rounded-3xl max-w-xl text-center shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-fade-in-up">
             <div className="text-5xl mb-4 animate-bounce">🗂️</div>
             <h3 className="text-xl sm:text-2xl font-sci-fi font-bold text-emerald-400 mb-2 uppercase tracking-wide">
                {isMalay ? 'KES DARI PAPAN BUKTI DIKESAN' : 'EVIDENCE BOARD SCANS DETECTED'}
             </h3>
             <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                {isMalay 
                  ? 'Kami mendapati anda mempunyai hasil kerja imbasan yang telah dianalisa pada Mod Vektor/KKM di papan pemuka. Adakah anda ingin menjadikan semua imej papan bukti tersebut sebagai bahan berinteraktif di dalam Modul Permainan ini?'
                  : 'We noticed you have analyzed scans from the Vector/MOH modes on your dashboard. Would you like to practice vector hunting on your custom evidence board images?'}
             </p>
             <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => setShowSessionPrompt(false)}
                  className="px-6 py-3 rounded-xl font-bold font-mono text-xs tracking-widest bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  {isMalay ? 'TIDAK (TETAPAN ASAL)' : 'NO (USE DEFAULTS)'}
                </button>
                <button 
                  onClick={() => {
                    const firstSessionScene = sessionScenes[0];
                    if (firstSessionScene) {
                       handleSceneChange(firstSessionScene.id);
                    }
                    setShowSessionPrompt(false);
                  }}
                  className="px-6 py-3 rounded-xl font-bold font-mono text-xs tracking-widest bg-emerald-600 border border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-emerald-500 hover:scale-105 transition"
                >
                  {isMalay ? 'YA, GUNAKAN BUKTI SAYA' : 'YES, USE MY SCANS'}
                </button>
             </div>
           </div>
        </div>
      )}

      {/* Background Neon Grid Decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98108_1px,transparent_1px),linear-gradient(to_bottom,#10b98108_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0"></div>

      {/* Retro Cyberpunk Arcade Header */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-emerald-500/20 pb-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-500/30 px-3 py-1 rounded-full text-[10px] font-mono font-bold text-cyan-400 mb-2 uppercase tracking-widest shadow-md">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
            {isMalay ? 'MODUL SIMULASI PERMAINAN' : 'GAME SIMULATION MODULE'}
          </div>
          <h2 className="text-2xl sm:text-4xl font-sci-fi font-black text-white uppercase tracking-wider drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            DETEKTIF <span className="text-emerald-500">VEKTOR</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-light mt-1">
            {isMalay 
              ? 'Hapuskan takungan air & sarang pembiakan vektor berbahaya secara interaktif.' 
              : 'Eliminate water pooling & deep vector breeding spots interactively.'}
          </p>
        </div>

        {/* Dynamic Game Menu */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          {/* Preset Buttons */}
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center gap-1">
            {allAvailableScenes.map((sc, idx) => (
              <button
                key={sc.id}
                onClick={() => handleSceneChange(sc.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  !isAiMode && activeScene.id === sc.id
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={isMalay ? sc.title : sc.titleEn}
              >
                {sc.id.startsWith('session-scene-') 
                   ? (isMalay ? `Bukti ${idx - PRESET_SCENES.length + 1}` : `Evidence ${idx - PRESET_SCENES.length + 1}`)
                   : (isMalay ? sc.title.split(' ')[0] : sc.titleEn.split(' ')[0])}
              </button>
            ))}
          </div>

          {/* AI Custom Upload Trigger */}
          <label className={`relative cursor-pointer shrink-0 py-2 px-4 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
            isAiMode 
              ? 'bg-cyan-500 text-black border-cyan-400 shadow-md shadow-cyan-500/20' 
              : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-cyan-500 hover:text-white'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {isAiScanning ? (isMalay ? 'MENGIMBAS FOTO AI...' : 'SCANNING PHOTO...') : (isMalay ? 'ARCAD AI PERIBADI (KOTOR)' : 'MY OWN SCENE (DIRTY)')}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleCustomImageUpload}
              disabled={isAiScanning}
            />
          </label>

          {/* Optional Clean Image Layer Upload */}
          {isAiMode && (
            <label className={`relative cursor-pointer shrink-0 py-2 px-4 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
              cleanImage 
                ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20' 
                : 'bg-slate-900 text-slate-300 border-emerald-500/50 border-dashed hover:border-emerald-400 hover:text-white'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068" />
              </svg>
              {cleanImage 
                ? (isMalay ? 'FOTO BERSIH DISINKRONKAN ✓' : 'CLEAN PHOTO SYNCED ✓') 
                : (isMalay ? 'MUAT NAIK VERSI BERSIH (OPSYEN)' : 'UPLOAD CLEANED VERSION (OPTIONAL)')}
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleCleanImageUpload}
                disabled={isAiScanning}
              />
            </label>
          )}
        </div>
      </div>

      {/* Main Grid: Viewport + Educational Briefing */}
      {isAiScanning ? (
        <div className="relative z-10 min-h-[400px] flex flex-col items-center justify-center border border-dashed border-cyan-500/30 rounded-2xl bg-slate-900/40 p-12 text-center animate-pulse">
          <div className="w-16 h-16 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin mb-6"></div>
          <h3 className="text-xl font-bold font-sci-fi text-cyan-400 mb-2 uppercase tracking-widest">
            KECERDASAN GEMINI SEDANG MENGIMBAS
          </h3>
          <p className="text-slate-400 max-w-md text-sm leading-relaxed">
            {isMalay 
              ? 'AI sedang mencari kotak takungan air ghaib, timbunan kayu buruk, botol pecah, dan potensi jentik-jentik jernih di dalam gambar anda...'
              : 'AI is detecting stagnant water pockets, discarded pots, and hidden vector nests inside your uploaded snapshot...'}
          </p>
        </div>
      ) : aiError ? (
        <div className="relative z-10 min-h-[300px] flex flex-col items-center justify-center border border-red-500/30 rounded-2xl bg-red-950/10 p-8 text-center">
          <span className="text-6xl mb-4">⚠️</span>
          <h3 className="text-lg font-bold text-red-400 mb-2 font-sci-fi uppercase">{isMalay ? 'TERGENDALA' : 'SCAN INTERRUPTION'}</h3>
          <p className="text-slate-400 max-w-md text-xs sm:text-sm mb-6 leading-relaxed">{aiError}</p>
          <button 
            onClick={() => setIsAiMode(false)}
            className="bg-slate-800 text-white px-5 py-2.5 rounded-xl hover:bg-slate-700 transition"
          >
            {isMalay ? 'Kembali ke Peringkat Biasa' : 'Back to Preset Challenges'}
          </button>
        </div>
      ) : (
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Game Viewport (Interactive Image Canvas) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            
            {/* Scoreboard and Status Bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl text-center">
                <span className="block text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold">{isMalay ? 'SKOR PENYIASAT' : 'DETECTIVE SCORE'}</span>
                <span className="text-xl sm:text-2xl font-black text-[#00E5FF] font-mono leading-none">{score} <span className="text-[10px] text-slate-500 font-normal">PTS</span></span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl text-center">
                <span className="block text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold">{isMalay ? 'SUDAH DIBERSIH' : 'MUTATED/CLEANED'}</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono leading-none">{foundSpots.length} <span className="text-slate-500 font-sans text-xs">/ {activeSpots.length}</span></span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl text-center flex flex-col justify-center">
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <span className="text-[9px] text-emerald-400 font-mono-sci font-bold tracking-widest mt-1.5 uppercase">{isMalay ? `SANITASI: ${progressPercent}%` : `SANITIZED: ${progressPercent}%`}</span>
              </div>
            </div>

            {/* Game Controls Panel (Clues, Whole Sanitize, Clean Toggle) */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                {/* Clues Toggle Switch */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={showClues} 
                    onChange={(e) => {
                      playSound('tap');
                      setShowClues(e.target.checked);
                    }}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 accent-emerald-500"
                  />
                  <span className="font-mono text-slate-300 font-bold uppercase tracking-wider text-[10px] sm:text-xs">
                    {isMalay ? 'PETUNJUK KOTAK (CLUES)' : 'SHOW CLUES'}
                  </span>
                </label>

                {/* View Clean Whole Toggle */}
                {((isAiMode && cleanImage) || !isAiMode) && (
                  <button
                    onClick={() => {
                      playSound('tap');
                      setIsViewCleanWhole(!isViewCleanWhole);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] sm:text-xs font-mono font-bold uppercase transition ${
                      isViewCleanWhole 
                        ? 'bg-emerald-500 border-emerald-400 text-black shadow-lg shadow-emerald-500/20' 
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    <span>👁️</span> {isViewCleanWhole ? (isMalay ? 'LIHAT GAMBAR ASAL' : 'VIEW ORIGINAL') : (isMalay ? 'LIHAT KHIDMAT BERSIH' : 'VIEW SANITIZED STATE')}
                  </button>
                )}
              </div>

              {/* Sanitize All Cheat Bypass Button */}
              <button
                onClick={handleSanitizeAll}
                disabled={gameCompleted}
                className={`px-3.5 py-2 rounded-xl text-[10px] sm:text-xs font-mono font-extrabold uppercase transition flex items-center gap-1.5 ${
                  gameCompleted 
                    ? 'bg-slate-800/50 text-slate-600 border border-slate-900 cursor-not-allowed'
                    : 'bg-red-500/15 border border-red-500/35 text-red-400 hover:bg-red-500 hover:text-black hover:border-red-400'
                }`}
              >
                <span>⚡</span> {isMalay ? 'SANITASI SEMUA (AUTO-SOLVE)' : 'SANITIZE ALL (AUTO-SOLVE)'}
              </button>
            </div>

            {/* Interactive Stage Canvas */}
            <div 
              ref={containerRef}
              className="relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-slate-800 bg-slate-950 select-none shadow-2xl touch-none"
              style={{ touchAction: 'none' }}
              onMouseMove={handleMouseMoveOrTouch}
              onTouchMove={handleMouseMoveOrTouch}
              onMouseEnter={() => { setIsHoverLens(true); }}
              onMouseLeave={() => { setIsHoverLens(false); }}
              onTouchEnd={() => { setIsHoverLens(false); }}
            >
              {/* SVG Mask Definition with dynamic keys to force browser re-renders */}
              <svg className="absolute w-0 h-0" style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                  <clipPath id="game-reveal-clip" key={`${foundSpots.join(',')}-${showClues}-${isViewCleanWhole}-${gameCompleted}`} clipPathUnits="objectBoundingBox">
                    {isViewCleanWhole || gameCompleted ? (
                      <rect x="0" y="0" width="1" height="1" />
                    ) : (
                      activeSpots.map(spot => {
                        const isFound = foundSpots.includes(spot.id);
                        if (isFound) {
                          return (
                            <rect 
                              key={spot.id}
                              x={spot.left / 100}
                              y={spot.top / 100}
                              width={spot.width / 100}
                              height={spot.height / 100}
                              rx={0.015}
                              ry={0.015}
                            />
                          );
                        }
                        return null;
                      })
                    )}
                  </clipPath>
                </defs>
              </svg>

              {/* Base Image (Darkened & desaturated dirty view) */}
              <img 
                src={isAiMode ? (customImage || '') : activeScene.image} 
                alt="Breeding Ground Scene (Dirty)"
                className="w-full h-full object-cover rounded-3xl transition-all duration-700 filter saturate-[0.5] brightness-[0.45] contrast-[1.05]"
                draggable={false}
              />

              {/* Complete Revealed overlay image (Cleaned version inside active bounds or whole image if toggle pressed) */}
              <img 
                src={isAiMode && cleanImage ? cleanImage : (isAiMode ? (customImage || '') : (activeScene.cleanImage || activeScene.image))} 
                alt="Breeding Ground Scene (Revealed Clean)"
                className="absolute inset-0 w-full h-full object-cover rounded-3xl pointer-events-none z-10 transition-all duration-500 filter saturate-[1.1] brightness-[1.05] contrast-[1.0]"
                style={{
                  clipPath: (foundSpots.length > 0 || isViewCleanWhole || gameCompleted) ? 'url(#game-reveal-clip)' : 'polygon(0 0, 0 0, 0 0)',
                }}
                draggable={false}
              />

              {/* Bounding Box Action Overlay Nodes */}
              {activeSpots.map((spot) => {
                const isFound = foundSpots.includes(spot.id);
                return (
                  <div
                    key={spot.id}
                    onClick={(e) => handleSpotClick(spot, e)}
                    className={`absolute z-20 cursor-pointer rounded-xl transition-all duration-300 ${
                      isFound 
                        ? 'border-2 border-emerald-500/90 shadow-[0_0_20px_rgba(16,185,129,0.45)] bg-transparent' 
                        : (showClues 
                            ? 'border-2 border-dashed border-red-500/50 bg-red-500/5 animate-pulse' 
                            : 'border border-transparent bg-transparent hover:bg-white/[0.01]')
                    }`}
                    style={{
                      left: `${spot.left}%`,
                      top: `${spot.top}%`,
                      width: `${spot.width}%`,
                      height: `${spot.height}%`,
                    }}
                  >
                    {/* Visual Pulse for active objects (rendered only if clues shown) */}
                    {!isFound && showClues && (
                      <span className="absolute inset-0 block rounded-xl border border-red-400/40 animate-ping opacity-25"></span>
                    )}

                    {/* Badge Indicator over target (only shown if found or clues activated) */}
                    {(isFound || showClues) && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1">
                        {isFound ? (
                          <span className="bg-emerald-500 text-black border border-emerald-400 font-mono font-extrabold text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-full uppercase shadow-lg tracking-wider whitespace-nowrap">
                            ✓ DIBERSIHKAN
                          </span>
                        ) : (
                          <span className="bg-red-500/85 text-white font-mono font-bold text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-full uppercase shadow-lg tracking-wider animate-pulse border border-red-400/30 whitespace-nowrap">
                            ⚠️ POTENSI
                          </span>
                        )}
                      </div>
                    )}

                    {/* Clean sparkles effect inside box if cleaned */}
                    {isFound && (
                      <div className="absolute inset-0 flex items-center justify-center text-emerald-400 animate-pulse pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8 opacity-75">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Sparkle click animation element */}
              <AnimatePresence>
                {sparklePos && (
                  <motion.div 
                    initial={{ opacity: 1, scale: 0.2 }}
                    animate={{ opacity: 0, scale: 2 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute z-40 pointer-events-none text-emerald-400"
                    style={{ left: sparklePos.x - 24, top: sparklePos.y - 24 }}
                  >
                    ✨✨
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Touch-Safe Magnifying Scope lens (offset so finger doesn't block it) */}
              {isHoverLens && (
                <div
                  className="absolute pointer-events-none z-30 rounded-full border-2 border-cyan-400 bg-black/40 overflow-hidden shadow-2xl backdrop-blur-sm hidden md:block"
                  style={{
                    width: '120px',
                    height: '120px',
                    left: `${xyCoord[0] - 60}px`,
                    top: `${xyCoord[1] - 140}px`, // Float nicely above finger/cursor
                    backgroundImage: `url('${isAiMode ? customImage : activeScene.image}')`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: `${containerRef.current ? containerRef.current.clientWidth * 1.8 : 800}px ${containerRef.current ? containerRef.current.clientHeight * 1.8 : 450}px`,
                    backgroundPositionX: `${-xyCoord[0] * 1.8 + 60}px`,
                    backgroundPositionY: `${-xyCoord[1] * 1.8 + 60}px`,
                  }}
                >
                  {/* Scope Overlay Crosshair */}
                  <div className="absolute inset-0 flex items-center justify-center text-cyan-400/40 font-bold text-lg">+</div>
                </div>
              )}
            </div>

            {/* Hint Box beneath Viewport */}
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
              <span className="text-xl shrink-0">💡</span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isMalay 
                  ? 'Klik atau sentuh kotak berkod merah "⚠️ POTENSI" dlm imej. Jari yang menutup skrin tidak menjadi isu kerana kanta pembesar terapung di atas kedudukan touchpoint jari anda secara dinamik!'
                  : 'Tap the blinking "⚠️ POTENSI" zones in the screen image. No finger obstructions, as the magnifier prism automatically shifts upwards!'}
              </p>
            </div>
          </div>

          {/* RIGHT: Educational Details & Remediation Briefing */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* Triumphant Win Screen State */}
            {gameCompleted && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-950/45 border border-emerald-500 rounded-3xl p-5 text-center text-slate-100 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.25)] relative overflow-hidden"
              >
                {/* Clean sparkles visual backdrop */}
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none"></div>
                
                <span className="text-4xl mb-2 animate-bounce">🏆</span>
                <h3 className="text-xl font-black font-sci-fi text-[#00FF66] uppercase tracking-wider mb-1">
                  {isMalay ? 'PREMIS BERSIH SEPENUHNYA!' : 'IMMACULATE SANITATION!'}
                </h3>
                <p className="text-[11px] text-slate-200 leading-normal mb-3 max-w-sm">
                  {isMalay 
                    ? 'Tahniah! Anda telah berjaya mengesan & menghapuskan setiap satu sarang pembiakan vektor berbahaya di kawasan ini.'
                    : 'Congratulations! You successfully spotted and eliminated every stagnant vector breeding node in this area.'}
                </p>

                <div className="bg-slate-900/90 border border-emerald-500/20 p-2.5 rounded-xl w-full mb-3 flex items-center justify-around text-xs">
                  <div className="text-center">
                    <span className="block text-[8px] text-slate-400 uppercase tracking-widest font-mono">{isMalay ? 'Total Skor' : 'Total Score'}</span>
                    <span className="font-bold text-white font-mono text-sm">{score} PTS</span>
                  </div>
                  <div className="h-6 w-[1.5px] bg-slate-800"></div>
                  <div className="text-center">
                    <span className="block text-[8px] text-slate-400 uppercase tracking-widest font-mono">{isMalay ? 'Tahap Kebersihan' : 'Cleanliness Tier'}</span>
                    <span className="font-bold text-[#00E5FF] font-mono text-sm">NASA LAB TAHAP 5</span>
                  </div>
                </div>

                <button
                  onClick={() => resetGame(activeScene, isAiMode)}
                  className="w-full bg-emerald-500 text-black font-bold py-2 px-4 rounded-xl hover:bg-emerald-400 transition-all uppercase text-[10px] sm:text-xs tracking-widest flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 font-mono"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  {isMalay ? 'Main Semula' : 'Replay Scene'}
                </button>
              </motion.div>
            )}

            {/* Always keep the Selected Spot educational details visible below the victory card or individually */}
            {renderSelectedSpotDetail()}

            {/* Global Outbreak Factbox */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl">
              <div className="flex items-center gap-2 mb-2 font-sci-fi text-xs font-bold text-indigo-400">
                <span>🛡️</span>
                <span>BIO-FACT SHEET</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {isMalay 
                  ? 'Nyamuk Aedes betina bertelur di tepi takul air bertakung yang lembap. Telur nyamuk boleh bertahan kering sepenuhnya sehingga 9 bulan dan menetas sebaik terkena titisan air terdekat!'
                  : 'Aedes eggs can survive dry freezing scenarios for up to 9 months and spawn instantly upon contact with shallow rain drops.'}
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

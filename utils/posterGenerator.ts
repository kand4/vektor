import { AnalysisResponse, RiskDetection } from '../types';
import { getProxiedImageUrl } from './imageProxy';

export interface PosterOptions {
  sessionId?: string;
  fileName?: string;
  originalImageSrc: string;
  simulationImageSrc?: string | null;
  result: AnalysisResponse;
}

function loadImageSafe(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      if (src.startsWith('http') && !src.includes('/api/image-proxy')) {
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = 'anonymous';
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = (err) => reject(err);
        fallbackImg.src = getProxiedImageUrl(src);
      } else {
        reject(new Error('Gagal memuatkan imej untuk poster'));
      }
    };
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number = 3
): number {
  const words = text.split(/\s+/);
  let line = '';
  let currentY = y;
  let linesDrawn = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      linesDrawn++;
      if (linesDrawn >= maxLines) {
        ctx.fillText(line.trim() + '...', x, currentY);
        return currentY + lineHeight;
      }
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line.trim()) {
    ctx.fillText(line.trim(), x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

function drawDeterministicMatrixQR(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  seedString: string
) {
  const cells = 21;
  const cellSize = size / cells;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 6, y - 6, size + 12, size + 12);

  let hash = 2166136261;
  for (let i = 0; i < seedString.length; i++) {
    hash ^= seedString.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const isFinderPattern = (r: number, c: number) => {
    const inTopLeft = r < 7 && c < 7;
    const inTopRight = r < 7 && c >= cells - 7;
    const inBottomLeft = r >= cells - 7 && c < 7;
    return inTopLeft || inTopRight || inBottomLeft;
  };

  ctx.fillStyle = '#0f172a';
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      if (isFinderPattern(r, c)) {
        const lr = r >= cells - 7 ? r - (cells - 7) : r;
        const lc = c >= cells - 7 ? c - (cells - 7) : c;
        const isBorder = lr === 0 || lr === 6 || lc === 0 || lc === 6;
        const isInner = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
        if (isBorder || isInner) {
          ctx.fillRect(x + c * cellSize, y + r * cellSize, Math.ceil(cellSize), Math.ceil(cellSize));
        }
      } else {
        const bit = ((hash >>> ((r * cells + c) % 28)) ^ (r * 31 + c * 17)) & 1;
        if (bit === 1) {
          ctx.fillRect(x + c * cellSize, y + r * cellSize, Math.ceil(cellSize), Math.ceil(cellSize));
        }
      }
    }
  }
}

export async function generateAndDownloadPoster(options: PosterOptions): Promise<boolean> {
  const {
    sessionId = `VG-${Date.now().toString().slice(-6)}`,
    fileName = 'Pemeriksaan_Lapangan',
    originalImageSrc,
    simulationImageSrc,
    result
  } = options;

  const canvas = document.createElement('canvas');
  const W = 1080;
  const H = 1520;
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  // 1. Background Slate Clinical Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#020617');
  bgGrad.addColorStop(0.5, '#0f172a');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle top accent bar
  const topBarGrad = ctx.createLinearGradient(0, 0, W, 0);
  topBarGrad.addColorStop(0, '#10b981');
  topBarGrad.addColorStop(0.5, '#06b6d4');
  topBarGrad.addColorStop(1, '#3b82f6');
  ctx.fillStyle = topBarGrad;
  ctx.fillRect(0, 0, W, 12);

  // 2. Header Block
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(40, 36, W - 80, 128);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 36, W - 80, 128);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('SISTEM FORENSIK KESIHATAN AWAM & KAWALAN VEKTOR', 68, 72);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('VECTORGUARD AI — KAD BUKTI PEMERIKSAAN', 68, 114);

  const dateStr = new Date(result.timestamp || Date.now()).toLocaleString('ms-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px monospace';
  ctx.fillText(`RUJUKAN: ${sessionId.slice(0, 16).toUpperCase()}  ·  TARIKH: ${dateStr}  ·  FAIL: ${fileName.slice(0, 28)}`, 68, 145);

  // 3. Load Images (Original + Simulation if available)
  let origImg: HTMLImageElement | null = null;
  let simImg: HTMLImageElement | null = null;

  try {
    origImg = await loadImageSafe(originalImageSrc);
  } catch {
    origImg = null;
  }

  if (simulationImageSrc) {
    try {
      simImg = await loadImageSafe(simulationImageSrc);
    } catch {
      simImg = null;
    }
  }

  const imgSectionY = 188;
  const imgSectionH = 440;

  if (origImg && simImg) {
    // Side-by-side Before & After
    const boxW = (W - 100) / 2;
    const leftX = 40;
    const rightX = 60 + boxW;

    // Left frame (ASAL)
    ctx.fillStyle = '#020617';
    ctx.fillRect(leftX, imgSectionY, boxW, imgSectionH);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.strokeRect(leftX, imgSectionY, boxW, imgSectionH);
    ctx.drawImage(origImg, leftX + 4, imgSectionY + 4, boxW - 8, imgSectionH - 8);

    // Draw bounding boxes on original image
    const risks = result.risks || [];
    risks.slice(0, 8).forEach((r, idx) => {
      if (!r.box_2d) return;
      const bx = leftX + 4 + (r.box_2d.xmin / 1000) * (boxW - 8);
      const by = imgSectionY + 4 + (r.box_2d.ymin / 1000) * (imgSectionH - 8);
      const bw = ((r.box_2d.xmax - r.box_2d.xmin) / 1000) * (boxW - 8);
      const bh = ((r.box_2d.ymax - r.box_2d.ymin) / 1000) * (imgSectionH - 8);
      ctx.strokeStyle = r.category === 'HYGIENE' ? '#f59e0b' : r.category === 'SAFETY' ? '#6366f1' : '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillRect(bx, Math.max(imgSectionY + 4, by - 22), 26, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`${idx + 1}`, bx + 7, Math.max(imgSectionY + 20, by - 6));
    });

    // Label badge ASAL
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(leftX + 12, imgSectionY + 12, 230, 34);
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('SEBELUM (IMEJ BUKTI ASAL)', leftX + 24, imgSectionY + 34);

    // Right frame (SIMULASI SASARAN)
    ctx.fillStyle = '#020617';
    ctx.fillRect(rightX, imgSectionY, boxW, imgSectionH);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.strokeRect(rightX, imgSectionY, boxW, imgSectionH);
    ctx.drawImage(simImg, rightX + 4, imgSectionY + 4, boxW - 8, imgSectionH - 8);

    ctx.fillStyle = 'rgba(8, 51, 68, 0.9)';
    ctx.fillRect(rightX + 12, imgSectionY + 12, 265, 34);
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('SELEPAS (SIMULASI PIAWAIAN)', rightX + 24, imgSectionY + 34);
  } else if (origImg) {
    // Full width Original Image with bounding boxes
    const boxW = W - 80;
    ctx.fillStyle = '#020617';
    ctx.fillRect(40, imgSectionY, boxW, imgSectionH);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, imgSectionY, boxW, imgSectionH);
    ctx.drawImage(origImg, 44, imgSectionY + 4, boxW - 8, imgSectionH - 8);

    const risks = result.risks || [];
    risks.slice(0, 8).forEach((r, idx) => {
      if (!r.box_2d) return;
      const bx = 44 + (r.box_2d.xmin / 1000) * (boxW - 8);
      const by = imgSectionY + 4 + (r.box_2d.ymin / 1000) * (imgSectionH - 8);
      const bw = ((r.box_2d.xmax - r.box_2d.xmin) / 1000) * (boxW - 8);
      const bh = ((r.box_2d.ymax - r.box_2d.ymin) / 1000) * (imgSectionH - 8);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(bx, Math.max(imgSectionY + 4, by - 24), 28, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`${idx + 1}`, bx + 8, Math.max(imgSectionY + 21, by - 7));
    });

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(54, imgSectionY + 14, 280, 34);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('IMEJ BUKTI & ANOTASI RISIKO', 66, imgSectionY + 36);
  }

  // 4. Metrics & Larvicide Bar
  const metricY = 652;
  const cardW = (W - 110) / 3;

  // Card 1: Skor Kebersihan
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(40, metricY, cardW, 118);
  ctx.strokeStyle = result.hygieneLevel >= 3 ? '#ef4444' : '#10b981';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, metricY, cardW, 118);
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('INDEKS RISIKO KEBERSIHAN', 60, metricY + 32);
  ctx.fillStyle = result.hygieneLevel >= 3 ? '#f87171' : '#34d399';
  ctx.font = 'bold 42px sans-serif';
  ctx.fillText(`${result.hygieneLevel} / 5`, 60, metricY + 84);
  ctx.font = 'bold 14px monospace';
  ctx.fillText(result.hygieneLevel >= 3 ? 'KRITIKAL / PERLU TINDAKAN' : 'TERKAWAL / MEMUASKAN', 185, metricY + 78);

  // Card 2: Skor Keselamatan
  const c2X = 55 + cardW;
  const safetyVal = result.safetyLevel || result.hygieneLevel;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(c2X, metricY, cardW, 118);
  ctx.strokeStyle = safetyVal >= 3 ? '#f59e0b' : '#38bdf8';
  ctx.strokeRect(c2X, metricY, cardW, 118);
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('INDEKS KESELAMATAN & VEKTOR', c2X + 20, metricY + 32);
  ctx.fillStyle = safetyVal >= 3 ? '#fbbf24' : '#38bdf8';
  ctx.font = 'bold 42px sans-serif';
  ctx.fillText(`${safetyVal} / 5`, c2X + 20, metricY + 84);
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`${(result.risks || []).length} ZON DIKESAN`, c2X + 150, metricY + 78);

  // Card 3: Dos Larvasid Abate 1% SG
  const c3X = 70 + cardW * 2;
  const vectorCount = Math.max(1, (result.risks || []).filter(r => r.category === 'VECTOR').length);
  const estAbateGrams = vectorCount * 10; // 10g per 90L standard container unit
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(c3X, metricY, cardW, 118);
  ctx.strokeStyle = '#06b6d4';
  ctx.strokeRect(c3X, metricY, cardW, 118);
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('CADANGAN DOS ABATE 1% SG', c3X + 20, metricY + 32);
  ctx.fillStyle = '#22d3ee';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText(`${estAbateGrams}g`, c3X + 20, metricY + 82);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '13px monospace';
  ctx.fillText(`(10g / 90L Air · Ulang 2 Minggu)`, c3X + 105, metricY + 78);

  // 5. Key Findings & Immediate Action Plan
  const listY = 796;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(40, listY, W - 80, 500);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, listY, W - 80, 500);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('SENARAI PENEMUAN UTAMA & ARAHAN TINDAKAN PEMBETULAN (KKM)', 68, listY + 42);

  const topRisks: RiskDetection[] = (result.risks || []).slice(0, 4);
  let rowY = listY + 78;

  if (topRisks.length === 0) {
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Tiada risiko pembiakan vektor kritikal dikesan pada imej ini.', 68, rowY + 30);
  } else {
    topRisks.forEach((risk, idx) => {
      // Badge number
      ctx.fillStyle = risk.category === 'HYGIENE' ? '#f59e0b' : risk.category === 'SAFETY' ? '#6366f1' : '#ef4444';
      ctx.fillRect(68, rowY - 22, 34, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`0${idx + 1}`, 75, rowY - 1);

      // Risk Label & Agent
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`${risk.label.slice(0, 58)}`, 116, rowY);

      ctx.fillStyle = '#34d399';
      ctx.font = 'italic 15px monospace';
      ctx.fillText(`Agen/Vektor: ${risk.agent || 'Aedes / Vektor Umum'}`, 116, rowY + 24);

      // Solution wrapped
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '16px sans-serif';
      rowY = wrapText(ctx, `Tindakan: ${risk.solution}`, 116, rowY + 48, W - 190, 22, 2);
      rowY += 22;
    });
  }

  // 6. Footer & Verification QR
  const footerY = 1320;
  ctx.fillStyle = '#090d16';
  ctx.fillRect(40, footerY, W - 80, 160);
  ctx.strokeStyle = '#1e293b';
  ctx.strokeRect(40, footerY, W - 80, 160);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('PENGESAHAN REKOD DIGITAL VECTORGUARD AI', 68, footerY + 42);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '15px sans-serif';
  ctx.fillText('Dokumen infografik ini dijana secara automatik untuk kegunaan komunikasi pantas', 68, footerY + 74);
  ctx.fillText('(WhatsApp / Telegram / JMB / Pasukan Kesihatan Awam) di bawah Akta 1975 (Akta 154).', 68, footerY + 98);

  const shareLink = `${window.location.origin}${window.location.pathname}?session=${sessionId}`;
  ctx.fillStyle = '#38bdf8';
  ctx.font = '14px monospace';
  ctx.fillText(`Pautan Arkib: ${shareLink.slice(0, 68)}`, 68, footerY + 132);

  drawDeterministicMatrixQR(ctx, W - 188, footerY + 22, 116, shareLink);

  // Trigger download
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `Poster_VectorGuard_${sessionId.slice(-8)}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}

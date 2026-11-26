import { jsPDF } from 'jspdf';
import { KaizenStatus, RankedKaizen } from '../types';
import { EVALUATION_CRITERIA } from './kaizenScoring';
import { loadBothLogos, LoadedImage } from './qrPdf';

function detectImageFormat(dataUrl: string): 'JPEG' | 'PNG' {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  return 'JPEG';
}

function loadRawImageDims(src: string): Promise<{ width: number; height: number; dataUrl: string; format: 'JPEG' | 'PNG' } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 800;
        canvas.height = img.naturalHeight || img.height || 600;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({
          width: canvas.width,
          height: canvas.height,
          dataUrl: canvas.toDataURL('image/jpeg', 0.88),
          format: 'JPEG'
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
  });
}

function drawFittedImage(
  pdf: jsPDF,
  imgInfo: { width: number; height: number; dataUrl: string; format: 'JPEG' | 'PNG' },
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number
) {
  const aspect = imgInfo.width / Math.max(1, imgInfo.height);
  const boxAspect = boxW / Math.max(1, boxH);
  let drawW = boxW;
  let drawH = boxH;

  if (aspect > boxAspect) {
    drawW = boxW;
    drawH = boxW / aspect;
  } else {
    drawH = boxH;
    drawW = boxH * aspect;
  }

  const offsetX = boxX + (boxW - drawW) / 2;
  const offsetY = boxY + (boxH - drawH) / 2;
  pdf.addImage(imgInfo.dataUrl, detectImageFormat(imgInfo.dataUrl), offsetX, offsetY, drawW, drawH);
}

async function renderKaizenOnePager(
  pdf: jsPDF,
  k: RankedKaizen,
  logos: { furnishings: LoadedImage | null; molty: LoadedImage | null }
): Promise<void> {
  const pageW = pdf.internal.pageSize.getWidth(); // 210mm
  const pageH = pdf.internal.pageSize.getHeight(); // 297mm
  const margin = 11;
  const contentW = pageW - margin * 2;

  // Page Border
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.5);
  pdf.rect(margin - 2, margin - 2, contentW + 4, pageH - (margin - 2) * 2);

  // Header Band
  pdf.setFillColor(15, 23, 42);
  pdf.rect(margin - 2, margin - 2, contentW + 4, 22, 'F');

  // Logos in white pill/box on left of header
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, margin, 46, 18, 'F');
  if (logos.furnishings) {
    const fH = 11;
    const fW = Math.min(20, fH * (logos.furnishings.width / logos.furnishings.height));
    pdf.addImage(logos.furnishings.dataUrl, 'JPEG', margin + 2, margin + 3.5, fW, fH);
  }
  if (logos.molty) {
    const mH = 12;
    const mW = Math.min(18, mH * (logos.molty.width / logos.molty.height));
    pdf.addImage(logos.molty.dataUrl, 'PNG', margin + 25, margin + 3, mW, mH);
  }

  // Title & ID
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text('KAIZEN ONE-PAGER REPORT', margin + 50, margin + 7);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`${k.location}  ·  ${k.factory}  ·  ${k.department}`, margin + 50, margin + 13.5);

  // Right ID & Status
  pdf.setTextColor(147, 197, 253);
  pdf.setFont('courier', 'bold');
  pdf.setFontSize(11);
  pdf.text(k.id, pageW - margin - 1, margin + 6.8, { align: 'right' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  if (k.status === KaizenStatus.ACCEPTED) pdf.setTextColor(110, 231, 183);
  else if (k.status === KaizenStatus.REJECTED) pdf.setTextColor(252, 165, 165);
  else pdf.setTextColor(253, 224, 71);
  const statusStr = k.position ? `${k.status.toUpperCase()} · ${k.positionLabel.toUpperCase()}` : k.status.toUpperCase();
  pdf.text(statusStr, pageW - margin - 1, margin + 13.5, { align: 'right' });

  let y = margin + 24;

  // Metadata Strip (6 cells in 2 rows or 1 crisp strip)
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.3);
  pdf.rect(margin, y, contentW, 17, 'FD');

  const metaCols = [
    { label: 'INITIATOR', val: k.initiator || '—' },
    { label: 'TYPE / PERIOD', val: `${k.type} · ${k.month}` },
    { label: 'SUBMITTED', val: k.submissionDate || '—' },
    { label: 'SCORE', val: k.evaluation ? `${k.evaluation.aggregateScore.toFixed(2)} / 3.00 (${k.evaluation.percentage}%)` : 'Not Scored' },
    {
      label: 'REWARD BREAKDOWN',
      val:
        k.positionBonus > 0
          ? `${k.baseReward} + ${k.positionBonus} = ${k.totalReward.toLocaleString()} PKR`
          : `${k.totalReward.toLocaleString()} PKR`
    }
  ];

  const colWidths = [40, 34, 28, 40, contentW - 142];
  let cx = margin;
  metaCols.forEach((col, i) => {
    if (i > 0) {
      pdf.setDrawColor(226, 232, 240);
      pdf.line(cx, y + 2, cx, y + 15);
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(col.label, cx + 2.5, y + 5.5);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.2);
    pdf.setTextColor(15, 23, 42);
    const clipped = pdf.splitTextToSize(col.val, colWidths[i] - 5)[0] || '—';
    pdf.text(clipped, cx + 2.5, y + 12.2);
    cx += colWidths[i];
  });

  y += 20;

  // Strategic Impact line
  const activeImpacts = Object.entries(k.impact || {})
    .filter(([, v]) => Boolean(v))
    .map(([key]) => key.replace('Saving', ' Saving').replace(/^\w/, (c) => c.toUpperCase()));

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text(
    `STRATEGIC IMPACT:  ${activeImpacts.length > 0 ? activeImpacts.join('  ·  ') : 'General Operational Improvement'}`,
    margin,
    y + 3
  );
  y += 6.5;

  // Problem & Solution Side-by-Side
  const halfW = (contentW - 4) / 2;
  const textBoxH = 42;

  const drawTextBox = (title: string, body: string, bx: number, by: number, bw: number, bh: number, accentRgb: [number, number, number]) => {
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.35);
    pdf.rect(bx, by, bw, bh, 'FD');

    pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    pdf.rect(bx, by, bw, 6.5, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text(title, bx + 3, by + 4.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.2);
    pdf.setTextColor(30, 41, 59);
    const lines = pdf.splitTextToSize((body || 'Not provided').trim(), bw - 6);
    pdf.text(lines.slice(0, 8), bx + 3, by + 11);
  };

  drawTextBox('PROBLEM STATEMENT (BEFORE)', k.problem, margin, y, halfW, textBoxH, [185, 28, 28]);
  drawTextBox('PROPOSED SOLUTION (AFTER)', k.solution, margin + halfW + 4, y, halfW, textBoxH, [4, 120, 87]);
  y += textBoxH + 4;

  // Challenges if present (compact bar)
  if (k.challenges && k.challenges.trim()) {
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(margin, y, contentW, 15, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(51, 65, 85);
    pdf.text('OPERATIONAL CHALLENGES:', margin + 3, y + 5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const chLines = pdf.splitTextToSize(k.challenges.trim(), contentW - 6);
    pdf.text(chLines.slice(0, 2), margin + 3, y + 10);
    y += 18;
  }

  // Before & After Photos
  const photoBoxH = 62;
  const [beforeLoaded, afterLoaded] = await Promise.all([
    k.beforeImg ? loadRawImageDims(k.beforeImg) : Promise.resolve(null),
    k.afterImg ? loadRawImageDims(k.afterImg) : Promise.resolve(null)
  ]);

  const drawPhotoBox = (
    title: string,
    img: { width: number; height: number; dataUrl: string; format: 'JPEG' | 'PNG' } | null,
    bx: number,
    by: number,
    bw: number,
    bh: number
  ) => {
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.35);
    pdf.rect(bx, by, bw, bh, 'FD');

    pdf.setFillColor(241, 245, 249);
    pdf.rect(bx, by, bw, 6.5, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.8);
    pdf.setTextColor(15, 23, 42);
    pdf.text(title, bx + 3, by + 4.5);

    if (img) {
      drawFittedImage(pdf, img, bx + 2.5, by + 8, bw - 5, bh - 10);
    } else {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text('No photograph attached', bx + bw / 2, by + bh / 2 + 2, { align: 'center' });
    }
  };

  drawPhotoBox('BASELINE PHOTOGRAPH (BEFORE)', beforeLoaded, margin, y, halfW, photoBoxH);
  drawPhotoBox('OPTIMIZED PHOTOGRAPH (AFTER)', afterLoaded, margin + halfW + 4, y, halfW, photoBoxH);
  y += photoBoxH + 4.5;

  // Judgment Criteria Table (if evaluated)
  if (k.evaluation) {
    pdf.setFillColor(15, 23, 42);
    pdf.rect(margin, y, contentW, 6.5, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.8);
    pdf.setTextColor(255, 255, 255);
    pdf.text('KAIZEN COMMITTEE JUDGMENT CRITERIA (RATING 1 - 3)', margin + 3, y + 4.5);
    pdf.text(
      `AGGREGATE: ${k.evaluation.aggregateScore.toFixed(2)} / 3.00  (${k.evaluation.percentage}%)`,
      pageW - margin - 3,
      y + 4.5,
      { align: 'right' }
    );
    y += 6.5;

    const rowH = 6.2;
    EVALUATION_CRITERIA.forEach((c, idx) => {
      const score = k.evaluation?.scores[c.key] ?? 1;
      pdf.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(margin, y, contentW, rowH, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(`${idx + 1}. ${c.label} (${c.weightPct}%)`, margin + 3, y + 4.2);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.2);
      pdf.setTextColor(71, 85, 105);
      const guideText = c.guide[score];
      pdf.text(guideText, margin + 88, y + 4.2);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(score === 3 ? 4 : score === 2 ? 29 : 185, score === 3 ? 120 : score === 2 ? 78 : 28, score === 3 ? 87 : score === 2 ? 216 : 28);
      pdf.text(`${score} / 3`, pageW - margin - 3, y + 4.2, { align: 'right' });

      y += rowH;
    });
    y += 3.5;
  }

  // Management Feedback
  if (y < pageH - 28) {
    const fbHeight = Math.min(20, pageH - 16 - y);
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(203, 213, 225);
    pdf.rect(margin, y, contentW, fbHeight, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(51, 65, 85);
    pdf.text('MANAGEMENT / KAIZEN COMMITTEE REMARKS:', margin + 3, y + 4.8);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(15, 23, 42);
    const fbLines = pdf.splitTextToSize(
      k.feedback?.trim() || 'Reviewed under Master Group Continuous Improvement Framework.',
      contentW - 6
    );
    pdf.text(fbLines.slice(0, 2), margin + 3, y + 10.2);
  }

  // Footer
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    'Master Group of Industries · Kaizen Management System (Karachi · Lahore · Mirpur)',
    margin,
    pageH - 6
  );
  pdf.text(
    `Generated: ${new Date().toLocaleDateString()}`,
    pageW - margin,
    pageH - 6,
    { align: 'right' }
  );
}

export async function downloadSingleKaizenPdf(k: RankedKaizen): Promise<void> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logos = await loadBothLogos();
  await renderKaizenOnePager(pdf, k, logos);
  pdf.save(`Kaizen_Report_${k.id}.pdf`);
}

export async function downloadPictorialKaizenBookletPdf(
  kaizens: RankedKaizen[],
  filenamePrefix = 'Master_Kaizen_Pictorial_Report'
): Promise<void> {
  if (kaizens.length === 0) return;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logos = await loadBothLogos();

  for (let i = 0; i < kaizens.length; i++) {
    if (i > 0) pdf.addPage();
    await renderKaizenOnePager(pdf, kaizens[i], logos);
  }

  pdf.save(`${filenamePrefix}_${new Date().toISOString().split('T')[0]}.pdf`);
}

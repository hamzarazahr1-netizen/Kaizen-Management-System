import ExcelJS from 'exceljs';
import {
  ALL_FACILITIES,
  KaizenStatus,
  KaizenType,
  RankedKaizen,
  getDepartmentsForFactory
} from '../types';
import {
  EVALUATION_CRITERIA,
  computeFacilityFinanceSummaries
} from './kaizenScoring';

async function normalizeImageToJpegBase64(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      try {
        const maxSide = 420;
        let w = img.naturalWidth || img.width || 400;
        let h = img.naturalHeight || img.height || 300;
        if (w > maxSide || h > maxSide) {
          const ratio = Math.min(maxSide / w, maxSide / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        const rawBase64 = dataUrl.split(',')[1] || '';
        resolve(rawBase64 || null);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export async function exportKaizensWithPicturesExcel(
  filteredKaizens: RankedKaizen[],
  allRankedKaizens: RankedKaizen[],
  monthFilter: string = 'All',
  filenamePrefix = 'Master_Group_Kaizen_Report'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Master Group Kaizen Management System';
  workbook.created = new Date();

  // =========================================================================
  // SHEET 1: Kaizen Records & Before/After Pictures
  // =========================================================================
  const wsRecords = workbook.addWorksheet('Kaizen Records & Photos', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  wsRecords.columns = [
    { header: 'Kaizen ID', key: 'id', width: 18 },
    { header: 'Location', key: 'location', width: 12 },
    { header: 'Factory', key: 'factory', width: 24 },
    { header: 'Section / Dept', key: 'department', width: 18 },
    { header: 'Initiator', key: 'initiator', width: 18 },
    { header: 'Submitted Date', key: 'submissionDate', width: 14 },
    { header: 'Month', key: 'month', width: 10 },
    { header: 'Type', key: 'type', width: 13 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Score (1-3)', key: 'score', width: 12 },
    { header: 'Score %', key: 'pct', width: 10 },
    { header: 'Position', key: 'position', width: 18 },
    { header: 'Base Reward (PKR)', key: 'baseReward', width: 16 },
    { header: 'Position Bonus (PKR)', key: 'positionBonus', width: 18 },
    { header: 'Total Reward (PKR)', key: 'totalReward', width: 17 },
    { header: 'Problem Statement', key: 'problem', width: 34 },
    { header: 'Proposed Solution', key: 'solution', width: 34 },
    { header: 'Challenges', key: 'challenges', width: 24 },
    { header: 'Impact Pillars', key: 'impact', width: 24 },
    { header: 'Management Feedback', key: 'feedback', width: 28 },
    { header: 'Before Photo', key: 'beforePhoto', width: 26 },
    { header: 'After Photo', key: 'afterPhoto', width: 26 }
  ];

  const headerRow = wsRecords.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'thin', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });

  const beforePhotoColIdx = 20; // 0-based index for col 21
  const afterPhotoColIdx = 21;  // 0-based index for col 22

  for (let i = 0; i < filteredKaizens.length; i++) {
    const k = filteredKaizens[i];
    const impactList = Object.entries(k.impact || {})
      .filter(([, v]) => Boolean(v))
      .map(([key]) => key.replace('Saving', ' Saving'))
      .join(', ');

    const row = wsRecords.addRow({
      id: k.id,
      location: k.location,
      factory: k.factory,
      department: k.department,
      initiator: k.initiator,
      submissionDate: k.submissionDate,
      month: k.month,
      type: k.type,
      status: k.status,
      score: k.evaluation ? Number(k.evaluation.aggregateScore.toFixed(2)) : '—',
      pct: k.evaluation ? `${k.evaluation.percentage}%` : '—',
      position: k.positionLabel,
      baseReward: k.baseReward,
      positionBonus: k.positionBonus,
      totalReward: k.totalReward,
      problem: k.problem || '',
      solution: k.solution || '',
      challenges: k.challenges || '',
      impact: impactList || 'General',
      feedback: k.feedback || '',
      beforePhoto: k.beforeImg ? '' : 'No Image',
      afterPhoto: k.afterImg ? '' : 'No Image'
    });

    const hasPhoto = Boolean(k.beforeImg || k.afterImg);
    row.height = hasPhoto ? 105 : 34;

    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.font = { size: 10, color: { argb: 'FF0F172A' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });

    // Embed Before & After images directly in Excel cells
    const excelRowIdx = i + 1; // 0-based row index (row 0 is header, row 1 is first data row)
    if (k.beforeImg) {
      const b64 = await normalizeImageToJpegBase64(k.beforeImg);
      if (b64) {
        const imgId = workbook.addImage({ base64: b64, extension: 'jpeg' });
        wsRecords.addImage(imgId, {
          tl: { col: beforePhotoColIdx + 0.08, row: excelRowIdx + 0.08 },
          ext: { width: 155, height: 120 }
        });
      }
    }
    if (k.afterImg) {
      const b64 = await normalizeImageToJpegBase64(k.afterImg);
      if (b64) {
        const imgId = workbook.addImage({ base64: b64, extension: 'jpeg' });
        wsRecords.addImage(imgId, {
          tl: { col: afterPhotoColIdx + 0.08, row: excelRowIdx + 0.08 },
          ext: { width: 155, height: 120 }
        });
      }
    }
  }

  // =========================================================================
  // SHEET 2: Segregated Finance Reward Summary (Per Location & Factory)
  // =========================================================================
  const wsFinance = workbook.addWorksheet('Finance Reward Summary');
  wsFinance.columns = [
    { width: 22 },
    { width: 26 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 20 }
  ];

  const summaries = computeFacilityFinanceSummaries(allRankedKaizens, monthFilter);
  const titleRow = wsFinance.addRow([`MASTER GROUP OF INDUSTRIES · SEGREGATED FINANCE REWARD SUMMARY (${monthFilter === 'All' ? 'All Months' : monthFilter})`]);
  titleRow.font = { bold: true, size: 12, color: { argb: 'FF0F172A' } };
  wsFinance.addRow([]);

  const finHeader = wsFinance.addRow([
    'Location',
    'Factory',
    'Acc. Ideas (50)',
    'Acc. Impl (200)',
    'Base Pool (PKR)',
    '1st Pos (+1300)',
    '2nd Pos (+700)',
    '3rd Pos (+500)',
    'Total Payable (PKR)'
  ]);
  finHeader.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  summaries.forEach((s) => {
    const r = wsFinance.addRow([
      s.location,
      s.factory,
      s.acceptedIdeasCount,
      s.acceptedImplCount,
      s.basePoolTotal,
      s.firstPlaceCount * 1300,
      s.secondPlaceCount * 700,
      s.thirdPlaceCount * 500,
      s.grandTotalPayable
    ]);
    r.eachCell((c, idx) => {
      c.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      if (idx >= 3) c.alignment = { horizontal: 'right' };
      if (idx === 9) c.font = { bold: true };
    });
  });

  wsFinance.addRow([]);
  const winTitle = wsFinance.addRow(['TOP 3 POSITION WINNERS BREAKDOWN (PER LOCATION & FACTORY)']);
  winTitle.font = { bold: true, size: 11, color: { argb: 'FF1D4ED8' } };

  const winHeader = wsFinance.addRow([
    'Location',
    'Factory',
    'Month',
    'Position',
    'Kaizen ID',
    'Section',
    'Initiator',
    'Score %',
    'Total Payout (PKR)'
  ]);
  winHeader.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  });

  summaries.forEach((s) => {
    s.winners.forEach((w) => {
      wsFinance.addRow([
        w.location,
        w.factory,
        w.month,
        w.positionLabel,
        w.id,
        w.department,
        w.initiator,
        w.evaluation ? `${w.evaluation.percentage}%` : '—',
        w.totalReward
      ]);
    });
  });

  // =========================================================================
  // SHEET 3: Evaluation Criteria Matrix
  // =========================================================================
  const wsEval = workbook.addWorksheet('Criteria Evaluation Matrix', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });
  wsEval.columns = [
    { header: 'Kaizen #', width: 18 },
    { header: 'Location', width: 12 },
    { header: 'Factory', width: 24 },
    { header: 'Section', width: 18 },
    { header: 'Month', width: 10 },
    ...EVALUATION_CRITERIA.map((c) => ({ header: `${c.shortLabel} (${c.weightPct}%)`, width: 16 })),
    { header: 'Aggregate', width: 12 },
    { header: 'Position', width: 20 },
    { header: 'Percentage', width: 12 }
  ];

  wsEval.getRow(1).eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  filteredKaizens
    .filter((k) => k.evaluation)
    .forEach((k) => {
      wsEval.addRow([
        k.id,
        k.location,
        k.factory,
        k.department,
        k.month,
        ...EVALUATION_CRITERIA.map((c) => k.evaluation?.scores[c.key] ?? ''),
        k.evaluation?.aggregateScore.toFixed(2) ?? '',
        k.positionLabel,
        k.evaluation ? `${k.evaluation.percentage}%` : ''
      ]);
    });

  // =========================================================================
  // SHEET 4: Facility & Section Participation Summary
  // =========================================================================
  const wsSections = workbook.addWorksheet('Section Participation', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });
  wsSections.columns = [
    { header: 'Location', width: 12 },
    { header: 'Factory', width: 24 },
    { header: 'Section / Dept', width: 20 },
    { header: 'Total Submitted', width: 15 },
    { header: 'Acc. Ideas', width: 12 },
    { header: 'Acc. Implemented', width: 16 },
    { header: 'Pending', width: 12 },
    { header: 'Rejected', width: 12 },
    { header: 'Total Rewards (PKR)', width: 18 }
  ];

  wsSections.getRow(1).eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  ALL_FACILITIES.forEach((fac) => {
    const units = getDepartmentsForFactory(fac.factory);
    units.forEach((dept) => {
      const list = allRankedKaizens.filter(
        (k) =>
          k.location === fac.location &&
          k.factory === fac.factory &&
          k.department === dept &&
          (monthFilter === 'All' || k.month === monthFilter)
      );
      wsSections.addRow([
        fac.location,
        fac.factory,
        dept,
        list.length,
        list.filter((k) => k.status === KaizenStatus.ACCEPTED && k.type === KaizenType.IDEA).length,
        list.filter((k) => k.status === KaizenStatus.ACCEPTED && k.type === KaizenType.IMPLEMENTED).length,
        list.filter((k) => k.status === KaizenStatus.PENDING).length,
        list.filter((k) => k.status === KaizenStatus.REJECTED).length,
        list.reduce((s, k) => s + k.totalReward, 0)
      ]);
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  triggerDownload(blob, `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportRecordsCsv(kaizens: RankedKaizen[], filenamePrefix = 'Master_Kaizen_Records'): void {
  if (kaizens.length === 0) return;
  const headers = [
    'Kaizen ID', 'Location', 'Factory', 'Section', 'Initiator', 'Submission Date', 'Month',
    'Type', 'Status', 'Aggregate Score', 'Score %', 'Position', 'Base Reward (PKR)',
    'Position Bonus (PKR)', 'Total Reward (PKR)', 'Problem', 'Solution', 'Challenges', 'Feedback'
  ];

  const escape = (v: string | number | undefined) =>
    `"${String(v ?? '').replace(/"/g, '""')}"`;

  const rows = kaizens.map((k) => [
    k.id,
    escape(k.location),
    escape(k.factory),
    escape(k.department),
    escape(k.initiator),
    escape(k.submissionDate),
    escape(k.month),
    k.type,
    k.status,
    k.evaluation ? k.evaluation.aggregateScore.toFixed(2) : '',
    k.evaluation ? `${k.evaluation.percentage}%` : '',
    escape(k.positionLabel),
    k.baseReward,
    k.positionBonus,
    k.totalReward,
    escape(k.problem),
    escape(k.solution),
    escape(k.challenges),
    escape(k.feedback)
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  triggerDownload(
    new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.csv`
  );
}

export function exportFinanceSummaryCsv(
  allRankedKaizens: RankedKaizen[],
  monthFilter: string = 'All',
  filenamePrefix = 'Master_Finance_Reward_Summary'
): void {
  const summaries = computeFacilityFinanceSummaries(allRankedKaizens, monthFilter);
  const headers = [
    'Location', 'Factory', 'Total Submitted', 'Acc. Ideas', 'Acc. Implemented',
    'Ideas Pool (PKR)', 'Implemented Pool (PKR)', 'Base Pool Total (PKR)',
    '1st Pos Bonus (1300)', '2nd Pos Bonus (700)', '3rd Pos Bonus (500)',
    'Total Position Bonus (PKR)', 'Grand Total Payable (PKR)'
  ];

  const rows = summaries.map((s) => [
    `"${s.location}"`,
    `"${s.factory}"`,
    s.totalSubmitted,
    s.acceptedIdeasCount,
    s.acceptedImplCount,
    s.ideasBasePool,
    s.implBasePool,
    s.basePoolTotal,
    s.firstPlaceCount * 1300,
    s.secondPlaceCount * 700,
    s.thirdPlaceCount * 500,
    s.positionBonusTotal,
    s.grandTotalPayable
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  triggerDownload(
    new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.csv`
  );
}

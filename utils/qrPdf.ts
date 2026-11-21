import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import {
  Factory,
  FACTORIES,
  getDepartmentsForFactory,
  getShortFactoryName
} from '../types';

const QR_BASE_URL_STORAGE_KEY = 'mf_kaizen_qr_base_url';

const toSlug = (val: string): string =>
  val
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function getFactoryCode(factory: Factory): string {
  return factory === Factory.MOLTY_FOAM ? 'mf' : 'ff';
}

export function getDefaultPortalBaseUrl(): string {
  try {
    const saved = window.localStorage.getItem(QR_BASE_URL_STORAGE_KEY);
    if (saved && /^https?:\/\//i.test(saved.trim())) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch {
    // Ignore storage access errors
  }

  const origin = window.location.origin;
  // In AI Studio Build preview, ais-dev-* is private to the editor session;
  // map automatically to the public/shared ais-pre-* URL by default.
  if (window.location.hostname.startsWith('ais-dev-')) {
    return origin.replace('://ais-dev-', '://ais-pre-');
  }
  return origin;
}

export function savePortalBaseUrl(url: string): void {
  try {
    const cleaned = url.trim().replace(/\/+$/, '');
    if (cleaned) {
      window.localStorage.setItem(QR_BASE_URL_STORAGE_KEY, cleaned);
    } else {
      window.localStorage.removeItem(QR_BASE_URL_STORAGE_KEY);
    }
  } catch {
    // Ignore storage access errors
  }
}

export function resetPortalBaseUrl(): string {
  try {
    window.localStorage.removeItem(QR_BASE_URL_STORAGE_KEY);
  } catch {
    // Ignore storage access errors
  }
  return getDefaultPortalBaseUrl();
}

export function buildQuickSubmitUrl(
  factory: Factory,
  department: string,
  customBaseUrl?: string
): string {
  const base = (customBaseUrl || getDefaultPortalBaseUrl()).trim().replace(/\/+$/, '');
  const fCode = getFactoryCode(factory);
  const dSlug = toSlug(department);
  return `${base}/?q=1&f=${fCode}&d=${dSlug}`;
}

export function parseQuickSubmitFromUrl(): { factory: Factory; department: string } | null {
  // Read parameters from either standard query string (?...) or hash query (#/?...)
  let searchStr = window.location.search;
  if (!searchStr && window.location.hash.includes('?')) {
    searchStr = window.location.hash.slice(window.location.hash.indexOf('?'));
  }

  const params = new URLSearchParams(searchStr);
  const isCompactMode = params.get('q') === '1';
  const isLegacyMode = params.get('mode') === 'quick-submit';

  if (!isCompactMode && !isLegacyMode) return null;

  const rawFactory = (params.get('f') || params.get('factory') || '').trim().toLowerCase();
  const rawDept = (params.get('d') || params.get('dept') || '').trim().toLowerCase();

  let matchedFactory: Factory | undefined;
  if (rawFactory === 'ff' || rawFactory === 'furniture') {
    matchedFactory = Factory.FURNITURE;
  } else if (rawFactory === 'mf' || rawFactory === 'molty' || rawFactory === 'molty-foam') {
    matchedFactory = Factory.MOLTY_FOAM;
  } else {
    matchedFactory = FACTORIES.find(
      f => f.toLowerCase() === rawFactory || toSlug(f) === rawFactory
    );
  }

  if (!matchedFactory) return null;

  const units = getDepartmentsForFactory(matchedFactory);
  const matchedDept = units.find(
    u => u.toLowerCase() === rawDept || toSlug(u) === rawDept
  );

  if (!matchedDept) return null;

  return { factory: matchedFactory, department: matchedDept };
}

export async function generateQrDataUrl(url: string, width = 512): Promise<string> {
  return QRCode.toDataURL(url, {
    width,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    },
    errorCorrectionLevel: 'M'
  });
}

function loadLogoAsDataUrl(): Promise<{ dataUrl: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/assets/aistudio/Master_Furnishings_68c64c06.jpeg';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL('image/jpeg', 0.92),
          width: canvas.width,
          height: canvas.height
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
  });
}

async function renderPosterPage(
  pdf: jsPDF,
  factory: Factory,
  department: string,
  logo: { dataUrl: string; width: number; height: number } | null,
  customBaseUrl?: string
): Promise<void> {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  // Outer frame
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.5);
  pdf.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Header brand band
  pdf.setFillColor(244, 245, 246);
  pdf.rect(12.5, 12.5, pageWidth - 25, 38, 'F');

  if (logo) {
    const targetH = 22;
    const aspect = logo.width / logo.height;
    const targetW = targetH * aspect;
    pdf.addImage(logo.dataUrl, 'JPEG', centerX - targetW / 2, 20, targetW, targetH);
  } else {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(15, 23, 42);
    pdf.text('MASTER FURNISHINGS PVT. LTD.', centerX, 33, { align: 'center' });
  }

  // Portal Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(29, 78, 216);
  pdf.text('LEAN & TRANSFORMATION KAIZEN PORTAL', centerX, 64, { align: 'center' });

  // Factory Name
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(71, 85, 105);
  pdf.text(factory.toUpperCase(), centerX, 75, { align: 'center' });

  // Divider
  pdf.setDrawColor(226, 232, 240);
  pdf.line(30, 82, pageWidth - 30, 82);

  // Department / Section Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(26);
  pdf.setTextColor(15, 23, 42);
  pdf.text(department.toUpperCase(), centerX, 99, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Direct Kaizen Submission Station', centerX, 108, { align: 'center' });

  // QR Code
  const targetUrl = buildQuickSubmitUrl(factory, department, customBaseUrl);
  const qrDataUrl = await generateQrDataUrl(targetUrl, 640);
  const qrSize = 104;
  const qrX = centerX - qrSize / 2;
  const qrY = 118;

  pdf.setDrawColor(15, 23, 42);
  pdf.setLineWidth(0.8);
  pdf.rect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);
  pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  // Scan instructions box
  const boxY = 236;
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.4);
  pdf.rect(24, boxY, pageWidth - 48, 28, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(15, 23, 42);
  pdf.text('SCAN WITH MOBILE OR TABLET TO SUBMIT KAIZEN', centerX, boxY + 10, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(71, 85, 105);
  pdf.text(
    `Submissions are registered directly to ${department} (${getShortFactoryName(factory)}) without login.`,
    centerX,
    boxY + 19,
    { align: 'center' }
  );

  // Footer
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(148, 163, 184);
  const clippedUrl = targetUrl.length > 95 ? `${targetUrl.slice(0, 92)}...` : targetUrl;
  pdf.text(clippedUrl, centerX, pageHeight - 20, { align: 'center' });
  pdf.text('Master Furnishings Pvt. Ltd. · Lean & Transformation Portal', centerX, pageHeight - 15, { align: 'center' });
}

export async function downloadDepartmentQrPdf(
  factory: Factory,
  department: string,
  customBaseUrl?: string
): Promise<void> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logo = await loadLogoAsDataUrl();
  await renderPosterPage(pdf, factory, department, logo, customBaseUrl);

  const safeFactory = getShortFactoryName(factory).replace(/\s+/g, '_');
  const safeDept = department.replace(/\s+/g, '_');
  pdf.save(`Kaizen_QR_${safeFactory}_${safeDept}.pdf`);
}

export async function downloadAllFactoryQrPdf(
  factory: Factory,
  customBaseUrl?: string
): Promise<void> {
  const units = getDepartmentsForFactory(factory);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logo = await loadLogoAsDataUrl();

  for (let i = 0; i < units.length; i++) {
    if (i > 0) pdf.addPage();
    await renderPosterPage(pdf, factory, units[i], logo, customBaseUrl);
  }

  const safeFactory = getShortFactoryName(factory).replace(/\s+/g, '_');
  pdf.save(`Kaizen_QR_Posters_${safeFactory}.pdf`);
}

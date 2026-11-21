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

interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
  format: 'JPEG' | 'PNG';
}

function loadImageAsDataUrl(
  src: string,
  format: 'JPEG' | 'PNG',
  bgHex = '#f4f5f6'
): Promise<LoadedImage | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
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
        if (format === 'JPEG') {
          ctx.fillStyle = bgHex;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
        const mime = format === 'PNG' ? 'image/png' : 'image/jpeg';
        resolve({
          dataUrl: canvas.toDataURL(mime, 0.94),
          width: canvas.width,
          height: canvas.height,
          format
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
  });
}

async function loadBothLogos(): Promise<{
  furnishings: LoadedImage | null;
  molty: LoadedImage | null;
}> {
  const [furnishings, molty] = await Promise.all([
    loadImageAsDataUrl('/assets/aistudio/Master_Furnishings_68c64c06.jpeg', 'JPEG', '#f4f5f6'),
    loadImageAsDataUrl('/assets/aistudio/Master_Logo_17bc2ec9.png', 'PNG')
  ]);
  return { furnishings, molty };
}

async function renderPosterPage(
  pdf: jsPDF,
  factory: Factory,
  department: string,
  logos: { furnishings: LoadedImage | null; molty: LoadedImage | null },
  customBaseUrl?: string
): Promise<void> {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  // Outer frame
  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.6);
  pdf.rect(12, 12, pageWidth - 24, pageHeight - 24);

  // Header brand band
  pdf.setFillColor(244, 245, 246);
  pdf.rect(12.5, 12.5, pageWidth - 25, 40, 'F');

  const { furnishings, molty } = logos;
  if (furnishings && molty) {
    const fH = 22;
    const fW = fH * (furnishings.width / furnishings.height);
    const mH = 26;
    const mW = mH * (molty.width / molty.height);
    const gap = 14;
    const totalW = fW + gap + mW;
    const startX = centerX - totalW / 2;

    pdf.addImage(furnishings.dataUrl, 'JPEG', startX, 21, fW, fH);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.4);
    pdf.line(startX + fW + gap / 2, 19, startX + fW + gap / 2, 46);
    pdf.addImage(molty.dataUrl, 'PNG', startX + fW + gap, 19, mW, mH);
  } else if (furnishings) {
    const fH = 22;
    const fW = fH * (furnishings.width / furnishings.height);
    pdf.addImage(furnishings.dataUrl, 'JPEG', centerX - fW / 2, 21, fW, fH);
  } else if (molty) {
    const mH = 26;
    const mW = mH * (molty.width / molty.height);
    pdf.addImage(molty.dataUrl, 'PNG', centerX - mW / 2, 19, mW, mH);
  } else {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(17);
    pdf.setTextColor(15, 23, 42);
    pdf.text('MASTER LIFESTYLE & MASTER MOLTY FOAM', centerX, 34, { align: 'center' });
  }

  // Portal Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(29, 78, 216);
  pdf.text('MASTER KAIZEN MANAGEMENT SYSTEM', centerX, 64, { align: 'center' });

  // Subtitle
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Master Lifestyle & Master Molty Foam Karachi Factories', centerX, 70, { align: 'center' });

  // Factory Name
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13.5);
  pdf.setTextColor(51, 65, 85);
  pdf.text(factory.toUpperCase(), centerX, 80, { align: 'center' });

  // Divider
  pdf.setDrawColor(226, 232, 240);
  pdf.line(28, 85, pageWidth - 28, 85);

  // Department / Section Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(25);
  pdf.setTextColor(15, 23, 42);
  pdf.text(department.toUpperCase(), centerX, 99, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text('Direct Kaizen Submission Station', centerX, 107, { align: 'center' });

  // QR Code
  const targetUrl = buildQuickSubmitUrl(factory, department, customBaseUrl);
  const qrDataUrl = await generateQrDataUrl(targetUrl, 640);
  const qrSize = 98;
  const qrX = centerX - qrSize / 2;
  const qrY = 114;

  pdf.setDrawColor(15, 23, 42);
  pdf.setLineWidth(0.9);
  pdf.rect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);
  pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  // Bilingual Floor Worker Callout Box (Roman Urdu + English)
  const boxY = 224;
  pdf.setFillColor(239, 246, 255);
  pdf.setDrawColor(29, 78, 216);
  pdf.setLineWidth(0.7);
  pdf.rect(22, boxY, pageWidth - 44, 38, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Kaizen jama karwany k liye Scan kren', centerX, boxY + 12, { align: 'center' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(29, 78, 216);
  pdf.text('SCAN FOR IMPROVEMENT', centerX, boxY + 22, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  pdf.text(
    `Direct submission to ${department} (${getShortFactoryName(factory)}) — No login or password needed.`,
    centerX,
    boxY + 31,
    { align: 'center' }
  );

  // Footer
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.setTextColor(148, 163, 184);
  const clippedUrl = targetUrl.length > 95 ? `${targetUrl.slice(0, 92)}...` : targetUrl;
  pdf.text(clippedUrl, centerX, pageHeight - 20, { align: 'center' });
  pdf.text('Master Kaizen Management System · Master Lifestyle & Master Molty Foam', centerX, pageHeight - 15, { align: 'center' });
}

export async function downloadDepartmentQrPdf(
  factory: Factory,
  department: string,
  customBaseUrl?: string
): Promise<void> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logos = await loadBothLogos();
  await renderPosterPage(pdf, factory, department, logos, customBaseUrl);

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
  const logos = await loadBothLogos();

  for (let i = 0; i < units.length; i++) {
    if (i > 0) pdf.addPage();
    await renderPosterPage(pdf, factory, units[i], logos, customBaseUrl);
  }

  const safeFactory = getShortFactoryName(factory).replace(/\s+/g, '_');
  pdf.save(`Kaizen_QR_Posters_${safeFactory}.pdf`);
}

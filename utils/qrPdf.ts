import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Factory,
  FACTORIES,
  Location,
  LOCATIONS,
  getDepartmentsForFactory,
  getFactoriesForLocation
} from '../types';

const QR_BASE_URL_STORAGE_KEY = 'mf_kaizen_qr_base_url';
export const CANONICAL_SHARED_URL =
  'https://ais-pre-fglkhswqptadousnldjqis-709457629561.asia-southeast1.run.app';

export interface PortalQrSettings {
  permanentBaseUrl: string;
  liveTargetUrl?: string;
  updatedAt?: string;
}

const toSlug = (val: string): string =>
  val
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function getFactoryCode(factory: Factory): string {
  return factory === Factory.MASTER_MOLTY_FOAM ? 'mf' : 'ls';
}

export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function isValidHttpUrl(url: string): boolean {
  return /^https?:\/\/[^/\s]+/i.test(url.trim());
}

export function getDefaultPortalBaseUrl(): string {
  try {
    const saved = window.localStorage.getItem(QR_BASE_URL_STORAGE_KEY);
    if (saved && isValidHttpUrl(saved)) {
      return normalizeBaseUrl(saved);
    }
  } catch {
    // Ignore storage access errors
  }

  const host = window.location.hostname;
  if (
    host.startsWith('ais-dev-') ||
    host.startsWith('ais-pre-') ||
    host === 'localhost' ||
    host === '127.0.0.1'
  ) {
    return CANONICAL_SHARED_URL;
  }
  return normalizeBaseUrl(window.location.origin);
}

export function savePortalBaseUrl(url: string): void {
  try {
    const cleaned = normalizeBaseUrl(url);
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

export async function fetchCloudPortalSettings(): Promise<PortalQrSettings> {
  const fallbackBase = getDefaultPortalBaseUrl();
  try {
    const snap = await getDoc(doc(db, 'settings', 'portal'));
    if (snap.exists()) {
      const data = snap.data() as Partial<PortalQrSettings>;
      if (data.permanentBaseUrl && isValidHttpUrl(data.permanentBaseUrl)) {
        const cleanPermanent = normalizeBaseUrl(data.permanentBaseUrl);
        savePortalBaseUrl(cleanPermanent);
        return {
          permanentBaseUrl: cleanPermanent,
          liveTargetUrl: data.liveTargetUrl ? normalizeBaseUrl(data.liveTargetUrl) : '',
          updatedAt: data.updatedAt || ''
        };
      }
    }
  } catch {
    // Fall back gracefully if offline or rules pending
  }
  return {
    permanentBaseUrl: fallbackBase,
    liveTargetUrl: ''
  };
}

export async function saveCloudPortalSettings(settings: PortalQrSettings): Promise<PortalQrSettings> {
  const cleanPermanent = normalizeBaseUrl(settings.permanentBaseUrl);
  if (!isValidHttpUrl(cleanPermanent)) {
    throw new Error('Please enter a valid http:// or https:// permanent portal URL.');
  }

  const cleanLive = settings.liveTargetUrl ? normalizeBaseUrl(settings.liveTargetUrl) : '';
  if (cleanLive && !isValidHttpUrl(cleanLive)) {
    throw new Error('Live redirect target must be a valid http:// or https:// URL.');
  }

  const payload: PortalQrSettings = {
    permanentBaseUrl: cleanPermanent.slice(0, 300),
    liveTargetUrl: cleanLive.slice(0, 300),
    updatedAt: new Date().toISOString()
  };

  savePortalBaseUrl(payload.permanentBaseUrl);
  await setDoc(doc(db, 'settings', 'portal'), payload);
  return payload;
}

export function buildCentralizedQuickSubmitUrl(customBaseUrl?: string): string {
  const base = normalizeBaseUrl(customBaseUrl || getDefaultPortalBaseUrl());
  return `${base}/?q=1`;
}

export function buildQuickSubmitUrl(
  factory?: Factory,
  department?: string,
  customBaseUrl?: string
): string {
  const base = normalizeBaseUrl(customBaseUrl || getDefaultPortalBaseUrl());
  if (!factory || !department) {
    return `${base}/?q=1`;
  }
  const fCode = getFactoryCode(factory);
  const dSlug = toSlug(department);
  return `${base}/?q=1&f=${fCode}&d=${dSlug}`;
}

export interface ParsedQuickSubmitTarget {
  isQuickSubmit: boolean;
  location?: Location;
  factory?: Factory;
  department?: string;
}

export function parseQuickSubmitFromUrl(): ParsedQuickSubmitTarget | null {
  let searchStr = window.location.search;
  if (!searchStr && window.location.hash.includes('?')) {
    searchStr = window.location.hash.slice(window.location.hash.indexOf('?'));
  }

  const params = new URLSearchParams(searchStr);
  const isCompactMode = params.get('q') === '1';
  const isLegacyMode = params.get('mode') === 'quick-submit';

  if (!isCompactMode && !isLegacyMode) return null;

  const rawLoc = (params.get('l') || params.get('location') || '').trim().toLowerCase();
  const rawFactory = (params.get('f') || params.get('factory') || '').trim().toLowerCase();
  const rawDept = (params.get('d') || params.get('dept') || '').trim().toLowerCase();

  let matchedLocation: Location | undefined;
  if (rawLoc) {
    if (rawLoc === 'k' || rawLoc === 'khi' || rawLoc === 'karachi') matchedLocation = Location.KARACHI;
    else if (rawLoc === 'l' || rawLoc === 'lhr' || rawLoc === 'lahore') matchedLocation = Location.LAHORE;
    else if (rawLoc === 'm' || rawLoc === 'mpr' || rawLoc === 'mirpur') matchedLocation = Location.MIRPUR;
    else {
      matchedLocation = LOCATIONS.find((l) => l.toLowerCase() === rawLoc);
    }
  }

  let matchedFactory: Factory | undefined;
  if (rawFactory) {
    if (rawFactory === 'ff' || rawFactory === 'ls' || rawFactory === 'furniture' || rawFactory === 'lifestyle') {
      matchedFactory = Factory.MASTER_LIFESTYLE;
    } else if (rawFactory === 'mf' || rawFactory === 'molty' || rawFactory === 'molty-foam') {
      matchedFactory = Factory.MASTER_MOLTY_FOAM;
    } else {
      matchedFactory = FACTORIES.find(
        (f) => f.toLowerCase() === rawFactory || toSlug(f) === rawFactory
      );
    }
  }

  if (matchedLocation && matchedFactory) {
    const allowed = getFactoriesForLocation(matchedLocation);
    if (!allowed.includes(matchedFactory)) {
      matchedFactory = allowed[0];
    }
  }

  let matchedDept: string | undefined;
  if (matchedFactory && rawDept) {
    const units = getDepartmentsForFactory(matchedFactory);
    matchedDept = units.find((u) => u.toLowerCase() === rawDept || toSlug(u) === rawDept);
  }

  return {
    isQuickSubmit: true,
    location: matchedLocation,
    factory: matchedFactory,
    department: matchedDept
  };
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

export interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
  format: 'JPEG' | 'PNG';
}

export function loadImageAsDataUrl(
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

export async function loadBothLogos(): Promise<{
  furnishings: LoadedImage | null;
  molty: LoadedImage | null;
}> {
  const [furnishings, molty] = await Promise.all([
    loadImageAsDataUrl('/assets/aistudio/Master_Furnishings_68c64c06.jpeg', 'JPEG', '#f4f5f6'),
    loadImageAsDataUrl('/assets/aistudio/Master_Logo_17bc2ec9.png', 'PNG')
  ]);
  return { furnishings, molty };
}

const URDU_NASTALIQ_FONT_STACK =
  '"Jameel Noori Nastaleeq", "Jameel Noori Nastaliq", "Noori Nastaleeq", "Noto Nastaliq Urdu", "Alvi Nastaleeq", "Noto Naskh Arabic", Tahoma, Arial, sans-serif';

async function ensureUrduFontsLoaded(): Promise<void> {
  try {
    if (document.fonts) {
      const sampleUrdu = 'آپ ہمارے لیے اہم ہیں کیو آر کوڈ اسکین کریں';
      await Promise.all([
        document.fonts.load('700 64px "Jameel Noori Nastaleeq"', sampleUrdu),
        document.fonts.load('700 64px "Noto Nastaliq Urdu"', sampleUrdu),
        document.fonts.load('700 50px "Noto Nastaliq Urdu"', sampleUrdu),
        document.fonts.load('700 50px "Noto Naskh Arabic"', sampleUrdu)
      ]);
      await document.fonts.ready;
    }
  } catch {
    // Proceed with fallback system fonts if font API fails
  }
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function renderTopUrduBanner(): string {
  const w = 1860;
  const h = 240;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(0, h - 14, w, 14);

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = `700 62px ${URDU_NASTALIQ_FONT_STACK}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('آپ کی ایک اچھی تجویز، بہتری کی ایک نئی راہ!', w / 2, 118, w - 90);

  return canvas.toDataURL('image/png');
}

function renderBottomUrduCallout(): string {
  const w = 1860;
  const h = 860;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, w - 10, h - 10);

  ctx.fillStyle = '#059669';
  ctx.fillRect(5, 5, w - 10, 18);

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const drawBlock = (
    text: string,
    fontSize: number,
    color: string,
    startY: number,
    lineStep: number
  ): number => {
    ctx.font = `700 ${fontSize}px ${URDU_NASTALIQ_FONT_STACK}`;
    ctx.fillStyle = color;
    const lines = wrapTextLines(ctx, text, w - 100);
    let y = startY;
    for (const line of lines) {
      ctx.fillText(line, w / 2, y, w - 80);
      y += lineStep;
    }
    return y;
  };

  const drawDivider = (y: number) => {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(100, y);
    ctx.lineTo(w - 100, y);
    ctx.stroke();
  };

  const primaryText = 'اپنا کائزن آئیڈیا جمع کروانے کے لیے کیو آر کوڈ اسکین کریں!';
  let primaryFontSize = 66;
  ctx.font = `700 ${primaryFontSize}px ${URDU_NASTALIQ_FONT_STACK}`;
  while (primaryFontSize > 56 && ctx.measureText(primaryText).width > w - 90) {
    primaryFontSize -= 2;
    ctx.font = `700 ${primaryFontSize}px ${URDU_NASTALIQ_FONT_STACK}`;
  }

  let nextY = drawBlock(primaryText, primaryFontSize, '#0f172a', 110, 102);
  drawDivider(nextY - 8);

  nextY = drawBlock(
    'آپ ہمارے لیے اہم ہیں، آپ کی آواز سنی جاتی ہے اور آپ کے خیالات کی قدر کی جاتی ہے',
    50,
    '#047857',
    nextY + 66,
    96
  );
  drawDivider(nextY - 8);

  nextY = drawBlock(
    'بہتری کا آغاز آپ سے ہوتا ہے، آج ہی اپنا آئیڈیا شیئر کریں!',
    52,
    '#1d4ed8',
    nextY + 66,
    94
  );

  const barY = Math.max(665, Math.min(738, nextY + 34));
  ctx.fillStyle = '#059669';
  ctx.fillRect(140, barY, w - 280, 94);

  ctx.direction = 'ltr';
  ctx.font = '800 42px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('SCAN FOR IMPROVEMENT', w / 2, barY + 48);

  return canvas.toDataURL('image/png');
}

export async function downloadCentralizedQrPdf(customBaseUrl?: string): Promise<void> {
  await ensureUrduFontsLoaded();
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logos = await loadBothLogos();
  const topBannerUrl = renderTopUrduBanner();
  const bottomCalloutUrl = renderBottomUrduCallout();

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  pdf.setDrawColor(203, 213, 225);
  pdf.setLineWidth(0.7);
  pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);

  pdf.setFillColor(244, 245, 246);
  pdf.rect(10.5, 10.5, pageWidth - 21, 32, 'F');

  const { furnishings, molty } = logos;
  if (furnishings && molty) {
    const fH = 19;
    const fW = fH * (furnishings.width / furnishings.height);
    const mH = 22;
    const mW = mH * (molty.width / molty.height);
    const gap = 14;
    const totalW = fW + gap + mW;
    const startX = centerX - totalW / 2;

    pdf.addImage(furnishings.dataUrl, 'JPEG', startX, 17, fW, fH);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.4);
    pdf.line(startX + fW + gap / 2, 15, startX + fW + gap / 2, 38);
    pdf.addImage(molty.dataUrl, 'PNG', startX + fW + gap, 15.5, mW, mH);
  } else if (furnishings) {
    const fH = 19;
    const fW = fH * (furnishings.width / furnishings.height);
    pdf.addImage(furnishings.dataUrl, 'JPEG', centerX - fW / 2, 17, fW, fH);
  } else if (molty) {
    const mH = 22;
    const mW = mH * (molty.width / molty.height);
    pdf.addImage(molty.dataUrl, 'PNG', centerX - mW / 2, 15.5, mW, mH);
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(71, 85, 105);
  pdf.text('MASTER GROUP OF INDUSTRIES · PAKISTAN', centerX, 49.5, { align: 'center' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(29, 78, 216);
  pdf.text('KARACHI  ·  LAHORE  ·  MIRPUR', centerX, 55.5, { align: 'center' });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.setTextColor(15, 23, 42);
  pdf.text('CENTRALIZED KAIZEN PORTAL', centerX, 66.5, { align: 'center' });

  pdf.addImage(topBannerUrl, 'PNG', 12, 72, pageWidth - 24, 24);

  const targetUrl = buildCentralizedQuickSubmitUrl(customBaseUrl);
  const qrDataUrl = await generateQrDataUrl(targetUrl, 720);
  const qrSize = 84;
  const qrX = centerX - qrSize / 2;
  const qrY = 102;

  pdf.setDrawColor(15, 23, 42);
  pdf.setLineWidth(1.1);
  pdf.rect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);
  pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

  pdf.addImage(bottomCalloutUrl, 'PNG', 12, 196, pageWidth - 24, 86);

  pdf.save('Master_Pakistan_Centralized_Kaizen_QR.pdf');
}

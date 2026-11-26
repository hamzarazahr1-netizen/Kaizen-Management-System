import React, { useEffect, useState } from 'react';
import { FileDown, X, QrCode, Copy, Check, ExternalLink, RotateCcw } from 'lucide-react';
import {
  buildCentralizedQuickSubmitUrl,
  generateQrDataUrl,
  downloadCentralizedQrPdf,
  getDefaultPortalBaseUrl,
  savePortalBaseUrl,
  resetPortalBaseUrl
} from '../utils/qrPdf';

interface QrPosterModalProps {
  onClose: () => void;
}

const QrPosterModal: React.FC<QrPosterModalProps> = ({ onClose }) => {
  const [baseUrl, setBaseUrl] = useState<string>(() => getDefaultPortalBaseUrl());
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const directUrl = buildCentralizedQuickSubmitUrl(baseUrl);
  const isAiStudioPreviewHost = baseUrl.includes('.run.app');
  const isVercelHost = baseUrl.includes('.vercel.app') || baseUrl.includes('vercel.com');

  useEffect(() => {
    let active = true;
    generateQrDataUrl(directUrl, 420).then((url) => {
      if (active) setQrDataUrl(url);
    });
    return () => {
      active = false;
    };
  }, [directUrl]);

  const handleBaseUrlChange = (val: string) => {
    setBaseUrl(val);
    savePortalBaseUrl(val);
  };

  const handleResetBaseUrl = () => {
    setBaseUrl(resetPortalBaseUrl());
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await downloadCentralizedQrPdf(baseUrl);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(directUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleTestForm = () => {
    window.location.href = buildCentralizedQuickSubmitUrl(window.location.origin);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between sticky top-0 z-10">
          <div>
            <h3 className="text-sm font-bold">Centralized Pakistan Kaizen QR Poster (PDF)</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Single universal QR code for Karachi, Lahore & Mirpur facilities
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-600">
                Hosted Portal Base URL (for QR Link)
              </label>
              <button
                type="button"
                onClick={handleResetBaseUrl}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => handleBaseUrlChange(e.target.value)}
              placeholder="https://your-hosted-app-url.com"
              className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-mono bg-slate-50 text-slate-900 outline-none focus:border-blue-600 focus:bg-white"
            />
            {isAiStudioPreviewHost && (
              <p className="text-[11px] text-amber-700 mt-1">
                Paste your public hosted URL (e.g. Vercel / Firebase Hosting) above if hosted externally, so mobile scanners open the public site directly.
              </p>
            )}
            {isVercelHost && (
              <p className="text-[11px] text-amber-700 mt-1">
                Vercel Note: Use your main Production domain and disable Vercel Authentication in Deployment Protection so shop-floor phones open the form immediately.
              </p>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col items-center text-center">
            <div className="w-44 h-44 bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Centralized Pakistan Kaizen QR Code" className="w-full h-full object-contain" />
              ) : (
                <QrCode className="w-10 h-10 text-slate-300" />
              )}
            </div>
            <p className="text-sm font-extrabold text-slate-900 mt-3">
              Master Group Centralized Kaizen QR
            </p>
            <p className="text-xs text-slate-600 mt-1 max-w-md leading-relaxed">
              Scanning opens the unified Kaizen form where employees select Location (Karachi, Lahore, Mirpur), Factory (Master Lifestyle / Master Molty Foam), and their Section.
            </p>
            <p className="text-[11px] font-mono text-slate-500 mt-2 break-all">{directUrl}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="flex-1 px-4 py-3 bg-slate-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <FileDown className="w-4 h-4" />
              <span>{isDownloading ? 'Generating PDF...' : 'Download Centralized QR Poster (PDF)'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>

            <button
              type="button"
              onClick={handleTestForm}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Test Form</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QrPosterModal;

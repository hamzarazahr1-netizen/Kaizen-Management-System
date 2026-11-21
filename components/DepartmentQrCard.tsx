import React, { useEffect, useState } from 'react';
import { QrCode, FileDown, Copy, Check, ExternalLink, RotateCcw } from 'lucide-react';
import { Factory } from '../types';
import {
  buildQuickSubmitUrl,
  generateQrDataUrl,
  downloadDepartmentQrPdf,
  getDefaultPortalBaseUrl,
  savePortalBaseUrl,
  resetPortalBaseUrl
} from '../utils/qrPdf';

interface DepartmentQrCardProps {
  factory: Factory;
  department: string;
}

const DepartmentQrCard: React.FC<DepartmentQrCardProps> = ({ factory, department }) => {
  const [baseUrl, setBaseUrl] = useState<string>(() => getDefaultPortalBaseUrl());
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const directUrl = buildQuickSubmitUrl(factory, department, baseUrl);
  const isAiStudioPreviewHost = baseUrl.includes('.run.app');

  useEffect(() => {
    let active = true;
    generateQrDataUrl(directUrl, 360).then(url => {
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
    const resetVal = resetPortalBaseUrl();
    setBaseUrl(resetVal);
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await downloadDepartmentQrPdf(factory, department, baseUrl);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(directUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const handleTestInBrowser = () => {
    // Test directly in current portal origin so developer can verify even before deploying externally
    const localTestUrl = buildQuickSubmitUrl(factory, department, window.location.origin);
    window.location.href = localTestUrl;
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="w-36 h-36 bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center justify-center shrink-0">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`Direct Kaizen QR Code for ${department}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <QrCode className="w-10 h-10 text-slate-300" />
            )}
          </div>

          <div className="text-center sm:text-left">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Direct Submission QR Code
            </p>
            <h3 className="text-base font-extrabold text-slate-900 mt-1">
              {department} <span aria-hidden="true" className="text-slate-300">·</span> {factory}
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 max-w-xl leading-relaxed">
              Print and display this QR code in your work area. Team members can scan it with any mobile phone or tablet camera to open the Kaizen submission form for <span className="font-semibold text-slate-900">{department}</span> directly—no login or password needed.
            </p>
            <p className="text-[11px] font-mono text-slate-500 mt-2 break-all">
              {directUrl}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="px-4 py-2.5 bg-slate-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60"
          >
            <FileDown className="w-4 h-4" />
            <span>{isDownloading ? 'Generating PDF...' : 'Download QR (PDF)'}</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>

            <button
              type="button"
              onClick={handleTestInBrowser}
              className="flex-1 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Test Form</span>
            </button>
          </div>
        </div>
      </div>

      {/* Public App Base URL configuration for external mobile scanning */}
      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            Hosted Portal Base URL (encoded inside QR code)
          </label>
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => handleBaseUrlChange(e.target.value)}
            placeholder="https://your-hosted-app-url.com"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:border-blue-600 focus:bg-white outline-none"
          />
          {isAiStudioPreviewHost && (
            <p className="text-[11px] text-amber-700 mt-1">
              Note: If you have hosted this app on Vercel, Netlify, or Firebase Hosting, paste that public URL above before downloading the PDF so external phones never hit a private preview link.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleResetBaseUrl}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset URL</span>
        </button>
      </div>
    </div>
  );
};

export default DepartmentQrCard;

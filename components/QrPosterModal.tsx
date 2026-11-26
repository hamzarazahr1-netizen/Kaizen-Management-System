import React, { useEffect, useState } from 'react';
import { FileDown, X, QrCode, Copy, Check, ExternalLink, RotateCcw, Save, CloudCheck } from 'lucide-react';
import {
  CANONICAL_SHARED_URL,
  buildCentralizedQuickSubmitUrl,
  generateQrDataUrl,
  downloadCentralizedQrPdf,
  getDefaultPortalBaseUrl,
  savePortalBaseUrl,
  resetPortalBaseUrl,
  fetchCloudPortalSettings,
  saveCloudPortalSettings
} from '../utils/qrPdf';

interface QrPosterModalProps {
  onClose: () => void;
}

const QrPosterModal: React.FC<QrPosterModalProps> = ({ onClose }) => {
  const [baseUrl, setBaseUrl] = useState<string>(() => getDefaultPortalBaseUrl());
  const [liveTargetUrl, setLiveTargetUrl] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [copied, setCopied] = useState(false);

  const directUrl = buildCentralizedQuickSubmitUrl(baseUrl);

  useEffect(() => {
    let active = true;
    fetchCloudPortalSettings().then((settings) => {
      if (!active) return;
      setBaseUrl(settings.permanentBaseUrl || CANONICAL_SHARED_URL);
      setLiveTargetUrl(settings.liveTargetUrl || '');
    });
    return () => {
      active = false;
    };
  }, []);

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
    setSaveMessage('');
    setSaveError('');
  };

  const handleResetBaseUrl = () => {
    const reset = resetPortalBaseUrl();
    setBaseUrl(reset);
    setLiveTargetUrl('');
    setSaveMessage('');
    setSaveError('');
  };

  const handleSaveCloudSettings = async () => {
    setIsSavingCloud(true);
    setSaveError('');
    setSaveMessage('');
    try {
      const saved = await saveCloudPortalSettings({
        permanentBaseUrl: baseUrl,
        liveTargetUrl
      });
      setBaseUrl(saved.permanentBaseUrl);
      setLiveTargetUrl(saved.liveTargetUrl || '');
      setSaveMessage('Permanent QR link locked across all Pakistan locations.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unable to save permanent QR settings.');
    } finally {
      setIsSavingCloud(false);
    }
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
            <h3 className="text-sm font-bold">Permanent Centralized Pakistan Kaizen QR (PDF)</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              One fixed QR code for Karachi, Lahore & Mirpur — future updates deploy automatically without reprinting
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
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 text-xs text-emerald-950 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <CloudCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Print Once — Auto-Updated Across Future Releases</span>
            </p>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              This QR code points permanently to your Shared Portal URL. Whenever you publish updates to the app, existing printed shopfloor QR posters open the new version automatically without needing a new printout.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Permanent Shopfloor Portal URL (Encoded in Printed QR)
                </label>
                <button
                  type="button"
                  onClick={handleResetBaseUrl}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Use Default</span>
                </button>
              </div>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => handleBaseUrlChange(e.target.value)}
                placeholder={CANONICAL_SHARED_URL}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-mono bg-slate-50 text-slate-900 outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Optional Live Redirect URL (Only if hosting domain ever moves later)
              </label>
              <input
                type="url"
                value={liveTargetUrl}
                onChange={(e) => {
                  setLiveTargetUrl(e.target.value);
                  setSaveMessage('');
                  setSaveError('');
                }}
                placeholder="Leave blank to serve directly on the permanent URL above"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-mono bg-slate-50 text-slate-900 outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleSaveCloudSettings}
                disabled={isSavingCloud}
                className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingCloud ? 'Saving...' : 'Lock Permanent QR Link in Cloud'}</span>
              </button>

              {saveMessage && <span className="text-[11px] font-semibold text-emerald-700">{saveMessage}</span>}
              {saveError && <span className="text-[11px] font-semibold text-red-700">{saveError}</span>}
            </div>
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

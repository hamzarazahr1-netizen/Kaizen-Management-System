import React, { useEffect, useState } from 'react';
import { FileDown, X, QrCode, Layers, RotateCcw } from 'lucide-react';
import { Factory, FACTORIES, getDepartmentsForFactory } from '../types';
import {
  buildQuickSubmitUrl,
  generateQrDataUrl,
  downloadDepartmentQrPdf,
  downloadAllFactoryQrPdf,
  getDefaultPortalBaseUrl,
  savePortalBaseUrl,
  resetPortalBaseUrl
} from '../utils/qrPdf';

interface QrPosterModalProps {
  onClose: () => void;
  initialFactory?: Factory;
}

const QrPosterModal: React.FC<QrPosterModalProps> = ({
  onClose,
  initialFactory = Factory.FURNITURE
}) => {
  const [baseUrl, setBaseUrl] = useState<string>(() => getDefaultPortalBaseUrl());
  const [factory, setFactory] = useState<Factory>(initialFactory);
  const units = getDepartmentsForFactory(factory);
  const [department, setDepartment] = useState<string>(units[0]);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isDownloadingSingle, setIsDownloadingSingle] = useState(false);
  const [isDownloadingBatch, setIsDownloadingBatch] = useState(false);

  const handleFactoryChange = (nextFactory: Factory) => {
    setFactory(nextFactory);
    const nextUnits = getDepartmentsForFactory(nextFactory);
    setDepartment(nextUnits[0]);
  };

  const handleBaseUrlChange = (val: string) => {
    setBaseUrl(val);
    savePortalBaseUrl(val);
  };

  const handleResetBaseUrl = () => {
    setBaseUrl(resetPortalBaseUrl());
  };

  const directUrl = buildQuickSubmitUrl(factory, department, baseUrl);
  const isAiStudioPreviewHost = baseUrl.includes('.run.app');
  const isVercelHost = baseUrl.includes('.vercel.app') || baseUrl.includes('vercel.com');

  useEffect(() => {
    let active = true;
    generateQrDataUrl(directUrl, 400).then(url => {
      if (active) setQrDataUrl(url);
    });
    return () => {
      active = false;
    };
  }, [directUrl]);

  const handleSingleDownload = async () => {
    setIsDownloadingSingle(true);
    try {
      await downloadDepartmentQrPdf(factory, department, baseUrl);
    } finally {
      setIsDownloadingSingle(false);
    }
  };

  const handleBatchDownload = async () => {
    setIsDownloadingBatch(true);
    try {
      await downloadAllFactoryQrPdf(factory, baseUrl);
    } finally {
      setIsDownloadingBatch(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between sticky top-0 z-10">
          <div>
            <h3 className="text-sm font-bold">Department QR Code Posters (PDF)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Generate printable direct-submission QR posters</p>
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
                Paste your public hosted URL (e.g. Vercel / Netlify / Firebase Hosting) above if your app is hosted externally, so Google Lens opens the live site without Page Not Found.
              </p>
            )}
            {isVercelHost && (
              <p className="text-[11px] text-amber-700 mt-1">
                Vercel Note: Use your main Production domain and disable <strong>Vercel Authentication</strong> in Vercel Project Settings → Deployment Protection so mobile phones are not asked to log in to Vercel.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Factory</label>
              <select
                value={factory}
                onChange={(e) => handleFactoryChange(e.target.value as Factory)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
              >
                {FACTORIES.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                {factory === Factory.MOLTY_FOAM ? 'Section' : 'Department'}
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
              >
                {units.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col items-center text-center">
            <div className="w-40 h-40 bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`QR Code for ${department}`} className="w-full h-full object-contain" />
              ) : (
                <QrCode className="w-10 h-10 text-slate-300" />
              )}
            </div>
            <p className="text-sm font-extrabold text-slate-900 mt-3">{department}</p>
            <p className="text-xs text-slate-500">{factory}</p>
            <p className="text-[11px] font-mono text-slate-400 mt-1.5 break-all">{directUrl}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleSingleDownload}
              disabled={isDownloadingSingle}
              className="flex-1 px-4 py-3 bg-slate-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <FileDown className="w-4 h-4" />
              <span>{isDownloadingSingle ? 'Creating PDF...' : `Download ${department} PDF`}</span>
            </button>

            <button
              type="button"
              onClick={handleBatchDownload}
              disabled={isDownloadingBatch}
              className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Layers className="w-4 h-4" />
              <span>{isDownloadingBatch ? 'Generating All...' : `All ${units.length} Units (PDF)`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QrPosterModal;

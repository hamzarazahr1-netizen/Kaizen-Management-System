import React, { useState } from 'react';
import { CheckCircle2, PlusCircle, LogIn } from 'lucide-react';
import { Factory, Kaizen } from '../types';
import KaizenForm from './KaizenForm';

interface QuickSubmitPortalProps {
  factory: Factory;
  department: string;
  onSubmit: (kaizen: Kaizen) => Promise<void>;
  onGoToLogin: () => void;
}

const QuickSubmitPortal: React.FC<QuickSubmitPortalProps> = ({
  factory,
  department,
  onSubmit,
  onGoToLogin
}) => {
  const [submittedKaizen, setSubmittedKaizen] = useState<Kaizen | null>(null);
  const [formKey, setFormKey] = useState(0);

  const handleQuickSubmit = async (newKaizen: Kaizen) => {
    await onSubmit(newKaizen);
    setSubmittedKaizen(newKaizen);
  };

  const handleReset = () => {
    setSubmittedKaizen(null);
    setFormKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <img
              src="/assets/aistudio/Master_Furnishings_68c64c06.jpeg"
              alt="Master Furnishings"
              className="h-8 sm:h-9 w-auto object-contain mix-blend-multiply shrink-0"
              referrerPolicy="no-referrer"
            />
            <img
              src="/assets/aistudio/Master_Logo_17bc2ec9.png"
              alt="Master Molty Foam"
              className="h-8 sm:h-9 w-auto object-contain rounded shrink-0"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="border-l border-slate-200 pl-3 min-w-0">
            <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
              Master Kaizen Management System
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">
              {factory} <span aria-hidden="true">·</span> <span className="font-semibold text-blue-700">{department}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onGoToLogin}
          className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Portal Login</span>
        </button>
      </header>

      <main className="flex-1 p-4 md:p-6 pb-16">
        <div className="max-w-4xl mx-auto">
          {submittedKaizen ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 md:p-10 text-center max-w-xl mx-auto mt-6">
              <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>

              <h2 className="text-xl font-extrabold text-slate-900">
                Kaizen Registered Successfully
              </h2>
              <p className="text-xs text-slate-500 mt-1.5">
                Your submission has been synced to the cloud for Lean review.
              </p>

              <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-5 text-left space-y-2.5 text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Reference ID</span>
                  <span className="font-mono font-bold text-slate-900">{submittedKaizen.id}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Factory</span>
                  <span className="font-bold text-slate-900">{submittedKaizen.factory}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Department / Section</span>
                  <span className="font-bold text-blue-700">{submittedKaizen.department}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Initiator</span>
                  <span className="font-bold text-slate-900">{submittedKaizen.initiator}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Workflow & Period</span>
                  <span className="font-bold text-slate-900">{submittedKaizen.type} · {submittedKaizen.month}</span>
                </div>
              </div>

              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 px-4 py-3 bg-slate-900 hover:bg-blue-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Submit Another Kaizen</span>
                </button>
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Open Portal Login</span>
                </button>
              </div>
            </div>
          ) : (
            <KaizenForm
              key={formKey}
              factory={factory}
              department={department}
              onSubmit={handleQuickSubmit}
            />
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-3 px-6 text-center text-xs text-slate-500">
        Master Furnishings Pvt. Ltd. · Lean & Transformation Direct QR Submission
      </footer>
    </div>
  );
};

export default QuickSubmitPortal;

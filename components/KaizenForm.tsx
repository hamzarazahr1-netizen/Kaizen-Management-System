import React, { useState } from 'react';
import { Factory, Kaizen, KaizenType, KaizenStatus, MONTHS } from '../types';

interface KaizenFormProps {
  factory: Factory;
  department: string;
  onSubmit: (kaizen: Kaizen) => Promise<void> | void;
}

const getDefaultMonth = (): string => {
  const now = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const yr = String(now.getFullYear()).slice(-2);
  const candidate = `${monthNames[now.getMonth()]} ${yr}`;
  if (MONTHS.includes(candidate)) return candidate;
  return MONTHS[MONTHS.length - 1];
};

const KaizenForm: React.FC<KaizenFormProps> = ({ factory, department, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    initiator: '',
    presentationDate: new Date().toISOString().split('T')[0],
    type: KaizenType.IDEA,
    month: getDefaultMonth(),
    problem: '',
    solution: '',
    challenges: '',
    impact: {
      costSaving: false,
      productivity: false,
      quality: false,
      safety: false,
      delivery: false
    }
  });

  const [images, setImages] = useState({ before: '', after: '' });

  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError('Image file too large. Please select an image under 5MB.');
        return;
      }
      setSubmitError('');
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setImages(prev => ({ ...prev, [type]: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError('');
    setIsSubmitting(true);

    const newKaizen: Kaizen = {
      ...formData,
      initiator: formData.initiator.trim().slice(0, 100),
      problem: formData.problem.trim().slice(0, 10000),
      solution: formData.solution.trim().slice(0, 10000),
      challenges: formData.challenges.trim().slice(0, 5000),
      id: `kz-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      factory,
      department,
      submissionDate: new Date().toLocaleDateString(),
      status: KaizenStatus.PENDING,
      reward: 0,
      feedback: '',
      beforeImg: images.before.slice(0, 900000),
      afterImg: images.after.slice(0, 900000)
    };

    try {
      await onSubmit(newKaizen);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to save submission. Please check connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-w-4xl mx-auto text-slate-900">
      <div className="bg-slate-900 px-8 py-6 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight">New Kaizen Submission</h2>
          <p className="text-slate-300 text-xs mt-1">
            {factory} <span aria-hidden="true" className="mx-1.5 text-slate-500">·</span> <span className="text-blue-300 font-semibold">{department}</span>
          </p>
        </div>
        <span className="text-xs text-slate-400 font-medium">Target: 4 Kaizens / Month</span>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs font-semibold">
            {submitError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Initiator Name</label>
            <input
              type="text"
              required
              maxLength={100}
              value={formData.initiator}
              onChange={e => setFormData({ ...formData, initiator: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:bg-white outline-none"
              placeholder="Full name of initiator"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Presentation Date</label>
            <input
              type="date"
              required
              value={formData.presentationDate}
              onChange={e => setFormData({ ...formData, presentationDate: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 tabular-nums focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:bg-white outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Workflow Type</label>
            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as KaizenType })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:bg-white outline-none"
            >
              <option value={KaizenType.IDEA}>Idea (Draft Phase — 50 PKR Reward)</option>
              <option value={KaizenType.IMPLEMENTED}>Implemented (Final Phase — 200 PKR Reward)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Recording Period</label>
            <select
              value={formData.month}
              onChange={e => setFormData({ ...formData, month: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:bg-white outline-none"
            >
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Problem Statement</label>
            <textarea
              required
              maxLength={10000}
              value={formData.problem}
              onChange={e => setFormData({ ...formData, problem: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 h-28 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:bg-white outline-none resize-none"
              placeholder="Describe the existing issue or inefficiency..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Strategic Solution</label>
            <textarea
              required
              maxLength={10000}
              value={formData.solution}
              onChange={e => setFormData({ ...formData, solution: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 h-28 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:bg-white outline-none resize-none"
              placeholder="Detail the improvements made or proposed..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Operational Challenges</label>
            <textarea
              maxLength={5000}
              value={formData.challenges}
              onChange={e => setFormData({ ...formData, challenges: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 h-24 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:bg-white outline-none resize-none"
              placeholder="List any difficulties or constraints encountered..."
            />
          </div>
        </div>

        <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
          <label className="block text-xs font-bold text-slate-700 mb-4">Strategic Impact Assessment</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.keys(formData.impact).map((key) => (
              <label key={key} className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                <input
                  type="checkbox"
                  checked={(formData.impact as Record<string, boolean>)[key]}
                  onChange={e => setFormData({
                    ...formData,
                    impact: { ...formData.impact, [key]: e.target.checked }
                  })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-slate-700 capitalize">{key.replace('Saving', ' Saving')}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-600">Pre-Optimization Photo (Before)</label>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={e => handleImageUpload(e, 'before')}
                className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
              {images.before && (
                <img src={images.before} alt="Before optimization" className="w-full h-48 object-cover rounded-lg border border-slate-200" />
              )}
            </div>
          </div>
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-600">Post-Optimization Photo (After)</label>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={e => handleImageUpload(e, 'after')}
                className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
              {images.after && (
                <img src={images.after} alt="After optimization" className="w-full h-48 object-cover rounded-lg border border-slate-200" />
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full bg-slate-900 hover:bg-blue-800 text-white text-xs font-bold uppercase py-4 rounded-lg transition-all tracking-wider flex items-center justify-center gap-3 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Saving to Cloud...</span>
            </>
          ) : 'Submit Kaizen Proposal'}
        </button>
      </form>
    </div>
  );
};

export default KaizenForm;

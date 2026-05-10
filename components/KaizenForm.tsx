
import React, { useState } from 'react';
import { Kaizen, KaizenType, KaizenStatus, MONTHS } from '../types';

interface KaizenFormProps {
  department: string;
  onSubmit: (kaizen: Kaizen) => void;
}

const KaizenForm: React.FC<KaizenFormProps> = ({ department, onSubmit }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    initiator: '',
    presentationDate: new Date().toISOString().split('T')[0],
    type: KaizenType.IDEA,
    month: MONTHS[new Date().getMonth() > 11 ? 0 : new Date().getMonth()], // Default to current month
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

  // Helper to compress image
  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Professional standard for web reports
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
        // Reduce quality to 0.7 for huge space savings with minimal visual loss
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File too large. Please select an image under 5MB.");
        return;
      }
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
    
    setIsSubmitting(true);
    const newKaizen: Kaizen = {
      ...formData,
      id: `kz-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      department,
      submissionDate: new Date().toLocaleDateString(),
      status: KaizenStatus.PENDING,
      reward: 0,
      feedback: '',
      beforeImg: images.before,
      afterImg: images.after
    };
    
    try {
      await onSubmit(newKaizen);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden max-w-4xl mx-auto text-slate-900">
      <div className="bg-slate-900 p-6 text-white">
        <h2 className="text-2xl font-bold uppercase tracking-tight">New Kaizen Submission</h2>
        <p className="text-slate-400 text-sm">Business Unit: {department}</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest">Initiator Name</label>
            <input 
              type="text" 
              required
              value={formData.initiator}
              onChange={e => setFormData({...formData, initiator: e.target.value})}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Full name of initiator"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest">Presentation Date</label>
            <input 
              type="date" 
              required
              value={formData.presentationDate}
              onChange={e => setFormData({...formData, presentationDate: e.target.value})}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest">Workflow Type</label>
            <select 
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value as KaizenType})}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value={KaizenType.IDEA}>Idea (Draft Phase)</option>
              <option value={KaizenType.IMPLEMENTED}>Implemented (Final Phase)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest">Recording Period</label>
            <select 
              value={formData.month}
              onChange={e => setFormData({...formData, month: e.target.value})}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Detailed Info */}
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest">Problem Statement</label>
            <textarea 
              required
              value={formData.problem}
              onChange={e => setFormData({...formData, problem: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 h-32 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              placeholder="Describe the existing issue or inefficiency..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest">Strategic Solution</label>
            <textarea 
              required
              value={formData.solution}
              onChange={e => setFormData({...formData, solution: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 h-32 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              placeholder="Detail the improvements made or proposed..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest">Operational Challenges</label>
            <textarea 
              value={formData.challenges}
              onChange={e => setFormData({...formData, challenges: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 h-24 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              placeholder="List any difficulties or constraints encountered..."
            />
          </div>
        </div>

        {/* Impact Matrix */}
        <div className="bg-slate-50 p-6 rounded border border-slate-200">
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Strategic Impact Assessment</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {Object.keys(formData.impact).map((key) => (
              <label key={key} className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-200 rounded cursor-pointer hover:bg-blue-50 transition-colors">
                <input 
                  type="checkbox" 
                  checked={(formData.impact as any)[key]}
                  onChange={e => setFormData({
                    ...formData, 
                    impact: { ...formData.impact, [key]: e.target.checked }
                  })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{key.replace('Saving', ' Saving')}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Media Upload */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Pre-Optimization (Before)</label>
            <div className="flex flex-col gap-2">
              <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'before')} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
              {images.before && <img src={images.before} alt="Before" className="w-full h-48 object-cover rounded border border-slate-200" />}
            </div>
          </div>
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Post-Optimization (After)</label>
            <div className="flex flex-col gap-2">
              <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'after')} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
              {images.after && <img src={images.after} alt="After" className="w-full h-48 object-cover rounded border border-slate-200" />}
            </div>
          </div>
        </div>

        <button 
          type="submit"
          disabled={isSubmitting}
          className={`w-full bg-slate-900 hover:bg-black text-white font-bold uppercase py-4 rounded shadow-lg transition-all active:scale-[0.99] tracking-widest flex items-center justify-center gap-3 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              Syncing with Cloud...
            </>
          ) : 'Submit Strategic Proposal'}
        </button>
      </form>
    </div>
  );
};

export default KaizenForm;


import React, { useState, useMemo } from 'react';
import { User, Kaizen, KaizenStatus, MONTHS, KaizenType, DEPARTMENTS } from '../types';

interface RecordsProps {
  user: User;
  kaizens: Kaizen[];
  onUpdate: (kaizen: Kaizen) => void;
}

const Records: React.FC<RecordsProps> = ({ user, kaizens, onUpdate }) => {
  const [monthFilter, setMonthFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState(user.role === 'ADMIN' ? 'All' : user.department);
  const [selectedKaizen, setSelectedKaizen] = useState<Kaizen | null>(null);

  const activeMonthsInRecords = useMemo(() => {
    const months = Array.from(new Set(kaizens.map(k => k.month)));
    // Fixed: Explicitly cast sort parameters to string to resolve unknown type error during MONTHS.indexOf()
    return months.sort((a, b) => MONTHS.indexOf(a as string) - MONTHS.indexOf(b as string));
  }, [kaizens]);

  const filtered = useMemo(() => {
    return kaizens.filter(k => {
      const mMatch = monthFilter === 'All' || k.month === monthFilter;
      const sMatch = statusFilter === 'All' || k.status === statusFilter;
      const dMatch = user.role === 'ADMIN' ? (deptFilter === 'All' || k.department === deptFilter) : (k.department === user.department);
      return mMatch && sMatch && dMatch;
    });
  }, [kaizens, monthFilter, statusFilter, deptFilter, user]);

  const handleReview = (status: KaizenStatus) => {
    if (!selectedKaizen) return;
    let reward = 0;
    if (status === KaizenStatus.ACCEPTED) {
      reward = selectedKaizen.type === KaizenType.IDEA ? 50 : 200;
    }
    
    onUpdate({
      ...selectedKaizen,
      status,
      reward,
      feedback: (document.getElementById('feedback-input') as HTMLTextAreaElement)?.value || selectedKaizen.feedback
    });
    setSelectedKaizen(null);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-white p-6 rounded-lg border border-slate-200 flex flex-wrap gap-6 items-end shadow-sm">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Reporting Period</label>
          <select 
            value={monthFilter} 
            onChange={e => setMonthFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded text-[10px] font-black uppercase bg-slate-50 text-slate-900 outline-none"
          >
            <option value="All">All Active Months</option>
            {activeMonthsInRecords.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Current Status</label>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded text-[10px] font-black uppercase bg-slate-50 text-slate-900 outline-none"
          >
            <option value="All">All Statuses</option>
            {Object.values(KaizenStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {user.role === 'ADMIN' && (
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Business Unit</label>
            <select 
              value={deptFilter} 
              onChange={e => setDeptFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded text-[10px] font-black uppercase bg-slate-50 text-slate-900 outline-none"
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest font-black">
            <tr>
              <th className="px-6 py-5">Date</th>
              <th className="px-6 py-5">Department</th>
              <th className="px-6 py-5">Initiator</th>
              <th className="px-6 py-5">Type</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5 text-right">PKR</th>
              <th className="px-6 py-5 text-center">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(k => (
              <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-[10px] font-bold text-slate-400">{k.submissionDate}</td>
                <td className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase">{k.department}</td>
                <td className="px-6 py-4 text-[10px] font-black text-blue-600 uppercase">{k.initiator}</td>
                <td className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">{k.type}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                    k.status === KaizenStatus.ACCEPTED ? 'bg-emerald-100 text-emerald-800' :
                    k.status === KaizenStatus.REJECTED ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {k.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-[10px] text-slate-900 text-right font-black">{k.reward.toLocaleString()}</td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => setSelectedKaizen(k)}
                    className="text-white bg-slate-900 hover:bg-black px-3 py-1 rounded text-[8px] font-black uppercase tracking-widest transition-all"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-20 text-center text-slate-400 text-xs uppercase font-black tracking-widest italic">
                   No Records Found In Selected Filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedKaizen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-700 animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 text-white sticky top-0 z-10">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest">{selectedKaizen.type} Report</h3>
                <p className="text-[10px] text-slate-400 font-bold">Initiator: <span className="text-blue-400 uppercase">{selectedKaizen.initiator}</span></p>
              </div>
              <button onClick={() => setSelectedKaizen(null)} className="text-white hover:text-red-500 text-[10px] font-black uppercase border border-slate-700 px-4 py-2 rounded transition-all">Close</button>
            </div>
            
            <div className="p-8 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-widest border-l-4 border-blue-600 pl-2 mb-3">Problem Statement</h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200 whitespace-pre-wrap">{selectedKaizen.problem}</p>
                </div>
                <div>
                  <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-widest border-l-4 border-emerald-600 pl-2 mb-3">Proposed Solution</h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200 whitespace-pre-wrap">{selectedKaizen.solution}</p>
                </div>
              </div>

              <div>
                <h4 className="text-[9px] font-black text-slate-900 uppercase tracking-widest border-l-4 border-slate-400 pl-2 mb-4">Strategic Impact</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(selectedKaizen.impact).map(([key, value]) => (
                    <div key={key} className={`px-4 py-2 rounded text-[9px] font-black border uppercase tracking-widest ${value ? 'bg-blue-600 border-blue-700 text-white' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                      {key.replace('Saving', ' Saving')}
                    </div>
                  ))}
                </div>
              </div>

              {(selectedKaizen.beforeImg || selectedKaizen.afterImg) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedKaizen.beforeImg && (
                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-slate-400 uppercase text-center tracking-widest">Baseline (Before)</p>
                      <img src={selectedKaizen.beforeImg} className="w-full h-64 object-cover rounded border-2 border-slate-100" />
                    </div>
                  )}
                  {selectedKaizen.afterImg && (
                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-slate-400 uppercase text-center tracking-widest">Optimized (After)</p>
                      <img src={selectedKaizen.afterImg} className="w-full h-64 object-cover rounded border-2 border-slate-100" />
                    </div>
                  )}
                </div>
              )}

              {user.role === 'ADMIN' && selectedKaizen.status === KaizenStatus.PENDING ? (
                <div className="bg-slate-900 p-8 rounded-xl shadow-2xl space-y-5 text-white border-t-8 border-blue-600">
                  <h4 className="text-xs font-black uppercase tracking-widest">Executive Decision Portal</h4>
                  <textarea 
                    id="feedback-input"
                    className="w-full p-4 border border-slate-700 bg-slate-800 text-white rounded text-xs h-24 focus:border-blue-500 outline-none transition-all placeholder:text-slate-500 resize-none font-medium"
                    placeholder="Enter official feedback and remarks..."
                    defaultValue={selectedKaizen.feedback}
                  />
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleReview(KaizenStatus.ACCEPTED)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black uppercase py-4 rounded transition-all shadow-xl active:scale-[0.98]"
                    >
                      Accept & Disburse Reward
                    </button>
                    <button 
                      onClick={() => handleReview(KaizenStatus.REJECTED)}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-[10px] font-black uppercase py-4 rounded transition-all shadow-xl active:scale-[0.98]"
                    >
                      Reject Kaizen Proposal
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`p-8 rounded-xl border shadow-inner ${selectedKaizen.status === KaizenStatus.ACCEPTED ? 'bg-emerald-50 border-emerald-200' : selectedKaizen.status === KaizenStatus.REJECTED ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex justify-between items-center mb-6">
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Official Decision Summary</h4>
                     <span className="text-[14px] font-black uppercase text-slate-900">{selectedKaizen.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-black mb-1">Assessed Value</p>
                      <p className="text-xl font-black text-slate-900">{selectedKaizen.reward.toLocaleString()} PKR</p>
                    </div>
                  </div>
                  {selectedKaizen.feedback && (
                    <div className="border-t border-slate-200 pt-4">
                      <p className="text-[9px] text-slate-400 uppercase font-black mb-2">Management Feedback</p>
                      <p className="bg-white p-4 rounded border border-slate-100 italic text-slate-700 text-xs font-medium">"{selectedKaizen.feedback}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Records;


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

  const activeMonths = useMemo(() => {
    const months = kaizens.map(k => k.month);
    return Array.from(new Set(months)).sort((a: string, b: string) => MONTHS.indexOf(a) - MONTHS.indexOf(b));
  }, [kaizens]);

  const filtered = useMemo(() => {
    return kaizens.filter(k => {
      const mMatch = monthFilter === 'All' || k.month === monthFilter;
      const sMatch = statusFilter === 'All' || k.status === statusFilter;
      const dMatch = deptFilter === 'All' || k.department === deptFilter;
      return mMatch && sMatch && dMatch;
    });
  }, [kaizens, monthFilter, statusFilter, deptFilter]);

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
    <div className="space-y-6 text-slate-900">
      <div className="bg-white p-5 rounded border border-slate-200 flex flex-wrap gap-6 items-end shadow-sm">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Target Month</label>
          <select 
            value={monthFilter} 
            onChange={e => setMonthFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded text-xs font-bold uppercase bg-slate-50 text-slate-900 outline-none"
          >
            <option value="All">All Active Logs</option>
            {activeMonths.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Workflow Status</label>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded text-xs font-bold uppercase bg-slate-50 text-slate-900 outline-none"
          >
            <option value="All">Any Status</option>
            <option value={KaizenStatus.PENDING}>Pending Review</option>
            <option value={KaizenStatus.ACCEPTED}>Accepted</option>
            <option value={KaizenStatus.REJECTED}>Rejected</option>
          </select>
        </div>
        {user.role === 'ADMIN' && (
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Business Unit</label>
            <select 
              value={deptFilter} 
              onChange={e => setDeptFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded text-xs font-bold uppercase bg-slate-50 text-slate-900 outline-none"
            >
              <option value="All">Entire Company</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}
        <div className="ml-auto text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-full uppercase tracking-widest">
          {filtered.length} Entries Identified
        </div>
      </div>

      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white uppercase text-[9px] tracking-widest font-bold">
            <tr>
              <th className="px-6 py-4">Submission Date</th>
              {user.role === 'ADMIN' && <th className="px-6 py-4 border-l border-slate-800">Department</th>}
              <th className="px-6 py-4 border-l border-slate-800">Initiator</th>
              <th className="px-6 py-4 border-l border-slate-800">Category</th>
              <th className="px-6 py-4 border-l border-slate-800">Status</th>
              <th className="px-6 py-4 border-l border-slate-800 text-right">Value (PKR)</th>
              <th className="px-6 py-4 border-l border-slate-800 text-center">Protocol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(k => (
              <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-[11px] font-bold text-slate-500">{k.submissionDate}</td>
                {user.role === 'ADMIN' && <td className="px-6 py-4 text-[11px] font-extrabold text-slate-900">{k.department}</td>}
                <td className="px-6 py-4 text-[11px] font-extrabold text-blue-700">{k.initiator}</td>
                <td className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">{k.type}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter ${
                    k.status === KaizenStatus.ACCEPTED ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    k.status === KaizenStatus.REJECTED ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {k.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-[11px] text-slate-900 text-right font-black">{k.reward}</td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => setSelectedKaizen(k)}
                    className="text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded text-[9px] font-bold uppercase tracking-widest transition-all"
                  >
                    Examine
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedKaizen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] text-slate-900">
          <div className="bg-white rounded shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-slate-800">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 text-white sticky top-0 z-10">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest">{selectedKaizen.type} Analysis Report</h3>
                <p className="text-[10px] opacity-60 uppercase font-medium">Log ID: {selectedKaizen.id} | Initiator: <span className="text-blue-400">{selectedKaizen.initiator}</span></p>
              </div>
              <button onClick={() => setSelectedKaizen(null)} className="text-white hover:text-blue-400 text-xl font-bold transition-colors">CLOSE [X]</button>
            </div>
            
            <div className="p-10 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-4 border-slate-900 pl-3">Context & Problem Statement</h4>
                  <p className="text-slate-900 text-xs leading-relaxed font-medium bg-slate-50 p-4 rounded border border-slate-100 whitespace-pre-wrap">{selectedKaizen.problem}</p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-4 border-slate-900 pl-3">Proposed Strategic Solution</h4>
                  <p className="text-slate-900 text-xs leading-relaxed font-medium bg-slate-50 p-4 rounded border border-slate-100 whitespace-pre-wrap">{selectedKaizen.solution}</p>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-4 border-slate-900 pl-3 mb-4">Impact Assessment Matrix</h4>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(selectedKaizen.impact).map(([key, value]) => (
                    <span key={key} className={`px-4 py-2 rounded text-[10px] font-black border uppercase tracking-widest ${value ? 'bg-blue-50 border-blue-200 text-slate-700' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                      {key.replace('Saving', ' Saving')}
                    </span>
                  ))}
                </div>
              </div>

              {(selectedKaizen.beforeImg || selectedKaizen.afterImg) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {selectedKaizen.beforeImg && (
                    <div className="space-y-2">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase text-center tracking-widest">Pre-Optimization (Before)</h4>
                      <img src={selectedKaizen.beforeImg} className="w-full h-72 object-cover rounded shadow-lg border border-slate-200" alt="Pre" />
                    </div>
                  )}
                  {selectedKaizen.afterImg && (
                    <div className="space-y-2">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase text-center tracking-widest">Post-Optimization (After)</h4>
                      <img src={selectedKaizen.afterImg} className="w-full h-72 object-cover rounded shadow-lg border border-slate-200" alt="Post" />
                    </div>
                  )}
                </div>
              )}

              {user.role === 'ADMIN' && selectedKaizen.status === KaizenStatus.PENDING ? (
                <div className="bg-slate-900 p-8 rounded shadow-2xl space-y-5 text-white">
                  <h4 className="text-xs font-bold text-white uppercase tracking-widest">Administrative Executive Decision</h4>
                  <textarea 
                    id="feedback-input"
                    className="w-full p-4 border border-slate-700 bg-slate-800 text-white rounded text-xs h-28 focus:border-blue-500 outline-none transition-all placeholder:text-slate-500 resize-none"
                    placeholder="Provide constructive feedback or specific reasoning for rejection..."
                    defaultValue={selectedKaizen.feedback}
                  />
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleReview(KaizenStatus.ACCEPTED)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase py-4 rounded transition-all shadow-lg"
                    >
                      Approve Implementation
                    </button>
                    <button 
                      onClick={() => handleReview(KaizenStatus.REJECTED)}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase py-4 rounded transition-all shadow-lg"
                    >
                      Decline Proposal
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`p-8 rounded border-2 shadow-sm ${selectedKaizen.status === KaizenStatus.ACCEPTED ? 'bg-emerald-50 border-emerald-200' : selectedKaizen.status === KaizenStatus.REJECTED ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  <h4 className="text-xs font-black uppercase tracking-widest mb-4">Official Executive Summary</h4>
                  <div className="grid grid-cols-2 gap-8 mb-6">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Outcome</p>
                      <p className="text-lg font-black uppercase">{selectedKaizen.status}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Reward Disbursed</p>
                      <p className="text-lg font-black uppercase">{selectedKaizen.reward} PKR</p>
                    </div>
                  </div>
                  {selectedKaizen.feedback && (
                    <div className="border-t border-slate-200 pt-4">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Internal Feedback</p>
                      <p className="text-xs italic text-slate-700 leading-relaxed font-medium">" {selectedKaizen.feedback} "</p>
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

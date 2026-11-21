import React, { useState, useMemo } from 'react';
import {
  User,
  Kaizen,
  KaizenStatus,
  MONTHS,
  KaizenType,
  Factory,
  FACTORIES,
  getDepartmentsForFactory,
  getShortFactoryName
} from '../types';

interface RecordsProps {
  user: User;
  kaizens: Kaizen[];
  onUpdate: (kaizen: Kaizen) => void;
}

const Records: React.FC<RecordsProps> = ({ user, kaizens, onUpdate }) => {
  const [factoryFilter, setFactoryFilter] = useState<'All' | Factory>(
    user.role === 'ADMIN' ? 'All' : (user.factory as Factory)
  );
  const [monthFilter, setMonthFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState(user.role === 'ADMIN' ? 'All' : user.department);
  const [selectedKaizen, setSelectedKaizen] = useState<Kaizen | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState('');

  const availableDepts = useMemo(() => {
    return getDepartmentsForFactory(factoryFilter);
  }, [factoryFilter]);

  const handleFactoryFilterChange = (val: 'All' | Factory) => {
    setFactoryFilter(val);
    if (val !== 'All') {
      const units = getDepartmentsForFactory(val);
      if (deptFilter !== 'All' && !units.includes(deptFilter)) {
        setDeptFilter('All');
      }
    }
  };

  const activeMonthsInRecords = useMemo(() => {
    const months = Array.from(new Set(kaizens.map(k => k.month)));
    return months.sort((a, b) => MONTHS.indexOf(a as string) - MONTHS.indexOf(b as string));
  }, [kaizens]);

  const filtered = useMemo(() => {
    return kaizens.filter(k => {
      const fMatch = user.role === 'ADMIN'
        ? (factoryFilter === 'All' || k.factory === factoryFilter)
        : k.factory === user.factory;
      const mMatch = monthFilter === 'All' || k.month === monthFilter;
      const sMatch = statusFilter === 'All' || k.status === statusFilter;
      const dMatch = user.role === 'ADMIN'
        ? (deptFilter === 'All' || k.department === deptFilter)
        : k.department === user.department;
      return fMatch && mMatch && sMatch && dMatch;
    });
  }, [kaizens, factoryFilter, monthFilter, statusFilter, deptFilter, user]);

  const openModal = (k: Kaizen) => {
    setSelectedKaizen(k);
    setFeedbackDraft(k.feedback || '');
  };

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
      feedback: feedbackDraft.trim().slice(0, 5000)
    });
    setSelectedKaizen(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-wrap gap-4 items-end justify-between">
        <div className="flex flex-wrap gap-4 items-end">
          {user.role === 'ADMIN' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Factory</label>
              <select
                value={factoryFilter}
                onChange={e => handleFactoryFilterChange(e.target.value as 'All' | Factory)}
                className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
              >
                <option value="All">All Factories</option>
                {FACTORIES.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Reporting Period</label>
            <select
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
            >
              <option value="All">All Active Months</option>
              {activeMonthsInRecords.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
            >
              <option value="All">All Statuses</option>
              {Object.values(KaizenStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {user.role === 'ADMIN' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Department / Section</label>
              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
              >
                <option value="All">All Units ({availableDepts.length})</option>
                {availableDepts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
        </div>

        <p className="text-xs font-semibold text-slate-500 tabular-nums">
          Showing {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[900px]">
          <thead className="bg-slate-900 text-white text-xs font-bold">
            <tr>
              <th className="px-5 py-3.5">Date</th>
              {user.role === 'ADMIN' && <th className="px-5 py-3.5">Factory</th>}
              <th className="px-5 py-3.5">Unit / Section</th>
              <th className="px-5 py-3.5">Initiator</th>
              <th className="px-5 py-3.5">Type</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Reward (PKR)</th>
              <th className="px-5 py-3.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filtered.map(k => (
              <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5 text-slate-500 tabular-nums whitespace-nowrap">
                  {k.submissionDate} <span className="text-slate-300">·</span> {k.month}
                </td>
                {user.role === 'ADMIN' && (
                  <td className="px-5 py-3.5 font-semibold text-slate-700 whitespace-nowrap">
                    {getShortFactoryName(k.factory)}
                  </td>
                )}
                <td className="px-5 py-3.5 font-bold text-slate-900">{k.department}</td>
                <td className="px-5 py-3.5 font-semibold text-blue-700">{k.initiator}</td>
                <td className="px-5 py-3.5 text-slate-600">{k.type}</td>
                <td className="px-5 py-3.5">
                  <span className={`font-bold ${
                    k.status === KaizenStatus.ACCEPTED ? 'text-emerald-700' :
                    k.status === KaizenStatus.REJECTED ? 'text-red-700' : 'text-amber-600'
                  }`}>
                    {k.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-slate-900 text-right font-bold tabular-nums">
                  {k.reward.toLocaleString()}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <button
                    onClick={() => openModal(k)}
                    className="text-white bg-slate-900 hover:bg-blue-800 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={user.role === 'ADMIN' ? 8 : 7} className="px-6 py-16 text-center text-slate-400 text-xs font-semibold">
                  No Kaizen records found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedKaizen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900 text-white sticky top-0 z-10">
              <div>
                <h3 className="text-sm font-bold">{selectedKaizen.type} Report</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {selectedKaizen.factory} · {selectedKaizen.department} · Initiator: <span className="text-blue-300 font-semibold">{selectedKaizen.initiator}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedKaizen(null)}
                className="text-white hover:bg-slate-800 text-xs font-bold border border-slate-700 px-4 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-2">Problem Statement</h4>
                  <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200 whitespace-pre-wrap">
                    {selectedKaizen.problem}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-2">Proposed Solution</h4>
                  <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200 whitespace-pre-wrap">
                    {selectedKaizen.solution}
                  </p>
                </div>
              </div>

              {selectedKaizen.challenges && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-2">Operational Challenges</h4>
                  <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200 whitespace-pre-wrap">
                    {selectedKaizen.challenges}
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-3">Strategic Impact</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(selectedKaizen.impact || {}).map(([key, value]) => (
                    <span
                      key={key}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border ${
                        value
                          ? 'bg-blue-700 border-blue-700 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      {key.replace('Saving', ' Saving')}
                    </span>
                  ))}
                </div>
              </div>

              {(selectedKaizen.beforeImg || selectedKaizen.afterImg) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedKaizen.beforeImg && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-500">Baseline (Before)</p>
                      <img src={selectedKaizen.beforeImg} alt="Before optimization" className="w-full h-64 object-cover rounded-lg border border-slate-200" />
                    </div>
                  )}
                  {selectedKaizen.afterImg && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-500">Optimized (After)</p>
                      <img src={selectedKaizen.afterImg} alt="After optimization" className="w-full h-64 object-cover rounded-lg border border-slate-200" />
                    </div>
                  )}
                </div>
              )}

              {user.role === 'ADMIN' && selectedKaizen.status === KaizenStatus.PENDING ? (
                <div className="bg-slate-900 p-6 md:p-8 rounded-xl space-y-4 text-white">
                  <h4 className="text-sm font-bold">Executive Decision Portal</h4>
                  <textarea
                    value={feedbackDraft}
                    onChange={(e) => setFeedbackDraft(e.target.value)}
                    className="w-full p-4 border border-slate-700 bg-slate-800 text-white rounded-lg text-xs h-24 focus:border-blue-500 outline-none resize-none"
                    placeholder="Enter official feedback and remarks..."
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleReview(KaizenStatus.ACCEPTED)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold uppercase py-3.5 px-4 rounded-lg transition-colors"
                    >
                      Accept & Disburse ({selectedKaizen.type === KaizenType.IDEA ? '50' : '200'} PKR)
                    </button>
                    <button
                      onClick={() => handleReview(KaizenStatus.REJECTED)}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-xs font-bold uppercase py-3.5 px-4 rounded-lg transition-colors"
                    >
                      Reject Proposal
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`p-6 rounded-xl border ${
                  selectedKaizen.status === KaizenStatus.ACCEPTED
                    ? 'bg-emerald-50 border-emerald-200'
                    : selectedKaizen.status === KaizenStatus.REJECTED
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-bold text-slate-900">Official Decision Summary</h4>
                    <span className="text-sm font-extrabold text-slate-900">{selectedKaizen.status}</span>
                  </div>
                  <p className="text-xs text-slate-500">Assessed Cash Reward</p>
                  <p className="text-xl font-extrabold text-slate-900 tabular-nums mt-0.5">
                    {selectedKaizen.reward.toLocaleString()} PKR
                  </p>
                  {selectedKaizen.feedback && (
                    <div className="border-t border-slate-200/80 pt-4 mt-4">
                      <p className="text-xs font-bold text-slate-600 mb-1.5">Management Feedback</p>
                      <p className="bg-white p-3.5 rounded-lg border border-slate-200 text-slate-700 text-xs">
                        "{selectedKaizen.feedback}"
                      </p>
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

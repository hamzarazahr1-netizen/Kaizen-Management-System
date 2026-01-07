
import React, { useMemo, useState } from 'react';
import { Kaizen, KaizenStatus, KaizenType, DEPARTMENTS, MONTHS } from '../types';

interface AdminGlobalAnalyticsProps {
  kaizens: Kaizen[];
}

const AdminGlobalAnalytics: React.FC<AdminGlobalAnalyticsProps> = ({ kaizens }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('All');

  const getDeptMonthlyTarget = (deptName: string) => {
    if (deptName === 'Admin' || deptName === 'PPMC') return 2;
    return 4;
  };

  const analytics = useMemo(() => {
    return DEPARTMENTS.map(dept => {
      const deptKaizens = kaizens.filter(k => 
        (selectedMonth === 'All' || k.month === selectedMonth) && 
        k.department === dept
      );

      const systemMonths = Array.from(new Set(kaizens.map(k => k.month)));
      const monthsCount = selectedMonth === 'All' ? Math.max(1, systemMonths.length) : 1;
      const target = getDeptMonthlyTarget(dept) * monthsCount;

      const accIdeas = deptKaizens.filter(k => k.status === KaizenStatus.ACCEPTED && k.type === KaizenType.IDEA).length;
      const accImp = deptKaizens.filter(k => k.status === KaizenStatus.ACCEPTED && k.type === KaizenType.IMPLEMENTED).length;
      const rejIdeas = deptKaizens.filter(k => k.status === KaizenStatus.REJECTED && k.type === KaizenType.IDEA).length;
      const rejImp = deptKaizens.filter(k => k.status === KaizenStatus.REJECTED && k.type === KaizenType.IMPLEMENTED).length;
      const pending = deptKaizens.filter(k => k.status === KaizenStatus.PENDING).length;

      const participation = target > 0 ? (deptKaizens.length / target) * 100 : 0;
      const totalReward = (accIdeas * 50) + (accImp * 200);

      return {
        dept,
        total: deptKaizens.length,
        accIdeas,
        accImp,
        rejIdeas,
        rejImp,
        pending,
        participation,
        totalReward,
        target
      };
    }).sort((a, b) => b.participation - a.participation);
  }, [kaizens, selectedMonth]);

  const totals = useMemo(() => {
    const sumPart = analytics.reduce((acc, curr) => acc + curr.participation, 0);
    const avgPart = DEPARTMENTS.length > 0 ? sumPart / DEPARTMENTS.length : 0;

    const baseTotals = analytics.reduce((acc, curr) => ({
      total: acc.total + curr.total,
      accIdeas: acc.accIdeas + curr.accIdeas,
      accImp: acc.accImp + curr.accImp,
      rejIdeas: acc.rejIdeas + curr.rejIdeas,
      rejImp: acc.rejImp + curr.rejImp,
      reward: acc.reward + curr.totalReward
    }), { total: 0, accIdeas: 0, accImp: 0, rejIdeas: 0, rejImp: 0, reward: 0 });

    return { ...baseTotals, avgPart };
  }, [analytics]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-5 rounded border border-slate-200 shadow-sm gap-4">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight uppercase">Operational Business Unit Performance</h2>
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full md:w-auto px-4 py-2 border border-slate-200 rounded text-xs font-bold uppercase bg-slate-50 text-slate-900 outline-none"
        >
          <option value="All">Full Fiscal View</option>
          {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded shadow-lg text-white border-l-4 border-blue-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Company Avg Participation</p>
          <p className="text-4xl font-extrabold text-blue-400">{totals.avgPart.toFixed(1)}%</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Aggregated Across {DEPARTMENTS.length} Units</p>
        </div>
        <div className="bg-white p-6 rounded border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Submissions</p>
          <p className="text-4xl font-extrabold text-slate-900">{totals.total}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Ideas: {totals.accIdeas + totals.rejIdeas} | Impl: {totals.accImp + totals.rejImp}</p>
        </div>
        <div className="bg-blue-900 p-6 rounded shadow-lg text-white">
          <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-1">Total Reward Accrual</p>
          <p className="text-4xl font-extrabold">{totals.reward.toLocaleString()} <span className="text-sm">PKR</span></p>
          <p className="text-[10px] font-bold text-blue-400 uppercase mt-2">Finance Verified Requirement</p>
        </div>
      </div>

      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[9px] tracking-widest font-bold">
                <th className="px-4 py-5 border-r border-slate-800">Business Unit</th>
                <th className="px-4 py-5 border-r border-slate-800 text-center">Participation %</th>
                <th className="px-4 py-5 border-r border-slate-800 text-center">Total Unit Target</th>
                <th className="px-4 py-5 border-r border-slate-800 text-center text-emerald-400">Acc. Idea</th>
                <th className="px-4 py-5 border-r border-slate-800 text-center text-emerald-400">Acc. Imp.</th>
                <th className="px-4 py-5 border-r border-slate-800 text-center text-red-400">Rej. Idea</th>
                <th className="px-4 py-5 border-r border-slate-800 text-center text-red-400">Rej. Imp.</th>
                <th className="px-4 py-5 border-r border-slate-800 text-center text-amber-400">Review Required</th>
                <th className="px-4 py-5 text-right">Value Accrual (PKR)</th>
              </tr>
            </thead>
            <tbody className="text-[11px] divide-y divide-slate-100">
              {analytics.map(row => (
                <tr key={row.dept} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-5 border-r border-slate-100 font-extrabold text-slate-900">{row.dept}</td>
                  <td className="px-4 py-5 border-r border-slate-100">
                    <div className="flex items-center gap-3 justify-center">
                      <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full ${row.participation >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                          style={{ width: `${Math.min(100, row.participation)}%` }} 
                        />
                      </div>
                      <span className="font-black text-[10px] w-10">{row.participation.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-5 border-r border-slate-100 text-center font-bold text-slate-500">{row.total} / {row.target}</td>
                  <td className="px-4 py-5 border-r border-slate-100 text-center text-emerald-700 font-black">{row.accIdeas}</td>
                  <td className="px-4 py-5 border-r border-slate-100 text-center text-emerald-700 font-black">{row.accImp}</td>
                  <td className="px-4 py-5 border-r border-slate-100 text-center text-red-500 font-bold">{row.rejIdeas}</td>
                  <td className="px-4 py-5 border-r border-slate-100 text-center text-red-500 font-bold">{row.rejImp}</td>
                  <td className="px-4 py-5 border-r border-slate-100 text-center text-amber-600 font-black bg-amber-50/30">{row.pending}</td>
                  <td className="px-4 py-5 text-right font-black text-slate-900">{row.totalReward.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200 uppercase font-black text-[10px] tracking-widest">
              <tr className="text-slate-900">
                <td className="px-4 py-6 border-r border-slate-200">Consolidated Grand Totals</td>
                <td className="px-4 py-6 border-r border-slate-200"></td>
                <td className="px-4 py-6 border-r border-slate-200 text-center">{totals.total}</td>
                <td className="px-4 py-6 border-r border-slate-200 text-center">{totals.accIdeas}</td>
                <td className="px-4 py-6 border-r border-slate-200 text-center">{totals.accImp}</td>
                <td className="px-4 py-6 border-r border-slate-200 text-center">{totals.rejIdeas}</td>
                <td className="px-4 py-6 border-r border-slate-200 text-center">{totals.rejImp}</td>
                <td className="px-4 py-6 border-r border-slate-200 text-center"></td>
                <td className="px-4 py-6 text-right text-blue-800 text-lg">{totals.reward.toLocaleString()} PKR</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminGlobalAnalytics;

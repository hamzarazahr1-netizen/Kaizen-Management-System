
import React, { useMemo, useState } from 'react';
import { Kaizen, KaizenStatus, KaizenType, DEPARTMENTS, MONTHS } from '../types';

interface AdminGlobalAnalyticsProps {
  kaizens: Kaizen[];
}

const AdminGlobalAnalytics: React.FC<AdminGlobalAnalyticsProps> = ({ kaizens }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('All');

  const activeMonthsInSystem = useMemo(() => {
    const months = Array.from(new Set(kaizens.map(k => k.month)));
    return months.sort((a, b) => MONTHS.indexOf(a as string) - MONTHS.indexOf(b as string));
  }, [kaizens]);

  const analytics = useMemo(() => {
    const monthsCount = selectedMonth === 'All' ? Math.max(1, activeMonthsInSystem.length) : 1;
    
    return DEPARTMENTS.map(dept => {
      const deptKaizens = kaizens.filter(k => 
        (selectedMonth === 'All' || k.month === selectedMonth) && 
        k.department === dept
      );

      const target = 4 * monthsCount;
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
  }, [kaizens, selectedMonth, activeMonthsInSystem]);

  const totals = useMemo(() => {
    return analytics.reduce((acc, curr) => ({
      total: acc.total + curr.total,
      accIdeas: acc.accIdeas + curr.accIdeas,
      accImp: acc.accImp + curr.accImp,
      rejIdeas: acc.rejIdeas + curr.rejIdeas,
      rejImp: acc.rejImp + curr.rejImp,
      pending: acc.pending + curr.pending,
      reward: acc.reward + curr.totalReward
    }), { total: 0, accIdeas: 0, accImp: 0, rejIdeas: 0, rejImp: 0, pending: 0, reward: 0 });
  }, [analytics]);

  const exportToCSV = () => {
    if (kaizens.length === 0) return;
    
    // Define headers
    const headers = [
      'ID', 'Department', 'Initiator', 'Submission Date', 'Type', 'Status', 
      'Month', 'Problem', 'Solution', 'Challenges', 'Reward (PKR)', 'Feedback'
    ];
    
    // Create CSV rows
    const rows = kaizens.map(k => [
      k.id,
      k.department,
      k.initiator,
      k.submissionDate,
      k.type,
      k.status,
      k.month,
      `"${(k.problem || '').replace(/"/g, '""')}"`,
      `"${(k.solution || '').replace(/"/g, '""')}"`,
      `"${(k.challenges || '').replace(/"/g, '""')}"`,
      k.reward,
      `"${(k.feedback || '').replace(/"/g, '""')}"`
    ]);
    
    // Combine into final string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Master_Furnishings_Kaizen_Data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-5 rounded border border-slate-200 shadow-sm gap-4">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight uppercase">Strategic Performance Analytics</h2>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={exportToCSV}
            className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded transition-all shadow-sm active:scale-95 whitespace-nowrap"
          >
            Export CSV
          </button>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex-1 md:flex-none px-4 py-2 border border-slate-200 rounded text-xs font-bold uppercase bg-slate-50 text-slate-900 outline-none"
          >
            <option value="All">All Periods</option>
            {activeMonthsInSystem.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Admin Status Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded shadow text-white border-l-4 border-blue-500">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Company Participation</p>
          <p className="text-3xl font-black text-blue-400">
            {(analytics.reduce((s, c) => s + c.participation, 0) / DEPARTMENTS.length).toFixed(1)}%
          </p>
        </div>
        <div className="bg-amber-600 p-5 rounded shadow text-white">
          <p className="text-[9px] font-bold text-amber-100 uppercase tracking-widest mb-1">Pending Review</p>
          <p className="text-3xl font-black text-white">{totals.pending}</p>
        </div>
        <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ideas Reward Pool</p>
          <p className="text-2xl font-black text-slate-900">{(totals.accIdeas * 50).toLocaleString()} PKR</p>
        </div>
        <div className="bg-white p-5 rounded border border-slate-200 shadow-sm">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Implemented Reward Pool</p>
          <p className="text-2xl font-black text-emerald-600">{(totals.accImp * 200).toLocaleString()} PKR</p>
        </div>
      </div>

      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-900 text-white uppercase text-[8px] tracking-widest font-black">
                <th className="px-4 py-5 border-r border-slate-800">Business Unit</th>
                <th className="px-4 py-5 border-r border-slate-800 text-center">Participation %</th>
                <th className="px-4 py-5 border-r border-slate-800 text-center">Volume (S/T)</th>
                <th className="px-4 py-5 border-r border-slate-800 text-center text-emerald-400">Acc. Idea</th>
                <th className="px-4 py-5 border-r border-slate-800 text-center text-emerald-400">Acc. Imp.</th>
                <th className="px-4 py-5 border-r border-slate-800 text-center text-red-400">Rej. Idea</th>
                <th className="px-4 py-5 border-r border-slate-800 text-center text-red-400">Rej. Imp.</th>
                <th className="px-4 py-5 text-right">Total PKR</th>
              </tr>
            </thead>
            <tbody className="text-[10px] divide-y divide-slate-100">
              {analytics.map(row => (
                <tr key={row.dept} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 border-r border-slate-100 font-black text-slate-900">{row.dept}</td>
                  <td className="px-4 py-4 border-r border-slate-100">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 bg-slate-100 rounded-full h-1 overflow-hidden">
                        <div 
                          className={`h-full ${row.participation >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                          style={{ width: `${Math.min(100, row.participation)}%` }} 
                        />
                      </div>
                      <span className="font-black text-[9px] w-8">{row.participation.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 border-r border-slate-100 text-center font-bold text-slate-500">{row.total} / {row.target}</td>
                  <td className="px-4 py-4 border-r border-slate-100 text-center text-emerald-700 font-black">{row.accIdeas}</td>
                  <td className="px-4 py-4 border-r border-slate-100 text-center text-emerald-700 font-black">{row.accImp}</td>
                  <td className="px-4 py-4 border-r border-slate-100 text-center text-red-500">{row.rejIdeas}</td>
                  <td className="px-4 py-4 border-r border-slate-100 text-center text-red-500">{row.rejImp}</td>
                  <td className="px-4 py-4 text-right font-black text-slate-900">{row.totalReward.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-900 text-white uppercase font-black text-[9px] tracking-widest">
              <tr>
                <td className="px-4 py-6 border-r border-slate-800">Company Total</td>
                <td className="px-4 py-6 border-r border-slate-800 text-center">-</td>
                <td className="px-4 py-6 border-r border-slate-800 text-center">{totals.total} Kaizens</td>
                <td className="px-4 py-6 border-r border-slate-800 text-center text-emerald-400">{totals.accIdeas}</td>
                <td className="px-4 py-6 border-r border-slate-800 text-center text-emerald-400">{totals.accImp}</td>
                <td className="px-4 py-6 border-r border-slate-800 text-center">{totals.rejIdeas}</td>
                <td className="px-4 py-6 border-r border-slate-800 text-center">{totals.rejImp}</td>
                <td className="px-4 py-6 text-right text-blue-400 text-sm">{totals.reward.toLocaleString()} PKR</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded border border-blue-100 text-center">
         <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-1">Management Summary</p>
         <p className="text-sm font-medium text-blue-800 italic">Total Reward amount of <span className="font-black text-blue-900">{totals.reward.toLocaleString()} PKR</span> to be collected from Finance for the current period.</p>
      </div>
    </div>
  );
};

export default AdminGlobalAnalytics;


import React, { useMemo, useState } from 'react';
import { User, Kaizen, KaizenStatus, KaizenType, MONTHS, DEPARTMENTS } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  user: User;
  kaizens: Kaizen[];
}

const Dashboard: React.FC<DashboardProps> = ({ user, kaizens }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [selectedDept, setSelectedDept] = useState<string>(user.role === 'ADMIN' ? 'All' : user.department);

  const activeMonthsInSystem = useMemo(() => {
    const months = Array.from(new Set(kaizens.map(k => k.month)));
    return months.sort((a, b) => MONTHS.indexOf(a as string) - MONTHS.indexOf(b as string));
  }, [kaizens]);

  const stats = useMemo(() => {
    const filtered = kaizens.filter(k => {
      const monthMatch = selectedMonth === 'All' || k.month === selectedMonth;
      const deptMatch = selectedDept === 'All' || k.department === selectedDept;
      return monthMatch && deptMatch;
    });

    const total = filtered.length;
    const accIdeas = filtered.filter(k => k.status === KaizenStatus.ACCEPTED && k.type === KaizenType.IDEA).length;
    const accImp = filtered.filter(k => k.status === KaizenStatus.ACCEPTED && k.type === KaizenType.IMPLEMENTED).length;
    const rejIdeas = filtered.filter(k => k.status === KaizenStatus.REJECTED && k.type === KaizenType.IDEA).length;
    const rejImp = filtered.filter(k => k.status === KaizenStatus.REJECTED && k.type === KaizenType.IMPLEMENTED).length;
    const pending = filtered.filter(k => k.status === KaizenStatus.PENDING).length;
    
    const totalIdeasCount = filtered.filter(k => k.type === KaizenType.IDEA).length;
    const totalImpCount = filtered.filter(k => k.type === KaizenType.IMPLEMENTED).length;

    const reward = (accIdeas * 50) + (accImp * 200);

    // Goal Logic: 4 per month. If 'All' months selected, target = 4 * count of unique months in system
    const monthsCount = selectedMonth === 'All' ? Math.max(1, activeMonthsInSystem.length) : 1;
    const deptCount = selectedDept === 'All' ? DEPARTMENTS.length : 1;
    const target = 4 * monthsCount * deptCount;
    
    const participation = target > 0 ? (total / target) * 100 : 0;

    return { 
      total, accIdeas, accImp, rejIdeas, rejImp, pending, reward, participation, target,
      totalIdeasCount, totalImpCount
    };
  }, [kaizens, selectedMonth, selectedDept, activeMonthsInSystem]);

  // Data for "Department wise participation"
  const deptParticipationData = useMemo(() => {
    const monthsCount = selectedMonth === 'All' ? Math.max(1, activeMonthsInSystem.length) : 1;
    return DEPARTMENTS.map(dept => {
      const submissions = kaizens.filter(k => 
        k.department === dept && (selectedMonth === 'All' || k.month === selectedMonth)
      ).length;
      const target = 4 * monthsCount;
      return {
        name: dept,
        participation: Math.round(target > 0 ? (submissions / target) * 100 : 0)
      };
    }).sort((a, b) => b.participation - a.participation);
  }, [kaizens, selectedMonth, activeMonthsInSystem]);

  // Data for "Current vs Previous Month Comparison"
  const comparisonData = useMemo(() => {
    // We need at least 2 months to compare
    if (activeMonthsInSystem.length < 2) return [];

    let currentM = selectedMonth === 'All' ? activeMonthsInSystem[activeMonthsInSystem.length - 1] : selectedMonth;
    const idx = MONTHS.indexOf(currentM);
    if (idx <= 0) return [];
    
    let previousM = MONTHS[idx - 1];

    const currentStats = kaizens.filter(k => k.month === currentM && (selectedDept === 'All' || k.department === selectedDept)).length;
    const prevStats = kaizens.filter(k => k.month === previousM && (selectedDept === 'All' || k.department === selectedDept)).length;

    return [
      { name: previousM, count: prevStats, label: 'Previous Month' },
      { name: currentM, count: currentStats, label: 'Current Month' }
    ];
  }, [kaizens, selectedMonth, selectedDept, activeMonthsInSystem]);

  return (
    <div className="space-y-6">
      {/* Header Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            {user.role === 'ADMIN' ? 'Lean Management Analytics' : `${user.department} Unit Portal`}
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Master Furnishings Pvt. Ltd.</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded text-[10px] font-black uppercase bg-slate-50 text-slate-900 outline-none hover:border-blue-500 transition-all shadow-sm"
          >
            <option value="All">All Active Months</option>
            {activeMonthsInSystem.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {user.role === 'ADMIN' && (
            <select 
              value={selectedDept} 
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded text-[10px] font-black uppercase bg-slate-50 text-slate-900 outline-none hover:border-blue-500 transition-all shadow-sm"
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 border border-slate-200 shadow-sm rounded-lg relative overflow-hidden">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Received</p>
          <p className="text-4xl font-black text-slate-900">{stats.total}</p>
          <div className="mt-2 text-[10px] text-slate-500 font-bold uppercase flex gap-4">
             <span>Ideas: {stats.totalIdeasCount}</span>
             <span>Impl: {stats.totalImpCount}</span>
          </div>
        </div>
        
        <div className="bg-white p-6 border border-slate-200 shadow-sm rounded-lg">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Participation %</p>
          <p className="text-4xl font-black text-blue-600">{stats.participation.toFixed(1)}%</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Target: {stats.target} Kaizens</p>
        </div>

        <div className="bg-white p-6 border border-slate-200 shadow-sm rounded-lg">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Accrued Rewards</p>
          <p className="text-4xl font-black text-emerald-600">{stats.reward.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Currency: PKR</p>
        </div>
        
        <div className="bg-white p-6 border-l-4 border-l-amber-500 shadow-sm rounded-lg">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Review</p>
          <p className="text-4xl font-black text-amber-500">{stats.pending}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Decisions Awaited</p>
        </div>
      </div>

      {/* Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Participation Chart */}
        <div className="bg-white p-6 border border-slate-200 shadow-sm rounded-lg">
          <h3 className="text-[11px] font-black text-slate-900 uppercase mb-6 tracking-widest border-b pb-2 flex justify-between">
            {selectedDept === 'All' ? 'Department Wise Participation' : 'Unit Participation Goal'}
            <span className="text-[9px] text-slate-400 font-bold">Performance Matrix</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptParticipationData.filter(d => selectedDept === 'All' || d.name === selectedDept)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={9} fontWeight="bold" />
                <YAxis fontSize={9} unit="%" />
                <Tooltip />
                <Bar dataKey="participation" name="Participation %" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {deptParticipationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.participation >= 100 ? '#10b981' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comparison Chart */}
        <div className="bg-white p-6 border border-slate-200 shadow-sm rounded-lg">
          <h3 className="text-[11px] font-black text-slate-900 uppercase mb-6 tracking-widest border-b pb-2 flex justify-between">
            Month Comparison
            <span className="text-[9px] text-slate-400 font-bold">Trend Analysis</span>
          </h3>
          <div className="h-64">
            {comparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={10} fontWeight="bold" />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                  <Bar dataKey="count" name="Kaizen Volume" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-[10px] font-bold uppercase">
                Add data for at least 2 months to see comparison
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Decision Summary Breakup */}
      <div className="bg-white p-6 border border-slate-200 shadow-sm rounded-lg">
        <h3 className="text-[11px] font-black text-slate-900 uppercase mb-6 tracking-widest border-b pb-2">Outcome Breakup</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-emerald-50 rounded border border-emerald-100">
            <span className="block text-[8px] font-black text-emerald-800 uppercase mb-1">Acc. Idea</span>
            <span className="text-2xl font-black text-emerald-700">{stats.accIdeas}</span>
          </div>
          <div className="p-4 bg-emerald-100 rounded border border-emerald-200">
            <span className="block text-[8px] font-black text-emerald-900 uppercase mb-1">Acc. Imp.</span>
            <span className="text-2xl font-black text-emerald-800">{stats.accImp}</span>
          </div>
          <div className="p-4 bg-red-50 rounded border border-red-100">
            <span className="block text-[8px] font-black text-red-800 uppercase mb-1">Rej. Idea</span>
            <span className="text-2xl font-black text-red-700">{stats.rejIdeas}</span>
          </div>
          <div className="p-4 bg-red-100 rounded border border-red-200">
            <span className="block text-[8px] font-black text-red-900 uppercase mb-1">Rej. Imp.</span>
            <span className="text-2xl font-black text-red-800">{stats.rejImp}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

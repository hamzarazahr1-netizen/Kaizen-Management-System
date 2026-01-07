
import React, { useMemo, useState } from 'react';
import { User, Kaizen, KaizenStatus, KaizenType, MONTHS, DEPARTMENTS } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, LabelList } from 'recharts';

interface DashboardProps {
  user: User;
  kaizens: Kaizen[];
}

const Dashboard: React.FC<DashboardProps> = ({ user, kaizens }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [selectedDept, setSelectedDept] = useState<string>(user.role === 'ADMIN' ? 'All' : user.department);

  const getDeptMonthlyTarget = (deptName: string) => {
    // Admin and PPMC have target of 2, others have 4.
    if (deptName === 'Admin' || deptName === 'PPMC') return 2;
    return 4;
  };

  const filteredKaizens = useMemo(() => {
    return kaizens.filter(k => {
      const monthMatch = selectedMonth === 'All' || k.month === selectedMonth;
      const deptMatch = selectedDept === 'All' || k.department === selectedDept;
      return monthMatch && deptMatch;
    });
  }, [kaizens, selectedMonth, selectedDept]);

  const stats = useMemo(() => {
    const total = filteredKaizens.length;
    const acceptedIdeas = filteredKaizens.filter(k => k.status === KaizenStatus.ACCEPTED && k.type === KaizenType.IDEA).length;
    const acceptedImp = filteredKaizens.filter(k => k.status === KaizenStatus.ACCEPTED && k.type === KaizenType.IMPLEMENTED).length;
    const rejectedIdeas = filteredKaizens.filter(k => k.status === KaizenStatus.REJECTED && k.type === KaizenType.IDEA).length;
    const rejectedImp = filteredKaizens.filter(k => k.status === KaizenStatus.REJECTED && k.type === KaizenType.IMPLEMENTED).length;
    const pending = filteredKaizens.filter(k => k.status === KaizenStatus.PENDING).length;
    
    const ideaCount = filteredKaizens.filter(k => k.type === KaizenType.IDEA).length;
    const impCount = filteredKaizens.filter(k => k.type === KaizenType.IMPLEMENTED).length;
    
    const reward = (acceptedIdeas * 50) + (acceptedImp * 200);

    const systemMonths = Array.from(new Set(kaizens.map(k => k.month)));
    const monthsCount = selectedMonth === 'All' ? Math.max(1, systemMonths.length) : 1;
    
    let totalTarget = 0;
    if (selectedDept === 'All') {
      DEPARTMENTS.forEach(d => {
        totalTarget += getDeptMonthlyTarget(d) * monthsCount;
      });
    } else {
      totalTarget = getDeptMonthlyTarget(selectedDept) * monthsCount;
    }
    
    // Participation % allows for values > 100%
    const participation = totalTarget > 0 ? (total / totalTarget) * 100 : 0;

    return { 
      total, ideaCount, impCount, acceptedIdeas, acceptedImp, 
      rejectedIdeas, rejectedImp, pending, reward, participation, target: totalTarget 
    };
  }, [filteredKaizens, kaizens, selectedMonth, selectedDept]);

  const chartData = useMemo(() => {
    return DEPARTMENTS.map(dept => {
      const deptKaizens = filteredKaizens.filter(k => k.department === dept);
      const systemMonths = Array.from(new Set(kaizens.map(k => k.month)));
      const monthsCount = selectedMonth === 'All' ? Math.max(1, systemMonths.length) : 1;
      const deptTarget = getDeptMonthlyTarget(dept) * monthsCount;

      return {
        name: dept,
        submissions: deptKaizens.length,
        target: deptTarget,
      };
    }).filter(d => selectedDept === 'All' ? true : d.name === selectedDept);
  }, [filteredKaizens, kaizens, selectedMonth, selectedDept]);

  const comparisonData = useMemo(() => {
    const systemMonths = Array.from(new Set(kaizens.map(k => k.month)))
      .sort((a: any, b: any) => MONTHS.indexOf(a) - MONTHS.indexOf(b));

    let monthsToGraph = systemMonths;
    if (selectedMonth !== 'All') {
      const idx = systemMonths.indexOf(selectedMonth);
      if (idx !== -1) {
        monthsToGraph = systemMonths.slice(Math.max(0, idx - 3), idx + 1);
      }
    }

    return monthsToGraph.map(m => {
      const count = kaizens.filter(k => k.month === m && (selectedDept === 'All' || k.department === selectedDept)).length;
      return { month: m, submissions: count };
    });
  }, [kaizens, selectedMonth, selectedDept]);

  return (
    <div className="space-y-6 text-slate-900 animate-in fade-in duration-500">
      <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-5 rounded border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
          {user.role === 'ADMIN' ? 'Strategic Global Dashboard' : `Performance Dashboard: ${user.department}`}
        </h2>
        <div className="flex gap-2">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded text-xs font-bold uppercase bg-slate-50 text-slate-900 outline-none"
          >
            <option value="All">Cumulative View</option>
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {user.role === 'ADMIN' && (
            <select 
              value={selectedDept} 
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded text-xs font-bold uppercase bg-slate-50 text-slate-900 outline-none"
            >
              <option value="All">All Business Units</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 border border-slate-200 shadow-sm rounded flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Kaizen Received</p>
            <p className="text-4xl font-extrabold text-slate-900">{stats.total}</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
              <span>Ideas:</span>
              <span className="text-blue-600 font-black">{stats.ideaCount}</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
              <span>Implemented:</span>
              <span className="text-emerald-600 font-black">{stats.impCount}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 border border-slate-200 shadow-sm rounded">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Participation Rate</p>
          <p className="text-4xl font-extrabold text-blue-600">{stats.participation.toFixed(1)}%</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Target: {stats.target} Units</p>
        </div>

        <div className="bg-white p-6 border border-slate-200 shadow-sm rounded">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Accrued Rewards</p>
          <p className="text-4xl font-extrabold text-emerald-600">{stats.reward.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Unit: PKR</p>
        </div>
        
        <div className="bg-white p-6 border-l-4 border-l-amber-500 shadow-sm rounded">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Review Queue</p>
          <p className="text-4xl font-extrabold text-amber-500">{stats.pending}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Awaiting Approval</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 border border-slate-200 shadow-sm rounded">
          <h3 className="text-xs font-bold text-slate-900 uppercase mb-6 tracking-widest border-b pb-2">Business Unit Status Breakdown</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded text-center">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">Accepted Idea</span>
              <span className="text-xl font-black text-emerald-700">{stats.acceptedIdeas}</span>
            </div>
            <div className="p-3 bg-emerald-100 border border-emerald-200 rounded text-center">
              <span className="text-[10px] font-bold text-emerald-900 uppercase block mb-1">Accepted Imp.</span>
              <span className="text-xl font-black text-emerald-800">{stats.acceptedImp}</span>
            </div>
            <div className="p-3 bg-red-50 border border-red-100 rounded text-center">
              <span className="text-[10px] font-bold text-red-800 uppercase block mb-1">Rejected Idea</span>
              <span className="text-xl font-black text-red-700">{stats.rejectedIdeas}</span>
            </div>
            <div className="p-3 bg-red-100 border border-red-200 rounded text-center">
              <span className="text-[10px] font-bold text-red-900 uppercase block mb-1">Rejected Imp.</span>
              <span className="text-xl font-black text-red-800">{stats.rejectedImp}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 border border-slate-200 shadow-sm rounded">
          <h3 className="text-xs font-bold text-slate-900 uppercase mb-6 tracking-widest border-b pb-2">Department Participation Detail</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  fontSize={8} 
                  fontWeight="bold" 
                  angle={-45} 
                  textAnchor="end" 
                  interval={0}
                  height={60}
                />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="submissions" name="Submissions" fill="#1e293b" radius={[2, 2, 0, 0]}>
                  <LabelList dataKey="submissions" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#1e293b' }} />
                </Bar>
                <Bar dataKey="target" name="Goal" fill="#cbd5e1" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 border border-slate-200 shadow-sm rounded">
        <h3 className="text-xs font-bold text-slate-900 uppercase mb-6 tracking-widest border-b pb-2">Monthly Performance Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" fontSize={10} fontWeight="bold" />
              <YAxis fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="submissions" 
                name="Monthly Submissions" 
                stroke="#2563eb" 
                strokeWidth={3} 
                dot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} 
              >
                <LabelList dataKey="submissions" position="top" offset={10} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#2563eb' }} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

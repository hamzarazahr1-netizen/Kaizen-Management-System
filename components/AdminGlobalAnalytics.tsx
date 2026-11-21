import React, { useMemo, useState } from 'react';
import {
  Kaizen,
  KaizenStatus,
  KaizenType,
  MONTHS,
  Factory,
  FACTORIES,
  getDepartmentsForFactory,
  getShortFactoryName
} from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Download } from 'lucide-react';

interface AdminGlobalAnalyticsProps {
  kaizens: Kaizen[];
}

interface AnalyticsRow {
  factory: Factory;
  shortFactory: string;
  dept: string;
  total: number;
  accIdeas: number;
  accImp: number;
  rejIdeas: number;
  rejImp: number;
  pending: number;
  participation: number;
  totalReward: number;
  target: number;
}

const OUTCOME_COLORS = ['#059669', '#2563eb', '#d97706', '#dc2626'];

const AdminGlobalAnalytics: React.FC<AdminGlobalAnalyticsProps> = ({ kaizens }) => {
  const [selectedFactory, setSelectedFactory] = useState<'All' | Factory>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>('All');

  const activeMonthsInSystem = useMemo(() => {
    const months = Array.from(new Set(kaizens.map(k => k.month)));
    return months.sort((a, b) => MONTHS.indexOf(a as string) - MONTHS.indexOf(b as string));
  }, [kaizens]);

  const activeFactories = useMemo(() => {
    return selectedFactory === 'All' ? FACTORIES : [selectedFactory];
  }, [selectedFactory]);

  const analytics = useMemo<AnalyticsRow[]>(() => {
    const monthsCount = selectedMonth === 'All' ? Math.max(1, activeMonthsInSystem.length) : 1;
    const rows: AnalyticsRow[] = [];

    activeFactories.forEach(factory => {
      const units = getDepartmentsForFactory(factory);
      units.forEach(dept => {
        const deptKaizens = kaizens.filter(k =>
          (selectedMonth === 'All' || k.month === selectedMonth) &&
          k.factory === factory &&
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

        rows.push({
          factory,
          shortFactory: getShortFactoryName(factory),
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
        });
      });
    });

    return rows.sort((a, b) => b.participation - a.participation);
  }, [kaizens, selectedMonth, activeMonthsInSystem, activeFactories]);

  const totals = useMemo(() => {
    return analytics.reduce(
      (acc, curr) => ({
        total: acc.total + curr.total,
        target: acc.target + curr.target,
        accIdeas: acc.accIdeas + curr.accIdeas,
        accImp: acc.accImp + curr.accImp,
        rejIdeas: acc.rejIdeas + curr.rejIdeas,
        rejImp: acc.rejImp + curr.rejImp,
        pending: acc.pending + curr.pending,
        reward: acc.reward + curr.totalReward
      }),
      { total: 0, target: 0, accIdeas: 0, accImp: 0, rejIdeas: 0, rejImp: 0, pending: 0, reward: 0 }
    );
  }, [analytics]);

  const factoryComparisonChartData = useMemo(() => {
    const monthsCount = selectedMonth === 'All' ? Math.max(1, activeMonthsInSystem.length) : 1;
    return FACTORIES.map(factory => {
      const units = getDepartmentsForFactory(factory);
      const list = kaizens.filter(k =>
        k.factory === factory && (selectedMonth === 'All' || k.month === selectedMonth)
      );
      const accIdeas = list.filter(k => k.status === KaizenStatus.ACCEPTED && k.type === KaizenType.IDEA).length;
      const accImp = list.filter(k => k.status === KaizenStatus.ACCEPTED && k.type === KaizenType.IMPLEMENTED).length;
      const pending = list.filter(k => k.status === KaizenStatus.PENDING).length;
      const reward = (accIdeas * 50) + (accImp * 200);
      const target = 4 * monthsCount * units.length;
      const participation = target > 0 ? Math.round((list.length / target) * 100) : 0;

      return {
        factory,
        name: getShortFactoryName(factory),
        Total: list.length,
        'Acc. Ideas': accIdeas,
        'Acc. Impl': accImp,
        Pending: pending,
        participation,
        reward,
        target
      };
    });
  }, [kaizens, selectedMonth, activeMonthsInSystem]);

  // Section-wise Cash Reward Bar Data (top active or all filtered)
  const rewardChartData = useMemo(() => {
    return [...analytics]
      .sort((a, b) => b.totalReward - a.totalReward || b.total - a.total)
      .slice(0, 12)
      .map(r => ({
        label: selectedFactory === 'All' ? `${r.dept} (${r.shortFactory === 'Molty Foam PQ' ? 'MF' : 'FF'})` : r.dept,
        reward: r.totalReward,
        total: r.total
      }));
  }, [analytics, selectedFactory]);

  // Status Outcome Donut Data
  const outcomePieData = useMemo(() => {
    return [
      { name: 'Acc. Implemented', value: totals.accImp },
      { name: 'Acc. Ideas', value: totals.accIdeas },
      { name: 'Pending', value: totals.pending },
      { name: 'Rejected', value: totals.rejIdeas + totals.rejImp }
    ].filter(d => d.value > 0);
  }, [totals]);

  // Impact Breakdown Data (filtered by Factory & Month)
  const impactBreakdownData = useMemo(() => {
    const filteredList = kaizens.filter(k =>
      (selectedFactory === 'All' || k.factory === selectedFactory) &&
      (selectedMonth === 'All' || k.month === selectedMonth)
    );
    const items: Array<{ key: keyof Kaizen['impact']; name: string }> = [
      { key: 'costSaving', name: 'Cost Saving' },
      { key: 'productivity', name: 'Productivity' },
      { key: 'quality', name: 'Quality' },
      { key: 'safety', name: 'Safety' },
      { key: 'delivery', name: 'Delivery' }
    ];
    return items.map(i => ({
      name: i.name,
      count: filteredList.filter(k => k.impact && k.impact[i.key]).length
    }));
  }, [kaizens, selectedFactory, selectedMonth]);

  const exportToCSV = () => {
    const rowsToExport = kaizens.filter(k =>
      (selectedFactory === 'All' || k.factory === selectedFactory) &&
      (selectedMonth === 'All' || k.month === selectedMonth)
    );
    if (rowsToExport.length === 0) return;

    const headers = [
      'ID', 'Factory', 'Department/Section', 'Initiator', 'Submission Date', 'Type', 'Status',
      'Month', 'Problem', 'Solution', 'Challenges', 'Reward (PKR)', 'Feedback'
    ];

    const rows = rowsToExport.map(k => [
      k.id,
      `"${k.factory}"`,
      `"${k.department}"`,
      `"${(k.initiator || '').replace(/"/g, '""')}"`,
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

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
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

  const avgParticipation = analytics.length > 0
    ? analytics.reduce((s, c) => s + c.participation, 0) / analytics.length
    : 0;

  return (
    <div className="space-y-6 pb-16">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center bg-white p-5 rounded-xl border border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Lean & Transformation Portal · Global Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedFactory === 'All' ? 'Combined Management View (Both Factories)' : selectedFactory}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedFactory}
            onChange={(e) => setSelectedFactory(e.target.value as 'All' | Factory)}
            className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
          >
            <option value="All">All Factories</option>
            {FACTORIES.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
          >
            <option value="All">All Periods</option>
            {activeMonthsInSystem.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-xl text-white border border-slate-800">
          <p className="text-xs font-semibold text-slate-400 mb-1">Average Unit Participation</p>
          <p className="text-3xl font-extrabold text-blue-400 tabular-nums">{avgParticipation.toFixed(1)}%</p>
          <p className="text-xs text-slate-400 mt-2 tabular-nums">
            {totals.total} / {totals.target} Total Kaizens
          </p>
        </div>

        <div className="bg-amber-600 p-5 rounded-xl text-white">
          <p className="text-xs font-semibold text-amber-100 mb-1">Pending Review</p>
          <p className="text-3xl font-extrabold text-white tabular-nums">{totals.pending}</p>
          <p className="text-xs text-amber-100 mt-2">Awaiting Lean Approval</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 mb-1">Ideas Reward Pool (50 PKR)</p>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {(totals.accIdeas * 50).toLocaleString()} PKR
          </p>
          <p className="text-xs text-slate-500 mt-2 tabular-nums">{totals.accIdeas} Accepted Ideas</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 mb-1">Implemented Pool (200 PKR)</p>
          <p className="text-2xl font-extrabold text-emerald-700 tabular-nums">
            {(totals.accImp * 200).toLocaleString()} PKR
          </p>
          <p className="text-xs text-slate-500 mt-2 tabular-nums">{totals.accImp} Implemented Kaizens</p>
        </div>
      </div>

      {/* Head-to-Head Factory Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {factoryComparisonChartData.map(fc => (
          <div key={fc.factory} className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">{fc.factory}</h3>
                <p className="text-xs text-slate-500 tabular-nums">Target: {fc.target} Kaizens</p>
              </div>
              <span className="text-lg font-extrabold text-blue-700 tabular-nums">{fc.participation}%</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs tabular-nums">
              <div>
                <span className="block text-[11px] text-slate-400">Submitted</span>
                <span className="font-bold text-slate-900">{fc.Total}</span>
              </div>
              <div>
                <span className="block text-[11px] text-slate-400">Acc. Idea</span>
                <span className="font-bold text-emerald-700">{fc['Acc. Ideas']}</span>
              </div>
              <div>
                <span className="block text-[11px] text-slate-400">Acc. Impl</span>
                <span className="font-bold text-blue-700">{fc['Acc. Impl']}</span>
              </div>
              <div className="text-right">
                <span className="block text-[11px] text-slate-400">Cash Prize</span>
                <span className="font-bold text-slate-900">{fc.reward.toLocaleString()} PKR</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Management Visual Analytics Suite (All Data Labels ON) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Factory Performance Comparison */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-extrabold text-slate-900">Factory Performance Head-to-Head</h3>
            <span className="text-xs text-slate-500">All Metrics</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={factoryComparisonChartData} margin={{ top: 24, right: 16, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={11} fontWeight={700} />
                <YAxis fontSize={10} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                <Bar dataKey="Total" fill="#0f172a" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Total" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#0f172a' }} />
                </Bar>
                <Bar dataKey="Acc. Ideas" fill="#2563eb" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Acc. Ideas" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#1d4ed8' }} />
                </Bar>
                <Bar dataKey="Acc. Impl" fill="#059669" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Acc. Impl" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#047857' }} />
                </Bar>
                <Bar dataKey="Pending" fill="#d97706" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Pending" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#b45309' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Section-Wise Cash Prize Distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-extrabold text-slate-900">Top Sections by Cash Rewards (PKR)</h3>
            <span className="text-xs text-slate-500">Incentive Leaderboard</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rewardChartData} layout="vertical" margin={{ top: 8, right: 48, left: 10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" fontSize={10} />
                <YAxis type="category" dataKey="label" fontSize={10} fontWeight={600} width={130} />
                <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} PKR`, 'Cash Prize']} />
                <Bar dataKey="reward" name="Reward (PKR)" fill="#059669" radius={[0, 4, 4, 0]} barSize={16}>
                  <LabelList
                    dataKey="reward"
                    position="right"
                    formatter={(v: any) => `${Number(v).toLocaleString()}`}
                    style={{ fontSize: 10, fontWeight: 700, fill: '#065f46' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Outcome Status Mix (Donut with Labels) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-extrabold text-slate-900">Kaizen Approval & Status Mix</h3>
            <span className="text-xs text-slate-500">Decision Distribution</span>
          </div>
          <div className="h-64">
            {outcomePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={outcomePieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={76}
                    paddingAngle={2}
                    label={({ name, value, percent }: any) => `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={true}
                  >
                    {outcomePieData.map((_, idx) => (
                      <Cell key={`pie-${idx}`} fill={OUTCOME_COLORS[idx % OUTCOME_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                No Kaizen records available for the selected filters
              </div>
            )}
          </div>
        </div>

        {/* 4. Strategic Impact Categories */}
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-extrabold text-slate-900">Strategic Impact Categories</h3>
            <span className="text-xs text-slate-500">Operational Value Areas</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={impactBreakdownData} margin={{ top: 24, right: 16, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={11} fontWeight={600} />
                <YAxis fontSize={10} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Kaizen Count" fill="#1d4ed8" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#1e3a8a' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Full Section-Wise Performance & Cash Prize Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1040px]">
            <thead>
              <tr className="bg-slate-900 text-white text-xs font-bold">
                <th className="px-4 py-4 border-r border-slate-800">Factory</th>
                <th className="px-4 py-4 border-r border-slate-800">Department / Section</th>
                <th className="px-4 py-4 border-r border-slate-800 text-center">Participation %</th>
                <th className="px-4 py-4 border-r border-slate-800 text-center">Volume (S/T)</th>
                <th className="px-4 py-4 border-r border-slate-800 text-center text-emerald-400">Acc. Idea</th>
                <th className="px-4 py-4 border-r border-slate-800 text-center text-emerald-400">Acc. Imp.</th>
                <th className="px-4 py-4 border-r border-slate-800 text-center text-amber-300">Pending</th>
                <th className="px-4 py-4 border-r border-slate-800 text-center text-red-400">Rej. Idea</th>
                <th className="px-4 py-4 border-r border-slate-800 text-center text-red-400">Rej. Imp.</th>
                <th className="px-4 py-4 text-right">Cash Prize (PKR)</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100">
              {analytics.map(row => (
                <tr key={`${row.factory}-${row.dept}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5 border-r border-slate-100 text-slate-600 font-semibold whitespace-nowrap">
                    {row.shortFactory}
                  </td>
                  <td className="px-4 py-3.5 border-r border-slate-100 font-bold text-slate-900">{row.dept}</td>
                  <td className="px-4 py-3.5 border-r border-slate-100">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${row.participation >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                          style={{ width: `${Math.min(100, row.participation)}%` }}
                        />
                      </div>
                      <span className="font-bold tabular-nums w-9 text-right">{row.participation.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 border-r border-slate-100 text-center font-semibold text-slate-600 tabular-nums">
                    {row.total} / {row.target}
                  </td>
                  <td className="px-4 py-3.5 border-r border-slate-100 text-center text-emerald-700 font-bold tabular-nums">{row.accIdeas}</td>
                  <td className="px-4 py-3.5 border-r border-slate-100 text-center text-emerald-700 font-bold tabular-nums">{row.accImp}</td>
                  <td className="px-4 py-3.5 border-r border-slate-100 text-center text-amber-600 font-bold tabular-nums">{row.pending}</td>
                  <td className="px-4 py-3.5 border-r border-slate-100 text-center text-red-600 tabular-nums">{row.rejIdeas}</td>
                  <td className="px-4 py-3.5 border-r border-slate-100 text-center text-red-600 tabular-nums">{row.rejImp}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-900 tabular-nums">
                    {row.totalReward.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-bold text-xs">
              <tr>
                <td colSpan={2} className="px-4 py-4 border-r border-slate-800">
                  {selectedFactory === 'All' ? 'Company Grand Total (Both Factories)' : `${selectedFactory} Total`}
                </td>
                <td className="px-4 py-4 border-r border-slate-800 text-center tabular-nums">
                  {avgParticipation.toFixed(1)}%
                </td>
                <td className="px-4 py-4 border-r border-slate-800 text-center tabular-nums">
                  {totals.total} / {totals.target}
                </td>
                <td className="px-4 py-4 border-r border-slate-800 text-center text-emerald-400 tabular-nums">{totals.accIdeas}</td>
                <td className="px-4 py-4 border-r border-slate-800 text-center text-emerald-400 tabular-nums">{totals.accImp}</td>
                <td className="px-4 py-4 border-r border-slate-800 text-center text-amber-300 tabular-nums">{totals.pending}</td>
                <td className="px-4 py-4 border-r border-slate-800 text-center tabular-nums">{totals.rejIdeas}</td>
                <td className="px-4 py-4 border-r border-slate-800 text-center tabular-nums">{totals.rejImp}</td>
                <td className="px-4 py-4 text-right text-blue-300 text-sm tabular-nums">
                  {totals.reward.toLocaleString()} PKR
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Finance Cash Prize Summary */}
      <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 text-center">
        <p className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">Management & Finance Summary</p>
        <p className="text-sm font-medium text-blue-900">
          Total Cash Prize amount of <span className="font-extrabold tabular-nums">{totals.reward.toLocaleString()} PKR</span> to be disbursed from Finance for the selected scope.
        </p>
      </div>
    </div>
  );
};

export default AdminGlobalAnalytics;

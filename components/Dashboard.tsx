import React, { useMemo, useState } from 'react';
import {
  User,
  Kaizen,
  KaizenStatus,
  KaizenType,
  MONTHS,
  Factory,
  FACTORIES,
  FURNITURE_DEPARTMENTS,
  MOLTY_FOAM_DEPARTMENTS,
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
  Cell,
  LabelList,
  ReferenceLine
} from 'recharts';
import { QrCode } from 'lucide-react';
import DepartmentQrCard from './DepartmentQrCard';
import QrPosterModal from './QrPosterModal';

interface DashboardProps {
  user: User;
  kaizens: Kaizen[];
}

const Dashboard: React.FC<DashboardProps> = ({ user, kaizens }) => {
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState<'All' | Factory>(
    user.role === 'ADMIN' ? 'All' : (user.factory as Factory)
  );
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [selectedDept, setSelectedDept] = useState<string>(
    user.role === 'ADMIN' ? 'All' : user.department
  );

  const availableDepts = useMemo(() => {
    return getDepartmentsForFactory(selectedFactory);
  }, [selectedFactory]);

  const handleFactoryChange = (val: 'All' | Factory) => {
    setSelectedFactory(val);
    if (val !== 'All') {
      const units = getDepartmentsForFactory(val);
      if (selectedDept !== 'All' && !units.includes(selectedDept)) {
        setSelectedDept('All');
      }
    }
  };

  const activeMonthsInSystem = useMemo(() => {
    const months = Array.from(new Set(kaizens.map(k => k.month)));
    return months.sort((a, b) => MONTHS.indexOf(a as string) - MONTHS.indexOf(b as string));
  }, [kaizens]);

  const filteredKaizens = useMemo(() => {
    return kaizens.filter(k => {
      const factoryMatch = user.role === 'ADMIN'
        ? (selectedFactory === 'All' || k.factory === selectedFactory)
        : k.factory === user.factory;
      const monthMatch = selectedMonth === 'All' || k.month === selectedMonth;
      const deptMatch = user.role === 'ADMIN'
        ? (selectedDept === 'All' || k.department === selectedDept)
        : k.department === user.department;
      return factoryMatch && monthMatch && deptMatch;
    });
  }, [kaizens, selectedFactory, selectedMonth, selectedDept, user]);

  const stats = useMemo(() => {
    const total = filteredKaizens.length;
    const accIdeas = filteredKaizens.filter(k => k.status === KaizenStatus.ACCEPTED && k.type === KaizenType.IDEA).length;
    const accImp = filteredKaizens.filter(k => k.status === KaizenStatus.ACCEPTED && k.type === KaizenType.IMPLEMENTED).length;
    const rejIdeas = filteredKaizens.filter(k => k.status === KaizenStatus.REJECTED && k.type === KaizenType.IDEA).length;
    const rejImp = filteredKaizens.filter(k => k.status === KaizenStatus.REJECTED && k.type === KaizenType.IMPLEMENTED).length;
    const pending = filteredKaizens.filter(k => k.status === KaizenStatus.PENDING).length;

    const totalIdeasCount = filteredKaizens.filter(k => k.type === KaizenType.IDEA).length;
    const totalImpCount = filteredKaizens.filter(k => k.type === KaizenType.IMPLEMENTED).length;
    const reward = (accIdeas * 50) + (accImp * 200);

    const monthsCount = selectedMonth === 'All' ? Math.max(1, activeMonthsInSystem.length) : 1;
    const deptCount = selectedDept === 'All' ? availableDepts.length : 1;
    const target = 4 * monthsCount * deptCount;
    const participation = target > 0 ? (total / target) * 100 : 0;

    return {
      total,
      accIdeas,
      accImp,
      rejIdeas,
      rejImp,
      pending,
      reward,
      participation,
      target,
      totalIdeasCount,
      totalImpCount
    };
  }, [filteredKaizens, selectedMonth, selectedDept, activeMonthsInSystem, availableDepts]);

  // Factory summaries for Admin view
  const factoryCards = useMemo(() => {
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
      const participation = target > 0 ? (list.length / target) * 100 : 0;

      return {
        factory,
        shortName: getShortFactoryName(factory),
        unitsCount: units.length,
        total: list.length,
        target,
        participation,
        accIdeas,
        accImp,
        pending,
        reward
      };
    });
  }, [kaizens, selectedMonth, activeMonthsInSystem]);

  // Helper to build section participation data for a specific factory
  const buildParticipationData = (factory: Factory, units: string[]) => {
    const monthsCount = selectedMonth === 'All' ? Math.max(1, activeMonthsInSystem.length) : 1;
    return units
      .filter(u => selectedDept === 'All' || u === selectedDept)
      .map(dept => {
        const submissions = kaizens.filter(k =>
          k.factory === factory &&
          k.department === dept &&
          (selectedMonth === 'All' || k.month === selectedMonth)
        ).length;
        const target = 4 * monthsCount;
        return {
          name: dept,
          submissions,
          participation: Math.round(target > 0 ? (submissions / target) * 100 : 0)
        };
      })
      .sort((a, b) => b.participation - a.participation);
  };

  const furnitureParticipationData = useMemo(
    () => buildParticipationData(Factory.FURNITURE, FURNITURE_DEPARTMENTS),
    [kaizens, selectedMonth, selectedDept, activeMonthsInSystem]
  );

  const moltyParticipationData = useMemo(
    () => buildParticipationData(Factory.MOLTY_FOAM, MOLTY_FOAM_DEPARTMENTS),
    [kaizens, selectedMonth, selectedDept, activeMonthsInSystem]
  );

  // Month Comparison / Trend across factories
  const comparisonData = useMemo(() => {
    if (activeMonthsInSystem.length === 0) return [];
    const recentMonths = activeMonthsInSystem.slice(-6);
    return recentMonths.map(m => {
      const monthRows = kaizens.filter(k =>
        k.month === m &&
        (selectedDept === 'All' || k.department === selectedDept)
      );
      if (user.role === 'ADMIN' && selectedFactory === 'All') {
        return {
          name: m,
          furniture: monthRows.filter(k => k.factory === Factory.FURNITURE).length,
          molty: monthRows.filter(k => k.factory === Factory.MOLTY_FOAM).length,
          total: monthRows.length
        };
      }
      const activeFac = user.role === 'ADMIN' ? selectedFactory : (user.factory as Factory);
      return {
        name: m,
        count: monthRows.filter(k => k.factory === activeFac).length
      };
    });
  }, [kaizens, activeMonthsInSystem, selectedFactory, selectedDept, user]);

  // Strategic Impact Pillars
  const impactChartData = useMemo(() => {
    const keys: Array<{ key: keyof Kaizen['impact']; label: string }> = [
      { key: 'costSaving', label: 'Cost Saving' },
      { key: 'productivity', label: 'Productivity' },
      { key: 'quality', label: 'Quality' },
      { key: 'safety', label: 'Safety' },
      { key: 'delivery', label: 'Delivery' }
    ];
    return keys.map(item => ({
      name: item.label,
      count: filteredKaizens.filter(k => k.impact && k.impact[item.key]).length
    }));
  }, [filteredKaizens]);

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {user.role === 'ADMIN' ? 'Lean & Transformation Dashboard' : `${user.department} Portal`}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {user.role === 'ADMIN'
              ? `${selectedFactory === 'All' ? 'All Factories Overview' : selectedFactory} · Master Furnishings Pvt. Ltd.`
              : `${user.factory} · Master Furnishings Pvt. Ltd.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {user.role === 'ADMIN' && (
            <select
              value={selectedFactory}
              onChange={(e) => handleFactoryChange(e.target.value as 'All' | Factory)}
              className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
            >
              <option value="All">All Factories</option>
              {FACTORIES.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          )}

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
          >
            <option value="All">All Active Months</option>
            {activeMonthsInSystem.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          {user.role === 'ADMIN' && (
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
            >
              <option value="All">All Units ({availableDepts.length})</option>
              {availableDepts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}

          {user.role === 'ADMIN' && (
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Posters (PDF)</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Dual-Factory Executive Comparison Strip */}
      {user.role === 'ADMIN' && selectedFactory === 'All' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {factoryCards.map((fc, idx) => (
            <button
              key={fc.factory}
              type="button"
              onClick={() => handleFactoryChange(fc.factory)}
              className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-600 text-left transition-all group"
            >
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
                    {fc.factory}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    {fc.unitsCount} {fc.factory === Factory.MOLTY_FOAM ? 'Sections' : 'Departments'} · Target {fc.target} Kaizens
                  </p>
                </div>
                <span className={`text-lg font-extrabold tabular-nums ${idx === 0 ? 'text-blue-700' : 'text-emerald-700'}`}>
                  {fc.participation.toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
                <div>
                  <span className="block text-[11px] text-slate-400">Received</span>
                  <span className="font-bold text-slate-900 tabular-nums">{fc.total}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400">Accepted</span>
                  <span className="font-bold text-emerald-700 tabular-nums">{fc.accIdeas + fc.accImp}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400">Pending</span>
                  <span className="font-bold text-amber-600 tabular-nums">{fc.pending}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[11px] text-slate-400">Cash Prize</span>
                  <span className="font-bold text-slate-900 tabular-nums">{fc.reward.toLocaleString()} PKR</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 border border-slate-200 rounded-xl">
          <p className="text-xs font-bold text-slate-500 mb-1">Total Received</p>
          <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{stats.total}</p>
          <div className="mt-2 text-xs text-slate-500 font-semibold flex gap-3 tabular-nums">
            <span>Ideas: {stats.totalIdeasCount}</span>
            <span aria-hidden="true">·</span>
            <span>Impl: {stats.totalImpCount}</span>
          </div>
        </div>

        <div className="bg-white p-6 border border-slate-200 rounded-xl">
          <p className="text-xs font-bold text-slate-500 mb-1">Participation Rate</p>
          <p className="text-3xl font-extrabold text-blue-700 tabular-nums">{stats.participation.toFixed(1)}%</p>
          <p className="text-xs font-medium text-slate-500 mt-2 tabular-nums">Target: {stats.target} Kaizens</p>
        </div>

        <div className="bg-white p-6 border border-slate-200 rounded-xl">
          <p className="text-xs font-bold text-slate-500 mb-1">Accrued Cash Prizes</p>
          <p className="text-3xl font-extrabold text-emerald-700 tabular-nums">{stats.reward.toLocaleString()}</p>
          <p className="text-xs font-medium text-slate-500 mt-2">Currency: PKR</p>
        </div>

        <div className="bg-white p-6 border border-slate-200 rounded-xl">
          <p className="text-xs font-bold text-slate-500 mb-1">Pending Review</p>
          <p className="text-3xl font-extrabold text-amber-600 tabular-nums">{stats.pending}</p>
          <p className="text-xs font-medium text-slate-500 mt-2">Decisions Awaited</p>
        </div>
      </div>

      {/* Section-Wise Participation Graphs with Data Labels */}
      {user.role === 'ADMIN' && selectedFactory === 'All' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white p-6 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Karachi Furniture Factory — Section Participation</h3>
                <p className="text-xs text-slate-500">14 Departments · Goal 100% (4 Kaizens / Month)</p>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={furnitureParticipationData} margin={{ top: 24, right: 12, left: -12, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={10} fontWeight={600} interval={0} angle={-25} textAnchor="end" height={48} />
                  <YAxis fontSize={10} unit="%" />
                  <Tooltip formatter={(value: any) => [`${value}%`, 'Participation']} />
                  <ReferenceLine y={100} stroke="#10b981" strokeDasharray="4 4" />
                  <Bar dataKey="participation" name="Participation %" radius={[4, 4, 0, 0]}>
                    {furnitureParticipationData.map((entry, index) => (
                      <Cell key={`ff-${index}`} fill={entry.participation >= 100 ? '#10b981' : '#1d4ed8'} />
                    ))}
                    <LabelList dataKey="participation" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: 10, fontWeight: 700, fill: '#0f172a' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white p-6 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Karachi Molty Foam Port Qasim — Sections</h3>
                <p className="text-xs text-slate-500">5 Sections · Goal 100% (4 Kaizens / Month)</p>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={moltyParticipationData} margin={{ top: 24, right: 12, left: -12, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={10} fontWeight={600} interval={0} angle={-15} textAnchor="end" height={48} />
                  <YAxis fontSize={10} unit="%" />
                  <Tooltip formatter={(value: any) => [`${value}%`, 'Participation']} />
                  <ReferenceLine y={100} stroke="#10b981" strokeDasharray="4 4" />
                  <Bar dataKey="participation" name="Participation %" radius={[4, 4, 0, 0]} barSize={38}>
                    {moltyParticipationData.map((entry, index) => (
                      <Cell key={`mf-${index}`} fill={entry.participation >= 100 ? '#10b981' : '#0284c7'} />
                    ))}
                    <LabelList dataKey="participation" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: 11, fontWeight: 700, fill: '#0f172a' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {selectedDept === 'All'
                  ? `${selectedFactory} — Section Wise Participation`
                  : `${selectedDept} Participation Performance`}
              </h3>
              <p className="text-xs text-slate-500">Target: 100% (4 Kaizens / Month per Unit)</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={
                  (user.role === 'ADMIN' ? selectedFactory : user.factory) === Factory.MOLTY_FOAM
                    ? moltyParticipationData
                    : furnitureParticipationData
                }
                margin={{ top: 24, right: 16, left: -10, bottom: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={10} fontWeight={600} interval={0} angle={-18} textAnchor="end" height={44} />
                <YAxis fontSize={10} unit="%" />
                <Tooltip formatter={(value: any) => [`${value}%`, 'Participation']} />
                <ReferenceLine y={100} stroke="#10b981" strokeDasharray="4 4" />
                <Bar dataKey="participation" name="Participation %" radius={[4, 4, 0, 0]} maxBarSize={56}>
                  {((user.role === 'ADMIN' ? selectedFactory : user.factory) === Factory.MOLTY_FOAM
                    ? moltyParticipationData
                    : furnitureParticipationData
                  ).map((entry, index) => (
                    <Cell key={`single-${index}`} fill={entry.participation >= 100 ? '#10b981' : '#1d4ed8'} />
                  ))}
                  <LabelList dataKey="participation" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: 11, fontWeight: 700, fill: '#0f172a' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Monthly Trend & Strategic Impact Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 border border-slate-200 rounded-xl">
          <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-slate-900">Monthly Submission Trend</h3>
            <span className="text-xs text-slate-500">Volume Comparison</span>
          </div>
          <div className="h-64">
            {comparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 24, right: 16, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={11} fontWeight={600} />
                  <YAxis fontSize={10} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                  {user.role === 'ADMIN' && selectedFactory === 'All' ? (
                    <>
                      <Bar dataKey="furniture" name="Furniture Factory" fill="#1d4ed8" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="furniture" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#1e3a8a' }} />
                      </Bar>
                      <Bar dataKey="molty" name="Molty Foam PQ" fill="#0ea5e9" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="molty" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#0369a1' }} />
                      </Bar>
                    </>
                  ) : (
                    <Bar dataKey="count" name="Kaizen Volume" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={52}>
                      <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#0f172a' }} />
                    </Bar>
                  )}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-semibold">
                Submit Kaizen entries to display monthly trend analysis
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 border border-slate-200 rounded-xl">
          <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-slate-900">Strategic Impact Pillars</h3>
            <span className="text-xs text-slate-500">Focus Distribution</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={impactChartData} margin={{ top: 24, right: 16, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={11} fontWeight={600} />
                <YAxis fontSize={10} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Kaizens" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#065f46' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Outcome Breakup */}
      <div className="bg-white p-6 border border-slate-200 rounded-xl">
        <h3 className="text-sm font-extrabold text-slate-900 mb-4 border-b border-slate-100 pb-2">Outcome Breakup</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <span className="block text-xs font-bold text-emerald-800 mb-1">Accepted Ideas</span>
            <span className="text-2xl font-extrabold text-emerald-700 tabular-nums">{stats.accIdeas}</span>
          </div>
          <div className="p-4 bg-emerald-100/70 rounded-lg border border-emerald-200">
            <span className="block text-xs font-bold text-emerald-900 mb-1">Accepted Implemented</span>
            <span className="text-2xl font-extrabold text-emerald-800 tabular-nums">{stats.accImp}</span>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <span className="block text-xs font-bold text-red-800 mb-1">Rejected Ideas</span>
            <span className="text-2xl font-extrabold text-red-700 tabular-nums">{stats.rejIdeas}</span>
          </div>
          <div className="p-4 bg-red-100/60 rounded-lg border border-red-200">
            <span className="block text-xs font-bold text-red-900 mb-1">Rejected Implemented</span>
            <span className="text-2xl font-extrabold text-red-800 tabular-nums">{stats.rejImp}</span>
          </div>
        </div>
      </div>

      {/* Department Direct Submission QR Code & PDF Download */}
      {user.role === 'DEPARTMENT' && user.factory !== 'ALL' && (
        <DepartmentQrCard factory={user.factory} department={user.department} />
      )}

      {/* Admin QR Poster Generator Modal */}
      {showQrModal && user.role === 'ADMIN' && (
        <QrPosterModal
          onClose={() => setShowQrModal(false)}
          initialFactory={selectedFactory === 'All' ? Factory.FURNITURE : selectedFactory}
        />
      )}
    </div>
  );
};

export default Dashboard;

import React, { useMemo, useState } from 'react';
import {
  User,
  Kaizen,
  KaizenStatus,
  KaizenType,
  MONTHS,
  Location,
  LOCATIONS,
  Factory,
  ALL_FACILITIES,
  getFactoriesForLocation,
  getDepartmentsForFactory,
  getShortFactoryName,
  isSuperAdmin,
  isLocationAdmin
} from '../types';
import {
  EVALUATION_CRITERIA,
  enrichKaizensWithRankings,
  computeFacilityFinanceSummaries
} from '../utils/kaizenScoring';
import {
  exportKaizensWithPicturesExcel,
  exportRecordsCsv,
  exportFinanceSummaryCsv
} from '../utils/excelExport';
import { downloadPictorialKaizenBookletPdf, downloadSingleKaizenPdf } from '../utils/kaizenReportPdf';
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
import { Download, FileSpreadsheet, FileDown, Trophy, Building2 } from 'lucide-react';

interface AdminGlobalAnalyticsProps {
  user: User;
  kaizens: Kaizen[];
}

interface AnalyticsRow {
  location: Location;
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
  baseReward: number;
  positionBonus: number;
  totalReward: number;
  target: number;
}

const OUTCOME_COLORS = ['#059669', '#2563eb', '#d97706', '#dc2626'];

const AdminGlobalAnalytics: React.FC<AdminGlobalAnalyticsProps> = ({ user, kaizens }) => {
  const userIsSuperAdmin = isSuperAdmin(user);
  const userIsLocationAdmin = isLocationAdmin(user);
  const rankedKaizens = useMemo(() => enrichKaizensWithRankings(kaizens), [kaizens]);

  const [selectedLocation, setSelectedLocation] = useState<'All' | Location>(
    userIsSuperAdmin ? 'All' : (user.location as Location)
  );
  const [selectedFactory, setSelectedFactory] = useState<'All' | Factory>('All');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>('All');

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const availableFactories = useMemo(() => getFactoriesForLocation(selectedLocation), [selectedLocation]);
  const availableDepts = useMemo(() => getDepartmentsForFactory(selectedFactory), [selectedFactory]);

  const handleLocationChange = (val: 'All' | Location) => {
    setSelectedLocation(val);
    const allowed = getFactoriesForLocation(val);
    if (selectedFactory !== 'All' && !allowed.includes(selectedFactory)) {
      setSelectedFactory('All');
      setSelectedDept('All');
    }
  };

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
    const months = Array.from(new Set(rankedKaizens.map((k) => k.month)));
    return months.sort((a, b) => MONTHS.indexOf(a as string) - MONTHS.indexOf(b as string));
  }, [rankedKaizens]);

  const activeFacilityUnits = useMemo(() => {
    return ALL_FACILITIES.filter(
      (f) =>
        (selectedLocation === 'All' || f.location === selectedLocation) &&
        (selectedFactory === 'All' || f.factory === selectedFactory)
    );
  }, [selectedLocation, selectedFactory]);

  const filteredRankedKaizens = useMemo(() => {
    return rankedKaizens.filter(
      (k) =>
        (selectedLocation === 'All' || k.location === selectedLocation) &&
        (selectedFactory === 'All' || k.factory === selectedFactory) &&
        (selectedDept === 'All' || k.department === selectedDept) &&
        (selectedMonth === 'All' || k.month === selectedMonth)
    );
  }, [rankedKaizens, selectedLocation, selectedFactory, selectedDept, selectedMonth]);

  const analytics = useMemo<AnalyticsRow[]>(() => {
    const monthsCount = selectedMonth === 'All' ? Math.max(1, activeMonthsInSystem.length) : 1;
    const rows: AnalyticsRow[] = [];

    activeFacilityUnits.forEach((fac) => {
      const units = getDepartmentsForFactory(fac.factory).filter(
        (u) => selectedDept === 'All' || u === selectedDept
      );
      units.forEach((dept) => {
        const deptKaizens = filteredRankedKaizens.filter(
          (k) => k.location === fac.location && k.factory === fac.factory && k.department === dept
        );

        const target = 4 * monthsCount;
        const accIdeas = deptKaizens.filter(
          (k) => k.status === KaizenStatus.ACCEPTED && k.type === KaizenType.IDEA
        ).length;
        const accImp = deptKaizens.filter(
          (k) => k.status === KaizenStatus.ACCEPTED && k.type === KaizenType.IMPLEMENTED
        ).length;
        const rejIdeas = deptKaizens.filter(
          (k) => k.status === KaizenStatus.REJECTED && k.type === KaizenType.IDEA
        ).length;
        const rejImp = deptKaizens.filter(
          (k) => k.status === KaizenStatus.REJECTED && k.type === KaizenType.IMPLEMENTED
        ).length;
        const pending = deptKaizens.filter((k) => k.status === KaizenStatus.PENDING).length;

        const participation = target > 0 ? (deptKaizens.length / target) * 100 : 0;
        const baseReward = deptKaizens.reduce((s, k) => s + k.baseReward, 0);
        const positionBonus = deptKaizens.reduce((s, k) => s + k.positionBonus, 0);

        rows.push({
          location: fac.location,
          factory: fac.factory,
          shortFactory: `${fac.location} · ${getShortFactoryName(fac.factory)}`,
          dept,
          total: deptKaizens.length,
          accIdeas,
          accImp,
          rejIdeas,
          rejImp,
          pending,
          participation,
          baseReward,
          positionBonus,
          totalReward: baseReward + positionBonus,
          target
        });
      });
    });

    return rows.sort((a, b) => b.participation - a.participation || b.totalReward - a.totalReward);
  }, [activeFacilityUnits, filteredRankedKaizens, selectedDept, selectedMonth, activeMonthsInSystem]);

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
        baseReward: acc.baseReward + curr.baseReward,
        positionBonus: acc.positionBonus + curr.positionBonus,
        reward: acc.reward + curr.totalReward
      }),
      {
        total: 0,
        target: 0,
        accIdeas: 0,
        accImp: 0,
        rejIdeas: 0,
        rejImp: 0,
        pending: 0,
        baseReward: 0,
        positionBonus: 0,
        reward: 0
      }
    );
  }, [analytics]);

  const facilityComparisonChartData = useMemo(() => {
    const monthsCount = selectedMonth === 'All' ? Math.max(1, activeMonthsInSystem.length) : 1;
    return activeFacilityUnits.map((fac) => {
      const units = getDepartmentsForFactory(fac.factory).filter(
        (u) => selectedDept === 'All' || u === selectedDept
      );
      const list = filteredRankedKaizens.filter(
        (k) => k.location === fac.location && k.factory === fac.factory
      );
      const accIdeas = list.filter(
        (k) => k.status === KaizenStatus.ACCEPTED && k.type === KaizenType.IDEA
      ).length;
      const accImp = list.filter(
        (k) => k.status === KaizenStatus.ACCEPTED && k.type === KaizenType.IMPLEMENTED
      ).length;
      const pending = list.filter((k) => k.status === KaizenStatus.PENDING).length;
      const reward = list.reduce((s, k) => s + k.totalReward, 0);
      const target = 4 * monthsCount * units.length;
      const participation = target > 0 ? Math.round((list.length / target) * 100) : 0;

      return {
        key: fac.key,
        name: fac.shortLabel,
        fullName: fac.label,
        Total: list.length,
        'Acc. Ideas': accIdeas,
        'Acc. Impl': accImp,
        Pending: pending,
        participation,
        reward,
        target
      };
    });
  }, [activeFacilityUnits, filteredRankedKaizens, selectedDept, selectedMonth, activeMonthsInSystem]);

  const rewardChartData = useMemo(() => {
    return [...analytics]
      .filter((r) => r.totalReward > 0 || r.total > 0)
      .sort((a, b) => b.totalReward - a.totalReward || b.total - a.total)
      .slice(0, 12)
      .map((r) => ({
        label: `${r.dept} (${r.location.slice(0, 3)}-${r.factory === Factory.MASTER_MOLTY_FOAM ? 'MF' : 'LS'})`,
        reward: r.totalReward
      }));
  }, [analytics]);

  const outcomePieData = useMemo(() => {
    return [
      { name: 'Acc. Implemented', value: totals.accImp },
      { name: 'Acc. Ideas', value: totals.accIdeas },
      { name: 'Pending', value: totals.pending },
      { name: 'Rejected', value: totals.rejIdeas + totals.rejImp }
    ].filter((d) => d.value > 0);
  }, [totals]);

  const impactBreakdownData = useMemo(() => {
    const items: Array<{ key: keyof Kaizen['impact']; name: string }> = [
      { key: 'costSaving', name: 'Cost Saving' },
      { key: 'productivity', name: 'Productivity' },
      { key: 'quality', name: 'Quality' },
      { key: 'safety', name: 'Safety' },
      { key: 'delivery', name: 'Delivery' }
    ];
    return items.map((i) => ({
      name: i.name,
      count: filteredRankedKaizens.filter((k) => k.impact && k.impact[i.key]).length
    }));
  }, [filteredRankedKaizens]);

  // Segregated Finance Summaries per Location + Factory (filtered by Location/Factory/Month)
  const financeSummaries = useMemo(() => {
    return computeFacilityFinanceSummaries(rankedKaizens, selectedMonth).filter(
      (s) =>
        (selectedLocation === 'All' || s.location === selectedLocation) &&
        (selectedFactory === 'All' || s.factory === selectedFactory)
    );
  }, [rankedKaizens, selectedMonth, selectedLocation, selectedFactory]);

  // Evaluated Kaizens for Criteria Scoreboard Table
  const evaluatedKaizens = useMemo(() => {
    return filteredRankedKaizens
      .filter((k) => k.status === KaizenStatus.ACCEPTED && k.evaluation)
      .sort((a, b) => (b.evaluation?.aggregateScore || 0) - (a.evaluation?.aggregateScore || 0));
  }, [filteredRankedKaizens]);

  const avgParticipation =
    analytics.length > 0
      ? analytics.reduce((s, c) => s + c.participation, 0) / analytics.length
      : 0;

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      await exportKaizensWithPicturesExcel(
        filteredRankedKaizens,
        rankedKaizens,
        selectedMonth,
        userIsLocationAdmin ? `Master_${user.location}_Analytics` : 'Master_Group_Global_Analytics',
        userIsLocationAdmin ? (user.location as Location) : 'ALL'
      );
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPdfBooklet = async () => {
    if (filteredRankedKaizens.length === 0) return;
    setIsExportingPdf(true);
    try {
      await downloadPictorialKaizenBookletPdf(
        filteredRankedKaizens,
        userIsLocationAdmin ? `Master_${user.location}_Kaizen_Booklet` : 'Master_Group_Kaizen_Booklet'
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Synchronized Filter & Export Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
        <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {userIsLocationAdmin
                ? `${user.location} Factory Analytics & Segregated Finance Summary`
                : 'Global Analytics & Segregated Finance Summary'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedLocation === 'All' ? 'All Pakistan (Karachi · Lahore · Mirpur)' : `${selectedLocation} Scope`} ·{' '}
              {selectedFactory === 'All'
                ? userIsLocationAdmin
                  ? `All ${user.location} Factories`
                  : 'All Factories'
                : selectedFactory}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {userIsSuperAdmin ? (
              <select
                value={selectedLocation}
                onChange={(e) => handleLocationChange(e.target.value as 'All' | Location)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
              >
                <option value="All">All Locations (3)</option>
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            ) : (
              <span className="px-3 py-2 border border-blue-200 rounded-lg text-xs font-bold bg-blue-50 text-blue-800">
                {user.location} Only
              </span>
            )}

            <select
              value={selectedFactory}
              onChange={(e) => handleFactoryChange(e.target.value as 'All' | Factory)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
            >
              <option value="All">
                {userIsLocationAdmin ? `All ${user.location} Factories` : 'All Factories'}
              </option>
              {availableFactories.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
            >
              <option value="All">All Sections ({availableDepts.length})</option>
              {availableDepts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
            >
              <option value="All">All Periods</option>
              {activeMonthsInSystem.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* All Data Export Options */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Download complete multi-sheet Excel workbooks (with embedded Before & After photos), segregated Finance payout sheets, or pictorial PDF reports.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isExportingExcel ? 'Generating Workbook...' : 'Excel Workbook w/ Photos (.xlsx)'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdfBooklet}
              disabled={isExportingPdf || filteredRankedKaizens.length === 0}
              className="px-3.5 py-2 bg-slate-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Creating PDF...' : 'Pictorial PDF Booklet'}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                exportFinanceSummaryCsv(
                  rankedKaizens,
                  selectedMonth,
                  userIsLocationAdmin ? `Master_${user.location}_Finance_Summary` : 'Master_Finance_Reward_Summary',
                  userIsLocationAdmin ? (user.location as Location) : 'ALL'
                )
              }
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Finance Summary CSV</span>
            </button>

            <button
              type="button"
              onClick={() =>
                exportRecordsCsv(
                  filteredRankedKaizens,
                  userIsLocationAdmin ? `Master_${user.location}_Kaizen_Records` : 'Master_Kaizen_Records'
                )
              }
              disabled={filteredRankedKaizens.length === 0}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Records CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 p-5 rounded-xl text-white border border-slate-800">
          <p className="text-xs font-semibold text-slate-400 mb-1">Avg Section Participation</p>
          <p className="text-3xl font-extrabold text-blue-400 tabular-nums">{avgParticipation.toFixed(1)}%</p>
          <p className="text-xs text-slate-400 mt-2 tabular-nums">
            {totals.total} / {totals.target} Kaizens
          </p>
        </div>

        <div className="bg-amber-600 p-5 rounded-xl text-white">
          <p className="text-xs font-semibold text-amber-100 mb-1">Pending Review</p>
          <p className="text-3xl font-extrabold text-white tabular-nums">{totals.pending}</p>
          <p className="text-xs text-amber-100 mt-2">Awaiting Committee Decision</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 mb-1">Base Submission Pool</p>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {totals.baseReward.toLocaleString()} PKR
          </p>
          <p className="text-xs text-slate-500 mt-2 tabular-nums">
            {totals.accIdeas} Ideas (50) · {totals.accImp} Impl (200)
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 mb-1">Top 3 Position Bonuses</p>
          <p className="text-2xl font-extrabold text-blue-700 tabular-nums">
            {totals.positionBonus.toLocaleString()} PKR
          </p>
          <p className="text-xs text-slate-500 mt-2">1st: 1,300 · 2nd: 700 · 3rd: 500</p>
        </div>

        <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200">
          <p className="text-xs font-bold text-emerald-900 mb-1">Total Finance Payable</p>
          <p className="text-2xl font-extrabold text-emerald-700 tabular-nums">
            {totals.reward.toLocaleString()} PKR
          </p>
          <p className="text-xs text-emerald-800 mt-2">Base + Position Rewards</p>
        </div>
      </div>

      {/* Segregated Finance Reward Summary Per Location & Factory */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-700" />
              <span>Segregated Factory Finance Disbursement Summary</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Each Location & Factory has its own isolated Finance summary and independent Top 3 winners (1st: 1,300 + 200 · 2nd: 700 + 200 · 3rd: 500 + 200 PKR).
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 tabular-nums">
            Period: {selectedMonth === 'All' ? 'All Months' : selectedMonth}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {financeSummaries.map((fac) => (
            <div
              key={`${fac.location}-${fac.factory}`}
              className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 flex flex-col"
            >
              <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-extrabold">{fac.location} · {fac.factory}</h4>
                  <p className="text-[11px] text-slate-300 tabular-nums">
                    {fac.totalSubmitted} Submitted · {fac.acceptedIdeasCount + fac.acceptedImplCount} Accepted · {fac.pendingCount} Pending
                  </p>
                </div>
                <div className="text-right tabular-nums">
                  <span className="text-[10px] text-slate-400 uppercase block">Facility Finance Total</span>
                  <span className="text-base font-extrabold text-emerald-400">
                    {fac.grandTotalPayable.toLocaleString()} PKR
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-4 flex-1">
                <div className="grid grid-cols-3 gap-2.5 text-xs tabular-nums">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="block text-[11px] text-slate-500">Acc. Ideas (50)</span>
                    <span className="font-extrabold text-slate-900">
                      {fac.acceptedIdeasCount} ({fac.ideasBasePool.toLocaleString()} PKR)
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="block text-[11px] text-slate-500">Acc. Impl (200)</span>
                    <span className="font-extrabold text-slate-900">
                      {fac.acceptedImplCount} ({fac.implBasePool.toLocaleString()} PKR)
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="block text-[11px] text-slate-500">Position Bonuses</span>
                    <span className="font-extrabold text-blue-700">
                      {fac.positionBonusTotal.toLocaleString()} PKR
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-600" />
                    <span>Top 3 Position Winners ({fac.location} · {getShortFactoryName(fac.factory)})</span>
                  </p>
                  {fac.winners.length > 0 ? (
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600 text-[11px] font-bold">
                          <tr>
                            <th className="px-3 py-2">Pos.</th>
                            <th className="px-3 py-2">Kaizen ID</th>
                            <th className="px-3 py-2">Section / Initiator</th>
                            <th className="px-3 py-2 text-right">Score</th>
                            <th className="px-3 py-2 text-right">Payout</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 tabular-nums">
                          {fac.winners.map((w) => (
                            <tr key={w.id}>
                              <td className="px-3 py-2 font-extrabold whitespace-nowrap">
                                <span
                                  className={
                                    w.position === 1
                                      ? 'text-emerald-700'
                                      : w.position === 2
                                        ? 'text-blue-700'
                                        : 'text-amber-700'
                                  }
                                >
                                  {w.positionLabel}
                                </span>
                                <span className="block text-[10px] font-normal text-slate-400">{w.month}</span>
                              </td>
                              <td className="px-3 py-2 font-mono font-bold text-slate-900 whitespace-nowrap">
                                {w.id}
                              </td>
                              <td className="px-3 py-2">
                                <span className="font-bold text-slate-900 block">{w.department}</span>
                                <span className="text-[11px] text-slate-500">{w.initiator}</span>
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-slate-700">
                                {w.evaluation ? `${w.evaluation.percentage}%` : '—'}
                              </td>
                              <td className="px-3 py-2 text-right font-extrabold text-emerald-700 whitespace-nowrap">
                                {w.totalReward.toLocaleString()} PKR
                                <span className="block text-[10px] font-normal text-slate-400">
                                  {w.baseReward}+{w.positionBonus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-lg p-4 text-center text-xs text-slate-400">
                      Accept and score Kaizens in Records Management to rank 1st, 2nd & 3rd positions for this facility.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Analytics Suite */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              {userIsLocationAdmin
                ? `${user.location} Facility Performance Comparison`
                : 'All-Pakistan Facility Performance Comparison'}
            </h3>
            <span className="text-xs text-slate-500">Synced with Filters</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={facilityComparisonChartData} margin={{ top: 24, right: 16, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={10} fontWeight={700} />
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

        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-extrabold text-slate-900">Top Sections by Total Rewards (PKR)</h3>
            <span className="text-xs text-slate-500">Base + Position Bonus</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rewardChartData} layout="vertical" margin={{ top: 8, right: 48, left: 10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" fontSize={10} />
                <YAxis type="category" dataKey="label" fontSize={10} fontWeight={600} width={145} />
                <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} PKR`, 'Total Reward']} />
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
                No Kaizen records available for selected filters
              </div>
            )}
          </div>
        </div>

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

      {/* Kaizen Judgment Criteria Scoreboard (Matching Attached Criteria Matrix) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Evaluation Criterion Scoreboard (Rating 1 – 3)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Weighted scoring matrix across all accepted & evaluated Kaizens in the selected scope
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 tabular-nums">
            {evaluatedKaizens.length} Evaluated Kaizens
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1120px]">
            <thead>
              <tr className="bg-sky-700 text-white text-[11px] font-bold">
                <th className="px-3 py-3 border-r border-sky-600">Kaizen #</th>
                <th className="px-3 py-3 border-r border-sky-600">Facility · Section</th>
                {EVALUATION_CRITERIA.map((c) => (
                  <th key={c.key} className="px-2.5 py-3 border-r border-sky-600 text-center">
                    {c.shortLabel}
                    <span className="block text-[10px] font-normal text-sky-100">{c.weightPct}%</span>
                  </th>
                ))}
                <th className="px-3 py-3 border-r border-sky-600 text-center">Aggregate</th>
                <th className="px-3 py-3 border-r border-sky-600 text-center">Position</th>
                <th className="px-3 py-3 border-r border-sky-600 text-center">Percentage</th>
                <th className="px-3 py-3 text-center">1-Page PDF</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100 tabular-nums">
              {evaluatedKaizens.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50">
                  <td className="px-3 py-3 border-r border-slate-100 font-mono font-bold text-slate-900 whitespace-nowrap">
                    {k.id}
                  </td>
                  <td className="px-3 py-3 border-r border-slate-100">
                    <span className="font-bold text-slate-900 block">{k.department}</span>
                    <span className="text-[11px] text-slate-500">
                      {k.location} · {getShortFactoryName(k.factory)} · {k.month}
                    </span>
                  </td>
                  {EVALUATION_CRITERIA.map((c) => (
                    <td key={c.key} className="px-2.5 py-3 border-r border-slate-100 text-center font-semibold text-slate-800">
                      {k.evaluation?.scores[c.key] ?? '—'}
                    </td>
                  ))}
                  <td className="px-3 py-3 border-r border-slate-100 text-center font-extrabold text-slate-900 bg-slate-50">
                    {k.evaluation ? k.evaluation.aggregateScore.toFixed(1) : '—'}
                  </td>
                  <td
                    className={`px-3 py-3 border-r border-slate-100 text-center font-bold whitespace-nowrap ${
                      k.position === 1
                        ? 'bg-emerald-100 text-emerald-900'
                        : k.position === 2
                          ? 'bg-sky-100 text-sky-900'
                          : k.position === 3
                            ? 'bg-amber-100 text-amber-900'
                            : 'text-slate-500'
                    }`}
                  >
                    {k.positionLabel}
                  </td>
                  <td className="px-3 py-3 border-r border-slate-100 text-center font-bold text-emerald-700">
                    {k.evaluation ? `${k.evaluation.percentage}%` : '—'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => downloadSingleKaizenPdf(k)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-[11px] font-bold"
                    >
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
              {evaluatedKaizens.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-6 py-10 text-center text-slate-400 text-xs font-semibold">
                    No evaluated Kaizens yet. Accept a Kaizen in Records Management and submit its 7-criteria evaluation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Section-Wise Performance & Cash Prize Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-900 text-white text-xs font-bold">
                <th className="px-4 py-4 border-r border-slate-800">Location · Factory</th>
                <th className="px-4 py-4 border-r border-slate-800">Section</th>
                <th className="px-4 py-4 border-r border-slate-800 text-center">Participation %</th>
                <th className="px-4 py-4 border-r border-slate-800 text-center">Volume (S/T)</th>
                <th className="px-4 py-4 border-r border-slate-800 text-center text-emerald-400">Acc. Idea</th>
                <th className="px-4 py-4 border-r border-slate-800 text-center text-emerald-400">Acc. Imp.</th>
                <th className="px-4 py-4 border-r border-slate-800 text-center text-amber-300">Pending</th>
                <th className="px-4 py-4 border-r border-slate-800 text-center text-red-400">Rej.</th>
                <th className="px-4 py-4 border-r border-slate-800 text-right">Base + Pos. Bonus</th>
                <th className="px-4 py-4 text-right">Total Reward (PKR)</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100">
              {analytics.map((row) => (
                <tr key={`${row.location}-${row.factory}-${row.dept}`} className="hover:bg-slate-50 transition-colors">
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
                  <td className="px-4 py-3.5 border-r border-slate-100 text-center text-red-600 tabular-nums">{row.rejIdeas + row.rejImp}</td>
                  <td className="px-4 py-3.5 border-r border-slate-100 text-right text-slate-600 tabular-nums">
                    {row.baseReward.toLocaleString()} + {row.positionBonus.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-900 tabular-nums">
                    {row.totalReward.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-bold text-xs">
              <tr>
                <td colSpan={2} className="px-4 py-4 border-r border-slate-800">
                  Selected Scope Grand Total
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
                <td className="px-4 py-4 border-r border-slate-800 text-center tabular-nums">{totals.rejIdeas + totals.rejImp}</td>
                <td className="px-4 py-4 border-r border-slate-800 text-right tabular-nums">
                  {totals.baseReward.toLocaleString()} + {totals.positionBonus.toLocaleString()}
                </td>
                <td className="px-4 py-4 text-right text-blue-300 text-sm tabular-nums">
                  {totals.reward.toLocaleString()} PKR
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminGlobalAnalytics;

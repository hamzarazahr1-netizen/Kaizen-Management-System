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
  FACTORIES,
  ALL_FACILITIES,
  FURNITURE_DEPARTMENTS,
  MOLTY_FOAM_DEPARTMENTS,
  getFactoriesForLocation,
  getDepartmentsForFactory
} from '../types';
import {
  enrichKaizensWithRankings,
  computeFacilityFinanceSummaries
} from '../utils/kaizenScoring';
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
import { QrCode, ArrowRight, Trophy } from 'lucide-react';
import DepartmentQrCard from './DepartmentQrCard';
import QrPosterModal from './QrPosterModal';

interface DashboardProps {
  user: User;
  kaizens: Kaizen[];
  onNavigateTab?: (tab: 'dashboard' | 'submit' | 'records' | 'analytics') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, kaizens, onNavigateTab }) => {
  const rankedKaizens = useMemo(() => enrichKaizensWithRankings(kaizens), [kaizens]);

  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<'All' | Location>(
    user.role === 'ADMIN' ? 'All' : (user.location as Location)
  );
  const [selectedFactory, setSelectedFactory] = useState<'All' | Factory>(
    user.role === 'ADMIN' ? 'All' : (user.factory as Factory)
  );
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [selectedDept, setSelectedDept] = useState<string>(
    user.role === 'ADMIN' ? 'All' : user.department
  );

  const availableFactories = useMemo(
    () => getFactoriesForLocation(selectedLocation),
    [selectedLocation]
  );

  const availableDepts = useMemo(() => {
    if (selectedFactory === 'All' && availableFactories.length === 1) {
      return getDepartmentsForFactory(availableFactories[0]);
    }
    return getDepartmentsForFactory(selectedFactory);
  }, [selectedFactory, availableFactories]);

  const handleLocationChange = (val: 'All' | Location) => {
    setSelectedLocation(val);
    const allowedFacs = getFactoriesForLocation(val);
    if (selectedFactory !== 'All' && !allowedFacs.includes(selectedFactory)) {
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

  // All visualizations sync strictly with filteredKaizens
  const filteredKaizens = useMemo(() => {
    return rankedKaizens.filter((k) => {
      const locMatch = user.role === 'ADMIN'
        ? selectedLocation === 'All' || k.location === selectedLocation
        : k.location === user.location;
      const factoryMatch = user.role === 'ADMIN'
        ? selectedFactory === 'All' || k.factory === selectedFactory
        : k.factory === user.factory;
      const monthMatch = selectedMonth === 'All' || k.month === selectedMonth;
      const deptMatch = user.role === 'ADMIN'
        ? selectedDept === 'All' || k.department === selectedDept
        : k.department === user.department;
      return locMatch && factoryMatch && monthMatch && deptMatch;
    });
  }, [rankedKaizens, selectedLocation, selectedFactory, selectedMonth, selectedDept, user]);

  // Active facility units in current filter scope
  const activeFacilityUnits = useMemo(() => {
    return ALL_FACILITIES.filter(
      (f) =>
        (selectedLocation === 'All' || f.location === selectedLocation) &&
        (selectedFactory === 'All' || f.factory === selectedFactory)
    );
  }, [selectedLocation, selectedFactory]);

  const stats = useMemo(() => {
    const total = filteredKaizens.length;
    const accIdeas = filteredKaizens.filter(
      (k) => k.status === KaizenStatus.ACCEPTED && k.type === KaizenType.IDEA
    ).length;
    const accImp = filteredKaizens.filter(
      (k) => k.status === KaizenStatus.ACCEPTED && k.type === KaizenType.IMPLEMENTED
    ).length;
    const rejIdeas = filteredKaizens.filter(
      (k) => k.status === KaizenStatus.REJECTED && k.type === KaizenType.IDEA
    ).length;
    const rejImp = filteredKaizens.filter(
      (k) => k.status === KaizenStatus.REJECTED && k.type === KaizenType.IMPLEMENTED
    ).length;
    const pending = filteredKaizens.filter((k) => k.status === KaizenStatus.PENDING).length;

    const totalIdeasCount = filteredKaizens.filter((k) => k.type === KaizenType.IDEA).length;
    const totalImpCount = filteredKaizens.filter((k) => k.type === KaizenType.IMPLEMENTED).length;

    const baseReward = filteredKaizens.reduce((s, k) => s + k.baseReward, 0);
    const positionBonus = filteredKaizens.reduce((s, k) => s + k.positionBonus, 0);
    const totalReward = baseReward + positionBonus;

    const monthsCount = selectedMonth === 'All' ? Math.max(1, activeMonthsInSystem.length) : 1;

    let totalSectionSlots = 0;
    if (user.role === 'DEPARTMENT') {
      totalSectionSlots = 1;
    } else {
      activeFacilityUnits.forEach((fac) => {
        const units = getDepartmentsForFactory(fac.factory);
        if (selectedDept === 'All') {
          totalSectionSlots += units.length;
        } else if (units.includes(selectedDept)) {
          totalSectionSlots += 1;
        }
      });
    }

    const target = 4 * monthsCount * Math.max(0, totalSectionSlots);
    const participation = target > 0 ? (total / target) * 100 : 0;

    return {
      total,
      accIdeas,
      accImp,
      rejIdeas,
      rejImp,
      pending,
      baseReward,
      positionBonus,
      totalReward,
      participation,
      target,
      totalIdeasCount,
      totalImpCount
    };
  }, [filteredKaizens, selectedMonth, selectedDept, activeMonthsInSystem, activeFacilityUnits, user.role]);

  // Brand-level cross-location comparisons (Molty Foam: KHI vs LHR vs MPR, Lifestyle: KHI vs LHR)
  const moltyLocationComparison = useMemo(() => {
    const monthsCount = selectedMonth === 'All' ? Math.max(1, activeMonthsInSystem.length) : 1;
    const moltyLocations = [Location.KARACHI, Location.LAHORE, Location.MIRPUR];
    return moltyLocations
      .filter((loc) => selectedLocation === 'All' || loc === selectedLocation)
      .map((loc) => {
        const list = filteredKaizens.filter(
          (k) => k.location === loc && k.factory === Factory.MASTER_MOLTY_FOAM
        );
        const unitCount =
          selectedDept === 'All'
            ? MOLTY_FOAM_DEPARTMENTS.length
            : MOLTY_FOAM_DEPARTMENTS.includes(selectedDept)
              ? 1
              : 0;
        const target = 4 * monthsCount * unitCount;
        const participation = target > 0 ? Math.round((list.length / target) * 100) : 0;
        return {
          name: loc,
          Total: list.length,
          Accepted: list.filter((k) => k.status === KaizenStatus.ACCEPTED).length,
          Pending: list.filter((k) => k.status === KaizenStatus.PENDING).length,
          participation,
          reward: list.reduce((s, k) => s + k.totalReward, 0)
        };
      });
  }, [filteredKaizens, selectedLocation, selectedMonth, selectedDept, activeMonthsInSystem]);

  const lifestyleLocationComparison = useMemo(() => {
    const monthsCount = selectedMonth === 'All' ? Math.max(1, activeMonthsInSystem.length) : 1;
    const lifestyleLocations = [Location.KARACHI, Location.LAHORE];
    return lifestyleLocations
      .filter((loc) => selectedLocation === 'All' || loc === selectedLocation)
      .map((loc) => {
        const list = filteredKaizens.filter(
          (k) => k.location === loc && k.factory === Factory.MASTER_LIFESTYLE
        );
        const unitCount =
          selectedDept === 'All'
            ? FURNITURE_DEPARTMENTS.length
            : FURNITURE_DEPARTMENTS.includes(selectedDept)
              ? 1
              : 0;
        const target = 4 * monthsCount * unitCount;
        const participation = target > 0 ? Math.round((list.length / target) * 100) : 0;
        return {
          name: loc,
          Total: list.length,
          Accepted: list.filter((k) => k.status === KaizenStatus.ACCEPTED).length,
          Pending: list.filter((k) => k.status === KaizenStatus.PENDING).length,
          participation,
          reward: list.reduce((s, k) => s + k.totalReward, 0)
        };
      });
  }, [filteredKaizens, selectedLocation, selectedMonth, selectedDept, activeMonthsInSystem]);

  // All 5 Facility Units Comparison
  const facilityCards = useMemo(() => {
    const monthsCount = selectedMonth === 'All' ? Math.max(1, activeMonthsInSystem.length) : 1;
    return activeFacilityUnits.map((fac) => {
      const units = getDepartmentsForFactory(fac.factory);
      const deptCount =
        selectedDept === 'All' ? units.length : units.includes(selectedDept) ? 1 : 0;
      const list = filteredKaizens.filter(
        (k) => k.location === fac.location && k.factory === fac.factory
      );
      const accepted = list.filter((k) => k.status === KaizenStatus.ACCEPTED).length;
      const pending = list.filter((k) => k.status === KaizenStatus.PENDING).length;
      const reward = list.reduce((s, k) => s + k.totalReward, 0);
      const target = 4 * monthsCount * deptCount;
      const participation = target > 0 ? (list.length / target) * 100 : 0;

      return {
        ...fac,
        unitsCount: deptCount,
        total: list.length,
        target,
        participation,
        accepted,
        pending,
        reward
      };
    });
  }, [activeFacilityUnits, filteredKaizens, selectedMonth, selectedDept, activeMonthsInSystem]);

  // Section-Wise Participation Data synced with active Location/Factory/Month/Section filters
  const buildSectionParticipation = (factory: Factory, units: string[]) => {
    const monthsCount = selectedMonth === 'All' ? Math.max(1, activeMonthsInSystem.length) : 1;
    const matchingFacilities = activeFacilityUnits.filter((f) => f.factory === factory);
    const locationMultiplier = Math.max(1, matchingFacilities.length);

    return units
      .filter((u) => (user.role === 'ADMIN' ? selectedDept === 'All' || u === selectedDept : u === user.department))
      .map((dept) => {
        const submissions = filteredKaizens.filter(
          (k) => k.factory === factory && k.department === dept
        ).length;
        const target = 4 * monthsCount * (user.role === 'ADMIN' ? locationMultiplier : 1);
        return {
          name: dept,
          submissions,
          participation: Math.round(target > 0 ? (submissions / target) * 100 : 0)
        };
      })
      .sort((a, b) => b.participation - a.participation);
  };

  const lifestyleParticipationData = useMemo(
    () => buildSectionParticipation(Factory.MASTER_LIFESTYLE, FURNITURE_DEPARTMENTS),
    [filteredKaizens, selectedMonth, selectedDept, activeMonthsInSystem, activeFacilityUnits, user]
  );

  const moltyParticipationData = useMemo(
    () => buildSectionParticipation(Factory.MASTER_MOLTY_FOAM, MOLTY_FOAM_DEPARTMENTS),
    [filteredKaizens, selectedMonth, selectedDept, activeMonthsInSystem, activeFacilityUnits, user]
  );

  // Monthly Trend synced with filters
  const monthlyTrendData = useMemo(() => {
    if (activeMonthsInSystem.length === 0) return [];
    const recentMonths = activeMonthsInSystem.slice(-6);
    return recentMonths.map((m) => {
      const monthRows = filteredKaizens.filter((k) => k.month === m);
      if (user.role === 'ADMIN' && selectedFactory === 'All') {
        return {
          name: m,
          lifestyle: monthRows.filter((k) => k.factory === Factory.MASTER_LIFESTYLE).length,
          molty: monthRows.filter((k) => k.factory === Factory.MASTER_MOLTY_FOAM).length,
          total: monthRows.length
        };
      }
      return {
        name: m,
        count: monthRows.length
      };
    });
  }, [filteredKaizens, activeMonthsInSystem, selectedFactory, user.role]);

  // Strategic Impact Pillars synced with filters
  const impactChartData = useMemo(() => {
    const keys: Array<{ key: keyof Kaizen['impact']; label: string }> = [
      { key: 'costSaving', label: 'Cost Saving' },
      { key: 'productivity', label: 'Productivity' },
      { key: 'quality', label: 'Quality' },
      { key: 'safety', label: 'Safety' },
      { key: 'delivery', label: 'Delivery' }
    ];
    return keys.map((item) => ({
      name: item.label,
      count: filteredKaizens.filter((k) => k.impact && k.impact[item.key]).length
    }));
  }, [filteredKaizens]);

  // Segregated Facility Finance & Top 3 Winners preview
  const financeSummaries = useMemo(
    () =>
      computeFacilityFinanceSummaries(rankedKaizens, selectedMonth).filter(
        (s) =>
          (selectedLocation === 'All' || s.location === selectedLocation) &&
          (selectedFactory === 'All' || s.factory === selectedFactory)
      ),
    [rankedKaizens, selectedMonth, selectedLocation, selectedFactory]
  );

  const sectionPositionWinners = useMemo(
    () => filteredKaizens.filter((k) => k.position !== null).sort((a, b) => (a.position || 9) - (b.position || 9)),
    [filteredKaizens]
  );

  return (
    <div className="space-y-6">
      {/* Header & Synchronized Filters */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col xl:flex-row gap-4 xl:items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {user.role === 'ADMIN' ? 'Kaizen Committee · Management Dashboard' : `${user.department} Section Dashboard`}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {user.role === 'ADMIN'
              ? `${selectedLocation === 'All' ? 'All Pakistan (Karachi · Lahore · Mirpur)' : selectedLocation} · ${
                  selectedFactory === 'All' ? 'All Factories' : selectedFactory
                }`
              : `${user.location} · ${user.factory} · Master Group of Industries`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center">
          {user.role === 'ADMIN' && (
            <>
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

              <select
                value={selectedFactory}
                onChange={(e) => handleFactoryChange(e.target.value as 'All' | Factory)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
              >
                <option value="All">All Factories</option>
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
            </>
          )}

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
          >
            <option value="All">All Active Months</option>
            {activeMonthsInSystem.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {user.role === 'ADMIN' && (
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Centralized QR (PDF)</span>
            </button>
          )}
        </div>
      </div>

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
          <p className="text-xs font-bold text-slate-500 mb-1">Total Rewards (Base + Positions)</p>
          <p className="text-3xl font-extrabold text-emerald-700 tabular-nums">
            {stats.totalReward.toLocaleString()}
          </p>
          <p className="text-xs font-medium text-slate-500 mt-2 tabular-nums">
            Base: {stats.baseReward.toLocaleString()} · Pos. Bonus: {stats.positionBonus.toLocaleString()} PKR
          </p>
        </div>

        <div className="bg-white p-6 border border-slate-200 rounded-xl flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">Pending Review</p>
            <p className="text-3xl font-extrabold text-amber-600 tabular-nums">{stats.pending}</p>
          </div>
          {user.role === 'ADMIN' && stats.pending > 0 && onNavigateTab ? (
            <button
              type="button"
              onClick={() => onNavigateTab('records')}
              className="mt-2 text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 self-start"
            >
              <span>Review & Score Pending</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <p className="text-xs font-medium text-slate-500 mt-2">Decisions Awaited</p>
          )}
        </div>
      </div>

      {/* Admin Brand Comparisons: Master Molty Foam (KHI vs LHR vs MPR) & Master Lifestyle (KHI vs LHR) */}
      {user.role === 'ADMIN' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(selectedFactory === 'All' || selectedFactory === Factory.MASTER_MOLTY_FOAM) && (
            <div className="bg-white p-6 border border-slate-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Master Molty Foam — Location Comparison
                  </h3>
                  <p className="text-xs text-slate-500">Karachi vs. Lahore vs. Mirpur</p>
                </div>
                <span className="text-xs font-bold text-sky-700 tabular-nums">
                  {moltyLocationComparison.reduce((s, r) => s + r.Total, 0)} Total
                </span>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moltyLocationComparison} margin={{ top: 20, right: 12, left: -12, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" fontSize={11} fontWeight={700} />
                    <YAxis fontSize={10} allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                    <Bar dataKey="Total" fill="#0f172a" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="Total" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#0f172a' }} />
                    </Bar>
                    <Bar dataKey="Accepted" fill="#059669" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="Accepted" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#047857' }} />
                    </Bar>
                    <Bar dataKey="Pending" fill="#d97706" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="Pending" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#b45309' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {(selectedFactory === 'All' || selectedFactory === Factory.MASTER_LIFESTYLE) &&
            selectedLocation !== Location.MIRPUR && (
              <div className="bg-white p-6 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Master Lifestyle Pvt. Ltd. — Location Comparison
                    </h3>
                    <p className="text-xs text-slate-500">Karachi vs. Lahore</p>
                  </div>
                  <span className="text-xs font-bold text-blue-700 tabular-nums">
                    {lifestyleLocationComparison.reduce((s, r) => s + r.Total, 0)} Total
                  </span>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lifestyleLocationComparison} margin={{ top: 20, right: 12, left: -12, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" fontSize={11} fontWeight={700} />
                      <YAxis fontSize={10} allowDecimals={false} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                      <Bar dataKey="Total" fill="#1d4ed8" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="Total" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#1e3a8a' }} />
                      </Bar>
                      <Bar dataKey="Accepted" fill="#059669" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="Accepted" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#047857' }} />
                      </Bar>
                      <Bar dataKey="Pending" fill="#d97706" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="Pending" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#b45309' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
        </div>
      )}

      {/* Admin 5-Facility Segregated Comparison Strip */}
      {user.role === 'ADMIN' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {facilityCards.map((fc) => (
            <button
              key={fc.key}
              type="button"
              onClick={() => {
                setSelectedLocation(fc.location);
                setSelectedFactory(fc.factory);
              }}
              className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-600 text-left transition-all group"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
                    {fc.location} · {fc.factory}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    {fc.unitsCount} Sections · Target {fc.target}
                  </p>
                </div>
                <span className="text-base font-extrabold text-blue-700 tabular-nums shrink-0">
                  {fc.participation.toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-xs tabular-nums">
                <div>
                  <span className="block text-[11px] text-slate-400">Received</span>
                  <span className="font-bold text-slate-900">{fc.total}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400">Accepted</span>
                  <span className="font-bold text-emerald-700">{fc.accepted}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400">Pending</span>
                  <span className="font-bold text-amber-600">{fc.pending}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[11px] text-slate-400">Payable</span>
                  <span className="font-bold text-slate-900">{fc.reward.toLocaleString()}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Section-Wise Participation Charts (Synced with Filters) */}
      {user.role === 'ADMIN' && selectedFactory === 'All' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {selectedLocation !== Location.MIRPUR && (
            <div className="lg:col-span-7 bg-white p-6 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Master Lifestyle Pvt. Ltd. — Section Participation
                  </h3>
                  <p className="text-xs text-slate-500">
                    {FURNITURE_DEPARTMENTS.length} Sections ({selectedLocation === 'All' ? 'Karachi & Lahore' : selectedLocation}) · Goal 100%
                  </p>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lifestyleParticipationData} margin={{ top: 24, right: 12, left: -12, bottom: 28 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" fontSize={10} fontWeight={600} interval={0} angle={-25} textAnchor="end" height={48} />
                    <YAxis fontSize={10} unit="%" />
                    <Tooltip formatter={(value: any) => [`${value}%`, 'Participation']} />
                    <ReferenceLine y={100} stroke="#10b981" strokeDasharray="4 4" />
                    <Bar dataKey="participation" name="Participation %" radius={[4, 4, 0, 0]}>
                      {lifestyleParticipationData.map((entry, index) => (
                        <Cell key={`ls-${index}`} fill={entry.participation >= 100 ? '#10b981' : '#1d4ed8'} />
                      ))}
                      <LabelList dataKey="participation" position="top" formatter={(v: any) => `${v}%`} style={{ fontSize: 10, fontWeight: 700, fill: '#0f172a' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className={`${selectedLocation === Location.MIRPUR ? 'lg:col-span-12' : 'lg:col-span-5'} bg-white p-6 border border-slate-200 rounded-xl`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Master Molty Foam — Section Participation
                </h3>
                <p className="text-xs text-slate-500">
                  {MOLTY_FOAM_DEPARTMENTS.length} Sections ({selectedLocation === 'All' ? 'Karachi, Lahore & Mirpur' : selectedLocation}) · Goal 100%
                </p>
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
              <p className="text-xs text-slate-500">Target: 100% (4 Kaizens / Month per Section)</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={
                  (user.role === 'ADMIN' ? selectedFactory : user.factory) === Factory.MASTER_MOLTY_FOAM
                    ? moltyParticipationData
                    : lifestyleParticipationData
                }
                margin={{ top: 24, right: 16, left: -10, bottom: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={10} fontWeight={600} interval={0} angle={-18} textAnchor="end" height={44} />
                <YAxis fontSize={10} unit="%" />
                <Tooltip formatter={(value: any) => [`${value}%`, 'Participation']} />
                <ReferenceLine y={100} stroke="#10b981" strokeDasharray="4 4" />
                <Bar dataKey="participation" name="Participation %" radius={[4, 4, 0, 0]} maxBarSize={56}>
                  {((user.role === 'ADMIN' ? selectedFactory : user.factory) === Factory.MASTER_MOLTY_FOAM
                    ? moltyParticipationData
                    : lifestyleParticipationData
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
            <span className="text-xs text-slate-500">Synced with Filters</span>
          </div>
          <div className="h-64">
            {monthlyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrendData} margin={{ top: 24, right: 16, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={11} fontWeight={600} />
                  <YAxis fontSize={10} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                  {user.role === 'ADMIN' && selectedFactory === 'All' ? (
                    <>
                      <Bar dataKey="lifestyle" name="Master Lifestyle" fill="#1d4ed8" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="lifestyle" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#1e3a8a' }} />
                      </Bar>
                      <Bar dataKey="molty" name="Molty Foam" fill="#0ea5e9" radius={[4, 4, 0, 0]}>
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

      {/* Top 3 Position Winners Spotlight */}
      {user.role === 'ADMIN' ? (
        <div className="bg-white p-6 border border-slate-200 rounded-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-600" />
                <span>Segregated Top 3 Positions & Finance Summary (Per Location & Factory)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                1st Position: +1,300 PKR · 2nd Position: +700 PKR · 3rd Position: +500 PKR (added on top of 200 PKR submission reward)
              </p>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('analytics')}
                className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
              >
                <span>Open Full Finance & Criteria Matrix</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {financeSummaries.map((fac) => (
              <div key={`${fac.location}-${fac.factory}`} className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div>
                    <p className="text-xs font-extrabold text-slate-900">{fac.location} · {fac.factory}</p>
                    <p className="text-[11px] text-slate-500 tabular-nums">
                      Base: {fac.basePoolTotal.toLocaleString()} PKR · Pos. Bonus: {fac.positionBonusTotal.toLocaleString()} PKR
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Payable</span>
                    <span className="text-sm font-extrabold text-emerald-700">{fac.grandTotalPayable.toLocaleString()} PKR</span>
                  </div>
                </div>

                {fac.winners.length > 0 ? (
                  <div className="space-y-1.5 text-xs">
                    {fac.winners.slice(0, 3).map((w) => (
                      <div key={w.id} className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span
                            className={`font-extrabold ${
                              w.position === 1 ? 'text-emerald-700' : w.position === 2 ? 'text-blue-700' : 'text-amber-700'
                            }`}
                          >
                            {w.positionLabel}
                          </span>
                          <span className="text-slate-300 mx-1.5">·</span>
                          <span className="font-mono font-bold text-slate-900">{w.id}</span>
                          <p className="text-[11px] text-slate-500 truncate">
                            {w.department} · {w.initiator} ({w.month})
                          </p>
                        </div>
                        <div className="text-right tabular-nums shrink-0">
                          <span className="font-extrabold text-slate-900 block">{w.totalReward.toLocaleString()} PKR</span>
                          <span className="text-[10px] text-slate-500">{w.evaluation?.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    No scored position winners yet for this facility.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        sectionPositionWinners.length > 0 && (
          <div className="bg-white p-6 border border-slate-200 rounded-xl space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-600" />
              <span>Section Position Achievements</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {sectionPositionWinners.map((w) => (
                <div key={w.id} className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/60 text-xs space-y-1">
                  <div className="flex justify-between font-extrabold">
                    <span className="text-emerald-800">{w.positionLabel}</span>
                    <span className="font-mono text-slate-900">{w.id}</span>
                  </div>
                  <p className="font-bold text-slate-900">{w.initiator} · {w.month}</p>
                  <p className="text-slate-600 tabular-nums">
                    Score: {w.evaluation?.percentage}% · Reward: {w.totalReward.toLocaleString()} PKR
                  </p>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Centralized Pakistan QR Code Card */}
      {user.role === 'DEPARTMENT' && (
        <DepartmentQrCard
          location={String(user.location)}
          factory={String(user.factory)}
          department={user.department}
        />
      )}

      {/* Centralized QR Poster Generator Modal */}
      {showQrModal && user.role === 'ADMIN' && (
        <QrPosterModal onClose={() => setShowQrModal(false)} />
      )}
    </div>
  );
};

export default Dashboard;

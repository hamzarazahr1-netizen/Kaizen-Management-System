import React, { useState, useMemo } from 'react';
import {
  User,
  Kaizen,
  KaizenStatus,
  MONTHS,
  KaizenType,
  KaizenImpact,
  Location,
  LOCATIONS,
  Factory,
  LOCATION_FACTORIES,
  KaizenCriteriaScores,
  RankedKaizen,
  getFactoriesForLocation,
  getDepartmentsForFactory,
  getShortFactoryName,
  isSuperAdmin,
  isLocationAdmin
} from '../types';
import {
  EVALUATION_CRITERIA,
  DEFAULT_CRITERIA_SCORES,
  calculateKaizenEvaluation,
  enrichKaizensWithRankings,
  getBaseKaizenReward
} from '../utils/kaizenScoring';
import { downloadSingleKaizenPdf, downloadPictorialKaizenBookletPdf } from '../utils/kaizenReportPdf';
import { exportKaizensWithPicturesExcel, exportRecordsCsv } from '../utils/excelExport';
import {
  FileDown,
  FileSpreadsheet,
  Search,
  Award,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Pencil,
  Upload,
  Trash2,
  Save
} from 'lucide-react';
import TrademarkStamp from './TrademarkStamp';

interface AdminEditDraft {
  location: Location;
  factory: Factory;
  department: string;
  initiator: string;
  type: KaizenType;
  month: string;
  presentationDate: string;
  problem: string;
  solution: string;
  challenges: string;
  impact: KaizenImpact;
  beforeImg: string;
  afterImg: string;
}

const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Image file too large. Please select an image under 5MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read selected image file.'));
    reader.onloadend = () => {
      const img = new Image();
      img.src = String(reader.result || '');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7).slice(0, 900000));
      };
      img.onerror = () =>
        reject(new Error('Unsupported or unreadable image format. Please choose a JPG or PNG photo.'));
    };
    reader.readAsDataURL(file);
  });
};

interface RecordsProps {
  user: User;
  kaizens: Kaizen[];
  onUpdate: (kaizen: Kaizen) => Promise<void> | void;
}

const Records: React.FC<RecordsProps> = ({ user, kaizens, onUpdate }) => {
  const userIsSuperAdmin = isSuperAdmin(user);
  const userIsLocationAdmin = isLocationAdmin(user);
  const rankedKaizens = useMemo(() => enrichKaizensWithRankings(kaizens), [kaizens]);

  const [locationFilter, setLocationFilter] = useState<'All' | Location>(
    userIsSuperAdmin ? 'All' : (user.location as Location)
  );
  const [factoryFilter, setFactoryFilter] = useState<'All' | Factory>(
    user.role === 'ADMIN' ? 'All' : (user.factory as Factory)
  );
  const [monthFilter, setMonthFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState(user.role === 'ADMIN' ? 'All' : user.department);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedKaizenId, setSelectedKaizenId] = useState<string | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState('');
  const [decisionMode, setDecisionMode] = useState<'NONE' | 'ACCEPT' | 'REJECT'>('NONE');
  const [criteriaDraft, setCriteriaDraft] = useState<KaizenCriteriaScores>(DEFAULT_CRITERIA_SCORES);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editDraft, setEditDraft] = useState<AdminEditDraft | null>(null);
  const [editError, setEditError] = useState('');
  const [editNotice, setEditNotice] = useState('');
  const [isSavingModal, setIsSavingModal] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingBooklet, setIsExportingBooklet] = useState(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  const selectedKaizen = useMemo(
    () => rankedKaizens.find((k) => k.id === selectedKaizenId) || null,
    [rankedKaizens, selectedKaizenId]
  );

  const availableFactories = useMemo(() => getFactoriesForLocation(locationFilter), [locationFilter]);
  const availableDepts = useMemo(() => {
    if (factoryFilter !== 'All') return getDepartmentsForFactory(factoryFilter);
    if (availableFactories.length === 1) return getDepartmentsForFactory(availableFactories[0]);
    return getDepartmentsForFactory('All');
  }, [factoryFilter, availableFactories]);

  const handleLocationFilterChange = (val: 'All' | Location) => {
    setLocationFilter(val);
    const allowedFactories = getFactoriesForLocation(val);
    if (factoryFilter !== 'All' && !allowedFactories.includes(factoryFilter)) {
      setFactoryFilter('All');
      setDeptFilter('All');
    }
  };

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
    const months = Array.from(new Set(rankedKaizens.map((k) => k.month)));
    return months.sort((a, b) => MONTHS.indexOf(a as string) - MONTHS.indexOf(b as string));
  }, [rankedKaizens]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rankedKaizens.filter((k) => {
      const lMatch = userIsSuperAdmin
        ? locationFilter === 'All' || k.location === locationFilter
        : k.location === user.location;
      const fMatch = user.role === 'ADMIN'
        ? factoryFilter === 'All' || k.factory === factoryFilter
        : k.factory === user.factory;
      const mMatch = monthFilter === 'All' || k.month === monthFilter;
      const sMatch = statusFilter === 'All' || k.status === statusFilter;
      const dMatch = user.role === 'ADMIN'
        ? deptFilter === 'All' || k.department === deptFilter
        : k.department === user.department;
      const qMatch =
        !q ||
        k.id.toLowerCase().includes(q) ||
        (k.initiator || '').toLowerCase().includes(q) ||
        (k.department || '').toLowerCase().includes(q) ||
        (k.problem || '').toLowerCase().includes(q);
      return lMatch && fMatch && mMatch && sMatch && dMatch && qMatch;
    });
  }, [rankedKaizens, locationFilter, factoryFilter, monthFilter, statusFilter, deptFilter, searchQuery, user]);

  const liveEvaluationPreview = useMemo(() => calculateKaizenEvaluation(criteriaDraft), [criteriaDraft]);

  const openModal = (k: RankedKaizen) => {
    setSelectedKaizenId(k.id);
    setFeedbackDraft(k.feedback || '');
    setCriteriaDraft(k.evaluation?.scores || DEFAULT_CRITERIA_SCORES);
    setIsEditingDetails(false);
    setEditError('');
    setEditNotice('');
    setEditDraft({
      location: k.location,
      factory: k.factory,
      department: k.department,
      initiator: k.initiator || '',
      type: k.type,
      month: k.month,
      presentationDate: k.presentationDate || '',
      problem: k.problem || '',
      solution: k.solution || '',
      challenges: k.challenges || '',
      impact: {
        costSaving: Boolean(k.impact?.costSaving),
        productivity: Boolean(k.impact?.productivity),
        quality: Boolean(k.impact?.quality),
        safety: Boolean(k.impact?.safety),
        delivery: Boolean(k.impact?.delivery)
      },
      beforeImg: k.beforeImg || '',
      afterImg: k.afterImg || ''
    });
    if (k.status === KaizenStatus.PENDING) {
      setDecisionMode('NONE');
    } else if (k.status === KaizenStatus.ACCEPTED) {
      setDecisionMode('ACCEPT');
    } else {
      setDecisionMode('REJECT');
    }
  };

  const buildEditedPayload = (base: RankedKaizen): Kaizen | null => {
    if (!editDraft) return base;
    const cleanProblem = editDraft.problem.trim().slice(0, 10000);
    const cleanSolution = editDraft.solution.trim().slice(0, 10000);
    const cleanInitiator = editDraft.initiator.trim().slice(0, 100);
    if (!cleanInitiator || !cleanProblem || !cleanSolution || !editDraft.department) {
      setEditError('Initiator, Section, Problem Statement, and Proposed Solution cannot be empty.');
      return null;
    }

    const safeLocation = userIsLocationAdmin ? (user.location as Location) : editDraft.location;
    const safeFactory =
      safeLocation === Location.MIRPUR ? Factory.MASTER_MOLTY_FOAM : editDraft.factory;

    return {
      ...base,
      location: safeLocation,
      factory: safeFactory,
      department: editDraft.department.slice(0, 100),
      initiator: cleanInitiator,
      type: editDraft.type,
      month: editDraft.month.slice(0, 30),
      presentationDate: editDraft.presentationDate.slice(0, 40),
      problem: cleanProblem,
      solution: cleanSolution,
      challenges: editDraft.challenges.trim().slice(0, 5000),
      impact: { ...editDraft.impact },
      beforeImg: editDraft.beforeImg.slice(0, 900000),
      afterImg: editDraft.afterImg.slice(0, 900000)
    };
  };

  const handleAdminPhotoChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    slot: 'beforeImg' | 'afterImg'
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editDraft) return;
    setEditError('');
    setEditNotice('');
    try {
      const compressed = await compressImageFile(file);
      setEditDraft((prev) => (prev ? { ...prev, [slot]: compressed } : prev));
      setEditNotice(
        `${slot === 'afterImg' ? 'After' : 'Before'} photo staged — click Save Edits or Confirm decision to apply.`
      );
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Unable to load image.');
    }
  };

  const handleSaveDetailsOnly = async () => {
    if (!selectedKaizen || isSavingModal) return;
    setEditError('');
    setEditNotice('');
    const merged = buildEditedPayload(selectedKaizen);
    if (!merged) return;

    setIsSavingModal(true);
    try {
      const recalculatedBase =
        merged.status === KaizenStatus.ACCEPTED
          ? getBaseKaizenReward({ status: KaizenStatus.ACCEPTED, type: merged.type })
          : 0;
      await onUpdate({
        ...merged,
        reward: recalculatedBase,
        feedback: feedbackDraft.trim().slice(0, 5000)
      });
      setIsEditingDetails(false);
      setEditNotice('Updated Kaizen details & photos saved to cloud.');
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setIsSavingModal(false);
    }
  };

  const handleSaveAcceptWithCriteria = async () => {
    if (!selectedKaizen || isSavingModal) return;
    setEditError('');
    const merged = buildEditedPayload(selectedKaizen);
    if (!merged) return;

    const evaluation = calculateKaizenEvaluation(criteriaDraft);
    const baseReward = getBaseKaizenReward({ status: KaizenStatus.ACCEPTED, type: merged.type });

    setIsSavingModal(true);
    try {
      await onUpdate({
        ...merged,
        status: KaizenStatus.ACCEPTED,
        reward: baseReward,
        feedback: feedbackDraft.trim().slice(0, 5000),
        evaluation
      });
      setSelectedKaizenId(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save acceptance.');
    } finally {
      setIsSavingModal(false);
    }
  };

  const handleReject = async () => {
    if (!selectedKaizen || isSavingModal) return;
    setEditError('');
    const merged = buildEditedPayload(selectedKaizen);
    if (!merged) return;

    const { evaluation: _removed, ...rest } = merged;
    setIsSavingModal(true);
    try {
      await onUpdate({
        ...(rest as Kaizen),
        status: KaizenStatus.REJECTED,
        reward: 0,
        feedback: feedbackDraft.trim().slice(0, 5000)
      });
      setSelectedKaizenId(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save rejection.');
    } finally {
      setIsSavingModal(false);
    }
  };

  const handleDownloadSinglePdf = async (k: RankedKaizen) => {
    setDownloadingPdfId(k.id);
    try {
      await downloadSingleKaizenPdf(k);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleExportExcelWithPhotos = async () => {
    if (filtered.length === 0) return;
    setIsExportingExcel(true);
    try {
      await exportKaizensWithPicturesExcel(
        filtered,
        rankedKaizens,
        monthFilter,
        userIsLocationAdmin ? `Master_${user.location}_Kaizen_Records` : 'Master_Kaizen_Pictorial_Records',
        userIsLocationAdmin ? (user.location as Location) : 'ALL'
      );
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportBooklet = async () => {
    if (filtered.length === 0) return;
    setIsExportingBooklet(true);
    try {
      await downloadPictorialKaizenBookletPdf(filtered, 'Master_Kaizen_OnePager_Booklet');
    } finally {
      setIsExportingBooklet(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter & Export Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
        <div className="flex flex-wrap gap-3 items-end justify-between">
          <div className="flex flex-wrap gap-3 items-end">
            {user.role === 'ADMIN' && (
              <>
                {userIsSuperAdmin ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Location</label>
                    <select
                      value={locationFilter}
                      onChange={(e) => handleLocationFilterChange(e.target.value as 'All' | Location)}
                      className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
                    >
                      <option value="All">All Locations (3)</option>
                      {LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Location Scope</label>
                    <div className="px-3.5 py-2 border border-blue-200 rounded-lg text-xs font-bold bg-blue-50 text-blue-800">
                      {user.location} Only
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Factory</label>
                  <select
                    value={factoryFilter}
                    onChange={(e) => handleFactoryFilterChange(e.target.value as 'All' | Factory)}
                    className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
                  >
                    <option value="All">
                      {userIsLocationAdmin ? `All ${user.location} Factories` : 'All Factories'}
                    </option>
                    {availableFactories.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Section</label>
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
                  >
                    <option value="All">All Sections ({availableDepts.length})</option>
                    {availableDepts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Month</label>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
              >
                <option value="All">All Active Months</option>
                {activeMonthsInRecords.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50 text-slate-900 outline-none focus:border-blue-600"
              >
                <option value="All">All Statuses</option>
                {Object.values(KaizenStatus).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Search ID / Initiator</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. K-LS-CH..."
                  className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-900 outline-none focus:border-blue-600 focus:bg-white w-44"
                />
              </div>
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-500 tabular-nums">
            Showing {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Export filtered Kaizens with embedded Before/After photographs or generate printable one-pager PDF reports.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportExcelWithPhotos}
              disabled={isExportingExcel || filtered.length === 0}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isExportingExcel ? 'Building Excel w/ Photos...' : 'Export Excel w/ Pictures (.xlsx)'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportBooklet}
              disabled={isExportingBooklet || filtered.length === 0}
              className="px-3.5 py-2 bg-slate-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExportingBooklet ? 'Creating PDF Booklet...' : 'Export Pictorial PDF Booklet'}</span>
            </button>

            <button
              type="button"
              onClick={() => exportRecordsCsv(filtered)}
              disabled={filtered.length === 0}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[1040px]">
          <thead className="bg-slate-900 text-white text-xs font-bold">
            <tr>
              <th className="px-4 py-3.5">Kaizen ID</th>
              <th className="px-4 py-3.5">Date & Period</th>
              {user.role === 'ADMIN' && <th className="px-4 py-3.5">Location · Factory</th>}
              <th className="px-4 py-3.5">Section</th>
              <th className="px-4 py-3.5">Initiator</th>
              <th className="px-4 py-3.5">Type & Photos</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Criteria Score & Position</th>
              <th className="px-4 py-3.5 text-right">Reward (PKR)</th>
              <th className="px-4 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filtered.map((k) => (
              <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                  {k.id}
                </td>
                <td className="px-4 py-3.5 text-slate-500 tabular-nums whitespace-nowrap">
                  {k.submissionDate} <span className="text-slate-300">·</span> {k.month}
                </td>
                {user.role === 'ADMIN' && (
                  <td className="px-4 py-3.5 font-semibold text-slate-700 whitespace-nowrap">
                    {k.location} <span className="text-slate-300">·</span> {getShortFactoryName(k.factory)}
                  </td>
                )}
                <td className="px-4 py-3.5 font-bold text-slate-900">{k.department}</td>
                <td className="px-4 py-3.5 font-semibold text-blue-700">{k.initiator}</td>
                <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                  <span>{k.type}</span>
                  {(k.beforeImg || k.afterImg) && (
                    <span className="inline-flex items-center gap-1 ml-2 text-[11px] text-slate-400">
                      <ImageIcon className="w-3 h-3" />
                      {(k.beforeImg ? 1 : 0) + (k.afterImg ? 1 : 0)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <span
                    className={`font-bold ${
                      k.status === KaizenStatus.ACCEPTED
                        ? 'text-emerald-700'
                        : k.status === KaizenStatus.REJECTED
                          ? 'text-red-700'
                          : 'text-amber-600'
                    }`}
                  >
                    {k.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 tabular-nums whitespace-nowrap">
                  {k.evaluation ? (
                    <div>
                      <span className="font-bold text-slate-900">
                        {k.evaluation.aggregateScore.toFixed(2)} ({k.evaluation.percentage}%)
                      </span>
                      <span
                        className={`block text-[11px] font-bold ${
                          k.position === 1
                            ? 'text-emerald-700'
                            : k.position === 2
                              ? 'text-blue-700'
                              : k.position === 3
                                ? 'text-amber-700'
                                : 'text-slate-400'
                        }`}
                      >
                        {k.positionLabel}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">
                      {k.status === KaizenStatus.ACCEPTED ? 'Awaiting Scoring' : '—'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right font-bold tabular-nums whitespace-nowrap">
                  <span className="text-slate-900">{k.totalReward.toLocaleString()}</span>
                  {k.positionBonus > 0 && (
                    <span className="block text-[10px] text-emerald-700 font-semibold">
                      {k.baseReward} + {k.positionBonus} Pos.
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openModal(k)}
                      className="text-white bg-slate-900 hover:bg-blue-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    >
                      {user.role === 'ADMIN' && k.status === KaizenStatus.PENDING ? 'Review' : 'View'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadSinglePdf(k)}
                      disabled={downloadingPdfId === k.id}
                      title="Download One-Pager PDF Report"
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>{downloadingPdfId === k.id ? '...' : 'PDF'}</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={user.role === 'ADMIN' ? 10 : 9} className="px-6 py-16 text-center text-slate-400 text-xs font-semibold">
                  No Kaizen records found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Review, Judgment Criteria & Report Modal */}
      {selectedKaizen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto border border-slate-200">
            <div className="p-5 sm:p-6 border-b border-slate-800 flex flex-wrap justify-between items-center gap-4 bg-slate-900 text-white sticky top-0 z-10">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-extrabold text-blue-300">{selectedKaizen.id}</span>
                  <span className="text-slate-500" aria-hidden="true">·</span>
                  <h3 className="text-sm font-bold">{selectedKaizen.type} Kaizen Report</h3>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {selectedKaizen.location} · {selectedKaizen.factory} · {selectedKaizen.department} · Initiator:{' '}
                  <span className="text-blue-300 font-semibold">{selectedKaizen.initiator}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {user.role === 'ADMIN' && editDraft && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingDetails((prev) => !prev);
                      setEditError('');
                    }}
                    className={`text-xs font-bold px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                      isEditingDetails
                        ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                    }`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{isEditingDetails ? 'Done Editing Text' : 'Edit Details & Photos'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDownloadSinglePdf(selectedKaizen)}
                  disabled={downloadingPdfId === selectedKaizen.id}
                  className="bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>{downloadingPdfId === selectedKaizen.id ? 'Generating...' : 'Download 1-Page PDF'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedKaizenId(null)}
                  className="text-white hover:bg-slate-800 text-xs font-bold border border-slate-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-7">
              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs font-semibold">
                  {editError}
                </div>
              )}
              {editNotice && !editError && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-xs font-semibold flex flex-wrap items-center justify-between gap-2">
                  <span>{editNotice}</span>
                  {user.role === 'ADMIN' && (
                    <button
                      type="button"
                      onClick={handleSaveDetailsOnly}
                      disabled={isSavingModal}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-bold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingModal ? 'Saving...' : 'Save Changes Now'}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Admin Inline Metadata Editor (when Edit mode is active) */}
              {user.role === 'ADMIN' && isEditingDetails && editDraft && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        Admin Kaizen Correction & Metadata Editor
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Correct facility, section, initiator, workflow type, descriptions, or attach missing Before/After photos.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveDetailsOnly}
                      disabled={isSavingModal}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-60"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingModal ? 'Saving...' : 'Save Edits Only'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Location {userIsLocationAdmin ? '(Locked)' : ''}
                      </label>
                      <select
                        value={editDraft.location}
                        disabled={userIsLocationAdmin}
                        onChange={(e) => {
                          if (userIsLocationAdmin) return;
                          const loc = e.target.value as Location;
                          const allowedFacs = LOCATION_FACTORIES[loc];
                          const nextFac = allowedFacs.includes(editDraft.factory)
                            ? editDraft.factory
                            : allowedFacs[0];
                          const allowedDepts = getDepartmentsForFactory(nextFac);
                          const nextDept = allowedDepts.includes(editDraft.department)
                            ? editDraft.department
                            : allowedDepts[0];
                          setEditDraft({
                            ...editDraft,
                            location: loc,
                            factory: nextFac,
                            department: nextDept
                          });
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-900 outline-none focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        {LOCATIONS.map((loc) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Factory</label>
                      <select
                        value={editDraft.factory}
                        onChange={(e) => {
                          const fac = e.target.value as Factory;
                          const allowedDepts = getDepartmentsForFactory(fac);
                          const nextDept = allowedDepts.includes(editDraft.department)
                            ? editDraft.department
                            : allowedDepts[0];
                          setEditDraft({ ...editDraft, factory: fac, department: nextDept });
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-900 outline-none focus:border-blue-600"
                      >
                        {LOCATION_FACTORIES[editDraft.location].map((fac) => (
                          <option key={fac} value={fac}>{fac}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Section</label>
                      <select
                        value={editDraft.department}
                        onChange={(e) => setEditDraft({ ...editDraft, department: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-900 outline-none focus:border-blue-600"
                      >
                        {getDepartmentsForFactory(editDraft.factory).map((sec) => (
                          <option key={sec} value={sec}>{sec}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Initiator Name</label>
                      <input
                        type="text"
                        maxLength={100}
                        value={editDraft.initiator}
                        onChange={(e) => setEditDraft({ ...editDraft, initiator: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Workflow Type</label>
                      <select
                        value={editDraft.type}
                        onChange={(e) => setEditDraft({ ...editDraft, type: e.target.value as KaizenType })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-900 outline-none focus:border-blue-600"
                      >
                        <option value={KaizenType.IMPLEMENTED}>Implemented (200 PKR Base + Position)</option>
                        <option value={KaizenType.IDEA}>Idea (50 PKR Base)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Recording Period</label>
                      <select
                        value={editDraft.month}
                        onChange={(e) => setEditDraft({ ...editDraft, month: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-900 outline-none focus:border-blue-600"
                      >
                        {MONTHS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-2">Problem Statement</h4>
                  {user.role === 'ADMIN' && isEditingDetails && editDraft ? (
                    <textarea
                      maxLength={10000}
                      value={editDraft.problem}
                      onChange={(e) => setEditDraft({ ...editDraft, problem: e.target.value })}
                      className="w-full text-slate-900 text-sm leading-relaxed bg-white p-3.5 rounded-lg border border-blue-300 h-32 focus:ring-1 focus:ring-blue-600 outline-none resize-y"
                      placeholder="Edit or correct problem description..."
                    />
                  ) : (
                    <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200 whitespace-pre-wrap">
                      {editDraft && user.role === 'ADMIN' ? editDraft.problem : selectedKaizen.problem}
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-2">Proposed Solution</h4>
                  {user.role === 'ADMIN' && isEditingDetails && editDraft ? (
                    <textarea
                      maxLength={10000}
                      value={editDraft.solution}
                      onChange={(e) => setEditDraft({ ...editDraft, solution: e.target.value })}
                      className="w-full text-slate-900 text-sm leading-relaxed bg-white p-3.5 rounded-lg border border-blue-300 h-32 focus:ring-1 focus:ring-blue-600 outline-none resize-y"
                      placeholder="Edit or correct proposed/applied solution..."
                    />
                  ) : (
                    <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200 whitespace-pre-wrap">
                      {editDraft && user.role === 'ADMIN' ? editDraft.solution : selectedKaizen.solution}
                    </p>
                  )}
                </div>
              </div>

              {(selectedKaizen.challenges || (user.role === 'ADMIN' && isEditingDetails)) && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-2">Operational Challenges</h4>
                  {user.role === 'ADMIN' && isEditingDetails && editDraft ? (
                    <textarea
                      maxLength={5000}
                      value={editDraft.challenges}
                      onChange={(e) => setEditDraft({ ...editDraft, challenges: e.target.value })}
                      className="w-full text-slate-900 text-sm leading-relaxed bg-white p-3.5 rounded-lg border border-blue-300 h-24 focus:ring-1 focus:ring-blue-600 outline-none resize-y"
                      placeholder="Optional challenges encountered..."
                    />
                  ) : (
                    <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200 whitespace-pre-wrap">
                      {editDraft && user.role === 'ADMIN' ? editDraft.challenges : selectedKaizen.challenges}
                    </p>
                  )}
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-2">Strategic Impact</h4>
                {user.role === 'ADMIN' && isEditingDetails && editDraft ? (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {(Object.keys(editDraft.impact) as Array<keyof KaizenImpact>).map((key) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 text-xs font-semibold text-slate-800"
                      >
                        <input
                          type="checkbox"
                          checked={editDraft.impact[key]}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              impact: { ...editDraft.impact, [key]: e.target.checked }
                            })
                          }
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="capitalize">{key.replace('Saving', ' Saving')}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-slate-700">
                    {Object.entries((editDraft && user.role === 'ADMIN' ? editDraft.impact : selectedKaizen.impact) || {})
                      .filter(([, value]) => Boolean(value))
                      .map(([key]) => key.replace('Saving', ' Saving').replace(/^\w/, (c) => c.toUpperCase()))
                      .join(' · ') || 'General Process Improvement'}
                  </p>
                )}
              </div>

              {(user.role === 'ADMIN' || selectedKaizen.beforeImg || selectedKaizen.afterImg) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(user.role === 'ADMIN' || selectedKaizen.beforeImg) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-600">Baseline Photograph (Before)</p>
                        {user.role === 'ADMIN' && editDraft && (
                          <div className="flex items-center gap-1.5">
                            <label className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-[11px] font-bold cursor-pointer flex items-center gap-1">
                              <Upload className="w-3 h-3" />
                              <span>{editDraft.beforeImg ? 'Replace' : 'Add Before Photo'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleAdminPhotoChange(e, 'beforeImg')}
                                className="hidden"
                              />
                            </label>
                            {editDraft.beforeImg && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditDraft({ ...editDraft, beforeImg: '' });
                                  setEditNotice('Before photo removed — click Save Changes or Confirm decision to apply.');
                                }}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Remove Before Photo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {(user.role === 'ADMIN' && editDraft ? editDraft.beforeImg : selectedKaizen.beforeImg) ? (
                        <img
                          src={user.role === 'ADMIN' && editDraft ? editDraft.beforeImg : selectedKaizen.beforeImg}
                          alt="Before optimization"
                          className="w-full h-64 object-cover rounded-lg border border-slate-200"
                        />
                      ) : (
                        <div className="w-full h-44 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-xs text-slate-400">
                          <ImageIcon className="w-6 h-6 mb-1.5 text-slate-300" />
                          <span>No Before photo uploaded</span>
                        </div>
                      )}
                    </div>
                  )}

                  {(user.role === 'ADMIN' || selectedKaizen.afterImg) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-600">Optimized Photograph (After)</p>
                        {user.role === 'ADMIN' && editDraft && (
                          <div className="flex items-center gap-1.5">
                            <label className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded text-[11px] font-bold cursor-pointer flex items-center gap-1">
                              <Upload className="w-3 h-3" />
                              <span>{editDraft.afterImg ? 'Replace' : 'Add After Photo'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleAdminPhotoChange(e, 'afterImg')}
                                className="hidden"
                              />
                            </label>
                            {editDraft.afterImg && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditDraft({ ...editDraft, afterImg: '' });
                                  setEditNotice('After photo removed — click Save Changes or Confirm decision to apply.');
                                }}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Remove After Photo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {(user.role === 'ADMIN' && editDraft ? editDraft.afterImg : selectedKaizen.afterImg) ? (
                        <img
                          src={user.role === 'ADMIN' && editDraft ? editDraft.afterImg : selectedKaizen.afterImg}
                          alt="After optimization"
                          className="w-full h-64 object-cover rounded-lg border border-slate-200"
                        />
                      ) : (
                        <div className="w-full h-44 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-xs text-slate-400">
                          <ImageIcon className="w-6 h-6 mb-1.5 text-slate-300" />
                          <span>No After photo attached yet — click Add After Photo above</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Read-only Criteria Score Display for Department Users or Already-Accepted Summary */}
              {selectedKaizen.evaluation && user.role !== 'ADMIN' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">Kaizen Committee Evaluation Criteria</h4>
                      <p className="text-xs text-slate-500">Weighted 1–3 Rating Assessment</p>
                    </div>
                    <div className="text-right tabular-nums">
                      <span className="text-lg font-extrabold text-blue-700">
                        {selectedKaizen.evaluation.aggregateScore.toFixed(2)} / 3.00 ({selectedKaizen.evaluation.percentage}%)
                      </span>
                      <span className="block text-xs font-bold text-emerald-700">{selectedKaizen.positionLabel}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {EVALUATION_CRITERIA.map((c) => {
                      const val = selectedKaizen.evaluation?.scores[c.key] ?? 1;
                      return (
                        <div key={c.key} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center gap-3">
                          <div>
                            <p className="font-bold text-slate-900">{c.label} ({c.weightPct}%)</p>
                            <p className="text-[11px] text-slate-500">{c.guide[val]}</p>
                          </div>
                          <span className="text-sm font-extrabold text-slate-900 tabular-nums shrink-0">{val}/3</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Management Decision & Judgment Criteria Scoring Portal */}
              {user.role === 'ADMIN' ? (
                <div className="bg-slate-900 p-6 md:p-7 rounded-xl space-y-5 text-white">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <h4 className="text-sm font-bold">Kaizen Committee Decision & Judgment Portal</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Select Accepted to mark the 7-criteria evaluation rubric and compute factory ranking (1st +1,300 · 2nd +700 · 3rd +500 PKR).
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDecisionMode('ACCEPT')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                          decisionMode === 'ACCEPT'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Accept & Score</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDecisionMode('REJECT')}
                        className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                          decisionMode === 'REJECT'
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>

                  {decisionMode === 'ACCEPT' && (
                    <div className="bg-white text-slate-900 rounded-xl p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                        <div>
                          <h5 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                            <Award className="w-4 h-4 text-blue-700" />
                            <span>Evaluation Criterion (Rating 1 – 3)</span>
                          </h5>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Top 3 highest scores in {editDraft?.location || selectedKaizen.location} · {editDraft?.factory || selectedKaizen.factory} ({editDraft?.month || selectedKaizen.month}) automatically win 1st, 2nd & 3rd positions.
                          </p>
                        </div>

                        <div className="text-right tabular-nums">
                          <p className="text-xs text-slate-500 font-semibold">Live Weighted Score</p>
                          <p className="text-xl font-extrabold text-blue-700">
                            {liveEvaluationPreview.aggregateScore.toFixed(2)} <span className="text-sm text-slate-500">/ 3.00</span>{' '}
                            <span className="text-emerald-700">({liveEvaluationPreview.percentage}%)</span>
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {EVALUATION_CRITERIA.map((criterion, idx) => {
                          const currentVal = criteriaDraft[criterion.key];
                          return (
                            <div
                              key={criterion.key}
                              className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <span className="text-xs font-extrabold text-slate-900">
                                    {idx + 1}. {criterion.label}
                                  </span>
                                  <span className="ml-2 text-[11px] font-bold text-blue-700 tabular-nums">
                                    Weight: {criterion.weightPct}%
                                  </span>
                                  <p className="text-[11px] text-slate-500 mt-0.5">{criterion.description}</p>
                                </div>
                                <span className="text-xs font-extrabold text-slate-900 tabular-nums">
                                  Selected: {currentVal} / 3
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {([1, 2, 3] as const).map((rating) => {
                                  const isSelected = currentVal === rating;
                                  return (
                                    <button
                                      key={rating}
                                      type="button"
                                      onClick={() =>
                                        setCriteriaDraft((prev) => ({ ...prev, [criterion.key]: rating }))
                                      }
                                      className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                                        isSelected
                                          ? rating === 3
                                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-600'
                                            : rating === 2
                                              ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-600'
                                              : 'border-amber-600 bg-amber-50 text-amber-900 font-bold ring-1 ring-amber-600'
                                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                      }`}
                                    >
                                      {criterion.guide[rating]}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Management Feedback & Remarks
                    </label>
                    <textarea
                      value={feedbackDraft}
                      onChange={(e) => setFeedbackDraft(e.target.value)}
                      className="w-full p-3.5 border border-slate-700 bg-slate-800 text-white rounded-lg text-xs h-20 focus:border-blue-500 outline-none resize-none"
                      placeholder="Enter official committee remarks..."
                    />
                  </div>

                  {decisionMode === 'ACCEPT' && (
                    <button
                      type="button"
                      onClick={handleSaveAcceptWithCriteria}
                      disabled={isSavingModal}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider py-3.5 px-4 rounded-lg transition-colors disabled:opacity-60"
                    >
                      {isSavingModal
                        ? 'Saving Evaluation & Edits...'
                        : `Confirm Accepted & Save Criteria Score (${(editDraft?.type || selectedKaizen.type) === KaizenType.IDEA ? '50' : '200'} PKR Base + Position Eligible)`}
                    </button>
                  )}

                  {decisionMode === 'REJECT' && (
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={isSavingModal}
                      className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider py-3.5 px-4 rounded-lg transition-colors disabled:opacity-60"
                    >
                      {isSavingModal ? 'Saving Rejection & Edits...' : 'Confirm Reject Proposal (0 PKR)'}
                    </button>
                  )}

                  {decisionMode === 'NONE' && (
                    <p className="text-xs text-slate-400 text-center">
                      Choose <strong>Accept & Score</strong> or <strong>Reject</strong> above to submit your decision.
                    </p>
                  )}
                </div>
              ) : (
                <div
                  className={`p-6 rounded-xl border ${
                    selectedKaizen.status === KaizenStatus.ACCEPTED
                      ? 'bg-emerald-50 border-emerald-200'
                      : selectedKaizen.status === KaizenStatus.REJECTED
                        ? 'bg-red-50 border-red-200'
                        : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-bold text-slate-900">Official Decision Summary</h4>
                    <span className="text-sm font-extrabold text-slate-900">
                      {selectedKaizen.status} {selectedKaizen.position ? `· ${selectedKaizen.positionLabel}` : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Total Assessed Reward</p>
                  <p className="text-xl font-extrabold text-slate-900 tabular-nums mt-0.5">
                    {selectedKaizen.totalReward.toLocaleString()} PKR{' '}
                    {selectedKaizen.positionBonus > 0 && (
                      <span className="text-xs font-semibold text-emerald-700">
                        ({selectedKaizen.baseReward} Base + {selectedKaizen.positionBonus.toLocaleString()} {selectedKaizen.positionLabel} Bonus)
                      </span>
                    )}
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

      <div className="pt-2">
        <TrademarkStamp />
      </div>
    </div>
  );
};

export default Records;

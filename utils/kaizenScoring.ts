import { collection, getDocs, query, where, Firestore } from 'firebase/firestore';
import {
  ALL_FACILITIES,
  FACTORY_CODES,
  Factory,
  Kaizen,
  KaizenCriteriaScores,
  KaizenEvaluation,
  KaizenStatus,
  KaizenType,
  LOCATION_CODES,
  Location,
  RankedKaizen,
  getSectionCode
} from '../types';

export interface CriterionDefinition {
  key: keyof KaizenCriteriaScores;
  label: string;
  shortLabel: string;
  weight: number; // e.g. 0.15
  weightPct: number; // e.g. 15
  description: string;
  guide: {
    1: string;
    2: string;
    3: string;
  };
}

export const EVALUATION_CRITERIA: CriterionDefinition[] = [
  {
    key: 'problemIdentification',
    label: 'Problem Identification & Target Setting',
    shortLabel: 'Problem & Target',
    weight: 0.15,
    weightPct: 15,
    description: 'How clearly the problem was defined, and target setting according to SMART criteria',
    guide: {
      1: '1 = Not Defined',
      2: '2 = Vaguely defined',
      3: '3 = Clearly defined with data'
    }
  },
  {
    key: 'rootCauseAnalysis',
    label: 'Root Cause Analysis',
    shortLabel: 'Root Cause',
    weight: 0.20,
    weightPct: 20,
    description: 'Problem is clearly understood and root cause is identified using QC tools',
    guide: {
      1: '1 = Incorrect root cause identification',
      2: '2 = Root cause identified but no visualization using tools',
      3: '3 = Clear logical cause identified with tools usage'
    }
  },
  {
    key: 'creativityInnovation',
    label: 'Creativity / Innovation',
    shortLabel: 'Creativity',
    weight: 0.10,
    weightPct: 10,
    description: 'Uniqueness and simplicity of the idea',
    guide: {
      1: '1 = Common idea',
      2: '2 = Idea adapted from somewhere',
      3: '3 = Innovative / self developed'
    }
  },
  {
    key: 'impactOnResults',
    label: 'Impact on Results (Before vs. After)',
    shortLabel: 'Impact (Results)',
    weight: 0.25,
    weightPct: 25,
    description: 'Measurable KPI improvement',
    guide: {
      1: '1 = Low impact',
      2: '2 = 1 KPI measurable improvement',
      3: '3 = Multi KPI measurable improvements'
    }
  },
  {
    key: 'sustainability',
    label: 'Sustainability / Standardization',
    shortLabel: 'Sustainability',
    weight: 0.10,
    weightPct: 10,
    description: 'How well the change is standardized and sustained (updated SOP, visualized, training done)',
    guide: {
      1: '1 = Temporary fix',
      2: '2 = Kaizen implemented but documents not updated',
      3: '3 = Fully standardized with documents updated'
    }
  },
  {
    key: 'employeeInvolvement',
    label: 'Employee Involvement',
    shortLabel: 'Involvement',
    weight: 0.10,
    weightPct: 10,
    description: 'Involvement of operators & cross-functional teamwork',
    guide: {
      1: '1 = Only 1 department involvement',
      2: '2 = Department collaboration',
      3: '3 = Multi department collaboration'
    }
  },
  {
    key: 'abilityToYokoten',
    label: 'Ability to Yokoten',
    shortLabel: 'Yokoten',
    weight: 0.10,
    weightPct: 10,
    description: 'Possibility of kaizen to yokoten to other areas',
    guide: {
      1: '1 = Cannot yokoten',
      2: '2 = Yokoten essence',
      3: '3 = Possible yokoten'
    }
  }
];

export const DEFAULT_CRITERIA_SCORES: KaizenCriteriaScores = {
  problemIdentification: 2,
  rootCauseAnalysis: 2,
  creativityInnovation: 2,
  impactOnResults: 2,
  sustainability: 2,
  employeeInvolvement: 2,
  abilityToYokoten: 2
};

export const POSITION_BONUSES: Record<1 | 2 | 3, number> = {
  1: 1300,
  2: 700,
  3: 500
};

export function calculateKaizenEvaluation(scores: KaizenCriteriaScores): KaizenEvaluation {
  const weightedSum = EVALUATION_CRITERIA.reduce((sum, criterion) => {
    const val = scores[criterion.key] ?? 1;
    return sum + val * criterion.weight;
  }, 0);

  const aggregateScore = Math.round(weightedSum * 100) / 100;
  const percentage = Math.round((weightedSum / 3) * 100);

  return {
    scores: { ...scores },
    aggregateScore,
    percentage,
    evaluatedAt: new Date().toISOString()
  };
}

export function getMonthYYMM(monthStr: string): string {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const parts = (monthStr || '').trim().split(/\s+/);
  if (parts.length === 2) {
    const mIdx = monthNames.findIndex(m => m.toLowerCase() === parts[0].toLowerCase());
    const yr = parts[1].replace(/[^0-9]/g, '').slice(-2).padStart(2, '0');
    if (mIdx >= 0 && yr.length === 2) {
      return `${yr}${String(mIdx + 1).padStart(2, '0')}`;
    }
  }
  const now = new Date();
  return `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function buildKaizenIdPrefix(
  location: Location,
  factory: Factory,
  department: string,
  month: string
): string {
  const locCode = LOCATION_CODES[location] || 'K';
  const facCode = FACTORY_CODES[factory] || 'LS';
  const secCode = getSectionCode(department);
  const yymm = getMonthYYMM(month);
  return `${locCode}-${facCode}-${secCode}-${yymm}`;
}

export async function generateNextKaizenId(
  db: Firestore,
  location: Location,
  factory: Factory,
  department: string,
  month: string
): Promise<string> {
  const prefix = buildKaizenIdPrefix(location, factory, department, month);

  try {
    const q = query(
      collection(db, 'kaizens'),
      where('id', '>=', prefix),
      where('id', '<=', `${prefix}\uf8ff`)
    );
    const snap = await getDocs(q);
    let maxSeq = 0;

    snap.docs.forEach((d) => {
      const docId = d.id || '';
      if (docId.startsWith(prefix)) {
        const suffix = docId.slice(prefix.length);
        const num = parseInt(suffix, 10);
        if (!Number.isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });

    return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
  } catch {
    // Fallback unique suffix if offline/query unavailable
    const rand = String(Math.floor(Math.random() * 900) + 100);
    return `${prefix}${rand}`;
  }
}

export function getBaseKaizenReward(k: Pick<Kaizen, 'status' | 'type'>): number {
  if (k.status !== KaizenStatus.ACCEPTED) return 0;
  return k.type === KaizenType.IDEA ? 50 : 200;
}

export function enrichKaizensWithRankings(kaizens: Kaizen[]): RankedKaizen[] {
  // Group Accepted & Evaluated Kaizens per Location + Factory + Month
  const groups = new Map<string, Kaizen[]>();

  for (const k of kaizens) {
    if (
      k.status === KaizenStatus.ACCEPTED &&
      k.evaluation &&
      typeof k.evaluation.aggregateScore === 'number' &&
      k.evaluation.aggregateScore > 0
    ) {
      const groupKey = `${k.location}::${k.factory}::${k.month}`;
      const list = groups.get(groupKey) || [];
      list.push(k);
      groups.set(groupKey, list);
    }
  }

  const rankById = new Map<string, 1 | 2 | 3>();

  groups.forEach((groupList) => {
    const sorted = [...groupList].sort((a, b) => {
      const scoreDiff = (b.evaluation?.aggregateScore || 0) - (a.evaluation?.aggregateScore || 0);
      if (Math.abs(scoreDiff) > 0.0001) return scoreDiff;

      const impactDiff =
        (b.evaluation?.scores?.impactOnResults || 0) - (a.evaluation?.scores?.impactOnResults || 0);
      if (impactDiff !== 0) return impactDiff;

      const rootCauseDiff =
        (b.evaluation?.scores?.rootCauseAnalysis || 0) - (a.evaluation?.scores?.rootCauseAnalysis || 0);
      if (rootCauseDiff !== 0) return rootCauseDiff;

      const implDiff =
        (b.type === KaizenType.IMPLEMENTED ? 1 : 0) - (a.type === KaizenType.IMPLEMENTED ? 1 : 0);
      if (implDiff !== 0) return implDiff;

      return a.id.localeCompare(b.id);
    });

    if (sorted[0]) rankById.set(sorted[0].id, 1);
    if (sorted[1]) rankById.set(sorted[1].id, 2);
    if (sorted[2]) rankById.set(sorted[2].id, 3);
  });

  return kaizens.map((k) => {
    const baseReward = getBaseKaizenReward(k);
    const pos = rankById.get(k.id) || null;
    const positionBonus = pos ? POSITION_BONUSES[pos] : 0;
    const positionLabel =
      pos === 1
        ? '1st Position'
        : pos === 2
          ? '2nd Position'
          : pos === 3
            ? '3rd Position'
            : k.status === KaizenStatus.ACCEPTED && k.evaluation
              ? 'Better luck next time!'
              : k.status === KaizenStatus.ACCEPTED
                ? 'Awaiting Scoring'
                : '—';

    return {
      ...k,
      baseReward,
      position: pos,
      positionLabel,
      positionBonus,
      totalReward: baseReward + positionBonus
    };
  });
}

export interface FacilityFinanceSummary {
  location: Location;
  factory: Factory;
  label: string;
  shortLabel: string;
  totalSubmitted: number;
  pendingCount: number;
  rejectedCount: number;
  acceptedIdeasCount: number;
  acceptedImplCount: number;
  ideasBasePool: number;
  implBasePool: number;
  basePoolTotal: number;
  positionBonusTotal: number;
  grandTotalPayable: number;
  winners: RankedKaizen[];
  firstPlaceCount: number;
  secondPlaceCount: number;
  thirdPlaceCount: number;
}

export function computeFacilityFinanceSummaries(
  allRankedKaizens: RankedKaizen[],
  monthFilter: string = 'All'
): FacilityFinanceSummary[] {
  return ALL_FACILITIES.map((fac) => {
    const items = allRankedKaizens.filter(
      (k) =>
        k.location === fac.location &&
        k.factory === fac.factory &&
        (monthFilter === 'All' || k.month === monthFilter)
    );

    const acceptedIdeasCount = items.filter(
      (k) => k.status === KaizenStatus.ACCEPTED && k.type === KaizenType.IDEA
    ).length;
    const acceptedImplCount = items.filter(
      (k) => k.status === KaizenStatus.ACCEPTED && k.type === KaizenType.IMPLEMENTED
    ).length;
    const pendingCount = items.filter((k) => k.status === KaizenStatus.PENDING).length;
    const rejectedCount = items.filter((k) => k.status === KaizenStatus.REJECTED).length;

    const ideasBasePool = acceptedIdeasCount * 50;
    const implBasePool = acceptedImplCount * 200;
    const basePoolTotal = ideasBasePool + implBasePool;

    const winners = items
      .filter((k) => k.position !== null)
      .sort((a, b) => {
        if (a.month !== b.month) return b.month.localeCompare(a.month);
        return (a.position || 99) - (b.position || 99);
      });

    const positionBonusTotal = winners.reduce((s, w) => s + w.positionBonus, 0);

    return {
      location: fac.location,
      factory: fac.factory,
      label: fac.label,
      shortLabel: fac.shortLabel,
      totalSubmitted: items.length,
      pendingCount,
      rejectedCount,
      acceptedIdeasCount,
      acceptedImplCount,
      ideasBasePool,
      implBasePool,
      basePoolTotal,
      positionBonusTotal,
      grandTotalPayable: basePoolTotal + positionBonusTotal,
      winners,
      firstPlaceCount: winners.filter((w) => w.position === 1).length,
      secondPlaceCount: winners.filter((w) => w.position === 2).length,
      thirdPlaceCount: winners.filter((w) => w.position === 3).length
    };
  });
}

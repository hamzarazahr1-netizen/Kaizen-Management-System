export enum Location {
  KARACHI = 'Karachi',
  LAHORE = 'Lahore',
  MIRPUR = 'Mirpur'
}

export const LOCATIONS: Location[] = [Location.KARACHI, Location.LAHORE, Location.MIRPUR];

export const LOCATION_CODES: Record<Location, string> = {
  [Location.KARACHI]: 'K',
  [Location.LAHORE]: 'L',
  [Location.MIRPUR]: 'M'
};

export enum Factory {
  MASTER_LIFESTYLE = 'Master Lifestyle Pvt. Ltd.',
  MASTER_MOLTY_FOAM = 'Master Molty Foam'
}

export const FACTORIES: Factory[] = [Factory.MASTER_LIFESTYLE, Factory.MASTER_MOLTY_FOAM];

export const FACTORY_CODES: Record<Factory, string> = {
  [Factory.MASTER_LIFESTYLE]: 'LS',
  [Factory.MASTER_MOLTY_FOAM]: 'MF'
};

export const LOCATION_FACTORIES: Record<Location, Factory[]> = {
  [Location.KARACHI]: [Factory.MASTER_LIFESTYLE, Factory.MASTER_MOLTY_FOAM],
  [Location.LAHORE]: [Factory.MASTER_LIFESTYLE, Factory.MASTER_MOLTY_FOAM],
  [Location.MIRPUR]: [Factory.MASTER_MOLTY_FOAM]
};

export interface FacilityUnit {
  location: Location;
  factory: Factory;
  key: string;
  label: string;
  shortLabel: string;
}

export const ALL_FACILITIES: FacilityUnit[] = [
  {
    location: Location.KARACHI,
    factory: Factory.MASTER_LIFESTYLE,
    key: `${Location.KARACHI}::${Factory.MASTER_LIFESTYLE}`,
    label: 'Karachi · Master Lifestyle Pvt. Ltd.',
    shortLabel: 'KHI · Lifestyle'
  },
  {
    location: Location.KARACHI,
    factory: Factory.MASTER_MOLTY_FOAM,
    key: `${Location.KARACHI}::${Factory.MASTER_MOLTY_FOAM}`,
    label: 'Karachi · Master Molty Foam',
    shortLabel: 'KHI · Molty Foam'
  },
  {
    location: Location.LAHORE,
    factory: Factory.MASTER_LIFESTYLE,
    key: `${Location.LAHORE}::${Factory.MASTER_LIFESTYLE}`,
    label: 'Lahore · Master Lifestyle Pvt. Ltd.',
    shortLabel: 'LHR · Lifestyle'
  },
  {
    location: Location.LAHORE,
    factory: Factory.MASTER_MOLTY_FOAM,
    key: `${Location.LAHORE}::${Factory.MASTER_MOLTY_FOAM}`,
    label: 'Lahore · Master Molty Foam',
    shortLabel: 'LHR · Molty Foam'
  },
  {
    location: Location.MIRPUR,
    factory: Factory.MASTER_MOLTY_FOAM,
    key: `${Location.MIRPUR}::${Factory.MASTER_MOLTY_FOAM}`,
    label: 'Mirpur · Master Molty Foam',
    shortLabel: 'MPR · Molty Foam'
  }
];

export enum KaizenType {
  IDEA = 'Idea',
  IMPLEMENTED = 'Implemented'
}

export enum KaizenStatus {
  PENDING = 'Pending',
  ACCEPTED = 'Accepted',
  REJECTED = 'Rejected'
}

export interface KaizenImpact {
  costSaving: boolean;
  productivity: boolean;
  quality: boolean;
  safety: boolean;
  delivery: boolean;
}

export interface KaizenCriteriaScores {
  problemIdentification: 1 | 2 | 3;
  rootCauseAnalysis: 1 | 2 | 3;
  creativityInnovation: 1 | 2 | 3;
  impactOnResults: 1 | 2 | 3;
  sustainability: 1 | 2 | 3;
  employeeInvolvement: 1 | 2 | 3;
  abilityToYokoten: 1 | 2 | 3;
}

export interface KaizenEvaluation {
  scores: KaizenCriteriaScores;
  aggregateScore: number;
  percentage: number;
  evaluatedAt?: string;
}

export interface Kaizen {
  id: string;
  location: Location;
  factory: Factory;
  department: string;
  initiator: string;
  submissionDate: string;
  presentationDate: string;
  type: KaizenType;
  status: KaizenStatus;
  problem: string;
  solution: string;
  challenges: string;
  impact: KaizenImpact;
  reward: number;
  feedback: string;
  month: string;
  beforeImg?: string;
  afterImg?: string;
  evaluation?: KaizenEvaluation;
}

export interface RankedKaizen extends Kaizen {
  baseReward: number;
  position: 1 | 2 | 3 | null;
  positionLabel: string;
  positionBonus: number;
  totalReward: number;
}

export interface User {
  id: string;
  name: string;
  role: 'ADMIN' | 'DEPARTMENT';
  department: string;
  location: Location | 'ALL';
  factory: Factory | 'ALL';
}

export const FURNITURE_DEPARTMENTS = [
  'Chair', 'Furniture', 'CHF', 'Polish', 'RM Store', 'Chair Store', 'FG Store',
  'Weldshop', 'Logistic', 'Maintenance', 'HSE', 'Admin', 'PPMC', 'Quality', 'Lean', 'Department'
];

export const MOLTY_FOAM_DEPARTMENTS = [
  'Foam Section',
  'Spring Section',
  'Rebound Section',
  'Uncver Section',
  'Accessories Section'
];

export const FACTORY_DEPARTMENTS: Record<Factory, string[]> = {
  [Factory.MASTER_LIFESTYLE]: FURNITURE_DEPARTMENTS,
  [Factory.MASTER_MOLTY_FOAM]: MOLTY_FOAM_DEPARTMENTS
};

export const SECTION_CODES: Record<string, string> = {
  'Chair': 'CH',
  'Furniture': 'FN',
  'CHF': 'CHF',
  'Polish': 'PL',
  'RM Store': 'RMS',
  'Chair Store': 'CHS',
  'FG Store': 'FGS',
  'Weldshop': 'WS',
  'Logistic': 'LG',
  'Maintenance': 'MT',
  'HSE': 'HSE',
  'Admin': 'AD',
  'PPMC': 'PP',
  'Quality': 'QL',
  'Lean': 'LN',
  'Department': 'DP',
  'Foam Section': 'FM',
  'Spring Section': 'SP',
  'Rebound Section': 'RB',
  'Uncver Section': 'UC',
  'Accessories Section': 'AC'
};

export const DEPARTMENTS = FURNITURE_DEPARTMENTS;

export const getFactoriesForLocation = (location: Location | 'All' | 'ALL'): Factory[] => {
  if (location === 'All' || location === 'ALL') {
    return FACTORIES;
  }
  return LOCATION_FACTORIES[location] || FACTORIES;
};

export const getDepartmentsForFactory = (factory: Factory | 'All' | 'ALL'): string[] => {
  if (factory === 'All' || factory === 'ALL') {
    return [...FURNITURE_DEPARTMENTS, ...MOLTY_FOAM_DEPARTMENTS];
  }
  return FACTORY_DEPARTMENTS[factory] || FURNITURE_DEPARTMENTS;
};

export const getShortFactoryName = (factory: Factory): string => {
  return factory === Factory.MASTER_MOLTY_FOAM ? 'Molty Foam' : 'Master Lifestyle';
};

export const getSectionCode = (department: string): string => {
  if (SECTION_CODES[department]) return SECTION_CODES[department];
  return department.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'GEN';
};

export const MONTHS = [
  'Jan 25', 'Feb 25', 'Mar 25', 'Apr 25', 'May 25', 'Jun 25',
  'Jul 25', 'Aug 25', 'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25',
  'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26',
  'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26', 'Nov 26', 'Dec 26',
  'Jan 27', 'Feb 27', 'Mar 27', 'Apr 27', 'May 27', 'Jun 27'
];

export function normalizeKaizenRecord(raw: Record<string, any>, docId: string): Kaizen {
  let factory: Factory;
  if (raw.factory === Factory.MASTER_MOLTY_FOAM || raw.factory === 'Karachi Molty Foam Port Qasim') {
    factory = Factory.MASTER_MOLTY_FOAM;
  } else if (raw.factory === Factory.MASTER_LIFESTYLE || raw.factory === 'Karachi Furniture Factory') {
    factory = Factory.MASTER_LIFESTYLE;
  } else {
    factory = MOLTY_FOAM_DEPARTMENTS.includes(raw.department)
      ? Factory.MASTER_MOLTY_FOAM
      : Factory.MASTER_LIFESTYLE;
  }

  let location: Location;
  if (raw.location === Location.LAHORE) {
    location = Location.LAHORE;
  } else if (raw.location === Location.MIRPUR) {
    location = Location.MIRPUR;
    factory = Factory.MASTER_MOLTY_FOAM;
  } else {
    location = Location.KARACHI;
  }

  return {
    ...raw,
    id: docId,
    location,
    factory
  } as Kaizen;
}

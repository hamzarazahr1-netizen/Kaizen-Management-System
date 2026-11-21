export enum Factory {
  FURNITURE = 'Karachi Furniture Factory',
  MOLTY_FOAM = 'Karachi Molty Foam Port Qasim'
}

export const FACTORIES: Factory[] = [Factory.FURNITURE, Factory.MOLTY_FOAM];

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

export interface Kaizen {
  id: string;
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
}

export interface User {
  id: string;
  name: string;
  role: 'ADMIN' | 'DEPARTMENT';
  department: string;
  factory: Factory | 'ALL';
}

export const FURNITURE_DEPARTMENTS = [
  'Chair', 'Furniture', 'CHF', 'Polish', 'RM Store', 'Chair Store', 'FG Store',
  'Weldshop', 'Logistic', 'Maintenance', 'HSE', 'Admin', 'PPMC', 'Department'
];

export const MOLTY_FOAM_DEPARTMENTS = [
  'Foam Section',
  'Spring Section',
  'Rebound Section',
  'Uncver Section',
  'Accessories Section'
];

export const FACTORY_DEPARTMENTS: Record<Factory, string[]> = {
  [Factory.FURNITURE]: FURNITURE_DEPARTMENTS,
  [Factory.MOLTY_FOAM]: MOLTY_FOAM_DEPARTMENTS
};

export const DEPARTMENTS = FURNITURE_DEPARTMENTS;

export const getDepartmentsForFactory = (factory: Factory | 'All' | 'ALL'): string[] => {
  if (factory === 'All' || factory === 'ALL') {
    return [...FURNITURE_DEPARTMENTS, ...MOLTY_FOAM_DEPARTMENTS];
  }
  return FACTORY_DEPARTMENTS[factory] || FURNITURE_DEPARTMENTS;
};

export const getShortFactoryName = (factory: Factory): string => {
  return factory === Factory.MOLTY_FOAM ? 'Molty Foam PQ' : 'Furniture Factory';
};

export const MONTHS = [
  'Jan 25', 'Feb 25', 'Mar 25', 'Apr 25', 'May 25', 'Jun 25',
  'Jul 25', 'Aug 25', 'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25',
  'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26',
  'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26', 'Nov 26', 'Dec 26'
];

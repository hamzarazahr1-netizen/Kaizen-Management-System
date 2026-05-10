
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
}

export const DEPARTMENTS = [
  'Chair', 'Furniture', 'CHF', 'Polish', 'RM Store', 'Chair Store', 'FG Store', 
  'Weldshop', 'Logistic', 'Maintenance', 'HSE', 'Admin', 'PPMC', 'Department'
];

export const MONTHS = [
  'Jan 25', 'Feb 25', 'Mar 25', 'Apr 25', 'May 25', 'Jun 25', 
  'Jul 25', 'Aug 25', 'Sep 25', 'Oct 25', 'Nov 25', 'Dec 25',
  'Jan 26', 'Feb 26'
];

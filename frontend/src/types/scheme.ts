/** Scheme and funding types */

export interface SchemeConfig {
  id: string;
  name: string;
  nameHi: string;
  nameGu: string;
  minProjectCost: number;
  maxProjectCost: number;
  interestRate: number;
  tenureYears: number;
  moratoriumMonths: number;
  maxFunding: number;
  purpose: string;
  eligibility: string[];
  documents: string[];
  source: string;
}

export interface SelectedScheme {
  scheme: SchemeConfig;
  projectCost: number;
  loanAmount: number;
  monthlyEMI: number;
  totalInterest: number;
  totalRepayment: number;
}

export interface FundingSource {
  id: string;
  name: string;
  type: 'government' | 'financial-institution' | 'channelizing-agency';
  purpose: string;
  potentialSupport: string;
  eligibility: string[];
  documents: string[];
  website: string;
}

export interface DocumentChecklistItem {
  id: string;
  label: string;
  description: string;
  category: string;
  isReady: boolean;
}

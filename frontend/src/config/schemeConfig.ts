import type { SchemeConfig } from '../types/scheme';

/**
 * Scheme routing configuration.
 * These are prototype values for demo purposes.
 * In production, these would be fetched from a verified backend.
 */
export const SCHEME_CONFIGS: SchemeConfig[] = [
  {
    id: 'micro-finance',
    name: 'Micro Finance Scheme',
    nameHi: 'माइक्रो फाइनेंस योजना',
    nameGu: 'માઈક્રો ફાઇનાન્સ યોજના',
    minProjectCost: 0,
    maxProjectCost: 140000, // ₹1.40 lakh
    interestRate: 6.5,
    tenureYears: 3,
    moratoriumMonths: 3,
    maxFunding: 125000, // ₹1.25 lakh
    purpose: 'Micro-enterprise financing for small-scale businesses with limited capital requirements.',
    eligibility: [
      'Age: 18-60 years',
      'Rural area resident',
      'Valid identity and address proof',
      'Business proposal/plan',
    ],
    documents: [
      'Identity Proof (Aadhaar/PAN)',
      'Address Proof',
      'Bank Account Details',
      'Business Proposal',
      'Margin Money Proof',
    ],
    source: 'Demo — Scheme details are illustrative',
  },
  {
    id: 'term-loan',
    name: 'Term Loan Scheme',
    nameHi: 'टर्म लोन योजना',
    nameGu: 'ટર્મ લોન યોજના',
    minProjectCost: 140001, // > ₹1.40 lakh
    maxProjectCost: 5000000, // ₹50 lakh
    interestRate: 8,
    tenureYears: 7,
    moratoriumMonths: 6,
    maxFunding: 4500000, // ₹45 lakh
    purpose: 'Term loan for medium-scale enterprises requiring significant capital investment.',
    eligibility: [
      'Age: 18-60 years',
      'Rural/semi-urban area resident',
      'Valid identity and address proof',
      'Detailed project report',
      'Collateral may be required',
    ],
    documents: [
      'Identity Proof (Aadhaar/PAN)',
      'Address Proof',
      'Bank Account Details',
      'Detailed Project Report',
      'Cost Estimates',
      'Margin Money Proof',
      'Collateral Documents',
      'Business Registration (if applicable)',
    ],
    source: 'Demo — Scheme details are illustrative',
  },
];

/**
 * Selects the appropriate scheme based on project cost.
 * Returns null if no scheme matches.
 */
export function selectScheme(projectCost: number): SchemeConfig | null {
  for (const scheme of SCHEME_CONFIGS) {
    if (projectCost >= scheme.minProjectCost && projectCost <= scheme.maxProjectCost) {
      return scheme;
    }
  }
  return null;
}

/** Default margin percentage (10%) */
export const DEFAULT_MARGIN_PERCENTAGE = 10;

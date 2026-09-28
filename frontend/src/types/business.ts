/**
 * VYAVSAYMITRA — Business Types & Models
 * Core domain entities for Agriculture and FoodTech business management.
 */

export type BusinessDomain = 'agriculture' | 'foodtech';

export type BusinessStatus =
  | 'draft'
  | 'active'
  | 'analysis_complete'
  | 'archived'
  | 'ready_for_analysis'
  | 'needs_more_information'
  | 'DRAFT'
  | 'READY_FOR_ANALYSIS'
  | 'ANALYZING'
  | 'ANALYSIS_COMPLETE'
  | 'INPUTS_INCOMPLETE'
  | 'ANALYSIS_NEEDS_INPUT'
  | string;

export interface BusinessLocation {
  id?: string;
  state: string;
  district: string;
  taluka?: string;
  village?: string;
  is_rural: boolean;
  latitude?: number;
  longitude?: number;
}

export interface BusinessAnalysisRecord {
  id: string;
  business_id: string;
  engine_name: string;
  engine_version: string;
  status: 'SUCCESS' | 'INSUFFICIENT_INPUTS' | 'EXECUTION_ERROR' | 'VALIDATION_ERROR' | string;
  total_project_cost: number;
  promoter_equity: number;
  bank_loan_requirement: number;
  annual_revenue: number;
  annual_operating_cost: number;
  net_annual_profit: number;
  estimated_monthly_profit: number;
  annual_roi_pct: number;
  estimated_roi?: number;
  break_even_units?: number;
  dscr: number;
  viability_rating?: string;
  financial_summary: any;
  risk_assessment?: any;
  provenance_audit: any;
  created_at: string;
  completed_at?: string;
}

export interface BusinessEntity {
  id: string;
  user_id: string;
  name: string;
  domain: BusinessDomain;
  business_type: string;
  status: BusinessStatus;
  location?: BusinessLocation;
  inputs?: Record<string, any>;
  latestAnalysis?: BusinessAnalysisRecord;
  created_at: string;
  updated_at: string;
}

export interface MarketObservation {
  commodity: string;
  modalPricePerQtl?: number;
  modal_price?: number;
  farmgatePricePerKg?: number;
  dataStatus?: 'current' | 'historical_reference' | 'institutional_benchmark' | 'data_unavailable' | string;
  latestDataDate?: string;
  market_name?: string;
  observation_date?: string;
  sourceType?: string;
  dataSource?: string;
  warning?: string | null;
  current?: {
    price: number;
    priceType: string;
    unit: string;
    market: string;
    location: string;
    observationDate: string;
    source: string;
  };
  trend?: {
    direction: string;
    seasonalContext: string;
  };
  provenance?: any;
  warnings?: string[];
}

export interface SchemeMatchItem {
  id: string;
  name: string;
  ministry?: string;
  description?: string;
  maxProjectCost?: number | Record<string, number>;
  subsidy_rules?: Record<string, number>;
  subsidy_percentage?: number;
  potential_subsidy?: number;
  interest_rate_range?: [number, number];
  tenure_years?: number;
  eligibilityStatus?: 'POTENTIALLY_APPLICABLE' | 'REQUIRES_VERIFICATION' | 'INSUFFICIENT_DATA' | string;
  verificationNote?: string;
  source_url?: string;
}

export interface DprReport {
  id: string;
  business_id: string;
  analysis_id?: string;
  report_type: 'BANKABLE_DPR' | 'FEASIBILITY_SUMMARY' | 'SCHEME_DOSSIER' | 'RISK_REPORT';
  title: string;
  summary?: string;
  content_snapshot: any;
  created_at: string;
}

/* Legacy Sub-Analysis Entities for compatibility */
export interface MarketAnalysis {
  estimatedConsumerBase: number;
  potentialCustomerSegments: Array<{ name: string; percentage: number; description: string }>;
  demandIndicators: Array<{ label: string; value: number; maxValue: number; unit: string }>;
  distributionChannels: string[];
  localMarketReach: number;
  nearbyVillages: Array<{ name: string; distance: number; population: number; coordinates: { lat: number; lng: number } }>;
}

export interface Competitor {
  id: string;
  name: string;
  category: string;
  distance: number;
  coordinates: { lat: number; lng: number };
  estimatedRevenue: string;
}

export interface Opportunity {
  id: string;
  title: string;
  reason: string;
  potentialCustomer: string;
  estimatedInvestment: string;
  risk: string;
  suggestedAction: string;
}

export interface SWOTAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface Risk {
  id: string;
  title: string;
  reason: string;
  impact: 'low' | 'medium' | 'high' | string;
  mitigation: string;
}

export interface ProductPricing {
  product: string;
  referenceMin: number;
  referenceMax: number;
  suggestedRetail: number;
  suggestedBulk: number;
  suggestedDirectDelivery: number;
  localFactors: string[];
  competitorReference: string;
  customerSegments: string[];
}


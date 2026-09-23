/**
 * VYAVSAYMITRA — FoodTech TypeScript Interfaces (Phase 3 Step 5)
 * 
 * Strict type contracts matching backend FoodTech registry, execution engine,
 * and advisory recommendation layer.
 */

export interface FoodTechBenchmarkValue {
  value: number;
  unit: string;
  source?: string;
  sourceUrl?: string;
  notes?: string;
}

export interface FoodTechDataSource {
  title: string;
  organization: string;
  url?: string;
  publicationYear?: number;
  documentType?: string;
  description?: string;
}

export interface FoodTechModelSummary {
  businessId: string;
  businessName: string;
  category: string;
  subcategory: string;
  description: string;
  aliases?: string[];
  requiredParameters: string[];
  optionalParameters: string[];
  outputMetrics: string[];
  benchmarkDefaults: Record<string, FoodTechBenchmarkValue>;
  dataSources: FoodTechDataSource[];
}

export interface FoodTechModelResponse {
  success: boolean;
  count: number;
  data: FoodTechModelSummary[];
}

export interface FoodTechSingleModelResponse {
  success: boolean;
  data: FoodTechModelSummary;
}

export interface FoodTechInputPayload {
  businessId: string;
  raw_material_quantity?: number;
  raw_material_price?: number;
  raw_material_unit?: string;
  selling_price?: number;
  selling_price_unit?: string;
  byproduct_selling_price?: number;
  broken_rice_selling_price?: number;
  husk_selling_price?: number;
  bran_selling_price?: number;
  cake_selling_price?: number;
  fixed_cost?: number;
  labor_cost?: number;
  power_cost?: number;
  packaging_cost?: number;
  transport_cost?: number;
  other_variable_cost?: number;
  initial_investment?: number;
  machinery_cost?: number;
  recovery_rate?: number;
  byproduct_recovery?: number;
  processing_loss?: number;
  category?: string;
  location?: 'rural' | 'urban';
  [key: string]: any;
}

export interface MetricValue {
  value: number;
  unit: string;
  formulaId?: string;
  label?: string;
}

export interface ByproductOutput {
  name: string;
  value: number;
  unit: string;
  formulaId?: string;
}

export interface ProductionBreakdown {
  primaryOutput: MetricValue;
  byproducts: ByproductOutput[];
  processingLoss: MetricValue;
}

export interface CostBreakdown {
  total: number;
  fixed: number;
  variable: number;
  unitVariableCost: number;
  items?: Record<string, number>;
}

export interface RevenueBreakdown {
  total: number;
  primary: number;
  byproduct: number;
  items?: Record<string, number>;
}

export interface ProfitabilityMetrics {
  grossProfit: MetricValue;
  netProfit: MetricValue;
  grossMarginPct: MetricValue;
  netMarginPct: MetricValue;
  roiPct?: MetricValue;
  paybackPeriod?: MetricValue;
  breakEvenQuantity?: MetricValue;
}

export interface FormulaProvenance {
  formulaId: string;
  formulaName: string;
  version: string;
  status: string;
  source: string;
  sourceUrl?: string;
  methodology?: string;
  executedAt: string;
  inputs?: Record<string, any>;
  result?: any;
}

export interface FoodTechCalculationResult {
  businessId: string;
  businessName: string;
  businessStatus: 'COMPLETE' | 'INSUFFICIENT_INPUTS' | 'VALIDATION_ERROR' | 'MASS_BALANCE_VIOLATION' | 'MODEL_NOT_SUPPORTED' | 'EXECUTION_ERROR';
  production: ProductionBreakdown;
  costs: CostBreakdown;
  revenue: RevenueBreakdown;
  profitability: ProfitabilityMetrics;
  metrics: Record<string, MetricValue>;
  provenance: Record<string, FormulaProvenance>;
  warnings?: string[];
  missingInputs?: string[];
  limitations?: string[];
  error?: string;
  message?: string;
}

export type ViabilityStatus = 'PROFITABLE' | 'LOSS_MAKING' | 'BREAK_EVEN' | 'INSUFFICIENT_DATA';
export type BreakEvenStatus = 'REACHABLE' | 'UNREACHABLE' | 'INSUFFICIENT_DATA';
export type SchemeMatchStatus = 'MATCHED' | 'POTENTIAL_MATCH' | 'INSUFFICIENT_ELIGIBILITY_DATA' | 'NOT_MATCHED';

export interface ViabilityAssessment {
  status: ViabilityStatus;
  isViable: boolean;
  confidenceTier: string;
  netMarginPct: number | null;
  grossMarginPct: number | null;
  summary: string;
}

export interface BreakEvenAnalysis {
  status: BreakEvenStatus;
  breakEvenQuantity: number | null;
  unit: string;
  currentProduction: number | null;
  capacityUtilizationPct: number | null;
  contributionMarginPerUnit: number | null;
  summary: string;
  notes?: string;
}

export interface InvestmentAnalysis {
  status: 'CALCULATED' | 'INSUFFICIENT_DATA';
  initialInvestment: number | null;
  netAnnualCashflow: number | null;
  paybackPeriodYears: number | null;
  roiPct: number | null;
  summary: string;
  missingInputs?: string[];
}

export interface SensitivityScenario {
  rawMaterialCost?: number;
  sellingPrice?: number;
  projectedNetProfit: number;
  delta: number;
}

export interface SensitivityAnalysis {
  rawMaterialCostIncrease10Pct?: SensitivityScenario;
  rawMaterialCostDecrease10Pct?: SensitivityScenario;
  sellingPriceIncrease10Pct?: SensitivityScenario;
  sellingPriceDecrease10Pct?: SensitivityScenario;
}

export interface RiskAlert {
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  code: string;
  message: string;
}

export interface OperationalRecommendation {
  area: 'Pricing' | 'Cost' | 'Production' | 'Operations' | 'Investment' | string;
  action: string;
}

export interface MatchedScheme {
  schemeId: string;
  schemeName: string;
  matchStatus: SchemeMatchStatus;
  subsidyPct?: number;
  maxSubsidy?: number;
  eligibleComponents?: string[];
  missingEligibilityCriteria?: string[];
  documentaryProofRequired?: string[];
}

export interface FoodTechAdvisoryResult {
  businessId: string;
  businessName: string;
  businessStatus: string;
  calculationResult: FoodTechCalculationResult;
  viability: ViabilityAssessment;
  breakEvenAnalysis: BreakEvenAnalysis;
  investmentAnalysis: InvestmentAnalysis;
  sensitivity: SensitivityAnalysis;
  riskAlerts: RiskAlert[];
  recommendations: OperationalRecommendation[];
  schemes: MatchedScheme[];
  provenance: Record<string, FormulaProvenance>;
  warnings: string[];
  limitations: string[];
  missingInputs: string[];
}

export interface FoodTechAdvisoryResponse {
  success: boolean;
  data: FoodTechAdvisoryResult;
  message?: string;
  status?: string;
  missingInputs?: string[];
}

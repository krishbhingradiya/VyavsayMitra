import type { ProjectCostBreakdown, EMIResult, RepaymentEntry, RepaymentSchedule, BreakEvenResult, ProfitProjection, CashFlowEntry } from '../types/finance';
import { DEFAULT_MARGIN_PERCENTAGE } from '../config/schemeConfig';

/**
 * Calculates project cost from available margin capital.
 * Formula: Project Cost = Margin Capital / (Margin Percentage / 100)
 */
export function calculateProjectCost(
  marginCapital: number,
  marginPercentage: number = DEFAULT_MARGIN_PERCENTAGE
): ProjectCostBreakdown {
  if (marginCapital <= 0 || marginPercentage <= 0 || marginPercentage > 100) {
    return {
      marginCapital: 0,
      marginPercentage: 0,
      totalProjectCost: 0,
      loanAmount: 0,
      loanPercentage: 0,
    };
  }

  const totalProjectCost = marginCapital / (marginPercentage / 100);
  const loanPercentage = 100 - marginPercentage;
  const loanAmount = totalProjectCost * (loanPercentage / 100);

  return {
    marginCapital,
    marginPercentage,
    totalProjectCost: Math.round(totalProjectCost),
    loanAmount: Math.round(loanAmount),
    loanPercentage,
  };
}

/**
 * Calculates loan amount as a percentage of project cost.
 */
export function calculateLoanAmount(projectCost: number, loanPercentage: number = 90): number {
  return Math.round(projectCost * (loanPercentage / 100));
}

/**
 * Calculates EMI using the standard formula.
 * EMI = P × r × (1+r)^n / ((1+r)^n - 1)
 * Where P = principal, r = monthly interest rate, n = number of months
 */
export function calculateEMI(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): EMIResult {
  if (principal <= 0 || annualInterestRate <= 0 || tenureMonths <= 0) {
    return {
      monthlyEMI: 0,
      totalInterest: 0,
      totalRepayment: 0,
      principal: 0,
      annualInterestRate: 0,
      tenureMonths: 0,
    };
  }

  const r = annualInterestRate / 100 / 12; // Monthly interest rate
  const n = tenureMonths;
  const rPowN = Math.pow(1 + r, n);

  const monthlyEMI = (principal * r * rPowN) / (rPowN - 1);
  const totalRepayment = monthlyEMI * n;
  const totalInterest = totalRepayment - principal;

  return {
    monthlyEMI: Math.round(monthlyEMI * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalRepayment: Math.round(totalRepayment * 100) / 100,
    principal,
    annualInterestRate,
    tenureMonths,
  };
}

/**
 * Generates a complete repayment schedule with moratorium support.
 * During moratorium, interest accrues but no principal is repaid.
 * Moratorium interest is capitalized (added to principal) for this prototype.
 */
export function generateRepaymentSchedule(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number,
  moratoriumMonths: number = 0
): RepaymentSchedule {
  const entries: RepaymentEntry[] = [];
  const r = annualInterestRate / 100 / 12;
  let balance = principal;
  let totalInterest = 0;
  let totalPrincipal = 0;
  let moratoriumInterest = 0;

  // Moratorium period — interest-only, capitalized
  for (let i = 1; i <= moratoriumMonths; i++) {
    const interest = Math.round(balance * r * 100) / 100;
    moratoriumInterest += interest;
    totalInterest += interest;

    entries.push({
      period: i,
      month: `Month ${i} (Moratorium)`,
      openingPrincipal: Math.round(balance * 100) / 100,
      interest,
      principalPaid: 0,
      payment: 0, // No payment during moratorium in this config
      closingBalance: Math.round(balance * 100) / 100,
    });
  }

  // After moratorium, capitalize the accrued interest
  balance += moratoriumInterest;

  // Calculate EMI for remaining tenure
  const remainingMonths = tenureMonths;
  const emi = calculateEMI(balance, annualInterestRate, remainingMonths);

  // Repayment period
  for (let i = 1; i <= remainingMonths; i++) {
    const interest = Math.round(balance * r * 100) / 100;
    const principalPaid = Math.round((emi.monthlyEMI - interest) * 100) / 100;
    const payment = emi.monthlyEMI;

    totalInterest += interest;
    totalPrincipal += principalPaid;
    balance = Math.max(0, Math.round((balance - principalPaid) * 100) / 100);

    entries.push({
      period: moratoriumMonths + i,
      month: `Month ${moratoriumMonths + i}`,
      openingPrincipal: Math.round((balance + principalPaid) * 100) / 100,
      interest,
      principalPaid,
      payment: Math.round(payment * 100) / 100,
      closingBalance: balance,
    });
  }

  return {
    entries,
    totalPrincipal: Math.round(totalPrincipal * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalRepayment: Math.round((totalPrincipal + totalInterest) * 100) / 100,
    moratoriumMonths,
    moratoriumInterest: Math.round(moratoriumInterest * 100) / 100,
  };
}

/**
 * Calculates total operating cost from individual items.
 */
export function calculateOperatingCost(items: { amount: number }[]): {
  totalMonthly: number;
  totalAnnual: number;
} {
  const totalMonthly = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  return {
    totalMonthly: Math.round(totalMonthly),
    totalAnnual: Math.round(totalMonthly * 12),
  };
}

/**
 * Calculates working capital requirement.
 */
export function calculateWorkingCapital(inputs: {
  inventory: number;
  rawMaterial: number;
  labour: number;
  transport: number;
  utilities: number;
  emergencyReserve: number;
}): number {
  return Math.round(
    (inputs.inventory || 0) +
    (inputs.rawMaterial || 0) +
    (inputs.labour || 0) +
    (inputs.transport || 0) +
    (inputs.utilities || 0) +
    (inputs.emergencyReserve || 0)
  );
}

/**
 * Calculates monthly revenue.
 */
export function calculateRevenue(sellingPrice: number, monthlySales: number): number {
  return Math.round(sellingPrice * monthlySales);
}

/**
 * Calculates gross profit.
 */
export function calculateGrossProfit(
  revenue: number,
  variableCost: number
): number {
  return Math.round(revenue - variableCost);
}

/**
 * Calculates operating profit.
 */
export function calculateOperatingProfit(
  grossProfit: number,
  fixedCost: number
): number {
  return Math.round(grossProfit - fixedCost);
}

/**
 * Calculates break-even point.
 */
export function calculateBreakEven(
  sellingPrice: number,
  variableCostPerUnit: number,
  fixedCostMonthly: number
): BreakEvenResult {
  if (sellingPrice <= variableCostPerUnit) {
    return {
      breakEvenUnits: Infinity,
      breakEvenRevenue: Infinity,
      breakEvenMonths: Infinity,
      contributionMargin: 0,
    };
  }

  const contributionMargin = sellingPrice - variableCostPerUnit;
  const breakEvenUnits = Math.ceil(fixedCostMonthly / contributionMargin);
  const breakEvenRevenue = Math.round(breakEvenUnits * sellingPrice);

  return {
    breakEvenUnits,
    breakEvenRevenue,
    breakEvenMonths: 1, // Monthly basis
    contributionMargin: Math.round(contributionMargin * 100) / 100,
  };
}

/**
 * Generates monthly profit projections for up to 36 months.
 */
export function generateProfitProjections(
  sellingPrice: number,
  monthlySales: number,
  variableCostPerUnit: number,
  fixedCostMonthly: number,
  growthRateAnnual: number,
  months: number = 36
): ProfitProjection[] {
  const projections: ProfitProjection[] = [];
  let cumulativeProfit = 0;
  const monthlyGrowthRate = growthRateAnnual / 100 / 12;

  for (let m = 1; m <= months; m++) {
    const growthFactor = 1 + monthlyGrowthRate * (m - 1);
    const adjustedSales = Math.round(monthlySales * growthFactor);
    const revenue = adjustedSales * sellingPrice;
    const variableCost = adjustedSales * variableCostPerUnit;
    const grossProfit = revenue - variableCost;
    const operatingProfit = grossProfit - fixedCostMonthly;
    cumulativeProfit += operatingProfit;

    projections.push({
      month: m,
      revenue: Math.round(revenue),
      variableCost: Math.round(variableCost),
      fixedCost: fixedCostMonthly,
      grossProfit: Math.round(grossProfit),
      operatingProfit: Math.round(operatingProfit),
      cumulativeProfit: Math.round(cumulativeProfit),
    });
  }

  return projections;
}

/**
 * Generates cash flow projection entries.
 */
export function generateCashFlow(
  monthlyRevenue: number,
  monthlyExpenses: number,
  initialInvestment: number,
  months: number = 12
): CashFlowEntry[] {
  const entries: CashFlowEntry[] = [];
  let cumulative = -initialInvestment;

  for (let m = 1; m <= months; m++) {
    const inflow = monthlyRevenue;
    const outflow = m === 1 ? monthlyExpenses + initialInvestment : monthlyExpenses;
    const net = inflow - outflow;
    cumulative += net + (m === 1 ? initialInvestment : 0);
    cumulative = inflow - monthlyExpenses + (m === 1 ? cumulative : entries[m - 2].cumulativeCashFlow);

    entries.push({
      month: m,
      inflow: Math.round(inflow),
      outflow: Math.round(m === 1 ? monthlyExpenses + initialInvestment : monthlyExpenses),
      netCashFlow: Math.round(m === 1 ? inflow - monthlyExpenses - initialInvestment : inflow - monthlyExpenses),
      cumulativeCashFlow: 0, // Will be calculated below
    });
  }

  // Calculate cumulative
  let runningTotal = -initialInvestment;
  for (const entry of entries) {
    runningTotal += entry.inflow - (entry.month === 1 ? entry.outflow - initialInvestment : entry.outflow);
    runningTotal = entries.indexOf(entry) === 0
      ? -initialInvestment + entry.inflow - (entry.outflow - initialInvestment)
      : entries[entries.indexOf(entry) - 1].cumulativeCashFlow + entry.netCashFlow;
    entry.cumulativeCashFlow = Math.round(runningTotal);
  }

  // Simpler recalculation
  let cum = 0;
  for (const entry of entries) {
    cum += entry.netCashFlow;
    entry.cumulativeCashFlow = Math.round(cum);
  }

  return entries;
}

/**
 * Formats a number as Indian currency (₹).
 */
export function formatINR(amount: number): string {
  if (amount === Infinity || isNaN(amount)) return '—';
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
  return `${amount < 0 ? '-' : ''}₹${formatted}`;
}

/**
 * Formats a number with commas (Indian numbering system).
 */
export function formatNumber(num: number): string {
  if (num === Infinity || isNaN(num)) return '—';
  return num.toLocaleString('en-IN');
}

/**
 * Formats a percentage.
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// ── DYNAMIC FINANCIAL CALCULATION ENGINE (Phase 14 Specification) ──────────

export interface ProductionMetrics {
  rawMaterialName: string;
  dailyInputKg: number;
  workingDaysPerMonth: number;
  recoveryYieldPct: number;
  dailyFinishedProductKg: number;
  monthlyInputKg: number;
  monthlyFinishedProductKg: number;
  unit: string;
  isDynamic: boolean;
}

export interface InvestmentBreakdown {
  machineryEquipment: number;
  landRentDeposit: number;
  infrastructureSetup: number;
  installationElectrification: number;
  initialInventory: number;
  initialWorkingCapital: number;
  preOperativeExpenses: number;
  otherSetupCosts: number;
  totalInitialInvestment: number;
  isComplete: boolean;
  missingItems: string[];
}

export interface VariableCostsBreakdown {
  rawMaterialMonthly: number;
  packagingMonthly: number;
  electricityMonthly: number;
  fuelMonthly: number;
  transportMonthly: number;
  labourMonthly: number;
  maintenanceMonthly: number;
  otherVariableMonthly: number;
  totalMonthlyVariable: number;
  totalAnnualVariable: number;
  unitVariableCost: number;
}

export interface FixedCostsBreakdown {
  rentMonthly: number;
  salariesMonthly: number;
  adminMonthly: number;
  insuranceMonthly: number;
  communicationMonthly: number;
  licensesMonthly: number;
  officeMonthly: number;
  otherFixedMonthly: number;
  totalMonthlyFixed: number;
  totalAnnualFixed: number;
}

export interface DepreciationCalculation {
  depreciableAssetValue: number;
  usefulLifeYears: number;
  annualDepreciation: number;
  monthlyDepreciation: number;
  methodology: string;
}

export interface FinancingEmiCalculation {
  loanAmount: number;
  annualInterestRate: number;
  tenureMonths: number;
  monthlyEMI: number;
  annualDebtService: number;
  monthlyInterestInitial: number;
  monthlyPrincipalInitial: number;
  hasFinancing: boolean;
}

export interface ProfitWaterfall {
  annualRevenue: number;
  monthlyRevenue: number;
  sellingPricePerUnit: number;
  isSellingPriceProvided: boolean;
  
  // Costs
  annualVariableCosts: number;
  annualGrossProfit: number;
  grossMarginPct: number;
  
  annualFixedCosts: number;
  annualOperatingProfit: number; // EBIT / Net Operating Profit
  operatingMarginPct: number;
  
  annualCashExpenses: number;
  annualEBITDA: number;
  
  annualDepreciation: number;
  annualEBIT: number;
  
  annualInterestExpense: number;
  profitBeforeTax: number;
  
  taxRatePct?: number;
  taxesPaid: number;
  isTaxIncluded: boolean;
  taxNote: string;
  
  netProfit: number;
  netMarginPct: number;
}

export interface RoiAnalysis {
  status: 'CALCULATED' | 'ROI_PENDING';
  roiPct: number | null;
  displayValue: string;
  formulaDescription: string;
  annualNetOperatingProfit: number;
  totalInitialInvestment: number;
  missingInputs: string[];
  guidanceMessage?: string;
}

export interface BreakEvenAnalysis {
  status: 'CALCULATED' | 'INDETERMINATE';
  contributionMarginPerUnit: number;
  breakEvenUnitsMonthly: number;
  breakEvenRevenueMonthly: number;
  breakEvenMonthsToRecoverFixedCost: number;
  message?: string;
}

export interface PaybackAnalysis {
  status: 'CALCULATED' | 'UNAVAILABLE';
  paybackYears: number | null;
  paybackMonths: number | null;
  displayValue: string;
  annualOperatingCashFlow: number;
  totalInitialInvestment: number;
  explanation: string;
}

export interface DynamicFinancialReport {
  isValid: boolean;
  status: 'ANALYSIS_COMPLETE' | 'INPUTS_INCOMPLETE';
  statusLabel: string;
  missingFields: string[];
  production: ProductionMetrics;
  investment: InvestmentBreakdown;
  variableCosts: VariableCostsBreakdown;
  fixedCosts: FixedCostsBreakdown;
  depreciation: DepreciationCalculation;
  financing: FinancingEmiCalculation;
  profitWaterfall: ProfitWaterfall;
  roi: RoiAnalysis;
  breakEven: BreakEvenAnalysis;
  payback: PaybackAnalysis;
  howCalculated: Record<string, string>;
}

/**
 * 1. Calculates dynamic production transformation
 */
export function calculateProductionTransformation(inputs: Record<string, any> = {}, domain: string = 'foodtech'): ProductionMetrics {
  const isAgri = domain === 'agriculture';
  const defaultRawMaterial = isAgri ? (inputs.crop || inputs.cropName || 'Wheat') : (inputs.rawMaterial || inputs.business_type?.includes('OIL') ? 'Mustard / Groundnut Oilseeds' : (inputs.business_type?.includes('RICE') ? 'Paddy' : 'Grains / Wheat'));
  const rawMaterialName = inputs.rawMaterialName || inputs.rawMaterial || defaultRawMaterial;
  
  const dailyInputKg = Number(inputs.raw_material_quantity || inputs.rawMaterialQuantity || inputs.dailyProcessing || (isAgri ? 0 : 400));
  const workingDaysPerMonth = Math.max(1, Number(inputs.working_days || inputs.workingDays || 26));
  const recoveryYieldPct = Math.min(100, Math.max(1, Number(inputs.recovery_rate || inputs.recoveryRate || inputs.yieldPct || 95)));

  const monthlyInputKg = Math.round(dailyInputKg * workingDaysPerMonth);
  const dailyFinishedProductKg = +( (dailyInputKg * (recoveryYieldPct / 100)).toFixed(2) );
  const monthlyFinishedProductKg = +( (dailyFinishedProductKg * workingDaysPerMonth).toFixed(2) );

  return {
    rawMaterialName,
    dailyInputKg,
    workingDaysPerMonth,
    recoveryYieldPct,
    dailyFinishedProductKg,
    monthlyInputKg,
    monthlyFinishedProductKg,
    unit: isAgri ? 'quintal' : 'kg',
    isDynamic: dailyInputKg > 0
  };
}

/**
 * 2. Calculates Initial Investment with zero double-counting
 */
export function calculateTotalInitialInvestment(inputs: Record<string, any> = {}): InvestmentBreakdown {
  const machineryEquipment = Math.max(0, Number(inputs.machinery_cost || inputs.machineryCost || inputs.machineryCapex || inputs.equipmentCost || 0));
  const landRentDeposit = Math.max(0, Number(inputs.land_deposit || inputs.landRentDeposit || inputs.rentDeposit || 0));
  const infrastructureSetup = Math.max(0, Number(inputs.infrastructure_cost || inputs.infrastructureCost || inputs.civilShedCost || 0));
  const installationElectrification = Math.max(0, Number(inputs.installation_cost || inputs.installationCost || inputs.electricalCost || 0));
  const initialInventory = Math.max(0, Number(inputs.initial_inventory || inputs.initialInventory || 0));
  const initialWorkingCapital = Math.max(0, Number(inputs.initial_working_capital || inputs.workingCapitalBuffer || inputs.workingCapital || 0));
  const preOperativeExpenses = Math.max(0, Number(inputs.pre_operative_expenses || inputs.preOperativeExpenses || 0));
  const otherSetupCosts = Math.max(0, Number(inputs.other_setup_costs || inputs.otherSetupCosts || 0));

  let totalInitialInvestment = machineryEquipment + landRentDeposit + infrastructureSetup +
    installationElectrification + initialInventory + initialWorkingCapital +
    preOperativeExpenses + otherSetupCosts;

  // Fallback to capitalAvailable or projectCost if explicit line items are not yet broken down
  if (totalInitialInvestment === 0) {
    if (Number(inputs.initial_investment || inputs.projectCost || inputs.totalProjectCost) > 0) {
      totalInitialInvestment = Number(inputs.initial_investment || inputs.projectCost || inputs.totalProjectCost);
    } else if (Number(inputs.capitalAvailable) > 0) {
      totalInitialInvestment = Number(inputs.capitalAvailable);
    }
  }

  const missingItems: string[] = [];
  if (totalInitialInvestment <= 0) {
    missingItems.push('Machinery / Setup investment outlay');
  }

  return {
    machineryEquipment,
    landRentDeposit,
    infrastructureSetup,
    installationElectrification,
    initialInventory,
    initialWorkingCapital,
    preOperativeExpenses,
    otherSetupCosts,
    totalInitialInvestment,
    isComplete: totalInitialInvestment > 0,
    missingItems
  };
}

/**
 * 3. Calculates dynamic variable costs (raw material, packaging, electricity, transport, labour)
 */
export function calculateDynamicVariableCosts(
  inputs: Record<string, any> = {},
  production: ProductionMetrics
): VariableCostsBreakdown {
  const workingDays = production.workingDaysPerMonth;
  const rawMaterialPricePerKg = Number(inputs.rawMaterialCostPerKg || inputs.raw_material_price || inputs.rawMaterialPrice || 0);

  // Multi-raw material or single calculation
  let rawMaterialMonthly = 0;
  if (Array.isArray(inputs.rawMaterials) && inputs.rawMaterials.length > 0) {
    rawMaterialMonthly = inputs.rawMaterials.reduce((acc, item) => {
      const q = Number(item.dailyQty || item.quantity || 0);
      const p = Number(item.pricePerKg || item.price || 0);
      return acc + (q * p * workingDays);
    }, 0);
  } else {
    rawMaterialMonthly = Math.round(production.dailyInputKg * workingDays * rawMaterialPricePerKg);
  }

  // Packaging (default 1.25/kg finished goods if not provided)
  const packagingMonthly = inputs.packaging_cost_monthly !== undefined
    ? Number(inputs.packaging_cost_monthly)
    : Math.round(production.monthlyFinishedProductKg * Number(inputs.packagingCostPerKg || (production.dailyInputKg > 0 ? 1.5 : 0)));

  // Electricity / Power
  const electricityMonthly = Number(inputs.electricity_cost_monthly || inputs.powerCostMonthly || inputs.electricityCost || 0);

  // Fuel / Energy
  const fuelMonthly = Number(inputs.fuel_cost_monthly || inputs.fuelCostMonthly || 0);

  // Transportation / Logistics
  const transportMonthly = Number(inputs.transport_cost_monthly || inputs.transportCostMonthly || 0);

  // Direct Labour
  const labourMonthly = Number(inputs.labour_cost_monthly || inputs.labourCostMonthly || inputs.labourCost || 0);

  // Maintenance linked to production
  const maintenanceMonthly = Number(inputs.maintenance_cost_monthly || inputs.maintenanceCostMonthly || 0);

  // Other variable costs
  const otherVariableMonthly = Number(inputs.other_variable_monthly || inputs.otherVariableMonthly || 0);

  const totalMonthlyVariable = Math.round(
    rawMaterialMonthly + packagingMonthly + electricityMonthly + fuelMonthly +
    transportMonthly + labourMonthly + maintenanceMonthly + otherVariableMonthly
  );

  const totalAnnualVariable = totalMonthlyVariable * 12;

  const unitVariableCost = production.monthlyFinishedProductKg > 0
    ? +( (totalMonthlyVariable / production.monthlyFinishedProductKg).toFixed(2) )
    : 0;

  return {
    rawMaterialMonthly,
    packagingMonthly,
    electricityMonthly,
    fuelMonthly,
    transportMonthly,
    labourMonthly,
    maintenanceMonthly,
    otherVariableMonthly,
    totalMonthlyVariable,
    totalAnnualVariable,
    unitVariableCost
  };
}

/**
 * 4. Calculates dynamic fixed operating costs (Rent, salaries, admin, insurance, licenses)
 */
export function calculateDynamicFixedCosts(inputs: Record<string, any> = {}): FixedCostsBreakdown {
  const rentMonthly = Number(inputs.rent_monthly || inputs.rentMonthly || 0);
  const salariesMonthly = Number(inputs.salaries_monthly || inputs.salariesMonthly || inputs.staffSalaries || 0);
  const adminMonthly = Number(inputs.admin_expenses_monthly || inputs.adminMonthly || 0);
  const insuranceMonthly = Number(inputs.insurance_monthly || inputs.insuranceMonthly || 0);
  const communicationMonthly = Number(inputs.communication_monthly || inputs.communicationMonthly || 0);
  const licensesMonthly = Number(inputs.licenses_monthly || inputs.licensesMonthly || 0);
  const officeMonthly = Number(inputs.office_expenses_monthly || inputs.officeMonthly || 0);
  const otherFixedMonthly = Number(inputs.other_fixed_monthly || inputs.otherFixedMonthly || 0);

  let totalMonthlyFixed = Math.round(
    rentMonthly + salariesMonthly + adminMonthly + insuranceMonthly +
    communicationMonthly + licensesMonthly + officeMonthly + otherFixedMonthly
  );

  // If fixed cost breakdown is not individually specified, fallback to monthlyOpex share
  if (totalMonthlyFixed === 0 && Number(inputs.fixed_cost || inputs.fixedCostsMonthly) > 0) {
    totalMonthlyFixed = Number(inputs.fixed_cost || inputs.fixedCostsMonthly);
  }

  const totalAnnualFixed = totalMonthlyFixed * 12;

  return {
    rentMonthly,
    salariesMonthly,
    adminMonthly,
    insuranceMonthly,
    communicationMonthly,
    licensesMonthly,
    officeMonthly,
    otherFixedMonthly,
    totalMonthlyFixed,
    totalAnnualFixed
  };
}

/**
 * 5. Calculates Depreciation on depreciable capital assets
 */
export function calculateDepreciation(
  investment: InvestmentBreakdown,
  inputs: Record<string, any> = {}
): DepreciationCalculation {
  const depreciableAssetValue = investment.machineryEquipment + investment.infrastructureSetup + investment.installationElectrification;
  const usefulLifeYears = Math.max(1, Number(inputs.useful_life_years || inputs.usefulLifeYears || 10));

  const annualDepreciation = depreciableAssetValue > 0
    ? Math.round(depreciableAssetValue / usefulLifeYears)
    : 0;

  const monthlyDepreciation = Math.round(annualDepreciation / 12);

  return {
    depreciableAssetValue,
    usefulLifeYears,
    annualDepreciation,
    monthlyDepreciation,
    methodology: `Straight-line depreciation over ${usefulLifeYears} years useful asset life. Not deducted from cash flow.`
  };
}

/**
 * 6. Calculates Loan EMI & Debt Service
 */
export function calculateFinancingDetails(
  investment: InvestmentBreakdown,
  inputs: Record<string, any> = {}
): FinancingEmiCalculation {
  const bankLoanRequired = Number(inputs.bankLoanRequired || inputs.loanAmount || (investment.totalInitialInvestment * 0.75));
  const interestRate = Number(inputs.interestRate || inputs.loanInterestRate || 8.5);
  const tenureMonths = Number(inputs.tenureMonths || (Number(inputs.tenureYears || 5) * 12));

  if (bankLoanRequired > 0 && interestRate > 0 && tenureMonths > 0) {
    const r = (interestRate / 100) / 12;
    const n = tenureMonths;
    const rPow = Math.pow(1 + r, n);
    const monthlyEMI = Math.round(((bankLoanRequired * r * rPow) / (rPow - 1)) * 100) / 100;
    const annualDebtService = Math.round(monthlyEMI * 12);
    const monthlyInterestInitial = Math.round((bankLoanRequired * r) * 100) / 100;
    const monthlyPrincipalInitial = Math.round((monthlyEMI - monthlyInterestInitial) * 100) / 100;

    return {
      loanAmount: bankLoanRequired,
      annualInterestRate: interestRate,
      tenureMonths,
      monthlyEMI,
      annualDebtService,
      monthlyInterestInitial,
      monthlyPrincipalInitial,
      hasFinancing: true
    };
  }

  return {
    loanAmount: 0,
    annualInterestRate: 0,
    tenureMonths: 0,
    monthlyEMI: 0,
    annualDebtService: 0,
    monthlyInterestInitial: 0,
    monthlyPrincipalInitial: 0,
    hasFinancing: false
  };
}

/**
 * 7. Calculates Comprehensive Profit Waterfall
 */
export function calculateProfitWaterfall(
  production: ProductionMetrics,
  variableCosts: VariableCostsBreakdown,
  fixedCosts: FixedCostsBreakdown,
  depreciation: DepreciationCalculation,
  financing: FinancingEmiCalculation,
  inputs: Record<string, any> = {},
  verifiedMarketPrice?: number
): ProfitWaterfall {
  // Selling price resolution: verified input -> market data -> 0
  let sellingPricePerUnit = 0;
  let isSellingPriceProvided = false;

  if (Number(inputs.selling_price || inputs.sellingPrice || inputs.outputPricePerKg) > 0) {
    sellingPricePerUnit = Number(inputs.selling_price || inputs.sellingPrice || inputs.outputPricePerKg);
    isSellingPriceProvided = true;
  } else if (verifiedMarketPrice && verifiedMarketPrice > 0) {
    sellingPricePerUnit = verifiedMarketPrice;
    isSellingPriceProvided = true;
  }

  const monthlyRevenue = isSellingPriceProvided
    ? Math.round(production.monthlyFinishedProductKg * sellingPricePerUnit)
    : 0;
  const annualRevenue = monthlyRevenue * 12;

  // Waterfall Steps
  const annualVariableCosts = variableCosts.totalAnnualVariable;
  const annualGrossProfit = Math.round(annualRevenue - annualVariableCosts);
  const grossMarginPct = annualRevenue > 0 ? +( ((annualGrossProfit / annualRevenue) * 100).toFixed(1) ) : 0;

  const annualFixedCosts = fixedCosts.totalAnnualFixed;
  const annualOperatingProfit = Math.round(annualGrossProfit - annualFixedCosts);
  const operatingMarginPct = annualRevenue > 0 ? +( ((annualOperatingProfit / annualRevenue) * 100).toFixed(1) ) : 0;

  const annualCashExpenses = annualVariableCosts + annualFixedCosts;
  const annualEBITDA = Math.round(annualRevenue - annualCashExpenses);

  const annualDepreciation = depreciation.annualDepreciation;
  const annualEBIT = Math.round(annualEBITDA - annualDepreciation);

  // Financing interest
  const annualInterestExpense = financing.hasFinancing
    ? Math.round(financing.annualDebtService * 0.45) // Approx first-year interest component
    : 0;

  const profitBeforeTax = Math.round(annualEBIT - annualInterestExpense);

  const taxRatePct = inputs.tax_rate_pct !== undefined ? Number(inputs.tax_rate_pct) : undefined;
  let taxesPaid = 0;
  let isTaxIncluded = false;
  let taxNote = 'Tax not included — tax input unavailable';

  if (taxRatePct !== undefined && taxRatePct >= 0) {
    taxesPaid = Math.round(Math.max(0, profitBeforeTax) * (taxRatePct / 100));
    isTaxIncluded = true;
    taxNote = `Calculated at ${taxRatePct}% enterprise tax rate`;
  }

  const netProfit = profitBeforeTax - taxesPaid;
  const netMarginPct = annualRevenue > 0 ? +( ((netProfit / annualRevenue) * 100).toFixed(1) ) : 0;

  return {
    annualRevenue,
    monthlyRevenue,
    sellingPricePerUnit,
    isSellingPriceProvided,
    annualVariableCosts,
    annualGrossProfit,
    grossMarginPct,
    annualFixedCosts,
    annualOperatingProfit,
    operatingMarginPct,
    annualCashExpenses,
    annualEBITDA,
    annualDepreciation,
    annualEBIT,
    annualInterestExpense,
    profitBeforeTax,
    taxRatePct,
    taxesPaid,
    isTaxIncluded,
    taxNote,
    netProfit,
    netMarginPct
  };
}

/**
 * 8. Evaluates Dynamic ROI with Missing Input Callouts
 */
export function calculateDynamicRoi(
  profitWaterfall: ProfitWaterfall,
  investment: InvestmentBreakdown,
  _inputs: Record<string, any> = {}
): RoiAnalysis {
  const missingInputs: string[] = [];

  if (!profitWaterfall.isSellingPriceProvided || profitWaterfall.sellingPricePerUnit <= 0) {
    missingInputs.push('Finished product selling price');
  }
  if (profitWaterfall.annualRevenue <= 0) {
    missingInputs.push('Production output turnover');
  }
  if (investment.totalInitialInvestment <= 0) {
    missingInputs.push('Initial investment outlay');
  }

  if (missingInputs.length > 0) {
    return {
      status: 'ROI_PENDING',
      roiPct: null,
      displayValue: 'ROI Pending',
      formulaDescription: 'Annual Net Operating Profit / Total Initial Investment × 100',
      annualNetOperatingProfit: profitWaterfall.annualOperatingProfit,
      totalInitialInvestment: investment.totalInitialInvestment,
      missingInputs,
      guidanceMessage: 'Complete selling price, operating cost and investment inputs to calculate ROI.'
    };
  }

  const roiPct = +( ((profitWaterfall.annualOperatingProfit / investment.totalInitialInvestment) * 100).toFixed(1) );

  return {
    status: 'CALCULATED',
    roiPct,
    displayValue: `${roiPct}%`,
    formulaDescription: 'Annual Net Operating Profit / Total Initial Investment × 100',
    annualNetOperatingProfit: profitWaterfall.annualOperatingProfit,
    totalInitialInvestment: investment.totalInitialInvestment,
    missingInputs: []
  };
}

/**
 * 9. Evaluates Break-Even Point
 */
export function calculateDynamicBreakEven(
  profitWaterfall: ProfitWaterfall,
  variableCosts: VariableCostsBreakdown,
  fixedCosts: FixedCostsBreakdown
): BreakEvenAnalysis {
  const sellingPrice = profitWaterfall.sellingPricePerUnit;
  const unitVarCost = variableCosts.unitVariableCost;

  if (sellingPrice <= 0 || sellingPrice <= unitVarCost) {
    return {
      status: 'INDETERMINATE',
      contributionMarginPerUnit: Math.max(0, sellingPrice - unitVarCost),
      breakEvenUnitsMonthly: 0,
      breakEvenRevenueMonthly: 0,
      breakEvenMonthsToRecoverFixedCost: 0,
      message: 'Break-even cannot be calculated with current pricing/cost structure.'
    };
  }

  const contributionMargin = +( (sellingPrice - unitVarCost).toFixed(2) );
  const breakEvenUnitsMonthly = Math.ceil(fixedCosts.totalMonthlyFixed / contributionMargin);
  const breakEvenRevenueMonthly = Math.round(breakEvenUnitsMonthly * sellingPrice);

  return {
    status: 'CALCULATED',
    contributionMarginPerUnit: contributionMargin,
    breakEvenUnitsMonthly,
    breakEvenRevenueMonthly,
    breakEvenMonthsToRecoverFixedCost: 1
  };
}

/**
 * 10. Evaluates Dynamic Payback Period
 */
export function calculateDynamicPayback(
  investment: InvestmentBreakdown,
  profitWaterfall: ProfitWaterfall
): PaybackAnalysis {
  // Operating cash flow = EBITDA
  const annualOperatingCashFlow = profitWaterfall.annualEBITDA;
  const initialInvestment = investment.totalInitialInvestment;

  if (initialInvestment <= 0 || annualOperatingCashFlow <= 0) {
    return {
      status: 'UNAVAILABLE',
      paybackYears: null,
      paybackMonths: null,
      displayValue: 'Payback unavailable',
      annualOperatingCashFlow,
      totalInitialInvestment: initialInvestment,
      explanation: 'Requires valid positive operating cash flow and specified initial investment.'
    };
  }

  const paybackYears = +( (initialInvestment / annualOperatingCashFlow).toFixed(1) );
  const paybackMonths = Math.round(paybackYears * 12);

  return {
    status: 'CALCULATED',
    paybackYears,
    paybackMonths,
    displayValue: `${paybackYears} Years (${paybackMonths} mo)`,
    annualOperatingCashFlow,
    totalInitialInvestment: initialInvestment,
    explanation: 'Initial Investment / Annual Operating Cash Flow (EBITDA)'
  };
}

/**
 * 11. Master Business Financial Evaluator (Single Source of Truth)
 */
export function evaluateBusinessFinancialReport(
  biz: { domain?: string; inputs?: Record<string, any>; latestAnalysis?: any } | null,
  marketObservation?: any
): DynamicFinancialReport {
  const domain = biz?.domain || 'foodtech';
  const inputs = biz?.inputs || {};
  const isAgri = domain === 'agriculture';

  // Verified Market Price if available
  const marketPrice = marketObservation?.current?.price ||
    marketObservation?.modalPricePerQtl ? (marketObservation.modalPricePerQtl / 100) : undefined;

  const production = calculateProductionTransformation(inputs, domain);
  const investment = calculateTotalInitialInvestment(inputs);
  const variableCosts = calculateDynamicVariableCosts(inputs, production);
  const fixedCosts = calculateDynamicFixedCosts(inputs);
  const depreciation = calculateDepreciation(investment, inputs);
  const financing = calculateFinancingDetails(investment, inputs);
  const profitWaterfall = calculateProfitWaterfall(
    production,
    variableCosts,
    fixedCosts,
    depreciation,
    financing,
    inputs,
    marketPrice
  );
  const roi = calculateDynamicRoi(profitWaterfall, investment, inputs);
  const breakEven = calculateDynamicBreakEven(profitWaterfall, variableCosts, fixedCosts);
  const payback = calculateDynamicPayback(investment, profitWaterfall);

  // Validation
  const missingFields: string[] = [];
  if (!isAgri) {
    if (!production.dailyInputKg || production.dailyInputKg <= 0) missingFields.push('Daily production / processing capacity');
    if (!profitWaterfall.isSellingPriceProvided || profitWaterfall.sellingPricePerUnit <= 0) missingFields.push('Selling price per unit');
    if (variableCosts.rawMaterialMonthly <= 0 && inputs.rawMaterialCostPerKg === undefined) missingFields.push('Raw material procurement price');
    if (investment.totalInitialInvestment <= 0) missingFields.push('Initial capital investment outlay');
  } else {
    if (!inputs.area && !inputs.areaAcres) missingFields.push('Cultivation land area');
    if (!inputs.crop && !inputs.cropName) missingFields.push('Crop / commodity selection');
  }

  const isValid = missingFields.length === 0 && roi.status === 'CALCULATED';

  return {
    isValid,
    status: isValid ? 'ANALYSIS_COMPLETE' : 'INPUTS_INCOMPLETE',
    statusLabel: isValid ? 'Analysis Complete' : 'Inputs Incomplete',
    missingFields,
    production,
    investment,
    variableCosts,
    fixedCosts,
    depreciation,
    financing,
    profitWaterfall,
    roi,
    breakEven,
    payback,
    howCalculated: {
      roi: 'Annual Net Operating Profit ÷ Total Initial Investment × 100',
      grossProfit: 'Turnover Revenue − Total Variable Production Costs',
      operatingProfit: 'Gross Profit − Fixed Operating Overheads (EBIT)',
      ebitda: 'Revenue − Operating Cash Expenses (Excludes Depreciation)',
      breakEven: 'Fixed Costs ÷ Unit Contribution Margin (Price − Unit Variable Cost)',
      payback: 'Total Initial Investment ÷ Annual Operating Cash Flow (EBITDA)',
      depreciation: `Straight-line asset depreciation over ${depreciation.usefulLifeYears} years useful lifespan`
    }
  };
}


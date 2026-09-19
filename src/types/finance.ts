/** Financial calculation types */

export interface ProjectCostBreakdown {
  marginCapital: number;
  marginPercentage: number;
  totalProjectCost: number;
  loanAmount: number;
  loanPercentage: number;
}

export interface EMIResult {
  monthlyEMI: number;
  totalInterest: number;
  totalRepayment: number;
  principal: number;
  annualInterestRate: number;
  tenureMonths: number;
}

export interface RepaymentEntry {
  period: number;
  month: string;
  openingPrincipal: number;
  interest: number;
  principalPaid: number;
  payment: number;
  closingBalance: number;
}

export interface RepaymentSchedule {
  entries: RepaymentEntry[];
  totalPrincipal: number;
  totalInterest: number;
  totalRepayment: number;
  moratoriumMonths: number;
  moratoriumInterest: number;
}

export interface OperatingCostItem {
  id: string;
  category: string;
  label: string;
  amount: number;
}

export interface OperatingCost {
  items: OperatingCostItem[];
  totalMonthly: number;
  totalAnnual: number;
}

export interface WorkingCapitalInputs {
  inventory: number;
  rawMaterial: number;
  labour: number;
  transport: number;
  utilities: number;
  emergencyReserve: number;
}

export interface WorkingCapital {
  inputs: WorkingCapitalInputs;
  totalMonthly: number;
}

export interface RevenueProjection {
  sellingPrice: number;
  monthlySales: number;
  variableCostPerUnit: number;
  fixedCostMonthly: number;
  growthRateAnnual: number;
}

export interface ProfitProjection {
  month: number;
  revenue: number;
  variableCost: number;
  fixedCost: number;
  grossProfit: number;
  operatingProfit: number;
  cumulativeProfit: number;
}

export interface BreakEvenResult {
  breakEvenUnits: number;
  breakEvenRevenue: number;
  breakEvenMonths: number;
  contributionMargin: number;
}

export interface CashFlowEntry {
  month: number;
  inflow: number;
  outflow: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
}

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

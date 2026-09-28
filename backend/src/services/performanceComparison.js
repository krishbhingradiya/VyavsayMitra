/**
 * VYAVSAYMITRA — Performance Comparison Engine (Phase 11)
 *
 * Compares Projected (Baseline Engine) vs Actual (User-Reported / Verified) metrics.
 * Deterministically computes variance. Never synthesizes missing actual data.
 */

const dbRepository = require('../models/dbRepository');

/**
 * Extracts normalized projected metrics from latest business feasibility analysis.
 */
function extractProjectedMetrics(analysis) {
  if (!analysis) {

    return {
      investment: null,
      annualRevenue: null,
      monthlyRevenue: null,
      annualOperatingCost: null,
      monthlyOperatingCost: null,
      funding: null,
      production: null
    };
  }


  const fin = analysis.financial_summary || analysis.financialSummary || analysis || {};
  const cap = analysis.capital_investment || analysis.capitalInvestment || {};
  const op = analysis.operating_costs || analysis.operatingCosts || {};
  const rev = analysis.revenue_projections || analysis.revenueProjections || {};

  const projectedInvestment =
    fin.totalProjectCost ??
    fin.totalInvestment?.value ??
    fin.projectCost ??
    cap.totalProjectCost ??
    null;

  const projectedRevenue =
    fin.annualGrossRevenue ??
    fin.annualRevenue ??
    fin.grossAnnualRevenue ??
    fin.grossRevenue ??
    rev.grossAnnualRevenue ??
    null;

  const projectedMonthlyRevenue = projectedRevenue ? Math.round(projectedRevenue / 12) : null;

  const projectedOperatingCost =
    fin.annualOperatingCost ??
    fin.totalOperatingCosts ??
    fin.annualOpex ??
    op.totalAnnualOperatingCost ??
    null;

  const projectedMonthlyOperatingCost = projectedOperatingCost ? Math.round(projectedOperatingCost / 12) : null;

  const projectedFunding =
    fin.bankLoanRequired ??
    fin.bankLoanRequirement ??
    fin.termLoanRequirement ??
    null;

  const projectedProduction =
    analysis.annualProduction ??
    analysis.capacity ??
    fin.annualProduction ??
    null;

  return {
    investment: projectedInvestment,
    annualRevenue: projectedRevenue,
    monthlyRevenue: projectedMonthlyRevenue,
    annualOperatingCost: projectedOperatingCost,
    monthlyOperatingCost: projectedMonthlyOperatingCost,
    funding: projectedFunding,
    production: projectedProduction
  };
}

/**
 * Compares projected baselines against recorded outcomes for a business.
 */
async function comparePerformance(businessId) {
  if (!businessId) {
    throw new Error('Business ID is required for performance comparison.');
  }

  // 1. Get latest analysis snapshot
  const analysis = await dbRepository.getLatestAnalysis(businessId).catch(() => null);
  const projected = extractProjectedMetrics(analysis);

  // 2. Get recorded outcomes
  const outcomes = await dbRepository.listBusinessOutcomes(businessId).catch(() => []);

  // Group latest outcome by type
  const actualsByType = {};
  for (const item of outcomes) {
    if (!actualsByType[item.outcome_type]) {
      actualsByType[item.outcome_type] = item; // First one is latest due to ORDER BY created_at DESC
    }
  }

  const comparisons = [];

  // Metric 1: Total Investment
  {
    const proj = projected.investment;
    const actRecord = actualsByType['actual_investment'];
    const act = actRecord ? (typeof actRecord.value === 'number' ? actRecord.value : parseFloat(actRecord.value)) : null;

    if (proj !== null && act !== null && !isNaN(act)) {
      const variance = act - proj;
      const variancePercentage = proj !== 0 ? +((variance / proj) * 100).toFixed(1) : 0;
      comparisons.push({
        metric: 'Total Investment',
        metricKey: 'investment',
        unit: actRecord.unit || 'INR',
        projected: proj,
        actual: act,
        variance,
        variancePercentage,
        source: actRecord.source || 'user_reported',
        period: actRecord.period || '',
        status: 'available'
      });
    } else {
      comparisons.push({
        metric: 'Total Investment',
        metricKey: 'investment',
        unit: 'INR',
        projected: proj,
        actual: act,
        variance: null,
        variancePercentage: null,
        source: actRecord ? actRecord.source : null,
        period: actRecord ? actRecord.period : '',
        status: act === null ? 'Actual data not available yet.' : 'Projected baseline not available.'
      });
    }
  }

  // Metric 2: Monthly Revenue
  {
    const proj = projected.monthlyRevenue;
    const actRecord = actualsByType['actual_monthly_revenue'];
    const act = actRecord ? (typeof actRecord.value === 'number' ? actRecord.value : parseFloat(actRecord.value)) : null;

    if (proj !== null && act !== null && !isNaN(act)) {
      const variance = act - proj;
      const variancePercentage = proj !== 0 ? +((variance / proj) * 100).toFixed(1) : 0;
      comparisons.push({
        metric: 'Monthly Revenue',
        metricKey: 'monthly_revenue',
        unit: actRecord.unit || 'INR/month',
        projected: proj,
        actual: act,
        variance,
        variancePercentage,
        source: actRecord.source || 'user_reported',
        period: actRecord.period || '',
        status: 'available'
      });
    } else {
      comparisons.push({
        metric: 'Monthly Revenue',
        metricKey: 'monthly_revenue',
        unit: 'INR/month',
        projected: proj,
        actual: act,
        variance: null,
        variancePercentage: null,
        source: actRecord ? actRecord.source : null,
        period: actRecord ? actRecord.period : '',
        status: act === null ? 'Actual data not available yet.' : 'Projected baseline not available.'
      });
    }
  }

  // Metric 3: Operating Cost
  {
    const proj = projected.monthlyOperatingCost;
    const actRecord = actualsByType['actual_operating_cost'];
    const act = actRecord ? (typeof actRecord.value === 'number' ? actRecord.value : parseFloat(actRecord.value)) : null;

    if (proj !== null && act !== null && !isNaN(act)) {
      const variance = act - proj;
      const variancePercentage = proj !== 0 ? +((variance / proj) * 100).toFixed(1) : 0;
      comparisons.push({
        metric: 'Operating Cost',
        metricKey: 'operating_cost',
        unit: actRecord.unit || 'INR/month',
        projected: proj,
        actual: act,
        variance,
        variancePercentage,
        source: actRecord.source || 'user_reported',
        period: actRecord.period || '',
        status: 'available'
      });
    } else {
      comparisons.push({
        metric: 'Operating Cost',
        metricKey: 'operating_cost',
        unit: 'INR/month',
        projected: proj,
        actual: act,
        variance: null,
        variancePercentage: null,
        source: actRecord ? actRecord.source : null,
        period: actRecord ? actRecord.period : '',
        status: act === null ? 'Actual data not available yet.' : 'Projected baseline not available.'
      });
    }
  }

  // Metric 4: Production Quantity
  {
    const proj = projected.production;
    const actRecord = actualsByType['actual_production_quantity'];
    const act = actRecord ? (typeof actRecord.value === 'number' ? actRecord.value : parseFloat(actRecord.value)) : null;

    if (proj !== null && act !== null && !isNaN(act)) {
      const variance = act - proj;
      const variancePercentage = proj !== 0 ? +((variance / proj) * 100).toFixed(1) : 0;
      comparisons.push({
        metric: 'Production Quantity',
        metricKey: 'production_quantity',
        unit: actRecord.unit || 'units',
        projected: proj,
        actual: act,
        variance,
        variancePercentage,
        source: actRecord.source || 'user_reported',
        period: actRecord.period || '',
        status: 'available'
      });
    } else {
      comparisons.push({
        metric: 'Production Quantity',
        metricKey: 'production_quantity',
        unit: actRecord?.unit || 'units',
        projected: proj,
        actual: act,
        variance: null,
        variancePercentage: null,
        source: actRecord ? actRecord.source : null,
        period: actRecord ? actRecord.period : '',
        status: act === null ? 'Actual data not available yet.' : 'Projected baseline not available.'
      });
    }
  }

  // Metric 5: Funding Requirement vs Received
  {
    const proj = projected.funding;
    const actRecord = actualsByType['funding_received'];
    const act = actRecord ? (typeof actRecord.value === 'number' ? actRecord.value : parseFloat(actRecord.value)) : null;

    if (proj !== null && act !== null && !isNaN(act)) {
      const variance = act - proj;
      const variancePercentage = proj !== 0 ? +((variance / proj) * 100).toFixed(1) : 0;
      comparisons.push({
        metric: 'Funding Requirement',
        metricKey: 'funding_requirement',
        unit: actRecord.unit || 'INR',
        projected: proj,
        actual: act,
        variance,
        variancePercentage,
        source: actRecord.source || 'user_reported',
        period: actRecord.period || '',
        status: 'available'
      });
    } else {
      comparisons.push({
        metric: 'Funding Requirement',
        metricKey: 'funding_requirement',
        unit: 'INR',
        projected: proj,
        actual: act,
        variance: null,
        variancePercentage: null,
        source: actRecord ? actRecord.source : null,
        period: actRecord ? actRecord.period : '',
        status: act === null ? 'Actual data not available yet.' : 'Projected baseline not available.'
      });
    }
  }

  return {
    businessId,
    hasAnalysis: Boolean(analysis),
    hasOutcomes: outcomes.length > 0,
    comparisons,
    allRecordedOutcomes: outcomes
  };
}

module.exports = {
  extractProjectedMetrics,
  comparePerformance
};

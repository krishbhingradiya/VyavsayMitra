/**
 * VYAVSAYMITRA — Deterministic Scenario Analysis Engine
 *
 * Generates transparent BASE / CONSERVATIVE / UPSIDE scenarios using
 * mathematically defined, configurable assumptions applied to verified
 * financial calculations.
 *
 * CORE RULE:
 * - Every scenario assumption is configured, visible, and traceable.
 * - Gemini NEVER selects scenario percentages.
 * - All results are labeled as PROJECTED, not GUARANTEED.
 */

const DEFAULT_SCENARIO_CONFIG = {
  conservative: {
    label: 'Conservative Case',
    revenueMultiplier: 0.85,     // -15% revenue
    costMultiplier: 1.10,         // +10% costs
    priceMultiplier: 0.90,        // -10% selling price
    productionMultiplier: 0.90,   // -10% production volume
    demandMultiplier: 0.85,       // -15% demand
    assumptions: [
      'Revenue reduced by 15% (adverse market conditions)',
      'Operating costs increased by 10% (input cost inflation)',
      'Selling price reduced by 10% (price competition or glut)',
      'Production volume reduced by 10% (operational challenges)',
      'Demand reduced by 15% (seasonal or market contraction)'
    ]
  },
  base: {
    label: 'Base Case',
    revenueMultiplier: 1.0,
    costMultiplier: 1.0,
    priceMultiplier: 1.0,
    productionMultiplier: 1.0,
    demandMultiplier: 1.0,
    assumptions: [
      'Revenue at verified market observation levels',
      'Operating costs at current verified estimates',
      'Selling price at verified mandi/market modal price',
      'Production volume at verified capacity estimate',
      'Demand at verified local market assessment'
    ]
  },
  upside: {
    label: 'Upside Case',
    revenueMultiplier: 1.15,      // +15% revenue
    costMultiplier: 0.95,          // -5% costs (economies of scale)
    priceMultiplier: 1.10,         // +10% selling price
    productionMultiplier: 1.10,    // +10% production volume
    demandMultiplier: 1.15,        // +15% demand
    assumptions: [
      'Revenue increased by 15% (favorable market conditions)',
      'Operating costs reduced by 5% (economies of scale / efficiency)',
      'Selling price increased by 10% (quality premium or off-season advantage)',
      'Production volume increased by 10% (operational optimization)',
      'Demand increased by 15% (market expansion or seasonal peak)'
    ]
  }
};

/**
 * Generates scenario analysis from verified base financial data.
 *
 * @param {Object} baseFinancials - Verified financial output from calculation engine
 * @param {Object} [customConfig] - Optional custom scenario configuration overrides
 * @returns {Object} Structured scenario comparison with provenance
 */
function generateScenarioAnalysis(baseFinancials, customConfig = {}) {
  if (!baseFinancials || typeof baseFinancials !== 'object') {
    return {
      status: 'INSUFFICIENT_DATA',
      message: 'Verified financial data is required for scenario analysis.',
      scenarios: []
    };
  }

  // Extract base metrics from verified analysis
  const baseRevenue = extractNumeric(baseFinancials, 'annualRevenue', 'totalRevenue', 'grossReturn') || 0;
  const baseOpCost = extractNumeric(baseFinancials, 'annualOperatingCost', 'totalCost', 'costA1Total') || 0;
  const baseNetProfit = extractNumeric(baseFinancials, 'netAnnualProfit', 'netProfit', 'netSurplus') || (baseRevenue - baseOpCost);
  const baseTotalInvestment = extractNumeric(baseFinancials, 'totalProjectCost', 'totalInvestment') || 0;
  const basePromoterEquity = extractNumeric(baseFinancials, 'promoterEquity', 'ownEquityContribution') || 0;
  const baseBankLoan = extractNumeric(baseFinancials, 'bankLoanRequirement', 'termLoanRequirement') || 0;

  if (baseRevenue <= 0 && baseOpCost <= 0) {
    return {
      status: 'INSUFFICIENT_DATA',
      message: 'Revenue and cost data are required for scenario analysis.',
      scenarios: []
    };
  }

  const config = {
    conservative: { ...DEFAULT_SCENARIO_CONFIG.conservative, ...(customConfig.conservative || {}) },
    base: { ...DEFAULT_SCENARIO_CONFIG.base, ...(customConfig.base || {}) },
    upside: { ...DEFAULT_SCENARIO_CONFIG.upside, ...(customConfig.upside || {}) }
  };

  const scenarios = ['base', 'conservative', 'upside'].map(scenarioKey => {
    const sc = config[scenarioKey];
    const adjustedRevenue = Math.round(baseRevenue * sc.revenueMultiplier);
    const adjustedCost = Math.round(baseOpCost * sc.costMultiplier);
    const adjustedNetProfit = adjustedRevenue - adjustedCost;
    const adjustedRoi = baseTotalInvestment > 0
      ? parseFloat(((adjustedNetProfit / baseTotalInvestment) * 100).toFixed(1))
      : 0;

    // Break-even: months to recover total investment from monthly net income
    const monthlyNet = adjustedNetProfit / 12;
    const breakEvenMonths = monthlyNet > 0 ? Math.ceil(baseTotalInvestment / monthlyNet) : null;

    // DSCR approximation
    const annualDebtService = baseBankLoan > 0
      ? Math.round(baseBankLoan / 5) + Math.round(baseBankLoan * 0.08) // crude principal + interest
      : 0;
    const dscr = annualDebtService > 0
      ? parseFloat((adjustedNetProfit / annualDebtService).toFixed(2))
      : null;

    // Profitability margin
    const profitMarginPct = adjustedRevenue > 0
      ? parseFloat(((adjustedNetProfit / adjustedRevenue) * 100).toFixed(1))
      : 0;

    return {
      scenarioKey,
      label: sc.label,
      adjustedRevenue,
      adjustedOperatingCost: adjustedCost,
      adjustedNetProfit,
      adjustedRoi,
      profitMarginPct,
      breakEvenMonths,
      dscr,
      isViable: adjustedNetProfit > 0,
      multipliers: {
        revenue: sc.revenueMultiplier,
        cost: sc.costMultiplier,
        price: sc.priceMultiplier,
        production: sc.productionMultiplier,
        demand: sc.demandMultiplier
      },
      assumptions: sc.assumptions,
      dataStatus: scenarioKey === 'base' ? 'VERIFIED' : 'PROJECTED'
    };
  });

  return {
    status: 'SUCCESS',
    baseMetrics: {
      totalInvestment: baseTotalInvestment,
      annualRevenue: baseRevenue,
      annualOperatingCost: baseOpCost,
      netAnnualProfit: baseNetProfit,
      promoterEquity: basePromoterEquity,
      bankLoanRequirement: baseBankLoan
    },
    scenarios,
    configUsed: {
      conservative: {
        revenueMultiplier: config.conservative.revenueMultiplier,
        costMultiplier: config.conservative.costMultiplier
      },
      upside: {
        revenueMultiplier: config.upside.revenueMultiplier,
        costMultiplier: config.upside.costMultiplier
      }
    },
    provenance: {
      source: 'VYAVSAYMITRA Deterministic Scenario Engine',
      sourceType: 'FORMULA',
      method: 'Configurable multiplier-based sensitivity analysis',
      timestamp: new Date().toISOString(),
      assumptions: [
        'Base case uses verified financial calculation outputs',
        'Conservative and upside cases apply configurable percentage adjustments',
        'All scenario results are PROJECTED estimates, not guaranteed outcomes'
      ]
    }
  };
}

/**
 * Safely extract a numeric value from a financial object,
 * trying multiple possible field names.
 */
function extractNumeric(obj, ...fieldNames) {
  for (const name of fieldNames) {
    const val = obj[name];
    if (val !== undefined && val !== null) {
      if (typeof val === 'object' && val.value !== undefined) {
        const n = parseFloat(val.value);
        if (!isNaN(n)) return n;
      }
      const n = parseFloat(val);
      if (!isNaN(n)) return n;
    }
  }
  return null;
}

module.exports = {
  generateScenarioAnalysis,
  DEFAULT_SCENARIO_CONFIG
};

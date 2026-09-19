/**
 * VYAVSAYMITRA — Production Risk Analysis Service
 * 
 * Conducts multi-dimensional risk appraisal for rural micro-enterprises:
 * - Debt Service Coverage Risk (DSCR Stress)
 * - Break-even Safety Margin
 * - Market Price Volatility Sensitivity (-10% Stress)
 * - Operational Cost Inflation Sensitivity (+10% Input Surge)
 * - Specific Actionable Mitigation Roadmaps
 */

/**
 * Evaluates comprehensive risk profile based on business financial metrics
 * 
 * @param {Object} financials - Calculated financial statement from FormulaEngine
 * @param {string} businessType - 'dairy' | 'poultry' | 'agriculture' | 'food-processing' | 'general_msme'
 * @param {Object} [stressAnalysis] - Optional domain stress scenarios
 * @returns {Object} Structured risk analysis with rating, score, and mitigations
 */
function analyzeBusinessRisks(financials, businessType = 'general_msme', stressAnalysis = null) {
  const dscr = financials.dscr?.value !== undefined ? parseFloat(financials.dscr.value) : (parseFloat(financials.dscr) || 1.5);
  const roi = financials.annualRoiPct?.value !== undefined ? parseFloat(financials.annualRoiPct.value) : (parseFloat(financials.annualRoiPct) || 20);
  const netProfit = financials.netAnnualProfit?.value !== undefined ? parseFloat(financials.netAnnualProfit.value) : (parseFloat(financials.netAnnualProfit) || 0);
  const annualRevenue = financials.annualRevenue?.value !== undefined ? parseFloat(financials.annualRevenue.value) : (parseFloat(financials.annualRevenue) || 100000);
  const annualOpex = financials.annualOperatingCost?.value !== undefined ? parseFloat(financials.annualOperatingCost.value) : (parseFloat(financials.annualOperatingCost) || 75000);

  // 1. Debt Service Coverage Risk Assessment
  let dscrRiskLevel = 'LOW';
  let dscrScore = 85;
  let dscrMessage = 'Strong debt service capacity. High probability of bank loan sanction.';
  if (dscr < 1.2) {
    dscrRiskLevel = 'HIGH';
    dscrScore = 40;
    dscrMessage = 'High debt service risk. Net operating surplus provides tight buffer for loan repayment.';
  } else if (dscr < 1.5) {
    dscrRiskLevel = 'MODERATE';
    dscrScore = 65;
    dscrMessage = 'Moderate debt service capacity. Loan sanction requires collateral or CGTMSE guarantee.';
  }

  // 2. Price Volatility Sensitivity (-10% revenue stress)
  const stressedRevenue = annualRevenue * 0.90;
  const stressedProfit = stressedRevenue - annualOpex;
  const priceStressSurvival = stressedProfit > 0;

  // 3. Input Cost Inflation Sensitivity (+10% operational expense surge)
  const inflatedOpex = annualOpex * 1.10;
  const costStressProfit = annualRevenue - inflatedOpex;
  const costStressSurvival = costStressProfit > 0;

  // 4. Overall Risk Rating Synthesis
  let overallRiskRating = 'LOW';
  let overallHealthScore = 80;
  if (!priceStressSurvival || !costStressSurvival || dscr < 1.2) {
    overallRiskRating = 'HIGH';
    overallHealthScore = 45;
  } else if (dscr < 1.5 || roi < 18) {
    overallRiskRating = 'MODERATE';
    overallHealthScore = 68;
  }

  // 5. Specific Risk Mitigations based on Business Sector
  const identifiedRisks = [];

  if (businessType === 'dairy') {
    identifiedRisks.push({
      category: 'Biological & Health',
      riskName: 'Mastitis and Foot & Mouth Disease (FMD)',
      severity: 'HIGH',
      probability: 'MODERATE',
      mitigation: 'Enroll in mandatory Animal Husbandry Department bi-annual FMD/HS vaccination and maintain 4.5% cattle insurance cover.'
    });
    identifiedRisks.push({
      category: 'Input Cost',
      riskName: 'Green and Dry Fodder Price Spikes (Summer)',
      severity: 'MODERATE',
      probability: 'HIGH',
      mitigation: 'Prepare silage bunkers during peak green harvest and enter advance purchase contracts with local crop farmers for dry straw.'
    });
  } else if (businessType === 'poultry') {
    identifiedRisks.push({
      category: 'Market Pricing',
      riskName: 'Live Bird Farmgate Price Crash',
      severity: 'HIGH',
      probability: 'MODERATE',
      mitigation: 'Join formal poultry cooperative or enter contract farming integration agreement guaranteeing fixed rearing charges per kg.'
    });
    identifiedRisks.push({
      category: 'Biological & Weather',
      riskName: 'Summer Heat Stress and Mortality',
      severity: 'HIGH',
      probability: 'MODERATE',
      mitigation: 'Install low-cost thatch roof insulation, water foggers, and ensure stocking density does not exceed 1.1 sq.ft per bird.'
    });
  } else if (businessType === 'agriculture' || businessType === 'crop') {
    identifiedRisks.push({
      category: 'Climate & Water',
      riskName: 'Delayed Monsoon or Seasonal Drought',
      severity: 'HIGH',
      probability: 'MODERATE',
      mitigation: 'Adopt PMKSY subsidized drip micro-irrigation and enroll in Pradhan Mantri Fasal Bima Yojana (PMFBY) crop insurance.'
    });
    identifiedRisks.push({
      category: 'Market Realization',
      riskName: 'Harvest Glut Price Collapse',
      severity: 'HIGH',
      probability: 'HIGH',
      mitigation: 'Utilize e-NAM warehouse receipt pledge finance to avoid distress selling, or deliver directly to FCI MSP procurement centers.'
    });
  } else if (businessType === 'food-processing') {
    identifiedRisks.push({
      category: 'Infrastructure',
      riskName: 'Commercial Electricity Tariff Hike & Grid Outages',
      severity: 'MODERATE',
      probability: 'HIGH',
      mitigation: 'Utilize PMFME subsidy to install rooftop solar PV net-metering system and energy-efficient 3-phase induction motors.'
    });
    identifiedRisks.push({
      category: 'Working Capital',
      riskName: 'Seasonal Raw Grain Storage Spoilage',
      severity: 'MODERATE',
      probability: 'MODERATE',
      mitigation: 'Invest in hermetic grain storage silos with moisture meters to maintain procurement moisture below 12%.'
    });
  } else {
    identifiedRisks.push({
      category: 'Working Capital',
      riskName: 'Customer Credit Delays',
      severity: 'MODERATE',
      probability: 'HIGH',
      mitigation: 'Enforce strict 15-day maximum credit limit and maintain 60-day liquid operational reserve.'
    });
  }

  return {
    overallRiskRating,
    healthScore: overallHealthScore,
    debtServiceCoverage: {
      dscrValue: dscr,
      riskLevel: dscrRiskLevel,
      assessment: dscrMessage
    },
    stressScenarios: {
      priceDrop10Pct: {
        scenario: '10% drop in farmgate/retail selling price',
        stressedNetProfit: Math.round(stressedProfit),
        isViable: priceStressSurvival
      },
      costInflation10Pct: {
        scenario: '10% surge in raw material and operational costs',
        stressedNetProfit: Math.round(costStressProfit),
        isViable: costStressSurvival
      }
    },
    identifiedRisks,
    provenance: {
      source: 'NABARD Credit Appraisal Norms & RBI Priority Sector Guidelines',
      sourceType: 'FORMULA',
      confidence: 0.95
    }
  };
}

module.exports = {
  analyzeBusinessRisks
};

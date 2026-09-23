/**
 * VYAVSAYMITRA — Master Financial & Business Advisory Calculation Engine
 * 
 * Central orchestration engine combining:
 * 1. NABARD domain models (Dairy, Poultry, Agro-Processing)
 * 2. DES Cost of Cultivation + AGMARKNET Mandi + ML Yield Models (Crop)
 * 3. Generalized MSME Financial Structuring Engine for novel business ideas
 * 4. Government Scheme Matcher (PMEGP, MUDRA, PMFME, AHIDF, KCC)
 * 5. Multi-scenario sensitivity stress testing
 * 6. Strict end-to-end data provenance tracking
 */

const { calculateDairyEconomics } = require('../business/dairyEngine');
const { calculatePoultryEconomics } = require('../business/poultryEngine');
const { calculateCropEconomics } = require('../business/cropEngine');
const { calculateFoodProcessingEconomics } = require('../business/foodProcessingEngine');
const { runFoodTechBusinessModel } = require('../business/foodtech');
const { classifyBusinessIdea } = require('../business/classifier');
const dataService = require('../data/dataService');

/**
 * Generalized MSME financial structuring engine for novel/custom business ideas
 */
function calculateGeneralMsmeEconomics(params = {}) {
  const businessName = params.businessName || params.businessIdea || 'Micro Enterprise';
  const state = params.state || 'National';
  const district = params.district || '';
  const isRural = params.isRural !== false;
  const isSpecialCategory = !!params.isSpecialCategory;

  // Investment sizing
  const fixedCapital = params.investmentRequired && parseFloat(params.investmentRequired) > 0
    ? parseFloat(params.investmentRequired)
    : 150000;

  const monthlyWorkingCapital = params.monthlyOpex && parseFloat(params.monthlyOpex) > 0
    ? parseFloat(params.monthlyOpex)
    : 25000;

  const totalProjectCost = fixedCapital + (monthlyWorkingCapital * 2); // 2-month working capital buffer

  // Revenue & OpEx
  const annualOpex = monthlyWorkingCapital * 12;
  const annualRevenue = params.expectedRevenue && parseFloat(params.expectedRevenue) > 0
    ? parseFloat(params.expectedRevenue)
    : Math.round(annualOpex * 1.35); // 35% standard MSME gross markup

  const netAnnualProfit = annualRevenue - annualOpex;
  const netMonthlyProfit = Math.round(netAnnualProfit / 12);
  const netProfitMarginPct = +( (netAnnualProfit / annualRevenue) * 100 ).toFixed(1);
  const annualRoiPct = +( (netAnnualProfit / totalProjectCost) * 100 ).toFixed(1);

  // Break-even
  const fixedCostShare = fixedCapital * 0.15; // depreciation & static overhead
  const variableCostShare = annualOpex - fixedCostShare;
  const contributionMarginRatio = (annualRevenue - variableCostShare) / annualRevenue;
  const breakEvenRevenueAnnual = contributionMarginRatio > 0 ? Math.round(fixedCostShare / contributionMarginRatio) : annualOpex;
  const breakEvenMonthlyRevenue = Math.round(breakEvenRevenueAnnual / 12);

  // Financing
  const ownMarginPct = 10;
  const ownEquity = params.customAvailableCapital !== undefined && params.customAvailableCapital !== null
    ? Math.min(totalProjectCost, parseFloat(params.customAvailableCapital))
    : Math.round((totalProjectCost * ownMarginPct) / 100);

  const bankLoanRequired = Math.max(0, totalProjectCost - ownEquity);
  const interestRatePct = 8.5;
  const loanTenureYears = 5;

  const monthlyInterestRate = (interestRatePct / 100) / 12;
  const totalTenureMonths = loanTenureYears * 12;
  let annualDebtService = 0;
  if (bankLoanRequired > 0) {
    const monthlyEmi = (bankLoanRequired * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, totalTenureMonths)) /
      (Math.pow(1 + monthlyInterestRate, totalTenureMonths) - 1);
    annualDebtService = monthlyEmi * 12;
  }

  const dscr = annualDebtService > 0
    ? +( (netAnnualProfit + (fixedCapital * 0.10)) / annualDebtService ).toFixed(2)
    : 3.0;

  const paybackYears = netAnnualProfit > 0
    ? +( (totalProjectCost / netAnnualProfit).toFixed(1) )
    : 99.0;

  // Schemes
  const eligibleSchemes = dataService.getEligibleSchemes({
    businessType: 'all',
    projectCost: totalProjectCost,
    isRural,
    isSpecialCategory
  });

  return {
    businessType: 'general_msme',
    unitTitle: `${businessName} (Rural Micro-Enterprise)`,
    location: { state, district, isRural },
    capitalInvestment: {
      fixedCapitalSetup: fixedCapital,
      workingCapitalBuffer: monthlyWorkingCapital * 2,
      totalFixedCapital: fixedCapital,
      totalProjectCost: totalProjectCost
    },
    operationalMetrics: {
      monthlyOperatingExpenses: monthlyWorkingCapital,
      annualOperatingExpenses: annualOpex,
      estimatedBreakEvenMonthlyRevenue: breakEvenMonthlyRevenue
    },
    operatingExpenses: {
      totalAnnualOpex: annualOpex,
      monthlyOpex: monthlyWorkingCapital
    },
    revenue: {
      annualGrossRevenue: annualRevenue,
      monthlyRevenue: Math.round(annualRevenue / 12),
      breakEvenRevenueAnnual: breakEvenRevenueAnnual
    },
    financialViability: {
      netAnnualProfit: netAnnualProfit,
      netMonthlyProfit: netMonthlyProfit,
      netProfitMarginPct: netProfitMarginPct,
      annualRoiPct: annualRoiPct,
      dscr: dscr,
      paybackPeriodYears: paybackYears,
      viabilityRating: dscr >= 1.4 && annualRoiPct >= 20 ? 'HIGHLY_FEASIBLE' : (dscr >= 1.1 ? 'MODERATELY_FEASIBLE' : 'HIGH_RISK')
    },
    financingStructure: {
      totalProjectCost: totalProjectCost,
      recommendedOwnMarginPct: ownMarginPct,
      ownEquityContribution: ownEquity,
      bankLoanRequired: bankLoanRequired,
      estimatedInterestRatePct: interestRatePct,
      tenureYears: loanTenureYears,
      annualDebtService: Math.round(annualDebtService)
    },
    stressAnalysis: {
      revenueDrop15: {
        description: '15% drop in monthly sales turnover',
        revisedNetProfit: Math.round((annualRevenue * 0.85) - annualOpex),
        status: ((annualRevenue * 0.85) - annualOpex) > 0 ? 'Viable' : 'Under Stress'
      },
      opexRise15: {
        description: '15% surge in operating and procurement expenses',
        revisedNetProfit: Math.round(annualRevenue - (annualOpex * 1.15)),
        status: (annualRevenue - (annualOpex * 1.15)) > 0 ? 'Viable' : 'Under Stress'
      }
    },
    eligibleSchemes: eligibleSchemes,
    provenance: {
      source_type: 'formula',
      dataset: 'msme_standard_micro_benchmark',
      calculated: true,
      confidence: 0.80,
      timestamp: new Date().toISOString(),
      assumptions: [
        'Standard PMEGP / MUDRA micro-enterprise cost-margin ratios applied',
        'Working capital buffer calculated for 60-day operating cycle'
      ]
    }
  };
}

/**
 * Master calculation entrypoint
 * 
 * @param {Object} input
 * @returns {Promise<Object>} Unified business report with financials, provenance, and schemes
 */
async function analyzeBusiness(input = {}) {
  // 1. Classification & Archetype Resolution
  let category = (input.businessType || '').toLowerCase().trim();
  let classificationDetails = null;

  if (!category || category === 'custom' || category === 'new' || input.businessIdea) {
    classificationDetails = classifyBusinessIdea(input.businessIdea || category);
    category = classificationDetails.mappedCalculationTemplate;
  }

  // Extract merged params with extracted scale hints if present
  const mergedParams = {
    ...input,
    ...(classificationDetails ? classificationDetails.extractedScale : {})
  };

  // 2. Delegate to Domain Calculation Engine
  let calculationResult = null;

  const isFoodTech = (input.businessId && String(input.businessId).startsWith('FOODTECH_')) ||
    category === 'foodtech' || category === 'food_tech' ||
    (category === 'food-processing' && (input.raw_material_quantity !== undefined || input.wheat_input !== undefined || input.paddy_input !== undefined || input.seed_input !== undefined || input.raw_spice_input !== undefined || input.raw_pulse_input !== undefined));

  if (isFoodTech) {
    const foodTechResult = await runFoodTechBusinessModel(mergedParams);
    const projectCost = (foodTechResult.costs && foodTechResult.costs.totalCost) ? foodTechResult.costs.totalCost : 200000;
    const isRural = input.isRural !== false;
    const eligibleSchemes = dataService.getEligibleSchemes({
      businessType: 'agro_processing',
      projectCost,
      isRural
    });

    calculationResult = {
      ...foodTechResult,
      isFoodTech: true,
      financialViability: foodTechResult.profitability ? {
        grossRevenueAnnual: (foodTechResult.revenue?.totalRevenue || 0) * 12,
        netAnnualProfit: (foodTechResult.profitability?.netProfit || 0) * 12,
        netMonthlyProfit: foodTechResult.profitability?.netProfit || 0,
        netProfitMarginPct: foodTechResult.profitability?.netMarginPct || 0,
        annualRoiPct: foodTechResult.profitability?.roiPct || 0,
        paybackPeriodYears: foodTechResult.profitability?.paybackPeriodYears || null,
        benefitCostRatio: foodTechResult.profitability?.benefitCostRatio || null,
        viabilityRating: foodTechResult.profitability?.viabilityRating || 'MODERATELY_FEASIBLE'
      } : null,
      eligibleSchemes,
      financingStructure: {
        totalProjectCost: projectCost,
        recommendedOwnMarginPct: 10,
        ownEquityContribution: Math.round(projectCost * 0.1),
        bankLoanRequired: Math.round(projectCost * 0.9)
      }
    };
  } else if (category === 'dairy') {
    calculationResult = calculateDairyEconomics(mergedParams);
  } else if (category === 'poultry') {
    calculationResult = calculatePoultryEconomics(mergedParams);
  } else if (category === 'agriculture' || category === 'crop') {
    calculationResult = await calculateCropEconomics(mergedParams);
  } else if (category === 'food-processing') {
    calculationResult = calculateFoodProcessingEconomics(mergedParams);
  } else {
    // Novel / extended business idea
    calculationResult = calculateGeneralMsmeEconomics(mergedParams);
  }

  // 3. Attach Classification Metadata & Missing Parameter Alerts
  if (classificationDetails) {
    calculationResult.classification = {
      originalIdea: classificationDetails.originalInput,
      detectedArchetype: classificationDetails.detectedCategory,
      isCoreCategory: classificationDetails.isCoreCategory,
      confidence: classificationDetails.confidence,
      knownParameters: classificationDetails.knownParameters,
      missingParameters: classificationDetails.missingParameters,
      defaultAssumptions: classificationDetails.defaultAssumptions,
      archetypeProfile: classificationDetails.archetypeProfile
    };
  }

  return calculationResult;
}

module.exports = {
  analyzeBusiness,
  calculateGeneralMsmeEconomics
};

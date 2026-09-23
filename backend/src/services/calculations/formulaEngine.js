/**
 * VYAVSAYMITRA — Unified Business-Specific Formula Engine
 * 
 * Orchestrates deterministic domain calculations:
 * - Dairy Farming (NABARD 300-day lactation & feed schedules)
 * - Poultry Broiler (NABARD 42-day rearing & FCR 1.65)
 * - Field Crop Cultivation (DES Cost of Cultivation + MSP Floor)
 * - Agro/Food Processing (NABARD 16,000 kg/mo Chakki Dual-Revenue Model)
 * - Generalized MSME Financial Structuring (For novel user business ideas)
 * 
 * Never uses hardcoded universal formulas. Respects business-specific economics.
 */

const { calculateDairyEconomics } = require('../business/dairyEngine');
const { calculatePoultryEconomics } = require('../business/poultryEngine');
const { calculateCropEconomics } = require('../business/cropEngine');
const { calculateFoodProcessingEconomics } = require('../business/foodProcessingEngine');
const { calculateGeneralMsmeEconomics } = require('./calculationEngine');
const { runFoodTechBusinessModel } = require('../business/foodtech');
const { createTraceableParameter } = require('../data/provenanceService');

/**
 * Executes the appropriate deterministic formula engine for a given archetype
 * 
 * @param {string} archetype - 'dairy' | 'poultry' | 'agriculture' | 'food-processing' | 'foodtech' | 'general_msme'
 * @param {Object} params - User and reference inputs
 * @param {Object} [predictionData] - Optional ML predictions (e.g. crop yield, mandi price)
 * @returns {Promise<Object>} Structured financial and operational output
 */
async function executeFormulaByArchetype(archetype, params = {}, predictionData = null) {
  const normArch = (archetype || 'general_msme').toLowerCase().trim();

  let rawResult = null;
  let formulaName = '';
  let benchmarkSource = '';

  const isFoodTechArch = normArch === 'foodtech' || normArch === 'food_tech' || (params.businessId && String(params.businessId).startsWith('FOODTECH_'));

  if (isFoodTechArch) {
    formulaName = 'Central FormulaRegistry FoodTech Mass Balance & CVP Formula';
    benchmarkSource = 'CSIR-CFTRI / MoFPI / NABARD Statutory Technical Benchmarks';
    rawResult = await runFoodTechBusinessModel(params);
  } else if (normArch === 'dairy' || normArch === 'livestock_allied') {
    formulaName = 'NABARD Model Dairy Project Formula (NABARD-MBP-2024-V1)';
    benchmarkSource = 'validated_nabard_benchmarks.json (Dairy)';
    rawResult = calculateDairyEconomics(params);
  } else if (normArch === 'poultry') {
    formulaName = 'NABARD Commercial Broiler Model Formula (CPDO/NABARD-2024)';
    benchmarkSource = 'validated_nabard_benchmarks.json (Poultry)';
    rawResult = calculatePoultryEconomics(params);
  } else if (normArch === 'agriculture' || normArch === 'crop') {
    formulaName = 'DES Cost of Cultivation & Agronomic Production Formula';
    benchmarkSource = 'validated_cost_of_cultivation.csv & validated_crop_yield.csv';
    
    // Inject ML prediction overrides if provided
    const cropParams = { ...params };
    if (predictionData && predictionData.yield) {
      cropParams.customYieldTonnesPerHa = predictionData.yield.predicted_yield_per_ha;
    }
    if (predictionData && predictionData.mandiPrice) {
      cropParams.customPricePerQtl = predictionData.mandiPrice.predicted_modal_price_inr_per_qtl;
    }
    rawResult = await calculateCropEconomics(cropParams);
  } else if (normArch === 'food-processing' || normArch === 'agro_processing') {
    formulaName = 'NABARD Micro Agro-Processing & Chakki Dual Income Formula';
    benchmarkSource = 'validated_nabard_benchmarks.json (Agro Processing)';
    rawResult = calculateFoodProcessingEconomics(params);
  } else {
    // Generalized MSME financial primitives for novel / unknown business ideas
    formulaName = 'Generalized MSME Financial Structuring Formula (PMEGP/MUDRA Standard)';
    benchmarkSource = 'MSME Development Institute Rural Operational Benchmarks';
    rawResult = calculateGeneralMsmeEconomics(params);
  }

  let sourceDate = '2024-2026';
  let dataStatus = 'current';
  if (normArch === 'agriculture' || normArch === 'crop') {
    sourceDate = '1997-2020';
    dataStatus = 'recent';
  }

  const baseMeta = {
    sourceType: 'FORMULA',
    source: formulaName,
    sourceDate,
    dataStatus,
    datasetVersion: 'v1.1.0',
    calculationMethod: formulaName,
    assumptions: rawResult.provenance?.assumptions || []
  };

  // Enrich financial outputs with parameter-level provenance
  const isFoodTechResult = !!rawResult.massBalance;

  const enrichedFinancial = {
    totalInvestment: createTraceableParameter(
      isFoodTechResult
        ? (rawResult.costs?.initialInvestment || rawResult.costs?.totalCost || 0)
        : (rawResult.capitalInvestment?.totalProjectCost ||
           rawResult.capitalInvestment?.totalFixedCapital ||
           ((rawResult.costOfCultivation?.initialCapitalTools || 0) + (rawResult.costOfCultivation?.totalOperationalCost || 0)) ||
           rawResult.costOfCultivation?.totalOperationalCost ||
           0),
      { ...baseMeta, unit: 'INR', confidence: 0.98 }
    ),
    fixedCapital: createTraceableParameter(
      isFoodTechResult
        ? (rawResult.costs?.fixedCost || 0)
        : (rawResult.capitalInvestment?.totalFixedCapital ||
           rawResult.costOfCultivation?.initialCapitalTools ||
           0),
      { ...baseMeta, unit: 'INR', confidence: 0.98 }
    ),
    workingCapital: createTraceableParameter(
      isFoodTechResult
        ? (rawResult.costs?.totalVariableCost || 0)
        : (rawResult.capitalInvestment?.workingCapitalBuffer ||
           rawResult.operatingExpenses?.monthlyOpex ||
           rawResult.costOfCultivation?.totalOperationalCost ||
           0),
      { ...baseMeta, unit: 'INR', confidence: 0.95 }
    ),
    annualRevenue: createTraceableParameter(
      isFoodTechResult
        ? ((rawResult.revenue?.totalRevenue || 0) * 12)
        : (rawResult.revenue?.totalAnnualRevenue || rawResult.revenue?.totalRevenue || 0),
      { ...baseMeta, unit: 'INR', confidence: 0.92 }
    ),
    annualOperatingCost: createTraceableParameter(
      isFoodTechResult
        ? ((rawResult.costs?.totalCost || 0) * 12)
        : (rawResult.operatingExpenses?.totalAnnualOpex || rawResult.costOfCultivation?.totalOperationalCost || 0),
      { ...baseMeta, unit: 'INR', confidence: 0.94 }
    ),
    netAnnualProfit: createTraceableParameter(
      isFoodTechResult
        ? ((rawResult.profitability?.netProfit || 0) * 12)
        : (rawResult.financialViability?.netAnnualProfit || rawResult.financialViability?.netProfit || 0),
      { ...baseMeta, unit: 'INR', confidence: 0.92 }
    ),
    netMonthlyProfit: createTraceableParameter(
      isFoodTechResult
        ? (rawResult.profitability?.netProfit || 0)
        : (rawResult.financialViability?.netMonthlyProfit || Math.round((rawResult.financialViability?.netProfit || 0) / 12)),
      { ...baseMeta, unit: 'INR', confidence: 0.92 }
    ),
    netProfitMarginPct: createTraceableParameter(
      isFoodTechResult
        ? (rawResult.profitability?.netMarginPct || 0)
        : (rawResult.financialViability?.netProfitMarginPct || 0),
      { ...baseMeta, unit: 'PERCENT', confidence: 0.92 }
    ),
    annualRoiPct: createTraceableParameter(
      isFoodTechResult
        ? (rawResult.profitability?.roiPct || 0)
        : (rawResult.financialViability?.annualRoiPct || 0),
      { ...baseMeta, unit: 'PERCENT', confidence: 0.92 }
    ),
    dscr: createTraceableParameter(
      isFoodTechResult
        ? (rawResult.profitability?.benefitCostRatio || 1.5)
        : (rawResult.financialViability?.dscr || rawResult.financialViability?.benefitCostRatio || 1.5),
      { ...baseMeta, unit: 'RATIO', confidence: 0.90 }
    ),
    paybackYears: createTraceableParameter(
      isFoodTechResult
        ? (rawResult.profitability?.paybackPeriodYears || 0)
        : (rawResult.financialViability?.paybackPeriodYears || 0),
      { ...baseMeta, unit: 'YEARS', confidence: 0.90 }
    ),
    breakEvenMetric: isFoodTechResult
      ? { label: 'Break-even Quantity', value: rawResult.breakEven?.breakEvenQuantity || null, unit: 'kg' }
      : (rawResult.financialViability?.breakEvenDailyYieldPerCowLitres
        ? { label: 'Break-even Daily Milk Yield', value: rawResult.financialViability.breakEvenDailyYieldPerCowLitres, unit: 'litres/day/animal' }
        : (rawResult.financialViability?.breakEvenLiveBirdPricePerKg
          ? { label: 'Break-even Live Bird Farmgate Price', value: rawResult.financialViability.breakEvenLiveBirdPricePerKg, unit: 'INR/kg' }
          : (rawResult.financialViability?.breakEvenPricePerQtl
            ? { label: 'Break-even Mandi Modal Price', value: rawResult.financialViability.breakEvenPricePerQtl, unit: 'INR/quintal' }
            : { label: 'Break-even Monthly Turnover', value: rawResult.financialViability?.breakEvenRevenueAnnual ? Math.round(rawResult.financialViability.breakEvenRevenueAnnual / 12) : 0, unit: 'INR/month' }
          )
        )
      )
  };

  return {
    rawResult,
    enrichedFinancial,
    formulaUsed: formulaName,
    dataSource: benchmarkSource
  };
}

module.exports = {
  executeFormulaByArchetype
};

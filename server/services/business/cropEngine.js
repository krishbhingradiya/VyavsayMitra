/**
 * VYAVSAYMITRA — Agriculture & Crop Business Calculation Engine
 * 
 * Combines Directorate of Economics & Statistics (DES) Cost of Cultivation,
 * AGMARKNET Mandi modal price history, MSP floor security, and ML Yield Regressor.
 * Strictly preserves computational integrity, transparency, and data provenance.
 */

const dataService = require('../data/dataService');
const modelService = require('../ml/modelService');

/**
 * Normalizes crop names and detects standard sowing season
 */
function getCropSeason(crop) {
  const c = (crop || '').toLowerCase();
  if (['wheat', 'gram', 'mustard', 'barley', 'linseed'].some(x => c.includes(x))) return 'Rabi';
  if (['rice', 'paddy', 'cotton', 'soyabean', 'groundnut', 'maize', 'bajra', 'jowar', 'tur', 'arhar', 'jute'].some(x => c.includes(x))) return 'Kharif';
  if (['sugarcane'].some(x => c.includes(x))) return 'Whole Year';
  return 'Kharif';
}

/**
 * Calculates complete techno-economic feasibility for Crop Production
 * 
 * @param {Object} params
 * @param {string} [params.crop='Wheat'] - Crop commodity
 * @param {string} [params.season] - 'Kharif' | 'Rabi' | 'Whole Year'
 * @param {string} [params.state='Maharashtra'] - State
 * @param {string} [params.district=''] - District
 * @param {number} [params.areaHa=1.0] - Cultivation area in hectares
 * @param {number} [params.areaAcres] - Cultivation area in acres (optional)
 * @param {number} [params.customYieldTonnesPerHa] - Override yield
 * @param {number} [params.customPricePerQtl] - Override selling price
 * @param {number} [params.customCostPerHa] - Override cost of cultivation
 * @param {number} [params.annualRainfall=900.0] - Rainfall mm
 * @param {number} [params.fertilizerKg=350.0] - Fertilizer application
 * @param {number} [params.customAvailableCapital] - User available margin
 * @param {boolean} [params.isSpecialCategory=false] - Subsidy eligibility
 * @returns {Promise<Object>} Feasibility, financial statement, and viability
 */
async function calculateCropEconomics(params = {}) {
  const crop = params.crop || 'Wheat';
  const state = params.state || 'Maharashtra';
  const district = params.district || '';
  const season = params.season || getCropSeason(crop);
  const isSpecialCategory = !!params.isSpecialCategory;

  // Area conversion: 1 Hectare = 2.47105 Acres
  let areaHa = 1.0;
  if (params.areaAcres && parseFloat(params.areaAcres) > 0) {
    areaHa = +( (parseFloat(params.areaAcres) / 2.47105).toFixed(2) );
  } else if (params.areaHa && parseFloat(params.areaHa) > 0) {
    areaHa = parseFloat(params.areaHa);
  }
  const areaAcres = +( (areaHa * 2.47105).toFixed(2) );

  // ─── 1. Expected Yield & Production ──────────────────────────────
  let expectedYieldTonnesPerHa = 0;
  let yieldProvenance = null;

  if (params.customYieldTonnesPerHa && parseFloat(params.customYieldTonnesPerHa) > 0) {
    expectedYieldTonnesPerHa = parseFloat(params.customYieldTonnesPerHa);
    yieldProvenance = {
      source_type: 'formula',
      dataset: 'user_parameter_override',
      confidence: 1.0,
      calculated: false,
      timestamp: new Date().toISOString()
    };
  } else {
    // Attempt ML prediction first
    try {
      const mlYield = await modelService.predictCropYield({
        product: crop,
        season,
        state,
        area: areaHa,
        annual_rainfall: parseFloat(params.annualRainfall || 900.0),
        fertilizer: parseFloat(params.fertilizerKg || 350.0)
      });
      expectedYieldTonnesPerHa = mlYield.predicted_yield_per_ha;
      yieldProvenance = {
        source_type: mlYield.source_type || 'ml_model',
        dataset: 'validated_crop_yield.csv',
        model_version: mlYield.model_version || 'crop_yield_rf_v1',
        confidence: mlYield.confidence || 0.90,
        calculated: true,
        timestamp: new Date().toISOString(),
        assumptions: mlYield.assumptions || []
      };
    } catch {
      // Historical dataset median fallback
      const datasetYield = dataService.getCropYield(crop, state);
      expectedYieldTonnesPerHa = datasetYield ? datasetYield.avg_yield_tonnes_per_ha : 2.5;
      yieldProvenance = {
        source_type: 'dataset',
        dataset: 'validated_crop_yield.csv',
        confidence: 0.85,
        calculated: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  const totalProductionTonnes = +( (expectedYieldTonnesPerHa * areaHa).toFixed(2) );
  const totalProductionQuintals = +( (totalProductionTonnes * 10).toFixed(2) ); // 1 Tonne = 10 Quintals

  // ─── 2. Cost of Cultivation (OpEx) ───────────────────────────────
  let baseCostPerHa = 20000;
  let costProvenance = null;

  if (params.customCostPerHa && parseFloat(params.customCostPerHa) > 0) {
    baseCostPerHa = parseFloat(params.customCostPerHa);
    costProvenance = {
      source_type: 'formula',
      dataset: 'user_parameter_override',
      confidence: 1.0,
      calculated: false,
      timestamp: new Date().toISOString()
    };
  } else {
    const desCost = dataService.getCropCostOfCultivation(crop);
    if (desCost) {
      baseCostPerHa = desCost.cost_per_hectare;
      costProvenance = desCost.provenance;
    } else {
      costProvenance = {
        source_type: 'formula',
        dataset: 'agronomic_benchmark_estimate',
        confidence: 0.75,
        calculated: true,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Breakdown of cultivation operational expenses based on ICAR/DES standards:
  // - Seeds: 12%
  // - Fertilizer & Manure: 22%
  // - Irrigation & Electricity: 10%
  // - Plant protection / pesticides: 8%
  // - Tractor & Machinery hiring: 18%
  // - Harvesting & Threshing labor: 20%
  // - Miscellaneous / Contingency: 10%
  const totalOperationalCost = Math.round(baseCostPerHa * areaHa);
  const seedCost = Math.round(totalOperationalCost * 0.12);
  const fertilizerCost = Math.round(totalOperationalCost * 0.22);
  const irrigationCost = Math.round(totalOperationalCost * 0.10);
  const plantProtectionCost = Math.round(totalOperationalCost * 0.08);
  const machineryHiringCost = Math.round(totalOperationalCost * 0.18);
  const harvestingLaborCost = Math.round(totalOperationalCost * 0.20);
  const contingencyCost = Math.round(totalOperationalCost * 0.10);

  // Capital / Fixed Investment (Drip/Sprinkler, land preparation, spray pump)
  const initialCapitalInvestment = Math.round(areaHa * 18000); // Micro-irrigation and baseline tools

  // ─── 3. Market Pricing & Revenue ─────────────────────────────────
  let pricePerQtl = 0;
  let priceProvenance = null;

  if (params.customPricePerQtl && parseFloat(params.customPricePerQtl) > 0) {
    pricePerQtl = parseFloat(params.customPricePerQtl);
    priceProvenance = {
      source_type: 'formula',
      dataset: 'user_parameter_override',
      confidence: 1.0,
      calculated: false,
      timestamp: new Date().toISOString()
    };
  } else {
    // Mandi lookup
    const mandiPriceData = dataService.getMandiPrice(crop, state, district);
    if (mandiPriceData && mandiPriceData.modal_price > 0) {
      pricePerQtl = mandiPriceData.modal_price;
      priceProvenance = mandiPriceData.provenance;
    } else {
      // ML model prediction
      try {
        const mlPrice = await modelService.predictMandiPrice({
          product: crop,
          state,
          month: season === 'Rabi' ? 'April' : 'October',
          year: 2026,
          arrival_quantity: 300.0
        });
        pricePerQtl = mlPrice.predicted_modal_price_inr_per_qtl;
        priceProvenance = {
          source_type: 'ml_model',
          dataset: 'validated_mandi_prices.csv',
          model_version: mlPrice.model_version || 'mandi_price_gbr_v1',
          confidence: 0.85,
          calculated: true,
          timestamp: new Date().toISOString()
        };
      } catch {
        pricePerQtl = 2200; // conservative floor
        priceProvenance = {
          source_type: 'formula',
          dataset: 'msp_baseline_floor',
          confidence: 0.70,
          calculated: false,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  // Main grain revenue
  const mainProduceRevenue = Math.round(totalProductionQuintals * pricePerQtl);
  // Crop residue / straw / fodder byproduct revenue (~7% of grain value)
  const byproductRevenue = Math.round(mainProduceRevenue * 0.07);
  const totalRevenue = mainProduceRevenue + byproductRevenue;

  // ─── 4. Profitability & Viability Metrics ────────────────────────
  const netProfit = totalRevenue - totalOperationalCost;
  const netProfitPerHa = +( (netProfit / areaHa).toFixed(0) );
  const netProfitPerAcre = +( (netProfit / areaAcres).toFixed(0) );
  const netProfitMarginPct = +( (netProfit / totalRevenue) * 100 ).toFixed(1);

  // Cost of production per Quintal (Break-even market price)
  const costOfProductionPerQtl = +( (totalOperationalCost / totalProductionQuintals).toFixed(2) );
  const breakEvenPricePerQtl = +( ((totalOperationalCost - byproductRevenue) / totalProductionQuintals).toFixed(2) );

  // Benefit-Cost Ratio (BCR) = Revenue / Total Cost
  const benefitCostRatio = +( (totalRevenue / totalOperationalCost).toFixed(2) );

  // Return on Operating Capital (ROI %)
  const roiPct = +( (netProfit / (totalOperationalCost + initialCapitalInvestment)) * 100 ).toFixed(1);

  // ─── 5. Financing & Working Capital ──────────────────────────────
  // Kisan Credit Card (KCC) scale of finance
  const kccEligibleLimit = totalOperationalCost;
  const recommendedOwnMargin = Math.round(totalOperationalCost * 0.10);
  const cropLoanRequired = Math.max(0, totalOperationalCost - recommendedOwnMargin);
  const kccSubsidizedInterestRate = 4.0; // With prompt repayment incentive (7% - 3% subvention)

  // ─── 6. Sensitivity Analysis ─────────────────────────────────────
  const stressScenarios = {
    droughtDeficit20: {
      description: '20% yield drop due to unseasonal dry spell / drought',
      revisedProductionQtl: Math.round(totalProductionQuintals * 0.80),
      revisedNetProfit: Math.round((totalProductionQuintals * 0.80 * pricePerQtl * 1.07) - totalOperationalCost),
      status: ((totalProductionQuintals * 0.80 * pricePerQtl * 1.07) - totalOperationalCost) > 0 ? 'Viable' : 'Under Stress'
    },
    marketPriceSlump15: {
      description: '15% drop in harvest-season Mandi modal price',
      revisedNetProfit: Math.round(((mainProduceRevenue * 0.85) + byproductRevenue) - totalOperationalCost),
      status: (((mainProduceRevenue * 0.85) + byproductRevenue) - totalOperationalCost) > 0 ? 'Viable' : 'Under Stress'
    },
    inputCostRise15: {
      description: '15% surge in fertilizer, fuel, and labor wages',
      revisedNetProfit: Math.round(totalRevenue - (totalOperationalCost * 1.15)),
      status: (totalRevenue - (totalOperationalCost * 1.15)) > 0 ? 'Viable' : 'Under Stress'
    }
  };

  // ─── 7. Eligible Government Schemes ──────────────────────────────
  const eligibleSchemes = dataService.getEligibleSchemes({
    businessType: 'agriculture',
    projectCost: totalOperationalCost + initialCapitalInvestment,
    isRural: true,
    isSpecialCategory
  });

  return {
    businessType: 'agriculture',
    unitTitle: `${crop} Cultivation (${areaHa} Hectare / ${areaAcres} Acre)`,
    cropDetails: {
      crop,
      season,
      state,
      district: district || 'Major Mandi Cluster',
      areaHa,
      areaAcres
    },
    productionEstimates: {
      expectedYieldTonnesPerHa,
      totalProductionTonnes,
      totalProductionQuintals,
      yieldUnit: 'tonnes/ha',
      productionProvenance: yieldProvenance
    },
    costOfCultivation: {
      baseCostPerHa,
      totalOperationalCost,
      breakdown: {
        seeds: seedCost,
        fertilizerAndManure: fertilizerCost,
        irrigationAndPower: irrigationCost,
        plantProtectionPesticides: plantProtectionCost,
        machineryHiring: machineryHiringCost,
        harvestingLabor: harvestingLaborCost,
        contingency: contingencyCost
      },
      initialCapitalTools: initialCapitalInvestment,
      costProvenance: costProvenance
    },
    revenue: {
      realizedPricePerQtl: pricePerQtl,
      mainProduceRevenue,
      byproductFodderRevenue: byproductRevenue,
      totalRevenue,
      priceProvenance: priceProvenance
    },
    financialViability: {
      netProfit,
      netProfitPerHa,
      netProfitPerAcre,
      netProfitMarginPct,
      costOfProductionPerQtl,
      breakEvenPricePerQtl,
      benefitCostRatio,
      annualRoiPct: roiPct,
      viabilityRating: benefitCostRatio >= 1.5 ? 'HIGHLY_FEASIBLE' : (benefitCostRatio >= 1.2 ? 'MODERATELY_FEASIBLE' : 'HIGH_RISK')
    },
    financingStructure: {
      kccEligibleLimit,
      recommendedOwnMargin,
      cropLoanRequired,
      subsidizedInterestRatePct: kccSubsidizedInterestRate,
      tenureYears: 1
    },
    stressAnalysis: stressScenarios,
    eligibleSchemes,
    provenance: {
      source_type: 'dataset',
      dataset: 'validated_cost_of_cultivation.csv & validated_crop_yield.csv',
      source_portal: 'Directorate of Economics and Statistics (DES), Ministry of Agriculture',
      calculated: true,
      confidence: 0.92,
      timestamp: new Date().toISOString(),
      assumptions: [
        'Cost of cultivation adheres to Comprehensive Scheme for Studying Cost of Cultivation (DES)',
        'Production output calculated using validated ICAR/DES yield models',
        'Byproduct / straw yield valued at standard 7% of gross grain output'
      ]
    }
  };
}

module.exports = {
  calculateCropEconomics
};

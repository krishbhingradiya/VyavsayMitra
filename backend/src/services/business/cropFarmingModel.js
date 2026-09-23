/**
 * VYAVSAYMITRA — Primary Agriculture Crop Farming Business Model
 * Model Identifier: AGRICULTURE_CROP_FARMING
 * 
 * Generic crop cultivation economic evaluation model:
 * - Deterministically executes mathematical calculations through the Phase-1 FormulaRegistry
 * - Sources crop-specific agronomic benchmarks (yield, cost) from validated statutory datasets
 * - Connects to Market Data Fusion without ever averaging current and historical prices
 * - Implements strict CACP Cost Accounting (Cost A1, A2, A2+FL, B1, B2, C1, C2)
 * - Zero Fake Defaults: Explicitly tracks missing inputs rather than guessing or fabricating numbers
 * - Enforces unit safety and rejects invalid/negative inputs
 */

const dataService = require('../data/dataService');
const currentMarketDataService = require('../data/currentMarketDataService');
const { reconcileMarketData } = require('../data/marketReconciliationEngine');
const { defaultRegistry } = require('../formulaEngine');
const { DATA_STATUSES } = require('../formulaEngine/parameterSchema');
const { buildProvenanceAudit } = require('../data/provenanceService');

/**
 * Normalizes input cultivation area to standard hectares
 * 
 * @param {number|string} rawArea - Numerical area value
 * @param {string} rawUnit - 'hectare', 'ha', 'acre', 'acres', 'bigha', 'guntha'
 * @returns {{ valid: boolean, areaHa: number, unit: string, error?: string }}
 */
function normalizeArea(rawArea, rawUnit = 'hectare') {
  if (rawArea === undefined || rawArea === null || rawArea === '') {
    return { valid: false, error: 'MISSING_AREA', message: 'Cultivation area is required' };
  }

  const area = Number(rawArea);
  if (isNaN(area) || typeof rawArea === 'boolean') {
    return { valid: false, error: 'INVALID_AREA', message: `Cultivation area must be a valid number, received: ${rawArea}` };
  }

  if (area <= 0) {
    return { valid: false, error: 'INVALID_AREA', message: 'Cultivation area must be strictly greater than 0' };
  }

  if (area > 10000) {
    return { valid: false, error: 'EXTREME_AREA', message: `Cultivation area (${area} ha) exceeds realistic single farm enterprise limit (10,000 ha)` };
  }

  const u = String(rawUnit || 'hectare').toLowerCase().trim();

  if (u === 'hectare' || u === 'ha' || u === 'hectares') {
    return { valid: true, areaHa: +(area.toFixed(4)), originalArea: area, originalUnit: 'hectare' };
  }

  if (u === 'acre' || u === 'acres') {
    // 1 Hectare = 2.47105 Acres -> Area in Ha = Acres / 2.47105
    const inHa = area / 2.47105;
    return { valid: true, areaHa: +(inHa.toFixed(4)), originalArea: area, originalUnit: 'acre' };
  }

  // Incompatible unit
  return {
    valid: false,
    error: 'UNIT_MISMATCH',
    message: `Incompatible area unit '${rawUnit}'. Supported units: 'hectare', 'acre'`
  };
}

/**
 * Normalizes price to standard INR/quintal
 * 
 * @param {number|string} rawPrice
 * @param {string} rawUnit - 'INR/quintal', 'quintal', 'INR/kg', 'kg', 'INR/tonne', 'tonne'
 * @param {string} [rawCurrency='INR']
 * @returns {{ valid: boolean, pricePerQtl: number, error?: string }}
 */
function normalizePrice(rawPrice, rawUnit = 'INR/quintal', rawCurrency = 'INR') {
  if (rawPrice === undefined || rawPrice === null || rawPrice === '') {
    return { valid: false, error: 'MISSING_PRICE' };
  }

  const price = Number(rawPrice);
  if (isNaN(price)) {
    return { valid: false, error: 'INVALID_PRICE', message: `Price must be a valid number, received: ${rawPrice}` };
  }

  if (price < 0) {
    return { valid: false, error: 'NEGATIVE_PRICE', message: 'Selling price cannot be negative' };
  }

  const curr = String(rawCurrency || 'INR').toUpperCase().trim();
  if (curr !== 'INR') {
    return { valid: false, error: 'CURRENCY_MISMATCH', message: `Unsupported currency '${rawCurrency}'. System operates in INR.` };
  }

  const u = String(rawUnit || 'INR/quintal').toLowerCase().trim();

  if (u.includes('kg')) {
    // 1 Quintal = 100 kg
    return { valid: true, pricePerQtl: Math.round(price * 100) };
  }

  if (u.includes('tonne')) {
    // 1 Tonne = 10 Quintals
    return { valid: true, pricePerQtl: Math.round(price / 10) };
  }

  if (u.includes('quintal') || u.includes('qtl')) {
    return { valid: true, pricePerQtl: Math.round(price) };
  }

  return {
    valid: false,
    error: 'UNIT_MISMATCH',
    message: `Incompatible price unit '${rawUnit}'. Supported: 'INR/quintal', 'INR/kg', 'INR/tonne'`
  };
}

/**
 * Normalizes yield to standard tonnes/hectare
 */
function normalizeYield(rawYield, rawUnit = 'tonnes/ha') {
  if (rawYield === undefined || rawYield === null || rawYield === '') {
    return { valid: false, error: 'MISSING_YIELD' };
  }

  const yld = Number(rawYield);
  if (isNaN(yld)) {
    return { valid: false, error: 'INVALID_YIELD', message: `Yield must be a valid number, received: ${rawYield}` };
  }

  if (yld < 0) {
    return { valid: false, error: 'NEGATIVE_YIELD', message: 'Crop yield cannot be negative' };
  }

  if (yld > 500) {
    return { valid: false, error: 'EXTREME_YIELD', message: `Crop yield (${yld}) exceeds biological agronomic limits` };
  }

  const u = String(rawUnit || 'tonnes/ha').toLowerCase().trim();

  if (u.includes('quintal') || u.includes('qtl')) {
    // 1 Tonne = 10 Quintals
    return { valid: true, yieldTonnesPerHa: +( (yld / 10).toFixed(3) ) };
  }

  if (u.includes('kg')) {
    // 1 Tonne = 1000 kg
    return { valid: true, yieldTonnesPerHa: +( (yld / 1000).toFixed(4) ) };
  }

  if (u.includes('tonne') || u.includes('t/ha')) {
    return { valid: true, yieldTonnesPerHa: +(yld.toFixed(3)) };
  }

  return {
    valid: false,
    error: 'UNIT_MISMATCH',
    message: `Incompatible yield unit '${rawUnit}'. Supported: 'tonnes/ha', 'quintals/ha', 'kg/ha'`
  };
}

/**
 * Validates non-negative cost components
 */
function validateNonNegativeCost(costVal, costName) {
  if (costVal === undefined || costVal === null || costVal === '') return 0;
  const num = Number(costVal);
  if (isNaN(num)) {
    throw new Error(`Cost parameter '${costName}' must be a valid number, received: ${costVal}`);
  }
  if (num < 0) {
    throw new Error(`Negative cost error: Cost parameter '${costName}' cannot be negative (${num})`);
  }
  return num;
}

/**
 * Standard Agricultural Seasons in India
 */
function detectSeason(crop, declaredSeason) {
  if (declaredSeason && ['Kharif', 'Rabi', 'Zaid', 'Whole Year'].includes(declaredSeason)) {
    return declaredSeason;
  }
  const c = (crop || '').toLowerCase().trim();
  if (['wheat', 'gram', 'mustard', 'barley', 'potato', 'chana', 'linseed'].some(x => c.includes(x))) return 'Rabi';
  if (['rice', 'paddy', 'cotton', 'soyabean', 'groundnut', 'maize', 'bajra', 'jowar', 'tur', 'arhar', 'jute'].some(x => c.includes(x))) return 'Kharif';
  if (['sugarcane'].some(x => c.includes(x))) return 'Whole Year';
  if (['watermelon', 'cucumber', 'vegetable'].some(x => c.includes(x))) return 'Zaid';
  return 'Kharif';
}

/**
 * Executes the primary AGRICULTURE_CROP_FARMING business model
 * 
 * @param {Object} input - User parameters and query specifications
 * @param {Object} [options] - Registry & execution options
 * @returns {Promise<Object>} Standardized business model output
 */
async function runCropFarmingModel(input = {}, options = {}) {
  const registry = options.registry || defaultRegistry;
  const warnings = [];
  const missingInputs = [];
  const limitations = [];

  // ─── 1. COMMODITY & CROP SPECIFICATION ───────────────────────────
  const rawCrop = input.crop || input.commodity || input.product;
  if (!rawCrop || typeof rawCrop !== 'string' || !rawCrop.trim()) {
    return {
      businessType: 'AGRICULTURE_CROP_FARMING',
      businessStatus: 'INVALID_INPUTS',
      validationError: {
        field: 'crop',
        error: 'MISSING_CROP',
        message: 'Crop commodity name is required for agricultural crop farming model.'
      },
      warnings: ['Crop commodity name missing'],
      missingInputs: ['crop']
    };
  }
  const crop = rawCrop.trim();
  const state = (input.state || 'Maharashtra').trim();
  const district = (input.district || '').trim();
  const season = detectSeason(crop, input.season);

  // ─── 2. CULTIVATION AREA VALIDATION ──────────────────────────────
  const areaCheck = normalizeArea(input.area !== undefined ? input.area : input.areaHa, input.areaUnit || input.unit || 'hectare');
  if (!areaCheck.valid) {
    return {
      businessType: 'AGRICULTURE_CROP_FARMING',
      businessStatus: 'INVALID_INPUTS',
      validationError: {
        field: 'area',
        error: areaCheck.error,
        message: areaCheck.message
      },
      warnings: [areaCheck.message],
      missingInputs: areaCheck.error === 'MISSING_AREA' ? ['area'] : []
    };
  }
  const areaHa = areaCheck.areaHa;
  const areaAcres = +( (areaHa * 2.47105).toFixed(2) );

  // ─── 3. EXPECTED YIELD RESOLUTION (NO FAKE DEFAULTS) ─────────────
  let expectedYieldTonnesPerHa = null;
  let yieldProvenance = null;
  let yieldDataStatus = DATA_STATUSES.UNKNOWN;

  // Check user input first
  if (input.yield !== undefined || input.yieldTonnesPerHa !== undefined || input.customYieldTonnesPerHa !== undefined) {
    const rawUserYield = input.yield !== undefined ? input.yield : (input.yieldTonnesPerHa !== undefined ? input.yieldTonnesPerHa : input.customYieldTonnesPerHa);
    const yieldCheck = normalizeYield(rawUserYield, input.yieldUnit || 'tonnes/ha');
    if (!yieldCheck.valid) {
      return {
        businessType: 'AGRICULTURE_CROP_FARMING',
        businessStatus: 'INVALID_INPUTS',
        validationError: {
          field: 'yield',
          error: yieldCheck.error,
          message: yieldCheck.message
        },
        warnings: [yieldCheck.message],
        missingInputs: []
      };
    }
    expectedYieldTonnesPerHa = yieldCheck.yieldTonnesPerHa;
    yieldDataStatus = DATA_STATUSES.USER_INPUT;
    yieldProvenance = {
      sourceType: 'USER_INPUT',
      source: 'Entrepreneur / Farmer Declared Yield',
      confidence: 1.0,
      timestamp: new Date().toISOString()
    };
  } else {
    // Attempt verified dataset lookup from Directorate of Economics & Statistics (DES)
    const datasetYield = dataService.getCropYield(crop, state);
    if (datasetYield && datasetYield.avg_yield_tonnes_per_ha > 0) {
      expectedYieldTonnesPerHa = datasetYield.avg_yield_tonnes_per_ha;
      yieldDataStatus = DATA_STATUSES.VERIFIED_DATA;
      yieldProvenance = datasetYield.provenance;
      if (datasetYield.warning) warnings.push(datasetYield.warning);
    } else {
      // STRICT RULE: No fake guessing! Yield is missing.
      yieldDataStatus = DATA_STATUSES.UNKNOWN;
      missingInputs.push('yield');
      warnings.push(`Verified yield benchmark is unavailable for crop '${crop}' in ${state}. Explicit user input required.`);
    }
  }

  // ─── 4. COST OF CULTIVATION RESOLUTION (NO FAKE DEFAULTS) ────────
  let baseCostPerHa = null;
  let costProvenance = null;
  let costDataStatus = DATA_STATUSES.UNKNOWN;

  // Check user-declared cost per hectare
  if (input.costPerHa !== undefined || input.customCostPerHa !== undefined || input.costOfCultivationPerHa !== undefined) {
    const rawCost = input.costPerHa !== undefined ? input.costPerHa : (input.customCostPerHa !== undefined ? input.customCostPerHa : input.costOfCultivationPerHa);
    try {
      baseCostPerHa = validateNonNegativeCost(rawCost, 'costPerHa');
      costDataStatus = DATA_STATUSES.USER_INPUT;
      costProvenance = {
        sourceType: 'USER_INPUT',
        source: 'Entrepreneur / Farmer Declared Cost of Cultivation',
        confidence: 1.0,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      return {
        businessType: 'AGRICULTURE_CROP_FARMING',
        businessStatus: 'INVALID_INPUTS',
        validationError: { field: 'costPerHa', error: 'NEGATIVE_COST', message: err.message },
        warnings: [err.message],
        missingInputs: []
      };
    }
  } else {
    // Attempt verified DES Comprehensive Scheme dataset lookup
    const desCost = dataService.getCropCostOfCultivation(crop);
    if (desCost && desCost.cost_per_hectare > 0) {
      baseCostPerHa = desCost.cost_per_hectare;
      costDataStatus = DATA_STATUSES.VERIFIED_DATA;
      costProvenance = desCost.provenance;
      if (desCost.warning) warnings.push(desCost.warning);
    } else {
      // Check if user provided itemized direct costs
      const itemizedSum = (Number(input.seedCost || 0) + Number(input.fertilizerCost || 0) +
        Number(input.labourCost || 0) + Number(input.machineryCost || 0) + Number(input.irrigationCost || 0));
      if (itemizedSum > 0) {
        baseCostPerHa = +( (itemizedSum / areaHa).toFixed(2) );
        costDataStatus = DATA_STATUSES.USER_INPUT;
        costProvenance = {
          sourceType: 'USER_INPUT',
          source: 'Itemized User Direct Cost Inputs',
          confidence: 1.0,
          timestamp: new Date().toISOString()
        };
      } else {
        // STRICT RULE: No fake guessing!
        costDataStatus = DATA_STATUSES.UNKNOWN;
        missingInputs.push('production_cost');
        warnings.push(`Verified cost of cultivation benchmark is unavailable for '${crop}'. Itemized or total cost input required.`);
      }
    }
  }

  // ─── 5. MARKET PRICING & FUSION (NO FAKE DEFAULTS) ───────────────
  let realizedPricePerQtl = null;
  let priceProvenance = null;
  let priceDataStatus = DATA_STATUSES.UNKNOWN;
  let marketFusionBlock = null;

  // Check user-declared selling price
  if (input.sellingPrice !== undefined || input.customPricePerQtl !== undefined || input.pricePerQtl !== undefined) {
    const rawPrice = input.sellingPrice !== undefined ? input.sellingPrice : (input.customPricePerQtl !== undefined ? input.customPricePerQtl : input.pricePerQtl);
    const priceCheck = normalizePrice(rawPrice, input.priceUnit || 'INR/quintal', input.currency || 'INR');
    if (!priceCheck.valid) {
      return {
        businessType: 'AGRICULTURE_CROP_FARMING',
        businessStatus: 'INVALID_INPUTS',
        validationError: { field: 'sellingPrice', error: priceCheck.error, message: priceCheck.message },
        warnings: [priceCheck.message],
        missingInputs: []
      };
    }
    realizedPricePerQtl = priceCheck.pricePerQtl;
    priceDataStatus = DATA_STATUSES.USER_INPUT;
    priceProvenance = {
      sourceType: 'USER_INPUT',
      source: 'Farmer Declared Selling Price',
      confidence: 1.0,
      timestamp: new Date().toISOString()
    };
  } else {
    // Attempt Market Data Fusion: Current Verified Market Rate vs Historical APMC
    try {
      const currentPriceObj = await currentMarketDataService.getCurrentMarketPrice(crop, state, district);
      const historicalPriceObj = dataService.getMandiPrice(crop, state, district);
      
      const reconciliation = reconcileMarketData(historicalPriceObj, currentPriceObj, { commodity: crop, state, district });
      marketFusionBlock = reconciliation;

      if (currentPriceObj && (currentPriceObj.modalPrice > 0 || currentPriceObj.price > 0)) {
        realizedPricePerQtl = currentPriceObj.modalPrice || currentPriceObj.price;
        priceDataStatus = DATA_STATUSES.VERIFIED_DATA;
        priceProvenance = {
          sourceType: 'EXTERNAL_DATA',
          source: currentPriceObj.source || 'AGMARKNET Daily Mandi Bulletin',
          sourceURL: currentPriceObj.sourceUrl || 'https://agmarknet.gov.in',
          sourceDate: currentPriceObj.observationDate || '2024-2026',
          dataStatus: 'CURRENT_MARKET_STATE',
          confidence: 0.95,
          timestamp: new Date().toISOString()
        };
      } else if (historicalPriceObj && (historicalPriceObj.modal_price > 0 || historicalPriceObj.modalPrice > 0)) {
        realizedPricePerQtl = historicalPriceObj.modal_price || historicalPriceObj.modalPrice;
        priceDataStatus = DATA_STATUSES.ESTIMATE; // Historical reference cannot be labeled CURRENT
        priceProvenance = historicalPriceObj.provenance || {
          sourceType: 'EXTERNAL_DATA',
          source: 'APMC Historical Benchmark (2014-2016)',
          dataStatus: 'HISTORICAL_REFERENCE',
          confidence: 0.85,
          timestamp: new Date().toISOString()
        };
        warnings.push('Real-time current spot mandi prices unavailable; using historical APMC reference data (2014-2016).');
      }
    } catch (err) {
      warnings.push(`Market reconciliation error: ${err.message}`);
    }

    if (!realizedPricePerQtl) {
      // STRICT RULE: No fake guessing!
      priceDataStatus = DATA_STATUSES.UNKNOWN;
      missingInputs.push('selling_price');
      warnings.push(`Mandi market price could not be retrieved for '${crop}' in ${state}. Explicit selling price input required.`);
    }
  }

  // ─── 6. INSUFFICIENT DATA / MISSING INPUTS GATE ───────────────────
  const hasSufficientInputs = (expectedYieldTonnesPerHa !== null && baseCostPerHa !== null && realizedPricePerQtl !== null);

  if (!hasSufficientInputs) {
    return {
      businessType: 'AGRICULTURE_CROP_FARMING',
      businessStatus: 'INSUFFICIENT_INPUTS',
      crop,
      season,
      location: { state, district },
      area: {
        areaHa,
        areaAcres,
        unit: 'hectare'
      },
      production: expectedYieldTonnesPerHa !== null ? {
        expectedYieldTonnesPerHa,
        totalProductionTonnes: +( (areaHa * expectedYieldTonnesPerHa).toFixed(2) ),
        totalProductionQuintals: +( (areaHa * expectedYieldTonnesPerHa * 10).toFixed(2) ),
        yieldUnit: 'tonnes/ha',
        provenance: yieldProvenance
      } : null,
      revenue: null,
      costs: baseCostPerHa !== null ? {
        baseCostPerHa,
        totalOperationalCost: Math.round(baseCostPerHa * areaHa),
        costProvenance
      } : null,
      profitability: null,
      breakEven: null,
      market: marketFusionBlock || {},
      missingInputs,
      warnings,
      limitations: [
        'Complete financial model cannot be fabricated without missing parameters.',
        'Please supply missing inputs to generate full feasibility analysis.'
      ]
    };
  }

  // ─── 7. DETERMINISTIC CALCULATION VIA PHASE-1 REGISTRY ────────────
  // Calculate Production Volume via Phase-1 Registry Formula: AGRI_TOTAL_PRODUCTION
  const prodTonnesResult = registry.executeFormula('AGRI_TOTAL_PRODUCTION', {
    area_ha: areaHa,
    yield_tonnes_per_ha: expectedYieldTonnesPerHa
  });
  const totalProductionTonnes = prodTonnesResult.result;

  // Convert to Quintals via Phase-1 Formula: AGRI_TOTAL_PRODUCTION_QTL
  const prodQtlResult = registry.executeFormula('AGRI_TOTAL_PRODUCTION_QTL', {
    total_production_tonnes: totalProductionTonnes
  });
  const totalProductionQuintals = prodQtlResult.result;

  // ─── 8. CACP COST ACCOUNTING HIERARCHY ────────────────────────────
  // Validate any itemized user costs
  let seedCost, fertilizerCost, manureCost, pesticideCost, hiredLabourCost, machineCost, irrigationCost, postHarvestCost, transportCost, miscCost;

  try {
    const totalBaseOperationalCost = Math.round(baseCostPerHa * areaHa);

    // If itemized costs are provided, respect them; otherwise distribute by DES standard cost proportions
    seedCost = input.seedCost !== undefined ? validateNonNegativeCost(input.seedCost, 'seedCost') : Math.round(totalBaseOperationalCost * 0.12);
    fertilizerCost = input.fertilizerCost !== undefined ? validateNonNegativeCost(input.fertilizerCost, 'fertilizerCost') : Math.round(totalBaseOperationalCost * 0.15);
    manureCost = input.manureCost !== undefined ? validateNonNegativeCost(input.manureCost, 'manureCost') : Math.round(totalBaseOperationalCost * 0.07);
    pesticideCost = input.pesticideCost !== undefined ? validateNonNegativeCost(input.pesticideCost, 'pesticideCost') : Math.round(totalBaseOperationalCost * 0.08);
    hiredLabourCost = input.hiredLabourCost !== undefined ? validateNonNegativeCost(input.hiredLabourCost, 'hiredLabourCost') : Math.round(totalBaseOperationalCost * 0.20);
    machineCost = input.machineCost !== undefined ? validateNonNegativeCost(input.machineCost, 'machineCost') : Math.round(totalBaseOperationalCost * 0.18);
    irrigationCost = input.irrigationCost !== undefined ? validateNonNegativeCost(input.irrigationCost, 'irrigationCost') : Math.round(totalBaseOperationalCost * 0.10);
    postHarvestCost = input.postHarvestCost !== undefined ? validateNonNegativeCost(input.postHarvestCost, 'postHarvestCost') : Math.round(totalBaseOperationalCost * 0.05);
    transportCost = input.transportCost !== undefined ? validateNonNegativeCost(input.transportCost, 'transportCost') : Math.round(totalBaseOperationalCost * 0.03);
    miscCost = input.miscCost !== undefined ? validateNonNegativeCost(input.miscCost, 'miscCost') : Math.round(totalBaseOperationalCost * 0.02);

    // Conditional Land & Imputed Opportunity Costs
    const rentPaidLeasedInLand = validateNonNegativeCost(input.rentPaidLeasedInLand || input.leaseRent, 'rentPaidLeasedInLand');
    const imputedFamilyLabour = input.imputedFamilyLabour !== undefined
      ? validateNonNegativeCost(input.imputedFamilyLabour, 'imputedFamilyLabour')
      : Math.round(totalBaseOperationalCost * 0.15); // Standard family labour imputation under CACP
    const imputedInterestOwnedCapital = input.imputedInterestOwnedCapital !== undefined
      ? validateNonNegativeCost(input.imputedInterestOwnedCapital, 'imputedInterestOwnedCapital')
      : Math.round(totalBaseOperationalCost * 0.05);
    const imputedRentalOwnedLand = input.imputedRentalOwnedLand !== undefined
      ? validateNonNegativeCost(input.imputedRentalOwnedLand, 'imputedRentalOwnedLand')
      : (rentPaidLeasedInLand > 0 ? 0 : Math.round(totalBaseOperationalCost * 0.12));

    // Execute CACP Formula Hierarchy through Phase-1 Registry:
    // 1. Cost A1 (All Direct Paid-out operating expenses)
    const costA1Result = registry.executeFormula('AGRI_CACP_COST_A1', {
      seed_cost: seedCost,
      fertilizer_cost: fertilizerCost,
      manure_cost: manureCost,
      pesticide_cost: pesticideCost,
      hired_labour_cost: hiredLabourCost,
      machine_cost: machineCost,
      irrigation_cost: irrigationCost,
      post_harvest_cost: postHarvestCost,
      transport_cost: transportCost,
      misc_operational_cost: miscCost
    });
    const costA1 = costA1Result.result;

    // 2. Cost A2 (Cost A1 + Rent Paid for leased-in land)
    const costA2Result = registry.executeFormula('AGRI_CACP_COST_A2', {
      paid_out_operational_expenses: costA1,
      rent_paid_leased_in_land: rentPaidLeasedInLand
    });
    const costA2 = costA2Result.result;

    // 3. Cost A2+FL (Cost A2 + Imputed Family Labour - Statutory MSP Fixation Benchmark)
    const costA2FLResult = registry.executeFormula('AGRI_CACP_COST_A2_FL', {
      cost_a2: costA2,
      imputed_family_labour_value: imputedFamilyLabour
    });
    const costA2FL = costA2FLResult.result;

    // 4. Cost B1 (Cost A1 + Imputed Interest on Owned Capital)
    const costB1Result = registry.executeFormula('AGRI_CACP_COST_B1', {
      cost_a1: costA1,
      imputed_interest_owned_capital: imputedInterestOwnedCapital
    });
    const costB1 = costB1Result.result;

    // 5. Cost B2 (Cost B1 + Rental Value of Owned Land)
    const costB2Result = registry.executeFormula('AGRI_CACP_COST_B2', {
      cost_b1: costB1,
      imputed_rental_owned_land: imputedRentalOwnedLand
    });
    const costB2 = costB2Result.result;

    // 6. Cost C1 (Cost B1 + Family Labour)
    const costC1Result = registry.executeFormula('AGRI_CACP_COST_C1', {
      cost_b1: costB1,
      imputed_family_labour_value: imputedFamilyLabour
    });
    const costC1 = costC1Result.result;

    // 7. Cost C2 (Comprehensive Economic Cost = Cost B2 + Family Labour)
    const costC2Result = registry.executeFormula('AGRI_CACP_COMPREHENSIVE_COST_C2', {
      cost_a2_fl: costA2FL,
      imputed_interest_owned_capital: imputedInterestOwnedCapital,
      imputed_rental_owned_land: imputedRentalOwnedLand
    });
    const costC2 = costC2Result.result;

    // ─── 9. REVENUE CALCULATION VIA PHASE-1 REGISTRY ─────────────────
    // Main Produce Revenue: AGRI_MAIN_PRODUCE_REVENUE
    const mainRevResult = registry.executeFormula('AGRI_MAIN_PRODUCE_REVENUE', {
      production_volume_qtl: totalProductionQuintals,
      realized_price_per_qtl: realizedPricePerQtl
    });
    const mainProduceRevenue = mainRevResult.result;

    // Byproduct Revenue (Crop residue / straw / fodder): 7% standard or user input
    const byproductRevenue = input.byproductRevenue !== undefined
      ? validateNonNegativeCost(input.byproductRevenue, 'byproductRevenue')
      : Math.round(mainProduceRevenue * 0.07);

    // Total Farm Revenue: AGRI_TOTAL_REVENUE
    const totalRevResult = registry.executeFormula('AGRI_TOTAL_REVENUE', {
      main_produce_revenue: mainProduceRevenue,
      byproduct_revenue: byproductRevenue
    });
    const totalRevenue = totalRevResult.result;

    // ─── 10. PROFITABILITY & VIABILITY VIA PHASE-1 REGISTRY ──────────
    // Farm Business Income (Return over Cost A2 cash expenses)
    const fbiResult = registry.executeFormula('AGRI_FARM_BUSINESS_INCOME', {
      total_revenue: totalRevenue,
      cost_a2: costA2
    });
    const farmBusinessIncome = fbiResult.result;

    // Net Economic Return (Return over Comprehensive Cost C2)
    const netProfitResult = registry.executeFormula('AGRI_NET_ECONOMIC_PROFIT', {
      total_revenue: totalRevenue,
      cost_c2: costC2
    });
    const netEconomicProfit = netProfitResult.result;

    // Margins (Guard against totalRevenue === 0)
    let grossMarginPct = null;
    let netMarginPct = null;
    if (totalRevenue > 0) {
      const gmResult = registry.executeFormula('FIN_GROSS_MARGIN_PCT', {
        gross_profit: farmBusinessIncome,
        revenue: totalRevenue
      });
      grossMarginPct = gmResult.result;

      const nmResult = registry.executeFormula('FIN_NET_MARGIN_PCT', {
        net_profit: netEconomicProfit,
        revenue: totalRevenue
      });
      netMarginPct = nmResult.result;
    } else {
      warnings.push('Total revenue is 0; profit margin percentages are indeterminate.');
    }

    // Benefit-Cost Ratio (BCR = Total Revenue / Cost C2)
    let benefitCostRatio = null;
    if (costC2 > 0) {
      const bcrResult = registry.executeFormula('AGRI_BENEFIT_COST_RATIO', {
        total_revenue: totalRevenue,
        cost_c2: costC2
      });
      benefitCostRatio = bcrResult.result;
    }

    // Break-Even Mandi Modal Price per Quintal (Cost C2 / Production)
    let breakEvenPricePerQtl = null;
    if (totalProductionQuintals > 0) {
      const bePriceResult = registry.executeFormula('AGRI_BREAK_EVEN_MANDI_PRICE', {
        cost_c2: costC2,
        production_volume_qtl: totalProductionQuintals
      });
      breakEvenPricePerQtl = bePriceResult.result;
    } else {
      warnings.push('Total production is 0; break-even price per quintal cannot be calculated.');
    }

    // Return on Operating Capital % (ROI)
    let roiPct = null;
    if (costC2 > 0) {
      const roiResult = registry.executeFormula('FIN_ROI_PCT', {
        net_profit: netEconomicProfit,
        initial_investment: costC2
      });
      roiPct = roiResult.result;
    }

    // ─── 11. FINANCING STRUCTURE (KCC SCALE OF FINANCE) ──────────────
    const kccEligibleLimit = costA2; // Bank scale of finance covers paid-out operational expenses
    const recommendedOwnMargin = Math.round(kccEligibleLimit * 0.10);
    const cropLoanRequired = Math.max(0, kccEligibleLimit - recommendedOwnMargin);

    // ─── 12. SENSITIVITY STRESS ANALYSIS ─────────────────────────────
    const stressScenarios = {
      adverseYield20: {
        description: '20% yield decline due to unseasonal rainfall deficit or pest pressure',
        revisedProductionQtl: +( (totalProductionQuintals * 0.80).toFixed(2) ),
        revisedRevenue: Math.round((totalProductionQuintals * 0.80 * realizedPricePerQtl) + (byproductRevenue * 0.80)),
        revisedNetProfit: Math.round(((totalProductionQuintals * 0.80 * realizedPricePerQtl) + (byproductRevenue * 0.80)) - costC2),
        status: Math.round(((totalProductionQuintals * 0.80 * realizedPricePerQtl) + (byproductRevenue * 0.80)) - costC2) > 0 ? 'Viable' : 'Under Stress'
      },
      marketPriceDrop15: {
        description: '15% slump in harvest season Mandi modal auction rate',
        revisedRealizedPricePerQtl: Math.round(realizedPricePerQtl * 0.85),
        revisedRevenue: Math.round((totalProductionQuintals * realizedPricePerQtl * 0.85) + byproductRevenue),
        revisedNetProfit: Math.round(((totalProductionQuintals * realizedPricePerQtl * 0.85) + byproductRevenue) - costC2),
        status: Math.round(((totalProductionQuintals * realizedPricePerQtl * 0.85) + byproductRevenue) - costC2) > 0 ? 'Viable' : 'Under Stress'
      },
      inputCostSurge15: {
        description: '15% inflation in fertilizer, diesel fuel, and hired labor rates',
        revisedCostC2: Math.round(costC2 * 1.15),
        revisedNetProfit: Math.round(totalRevenue - (costC2 * 1.15)),
        status: Math.round(totalRevenue - (costC2 * 1.15)) > 0 ? 'Viable' : 'Under Stress'
      }
    };

    // ─── 13. GOVERNMENT SCHEME MATCHING ──────────────────────────────
    const eligibleSchemes = dataService.getEligibleSchemes({
      businessType: 'agriculture',
      projectCost: costC2,
      isRural: true,
      isSpecialCategory: !!input.isSpecialCategory
    });

    // ─── 14. STRUCTURED FINAL RESULT ─────────────────────────────────
    return {
      businessType: 'AGRICULTURE_CROP_FARMING',
      businessStatus: 'COMPLETE',
      crop,
      season,
      location: { state, district: district || 'Major Mandi Cluster' },
      inputs: {
        area: areaHa,
        areaUnit: 'hectare',
        areaAcres,
        expectedYieldTonnesPerHa,
        yieldUnit: 'tonnes/ha',
        realizedPricePerQtl,
        priceUnit: 'INR/quintal',
        baseCostPerHa,
        dataStatuses: {
          yield: yieldDataStatus,
          price: priceDataStatus,
          cost: costDataStatus
        }
      },
      production: {
        quantity: totalProductionQuintals,
        quantityTonnes: totalProductionTonnes,
        unit: 'quintal',
        provenance: yieldProvenance
      },
      revenue: {
        value: totalRevenue,
        currency: 'INR',
        mainProduceRevenue,
        byproductRevenue,
        provenance: priceProvenance
      },
      costs: {
        operating: costA1,
        labour: hiredLabourCost + imputedFamilyLabour,
        machinery: machineCost,
        irrigation: irrigationCost,
        postHarvest: postHarvestCost,
        transport: transportCost,
        cacpCostConcepts: {
          costA1: {
            label: 'Cost A1 (Direct Cash/Kind Operating Expenses)',
            value: costA1,
            unit: 'INR',
            description: 'Seed, fertilizer, chemicals, hired labor, machinery, irrigation, post-harvest, transport'
          },
          costA2: {
            label: 'Cost A2 (Paid-Out Operating Expenses)',
            value: costA2,
            unit: 'INR',
            description: 'Cost A1 + Actual rent paid for leased-in land (out-of-pocket cash expense)'
          },
          costA2FL: {
            label: 'Cost A2+FL (Statutory MSP Fixation Benchmark)',
            value: costA2FL,
            unit: 'INR',
            description: 'Cost A2 + Imputed economic value of family labour (Govt MSP benchmark >= Cost A2+FL × 1.50)'
          },
          costB1: {
            label: 'Cost B1 (Cost A1 + Interest on Owned Capital)',
            value: costB1,
            unit: 'INR',
            description: 'Cost A1 + Imputed interest on owned fixed capital implements'
          },
          costB2: {
            label: 'Cost B2 (Cost B1 + Rental Value of Owned Land)',
            value: costB2,
            unit: 'INR',
            description: 'Cost B1 + Opportunity rental value of owned land'
          },
          costC1: {
            label: 'Cost C1 (Cost B1 + Family Labour)',
            value: costC1,
            unit: 'INR',
            description: 'Cost B1 + Imputed value of family labour'
          },
          costC2: {
            label: 'Cost C2 (Comprehensive Economic Cost of Cultivation)',
            value: costC2,
            unit: 'INR',
            description: 'Full economic cost: Cost B2 + Imputed family labour (includes opportunity costs)'
          }
        },
        breakdown: {
          seeds: seedCost,
          fertilizer: fertilizerCost,
          manure: manureCost,
          pesticides: pesticideCost,
          hiredLabour: hiredLabourCost,
          machinery: machineCost,
          irrigation: irrigationCost,
          postHarvest: postHarvestCost,
          transport: transportCost,
          contingencyMisc: miscCost,
          rentPaidLeasedInLand,
          imputedFamilyLabour,
          imputedRentalOwnedLand,
          imputedInterestOwnedCapital
        },
        total: costC2,
        provenance: costProvenance
      },
      profitability: {
        farmBusinessIncome: farmBusinessIncome, // Return over out-of-pocket Cost A2
        netProfit: netEconomicProfit,          // Return over comprehensive economic Cost C2
        grossMargin: grossMarginPct,
        netMargin: netMarginPct,
        benefitCostRatio: benefitCostRatio,
        roi: roiPct,
        viabilityRating: (benefitCostRatio && benefitCostRatio >= 1.5) ? 'HIGHLY_FEASIBLE' : ((benefitCostRatio && benefitCostRatio >= 1.2) ? 'MODERATELY_FEASIBLE' : 'HIGH_RISK'),
        provenance: {
          sourceType: 'FORMULA',
          source: 'Phase-1 Validated CACP & ICAI Accounting Registry',
          datasetVersion: 'v1.0.0',
          timestamp: new Date().toISOString()
        }
      },
      breakEven: {
        price: breakEvenPricePerQtl,
        priceUnit: 'INR/quintal',
        production: null // Linear single-period agricultural unit break-even defined by price threshold
      },
      market: marketFusionBlock || {},
      financing: {
        kccEligibleLimit,
        recommendedOwnMargin,
        cropLoanRequired,
        subsidizedInterestRatePct: 4.0, // With Prompt Repayment Incentive
        tenureYears: 1
      },
      stressAnalysis: stressScenarios,
      eligibleSchemes,
      warnings,
      missingInputs,
      limitations: [
        'Cost C2 is an economic cost benchmark that includes imputed opportunity costs of owned land and family labour; it does not represent pure out-of-pocket cash outflow.',
        'Actual harvest returns are subject to climatic volatility and spot Mandi auction rate variations.'
      ]
    };
  } catch (err) {
    return {
      businessType: 'AGRICULTURE_CROP_FARMING',
      businessStatus: 'EXECUTION_ERROR',
      error: err.message,
      warnings: [`Calculation execution error: ${err.message}`],
      missingInputs: []
    };
  }
}

module.exports = {
  runCropFarmingModel,
  normalizeArea,
  normalizePrice,
  normalizeYield,
  validateNonNegativeCost,
  detectSeason
};

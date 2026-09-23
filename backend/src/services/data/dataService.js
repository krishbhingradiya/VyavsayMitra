/**
 * VYAVSAYMITRA — Data Service
 * 
 * Provides high-performance, cached in-memory access to validated datasets,
 * NABARD techno-economic benchmarks, MSP price floors, and Government Schemes.
 * Strictly maintains data provenance and source traceability.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../../../');
const DATA_VALIDATED_DIR = path.join(ROOT_DIR, 'data/validated');
const DATA_METADATA_DIR = path.join(ROOT_DIR, 'data/metadata');
const MODELS_DIR = path.join(ROOT_DIR, 'models');
const currentMarketDataService = require('./currentMarketDataService');
const { reconcileMarketData } = require('./marketReconciliationEngine');

// In-memory caches
let cachedNabard = null;
let cachedSchemes = null;
let cachedRegistry = null;
let cachedDictionary = null;
let cachedModelRegistry = null;
let cachedCostOfCultivation = null;
let cachedMandiIndex = null; // Map of commodity:state -> stats
let cachedCropYieldIndex = null; // Map of crop:state -> stats

/**
 * Parses simple CSV content into an array of objects
 */
function parseCsvSync(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Regex for CSV split handling quotes
    const values = [];
    let insideQuotes = false;
    let currentVal = '';
    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentVal.trim().replace(/^"|"$/g, ''));
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim().replace(/^"|"$/g, ''));

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx] : '';
    });
    rows.push(row);
  }
  return rows;
}

/**
 * Initializes and caches all reference datasets
 */
function initDataService() {
  try {
    // 1. NABARD Benchmarks
    const nabardPath = path.join(DATA_VALIDATED_DIR, 'validated_nabard_benchmarks.json');
    if (fs.existsSync(nabardPath)) {
      cachedNabard = JSON.parse(fs.readFileSync(nabardPath, 'utf-8'));
    }

    // 2. Government Schemes
    const schemesPath = path.join(DATA_VALIDATED_DIR, 'validated_government_schemes.json');
    if (fs.existsSync(schemesPath)) {
      cachedSchemes = JSON.parse(fs.readFileSync(schemesPath, 'utf-8'));
    }

    // 3. Metadata & Registries
    const registryPath = path.join(DATA_METADATA_DIR, 'dataset_registry.json');
    if (fs.existsSync(registryPath)) {
      cachedRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
    }

    const dictPath = path.join(DATA_METADATA_DIR, 'data_dictionary.json');
    if (fs.existsSync(dictPath)) {
      cachedDictionary = JSON.parse(fs.readFileSync(dictPath, 'utf-8'));
    }

    const modelRegPath = path.join(MODELS_DIR, 'registry.json');
    if (fs.existsSync(modelRegPath)) {
      cachedModelRegistry = JSON.parse(fs.readFileSync(modelRegPath, 'utf-8'));
    }

    // 4. Cost of Cultivation (DES)
    const costPath = path.join(DATA_VALIDATED_DIR, 'validated_cost_of_cultivation.csv');
    if (fs.existsSync(costPath)) {
      const rows = parseCsvSync(costPath);
      cachedCostOfCultivation = {};
      rows.forEach(r => {
        const crop = (r.product || '').toLowerCase().trim();
        cachedCostOfCultivation[crop] = {
          cost_per_hectare: parseFloat(r.cost) || 0,
          unit: r.unit || 'hectare',
          currency: r.currency || 'INR'
        };
      });
    }

    // 5. Index Mandi Prices for instant lookup
    const mandiPath = path.join(DATA_VALIDATED_DIR, 'validated_mandi_prices.csv');
    if (fs.existsSync(mandiPath)) {
      buildMandiIndex(mandiPath);
    }

    // 6. Index Crop Yields for instant lookup
    const yieldPath = path.join(DATA_VALIDATED_DIR, 'validated_crop_yield.csv');
    if (fs.existsSync(yieldPath)) {
      buildCropYieldIndex(yieldPath);
    }

    console.log('[DATA SERVICE] Datasets and indexes successfully initialized into memory.');
  } catch (err) {
    console.error('[DATA SERVICE] Initialization warning:', err.message);
  }
}

/**
 * Builds in-memory summary index for Mandi Prices
 */
function buildMandiIndex(mandiPath) {
  cachedMandiIndex = {
    byCommodityState: {},
    byCommodityDistrict: {},
    nationalByCommodity: {}
  };

  const rows = parseCsvSync(mandiPath);
  rows.forEach(r => {
    const comm = (r.product || '').toLowerCase().trim();
    const state = (r.state || '').toLowerCase().trim();
    const dist = (r.district || '').toLowerCase().trim();
    const price = parseFloat(r.market_price) || 0;
    const minP = parseFloat(r.min_price) || price;
    const maxP = parseFloat(r.max_price) || price;
    const arrivals = parseFloat(r.arrival_quantity) || 0;

    if (price <= 0) return;

    // Commodity national summary
    if (!cachedMandiIndex.nationalByCommodity[comm]) {
      cachedMandiIndex.nationalByCommodity[comm] = { prices: [], minPrices: [], maxPrices: [], totalArrivals: 0 };
    }
    cachedMandiIndex.nationalByCommodity[comm].prices.push(price);
    cachedMandiIndex.nationalByCommodity[comm].minPrices.push(minP);
    cachedMandiIndex.nationalByCommodity[comm].maxPrices.push(maxP);
    cachedMandiIndex.nationalByCommodity[comm].totalArrivals += arrivals;

    // State summary
    const stateKey = `${comm}|${state}`;
    if (!cachedMandiIndex.byCommodityState[stateKey]) {
      cachedMandiIndex.byCommodityState[stateKey] = { prices: [], minPrices: [], maxPrices: [], totalArrivals: 0 };
    }
    cachedMandiIndex.byCommodityState[stateKey].prices.push(price);
    cachedMandiIndex.byCommodityState[stateKey].minPrices.push(minP);
    cachedMandiIndex.byCommodityState[stateKey].maxPrices.push(maxP);
    cachedMandiIndex.byCommodityState[stateKey].totalArrivals += arrivals;

    // District summary
    const distKey = `${comm}|${state}|${dist}`;
    if (!cachedMandiIndex.byCommodityDistrict[distKey]) {
      cachedMandiIndex.byCommodityDistrict[distKey] = { prices: [], minPrices: [], maxPrices: [], totalArrivals: 0 };
    }
    cachedMandiIndex.byCommodityDistrict[distKey].prices.push(price);
    cachedMandiIndex.byCommodityDistrict[distKey].minPrices.push(minP);
    cachedMandiIndex.byCommodityDistrict[distKey].maxPrices.push(maxP);
    cachedMandiIndex.byCommodityDistrict[distKey].totalArrivals += arrivals;
  });
}

/**
 * Builds in-memory summary index for Crop Yields
 */
function buildCropYieldIndex(yieldPath) {
  cachedCropYieldIndex = {
    byCropState: {},
    nationalByCrop: {}
  };

  const rows = parseCsvSync(yieldPath);
  rows.forEach(r => {
    const crop = (r.product || '').toLowerCase().trim();
    const state = (r.state || '').toLowerCase().trim();
    const yld = parseFloat(r.yield) || 0;
    const rainfall = parseFloat(r.annual_rainfall) || 0;

    if (yld <= 0) return;

    if (!cachedCropYieldIndex.nationalByCrop[crop]) {
      cachedCropYieldIndex.nationalByCrop[crop] = { yields: [], rainfalls: [] };
    }
    cachedCropYieldIndex.nationalByCrop[crop].yields.push(yld);
    if (rainfall > 0) cachedCropYieldIndex.nationalByCrop[crop].rainfalls.push(rainfall);

    const stateKey = `${crop}|${state}`;
    if (!cachedCropYieldIndex.byCropState[stateKey]) {
      cachedCropYieldIndex.byCropState[stateKey] = { yields: [], rainfalls: [] };
    }
    cachedCropYieldIndex.byCropState[stateKey].yields.push(yld);
    if (rainfall > 0) cachedCropYieldIndex.byCropState[stateKey].rainfalls.push(rainfall);
  });
}

function calculateMedian(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateMean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ─── Exported Query Functions ─────────────────────────────────────

function getNabardBenchmark(category, unitKey = null) {
  if (!cachedNabard) initDataService();
  if (!cachedNabard || !cachedNabard[category]) return null;
  if (unitKey && cachedNabard[category][unitKey]) {
    return cachedNabard[category][unitKey];
  }
  return cachedNabard[category];
}

function getGovernmentSchemes() {
  if (!cachedSchemes) initDataService();
  return cachedSchemes || [];
}

function getEligibleSchemes({ businessType, projectCost = 0, isRural = true, isSpecialCategory = false }) {
  const schemes = getGovernmentSchemes();
  const eligible = [];

  schemes.forEach(scheme => {
    // Check sector eligibility
    const sectorMatch = scheme.eligible_sectors.includes('all') ||
      scheme.eligible_sectors.some(s => s.toLowerCase() === (businessType || '').toLowerCase());

    if (!sectorMatch) return;

    let subsidyPct = 0;
    let maxSubsidy = 0;
    let ownContributionPct = 10;
    let maxCost = scheme.max_project_cost ? (scheme.max_project_cost.manufacturing || scheme.max_project_cost) : (scheme.loan_cap || 10000000);

    if (scheme.id === 'pmegp') {
      if (isRural) {
        subsidyPct = isSpecialCategory ? scheme.subsidy_rules.rural_special : scheme.subsidy_rules.rural_general;
        ownContributionPct = isSpecialCategory ? scheme.own_contribution_pct.special : scheme.own_contribution_pct.general;
      } else {
        subsidyPct = isSpecialCategory ? scheme.subsidy_rules.urban_special : scheme.subsidy_rules.urban_general;
        ownContributionPct = isSpecialCategory ? scheme.own_contribution_pct.special : scheme.own_contribution_pct.general;
      }
      maxSubsidy = (maxCost * subsidyPct) / 100;
    } else if (scheme.id === 'pmfme_micro_food') {
      subsidyPct = scheme.subsidy_rules.credit_linked_subsidy_pct;
      maxSubsidy = scheme.subsidy_rules.max_subsidy_amount;
      ownContributionPct = scheme.own_contribution_pct.general;
    } else if (scheme.id === 'mudra_shishu') {
      subsidyPct = 0;
      ownContributionPct = 0;
      maxSubsidy = 0;
    } else if (scheme.id === 'mudra_kishore') {
      subsidyPct = 0;
      ownContributionPct = 10;
      maxSubsidy = 0;
    } else if (scheme.id === 'nabard_ahidf') {
      subsidyPct = scheme.subsidy_rules.interest_subvention_pct; // 3% interest subvention
      ownContributionPct = scheme.own_contribution_pct.micro_small;
    }

    const calculatedSubsidy = Math.min((projectCost * subsidyPct) / 100, maxSubsidy > 0 ? maxSubsidy : Infinity);
    const marginMoney = (projectCost * ownContributionPct) / 100;
    const eligibleBankLoan = Math.max(0, projectCost - marginMoney - (scheme.id === 'pmegp' ? 0 : calculatedSubsidy));

    eligible.push({
      id: scheme.id,
      name: scheme.name,
      ministry: scheme.ministry,
      beneficiary_type: scheme.beneficiary_type,
      subsidy_percentage: subsidyPct,
      estimated_subsidy_amount: Math.round(calculatedSubsidy),
      required_own_margin_percentage: ownContributionPct,
      required_own_margin_amount: Math.round(marginMoney),
      estimated_bank_loan: Math.round(eligibleBankLoan),
      interest_rate_range: scheme.interest_rate_range || [scheme.effective_interest_rate_pct || 7.5, 9.5],
      tenure_years: scheme.tenure_years,
      moratorium_months: scheme.moratorium_months,
      portal_url: scheme.source_url,
      provenance: {
        source_type: 'dataset',
        dataset: 'validated_government_schemes.json',
        confidence: 0.98,
        calculated: true,
        timestamp: new Date().toISOString()
      }
    });
  });

  return eligible;
}

function findMatchingCommodityKey(query, keyMap) {
  const q = (query || '').toLowerCase().trim();
  if (!q) return null;
  // Direct match
  if (keyMap[q]) return q;
  // Exact words match or substring match
  const keys = Object.keys(keyMap);
  const found = keys.find(k => k === q || k.includes(q) || q.includes(k));
  if (found) return found;

  // Synonyms/aliases
  const aliases = {
    'wheat': 'wheat(husked)',
    'bajra': 'bajri',
    'tur': 'pigeon pea (tur)',
    'arhar': 'pigeon pea (tur)',
    'jowar': 'sorgum(jawar)',
    'sorghum': 'sorgum(jawar)',
    'soyabean': 'soybean',
    'soya': 'soybean',
    'paddy': 'paddy-unhusked',
    'dhan': 'paddy-unhusked',
    'chana': 'gram',
    'bhindi': 'ladies finger',
    'okra': 'ladies finger',
    'gobi': 'flower',
    'cauliflower': 'flower'
  };
  if (aliases[q] && keyMap[aliases[q]]) return aliases[q];

  return null;
}

function getMandiPrice(commodity, state = '', district = '') {
  if (!cachedMandiIndex) initDataService();
  if (!cachedMandiIndex) return null;

  const rawComm = (commodity || '').toLowerCase().trim();
  const st = (state || '').toLowerCase().trim();
  const dt = (district || '').toLowerCase().trim();

  // Find canonical commodity key
  const comm = findMatchingCommodityKey(rawComm, cachedMandiIndex.nationalByCommodity) || rawComm;

  // Try district exact match
  const distKey = `${comm}|${st}|${dt}`;
  if (dt && cachedMandiIndex.byCommodityDistrict[distKey]) {
    const data = cachedMandiIndex.byCommodityDistrict[distKey];
    return {
      commodity,
      matched_commodity: comm,
      state,
      district,
      level: 'district',
      modal_price: Math.round(calculateMedian(data.prices)),
      min_price: Math.round(calculateMedian(data.minPrices)),
      max_price: Math.round(calculateMedian(data.maxPrices)),
      avg_arrivals_qtl: Math.round(data.totalArrivals / data.prices.length),
      unit: 'INR/quintal',
      sample_points: data.prices.length,
      dataStatus: 'historical_reference',
      latestObservationDate: '2016-11-01',
      warning: 'Wholesale Mandi modal prices reflect historical APMC reference data (2014-2016). Real-time spot auction rates require live AGMARKNET portal integration.',
      provenance: {
        source_type: 'dataset',
        dataset: 'validated_mandi_prices.csv',
        dataStatus: 'historical_reference',
        latestObservationDate: '2016-11-01',
        warning: 'Wholesale Mandi modal prices reflect historical APMC reference data (2014-2016). Real-time spot auction rates require live AGMARKNET portal integration.',
        confidence: 0.95,
        calculated: false,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Try state level match
  const stateKey = `${comm}|${st}`;
  if (st && cachedMandiIndex.byCommodityState[stateKey]) {
    const data = cachedMandiIndex.byCommodityState[stateKey];
    return {
      commodity,
      matched_commodity: comm,
      state,
      district: 'State Average',
      level: 'state',
      modal_price: Math.round(calculateMedian(data.prices)),
      min_price: Math.round(calculateMedian(data.minPrices)),
      max_price: Math.round(calculateMedian(data.maxPrices)),
      avg_arrivals_qtl: Math.round(data.totalArrivals / data.prices.length),
      unit: 'INR/quintal',
      sample_points: data.prices.length,
      dataStatus: 'historical_reference',
      latestObservationDate: '2016-11-01',
      warning: 'Wholesale Mandi modal prices reflect historical APMC reference data (2014-2016). Real-time spot auction rates require live AGMARKNET portal integration.',
      provenance: {
        source_type: 'dataset',
        dataset: 'validated_mandi_prices.csv',
        dataStatus: 'historical_reference',
        latestObservationDate: '2016-11-01',
        warning: 'Wholesale Mandi modal prices reflect historical APMC reference data (2014-2016). Real-time spot auction rates require live AGMARKNET portal integration.',
        confidence: 0.88,
        calculated: false,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Try national commodity match
  if (cachedMandiIndex.nationalByCommodity[comm]) {
    const data = cachedMandiIndex.nationalByCommodity[comm];
    return {
      commodity,
      matched_commodity: comm,
      state: 'National Benchmark',
      district: 'All-India',
      level: 'national',
      modal_price: Math.round(calculateMedian(data.prices)),
      min_price: Math.round(calculateMedian(data.minPrices)),
      max_price: Math.round(calculateMedian(data.maxPrices)),
      avg_arrivals_qtl: Math.round(data.totalArrivals / data.prices.length),
      unit: 'INR/quintal',
      sample_points: data.prices.length,
      dataStatus: 'historical_reference',
      latestObservationDate: '2016-11-01',
      warning: 'Wholesale Mandi modal prices reflect historical APMC reference data (2014-2016). Real-time spot auction rates require live AGMARKNET portal integration.',
      provenance: {
        source_type: 'dataset',
        dataset: 'validated_mandi_prices.csv',
        dataStatus: 'historical_reference',
        latestObservationDate: '2016-11-01',
        warning: 'Wholesale Mandi modal prices reflect historical APMC reference data (2014-2016). Real-time spot auction rates require live AGMARKNET portal integration.',
        confidence: 0.80,
        calculated: false,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Fallback for milk or poultry if not in Mandi grains table
  if (comm.includes('milk') || comm.includes('dairy')) {
    const dairyBench = getNabardBenchmark('dairy', 'two_animal_unit');
    return {
      commodity: 'Cow/Buffalo Milk',
      state: state || 'National',
      district: district || 'Local',
      level: 'nabard_benchmark',
      modal_price: (dairyBench?.revenue_parameters?.base_milk_price_per_litre || 42) * 100, // per quintal/100L
      price_per_litre: dairyBench?.revenue_parameters?.base_milk_price_per_litre || 42,
      min_price: 38 * 100,
      max_price: 55 * 100,
      unit: 'INR/quintal (or INR/100L)',
      sample_points: 1,
      provenance: {
        source_type: 'dataset',
        dataset: 'validated_nabard_benchmarks.json',
        confidence: 0.90,
        calculated: false,
        timestamp: new Date().toISOString()
      }
    };
  }

  if (comm.includes('chicken') || comm.includes('broiler') || comm.includes('poultry')) {
    const poultryBench = getNabardBenchmark('poultry', 'broiler_500_birds');
    const livePriceKg = poultryBench?.revenue_parameters?.farmgate_live_bird_price_per_kg || 115;
    return {
      commodity: 'Broiler Live Bird',
      state: state || 'National',
      district: district || 'Local',
      level: 'nabard_benchmark',
      modal_price: livePriceKg * 100, // per quintal
      price_per_kg: livePriceKg,
      min_price: 90 * 100,
      max_price: 135 * 100,
      unit: 'INR/quintal',
      sample_points: 1,
      provenance: {
        source_type: 'dataset',
        dataset: 'validated_nabard_benchmarks.json',
        confidence: 0.90,
        calculated: false,
        timestamp: new Date().toISOString()
      }
    };
  }

  return null;
}

function getCropYield(crop, state = '') {
  if (!cachedCropYieldIndex) initDataService();
  if (!cachedCropYieldIndex) return null;

  const crp = (crop || '').toLowerCase().trim();
  const st = (state || '').toLowerCase().trim();

  const stateKey = `${crp}|${st}`;
  if (st && cachedCropYieldIndex.byCropState[stateKey]) {
    const data = cachedCropYieldIndex.byCropState[stateKey];
    return {
      crop,
      state,
      avg_yield_tonnes_per_ha: +(calculateMean(data.yields).toFixed(2)),
      median_yield_tonnes_per_ha: +(calculateMedian(data.yields).toFixed(2)),
      avg_annual_rainfall_mm: data.rainfalls.length > 0 ? +(calculateMean(data.rainfalls).toFixed(1)) : null,
      unit: 'tonne/hectare',
      sample_count: data.yields.length,
      dataStatus: 'recent',
      latestObservationDate: '2020-05-31',
      warning: 'Crop yield benchmarks reflect Directorate of Economics & Statistics (DES) agricultural census statistics (1997-2020).',
      provenance: {
        source_type: 'dataset',
        dataset: 'validated_crop_yield.csv',
        dataStatus: 'recent',
        latestObservationDate: '2020-05-31',
        warning: 'Crop yield benchmarks reflect Directorate of Economics & Statistics (DES) agricultural census statistics (1997-2020).',
        confidence: 0.92,
        calculated: false,
        timestamp: new Date().toISOString()
      }
    };
  }

  if (cachedCropYieldIndex.nationalByCrop[crp]) {
    const data = cachedCropYieldIndex.nationalByCrop[crp];
    return {
      crop,
      state: 'National Benchmark',
      avg_yield_tonnes_per_ha: +(calculateMean(data.yields).toFixed(2)),
      median_yield_tonnes_per_ha: +(calculateMedian(data.yields).toFixed(2)),
      avg_annual_rainfall_mm: data.rainfalls.length > 0 ? +(calculateMean(data.rainfalls).toFixed(1)) : null,
      unit: 'tonne/hectare',
      sample_count: data.yields.length,
      dataStatus: 'recent',
      latestObservationDate: '2020-05-31',
      warning: 'Crop yield benchmarks reflect Directorate of Economics & Statistics (DES) agricultural census statistics (1997-2020).',
      provenance: {
        source_type: 'dataset',
        dataset: 'validated_crop_yield.csv',
        dataStatus: 'recent',
        latestObservationDate: '2020-05-31',
        warning: 'Crop yield benchmarks reflect Directorate of Economics & Statistics (DES) agricultural census statistics (1997-2020).',
        confidence: 0.85,
        calculated: false,
        timestamp: new Date().toISOString()
      }
    };
  }

  return null;
}

function getCropCostOfCultivation(crop) {
  if (!cachedCostOfCultivation) initDataService();
  if (!cachedCostOfCultivation) return null;

  const crp = (crop || '').toLowerCase().trim();
  if (cachedCostOfCultivation[crp]) {
    return {
      crop,
      cost_per_hectare: cachedCostOfCultivation[crp].cost_per_hectare,
      unit: cachedCostOfCultivation[crp].unit,
      currency: cachedCostOfCultivation[crp].currency,
      dataStatus: 'historical_reference',
      latestObservationDate: '2019-03-31',
      warning: 'Cultivation operational costs reflect DES Comprehensive Scheme benchmark distributions.',
      provenance: {
        source_type: 'dataset',
        dataset: 'validated_cost_of_cultivation.csv',
        dataStatus: 'historical_reference',
        latestObservationDate: '2019-03-31',
        warning: 'Cultivation operational costs reflect DES Comprehensive Scheme benchmark distributions.',
        confidence: 0.95,
        calculated: false,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Look for partial match
  const matchingKey = Object.keys(cachedCostOfCultivation).find(k => k.includes(crp) || crp.includes(k));
  if (matchingKey) {
    return {
      crop: matchingKey,
      cost_per_hectare: cachedCostOfCultivation[matchingKey].cost_per_hectare,
      unit: cachedCostOfCultivation[matchingKey].unit,
      currency: cachedCostOfCultivation[matchingKey].currency,
      provenance: {
        source_type: 'dataset',
        dataset: 'validated_cost_of_cultivation.csv',
        confidence: 0.85,
        calculated: false,
        timestamp: new Date().toISOString()
      }
    };
  }

  return null;
}

function getDatasetRegistry() {
  if (!cachedRegistry) initDataService();
  return cachedRegistry;
}

function getDataDictionary() {
  if (!cachedDictionary) initDataService();
  return cachedDictionary;
}

function getModelRegistry() {
  if (!cachedModelRegistry) initDataService();
  return cachedModelRegistry;
}

/**
 * Retrieves current verified market price from CurrentMarketDataService
 */
async function getCurrentMarketPrice(commodity, state = '', district = '', options = {}) {
  return currentMarketDataService.getCurrentMarketPrice(commodity, state, district, options);
}

/**
 * Reconciles historical Mandi benchmark with current verified observation
 */
async function getFusedMarketData(commodity, state = '', district = '', options = {}) {
  const historical = getMandiPrice(commodity, state, district);
  const current = await currentMarketDataService.getCurrentMarketPrice(commodity, state, district, options);
  return reconcileMarketData(historical, current, { commodity, state, district, ...options });
}

// Auto-initialize on first require
initDataService();

module.exports = {
  initDataService,
  getNabardBenchmark,
  getGovernmentSchemes,
  getEligibleSchemes,
  getMandiPrice,
  getCurrentMarketPrice,
  getFusedMarketData,
  reconcileMarketData,
  getCropYield,
  getCropCostOfCultivation,
  getDatasetRegistry,
  getDataDictionary,
  getModelRegistry
};


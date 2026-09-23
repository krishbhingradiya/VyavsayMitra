/**
 * VYAVSAYMITRA — Business Idea Classifier & Extensible Archetype Engine
 * 
 * Classifies any user-entered business idea into:
 * 1. The 4 core project categories: dairy, poultry, agriculture, food-processing
 * 2. Or an extended rural micro-enterprise archetype (livestock_allied, micro_manufacturing, rural_service_retail)
 * 
 * Never crashes on novel business ideas. Extrapolates missing parameters, provides
 * transparent assumptions, and enables full financial and scheme structuring.
 */

const CATEGORY_KEYWORDS = {
  dairy: [
    'dairy', 'cow', 'cattle', 'buffalo', 'milk', 'dudh', 'dairy farm', 'paneer',
    'ghee', 'curd', 'murrah', 'jersey', 'gir', 'gaushala', 'milch'
  ],
  poultry: [
    'poultry', 'chicken', 'broiler', 'layer', 'egg', 'birds', 'chick', 'hatchery',
    'desi chicken', 'kadaknath', 'quail', 'poultry farm', 'murgi'
  ],
  agriculture: [
    'crop', 'agriculture', 'farming', 'kheti', 'wheat', 'rice', 'paddy', 'cotton',
    'soyabean', 'soybean', 'maize', 'corn', 'sugarcane', 'bajra', 'jowar', 'gram',
    'chana', 'mustard', 'tur', 'arhar', 'groundnut', 'onion', 'potato', 'tomato',
    'vegetable', 'horticulture', 'floriculture', 'polyhouse', 'greenhouse',
    'mushroom', 'organic farming', 'hydroponics', 'fruit orchard'
  ],
  'food-processing': [
    'food processing', 'agro processing', 'flour', 'atta', 'chakki', 'mill',
    'dal mill', 'oil mill', 'oil expeller', 'cold press oil', 'spice grinding',
    'masala', 'pickle', 'achar', 'jam', 'papad', 'bakery', 'namkeen', 'dry fruits',
    'juice', 'tomato ketchup', 'honey processing', 'chips'
  ],
  livestock_allied: [
    'goat', 'bakri', 'sheep', 'bhed', 'piggery', 'pig farm', 'fish', 'fishery',
    'aquaculture', 'biofloc', 'prawn', 'duck', 'beekeeping', 'apiculture',
    'honey bee', 'vermicompost', 'earthworm'
  ],
  micro_manufacturing: [
    'manufacturing', 'fabrication', 'welding', 'carpentry', 'furniture', 'pottery',
    'fly ash brick', 'brick kiln', 'soap making', 'candle', 'paper cup', 'jute bag',
    'handloom', 'handicraft', 'cloth bag', 'packaging'
  ],
  rural_service_retail: [
    'retail', 'shop', 'kirana', 'grocery', 'general store', 'repair', 'workshop',
    'tractor service', 'cycle shop', 'tailoring', 'salon', 'beauty parlour',
    'csc centre', 'cyber cafe', 'logistics', 'transport', 'solar installation'
  ]
};

/**
 * Classifies a user's business query or description
 * 
 * @param {string} rawInput - Text describing the business idea
 * @returns {Object} Classification result with archetype, parameters, and defaults
 */
function classifyBusinessIdea(rawInput = '') {
  const text = (rawInput || '').toLowerCase().trim();

  let bestMatch = 'general_micro_enterprise';
  let bestScore = 0;
  const matchedKeywords = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) {
        score += kw.length > 5 ? 2 : 1;
        matchedKeywords.push(kw);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  }

  // Determine if it maps directly to one of the 4 core application categories
  const isCoreCategory = ['dairy', 'poultry', 'agriculture', 'food-processing'].includes(bestMatch);
  
  // Mapping extended archetypes to closest calculation engine template
  let mappedCalculationTemplate = 'general_msme';
  if (bestMatch === 'dairy' || bestMatch === 'livestock_allied') {
    mappedCalculationTemplate = 'dairy';
  } else if (bestMatch === 'poultry') {
    mappedCalculationTemplate = 'poultry';
  } else if (bestMatch === 'agriculture') {
    mappedCalculationTemplate = 'crop';
  } else if (bestMatch === 'food-processing') {
    mappedCalculationTemplate = 'food-processing';
  }

  // Extract scale clues if present in text (e.g. "5 cows", "1000 birds", "2 acres", "500 kg")
  const scaleExtraction = extractScaleFromText(text);

  // Missing parameters guidance
  const parameterAnalysis = analyzeMissingParameters(bestMatch, scaleExtraction);

  return {
    originalInput: rawInput,
    detectedCategory: bestMatch,
    isCoreCategory: isCoreCategory,
    mappedCalculationTemplate: mappedCalculationTemplate,
    confidence: bestScore > 0 ? Math.min(0.95, 0.60 + (bestScore * 0.10)) : 0.50,
    matchedKeywords: [...new Set(matchedKeywords)],
    extractedScale: scaleExtraction,
    knownParameters: parameterAnalysis.known,
    missingParameters: parameterAnalysis.missing,
    defaultAssumptions: parameterAnalysis.assumptions,
    archetypeProfile: getArchetypeProfile(bestMatch)
  };
}

/**
 * Extracts numeric scale hints from user input
 */
function extractScaleFromText(text) {
  const scale = {};

  const cowMatch = text.match(/(\d+)\s*(cow|cows|buffalo|buffaloes|animal|animals|cattle)/);
  if (cowMatch) scale.animalCount = parseInt(cowMatch[1], 10);

  const birdMatch = text.match(/(\d+)\s*(bird|birds|chicken|chicks|broiler)/);
  if (birdMatch) scale.birdCapacity = parseInt(birdMatch[1], 10);

  const acreMatch = text.match(/(\d+(\.\d+)?)\s*(acre|acres|vigha|bigha)/);
  if (acreMatch) scale.areaAcres = parseFloat(acreMatch[1]);

  const haMatch = text.match(/(\d+(\.\d+)?)\s*(ha|hectare|hectares)/);
  if (haMatch) scale.areaHa = parseFloat(haMatch[1]);

  const capitalMatch = text.match(/(\d+(\.\d+)?)\s*(lakh|lakhs|k|thousand|rupees|rs|inr)/);
  if (capitalMatch) {
    const val = parseFloat(capitalMatch[1]);
    const unit = capitalMatch[3].toLowerCase();
    if (unit.includes('lakh')) scale.capitalAvailable = val * 100000;
    else if (unit === 'k' || unit.includes('thousand')) scale.capitalAvailable = val * 1000;
    else scale.capitalAvailable = val;
  }

  return scale;
}

/**
 * Analyzes required vs missing domain parameters
 */
function analyzeMissingParameters(category, extractedScale) {
  const known = [];
  const missing = [];
  const assumptions = [];

  if (category === 'dairy' || category === 'livestock_allied') {
    if (extractedScale.animalCount) {
      known.push(`Animal count: ${extractedScale.animalCount}`);
    } else {
      missing.push({ key: 'animalCount', label: 'Number of milch animals', default: 2, unit: 'heads' });
      assumptions.push('Defaulted to standard NABARD 2-cow micro-dairy unit');
    }
    missing.push({ key: 'customMilkPrice', label: 'Expected milk selling price (optional)', default: 44.5, unit: 'INR/Litre' });
  } else if (category === 'poultry') {
    if (extractedScale.birdCapacity) {
      known.push(`Bird capacity: ${extractedScale.birdCapacity}`);
    } else {
      missing.push({ key: 'birdCapacity', label: 'Number of broiler birds per batch', default: 500, unit: 'birds' });
      assumptions.push('Defaulted to standard NABARD 500-broiler batch cycle');
    }
  } else if (category === 'agriculture') {
    if (extractedScale.areaAcres || extractedScale.areaHa) {
      known.push(`Land area: ${extractedScale.areaHa || (extractedScale.areaAcres / 2.471)} Ha`);
    } else {
      missing.push({ key: 'areaHa', label: 'Cultivation land area', default: 1.0, unit: 'Hectare' });
      assumptions.push('Defaulted to 1 Hectare (2.47 Acres) operational holding');
    }
    missing.push({ key: 'crop', label: 'Specific crop commodity', default: 'Wheat', unit: 'crop' });
  } else if (category === 'food-processing') {
    missing.push({ key: 'monthlyCapacityKg', label: 'Monthly raw processing volume', default: 16000, unit: 'kg/month' });
    assumptions.push('Assumes 16,000 kg/month commercial milling capacity with 65% initial utilization');
  } else {
    missing.push({ key: 'totalInvestment', label: 'Estimated initial machinery & setup cost', default: 150000, unit: 'INR' });
    missing.push({ key: 'monthlyRevenue', label: 'Expected gross monthly business sales', default: 45000, unit: 'INR' });
    assumptions.push('Applies standard PMEGP / MUDRA micro-enterprise cost-return archetype');
  }

  return { known, missing, assumptions };
}

/**
 * Returns descriptive profile for archetypes
 */
function getArchetypeProfile(archetype) {
  const profiles = {
    dairy: {
      name: 'Dairy & Milk Animal Husbandry',
      primaryScheme: 'AHIDF / PMEGP / KCC',
      typicalMarginPct: 10,
      riskLevel: 'Low to Moderate',
      liquidityDays: 'Daily / Weekly (Dairy cooperative payout)'
    },
    poultry: {
      name: 'Commercial Broiler / Layer Poultry',
      primaryScheme: 'AHIDF / PMEGP',
      typicalMarginPct: 10,
      riskLevel: 'Moderate (Price & Disease Sensitivity)',
      liquidityDays: '42 to 45 Days (per batch harvest)'
    },
    agriculture: {
      name: 'Field Crops & Horticulture',
      primaryScheme: 'KCC / PM-KISAN / AIF',
      typicalMarginPct: 10,
      riskLevel: 'Moderate (Weather & Mandi Volatility)',
      liquidityDays: 'Seasonal (120 to 180 Days at harvest)'
    },
    'food-processing': {
      name: 'Micro Agro & Food Processing (PMFME)',
      primaryScheme: 'PMFME (35% Subsidy) / PMEGP',
      typicalMarginPct: 15,
      riskLevel: 'Low to Moderate',
      liquidityDays: 'Daily / Continuous retail-jobwork cashflow'
    },
    livestock_allied: {
      name: 'Small Ruminants & Aquaculture (Goat/Fish)',
      primaryScheme: 'National Livestock Mission / PMMSY / PMEGP',
      typicalMarginPct: 10,
      riskLevel: 'Moderate',
      liquidityDays: 'Quarterly to Semi-Annual'
    },
    micro_manufacturing: {
      name: 'Rural Micro-Manufacturing / Fabrication',
      primaryScheme: 'PMEGP (Up to 35% Rural Subsidy)',
      typicalMarginPct: 10,
      riskLevel: 'Moderate',
      liquidityDays: 'Monthly commercial invoicing'
    },
    rural_service_retail: {
      name: 'Rural Service & Retail Enterprise',
      primaryScheme: 'MUDRA Shishu/Kishore / PMEGP Service',
      typicalMarginPct: 10,
      riskLevel: 'Low',
      liquidityDays: 'Daily retail cash transactions'
    },
    general_micro_enterprise: {
      name: 'General Micro-Enterprise Archetype',
      primaryScheme: 'PMEGP / MUDRA',
      typicalMarginPct: 10,
      riskLevel: 'Moderate',
      liquidityDays: 'Monthly'
    }
  };

  return profiles[archetype] || profiles.general_micro_enterprise;
}

module.exports = {
  classifyBusinessIdea,
  extractScaleFromText,
  getArchetypeProfile
};

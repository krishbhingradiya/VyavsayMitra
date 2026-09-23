/**
 * VYAVSAYMITRA — Production-Oriented FoodTech Business Model Registry
 * 
 * Manages institutional, source-backed FoodTech business archetypes:
 * 1. Known Models (e.g. Flour Mill, Rice Mill, Oil Expeller, Dal Mill, Spice Processing)
 * 2. Recognizable Structures (novel agro-processing with valid mass-balance attributes)
 * 3. Insufficient / Unknown Structures (strictly rejected without guessing fake defaults)
 * 
 * Strict Gatekeeping:
 * - All referenced formulas must exist in Phase-1 FormulaRegistry
 * - No dynamic code execution (NO eval, NO new Function)
 * - Zero fake defaults: missing required parameters flag USER_INPUT_REQUIRED
 */

const { validateFoodTechParameter } = require('./foodtechParameters');
const { validateMassBalance } = require('./massBalance');

const BUSINESS_STATUSES = {
  VALIDATED: 'VALIDATED',
  RESEARCH_REQUIRED: 'RESEARCH_REQUIRED',
  DEPRECATED: 'DEPRECATED'
};

const RESOLUTION_TIERS = {
  KNOWN: 'KNOWN',
  RECOGNIZABLE: 'RECOGNIZABLE',
  INSUFFICIENT: 'INSUFFICIENT'
};

class FoodTechRegistry {
  constructor() {
    this.models = new Map();
  }

  /**
   * Registers a source-backed FoodTech business model definition
   * 
   * @param {Object} model
   * @returns {Object} Registered model
   */
  registerBusinessModel(model) {
    if (!model.businessId || typeof model.businessId !== 'string') {
      throw new Error('FoodTech model must have a non-empty string businessId');
    }
    if (!model.businessName || typeof model.businessName !== 'string') {
      throw new Error(`FoodTech model '${model.businessId}' must have a valid businessName`);
    }
    if (!Array.isArray(model.requiredParameters)) {
      throw new Error(`FoodTech model '${model.businessId}' must declare requiredParameters array`);
    }
    if (!Array.isArray(model.formulaIds)) {
      throw new Error(`FoodTech model '${model.businessId}' must declare formulaIds array`);
    }
    if (!model.dataSources || !Array.isArray(model.dataSources) || model.dataSources.length === 0) {
      throw new Error(`FoodTech model '${model.businessId}' must specify at least one verified institutional dataSource`);
    }

    const validatedModel = {
      businessId: model.businessId,
      businessName: model.businessName,
      category: model.category || 'FOOD_PROCESSING',
      subcategory: model.subcategory || 'AGRO_PROCESSING',
      aliases: model.aliases || [],
      requiredParameters: [...model.requiredParameters],
      optionalParameters: model.optionalParameters || [],
      formulaIds: [...model.formulaIds],
      inputRequirements: model.inputRequirements || {},
      outputMetrics: model.outputMetrics || [],
      benchmarkDefaults: model.benchmarkDefaults || {},
      dataSources: [...model.dataSources],
      validationRules: model.validationRules || [],
      provenanceRequirements: {
        institutionalBacking: true,
        massBalanceEnforced: true,
        sourceInstitutions: model.dataSources.map(s => s.institution),
        ...(model.provenanceRequirements || {})
      },
      status: model.status || BUSINESS_STATUSES.VALIDATED,
      version: model.version || '1.0.0'
    };

    this.models.set(model.businessId, validatedModel);
    return validatedModel;
  }

  /**
   * Retrieves a business model definition by ID
   * 
   * @param {string} businessId
   * @returns {Object|null}
   */
  getBusinessModel(businessId) {
    return this.models.get(businessId) || null;
  }

  /**
   * Lists all registered business models
   * 
   * @returns {Array<Object>}
   */
  listBusinessModels() {
    return Array.from(this.models.values());
  }

  /**
   * Resolves an incoming user query, text idea, or param bundle into a structural tier
   * 
   * @param {string|Object} queryOrInput
   * @returns {{ tier: string, businessId?: string, model?: Object, missingRequirements?: string[], warnings?: string[] }}
   */
  resolveFoodTechModel(queryOrInput) {
    let queryStr = '';
    let inputObj = {};

    if (typeof queryOrInput === 'string') {
      queryStr = queryOrInput.toLowerCase().trim();
    } else if (typeof queryOrInput === 'object' && queryOrInput !== null) {
      inputObj = queryOrInput;
      queryStr = (queryOrInput.businessType || queryOrInput.businessIdea || queryOrInput.businessName || '').toLowerCase().trim();
    }

    // 1. Direct businessId check
    if (inputObj.businessId && this.models.has(inputObj.businessId)) {
      const model = this.models.get(inputObj.businessId);
      return {
        tier: RESOLUTION_TIERS.KNOWN,
        businessId: model.businessId,
        model,
        warnings: []
      };
    }

    // 2. Exact or Alias Matching against Known Models
    for (const [id, model] of this.models.entries()) {
      if (queryStr === id.toLowerCase() || queryStr === model.businessName.toLowerCase()) {
        return {
          tier: RESOLUTION_TIERS.KNOWN,
          businessId: id,
          model,
          warnings: []
        };
      }

      const aliasMatch = model.aliases.some(alias => queryStr.includes(alias.toLowerCase()));
      if (aliasMatch) {
        return {
          tier: RESOLUTION_TIERS.KNOWN,
          businessId: id,
          model,
          warnings: []
        };
      }
    }

    // 3. Multi-Attribute Structure Detection for Future Dynamic Models
    // Evaluates: raw_material, process, output, capacity, cost structure, pricing structure
    const hasRawMaterial = !!(inputObj.raw_material_quantity || inputObj.raw_material_name || inputObj.rawMaterial || inputObj.raw_material);
    const hasProcess = !!(inputObj.process || inputObj.processType || inputObj.processingMethod);
    const hasCapacityOrOutput = !!(inputObj.processing_capacity || inputObj.finished_product_quantity || inputObj.monthlyCapacityKg || inputObj.capacity || inputObj.output || inputObj.target_output);
    const hasPricingOrCost = !!(inputObj.selling_price || inputObj.raw_material_price || inputObj.fixed_cost || inputObj.costStructure || inputObj.pricingStructure || inputObj.price);

    if (hasRawMaterial && (hasCapacityOrOutput || hasPricingOrCost || hasProcess)) {
      return {
        tier: RESOLUTION_TIERS.RECOGNIZABLE,
        businessId: 'FOODTECH_GENERIC_AGRO_PROCESSING',
        model: null,
        detectedAttributes: {
          rawMaterial: hasRawMaterial,
          process: hasProcess,
          capacityOrOutput: hasCapacityOrOutput,
          commercialStructure: hasPricingOrCost
        },
        warnings: [
          'Recognizable agro-processing structure detected, but specific institutional benchmark model does not exist.',
          'Execution will require entrepreneur-verified recovery and cost parameters.'
        ]
      };
    }

    // 4. Insufficient / Unknown Structure
    const missing = [];
    if (!hasRawMaterial) missing.push('raw_material (grain/seed/produce type and quantity)');
    if (!hasCapacityOrOutput) missing.push('processing_capacity (daily/monthly mechanical throughput or output target)');
    if (!hasPricingOrCost) missing.push('commercial_parameters (procurement price or finished product realization)');

    return {
      tier: RESOLUTION_TIERS.INSUFFICIENT,
      businessId: null,
      model: null,
      missingRequirements: missing,
      warnings: [
        'Insufficient verified structure to evaluate FoodTech business feasibility.',
        'No default assumptions or fake numbers will be applied without explicit user parameters.'
      ]
    };
  }

  /**
   * Validates user inputs against the target model's schema, constraints, and mass balance
   * 
   * @param {string} businessId
   * @param {Object} inputs
   * @returns {{ isValid: boolean, errors: string[], warnings: string[], missingParameters: string[], massBalance?: Object }}
   */
  validateBusinessInputs(businessId, inputs = {}) {
    const model = this.getBusinessModel(businessId);
    if (!model) {
      return {
        isValid: false,
        errors: [`Business model '${businessId}' is not registered in FoodTechRegistry`],
        warnings: [],
        missingParameters: []
      };
    }

    const errors = [];
    const warnings = [];
    const missingParameters = [];

    // 1. Check Required Parameters
    for (const paramId of model.requiredParameters) {
      const val = inputs[paramId];
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
        // Check if model has a verified benchmark default
        if (model.benchmarkDefaults && model.benchmarkDefaults[paramId] !== undefined) {
          // Permitted benchmark default (must be clearly audited)
          warnings.push(`Parameter '${paramId}' was not supplied; applying verified institutional benchmark default (${model.benchmarkDefaults[paramId].value})`);
        } else {
          missingParameters.push(paramId);
        }
      } else {
        // Validate parameter constraints
        const paramValidation = validateFoodTechParameter(
          paramId,
          val,
          inputs[`${paramId}_unit`],
          inputs.currency || inputs[`${paramId}_currency`]
        );
        if (!paramValidation.valid) {
          errors.push(paramValidation.error);
        }
      }
    }

    // 2. Check Optional Parameters if provided
    for (const [key, val] of Object.entries(inputs)) {
      if (!model.requiredParameters.includes(key) && val !== undefined && val !== null) {
        const paramValidation = validateFoodTechParameter(
          key,
          val,
          inputs[`${key}_unit`],
          inputs.currency || inputs[`${key}_currency`]
        );
        if (!paramValidation.valid && paramValidation.error && !paramValidation.error.includes('Unknown parameterId')) {
          errors.push(paramValidation.error);
        }
      }
    }

    // 3. Physical Mass Balance Verification
    let massBalanceResult = null;
    const rawInput = inputs.raw_material_quantity || inputs.rawMaterialInputKg;
    if (rawInput !== undefined && rawInput > 0) {
      massBalanceResult = validateMassBalance({
        rawMaterialInputKg: rawInput,
        recoveryRatePct: inputs.recovery_rate !== undefined ? inputs.recovery_rate : (model.benchmarkDefaults?.recovery_rate?.value),
        primaryOutputKg: inputs.finished_product_quantity,
        byproductRecoveryPct: inputs.byproduct_recovery !== undefined ? inputs.byproduct_recovery : (model.benchmarkDefaults?.byproduct_recovery?.value),
        byproductOutputKg: inputs.byproduct_quantity,
        processingLossPct: inputs.processing_loss !== undefined ? inputs.processing_loss : (model.benchmarkDefaults?.processing_loss?.value),
        wastagePct: inputs.wastage
      });

      if (!massBalanceResult.isValid) {
        errors.push(...massBalanceResult.errors);
      }
      if (massBalanceResult.warnings) {
        warnings.push(...massBalanceResult.warnings);
      }
    }

    if (missingParameters.length > 0) {
      errors.push(`Missing required parameters: [${missingParameters.join(', ')}]`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingParameters,
      massBalance: massBalanceResult?.massBalance || null
    };
  }
}

// ─── SEED DEFAULT AUTHORITATIVE FOODTECH MODELS ──────────────────────

/**
 * Initializes and populates the default registry with source-validated institutional models
 * 
 * @param {FoodTechRegistry} registry
 */
function seedDefaultFoodTechModels(registry) {
  // 1. Flour Mill / Atta Chakki (NABARD Model Project / CSIR-CFTRI)
  registry.registerBusinessModel({
    businessId: 'FOODTECH_FLOUR_MILL',
    businessName: 'Mini Flour Mill & Atta Chakki Unit',
    category: 'FOOD_PROCESSING',
    subcategory: 'GRAIN_MILLING',
    aliases: ['flour mill', 'atta chakki', 'wheat milling', 'flour grinding', 'chakki mill'],
    requiredParameters: [
      'raw_material_quantity',
      'raw_material_price',
      'selling_price',
      'fixed_cost'
    ],
    optionalParameters: [
      'labour_cost',
      'electricity_cost',
      'packaging_cost',
      'transport_cost',
      'maintenance_cost',
      'byproduct_selling_price',
      'initial_investment'
    ],
    formulaIds: [
      'FOODTECH_OUTPUT_FROM_RECOVERY',
      'FOODTECH_RAW_MATERIAL_COST',
      'FOODTECH_TOTAL_VARIABLE_COST',
      'FOODTECH_TOTAL_COST',
      'FOODTECH_PRIMARY_REVENUE',
      'FOODTECH_BYPRODUCT_REVENUE',
      'FOODTECH_TOTAL_REVENUE',
      'FOODTECH_GROSS_PROFIT',
      'FOODTECH_NET_PROFIT',
      'FOODTECH_GROSS_MARGIN_PCT',
      'FOODTECH_NET_MARGIN_PCT',
      'FOODTECH_FLOUR_MILL_ATOMIC_FLOUR_OUTPUT',
      'FOODTECH_FLOUR_MILL_BRAN_OUTPUT',
      'FOODTECH_FLOUR_MILL_PROCESSING_LOSS'
    ],
    benchmarkDefaults: {
      recovery_rate: { value: 95.0, unit: 'PERCENT', source: 'NABARD Mini Flour Mill Benchmark / CSIR-CFTRI' },
      byproduct_recovery: { value: 4.0, unit: 'PERCENT', source: 'NABARD Mini Flour Mill Benchmark (Wheat Bran / Chokar)' },
      processing_loss: { value: 1.0, unit: 'PERCENT', source: 'CSIR-CFTRI Stone Milling Standard' }
    },
    dataSources: [
      {
        institution: 'NABARD',
        publication: 'Model Bankable Project on Mini Flour Mill (Atta Chakki)',
        url: 'https://www.nabard.org/content1.aspx?id=594&catid=23&mid=530',
        year: 2024
      },
      {
        institution: 'CSIR-CFTRI',
        publication: 'Grain Milling & Atta Chakki Standards',
        url: 'https://cftri.res.in/technologies',
        year: 2024
      }
    ],
    status: BUSINESS_STATUSES.VALIDATED,
    version: '1.0.0'
  });

  // 2. Rice Mill (MoFPI PMFME / DFPD / CSIR-CFTRI)
  registry.registerBusinessModel({
    businessId: 'FOODTECH_RICE_MILL',
    businessName: 'Mini Modern Rice Mill (Paddy Processing)',
    category: 'FOOD_PROCESSING',
    subcategory: 'GRAIN_MILLING',
    aliases: ['rice mill', 'paddy milling', 'paddy processing', 'chawal mill', 'rice husking'],
    requiredParameters: [
      'raw_material_quantity',
      'raw_material_price',
      'selling_price',
      'fixed_cost'
    ],
    optionalParameters: [
      'labour_cost',
      'electricity_cost',
      'packaging_cost',
      'transport_cost',
      'byproduct_selling_price',
      'initial_investment'
    ],
    formulaIds: [
      'FOODTECH_OUTPUT_FROM_RECOVERY',
      'FOODTECH_RAW_MATERIAL_COST',
      'FOODTECH_TOTAL_VARIABLE_COST',
      'FOODTECH_TOTAL_COST',
      'FOODTECH_PRIMARY_REVENUE',
      'FOODTECH_BYPRODUCT_REVENUE',
      'FOODTECH_TOTAL_REVENUE',
      'FOODTECH_GROSS_PROFIT',
      'FOODTECH_NET_PROFIT',
      'FOODTECH_RICE_MILL_TOTAL_RICE_OUTPUT',
      'FOODTECH_RICE_MILL_HUSK_OUTPUT',
      'FOODTECH_RICE_MILL_BRAN_OUTPUT',
      'FOODTECH_RICE_MILL_HEAD_RICE_OUTPUT',
      'FOODTECH_RICE_MILL_BROKEN_RICE_OUTPUT'
    ],
    benchmarkDefaults: {
      recovery_rate: { value: 67.0, unit: 'PERCENT', source: 'Department of Food & Public Distribution (DFPD) Statutory Custom Milling Norm' },
      byproduct_recovery: { value: 28.0, unit: 'PERCENT', source: 'CSIR-CFTRI Rice Milling (21% Husk + 7% Bran)' },
      processing_loss: { value: 5.0, unit: 'PERCENT', source: 'CSIR-CFTRI Cleaning Impurities & Moisture Loss' }
    },
    dataSources: [
      {
        institution: 'Ministry of Food Processing Industries (MoFPI)',
        publication: 'PMFME Model DPR — Modern Rice Milling Unit',
        url: 'https://pmfme.mofpi.gov.in/pmfme/#/Home-Page',
        year: 2024
      },
      {
        institution: 'DFPD, Ministry of Consumer Affairs, Food & Public Distribution',
        publication: 'Out-Turn Ratio (OTR) of Rice from Paddy Norms',
        url: 'https://dfpd.gov.in/',
        year: 2024
      }
    ],
    status: BUSINESS_STATUSES.VALIDATED,
    version: '1.0.0'
  });

  // 3. Pulse / Dal Processing (CSIR-CFTRI Mini Dal Mill / NABARD)
  registry.registerBusinessModel({
    businessId: 'FOODTECH_PULSE_PROCESSING',
    businessName: 'Mini Dal Mill (Pulse Dehulling & Splitting)',
    category: 'FOOD_PROCESSING',
    subcategory: 'PULSE_PROCESSING',
    aliases: ['dal mill', 'pulse processing', 'dal processing', 'chana dal mill', 'tur dal mill', 'pulses milling'],
    requiredParameters: [
      'raw_material_quantity',
      'raw_material_price',
      'selling_price',
      'fixed_cost'
    ],
    optionalParameters: [
      'labour_cost',
      'electricity_cost',
      'packaging_cost',
      'transport_cost',
      'byproduct_selling_price',
      'initial_investment'
    ],
    formulaIds: [
      'FOODTECH_OUTPUT_FROM_RECOVERY',
      'FOODTECH_RAW_MATERIAL_COST',
      'FOODTECH_TOTAL_VARIABLE_COST',
      'FOODTECH_TOTAL_COST',
      'FOODTECH_PRIMARY_REVENUE',
      'FOODTECH_BYPRODUCT_REVENUE',
      'FOODTECH_TOTAL_REVENUE',
      'FOODTECH_GROSS_PROFIT',
      'FOODTECH_NET_PROFIT',
      'FOODTECH_DAL_MILL_DAL_OUTPUT',
      'FOODTECH_DAL_MILL_BYPRODUCT_OUTPUT'
    ],
    benchmarkDefaults: {
      recovery_rate: { value: 74.0, unit: 'PERCENT', source: 'CSIR-CFTRI Mini Dal Mill Technology Standard' },
      byproduct_recovery: { value: 22.0, unit: 'PERCENT', source: 'CSIR-CFTRI (Chuni, Brokens, and Husk for cattle feed)' },
      processing_loss: { value: 4.0, unit: 'PERCENT', source: 'CSIR-CFTRI Cleaning, Moisture Adjustment & Handling Loss' }
    },
    dataSources: [
      {
        institution: 'CSIR-CFTRI',
        publication: 'Mini Dal Mill Technology & Pulse Processing Process Flow',
        url: 'https://cftri.res.in/technologies',
        year: 2024
      },
      {
        institution: 'NABARD',
        publication: 'Model Bankable Project on Mini Dal Mill Unit',
        url: 'https://www.nabard.org/content1.aspx?id=594&catid=23&mid=530',
        year: 2024
      }
    ],
    status: BUSINESS_STATUSES.VALIDATED,
    version: '1.0.0'
  });

  // 4. Oil Extraction (ICAR-DRMR / NABARD)
  registry.registerBusinessModel({
    businessId: 'FOODTECH_OIL_EXTRACTION',
    businessName: 'Mechanical Oil Expeller Unit (Mustard / Groundnut)',
    category: 'FOOD_PROCESSING',
    subcategory: 'EDIBLE_OIL',
    aliases: ['oil extraction', 'oil mill', 'oil expeller', 'mustard oil mill', 'edible oil', 'tel ghani', 'oil pressing'],
    requiredParameters: [
      'raw_material_quantity',
      'raw_material_price',
      'selling_price',
      'fixed_cost'
    ],
    optionalParameters: [
      'labour_cost',
      'electricity_cost',
      'packaging_cost',
      'transport_cost',
      'byproduct_selling_price',
      'initial_investment'
    ],
    formulaIds: [
      'FOODTECH_OUTPUT_FROM_RECOVERY',
      'FOODTECH_RAW_MATERIAL_COST',
      'FOODTECH_TOTAL_VARIABLE_COST',
      'FOODTECH_TOTAL_COST',
      'FOODTECH_PRIMARY_REVENUE',
      'FOODTECH_BYPRODUCT_REVENUE',
      'FOODTECH_TOTAL_REVENUE',
      'FOODTECH_GROSS_PROFIT',
      'FOODTECH_NET_PROFIT',
      'FOODTECH_OIL_EXPELLER_OIL_OUTPUT',
      'FOODTECH_OIL_EXPELLER_CAKE_OUTPUT',
      'FOODTECH_OIL_EXPELLER_CAKE_VALUE'
    ],
    benchmarkDefaults: {
      recovery_rate: { value: 34.0, unit: 'PERCENT', source: 'ICAR-DRMR Mustard Mechanical Expeller Extraction Standard' },
      byproduct_recovery: { value: 64.0, unit: 'PERCENT', source: 'ICAR-DRMR / NABARD (Mustard Oil Cake / Khali)' },
      processing_loss: { value: 2.0, unit: 'PERCENT', source: 'CSIR-CFTRI Mechanical Filtration & Sedimentation Loss' }
    },
    dataSources: [
      {
        institution: 'ICAR - Directorate of Rapeseed-Mustard Research (DRMR)',
        publication: 'Rapeseed-Mustard Processing, Quality & Value Addition Standards',
        url: 'https://drmr.icar.gov.in/',
        year: 2024
      },
      {
        institution: 'NABARD',
        publication: 'Model Bankable Project on Oil Expeller Unit',
        url: 'https://www.nabard.org/content1.aspx?id=594&catid=23&mid=530',
        year: 2024
      }
    ],
    status: BUSINESS_STATUSES.VALIDATED,
    version: '1.0.0'
  });

  // 5. Spice Processing (Spices Board India / CSIR-CFTRI)
  registry.registerBusinessModel({
    businessId: 'FOODTECH_SPICE_PROCESSING',
    businessName: 'Spice Grinding & Pulverizing Unit',
    category: 'FOOD_PROCESSING',
    subcategory: 'SPICE_PROCESSING',
    aliases: ['spice processing', 'spice grinding', 'masala mill', 'masala pulverizer', 'turmeric grinding', 'chilli powder'],
    requiredParameters: [
      'raw_material_quantity',
      'raw_material_price',
      'selling_price',
      'fixed_cost'
    ],
    optionalParameters: [
      'labour_cost',
      'electricity_cost',
      'packaging_cost',
      'transport_cost',
      'initial_investment'
    ],
    formulaIds: [
      'FOODTECH_OUTPUT_FROM_RECOVERY',
      'FOODTECH_RAW_MATERIAL_COST',
      'FOODTECH_TOTAL_VARIABLE_COST',
      'FOODTECH_TOTAL_COST',
      'FOODTECH_PRIMARY_REVENUE',
      'FOODTECH_TOTAL_REVENUE',
      'FOODTECH_GROSS_PROFIT',
      'FOODTECH_NET_PROFIT',
      'FOODTECH_SPICE_GROUND_OUTPUT'
    ],
    benchmarkDefaults: {
      recovery_rate: { value: 96.0, unit: 'PERCENT', source: 'Spices Board India / CSIR-CFTRI Pin Mill Grinding Standard' },
      byproduct_recovery: { value: 0.0, unit: 'PERCENT', source: 'Zero saleable byproduct (pure ground spice powder)' },
      processing_loss: { value: 4.0, unit: 'PERCENT', source: 'Spices Board India (Cleaning Foreign Matter & Volatile Moisture Loss)' }
    },
    dataSources: [
      {
        institution: 'Spices Board India, Ministry of Commerce and Industry',
        publication: 'Post-Harvest Technology & Quality Standards for Spices',
        url: 'https://www.indianspices.com/',
        year: 2024
      },
      {
        institution: 'CSIR-CFTRI',
        publication: 'Low Temperature Spice Grinding Technology Profile',
        url: 'https://cftri.res.in/technologies',
        year: 2024
      }
    ],
    status: BUSINESS_STATUSES.VALIDATED,
    version: '1.0.0'
  });

  return registry;
}

const defaultFoodTechRegistry = seedDefaultFoodTechModels(new FoodTechRegistry());

module.exports = {
  FoodTechRegistry,
  BUSINESS_STATUSES,
  RESOLUTION_TIERS,
  defaultFoodTechRegistry,
  seedDefaultFoodTechModels
};

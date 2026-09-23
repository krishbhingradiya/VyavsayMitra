/**
 * VYAVSAYMITRA — Business & ML Controller
 * 
 * Handles business analysis, financial calculation, ML model predictions,
 * and data catalog/benchmark lookups.
 */

const calculationEngine = require('../services/calculations/calculationEngine');
const modelService = require('../services/ml/modelService');
const dataService = require('../services/data/dataService');
const { classifyBusinessIdea } = require('../services/business/classifier');
const { performBusinessAnalysis } = require('../services/business/businessAnalysisService');
const {
  defaultFoodTechRegistry,
  runFoodTechBusinessModel,
  validateMassBalance,
  generateFoodTechAdvisory
} = require('../services/business/foodtech');

exports.analyze = async (req, res, next) => {
  try {
    const result = await performBusinessAnalysis(req.body);
    if (result.status === 'insufficient_data' || result.status === 'invalid_parameter') {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.calculate = async (req, res, next) => {
  try {
    const report = await calculationEngine.analyzeBusiness(req.body);
    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

exports.predict = async (req, res, next) => {
  try {
    const { task, ...params } = req.body;
    if (!task) {
      return res.status(400).json({
        success: false,
        message: 'Missing task parameter (crop_yield | crop_suitability | mandi_price)',
      });
    }

    let prediction = null;
    if (task === 'crop_yield') {
      prediction = await modelService.predictCropYield(params);
    } else if (task === 'crop_suitability') {
      prediction = await modelService.predictCropSuitability(params);
    } else if (task === 'mandi_price') {
      prediction = await modelService.predictMandiPrice(params);
    } else {
      return res.status(400).json({
        success: false,
        message: `Unknown task: ${task}`,
      });
    }

    res.json({
      success: true,
      task,
      data: prediction,
    });
  } catch (err) {
    next(err);
  }
};

exports.getArchetype = (req, res) => {
  const query = req.query.q || '';
  const result = classifyBusinessIdea(query);
  res.json({
    success: true,
    data: result,
  });
};

exports.getBenchmark = (req, res) => {
  const type = (req.params.type || '').toLowerCase();
  const benchmark = dataService.getNabardBenchmark(type);
  if (!benchmark) {
    return res.status(404).json({
      success: false,
      message: `No benchmark found for business category: ${type}`,
    });
  }
  res.json({
    success: true,
    category: type,
    data: benchmark,
  });
};

exports.getDatasets = (_req, res) => {
  const registry = dataService.getDatasetRegistry();
  const dictionary = dataService.getDataDictionary();
  res.json({
    success: true,
    data: {
      registry,
      dictionary,
    },
  });
};

exports.getModels = (_req, res) => {
  const models = dataService.getModelRegistry();
  res.json({
    success: true,
    data: models,
  });
};

exports.getSchemes = (req, res) => {
  const businessType = req.query.type || 'all';
  const projectCost = parseFloat(req.query.cost || 200000);
  const isRural = req.query.rural !== 'false';
  const schemes = dataService.getEligibleSchemes({ businessType, projectCost, isRural });
  res.json({
    success: true,
    count: schemes.length,
    data: schemes,
  });
};

// ─── FoodTech Endpoints (Phase 3 Step 3) ──────────────────────────

exports.getFoodTechModels = (_req, res) => {
  const models = defaultFoodTechRegistry.listBusinessModels();
  res.json({
    success: true,
    count: models.length,
    data: models
  });
};

exports.getFoodTechModelById = (req, res) => {
  const id = req.params.id;
  const model = defaultFoodTechRegistry.getBusinessModel(id);
  if (!model) {
    return res.status(404).json({
      success: false,
      message: `FoodTech business model '${id}' not found in registry.`
    });
  }
  res.json({
    success: true,
    data: model
  });
};

exports.calculateFoodTech = async (req, res, next) => {
  try {
    const result = await runFoodTechBusinessModel(req.body, req.query);

    if (result.businessStatus === 'INSUFFICIENT_INPUTS') {
      return res.status(400).json({
        success: false,
        status: result.businessStatus,
        message: result.message || 'Required inputs are missing for FoodTech model execution.',
        missingInputs: result.missingInputs || [],
        data: result
      });
    }

    if (result.businessStatus === 'VALIDATION_ERROR' || result.businessStatus === 'MASS_BALANCE_VIOLATION') {
      return res.status(400).json({
        success: false,
        status: result.businessStatus,
        message: result.error || result.message || 'Input validation or mass balance failed.',
        data: result
      });
    }

    if (result.businessStatus === 'MODEL_NOT_SUPPORTED') {
      return res.status(404).json({
        success: false,
        status: result.businessStatus,
        message: result.error || 'Requested FoodTech model is not supported.',
        data: result
      });
    }

    if (result.businessStatus === 'EXECUTION_ERROR') {
      return res.status(500).json({
        success: false,
        status: result.businessStatus,
        message: result.error || 'Internal calculation error occurred.',
        data: result
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

exports.validateFoodTechMassBalance = (req, res) => {
  try {
    const evalResult = validateMassBalance(req.body);
    if (!evalResult.isValid) {
      return res.status(400).json({
        success: false,
        isValid: false,
        errors: evalResult.errors,
        warnings: evalResult.warnings || [],
        massBalance: evalResult.massBalance
      });
    }
    res.json({
      success: true,
      isValid: true,
      warnings: evalResult.warnings || [],
      massBalance: evalResult.massBalance
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      isValid: false,
      errors: [err.message]
    });
  }
};

exports.getFoodTechAdvisory = async (req, res, next) => {
  try {
    const calcResult = await runFoodTechBusinessModel(req.body, req.query);

    if (calcResult.businessStatus === 'INSUFFICIENT_INPUTS') {
      return res.status(400).json({
        success: false,
        status: calcResult.businessStatus,
        message: calcResult.message || 'Required inputs are missing for FoodTech model execution.',
        missingInputs: calcResult.missingInputs || [],
        data: calcResult
      });
    }

    if (calcResult.businessStatus === 'VALIDATION_ERROR' || calcResult.businessStatus === 'MASS_BALANCE_VIOLATION') {
      return res.status(400).json({
        success: false,
        status: calcResult.businessStatus,
        message: calcResult.error || calcResult.message || 'Input validation or mass balance failed.',
        data: calcResult
      });
    }

    if (calcResult.businessStatus === 'MODEL_NOT_SUPPORTED') {
      return res.status(404).json({
        success: false,
        status: calcResult.businessStatus,
        message: calcResult.error || 'Requested FoodTech model is not supported.',
        data: calcResult
      });
    }

    if (calcResult.businessStatus === 'EXECUTION_ERROR') {
      return res.status(500).json({
        success: false,
        status: calcResult.businessStatus,
        message: calcResult.error || 'Internal calculation error occurred.',
        data: calcResult
      });
    }

    const advisory = generateFoodTechAdvisory(calcResult, req.body);

    res.json({
      success: true,
      data: advisory
    });
  } catch (err) {
    next(err);
  }
};

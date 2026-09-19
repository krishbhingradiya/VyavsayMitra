/**
 * VYAVSAYMITRA — Business Advisory & ML REST API Routes
 * 
 * Exposes production-ready endpoints for financial structuring,
 * ML inference, benchmark lookups, and dataset audits.
 */

const express = require('express');
const router = express.Router();

const calculationEngine = require('../services/calculations/calculationEngine');
const modelService = require('../services/ml/modelService');
const dataService = require('../services/data/dataService');
const { classifyBusinessIdea } = require('../services/business/classifier');
const { performBusinessAnalysis } = require('../services/business/businessAnalysisService');

/**
 * POST /api/business/analyze
 * Full comprehensive business advisory, financials, ML, schemes, and narrative
 * Enforces:
 * USER INPUT -> VALIDATION -> BUSINESS CLASSIFICATION -> REQUIRED PARAMETER DETECTION
 * -> VERIFIED DATA SERVICE -> FORMULA ENGINE -> PRODUCTION ML -> RISK -> FUNDING -> AI FALLBACK
 */
router.post('/analyze', async (req, res, next) => {
  try {
    const result = await performBusinessAnalysis(req.body);
    if (result.status === 'insufficient_data' || result.status === 'invalid_parameter') {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/business/calculate
 * Direct financial structuring calculation
 */
router.post('/calculate', async (req, res, next) => {
  try {
    const report = await calculationEngine.analyzeBusiness(req.body);
    res.json({
      success: true,
      data: report
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/business/predict
 * ML Model Inference endpoint (crop_yield, crop_suitability, mandi_price)
 */
router.post('/predict', async (req, res, next) => {
  try {
    const { task, ...params } = req.body;
    if (!task) {
      return res.status(400).json({ success: false, message: 'Missing task parameter (crop_yield | crop_suitability | mandi_price)' });
    }

    let prediction = null;
    if (task === 'crop_yield') {
      prediction = await modelService.predictCropYield(params);
    } else if (task === 'crop_suitability') {
      prediction = await modelService.predictCropSuitability(params);
    } else if (task === 'mandi_price') {
      prediction = await modelService.predictMandiPrice(params);
    } else {
      return res.status(400).json({ success: false, message: `Unknown task: ${task}` });
    }

    res.json({
      success: true,
      task,
      data: prediction
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/business/archetype?q=...
 * Extensible business idea classification and parameter extraction
 */
router.get('/archetype', (req, res) => {
  const query = req.query.q || '';
  const result = classifyBusinessIdea(query);
  res.json({
    success: true,
    data: result
  });
});

/**
 * GET /api/data/business/:type
 * Returns official NABARD/DES benchmark parameters for a given business category
 */
router.get('/data/business/:type', (req, res) => {
  const type = req.params.type.toLowerCase();
  const benchmark = dataService.getNabardBenchmark(type);
  if (!benchmark) {
    return res.status(404).json({ success: false, message: `No benchmark found for business category: ${type}` });
  }
  res.json({
    success: true,
    category: type,
    data: benchmark
  });
});

/**
 * GET /api/datasets
 * Returns dataset registry and data dictionary for verification & audit
 */
router.get('/datasets', (_req, res) => {
  const registry = dataService.getDatasetRegistry();
  const dictionary = dataService.getDataDictionary();
  res.json({
    success: true,
    data: {
      registry,
      dictionary
    }
  });
});

/**
 * GET /api/models
 * Returns machine learning model registry, evaluation metrics, and architectures
 */
router.get('/models', (_req, res) => {
  const models = dataService.getModelRegistry();
  res.json({
    success: true,
    data: models
  });
});

/**
 * GET /api/schemes
 * Returns eligible government schemes
 */
router.get('/schemes', (req, res) => {
  const businessType = req.query.type || 'all';
  const projectCost = parseFloat(req.query.cost || 200000);
  const isRural = req.query.rural !== 'false';
  const schemes = dataService.getEligibleSchemes({ businessType, projectCost, isRural });
  res.json({
    success: true,
    count: schemes.length,
    data: schemes
  });
});

module.exports = router;

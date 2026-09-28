/**
 * VYAVSAYMITRA — Business Performance & Outcomes Controller (Phase 11)
 *
 * Implements tenant-isolated endpoints for:
 * - Recording & listing actual business outcomes
 * - Comparing projected baseline vs actual real-world results
 * - Retrieving business-level product metrics
 * - Recommendation effectiveness lifecycle tracking
 */

const dbRepository = require('../models/dbRepository');
const outcomeTracking = require('../services/outcomeTracking');
const performanceComparison = require('../services/performanceComparison');
const productMetrics = require('../services/productMetrics');
const recommendationAnalytics = require('../services/recommendationAnalytics');

/**
 * Helper to enforce multi-tenant isolation.
 * Throws 404 if business does not exist or does not belong to the user.
 */
async function verifyBusinessOwnership(businessId, userId) {
  const business = await dbRepository.getBusiness(businessId, userId);
  if (!business) {
    const error = new Error('Business not found or access denied.');
    error.status = 404;
    error.code = 'BUSINESS_NOT_FOUND';
    throw error;
  }

  return business;
}

/**
 * GET /api/businesses/:id/outcomes
 */
async function listOutcomes(req, res, next) {
  try {
    const businessId = req.params.id;
    await verifyBusinessOwnership(businessId, req.user.id);

    const outcomes = await outcomeTracking.getBusinessOutcomes(businessId);
    return res.json({
      success: true,
      count: outcomes.length,
      outcomes
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message, code: err.code });
    }
    next(err);
  }
}

/**
 * POST /api/businesses/:id/outcomes
 */
async function createOutcome(req, res, next) {
  try {
    const businessId = req.params.id;
    await verifyBusinessOwnership(businessId, req.user.id);

    const outcomeType = req.body.outcome_type || req.body.outcomeType || req.body.metricType || req.body.metric_type;
    const value = req.body.value !== undefined ? req.body.value : req.body.actualValue;
    const { unit, period, source, notes } = req.body;
    const outcome = await outcomeTracking.recordOutcome({
      businessId,
      userId: req.user.id,
      outcomeType,
      value,
      unit,
      period,
      source,
      notes
    });

    return res.status(201).json({
      success: true,
      message: 'Business outcome recorded successfully.',
      outcome,
      data: outcome
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message, code: err.code });
    }
    next(err);
  }
}

/**
 * GET /api/businesses/:id/performance
 */
async function getPerformance(req, res, next) {
  try {
    const businessId = req.params.id;
    await verifyBusinessOwnership(businessId, req.user.id);

    const performance = await performanceComparison.comparePerformance(businessId);
    return res.json({
      success: true,
      performance
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message, code: err.code });
    }
    next(err);
  }
}

/**
 * GET /api/businesses/:id/analytics
 */
async function getAnalytics(req, res, next) {
  try {
    const businessId = req.params.id;
    await verifyBusinessOwnership(businessId, req.user.id);

    const metrics = await productMetrics.calculateBusinessMetrics(businessId);
    return res.json({
      success: true,
      metrics
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message, code: err.code });
    }
    next(err);
  }
}

/**
 * GET /api/businesses/:id/recommendations/effectiveness
 */
async function getRecommendationEffectiveness(req, res, next) {
  try {
    const businessId = req.params.id;
    await verifyBusinessOwnership(businessId, req.user.id);

    const effectiveness = await recommendationAnalytics.getRecommendationEffectiveness({ businessId });
    return res.json({
      success: true,
      effectiveness
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message, code: err.code });
    }
    next(err);
  }
}

/**
 * POST /api/businesses/:id/recommendations/action
 */
async function recordRecommendationAction(req, res, next) {
  try {
    const businessId = req.params.id;
    await verifyBusinessOwnership(businessId, req.user.id);

    const { recommendation_id, recommendation_type, status, task_id, metadata } = req.body;
    const record = await recommendationAnalytics.trackRecommendationAction({
      businessId,
      recommendationId: recommendation_id,
      recommendationType: recommendation_type,
      status,
      taskId: task_id,
      userId: req.user.id,
      metadata: metadata || {}
    });

    return res.json({
      success: true,
      record
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, message: err.message, code: err.code });
    }
    next(err);
  }
}

module.exports = {
  listOutcomes,
  createOutcome,
  getPerformance,
  getAnalytics,
  getRecommendationEffectiveness,
  recordRecommendationAction
};

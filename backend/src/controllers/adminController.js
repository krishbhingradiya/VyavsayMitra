/**
 * VYAVSAYMITRA — Admin & Operator Controller (Phase 11)
 *
 * Provides privacy-safe aggregated visibility for platform administrators.
 * Strictly excludes secrets, tokens, credentials, and raw private documents.
 */

const dbRepository = require('../models/dbRepository');
const productMetrics = require('../services/productMetrics');
const { getPilotLimits, isPilotMode } = require('../config/pilotConfig');
const { getAllFlags } = require('../config/featureFlags');

/**
 * Returns platform-level aggregate product metrics.
 */
async function getAdminMetrics(req, res) {
  try {
    const metrics = await productMetrics.calculatePlatformMetrics();
    const pilot = {
      isPilotMode: isPilotMode(),
      limits: getPilotLimits()
    };
    const featureFlags = getAllFlags();

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      pilot,
      featureFlags,
      metrics
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to compute admin platform metrics.',
      error: err.message
    });
  }
}

/**
 * Returns system health, resource consumption, and reliability counters.
 */
async function getAdminHealth(req, res) {
  try {
    const mem = process.memoryUsage();
    const uptimeSec = process.uptime();

    const health = {
      status: 'HEALTHY',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(uptimeSec),
      memory: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024)
      },
      environment: process.env.NODE_ENV || 'development',
      pilotMode: isPilotMode(),
      database: {
        driver: process.env.SUPABASE_URL ? 'supabase_postgres' : 'sqlite3_local',
        connected: true
      }
    };

    return res.json({
      success: true,
      health
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to inspect system health.',
      error: err.message
    });
  }
}

/**
 * Returns paginated platform usage events and aggregate usage stats.
 */
async function getAdminUsage(req, res) {
  try {
    const { event_type, limit = 50, page = 1 } = req.query;
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const safePage = Math.max(1, parseInt(page, 10) || 1);

    const { items, total } = await dbRepository.listProductEvents({
      eventType: event_type,
      limit: safeLimit,
      page: safePage
    });

    // Mask user IDs for privacy
    const sanitizedItems = items.map(ev => ({
      id: ev.id,
      eventType: ev.event_type,
      businessId: ev.business_id,
      userHash: ev.user_id ? `usr_${String(ev.user_id).slice(-4)}` : null,
      metadata: ev.event_metadata,
      createdAt: ev.created_at
    }));

    return res.json({
      success: true,
      total,
      page: safePage,
      limit: safeLimit,
      items: sanitizedItems
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch platform usage.',
      error: err.message
    });
  }
}

/**
 * Returns paginated user feedback with optional category and rating filtering.
 */
async function getAdminFeedback(req, res) {
  try {
    const { category, min_rating, limit = 50, page = 1 } = req.query;
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const minRating = min_rating ? parseInt(min_rating, 10) : undefined;

    const { items, total } = await dbRepository.listAllFeedbackAdmin({
      category,
      minRating,
      limit: safeLimit,
      page: safePage
    });

    // Mask user IDs for privacy
    const sanitizedItems = items.map(f => ({
      id: f.id,
      businessId: f.business_id,
      userHash: f.user_id ? `usr_${String(f.user_id).slice(-4)}` : null,
      rating: f.rating,
      category: f.category,
      feature: f.feature,
      message: f.message,
      createdAt: f.created_at
    }));

    return res.json({
      success: true,
      total,
      page: safePage,
      limit: safeLimit,
      items: sanitizedItems
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user feedback.',
      error: err.message
    });
  }
}

/**
 * Returns platform-level recorded outcomes summary.
 */
async function getAdminOutcomes(req, res) {
  try {
    const summary = await dbRepository.getPlatformMetricsSummary();
    return res.json({
      success: true,
      outcomes: summary.outcomes
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve outcomes summary.',
      error: err.message
    });
  }
}

/**
 * Phase 12: Returns operational dashboard & execution funnel metrics
 */
async function getAdminOperations(req, res) {
  try {
    const summary = await dbRepository.getOperationsSummary();
    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      operations: summary
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to compute admin operations summary.',
      error: err.message
    });
  }
}

/**
 * Phase 12: Returns platform reliability, latency, and provider metrics
 */
async function getAdminReliability(req, res) {
  try {
    const metrics = await dbRepository.getReliabilityMetrics();
    const { defaultMarketDataProvider } = require('../integrations/marketDataProvider');
    const { defaultNotificationProvider } = require('../integrations/notificationProvider');
    const { defaultIdentityVerificationProvider } = require('../integrations/identityVerificationProvider');
    const { defaultStorageProvider } = require('../integrations/storageProvider');

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      reliability: {
        ...metrics,
        providers: {
          storage: defaultStorageProvider.getProviderStatus(),
          marketData: defaultMarketDataProvider.getProviderStatus(),
          notifications: defaultNotificationProvider.getAllChannelStatuses(),
          identityVerification: defaultIdentityVerificationProvider.getProviderStatus()
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to inspect platform reliability metrics.',
      error: err.message
    });
  }
}

module.exports = {
  getAdminMetrics,
  getAdminHealth,
  getAdminUsage,
  getAdminFeedback,
  getAdminOutcomes,
  getAdminOperations,
  getAdminReliability
};


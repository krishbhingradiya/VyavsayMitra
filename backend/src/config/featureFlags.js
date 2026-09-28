/**
 * VYAVSAYMITRA — Lightweight Feature Flag System (Phase 11)
 * 
 * Supports safe, environment-configurable feature rollouts.
 * Fails safely: disabled features return standard responses without breaking core workflows.
 */

const DEFAULT_FLAGS = {
  ACTION_INTELLIGENCE_V2: true,
  OUTCOME_TRACKING: true,
  PRODUCT_ANALYTICS: true,
  USER_FEEDBACK: true,
  ADMIN_ANALYTICS: true,
  ADVANCED_MARKET_INSIGHTS: true
};

/**
 * Checks if a specific feature flag is currently enabled.
 * Environment variables override defaults: e.g. FEATURE_OUTCOME_TRACKING=false
 * 
 * @param {string} flagName
 * @returns {boolean}
 */
function isFeatureEnabled(flagName) {
  const envKey = `FEATURE_${flagName.toUpperCase()}`;
  if (process.env[envKey] !== undefined) {
    return process.env[envKey] === 'true' || process.env[envKey] === '1';
  }
  return DEFAULT_FLAGS[flagName.toUpperCase()] !== false;
}

/**
 * Returns a dictionary of all current feature flags and their states.
 * @returns {Record<string, boolean>}
 */
function getAllFlags() {
  const flags = {};
  for (const flag of Object.keys(DEFAULT_FLAGS)) {
    flags[flag] = isFeatureEnabled(flag);
  }
  return flags;
}

/**
 * Express middleware to guard routes by feature flag.
 * @param {string} flagName 
 */
function requireFeature(flagName) {
  return (_req, res, next) => {
    if (!isFeatureEnabled(flagName)) {
      return res.status(404).json({
        success: false,
        code: 'FEATURE_DISABLED',
        message: `The '${flagName}' capability is not enabled in this deployment.`
      });
    }
    next();
  };
}

module.exports = {
  isFeatureEnabled,
  getAllFlags,
  requireFeature,
  DEFAULT_FLAGS
};

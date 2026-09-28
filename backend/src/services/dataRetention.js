/**
 * VYAVSAYMITRA — Data Retention & Privacy Enforcement Service (Phase 11)
 *
 * Implements granular data retention schedules for ephemeral events and logs.
 * CRITICAL SAFEGUARD:
 * Legally and operationally immutable records (DPR snapshots, statutory documents,
 * audit timeline events, verified outcomes) are PERMANENT and NEVER pruned.
 */

const dbRepository = require('../models/dbRepository');

const DEFAULT_POLICIES = {
  analyticsEventsDays: parseInt(process.env.RETENTION_ANALYTICS_DAYS, 10) || 90,
  operationalLogsDays: parseInt(process.env.RETENTION_LOGS_DAYS, 10) || 30,
  feedbackRetentionDays: parseInt(process.env.RETENTION_FEEDBACK_DAYS, 10) || 365,
  tempUploadsDays: parseInt(process.env.RETENTION_TEMP_FILES_DAYS, 10) || 7
};

/**
 * Returns active retention policies.
 */
function getRetentionPolicies() {
  return {
    ...DEFAULT_POLICIES,
    protectedEntities: [
      'dpr_snapshots',
      'statutory_documents',
      'business_timeline_audit',
      'business_outcomes',
      'business_feasibility_analysis'
    ]
  };
}

/**
 * Calculates cutoff date string in ISO format for a given number of days.
 */
function getCutoffDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/**
 * Evaluates records eligible for pruning without performing deletions if dryRun is true.
 * Performs safe pruning of ephemeral analytics records if dryRun is false.
 */
async function enforceRetention({ dryRun = true } = {}) {
  const policies = getRetentionPolicies();
  const analyticsCutoff = getCutoffDate(policies.analyticsEventsDays);

  const report = {
    timestamp: new Date().toISOString(),
    dryRun,
    policies,
    cutoffs: {
      analyticsEvents: analyticsCutoff
    },
    pruned: {
      analyticsEvents: 0
    }
  };

  try {
    const db = await dbRepository.initLocalTables();

    // Count eligible product events
    const stmt = db.prepare('SELECT COUNT(*) AS count FROM business_product_events WHERE created_at < :cutoff');
    stmt.bind({ ':cutoff': analyticsCutoff });
    let eligibleEvents = 0;
    if (stmt.step()) {
      eligibleEvents = stmt.getAsObject().count;
    }
    stmt.free();

    report.pruned.analyticsEvents = eligibleEvents;

    if (!dryRun && eligibleEvents > 0) {
      db.run('DELETE FROM business_product_events WHERE created_at < :cutoff', { ':cutoff': analyticsCutoff });
      dbRepository.saveDb();
    }
  } catch (err) {
    report.error = err.message;
  }

  return report;
}

module.exports = {
  getRetentionPolicies,
  enforceRetention
};

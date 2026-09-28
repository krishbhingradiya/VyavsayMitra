/**
 * VYAVSAYMITRA — Business Outcome Tracking Service (Phase 11)
 *
 * Enables entrepreneurs to optionally record verifiable real-world outcomes.
 * Strictly separates ESTIMATED/PROJECTED data from ACTUAL/USER-REPORTED data.
 * Records are immutable and audited.
 */

const dbRepository = require('../models/dbRepository');
const { trackEvent } = require('./productAnalytics');

const VALID_OUTCOME_TYPES = [
  'actual_investment',
  'actual_monthly_revenue',
  'actual_operating_cost',
  'actual_production_quantity',
  'actual_sales_quantity',
  'funding_received',
  'loan_application_result',
  'subsidy_received',
  'milestone_completion',
  'business_launch_date'
];

const VALID_SOURCES = [
  'user_reported',
  'verified_document',
  'application_record',
  'system_record'
];

/**
 * Validates and records a new real-world business outcome.
 */
async function recordOutcome({ businessId, userId, outcomeType, value, unit = '', period = '', source = 'user_reported', notes = '' }) {
  if (!businessId) {
    const error = new Error('Business ID is required to record an outcome.');
    error.status = 400;
    error.code = 'MISSING_BUSINESS_ID';
    throw error;
  }

  if (!userId) {
    const error = new Error('User ID is required to record an outcome.');
    error.status = 400;
    error.code = 'MISSING_USER_ID';
    throw error;
  }

  if (!outcomeType || !VALID_OUTCOME_TYPES.includes(outcomeType)) {
    const error = new Error(`Invalid outcome type "${outcomeType}". Allowed types: ${VALID_OUTCOME_TYPES.join(', ')}`);
    error.status = 400;
    error.code = 'INVALID_OUTCOME_TYPE';
    throw error;
  }

  if (value === undefined || value === null || (typeof value === 'number' && isNaN(value))) {
    const error = new Error('A valid value is required for the outcome record.');
    error.status = 400;
    error.code = 'INVALID_OUTCOME_VALUE';
    throw error;
  }

  const numVal = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(numVal) && !['milestone_completion', 'business_launch_date', 'loan_application_result'].includes(outcomeType)) {
    const error = new Error('Numeric value is required for quantitative outcome metrics.');
    error.status = 400;
    error.code = 'INVALID_NUMERIC_VALUE';
    throw error;
  }

  if (!VALID_SOURCES.includes(source)) {
    const error = new Error(`Invalid outcome source "${source}". Allowed sources: ${VALID_SOURCES.join(', ')}`);
    error.status = 400;
    error.code = 'INVALID_OUTCOME_SOURCE';
    throw error;
  }

  // Persist immutable outcome record
  const outcome = await dbRepository.recordBusinessOutcome({
    businessId,
    userId,
    outcomeType,
    value: isNaN(numVal) ? value : numVal,
    unit: typeof unit === 'string' ? unit.slice(0, 50) : '',
    period: typeof period === 'string' ? period.slice(0, 50) : '',
    source,
    notes: typeof notes === 'string' ? notes.slice(0, 1000) : ''
  });

  // Write audit timeline event
  await dbRepository.createTimelineEvent(businessId, {
    eventType: 'OUTCOME_RECORDED',
    title: `Outcome Recorded: ${outcomeType.replace(/_/g, ' ')}`,
    description: `Recorded ${source}: ${value} ${unit || ''} for period ${period || 'N/A'}`.trim(),
    metadata: {
      outcomeId: outcome.id,
      outcomeType,
      value,
      unit,
      period,
      source,
      recordedBy: userId
    }
  }).catch(() => null);

  // Track product event
  await trackEvent({
    userId,
    businessId,
    eventType: 'OUTCOME_RECORDED',
    metadata: {
      outcomeType,
      source,
      hasPeriod: Boolean(period)
    }
  });

  return outcome;
}

/**
 * Retrieves all recorded outcomes for a business.
 */
async function getBusinessOutcomes(businessId) {
  if (!businessId) return [];
  return await dbRepository.listBusinessOutcomes(businessId);
}

module.exports = {
  VALID_OUTCOME_TYPES,
  VALID_SOURCES,
  recordOutcome,
  getBusinessOutcomes
};

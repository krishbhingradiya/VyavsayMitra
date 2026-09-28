/**
 * VYAVSAYMITRA — Recommendation Effectiveness Analytics Service (Phase 11)
 *
 * Tracks the complete lifecycle of recommendations (AI Mitra & Next Best Action):
 * created -> viewed -> accepted/dismissed -> converted_to_task -> completed.
 * Success is strictly tied to real user actions and task completion.
 */

const dbRepository = require('../models/dbRepository');
const { trackEvent } = require('./productAnalytics');

const VALID_ACTIONS = [
  'created',
  'viewed',
  'accepted',
  'dismissed',
  'converted_to_task',
  'completed'
];

/**
 * Records or updates a recommendation state transition.
 */
async function trackRecommendationAction({
  businessId,
  recommendationId,
  recommendationType = 'next_best_action',
  status,
  taskId = null,
  userId = null,
  metadata = {}
}) {
  if (!businessId) {
    const error = new Error('Business ID is required.');
    error.status = 400;
    error.code = 'MISSING_BUSINESS_ID';
    throw error;
  }

  if (!recommendationId) {
    const error = new Error('Recommendation ID is required.');
    error.status = 400;
    error.code = 'MISSING_RECOMMENDATION_ID';
    throw error;
  }

  const normalizedStatus = String(status || '').toLowerCase().trim();
  if (!VALID_ACTIONS.includes(normalizedStatus)) {
    const error = new Error(`Invalid status "${status}". Allowed: ${VALID_ACTIONS.join(', ')}`);
    error.status = 400;
    error.code = 'INVALID_RECOMMENDATION_STATUS';
    throw error;
  }

  const record = await dbRepository.recordRecommendationAction({
    businessId,
    userId: userId ? String(userId) : null,
    recommendationId: String(recommendationId),
    recommendationType: String(recommendationType),
    status: normalizedStatus,
    taskId: taskId ? String(taskId) : null,
    metadata
  });


  // Track product event
  const eventTypeMap = {
    created: 'RECOMMENDATION_CREATED',
    viewed: 'RECOMMENDATION_VIEWED',
    accepted: 'RECOMMENDATION_ACCEPTED',
    dismissed: 'RECOMMENDATION_DISMISSED',
    converted_to_task: 'RECOMMENDATION_CONVERTED_TO_TASK',
    completed: 'TASK_COMPLETED'
  };

  const eventType = eventTypeMap[normalizedStatus];
  if (eventType) {
    await trackEvent({
      userId,
      businessId,
      eventType,
      metadata: {
        recommendationId,
        recommendationType,
        taskId
      }
    });
  }

  // Audit timeline event for significant user choices
  if (normalizedStatus === 'accepted' || normalizedStatus === 'dismissed') {
    await dbRepository.createTimelineEvent(businessId, {
      eventType: normalizedStatus === 'accepted' ? 'RECOMMENDATION_ACCEPTED' : 'RECOMMENDATION_DISMISSED',
      title: `Recommendation ${normalizedStatus === 'accepted' ? 'Accepted' : 'Dismissed'}`,
      description: `User ${normalizedStatus} recommendation "${metadata.title || recommendationId}"`,
      metadata: {
        recommendationId,
        recommendationType,
        status: normalizedStatus,
        userId
      }
    }).catch(() => null);
  }

  return record;
}

/**
 * Calculates effectiveness metrics for a specific business or platform-wide.
 */
async function getRecommendationEffectiveness({ businessId = null } = {}) {
  const actions = await dbRepository.listRecommendationActions({ businessId });

  const total = actions.length;
  const created = actions.filter(a => a.status === 'created').length;
  const viewed = actions.filter(a => ['viewed', 'accepted', 'dismissed', 'converted_to_task', 'completed'].includes(a.status)).length;
  const accepted = actions.filter(a => ['accepted', 'converted_to_task', 'completed'].includes(a.status)).length;
  const dismissed = actions.filter(a => a.status === 'dismissed').length;
  const convertedToTask = actions.filter(a => ['converted_to_task', 'completed'].includes(a.status)).length;
  const completed = actions.filter(a => a.status === 'completed').length;

  const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
  const conversionRate = total > 0 ? Math.round((convertedToTask / total) * 100) : 0;
  const completionRate = convertedToTask > 0 ? Math.round((completed / convertedToTask) * 100) : 0;

  return {
    businessId: businessId || 'platform',
    totalRecommendations: total,
    breakdown: {
      created,
      viewed,
      accepted,
      dismissed,
      convertedToTask,
      completed
    },
    acceptanceRate,
    conversionRate,
    completionRate,
    status: total === 0 ? 'No recommendations tracked yet.' : 'active'
  };
}

module.exports = {
  VALID_ACTIONS,
  trackRecommendationAction,
  getRecommendationEffectiveness
};

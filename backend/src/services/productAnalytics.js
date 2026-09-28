/**
 * VYAVSAYMITRA — Privacy-Safe Product Analytics Service (Phase 11)
 *
 * Implements privacy-first, tenant-scoped, and user-scoped event tracking
 * without storing passwords, tokens, JWTs, raw private conversations, or secrets.
 */

const dbRepository = require('../models/dbRepository');
const { isFeatureEnabled } = require('../config/featureFlags');

const EVENT_TYPES = {
  USER_REGISTERED: 'USER_REGISTERED',
  PROFILE_COMPLETED: 'PROFILE_COMPLETED',
  BUSINESS_CREATED: 'BUSINESS_CREATED',
  BUSINESS_ANALYSIS_STARTED: 'BUSINESS_ANALYSIS_STARTED',
  BUSINESS_ANALYSIS_COMPLETED: 'BUSINESS_ANALYSIS_COMPLETED',
  ACTION_PLAN_VIEWED: 'ACTION_PLAN_VIEWED',
  TASK_CREATED: 'TASK_CREATED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  DOCUMENT_CHECKLIST_VIEWED: 'DOCUMENT_CHECKLIST_VIEWED',
  DOCUMENT_MARKED_PROVIDED: 'DOCUMENT_MARKED_PROVIDED',
  DOCUMENT_MARKED_VERIFIED: 'DOCUMENT_MARKED_VERIFIED',
  APPLICATION_CREATED: 'APPLICATION_CREATED',
  APPLICATION_STATUS_CHANGED: 'APPLICATION_STATUS_CHANGED',
  DPR_GENERATED: 'DPR_GENERATED',
  DPR_VERSION_CREATED: 'DPR_VERSION_CREATED',
  AI_MITRA_OPENED: 'AI_MITRA_OPENED',
  AI_MITRA_ACTION_REQUESTED: 'AI_MITRA_ACTION_REQUESTED',
  AI_MITRA_ACTION_COMPLETED: 'AI_MITRA_ACTION_COMPLETED',
  MARKET_TRENDS_VIEWED: 'MARKET_TRENDS_VIEWED',
  NEXT_ACTION_VIEWED: 'NEXT_ACTION_VIEWED',
  BUSINESS_HEALTH_VIEWED: 'BUSINESS_HEALTH_VIEWED',
  NOTIFICATION_OPENED: 'NOTIFICATION_OPENED',
  USER_FEEDBACK_SUBMITTED: 'USER_FEEDBACK_SUBMITTED',
  RECOMMENDATION_CREATED: 'RECOMMENDATION_CREATED',
  RECOMMENDATION_VIEWED: 'RECOMMENDATION_VIEWED',
  RECOMMENDATION_ACCEPTED: 'RECOMMENDATION_ACCEPTED',
  RECOMMENDATION_DISMISSED: 'RECOMMENDATION_DISMISSED',
  RECOMMENDATION_CONVERTED_TO_TASK: 'RECOMMENDATION_CONVERTED_TO_TASK'
};

const DISALLOWED_KEY_PATTERNS = [
  /pass/i,
  /pwd/i,
  /token/i,
  /jwt/i,
  /secret/i,
  /key/i,
  /auth/i,
  /bearer/i,
  /credential/i,
  /cookie/i,
  /pin/i,
  /session/i
];

/**
 * Sanitizes event metadata to eliminate sensitive keys, personal identifiers,
 * or credentials.
 */
function sanitizeMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  const clean = {};
  for (const [k, v] of Object.entries(metadata)) {
    // Check key against blacklist
    const isSensitiveKey = DISALLOWED_KEY_PATTERNS.some(rx => rx.test(k));
    if (isSensitiveKey) continue;

    // Prune value if it is a sensitive string
    if (typeof v === 'string') {
      if (v.length > 500) {
        clean[k] = v.substring(0, 500); // Prevent unbounded string payloads
      } else {
        clean[k] = v;
      }
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      clean[k] = v;
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      // Recurse one level
      clean[k] = sanitizeMetadata(v);
    }
  }
  return clean;
}

/**
 * Asynchronously records a privacy-safe product analytics event.
 * Never throws an error or breaks the main request flow.
 */
async function trackEvent({ userId, businessId, eventType, metadata = {} }) {
  try {
    if (!isFeatureEnabled('PRODUCT_ANALYTICS')) {
      return null;
    }

    if (!eventType || typeof eventType !== 'string') {
      return null;
    }

    const cleanMeta = sanitizeMetadata(metadata);
    return await dbRepository.recordProductEvent({
      userId: userId ? String(userId) : null,
      businessId: businessId ? String(businessId) : null,
      eventType: String(eventType).trim(),
      metadata: cleanMeta
    });
  } catch (err) {
    // Fail silently in production to guarantee analytics never breaks critical path
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      console.warn('[ANALYTICS] Failed to record product event:', err.message);
    }
    return null;
  }
}

/**
 * Retrieves paginated product events for a specific business, user, or eventType
 */
async function getEvents({ businessId, userId, eventType, limit = 50, page = 1 } = {}) {
  return await dbRepository.listProductEvents({
    businessId,
    userId,
    eventType,
    limit,
    page
  });
}

module.exports = {
  EVENT_TYPES,
  sanitizeMetadata,
  trackEvent,
  getEvents
};

/**
 * VYAVSAYMITRA — Pilot Configuration & Quota Management (Phase 11)
 * 
 * Controls pilot operational limits without bypassing security, authentication,
 * tenant isolation, or rate limiting.
 */

const dbRepository = require('../models/dbRepository');

function isPilotMode() {
  return process.env.PILOT_MODE === 'true';
}

function getPilotLimits() {
  const bizLimit = parseInt(process.env.PILOT_BUSINESS_LIMIT, 10) || 5;
  return {
    isPilotMode: isPilotMode(),
    userLimit: parseInt(process.env.PILOT_USER_LIMIT, 10) || 100,
    businessLimit: bizLimit,
    businessLimitPerUser: bizLimit,
    startDate: process.env.PILOT_START_DATE || null,
    endDate: process.env.PILOT_END_DATE || null
  };
}

/**
 * Checks if the platform has capacity for a new pilot user.
 * @returns {Promise<{ allowed: boolean, reason?: string, count: number, limit: number }>}
 */
async function checkPilotUserLimit() {
  if (!isPilotMode()) {
    return { allowed: true, count: 0, limit: Infinity };
  }

  const limits = getPilotLimits();
  const summary = await dbRepository.getPlatformMetricsSummary();
  const currentUsers = summary.users?.total || 0;

  if (currentUsers >= limits.userLimit) {
    return {
      allowed: false,
      code: 'PILOT_USER_LIMIT_REACHED',
      reason: `Pilot user capacity reached (${currentUsers}/${limits.userLimit}). Please contact the program administrator for enrollment.`,
      count: currentUsers,
      limit: limits.userLimit
    };
  }

  return { allowed: true, count: currentUsers, limit: limits.userLimit };
}

/**
 * Checks if a specific user or platform has capacity to create an additional business in pilot mode.
 * @param {string} [userId]
 * @returns {Promise<{ allowed: boolean, reason?: string, count: number, limit: number }>}
 */
async function checkPilotBusinessLimit(userId = null) {
  if (!isPilotMode()) {
    return { allowed: true, count: 0, limit: Infinity };
  }

  const limits = getPilotLimits();
  const limit = limits.businessLimit;

  let currentCount = 0;
  if (userId) {
    const businesses = await dbRepository.listBusinesses(userId);
    currentCount = businesses.length;
  } else {
    const summary = await dbRepository.getPlatformMetricsSummary();
    currentCount = summary.businesses?.total || 0;
  }

  if (currentCount >= limit) {
    return {
      allowed: false,
      code: 'PILOT_BUSINESS_LIMIT_REACHED',
      reason: `Pilot business creation limit reached (${currentCount}/${limit} businesses).`,
      count: currentCount,
      limit
    };
  }

  return { allowed: true, count: currentCount, limit };
}


module.exports = {
  isPilotMode,
  getPilotLimits,
  checkPilotUserLimit,
  checkPilotBusinessLimit
};

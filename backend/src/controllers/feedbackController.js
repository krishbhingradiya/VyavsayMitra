/**
 * VYAVSAYMITRA — User Feedback Controller (Phase 11)
 *
 * Secure, tenant-isolated feedback submission and retrieval.
 * Users may only view their own submitted feedback.
 */

const dbRepository = require('../models/dbRepository');
const { trackEvent } = require('../services/productAnalytics');

const VALID_CATEGORIES = [
  'ai_mitra',
  'business_analysis',
  'action_plan',
  'document_vault',
  'dpr',
  'market_intelligence',
  'applications',
  'overall_experience'
];

/**
 * Submits user feedback.
 */
async function submitFeedback(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to submit feedback.',
        code: 'AUTH_REQUIRED'
      });
    }

    const { rating, category, message = '', business_id, feature = '' } = req.body;

    // Validate rating
    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5.',
        code: 'INVALID_FEEDBACK_RATING'
      });
    }

    // Validate category
    const cleanCategory = String(category || '').trim().toLowerCase();
    if (!cleanCategory || !VALID_CATEGORIES.includes(cleanCategory)) {
      return res.status(400).json({
        success: false,
        message: `Invalid feedback category. Allowed: ${VALID_CATEGORIES.join(', ')}`,
        code: 'INVALID_FEEDBACK_CATEGORY'
      });
    }

    // Validate message length
    const cleanMessage = String(message || '').trim();
    if (cleanMessage.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Feedback message cannot exceed 2000 characters.',
        code: 'FEEDBACK_MESSAGE_TOO_LONG'
      });
    }

    // If business_id provided, verify ownership
    let cleanBizId = null;
    if (business_id) {
      const biz = await dbRepository.getBusiness(business_id, userId);
      if (!biz) {

        return res.status(404).json({
          success: false,
          message: 'Business not found or access denied.',
          code: 'BUSINESS_NOT_FOUND'
        });
      }
      cleanBizId = String(business_id);
    }

    const feedback = await dbRepository.createFeedback({
      userId,
      businessId: cleanBizId,
      rating: numRating,
      category: cleanCategory,
      message: cleanMessage,
      feature: String(feature || cleanCategory).slice(0, 50)
    });

    // Write audit timeline event if tied to a business
    if (cleanBizId) {
      await dbRepository.createTimelineEvent(cleanBizId, {
        eventType: 'FEEDBACK_SUBMITTED',
        title: 'Feedback Submitted',
        description: `User provided a ${numRating}/5 rating for ${cleanCategory}`,
        metadata: {
          feedbackId: feedback.id,
          rating: numRating,
          category: cleanCategory
        }
      }).catch(() => null);
    }

    // Track analytics event
    await trackEvent({
      userId,
      businessId: cleanBizId,
      eventType: 'USER_FEEDBACK_SUBMITTED',
      metadata: {
        rating: numRating,
        category: cleanCategory,
        feature: String(feature || cleanCategory).slice(0, 50)
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your feedback has been recorded.',
      feedback
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to record feedback.',
      error: err.message
    });
  }
}

/**
 * Retrieves the current user's submitted feedback history.
 */
async function getUserFeedback(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    const result = await dbRepository.listFeedback({ userId });
    const items = Array.isArray(result) ? result : (result.items || []);
    return res.json({
      success: true,
      total: Array.isArray(result) ? result.length : (result.total || items.length),
      feedback: items
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve feedback.',
      error: err.message
    });
  }
}

module.exports = {
  VALID_CATEGORIES,
  submitFeedback,
  getUserFeedback
};

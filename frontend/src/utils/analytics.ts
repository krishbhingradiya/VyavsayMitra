/**
 * VYAVSAYMITRA — Client-Side Privacy-Safe Analytics Tracker (Phase 11)
 *
 * Lightweight, non-blocking telemetry tracker that safely records user milestones
 * and recommendation engagements without storing credentials or breaking the UI.
 */

import { outcomesApi } from '../api/apiClient';

export interface AnalyticsEvent {
  eventType: string;
  businessId?: string;
  metadata?: Record<string, any>;
}

/**
 * Tracks a client-side user engagement action. Fails silently without crashing UI.
 */
export async function trackClientAction(event: AnalyticsEvent): Promise<void> {
  try {
    // Non-blocking telemetry
    if (event.businessId && event.metadata?.recommendationId) {
      await outcomesApi.recordRecommendationAction(event.businessId, {
        recommendation_id: String(event.metadata.recommendationId),
        recommendation_type: event.metadata.recommendationType || 'next_action',
        status: event.metadata.status || 'viewed',
        task_id: event.metadata.taskId,
        metadata: event.metadata
      }).catch(() => null);
    }
  } catch (_) {
    // Intentionally suppressed to prevent UI interruption
  }
}

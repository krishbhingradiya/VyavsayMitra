/**
 * VYAVSAYMITRA — Field Operations & Business Verification Service
 * Phase 12: Real-World Field Operations & Evidence Verification
 * 
 * Supports:
 * - Field visit creation and scheduling
 * - Assigned operator/field officer workflow
 * - Strict visit status lifecycle transitions
 * - Verification checklist & field notes
 * - Evidence references & verification result
 * - Immutable timeline audit recording
 */

const db = require('../models/dbRepository');

const VALID_VISIT_STATUSES = [
  'SCHEDULED',
  'IN_PROGRESS',
  'VERIFICATION_PENDING',
  'VERIFIED',
  'ACTION_REQUIRED',
  'CANCELLED',
  'COMPLETED'
];

const VALID_BUSINESS_VERIFICATION_STATUSES = [
  'UNVERIFIED',
  'PENDING',
  'PARTIALLY_VERIFIED',
  'VERIFIED',
  'REQUIRES_CORRECTION',
  'REJECTED'
];

// Allowed state transitions
const ALLOWED_TRANSITIONS = {
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['VERIFICATION_PENDING', 'ACTION_REQUIRED', 'CANCELLED'],
  VERIFICATION_PENDING: ['VERIFIED', 'ACTION_REQUIRED', 'COMPLETED'],
  ACTION_REQUIRED: ['IN_PROGRESS', 'VERIFIED', 'CANCELLED'],
  VERIFIED: ['COMPLETED'],
  CANCELLED: [],
  COMPLETED: []
};

class FieldOperationsService {
  /**
   * Validate state transition for field visits
   */
  validateTransition(currentStatus, newStatus) {
    if (!VALID_VISIT_STATUSES.includes(newStatus)) {
      const err = new Error('INVALID_FIELD_VISIT_STATUS');
      err.statusCode = 400;
      throw err;
    }

    if (currentStatus === newStatus) {
      return true;
    }

    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      const err = new Error(`INVALID_FIELD_VISIT_TRANSITION: Cannot transition from ${currentStatus} to ${newStatus}`);
      err.statusCode = 400;
      err.code = 'INVALID_FIELD_VISIT_TRANSITION';
      throw err;
    }

    return true;
  }

  /**
   * Create a field visit
   */
  async createFieldVisit({
    tenantId,
    businessId,
    officerId,
    scheduledDate,
    visitType = 'ROUTINE_VERIFICATION',
    notes = '',
    checklist = []
  }) {
    const effectiveTenantId = tenantId || businessId;
    if (!businessId || !officerId || !scheduledDate) {
      const err = new Error('MISSING_REQUIRED_FIELDS');
      err.statusCode = 400;
      throw err;
    }

    // Default checklist if empty
    const initialChecklist = Array.isArray(checklist) && checklist.length > 0 ? checklist : [
      { id: 'loc_geo', label: 'Physical business location & geo-tagging verified', completed: false, evidenceRequired: true },
      { id: 'infra_check', label: 'Operational equipment and basic infrastructure verified', completed: false, evidenceRequired: true },
      { id: 'identity_doc', label: 'Identity & local authority registration document sighting', completed: false, evidenceRequired: true },
      { id: 'biz_activity', label: 'Actual business production or agricultural activity confirmed', completed: false, evidenceRequired: false }
    ];

    const visit = await db.createFieldVisit({
      tenantId: effectiveTenantId,
      businessId,
      officerId,
      scheduledDate,
      visitType,
      status: 'SCHEDULED',
      notes,
      checklist: initialChecklist
    });

    // Record timeline audit event
    await db.recordBusinessEvent({
      businessId,
      eventType: 'FIELD_VISIT_CREATED',
      actorId: officerId,
      details: {
        visitId: visit.id,
        scheduledDate,
        visitType
      }
    });

    return visit;
  }

  /**
   * Get field visit by ID
   */
  async getFieldVisit(visitId) {
    const visit = await db.getFieldVisitById(visitId);
    if (!visit) {
      const err = new Error('FIELD_VISIT_NOT_FOUND');
      err.statusCode = 404;
      throw err;
    }
    return visit;
  }

  /**
   * List visits for a business
   */
  async listVisits({ businessId, tenantId, officerId, status, page = 1, limit = 20 }) {
    return await db.listFieldVisits({ businessId, tenantId, officerId, status, page, limit });
  }

  /**
   * Update field visit status or details
   */
  async updateFieldVisit(visitId, updates, actorId = 'system') {
    const current = await this.getFieldVisit(visitId);

    // Validate transition if status is being changed
    if (updates.status && updates.status !== current.status) {
      this.validateTransition(current.status, updates.status);
    }

    const updated = await db.updateFieldVisit(visitId, updates);

    // Audit event depending on state change
    if (updates.status && updates.status !== current.status) {
      let eventType = 'FIELD_VISIT_STATUS_CHANGED';
      if (updates.status === 'IN_PROGRESS') {
        eventType = 'FIELD_VISIT_STARTED';
      } else if (updates.status === 'COMPLETED' || updates.status === 'VERIFIED') {
        eventType = 'FIELD_VISIT_COMPLETED';
      }

      await db.recordBusinessEvent({
        businessId: current.business_id,
        eventType,
        actorId,
        details: {
          visitId,
          fromStatus: current.status,
          toStatus: updates.status,
          verificationResult: updates.verificationResult || current.verification_result
        }
      });

      // If visit verified, update business verification status
      if (updates.status === 'VERIFIED' || updates.verificationResult === 'VERIFIED') {
        await db.updateBusiness(current.business_id, {
          verification_status: 'VERIFIED'
        });
        await db.recordBusinessEvent({
          businessId: current.business_id,
          eventType: 'BUSINESS_VERIFIED',
          actorId,
          details: {
            visitId,
            verifiedAt: new Date().toISOString()
          }
        });
      }
    }

    return updated;
  }

  /**
   * Complete a verification checklist item
   */
  async updateChecklistItem(visitId, itemId, completed, notes = '', evidenceIds = [], actorId = 'system') {
    const visit = await this.getFieldVisit(visitId);
    let checklist = [];
    try {
      checklist = typeof visit.checklist === 'string' ? JSON.parse(visit.checklist) : (visit.checklist || []);
    } catch {
      checklist = [];
    }

    const item = checklist.find(i => i.id === itemId);
    if (!item) {
      const err = new Error('CHECKLIST_ITEM_NOT_FOUND');
      err.statusCode = 404;
      throw err;
    }

    item.completed = Boolean(completed);
    item.notes = notes;
    item.evidenceIds = evidenceIds;
    item.updatedAt = new Date().toISOString();

    const allCompleted = checklist.every(i => i.completed);
    const updates = {
      checklist,
      status: allCompleted ? 'VERIFICATION_PENDING' : visit.status
    };

    return await this.updateFieldVisit(visitId, updates, actorId);
  }
}

const fieldOperationsService = new FieldOperationsService();

module.exports = {
  FieldOperationsService,
  fieldOperationsService,
  VALID_VISIT_STATUSES,
  VALID_BUSINESS_VERIFICATION_STATUSES,
  ALLOWED_TRANSITIONS
};

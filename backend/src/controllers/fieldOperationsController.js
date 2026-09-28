/**
 * VYAVSAYMITRA — Field Operations Controller
 * Phase 12: Real-World Pilot Operations & Field Verifications
 */

const { fieldOperationsService } = require('../services/fieldOperations');
const db = require('../models/dbRepository');

class FieldOperationsController {
  /**
   * Helper to verify business ownership / tenant access
   * Unauthorized cross-tenant access returns 404 Not Found (Zero Info Leakage)
   */
  async verifyBusinessAccess(req, businessId) {
    const userId = req.user?.id;
    const business = await db.getBusinessById(businessId);
    if (!business) {
      const err = new Error('BUSINESS_NOT_FOUND');
      err.statusCode = 404;
      throw err;
    }

    // Role check: Admin, assigned partner, or owner
    const role = req.user?.role;
    if (role === 'ADMIN') {
      return business;
    }

    if (business.user_id !== userId) {
      // Check if user is an assigned field agent / partner
      const partnerAssignment = await db.checkPartnerAccess(businessId, userId);
      if (!partnerAssignment) {
        const err = new Error('BUSINESS_NOT_FOUND');
        err.statusCode = 404; // IDOR Protection: Always 404
        throw err;
      }
    }

    return business;
  }

  async listVisits(req, res, next) {
    try {
      const { id: businessId } = req.params;
      const page = parseInt(req.query.page || '1', 10);
      const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
      const status = req.query.status || null;

      if (businessId) {
        const business = await this.verifyBusinessAccess(req, businessId);
        const result = await fieldOperationsService.listVisits({
          businessId: business.id,
          tenantId: business.tenant_id,
          status,
          page,
          limit
        });

        return res.status(200).json({
          success: true,
          businessId: business.id,
          data: result.items,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
          }
        });
      } else {
        // Top-level field visits list for officers / admins
        const isAdm = req.user?.role === 'ADMIN';
        const result = await fieldOperationsService.listVisits({
          officerId: isAdm ? null : req.user.id,
          status,
          page,
          limit
        });

        return res.status(200).json({
          success: true,
          data: result.items,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages
          }
        });
      }
    } catch (err) {
      next(err);
    }
  }

  async createVisit(req, res, next) {
    try {
      const { id: businessId } = req.params;
      const business = await this.verifyBusinessAccess(req, businessId);

      const { scheduledDate, visitType, officerId, notes, checklist } = req.body;
      if (!scheduledDate) {
        return res.status(400).json({
          success: false,
          error: 'SCHEDULED_DATE_REQUIRED',
          message: 'Scheduled date is required for booking a field visit.'
        });
      }

      const assignedOfficerId = officerId || req.user.id;

      const visit = await fieldOperationsService.createFieldVisit({
        tenantId: business.tenant_id || business.user_id,
        businessId: business.id,
        officerId: assignedOfficerId,
        scheduledDate,
        visitType: visitType || 'ROUTINE_VERIFICATION',
        notes: notes || '',
        checklist: checklist || []
      });

      return res.status(201).json({
        success: true,
        data: visit
      });
    } catch (err) {
      next(err);
    }
  }

  async updateVisit(req, res, next) {
    try {
      const { id: businessId, visitId } = req.params;
      const business = await this.verifyBusinessAccess(req, businessId);

      const visit = await db.getFieldVisitById(visitId);
      if (!visit || visit.business_id !== business.id) {
        return res.status(404).json({
          success: false,
          error: 'FIELD_VISIT_NOT_FOUND',
          message: 'The requested field visit does not exist.'
        });
      }

      const updates = req.body;
      const updated = await fieldOperationsService.updateFieldVisit(visitId, updates, req.user.id);

      return res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      if (err.code === 'INVALID_FIELD_VISIT_TRANSITION' || err.message?.startsWith('INVALID_FIELD_VISIT_TRANSITION')) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_FIELD_VISIT_TRANSITION',
          message: err.message
        });
      }
      next(err);
    }
  }

  async updateChecklistItem(req, res, next) {
    try {
      const { id: businessId, visitId } = req.params;
      const business = await this.verifyBusinessAccess(req, businessId);

      const visit = await db.getFieldVisitById(visitId);
      if (!visit || visit.business_id !== business.id) {
        return res.status(404).json({
          success: false,
          error: 'FIELD_VISIT_NOT_FOUND'
        });
      }

      const { itemId, completed, notes, evidenceIds } = req.body;
      if (!itemId) {
        return res.status(400).json({
          success: false,
          error: 'ITEM_ID_REQUIRED'
        });
      }

      const updated = await fieldOperationsService.updateChecklistItem(
        visitId,
        itemId,
        completed,
        notes,
        evidenceIds,
        req.user.id
      );

      return res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }
}

const fieldOperationsController = new FieldOperationsController();

module.exports = {
  FieldOperationsController,
  fieldOperationsController
};

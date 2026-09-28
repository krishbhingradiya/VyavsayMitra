/**
 * VYAVSAYMITRA — Business Execution, Journey, Evidence & Partner Controller
 * Phase 12: Real-World Pilot Operations, External Integrations & Scale Readiness
 */

const db = require('../models/dbRepository');
const { dataQualityEngine } = require('../services/dataQuality');
const executionIntelligence = require('../services/executionIntelligence');
const { defaultStorageProvider } = require('../integrations/storageProvider');

class BusinessExecutionScaleController {
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

    if (req.user?.role === 'ADMIN') {
      return business;
    }

    if (business.user_id !== userId) {
      const partnerAssignment = await db.checkPartnerAccess(businessId, userId);
      if (!partnerAssignment) {
        const err = new Error('BUSINESS_NOT_FOUND');
        err.statusCode = 404; // IDOR Protection: Always 404
        throw err;
      }
    }

    return business;
  }

  // ── 1. ENTREPRENEUR JOURNEY ──
  async getJourney(req, res, next) {
    try {
      const { id: businessId } = req.params;
      const business = await this.verifyBusinessAccess(req, businessId);

      const inputs = await db.getBusinessInputs(businessId);
      const analyses = await db.getAnalysesByBusinessId(businessId);
      const tasks = await db.getTasksByBusinessId(businessId);
      const documents = await db.getDocumentsByBusinessId(businessId);
      const applications = await db.listApplications({ businessId });
      const dprs = await db.listDprSnapshots({ businessId });
      const fieldVisits = await db.listFieldVisits({ businessId });
      const outcomes = await db.listBusinessOutcomes(businessId);

      const hasInputs = Boolean(inputs);
      const hasAnalysis = Boolean(analyses && analyses.length > 0);
      const completedTasks = (tasks || []).filter(t => t.status === 'COMPLETED').length;
      const totalTasks = (tasks || []).length;
      const verifiedDocs = (documents || []).filter(d => d.verification_status === 'verified').length;
      const totalDocs = (documents || []).length;
      const hasApps = (applications || []).length > 0;
      const hasDpr = (dprs || []).length > 0;
      const verifiedVisits = (fieldVisits?.items || []).filter(v => v.status === 'VERIFIED' || v.status === 'COMPLETED').length;
      const verifiedOutcomes = (outcomes || []).filter(o => o.verification_status === 'verified').length;

      const stages = [
        {
          id: 1,
          name: 'Business Created',
          status: 'COMPLETED',
          progress: 100,
          blockingIssue: null,
          nextAction: hasInputs ? 'Review profile inputs' : 'Complete baseline business profile',
          evidenceRequirement: 'None',
          lastUpdatedAt: business.created_at
        },
        {
          id: 2,
          name: 'Business Profile Completed',
          status: hasInputs ? 'COMPLETED' : 'IN_PROGRESS',
          progress: hasInputs ? 100 : 40,
          blockingIssue: hasInputs ? null : 'Baseline operational and investment parameters missing',
          nextAction: hasInputs ? 'Proceed to financial feasibility analysis' : 'Fill operational capacity and investment inputs',
          evidenceRequirement: 'None',
          lastUpdatedAt: inputs?.updated_at || business.created_at
        },
        {
          id: 3,
          name: 'Analysis Completed',
          status: hasAnalysis ? 'COMPLETED' : (hasInputs ? 'ACTION_REQUIRED' : 'NOT_STARTED'),
          progress: hasAnalysis ? 100 : 0,
          blockingIssue: hasAnalysis ? null : 'Financial viability model not yet calculated',
          nextAction: hasAnalysis ? 'Inspect bankable unit economics and DSCR' : 'Run financial feasibility analysis',
          evidenceRequirement: 'Based on your business inputs',
          lastUpdatedAt: analyses?.[0]?.created_at || null
        },
        {
          id: 4,
          name: 'Market Validation',
          status: hasAnalysis ? 'COMPLETED' : 'NOT_STARTED',
          progress: hasAnalysis ? 100 : 0,
          blockingIssue: null,
          nextAction: 'Review verified Mandi price benchmarks',
          evidenceRequirement: 'Based on verified market observations',
          lastUpdatedAt: analyses?.[0]?.created_at || null
        },
        {
          id: 5,
          name: 'Action Plan',
          status: totalTasks > 0 ? (completedTasks === totalTasks ? 'COMPLETED' : 'IN_PROGRESS') : 'NOT_STARTED',
          progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          blockingIssue: (totalTasks > 0 && completedTasks < totalTasks) ? `${totalTasks - completedTasks} milestone task(s) remaining` : null,
          nextAction: 'Execute milestone tasks in sequence',
          evidenceRequirement: 'Milestone invoices and geotagged photographs',
          lastUpdatedAt: tasks?.[0]?.updated_at || null
        },
        {
          id: 6,
          name: 'Documents',
          status: totalDocs > 0 ? (verifiedDocs === totalDocs ? 'COMPLETED' : 'IN_PROGRESS') : 'NOT_STARTED',
          progress: totalDocs > 0 ? Math.round((verifiedDocs / totalDocs) * 100) : 0,
          blockingIssue: (totalDocs > 0 && verifiedDocs < totalDocs) ? `${totalDocs - verifiedDocs} document(s) pending verification` : null,
          nextAction: 'Upload required KYC and statutory license proofs',
          evidenceRequirement: 'Based on verified documents',
          lastUpdatedAt: documents?.[0]?.updated_at || null
        },
        {
          id: 7,
          name: 'Funding / Application',
          status: hasApps ? 'IN_PROGRESS' : 'ACTION_REQUIRED',
          progress: hasApps ? 75 : 0,
          blockingIssue: hasApps ? null : 'No credit or scheme application initiated',
          nextAction: hasApps ? 'Track application lifecycle status' : 'Initiate statutory scheme / bank credit application',
          evidenceRequirement: 'Application acknowledgment receipt',
          lastUpdatedAt: applications?.[0]?.updated_at || null
        },
        {
          id: 8,
          name: 'DPR Generation',
          status: hasDpr ? 'COMPLETED' : (hasAnalysis ? 'ACTION_REQUIRED' : 'NOT_STARTED'),
          progress: hasDpr ? 100 : 0,
          blockingIssue: hasDpr ? null : 'Official Detailed Project Report not generated',
          nextAction: hasDpr ? 'Share immutable DPR snapshot with bank' : 'Generate bankable DPR',
          evidenceRequirement: 'Immutable DPR snapshot ledger',
          lastUpdatedAt: dprs?.[0]?.created_at || null
        },
        {
          id: 9,
          name: 'Execution',
          status: completedTasks > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
          progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          blockingIssue: null,
          nextAction: 'Procure machinery and begin baseline operations',
          evidenceRequirement: 'Purchase bills and commissioning records',
          lastUpdatedAt: tasks?.[0]?.updated_at || null
        },
        {
          id: 10,
          name: 'Field Verification',
          status: verifiedVisits > 0 ? 'COMPLETED' : ((fieldVisits?.items || []).length > 0 ? 'IN_PROGRESS' : 'PENDING'),
          progress: verifiedVisits > 0 ? 100 : ((fieldVisits?.items || []).length > 0 ? 50 : 0),
          blockingIssue: verifiedVisits === 0 ? 'Physical field visit verification pending' : null,
          nextAction: verifiedVisits > 0 ? 'Field verification complete' : 'Schedule on-site officer inspection',
          evidenceRequirement: 'Based on verified field information',
          lastUpdatedAt: fieldVisits?.items?.[0]?.updated_at || null
        },
        {
          id: 11,
          name: 'Outcome Recording',
          status: (outcomes || []).length > 0 ? (verifiedOutcomes > 0 ? 'COMPLETED' : 'IN_PROGRESS') : 'PENDING',
          progress: (outcomes || []).length > 0 ? (verifiedOutcomes > 0 ? 100 : 50) : 0,
          blockingIssue: (outcomes || []).length === 0 ? 'No actual revenue, cost, or investment recorded' : null,
          nextAction: 'Log actual operational numbers and upload invoices',
          evidenceRequirement: 'Ledger books, GST returns, and bank statements',
          lastUpdatedAt: outcomes?.[0]?.created_at || null
        },
        {
          id: 12,
          name: 'Performance Comparison',
          status: (outcomes || []).length > 0 && hasAnalysis ? 'COMPLETED' : 'PENDING',
          progress: (outcomes || []).length > 0 && hasAnalysis ? 100 : 0,
          blockingIssue: (outcomes || []).length === 0 ? 'Actual data not available yet.' : null,
          nextAction: 'Inspect variance matrix against original feasibility projection',
          evidenceRequirement: 'Actual data not available yet.',
          lastUpdatedAt: outcomes?.[0]?.created_at || null
        }
      ];

      return res.status(200).json({
        success: true,
        businessId: business.id,
        stages,
        evaluatedAt: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  }

  // ── 2. DATA QUALITY ──
  async getDataQuality(req, res, next) {
    try {
      const { id: businessId } = req.params;
      await this.verifyBusinessAccess(req, businessId);

      const quality = await dataQualityEngine.evaluateDataQuality(businessId);
      return res.status(200).json({
        success: true,
        data: quality
      });
    } catch (err) {
      next(err);
    }
  }

  // ── 3. STALE DATA DETECTION ──
  async getStaleData(req, res, next) {
    try {
      const { id: businessId } = req.params;
      await this.verifyBusinessAccess(req, businessId);

      const staleReport = await dataQualityEngine.detectStaleData(businessId);
      return res.status(200).json({
        success: true,
        data: staleReport
      });
    } catch (err) {
      next(err);
    }
  }

  // ── 4. EXECUTION CENTER ──
  async getExecutionCenter(req, res, next) {
    try {
      const { id: businessId } = req.params;
      const business = await this.verifyBusinessAccess(req, businessId);

      const tasks = await db.getTasksByBusinessId(businessId);
      const documents = await db.getDocumentsByBusinessId(businessId);
      const applications = await db.listApplications({ businessId });
      const outcomes = await db.listBusinessOutcomes(businessId);
      const quality = await dataQualityEngine.evaluateDataQuality(businessId);
      const health = await executionIntelligence.calculateBusinessHealth(businessId, business.user_id);
      const nextAction = await executionIntelligence.getNextBestAction(businessId, business.user_id);
      const changes = await executionIntelligence.detectChanges(businessId, business.user_id);

      const now = new Date();
      const todayActions = (tasks || []).filter(t => t.status !== 'COMPLETED' && t.due_date && new Date(t.due_date) <= now);
      const overdueActions = (tasks || []).filter(t => t.status !== 'COMPLETED' && t.due_date && new Date(t.due_date) < new Date(now.getTime() - 24 * 3600 * 1000));
      const requiredDocuments = (documents || []).filter(d => d.is_required);

      return res.status(200).json({
        success: true,
        businessId: business.id,
        data: {
          todayActions,
          overdueActions,
          requiredDocuments,
          verificationStatus: business.verification_status || 'UNVERIFIED',
          applicationStatus: (applications || []).length > 0 ? applications[0].status : 'NO_APPLICATIONS',
          fundingReadiness: {
            dprReady: Boolean(business.has_dpr),
            docsVerifiedPct: requiredDocuments.length > 0 ? Math.round(((documents || []).filter(d => d.verification_status === 'verified').length / requiredDocuments.length) * 100) : 0,
            hasCompletedApplication: (applications || []).some(a => a.status === 'APPROVED' || a.status === 'DISBURSED')
          },
          businessHealth: health,
          dataQuality: quality,
          latestChanges: changes?.recentChanges || [],
          nextBestAction: nextAction,
          outcomeTracking: {
            recordedCount: (outcomes || []).length,
            verifiedCount: (outcomes || []).filter(o => o.verification_status === 'verified').length
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // ── 5. EVIDENCE VAULT ──
  async listEvidence(req, res, next) {
    try {
      const { id: businessId } = req.params;
      const business = await this.verifyBusinessAccess(req, businessId);

      const page = parseInt(req.query.page || '1', 10);
      const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
      const taskId = req.query.taskId || null;
      const outcomeId = req.query.outcomeId || null;
      const evidenceType = req.query.evidenceType || null;

      const result = await db.listEvidence({
        businessId: business.id,
        tenantId: business.tenant_id || business.user_id,
        taskId,
        outcomeId,
        evidenceType,
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
    } catch (err) {
      next(err);
    }
  }

  async createEvidence(req, res, next) {
    try {
      const { id: businessId } = req.params;
      const business = await this.verifyBusinessAccess(req, businessId);

      const title = req.body.title;
      const evidenceType = req.body.evidenceType || req.body.category || 'PHOTO';
      const source = req.body.source || 'user_upload';
      const taskId = req.body.taskId || null;
      const applicationId = req.body.applicationId || null;
      const outcomeId = req.body.outcomeId || null;
      const fileName = req.body.fileName;
      const fileContentBase64 = req.body.fileContentBase64 || req.body.fileBuffer;
      const notes = req.body.notes || req.body.description || '';
      const metadata = req.body.metadata || {};

      if (!title || !evidenceType) {
        return res.status(400).json({
          success: false,
          error: 'TITLE_AND_TYPE_REQUIRED'
        });
      }

      let storageKey = 'evidence_meta_ref';
      let checksum = 'meta_checksum_pending';
      let fileSize = 0;
      let mimeType = 'application/octet-stream';

      if (fileContentBase64 && fileName) {
        const buffer = Buffer.from(fileContentBase64, 'base64');
        const stored = await defaultStorageProvider.storeFile({
          businessId: business.id,
          fileBuffer: buffer,
          originalName: fileName
        });
        storageKey = stored.storageKey;
        checksum = stored.checksum;
        fileSize = stored.fileSize;
        mimeType = stored.mimeType;
      } else if (req.body.checksum) {
        checksum = req.body.checksum;
      }

      const evidence = await db.createEvidence({
        tenantId: business.tenant_id || business.user_id,
        businessId: business.id,
        uploadedBy: req.user.id,
        title,
        evidenceType,
        storageKey,
        fileName: fileName || `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
        fileSize,
        mimeType,
        checksum,
        source,
        taskId,
        applicationId,
        outcomeId,
        notes,
        metadata
      });

      // If linked to a task, update task evidence status
      const linkedTaskId = taskId || req.body.taskId || req.body.linked_task_id;
      if (linkedTaskId) {
        await db.updateTask(linkedTaskId, {
          evidence_status: 'SUBMITTED'
        });
      }

      // Record timeline audit
      await db.recordBusinessEvent({
        businessId: business.id,
        eventType: 'EVIDENCE_SUBMITTED',
        actorId: req.user.id,
        details: {
          evidenceId: evidence.id,
          title,
          evidenceType,
          checksum,
          taskId,
          outcomeId
        }
      });

      return res.status(201).json({
        success: true,
        data: evidence
      });
    } catch (err) {
      if (err.message === 'PATH_TRAVERSAL_DETECTED' || err.message === 'DISALLOWED_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }
      next(err);
    }
  }

  async updateEvidence(req, res, next) {
    try {
      const { id: businessId, evidenceId } = req.params;
      const business = await this.verifyBusinessAccess(req, businessId);

      const evidence = await db.getEvidenceById(evidenceId);
      if (!evidence || evidence.business_id !== business.id) {
        return res.status(404).json({
          success: false,
          error: 'EVIDENCE_NOT_FOUND'
        });
      }

      const { verificationStatus, reviewNotes } = req.body;
      const updates = {};
      if (verificationStatus) {
        updates.verificationStatus = verificationStatus;
        updates.verifiedBy = req.user.id;
        updates.verifiedAt = new Date().toISOString();
      }
      if (reviewNotes !== undefined) updates.reviewNotes = reviewNotes;

      const updated = await db.updateEvidence(evidenceId, updates);

      // Create evidence review record
      if (verificationStatus) {
        await db.createEvidenceReview({
          evidenceId,
          reviewerId: req.user.id,
          reviewStatus: verificationStatus,
          reviewNotes: reviewNotes || ''
        });

        // Audit timeline event
        const eventType = verificationStatus.toUpperCase() === 'VERIFIED' ? 'EVIDENCE_VERIFIED' : 'EVIDENCE_REJECTED';
        await db.recordBusinessEvent({
          businessId: business.id,
          eventType,
          actorId: req.user.id,
          details: {
            evidenceId,
            verificationStatus,
            reviewNotes
          }
        });

        // If linked to a task, update task evidence status
        const linkedTaskId = evidence.linked_task_id || evidence.task_id || evidence.taskId;
        if (linkedTaskId) {
          const taskStatus = verificationStatus.toUpperCase() === 'VERIFIED' ? 'VERIFIED' : 'REJECTED';
          await db.updateTask(linkedTaskId, {
            evidence_status: taskStatus
          });
        }
      }

      return res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteEvidence(req, res, next) {
    try {
      const { id: businessId, evidenceId } = req.params;
      const business = await this.verifyBusinessAccess(req, businessId);

      const evidence = await db.getEvidenceById(evidenceId);
      if (!evidence || evidence.business_id !== business.id) {
        return res.status(404).json({
          success: false,
          error: 'EVIDENCE_NOT_FOUND'
        });
      }

      // Rule: Never delete verified evidence (immutable audit protection)
      if (evidence.verification_status === 'verified') {
        return res.status(400).json({
          success: false,
          error: 'CANNOT_DELETE_VERIFIED_EVIDENCE',
          message: 'Verified evidence is permanently protected from deletion.'
        });
      }

      await db.deleteEvidence(evidenceId);
      return res.status(200).json({
        success: true,
        message: 'Evidence deleted successfully.'
      });
    } catch (err) {
      next(err);
    }
  }

  // ── 6. OUTCOME VERIFICATION ──
  async verifyOutcome(req, res, next) {
    try {
      const { id: businessId, outcomeId } = req.params;
      const business = await this.verifyBusinessAccess(req, businessId);

      const outcome = await db.getOutcomeById(outcomeId);
      if (!outcome || outcome.business_id !== business.id) {
        return res.status(404).json({
          success: false,
          error: 'OUTCOME_NOT_FOUND'
        });
      }

      const { verificationStatus, evidenceIds, notes } = req.body;
      const status = (verificationStatus || 'verified').toLowerCase();
      if (!['verified', 'rejected', 'evidence-supported'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_VERIFICATION_STATUS'
        });
      }

      const verified = await db.verifyBusinessOutcome(outcomeId, {
        verificationStatus: status,
        evidenceIds: evidenceIds || [],
        verifiedBy: req.user.id
      });

      // Audit timeline event
      const eventType = status === 'verified' ? 'OUTCOME_VERIFIED' : 'OUTCOME_REJECTED';
      await db.recordBusinessEvent({
        businessId: business.id,
        eventType,
        actorId: req.user.id,
        details: {
          outcomeId,
          metricType: outcome.metric_type,
          actualValue: outcome.actual_value,
          verificationStatus: status,
          evidenceIds,
          notes
        }
      });

      return res.status(200).json({
        success: true,
        data: verified
      });
    } catch (err) {
      next(err);
    }
  }

  // ── 7. PARTNER ASSIGNMENTS ──
  async listPartners(req, res, next) {
    try {
      const { id: businessId } = req.params;
      const business = await this.verifyBusinessAccess(req, businessId);

      const assignments = await db.listPartnerAssignments({
        businessId: business.id,
        tenantId: business.tenant_id || business.user_id
      });

      return res.status(200).json({
        success: true,
        businessId: business.id,
        data: assignments
      });
    } catch (err) {
      next(err);
    }
  }

  async createPartner(req, res, next) {
    try {
      const { id: businessId } = req.params;
      const business = await this.verifyBusinessAccess(req, businessId);

      const { partnerId, partnerName, partnerRole, notes } = req.body;
      if (!partnerId || !partnerRole) {
        return res.status(400).json({
          success: false,
          error: 'PARTNER_ID_AND_ROLE_REQUIRED'
        });
      }

      const assignment = await db.createPartnerAssignment({
        tenantId: business.tenant_id || business.user_id,
        businessId: business.id,
        partnerId,
        partnerName: partnerName || 'Assigned Partner',
        partnerRole,
        notes: notes || ''
      });

      // Audit timeline
      await db.recordBusinessEvent({
        businessId: business.id,
        eventType: 'PARTNER_ASSIGNED',
        actorId: req.user.id,
        details: {
          partnerId,
          partnerName,
          partnerRole
        }
      });

      return res.status(201).json({
        success: true,
        data: assignment
      });
    } catch (err) {
      next(err);
    }
  }

  async updatePartner(req, res, next) {
    try {
      const { id: businessId, partnerId } = req.params;
      const business = await this.verifyBusinessAccess(req, businessId);

      const assignment = await db.getPartnerAssignmentById(partnerId);
      if (!assignment || assignment.business_id !== business.id) {
        return res.status(404).json({
          success: false,
          error: 'PARTNER_ASSIGNMENT_NOT_FOUND'
        });
      }

      const { status, notes } = req.body;
      const validStatuses = ['ASSIGNED', 'REVIEWING', 'ACTION_REQUIRED', 'SUPPORTED', 'COMPLETED', 'DECLINED'];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PARTNER_STATUS'
        });
      }

      const updated = await db.updatePartnerAssignment(partnerId, {
        status: status || assignment.status,
        notes: notes !== undefined ? notes : assignment.notes
      });

      if (status && status !== assignment.status) {
        await db.recordBusinessEvent({
          businessId: business.id,
          eventType: 'PARTNER_STATUS_CHANGED',
          actorId: req.user.id,
          details: {
            partnerId,
            fromStatus: assignment.status,
            toStatus: status
          }
        });
      }

      return res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }
}

const businessExecutionScaleController = new BusinessExecutionScaleController();

module.exports = {
  BusinessExecutionScaleController,
  businessExecutionScaleController
};

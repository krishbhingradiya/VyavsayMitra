/**
 * VYAVSAYMITRA — APPLICATION TRACKING & EXECUTION READINESS CONTROLLER (PHASE 8)
 * 
 * Manages bank and government application tracking (KCC, Mudra, FSSAI, Subsidies),
 * application document packaging, readiness guardrails, application timelines,
 * and smart pending actions ("Needs Your Attention").
 */

const dbRepository = require('../models/dbRepository');

async function getAuthorizedBusiness(businessId, userId) {
  if (!businessId || typeof businessId !== 'string') return null;
  return await dbRepository.getBusiness(businessId, userId);
}

// ── 1. LIST APPLICATIONS ─────────────────────────────────────────────────────
exports.listApplications = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const businessId = req.params.id;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const applications = await dbRepository.listApplications(businessId);

    // Attach document readiness summary, overdue detection, and next actions to each application
    const enriched = await Promise.all(applications.map(async (app) => {
      const linkedDocs = await dbRepository.listApplicationDocuments(businessId, app.id);
      const totalRequired = linkedDocs.filter(l => l.is_required).length;
      const uploadedRequired = linkedDocs.filter(l => l.is_required && l.document && (l.document.status === 'uploaded' || l.document.status === 'provided' || l.document.status === 'verified')).length;
      const verifiedRequired = linkedDocs.filter(l => l.is_required && l.document && l.document.status === 'verified').length;

      const isTerminal = ['APPROVED', 'REJECTED', 'WITHDRAWN', 'COMPLETED'].includes(app.status);
      const isOverdue = !!(app.expected_response_date && new Date(app.expected_response_date) < new Date() && !isTerminal);
      
      let nextRecommendedAction = 'Review application progress with bank branch or scheme authority.';
      switch (app.status) {
        case 'DRAFT':
        case 'DOCUMENTS_PENDING':
          nextRecommendedAction = 'Upload and verify all required statutory documents.';
          break;
        case 'READY_TO_SUBMIT':
          nextRecommendedAction = 'Submit application package to financial institution or scheme portal.';
          break;
        case 'SUBMITTED':
          nextRecommendedAction = 'Awaiting formal acknowledgment from institution.';
          break;
        case 'UNDER_REVIEW':
          nextRecommendedAction = isOverdue
            ? 'Application response is overdue. Follow up directly with loan officer or portal nodal officer.'
            : 'Follow up with bank branch manager or scheme nodal officer.';
          break;
        case 'ACTION_REQUIRED':
          nextRecommendedAction = 'Resolve pending inquiries or upload requested documents immediately.';
          break;
        case 'APPROVED':
          nextRecommendedAction = 'Collect formal sanction letter and disburse capital into business account.';
          break;
        case 'REJECTED':
          nextRecommendedAction = 'Review rejection reasons and consider reapplying or alternative schemes.';
          break;
        case 'WITHDRAWN':
          nextRecommendedAction = 'No further action required.';
          break;
        case 'COMPLETED':
          nextRecommendedAction = 'Execution completed successfully.';
          break;
      }

      return {
        ...app,
        isOverdue,
        nextRecommendedAction,
        documentsSummary: {
          totalLinked: linkedDocs.length,
          totalRequired,
          uploadedRequired,
          verifiedRequired,
          isDocumentReady: totalRequired === 0 || (uploadedRequired >= totalRequired)
        }
      };
    }));

    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);
    if (!isNaN(page) || !isNaN(limit)) {
      const { paginate } = require('../services/executionIntelligence');
      const paginated = paginate(enriched, page || 1, limit || 20);
      return res.json({
        success: true,
        data: {
          businessId,
          applications: paginated.items,
          pagination: paginated.pagination
        }
      });
    }

    res.json({
      success: true,
      data: {
        businessId,
        applications: enriched
      }
    });
  } catch (err) {
    next(err);
  }
};

// ── 2. CREATE APPLICATION ────────────────────────────────────────────────────
exports.createApplication = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const businessId = req.params.id;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const {
      application_type,
      applicationType,
      scheme_name,
      schemeName,
      institution_name,
      institutionName,
      application_reference,
      applicationReference,
      expected_response_date,
      expectedResponseDate,
      current_stage,
      currentStage,
      notes,
      linkedDocumentIds
    } = req.body;

    const type = application_type || applicationType;
    if (!type || typeof type !== 'string' || !type.trim()) {
      return res.status(400).json({ success: false, message: 'Application type is required.' });
    }

    const app = await dbRepository.createApplication(businessId, userId, {
      application_type: type.trim(),
      scheme_name: scheme_name || schemeName || '',
      institution_name: institution_name || institutionName || 'Lead District Bank',
      application_reference: application_reference || applicationReference || '',
      expected_response_date: expected_response_date || expectedResponseDate || null,
      current_stage: current_stage || currentStage || 'Application Preparation',
      status: 'DRAFT',
      notes: notes || ''
    });

    // Link initial documents if provided
    if (Array.isArray(linkedDocumentIds) && linkedDocumentIds.length > 0) {
      for (const docId of linkedDocumentIds) {
        await dbRepository.linkApplicationDocument(businessId, app.id, docId, true);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Application tracking created successfully.',
      data: app
    });
  } catch (err) {
    next(err);
  }
};

// ── 3. GET APPLICATION DETAILS ───────────────────────────────────────────────
exports.getApplication = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const businessId = req.params.id;
    const applicationId = req.params.applicationId;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const app = await dbRepository.getApplicationById(businessId, applicationId);
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const [linkedDocs, timeline] = await Promise.all([
      dbRepository.listApplicationDocuments(businessId, applicationId),
      dbRepository.listApplicationTimeline(businessId, applicationId)
    ]);

    const totalRequired = linkedDocs.filter(l => l.is_required).length;
    const uploadedRequired = linkedDocs.filter(l => l.is_required && l.document && (l.document.status === 'uploaded' || l.document.status === 'provided' || l.document.status === 'verified')).length;
    const verifiedRequired = linkedDocs.filter(l => l.is_required && l.document && l.document.status === 'verified').length;

    res.json({
      success: true,
      data: {
        ...app,
        linkedDocuments: linkedDocs,
        timeline,
        readiness: {
          totalLinked: linkedDocs.length,
          totalRequired,
          uploadedRequired,
          verifiedRequired,
          isDocumentReady: totalRequired === 0 || (uploadedRequired >= totalRequired)
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// ── 4. UPDATE APPLICATION ────────────────────────────────────────────────────
exports.updateApplication = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const businessId = req.params.id;
    const applicationId = req.params.applicationId;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const current = await dbRepository.getApplicationById(businessId, applicationId);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const {
      status,
      application_type,
      applicationType,
      scheme_name,
      schemeName,
      institution_name,
      institutionName,
      application_reference,
      applicationReference,
      expected_response_date,
      expectedResponseDate,
      current_stage,
      currentStage,
      notes
    } = req.body;

    const validStatuses = [
      'DRAFT',
      'DOCUMENTS_PENDING',
      'READY_TO_SUBMIT',
      'SUBMITTED',
      'UNDER_REVIEW',
      'ACTION_REQUIRED',
      'APPROVED',
      'REJECTED',
      'WITHDRAWN',
      'COMPLETED'
    ];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid application status. Allowed: ${validStatuses.join(', ')}`
      });
    }

    // Lifecycle State Transition Guard
    const ALLOWED_LIFECYCLE_TRANSITIONS = {
      DRAFT: ['DOCUMENTS_PENDING', 'READY_TO_SUBMIT', 'SUBMITTED', 'ACTION_REQUIRED', 'WITHDRAWN'],
      DOCUMENTS_PENDING: ['READY_TO_SUBMIT', 'SUBMITTED', 'DRAFT', 'ACTION_REQUIRED', 'WITHDRAWN'],
      READY_TO_SUBMIT: ['SUBMITTED', 'DOCUMENTS_PENDING', 'DRAFT', 'ACTION_REQUIRED', 'WITHDRAWN'],
      SUBMITTED: ['UNDER_REVIEW', 'ACTION_REQUIRED', 'APPROVED', 'REJECTED', 'WITHDRAWN'],
      UNDER_REVIEW: ['ACTION_REQUIRED', 'APPROVED', 'REJECTED', 'WITHDRAWN'],
      ACTION_REQUIRED: ['UNDER_REVIEW', 'SUBMITTED', 'DOCUMENTS_PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'],
      APPROVED: ['COMPLETED'],
      REJECTED: [],
      WITHDRAWN: [],
      COMPLETED: []
    };

    if (status && status !== current.status) {
      const allowedNext = ALLOWED_LIFECYCLE_TRANSITIONS[current.status];
      if (allowedNext && !allowedNext.includes(status)) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_STATUS_TRANSITION',
          errorCode: 'INVALID_STATUS_TRANSITION',
          message: `Invalid application lifecycle transition from '${current.status}' to '${status}'.`
        });
      }
    }

    // Readiness Guard: Check linked required documents if marking READY_TO_SUBMIT or SUBMITTED
    if (status === 'READY_TO_SUBMIT' || status === 'SUBMITTED') {
      const linkedDocs = await dbRepository.listApplicationDocuments(businessId, applicationId);
      const unprovidedRequired = linkedDocs.filter(
        l => l.is_required && (!l.document || l.document.status === 'missing' || l.document.status === 'rejected' || !l.document.storage_path)
      );
      if (unprovidedRequired.length > 0) {
        return res.status(400).json({
          success: false,
          code: 'APPLICATION_DOCUMENTS_INCOMPLETE',
          errorCode: 'APPLICATION_DOCUMENTS_INCOMPLETE',
          message: `Cannot transition application to ${status}: ${unprovidedRequired.length} required document(s) are missing or not in a valid state.`,
          unprovidedDocuments: unprovidedRequired.map(u => u.document?.document_name || 'Required Document')
        });
      }
    }

    const updated = await dbRepository.updateApplication(businessId, applicationId, {
      status,
      application_type: application_type || applicationType,
      scheme_name: scheme_name || schemeName,
      institution_name: institution_name || institutionName,
      application_reference: application_reference || applicationReference,
      expected_response_date: expected_response_date || expectedResponseDate,
      current_stage: current_stage || currentStage,
      notes
    });

    // Record audit event for state transitions
    if (status && status !== current.status) {
      try {
        await dbRepository.createApplicationTimelineEvent(businessId, applicationId, {
          eventType: 'STATUS_CHANGED',
          title: `Status Changed: ${status}`,
          description: `Application transitioned from ${current.status} to ${status}.`,
          metadata: { previousStatus: current.status, newStatus: status, transitionTimestamp: new Date().toISOString() }
        });
      } catch (_) {}
    }

    // If status changed to ACTION_REQUIRED, create notification
    if (status === 'ACTION_REQUIRED') {
      await dbRepository.createNotification(userId, {
        title: `Action Required on ${updated.application_type}`,
        message: `${business.name}: ${notes || `Institution ${updated.institution_name} requested action.`}`,
        type: 'WARNING',
        category: 'APPLICATION',
        action_url: `/businesses/${businessId}?tab=applications&appId=${applicationId}`
      });
    }

    res.json({
      success: true,
      message: `Application updated to ${status || current.status}.`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

// ── 5. DELETE APPLICATION ────────────────────────────────────────────────────
exports.deleteApplication = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const businessId = req.params.id;
    const applicationId = req.params.applicationId;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const current = await dbRepository.getApplicationById(businessId, applicationId);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    await dbRepository.deleteApplication(businessId, applicationId);

    await dbRepository.createTimelineEvent(businessId, {
      eventType: 'APPLICATION_DELETED',
      title: `Application Deleted: ${current.application_type}`,
      description: `Removed application record with ${current.institution_name}.`,
      metadata: { applicationId, applicationType: current.application_type }
    });

    res.json({
      success: true,
      message: 'Application deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};

// ── 6. GET APPLICATION TIMELINE ──────────────────────────────────────────────
exports.getTimeline = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const businessId = req.params.id;
    const applicationId = req.params.applicationId;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const app = await dbRepository.getApplicationById(businessId, applicationId);
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const timeline = await dbRepository.listApplicationTimeline(businessId, applicationId);

    res.json({
      success: true,
      data: {
        applicationId,
        timeline
      }
    });
  } catch (err) {
    next(err);
  }
};

// ── 7. LINK DOCUMENT TO APPLICATION ──────────────────────────────────────────
exports.linkDocument = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const businessId = req.params.id;
    const applicationId = req.params.applicationId;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const app = await dbRepository.getApplicationById(businessId, applicationId);
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const { documentId, isRequired = true } = req.body;
    if (!documentId) {
      return res.status(400).json({ success: false, message: 'Document ID is required.' });
    }

    // IDOR check on document: document MUST belong to same business
    const doc = await dbRepository.getDocumentById(businessId, documentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found in this business.' });
    }

    const link = await dbRepository.linkApplicationDocument(businessId, applicationId, doc.id, isRequired);

    res.status(200).json({
      success: true,
      message: `Document "${doc.document_name}" linked to application.`,
      data: link
    });
  } catch (err) {
    next(err);
  }
};

// ── 8. UNLINK DOCUMENT FROM APPLICATION ──────────────────────────────────────
exports.unlinkDocument = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const businessId = req.params.id;
    const applicationId = req.params.applicationId;
    const documentId = req.params.documentId;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const app = await dbRepository.getApplicationById(businessId, applicationId);
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    await dbRepository.unlinkApplicationDocument(businessId, applicationId, documentId);

    res.json({
      success: true,
      message: 'Document unlinked from application.'
    });
  } catch (err) {
    next(err);
  }
};

// ── 9. EXECUTION READINESS SCORECARD ──────────────────────────────────────────
exports.getExecutionReadiness = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const businessId = req.params.id;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const [inputs, analyses, documents, applications, tasks, dprVersions] = await Promise.all([
      dbRepository.getLatestBusinessInputs(businessId),
      dbRepository.listAnalyses(businessId),
      dbRepository.listBusinessDocuments(businessId),
      dbRepository.listApplications(businessId),
      dbRepository.listActionTasks(businessId),
      dbRepository.listDprVersions(businessId)
    ]);

    const latestAnalysis = analyses && analyses.length > 0 ? analyses[0] : null;

    // 1. Business Setup
    const setupCompleted = Boolean(business.name && business.domain);

    // 2. Financial Feasibility
    const analysisCompleted = Boolean(latestAnalysis && (latestAnalysis.status === 'ANALYSIS_COMPLETE' || latestAnalysis.status === 'SUCCESS'));

    // 3. Documentation
    const totalDocs = documents.length;
    const uploadedDocs = documents.filter(d => d.status === 'uploaded' || d.status === 'provided' || d.status === 'verified').length;
    const verifiedDocs = documents.filter(d => d.status === 'verified').length;
    const rejectedDocs = documents.filter(d => d.status === 'rejected').length;
    const mandatoryMissing = documents.filter(d => d.is_mandatory && (!d.status || d.status === 'missing')).length;

    // 4. Applications
    const totalApps = applications.length;
    const submittedApps = applications.filter(a => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW' || a.status === 'APPROVED' || a.status === 'COMPLETED').length;
    const approvedApps = applications.filter(a => a.status === 'APPROVED' || a.status === 'COMPLETED').length;
    const actionRequiredApps = applications.filter(a => a.status === 'ACTION_REQUIRED').length;

    // 5. Execution Tasks
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const highPriorityPending = tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length;

    // 6. Bankable DPR
    const dprAvailable = dprVersions.length > 0;

    // Overall State
    const hasBlockers = rejectedDocs > 0 || actionRequiredApps > 0 || mandatoryMissing > 0 || !analysisCompleted;
    const overallState = hasBlockers ? 'ACTION_REQUIRED' : (dprAvailable && uploadedDocs > 0 ? 'READY' : 'IN_PROGRESS');

    res.json({
      success: true,
      data: {
        businessId,
        overallState,
        scorecard: {
          businessSetup: { status: setupCompleted ? 'Completed' : 'In Progress' },
          financialFeasibility: {
            status: analysisCompleted ? 'Completed' : 'In Progress',
            netProfit: latestAnalysis?.net_profit || latestAnalysis?.net_margin_inr || 0,
            loanRequirement: latestAnalysis?.bank_loan_requirement || 0
          },
          documentation: {
            status: rejectedDocs > 0 ? 'Needs Attention' : (mandatoryMissing === 0 && uploadedDocs > 0 ? 'Completed' : 'In Progress'),
            totalDocs,
            uploadedDocs,
            verifiedDocs,
            rejectedDocs,
            mandatoryMissing
          },
          applications: {
            status: actionRequiredApps > 0 ? 'Needs Attention' : (approvedApps > 0 ? 'Completed' : (totalApps > 0 ? 'In Progress' : 'Pending')),
            totalApps,
            submittedApps,
            approvedApps,
            actionRequiredApps
          },
          executionTasks: {
            status: completedTasks === totalTasks && totalTasks > 0 ? 'Completed' : 'In Progress',
            totalTasks,
            completedTasks,
            highPriorityPending
          },
          executionMilestones: {
            status: completedTasks === totalTasks && totalTasks > 0 ? 'Completed' : 'In Progress',
            totalTasks,
            completedTasks,
            highPriorityPending
          },
          bankableDpr: {
            status: dprAvailable ? 'Completed' : 'In Progress',
            versionsCount: dprVersions.length,
            dprVersionsCount: dprVersions.length,
            latestVersion: dprVersions[0]?.version_number || null
          }
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// ── 10. SMART PENDING ACTIONS ("Needs Your Attention") ────────────────────────
exports.getPendingActions = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const businessId = req.params.id || null;

    if (businessId) {
      const business = await getAuthorizedBusiness(businessId, userId);
      if (!business) {
        return res.status(404).json({ success: false, message: 'Business not found.' });
      }
    }

    const pendingActions = await dbRepository.getSmartPendingActions(userId, businessId);

    res.json({
      success: true,
      data: {
        totalPending: pendingActions.length,
        count: pendingActions.length,
        actions: pendingActions
      }
    });
  } catch (err) {
    next(err);
  }
};

// Aliases for compatibility
exports.linkApplicationDocument = exports.linkDocument;
exports.unlinkApplicationDocument = exports.unlinkDocument;
exports.getApplicationTimeline = exports.getTimeline;
exports.getBusinessPendingActions = exports.getPendingActions;


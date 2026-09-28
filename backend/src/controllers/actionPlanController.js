/**
 * VYAVSAYMITRA — ACTION PLAN & EXECUTION CONTROLLER (PHASE 7)
 * 
 * Manages action milestones, document readiness, immutable DPR snapshots,
 * audit timeline, real progress indicators, and verified market trends.
 * Enforces strict multi-tenant IDOR protection (404 for unauthorized businesses).
 */

const dbRepository = require('../models/dbRepository');
const actionPlanService = require('../services/actionPlanService');

// Helper to verify business ownership strictly
async function getAuthorizedBusiness(businessId, userId) {
  if (!businessId || typeof businessId !== 'string') return null;
  return await dbRepository.getBusiness(businessId, userId);
}

// ── 1. GET ACTION PLAN ────────────────────────────────────────────────────────
exports.getActionPlan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const businessId = req.params.id;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const [inputs, analyses, marketObs, schemes, dprVersions] = await Promise.all([
      dbRepository.getLatestInputs(businessId),
      dbRepository.listAnalyses(businessId),
      dbRepository.listMarketObservations(businessId),
      dbRepository.getSchemeMatches(businessId),
      dbRepository.listDprVersions(businessId)
    ]);

    const latestAnalysis = analyses && analyses.length > 0 ? analyses[0] : null;

    // Seed default tasks and documents if empty
    let [tasks, documents] = await Promise.all([
      actionPlanService.seedActionTasksIfEmpty(business, inputs, latestAnalysis, marketObs, schemes),
      actionPlanService.seedDefaultDocumentsIfEmpty(businessId, business.domain)
    ]);

    const progress = actionPlanService.calculateProgress({
      business,
      inputs,
      analysis: latestAnalysis,
      documents,
      tasks,
      dprVersions,
      schemes,
      marketObs
    });

    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);
    let paginatedTasks = tasks;
    let pagination = null;
    if (!isNaN(page) || !isNaN(limit)) {
      const { paginate } = require('../services/executionIntelligence');
      const p = paginate(tasks, page || 1, limit || 20);
      paginatedTasks = p.items;
      pagination = p.pagination;
    }

    res.json({
      success: true,
      data: {
        businessId,
        tasks: paginatedTasks,
        documents,
        progress: progress.overallProgress,
        breakdown: progress.breakdown,
        readiness: progress.readiness
      },
      ...(pagination ? { pagination } : {})
    });
  } catch (err) {
    next(err);
  }
};

// ── 2. CREATE ACTION TASK ─────────────────────────────────────────────────────
exports.createTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const businessId = req.params.id;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const { title, description, category, priority, due_date, dueDate } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required.' });
    }

    const validCategories = ['operations', 'regulatory', 'procurement', 'finance', 'marketing'];
    const validPriorities = ['low', 'medium', 'high'];

    const taskCategory = validCategories.includes(category) ? category : 'operations';
    const taskPriority = validPriorities.includes(priority) ? priority : 'medium';

    const task = await dbRepository.createActionTask(businessId, {
      title: title.trim(),
      description: description ? String(description).trim() : '',
      category: taskCategory,
      priority: taskPriority,
      status: 'pending',
      due_date: due_date || dueDate || null,
      source: 'user'
    });

    await dbRepository.createTimelineEvent(businessId, {
      eventType: 'TASK_CREATED',
      title: `Task Added: ${task.title}`,
      description: `Manual action task added under ${taskCategory}.`,
      metadata: { taskId: task.id, category: taskCategory }
    });

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

// ── 3. UPDATE ACTION TASK ─────────────────────────────────────────────────────
exports.updateTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const businessId = req.params.id;
    const taskId = req.params.taskId;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const validStatuses = ['pending', 'in_progress', 'completed', 'blocked'];
    const { status, priority, title, description, due_date } = req.body;

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid task status.' });
    }

    const updated = await dbRepository.updateActionTask(businessId, taskId, {
      status,
      priority,
      title,
      description,
      due_date
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    if (status === 'completed') {
      await dbRepository.createTimelineEvent(businessId, {
        eventType: 'TASK_COMPLETED',
        title: `Task Completed: ${updated.title}`,
        description: `Action milestone completed.`,
        metadata: { taskId }
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ── 4. DELETE ACTION TASK ─────────────────────────────────────────────────────
exports.deleteTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const businessId = req.params.id;
    const taskId = req.params.taskId;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    await dbRepository.deleteActionTask(businessId, taskId);
    res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// ── 5. LIST DOCUMENTS ─────────────────────────────────────────────────────────
exports.getDocuments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const businessId = req.params.id;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    let documents = await dbRepository.listBusinessDocuments(businessId);
    if (!documents || documents.length === 0) {
      documents = await actionPlanService.seedDefaultDocumentsIfEmpty(businessId, business.domain);
    }

    res.json({ success: true, count: documents.length, data: documents });
  } catch (err) {
    next(err);
  }
};

// ── 6. UPDATE DOCUMENT ────────────────────────────────────────────────────────
exports.updateDocument = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const businessId = req.params.id;
    const docId = req.params.docId;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const { status, notes, document_type, document_name } = req.body;
    const validStatuses = ['missing', 'provided', 'verified', 'not_required'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid document status.' });
    }

    const updated = await dbRepository.upsertBusinessDocument(businessId, {
      id: docId,
      document_type: document_type || docId,
      document_name,
      status: status || 'provided',
      notes
    });

    await dbRepository.createTimelineEvent(businessId, {
      eventType: 'DOCUMENT_UPDATED',
      title: `Document Updated: ${updated.document_name}`,
      description: `Document marked as ${updated.status}.`,
      metadata: { docId: updated.id, status: updated.status }
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// ── 7. GET REAL PROGRESS & READINESS ──────────────────────────────────────────
exports.getProgress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const businessId = req.params.id;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const [inputs, analyses, marketObs, schemes, documents, tasks, dprVersions] = await Promise.all([
      dbRepository.getLatestInputs(businessId),
      dbRepository.listAnalyses(businessId),
      dbRepository.listMarketObservations(businessId),
      dbRepository.getSchemeMatches(businessId),
      dbRepository.listBusinessDocuments(businessId),
      dbRepository.listActionTasks(businessId),
      dbRepository.listDprVersions(businessId)
    ]);

    const latestAnalysis = analyses && analyses.length > 0 ? analyses[0] : null;

    const progress = actionPlanService.calculateProgress({
      business,
      inputs,
      analysis: latestAnalysis,
      documents,
      tasks,
      dprVersions,
      schemes,
      marketObs
    });

    res.json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
};

// ── 8. GET BUSINESS TIMELINE (Activity Audit Trail) ───────────────────────────
exports.getTimeline = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const businessId = req.params.id;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const page = parseInt(req.query.page, 10);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const events = await dbRepository.listTimelineEvents(businessId, 200);

    if (!isNaN(page)) {
      const { paginate } = require('../services/executionIntelligence');
      const paginated = paginate(events, page || 1, limit);
      return res.json({
        success: true,
        count: events.length,
        data: paginated.items,
        pagination: paginated.pagination
      });
    }

    res.json({ success: true, count: events.slice(0, limit).length, data: events.slice(0, limit) });
  } catch (err) {
    next(err);
  }
};

// ── 9. LIST DPR VERSIONS ──────────────────────────────────────────────────────
exports.listDprVersions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const businessId = req.params.id;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const versions = await dbRepository.listDprVersions(businessId);

    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);
    if (!isNaN(page) || !isNaN(limit)) {
      const { paginate } = require('../services/executionIntelligence');
      const paginated = paginate(versions, page || 1, limit || 20);
      return res.json({
        success: true,
        count: versions.length,
        data: paginated.items,
        pagination: paginated.pagination
      });
    }

    res.json({ success: true, count: versions.length, data: versions });
  } catch (err) {
    next(err);
  }
};

// ── 10. GET SINGLE DPR VERSION ────────────────────────────────────────────────
exports.getDprVersion = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const businessId = req.params.id;
    const versionId = req.params.versionId;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const version = await dbRepository.getDprVersion(businessId, versionId);
    if (!version) {
      return res.status(404).json({ success: false, message: 'DPR version not found.' });
    }

    res.json({ success: true, data: version });
  } catch (err) {
    next(err);
  }
};

// ── 11. CREATE IMMUTABLE DPR VERSION ──────────────────────────────────────────
exports.createDprVersion = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const businessId = req.params.id;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const analyses = await dbRepository.listAnalyses(businessId);
    const completedAnalysis = analyses.find(a => a.status === 'ANALYSIS_COMPLETE' || a.status === 'SUCCESS');
    if (!completedAnalysis) {
      return res.status(400).json({
        success: false,
        message: 'Cannot generate bankable DPR without a completed financial feasibility analysis.'
      });
    }

    const inputs = await dbRepository.getLatestInputs(businessId);
    const schemes = await dbRepository.getSchemeMatches(businessId);
    const market = await dbRepository.getLatestMarketObservation(businessId);
    const documents = await dbRepository.listBusinessDocuments(businessId);

    const title = req.body.title || `Detailed Project Report — ${business.name}`;
    const summary = req.body.summary || `Bankable Detailed Project Report for ${business.domain === 'agriculture' ? 'Agricultural Cultivation' : 'Agro-Processing'} unit.`;

    // Construct bankable DPR content snapshot
    const dprSnapshot = {
      businessInfo: {
        id: business.id,
        name: business.name,
        domain: business.domain,
        businessType: business.business_type,
        location: business.location
      },
      inputsSnapshot: inputs?.raw_inputs || {},
      inputVersion: inputs?.version_number || 1,
      analysisId: completedAnalysis.id,
      financialModel: {
        totalProjectCost: completedAnalysis.total_project_cost,
        promoterEquity: completedAnalysis.promoter_equity,
        bankLoanRequirement: completedAnalysis.bank_loan_requirement,
        annualRevenue: completedAnalysis.annual_revenue,
        annualOperatingCost: completedAnalysis.annual_operating_cost,
        netAnnualProfit: completedAnalysis.net_annual_profit,
        annualRoiPct: completedAnalysis.annual_roi_pct,
        dscr: completedAnalysis.dscr,
        viabilityRating: completedAnalysis.viability_rating
      },
      financials: {
        totalProjectCost: completedAnalysis.total_project_cost,
        promoterEquity: completedAnalysis.promoter_equity,
        bankLoanRequirement: completedAnalysis.bank_loan_requirement,
        annualRevenue: completedAnalysis.annual_revenue,
        annualOperatingCost: completedAnalysis.annual_operating_cost,
        netAnnualProfit: completedAnalysis.net_annual_profit,
        annualRoiPct: completedAnalysis.annual_roi_pct,
        dscr: completedAnalysis.dscr,
        viabilityRating: completedAnalysis.viability_rating
      },
      marketSnapshot: market ? {
        commodity: market.commodity,
        modalPrice: market.modal_price,
        marketName: market.market_name,
        observationDate: market.observation_date
      } : null,
      statutorySchemes: schemes || [],
      documentsChecklist: (documents || []).map(d => ({
        name: d.document_name,
        type: d.document_type,
        status: d.status
      })),
      archivedAt: new Date().toISOString()
    };

    // Concurrency & Idempotency check: if identical DPR snapshot was generated within the last 5 seconds, return existing
    const existingDprVersions = await dbRepository.listDprVersions(businessId);
    const recentDpr = existingDprVersions.find(v => 
      String(v.analysis_id) === String(completedAnalysis.id) && 
      Number(v.input_version) === Number(inputs?.version_number || 1) &&
      (new Date() - new Date(v.created_at)) < 5000
    );

    let dprVersion;
    if (recentDpr && (req.headers['idempotency-key'] || req.body?.idempotent)) {
      dprVersion = recentDpr;
    } else {
      dprVersion = await dbRepository.createDprVersion(businessId, {
        title,
        summary,
        analysisId: completedAnalysis.id,
        inputVersion: inputs?.version_number || 1,
        content: dprSnapshot,
        createdBy: userId
      });
    }

    const responseData = {
      ...dprVersion,
      snapshot_payload: dprVersion.content_snapshot || dprSnapshot,
      content_snapshot: dprVersion.content_snapshot || dprSnapshot
    };

    res.status(201).json({ success: true, data: responseData });
  } catch (err) {
    next(err);
  }
};

// ── 12. GET REAL MARKET TRENDS (Zero Fake Data Guarantee) ─────────────────────
exports.getMarketTrends = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const businessId = req.params.id;

    const business = await getAuthorizedBusiness(businessId, userId);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found.' });
    }

    const observations = await dbRepository.listMarketObservations(businessId);

    // Group observations with valid price and dates
    const validPoints = (observations || [])
      .filter(o => o.observation_date && (o.modal_price !== undefined && o.modal_price !== null))
      .map(o => ({
        date: o.observation_date,
        modalPrice: Number(o.modal_price),
        marketName: o.market_name,
        commodity: o.commodity,
        unit: o.unit || 'INR/quintal'
      }));

    if (validPoints.length < 2) {
      return res.json({
        success: true,
        available: false,
        message: 'Historical market trend data is currently unavailable for this commodity in your district. Live spot prices are shown when available.',
        commodity: validPoints[0]?.commodity || null,
        dataPoints: validPoints
      });
    }

    res.json({
      success: true,
      available: true,
      commodity: validPoints[0].commodity,
      unit: validPoints[0].unit,
      dataPoints: validPoints
    });
  } catch (err) {
    next(err);
  }
};

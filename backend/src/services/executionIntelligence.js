/**
 * VYAVSAYMITRA — Execution Intelligence Service
 * 
 * Deterministic, explainable business execution intelligence.
 * 
 * Provides:
 * 1. Business Health / Readiness Calculation (100% deterministic, no AI)
 * 2. Smart Next Action Engine (priority-ranked, grounded in DB state)
 * 3. Change Detection ("What Changed?")
 * 4. Data Trust & Provenance Classification
 * 
 * STRICT RULES:
 * - All scores are deterministic and explainable.
 * - All data comes from actual database state.
 * - No fabrication of effort estimates, deadlines, or financial data.
 * - No arbitrary AI-generated scores.
 * - Every readiness score has an explanation.
 */

const dbRepository = require('../models/dbRepository');

// ────────────────────────────────────────────────────────────────────────────
// 1. BUSINESS HEALTH / READINESS CALCULATION
// ────────────────────────────────────────────────────────────────────────────

/**
 * Calculates deterministic business readiness based on verified data.
 * Returns scores from 0-100 with clear explanations.
 * 
 * @param {string} businessId
 * @param {string} userId
 * @returns {Promise<Object>} Readiness breakdown with explanations
 */
async function calculateBusinessHealth(businessId, userId) {
  const business = await dbRepository.getBusiness(businessId, userId);
  if (!business) return null;

  const [docs, apps, tasks, dprs, analyses, inputs] = await Promise.all([
    dbRepository.listBusinessDocuments(businessId),
    dbRepository.listApplications(businessId),
    dbRepository.listActionTasks(businessId),
    dbRepository.listDprVersions(businessId),
    dbRepository.listAnalyses(businessId),
    dbRepository.listBusinessInputs(businessId),
  ]);

  const latestAnalysis = analyses && analyses.length > 0 ? analyses[0] : null;
  const factors = [];
  let totalWeight = 0;
  let weightedScore = 0;

  // ── Factor 1: Business Inputs (Weight: 15) ──
  const inputWeight = 15;
  totalWeight += inputWeight;
  if (inputs && inputs.length > 0) {
    weightedScore += inputWeight;
    factors.push({
      name: 'Business Inputs',
      score: 100,
      maxScore: 100,
      weight: inputWeight,
      status: 'complete',
      explanation: 'Business inputs have been provided.'
    });
  } else {
    factors.push({
      name: 'Business Inputs',
      score: 0,
      maxScore: 100,
      weight: inputWeight,
      status: 'missing',
      explanation: 'No business inputs have been entered yet. This is the first step.'
    });
  }

  // ── Factor 2: Financial Analysis (Weight: 20) ──
  const analysisWeight = 20;
  totalWeight += analysisWeight;
  if (latestAnalysis && (latestAnalysis.status === 'ANALYSIS_COMPLETE' || latestAnalysis.status === 'SUCCESS')) {
    weightedScore += analysisWeight;
    factors.push({
      name: 'Financial Feasibility',
      score: 100,
      maxScore: 100,
      weight: analysisWeight,
      status: 'complete',
      explanation: 'Financial feasibility analysis has been completed.'
    });
  } else if (latestAnalysis) {
    weightedScore += analysisWeight * 0.3;
    factors.push({
      name: 'Financial Feasibility',
      score: 30,
      maxScore: 100,
      weight: analysisWeight,
      status: 'in_progress',
      explanation: `Analysis exists but status is "${latestAnalysis.status}". Please complete the analysis.`
    });
  } else {
    factors.push({
      name: 'Financial Feasibility',
      score: 0,
      maxScore: 100,
      weight: analysisWeight,
      status: 'missing',
      explanation: 'No financial feasibility analysis has been run yet.'
    });
  }

  // ── Factor 3: Documentation (Weight: 20) ──
  const docWeight = 20;
  totalWeight += docWeight;
  const mandatoryDocs = docs.filter(d => d.is_mandatory);
  const verifiedMandatory = mandatoryDocs.filter(d => d.status === 'verified' || d.status === 'uploaded' || d.status === 'provided');
  const rejectedDocs = docs.filter(d => d.status === 'rejected');
  const missingMandatory = mandatoryDocs.filter(d => d.status === 'missing' || !d.status);
  
  let docScore = 100;
  const docExplanations = [];
  
  if (mandatoryDocs.length > 0) {
    docScore = Math.round((verifiedMandatory.length / mandatoryDocs.length) * 100);
  } else if (docs.length === 0) {
    docScore = 0;
    docExplanations.push('No documents have been uploaded.');
  }
  
  if (rejectedDocs.length > 0) {
    docScore = Math.max(0, docScore - 20);
    docExplanations.push(`${rejectedDocs.length} document(s) were rejected and need replacement.`);
  }
  if (missingMandatory.length > 0) {
    docExplanations.push(`${missingMandatory.length} mandatory document(s) are still missing.`);
  }
  if (docExplanations.length === 0) {
    docExplanations.push(mandatoryDocs.length > 0 ? 'All mandatory documents are provided.' : 'No mandatory documents defined yet.');
  }
  
  weightedScore += docWeight * (docScore / 100);
  factors.push({
    name: 'Documentation',
    score: docScore,
    maxScore: 100,
    weight: docWeight,
    status: docScore >= 80 ? 'complete' : docScore > 0 ? 'in_progress' : 'missing',
    explanation: docExplanations.join(' '),
    details: {
      totalDocuments: docs.length,
      mandatoryTotal: mandatoryDocs.length,
      mandatoryComplete: verifiedMandatory.length,
      rejected: rejectedDocs.length,
      missing: missingMandatory.length,
    }
  });

  // ── Factor 4: DPR Readiness (Weight: 15) ──
  const dprWeight = 15;
  totalWeight += dprWeight;
  if (dprs.length > 0) {
    weightedScore += dprWeight;
    factors.push({
      name: 'Detailed Project Report (DPR)',
      score: 100,
      maxScore: 100,
      weight: dprWeight,
      status: 'complete',
      explanation: `${dprs.length} DPR version(s) archived.`
    });
  } else if (latestAnalysis) {
    factors.push({
      name: 'Detailed Project Report (DPR)',
      score: 0,
      maxScore: 100,
      weight: dprWeight,
      status: 'pending',
      explanation: 'Analysis is complete but no DPR has been generated yet.'
    });
  } else {
    factors.push({
      name: 'Detailed Project Report (DPR)',
      score: 0,
      maxScore: 100,
      weight: dprWeight,
      status: 'blocked',
      explanation: 'DPR generation requires a completed financial analysis.'
    });
  }

  // ── Factor 5: Application/Funding Readiness (Weight: 15) ──
  const fundingWeight = 15;
  totalWeight += fundingWeight;
  const submittedApps = apps.filter(a => ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'COMPLETED'].includes(a.status));
  const draftApps = apps.filter(a => a.status === 'DRAFT');
  const actionApps = apps.filter(a => a.status === 'ACTION_REQUIRED');
  
  let fundingScore = 0;
  const fundingExplanations = [];
  
  if (apps.length === 0) {
    fundingExplanations.push('No funding or scheme applications have been initiated.');
  } else {
    if (submittedApps.length > 0) {
      fundingScore = Math.round((submittedApps.length / apps.length) * 100);
      fundingExplanations.push(`${submittedApps.length} of ${apps.length} application(s) are submitted or further along.`);
    }
    if (draftApps.length > 0) {
      fundingExplanations.push(`${draftApps.length} application(s) are still in draft.`);
    }
    if (actionApps.length > 0) {
      fundingScore = Math.max(0, fundingScore - 15);
      fundingExplanations.push(`${actionApps.length} application(s) require immediate action.`);
    }
  }
  
  weightedScore += fundingWeight * (fundingScore / 100);
  factors.push({
    name: 'Funding & Applications',
    score: fundingScore,
    maxScore: 100,
    weight: fundingWeight,
    status: fundingScore >= 80 ? 'complete' : fundingScore > 0 ? 'in_progress' : 'not_started',
    explanation: fundingExplanations.join(' '),
  });

  // ── Factor 6: Task Execution (Weight: 15) ──
  const taskWeight = 15;
  totalWeight += taskWeight;
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const activeTasks = tasks.filter(t => t.status !== 'completed');
  const blockedTasks = tasks.filter(t => t.status === 'blocked');
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false;
    return new Date(t.due_date).getTime() < Date.now();
  });
  
  let taskScore = 0;
  const taskExplanations = [];
  
  if (tasks.length === 0) {
    taskExplanations.push('No action tasks have been created yet.');
  } else {
    taskScore = Math.round((completedTasks.length / tasks.length) * 100);
    taskExplanations.push(`${completedTasks.length} of ${tasks.length} task(s) completed.`);
    if (blockedTasks.length > 0) {
      taskScore = Math.max(0, taskScore - 10);
      taskExplanations.push(`${blockedTasks.length} task(s) are currently blocked.`);
    }
    if (overdueTasks.length > 0) {
      taskScore = Math.max(0, taskScore - 10);
      taskExplanations.push(`${overdueTasks.length} task(s) are overdue.`);
    }
  }
  
  weightedScore += taskWeight * (taskScore / 100);
  factors.push({
    name: 'Task Execution',
    score: taskScore,
    maxScore: 100,
    weight: taskWeight,
    status: taskScore >= 80 ? 'complete' : taskScore > 0 ? 'in_progress' : 'not_started',
    explanation: taskExplanations.join(' '),
    details: {
      total: tasks.length,
      completed: completedTasks.length,
      active: activeTasks.length,
      blocked: blockedTasks.length,
      overdue: overdueTasks.length,
    }
  });

  // ── Overall Readiness ──
  const overallScore = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;

  // Determine primary limitation explanation
  const sortedFactors = [...factors].sort((a, b) => a.score - b.score);
  const weakestFactor = sortedFactors[0];
  let limitationExplanation = '';
  
  if (overallScore < 100 && weakestFactor) {
    limitationExplanation = `Your readiness is currently limited because: ${weakestFactor.explanation}`;
  } else if (overallScore >= 100) {
    limitationExplanation = 'All readiness factors are satisfied.';
  }

  // Determine status category
  const status = overallScore >= 75 ? 'READY' : overallScore >= 45 ? 'PROGRESSING' : overallScore >= 20 ? 'NEEDS_ATTENTION' : 'EARLY_STAGE';

  return {
    businessId,
    businessName: business.name,
    domain: business.domain,
    score: overallScore,
    overallReadiness: overallScore,
    status,
    limitationExplanation,
    factors,
    breakdown: factors.map(f => {
      let factorKey = f.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      if (factorKey.includes('funding')) factorKey = 'funding_readiness';
      if (factorKey.includes('document')) factorKey = 'document_readiness';
      if (factorKey.includes('input')) factorKey = 'input_readiness';
      if (factorKey.includes('feasibility') || factorKey.includes('analysis')) factorKey = 'financial_readiness';
      if (factorKey.includes('dpr')) factorKey = 'dpr_readiness';
      if (factorKey.includes('task')) factorKey = 'task_execution';
      return {
        factor: factorKey,
        name: f.name,
        score: f.score,
        maxWeight: f.weight,
        explanation: f.explanation
      };
    }),
    summary: {
      completionPercentage: overallScore,
      overdueTasks: tasks.filter(t => t.due_date && t.status !== 'completed' && new Date(t.due_date).getTime() < Date.now()).length,
      blockedTasks: tasks.filter(t => t.status === 'blocked').length,
      pendingDocuments: docs.filter(d => d.is_mandatory && (d.status === 'missing' || !d.status)).length,
      rejectedDocuments: rejectedDocs.length,
      pendingApplications: apps.filter(a => ['DRAFT', 'DOCUMENTS_PENDING', 'ACTION_REQUIRED'].includes(a.status)).length,
      dprReady: dprs.length > 0,
      analysisComplete: !!(latestAnalysis && (latestAnalysis.status === 'ANALYSIS_COMPLETE' || latestAnalysis.status === 'SUCCESS')),
    },
    calculatedAt: new Date().toISOString(),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 2. SMART NEXT ACTION ENGINE
// ────────────────────────────────────────────────────────────────────────────

/**
 * Returns the single most important next action for a business.
 * Deterministic prioritization based on DB state.
 * 
 * @param {string} businessId
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
async function getNextBestAction(businessId, userId) {
  const actions = await dbRepository.getSmartPendingActions(userId, businessId);
  if (!actions || actions.length === 0) {
    const business = await dbRepository.getBusiness(businessId, userId);
    const inputs = await dbRepository.getLatestInputs(businessId);
    if (!inputs || Object.keys(inputs).length === 0) {
      return {
        nextAction: 'Enter Business Inputs',
        reason: 'Provide initial enterprise parameters to begin calculation and feasibility appraisal.',
        category: 'inputs',
        priority: 'high',
        dependency: 'BUSINESS_INPUTS',
        estimatedEffort: null,
        actionLink: `/businesses/${businessId}?tab=inputs`,
        totalPendingActions: 1,
      };
    }
    const analyses = await dbRepository.listAnalyses(businessId);
    if (!analyses || analyses.length === 0) {
      return {
        nextAction: 'Run Financial Feasibility Analysis',
        reason: 'Generate your bankable financial projections, loan appraisal, and subsidy eligibility.',
        category: 'analysis',
        priority: 'high',
        dependency: 'ANALYSIS',
        estimatedEffort: null,
        actionLink: `/businesses/${businessId}?tab=analysis`,
        totalPendingActions: 1,
      };
    }
    return {
      nextAction: 'Review Operational Action Plan',
      reason: 'No critical blockers found. Proceed with standard execution milestones.',
      category: 'operations',
      priority: 'low',
      dependency: null,
      estimatedEffort: null,
      actionLink: `/businesses/${businessId}?tab=action-plan`,
      totalPendingActions: 0,
    };
  }

  // Actions are already sorted by priority from getSmartPendingActions
  const top = actions[0];
  return {
    nextAction: top.title,
    reason: top.reason,
    category: top.category,
    priority: top.priority,
    dependency: top.actionType || null,
    estimatedEffort: null, // Never fabricate effort estimates
    actionLink: top.actionLink || null,
    totalPendingActions: actions.length,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 3. CHANGE DETECTION
// ────────────────────────────────────────────────────────────────────────────

/**
 * Detects what changed since the last analysis or specified timestamp.
 * 
 * @param {string} businessId
 * @param {string} userId
 * @param {string} [since] - ISO date string; defaults to last analysis date
 * @returns {Promise<Object>} Change summary
 */
async function detectChanges(businessId, userId, since) {
  const business = await dbRepository.getBusiness(businessId, userId);
  if (!business) return null;

  const [analyses, inputs, docs, apps, tasks, dprs, timeline] = await Promise.all([
    dbRepository.listAnalyses(businessId),
    dbRepository.listBusinessInputs(businessId),
    dbRepository.listBusinessDocuments(businessId),
    dbRepository.listApplications(businessId),
    dbRepository.listActionTasks(businessId),
    dbRepository.listDprVersions(businessId),
    dbRepository.listTimelineEvents(businessId, 50),
  ]);

  const latestAnalysis = analyses && analyses.length > 0 ? analyses[0] : null;
  const sinceDate = since
    ? new Date(since)
    : (latestAnalysis?.created_at ? new Date(latestAnalysis.created_at) : new Date(0));

  const changes = [];

  // Input changes
  const inputsAfter = (inputs || []).filter(i => new Date(i.created_at) > sinceDate);
  if (inputsAfter.length > 0) {
    const latestVersion = Math.max(...inputsAfter.map(i => i.version_number || 1));
    changes.push({
      category: 'inputs',
      description: `Business inputs updated to version ${latestVersion}.`,
      count: inputsAfter.length,
      type: 'updated'
    });
  }

  // Document changes
  const docsAfter = (docs || []).filter(d => new Date(d.updated_at || d.created_at) > sinceDate);
  const verifiedDocs = docsAfter.filter(d => d.status === 'verified');
  const rejectedDocs = docsAfter.filter(d => d.status === 'rejected');
  const uploadedDocs = docsAfter.filter(d => d.status === 'uploaded' || d.status === 'provided');
  
  if (verifiedDocs.length > 0) {
    changes.push({
      category: 'documents',
      description: `${verifiedDocs.length} document(s) were verified.`,
      count: verifiedDocs.length,
      type: 'verified'
    });
  }
  if (rejectedDocs.length > 0) {
    changes.push({
      category: 'documents',
      description: `${rejectedDocs.length} document(s) were rejected.`,
      count: rejectedDocs.length,
      type: 'rejected'
    });
  }
  if (uploadedDocs.length > 0) {
    changes.push({
      category: 'documents',
      description: `${uploadedDocs.length} document(s) were uploaded.`,
      count: uploadedDocs.length,
      type: 'uploaded'
    });
  }

  // Application changes
  const appsAfter = (apps || []).filter(a => new Date(a.updated_at || a.created_at) > sinceDate);
  if (appsAfter.length > 0) {
    for (const a of appsAfter) {
      changes.push({
        category: 'applications',
        description: `Application "${a.application_type}" status: ${a.status}.`,
        count: 1,
        type: 'status_change'
      });
    }
  }

  // Task changes
  const completedAfter = (tasks || []).filter(t => t.status === 'completed' && t.completed_at && new Date(t.completed_at) > sinceDate);
  if (completedAfter.length > 0) {
    changes.push({
      category: 'tasks',
      description: `${completedAfter.length} task(s) were completed.`,
      count: completedAfter.length,
      type: 'completed'
    });
  }

  // DPR changes
  const dprsAfter = (dprs || []).filter(d => new Date(d.created_at) > sinceDate);
  if (dprsAfter.length > 0) {
    changes.push({
      category: 'dpr',
      description: `${dprsAfter.length} new DPR version(s) generated.`,
      count: dprsAfter.length,
      type: 'created'
    });
  }

  // New analyses
  const newAnalyses = (analyses || []).filter(a => new Date(a.created_at) > sinceDate && a !== latestAnalysis);
  if (newAnalyses.length > 0) {
    changes.push({
      category: 'analysis',
      description: `${newAnalyses.length} new analysis run(s) completed.`,
      count: newAnalyses.length,
      type: 'completed'
    });
  }

  return {
    businessId,
    businessName: business.name,
    since: sinceDate.toISOString(),
    totalChanges: changes.length,
    changes,
    hasChanges: changes.length > 0,
    noChanges: changes.length === 0,
    summary: changes.length > 0
      ? `${changes.length} change(s) detected since ${sinceDate.toISOString().split('T')[0]}.`
      : 'No changes detected since the specified date.',
    detectedAt: new Date().toISOString(),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 4. DATA TRUST & PROVENANCE
// ────────────────────────────────────────────────────────────────────────────

/** Valid source categories for provenance classification */
const SOURCE_CATEGORIES = {
  USER_INPUT: 'Based on your business inputs',
  MARKET_DATA: 'Based on verified market observations',
  GOVERNMENT_SCHEME: 'Based on available scheme information',
  CALCULATION_ENGINE: 'Based on deterministic financial calculations',
  AI_GUIDANCE: 'AI-assisted guidance — verify before financial or regulatory decisions',
  INSUFFICIENT_DATA: 'Not enough verified data available',
};

/**
 * Classifies the provenance/trust level of a data item.
 * 
 * @param {string} sourceType - One of: 'user_input', 'market_data', 'government_scheme', 'calculation', 'ai_estimate'
 * @param {Object} [data] - Optional data to check for completeness
 * @returns {{ label: string, trustLevel: string, disclaimer: string|null }}
 */
function classifyProvenance(sourceType, data = null) {
  // Check if data is insufficient or missing
  const isInsufficient =
    data === null ||
    data === undefined ||
    data === '' ||
    data === 0 ||
    (typeof data === 'object' && Object.keys(data).length === 0) ||
    (Array.isArray(data) && data.length === 0);

  if (isInsufficient) {
    return {
      category: 'insufficient_data',
      verified: false,
      label: 'Not enough verified data available.',
      trustLevel: 'insufficient',
      disclaimer: 'This information is incomplete. Please provide the required data.',
    };
  }

  switch (sourceType) {
    case 'user_input':
      return {
        category: 'user_input',
        verified: true,
        label: SOURCE_CATEGORIES.USER_INPUT,
        trustLevel: 'user_provided',
        disclaimer: null,
      };
    case 'market_data':
      return {
        category: 'market_data',
        verified: true,
        label: SOURCE_CATEGORIES.MARKET_DATA,
        trustLevel: 'verified_observation',
        disclaimer: 'Market prices fluctuate. Verify current rates at your local mandi.',
      };
    case 'government_scheme':
      return {
        category: 'government_scheme',
        verified: false,
        label: SOURCE_CATEGORIES.GOVERNMENT_SCHEME,
        trustLevel: 'reference_information',
        disclaimer: 'Scheme eligibility requires formal verification at your nearest bank branch or DIC office.',
      };
    case 'calculation':
      return {
        category: 'calculation',
        verified: true,
        label: SOURCE_CATEGORIES.CALCULATION_ENGINE,
        trustLevel: 'calculated',
        disclaimer: null,
      };
    case 'ai_estimate':
    case 'ai':
      return {
        category: 'ai_guidance',
        verified: false,
        label: SOURCE_CATEGORIES.AI_GUIDANCE,
        trustLevel: 'ai_assisted',
        disclaimer: 'AI-assisted guidance — verify before financial or regulatory decisions.',
      };
    default:
      return {
        category: sourceType || 'unclassified',
        verified: false,
        label: SOURCE_CATEGORIES.AI_GUIDANCE,
        trustLevel: 'unclassified',
        disclaimer: 'Source could not be determined. Please verify independently.',
      };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 5. PAGINATION HELPER
// ────────────────────────────────────────────────────────────────────────────

/**
 * Applies safe pagination to an array of items.
 * 
 * @param {Array} items - Full item array
 * @param {number} [page=1] - Page number (1-indexed)
 * @param {number} [limit=50] - Items per page (max 200)
 * @returns {{ data: Array, pagination: { page: number, limit: number, total: number, hasNext: boolean } }}
 */
function paginate(items, page = 1, limit = 50) {
  const arr = Array.isArray(items) ? items : [];
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
  const total = arr.length;
  const start = (safePage - 1) * safeLimit;
  const data = arr.slice(start, start + safeLimit);

  return {
    data,
    items: data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      hasNext: (start + safeLimit) < total,
    }
  };
}

module.exports = {
  calculateBusinessHealth,
  getNextBestAction,
  detectChanges,
  classifyProvenance,
  SOURCE_CATEGORIES,
  paginate,
};

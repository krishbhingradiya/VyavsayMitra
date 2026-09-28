/**
 * VYAVSAYMITRA — Deterministic Product Metrics Engine (Phase 11)
 *
 * Computes deterministic activation, execution, documentation, funding, DPR,
 * and AI Mitra metrics from actual database records.
 * NEVER synthesizes or fabricates metrics.
 */

const dbRepository = require('../models/dbRepository');

/**
 * Calculates platform-wide aggregate metrics for admin / operational visibility.
 */
async function calculatePlatformMetrics() {
  const summary = await dbRepository.getPlatformMetricsSummary();

  const users = summary.users || {};
  const businesses = summary.businesses || {};
  const analysis = summary.analysis || {};
  const executionData = summary.execution || {};
  const docData = summary.documentation || {};
  const appData = summary.applications || {};
  const dprData = summary.dpr || {};
  const recData = summary.recommendations || {};
  const feedData = summary.feedback || {};
  const outData = summary.outcomes || {};

  const totalUsers = users.total || 0;
  const usersWithBiz = users.ownersWithBusiness || 0;
  const totalBiz = businesses.total || 0;
  const analyzedBiz = analysis.completed || 0;

  // A. Activation
  const activation = {
    totalUsers,
    totalBusinesses: totalBiz,
    profileCompletionRate: users.profileCompletionRate ?? (totalUsers > 0 ? Math.round((usersWithBiz / totalUsers) * 100) : 0),
    firstBusinessCreationRate: users.businessCreationRate ?? (totalUsers > 0 ? Math.round((usersWithBiz / totalUsers) * 100) : 0),
    firstAnalysisCompletionRate: analysis.completionRate ?? (totalBiz > 0 ? Math.round((analyzedBiz / totalBiz) * 100) : 0)
  };

  // B. Execution
  const totalTasks = executionData.totalTasks || 0;
  const completedTasks = executionData.completedTasks || 0;
  const taskCompletionRate = executionData.taskCompletionRate ?? (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);
  const execution = {
    totalTasks,
    completedTasks,
    taskCompletionRate,
    overdueTaskCount: executionData.overdueTasks || 0,
    blockedTaskCount: executionData.blockedTasks || 0
  };

  // C. Documentation
  const totalDocs = docData.totalDocs || 0;
  const verifiedDocs = docData.verifiedDocs || 0;
  const providedDocs = docData.uploadedDocs || 0;
  const docReadinessRate = docData.readinessRate ?? (totalDocs > 0 ? Math.round((providedDocs / totalDocs) * 100) : 0);
  const docVerifiedRate = docData.verificationRate ?? (totalDocs > 0 ? Math.round((verifiedDocs / totalDocs) * 100) : 0);
  const documentation = {
    totalDocuments: totalDocs,
    providedDocuments: providedDocs,
    verifiedDocuments: verifiedDocs,
    documentReadinessPercentage: docReadinessRate,
    verifiedDocumentPercentage: docVerifiedRate,
    missingMandatoryDocumentCount: docData.missingMandatoryDocs || 0
  };

  // D. Funding Readiness & Applications
  const totalApps = appData.total || 0;
  const funding = {
    applicationsCreated: totalApps,
    applicationsDraft: (appData.byStatus && appData.byStatus['DRAFT']) || 0,
    applicationsSubmitted: appData.submitted || 0,
    applicationsApproved: appData.approved || 0,
    applicationsCompleted: appData.completed || 0,
    bankReadyBusinessesCount: dprData.businessesWithDpr || 0
  };

  // E. DPR
  const totalDprs = dprData.totalVersions || 0;
  const dpr = {
    totalSnapshots: totalDprs,
    businessesWithImmutableDPR: dprData.businessesWithDpr || 0,
    dprGenerationRate: dprData.generationRate ?? (totalBiz > 0 ? Math.round(((dprData.businessesWithDpr || 0) / totalBiz) * 100) : 0)
  };

  // F. AI Mitra & Recommendations
  const totalRecs = recData.totalGenerated || 0;
  const acceptedRecs = recData.accepted || 0;
  const convertedRecs = recData.convertedToTask || 0;
  const aiMitra = {
    aiMitraUsageCount: summary.productEvents?.totalTracked || 0,
    totalRecommendations: totalRecs,
    acceptedRecommendations: acceptedRecs,
    dismissedRecommendations: recData.dismissed || 0,
    convertedToTaskRecommendations: convertedRecs,
    recommendationAcceptanceRate: recData.acceptanceRate ?? (totalRecs > 0 ? Math.round((acceptedRecs / totalRecs) * 100) : 0),
    recommendationConversionRate: totalRecs > 0 ? Math.round((convertedRecs / totalRecs) * 100) : 0
  };

  // G. Feedback & Outcomes
  const feedback = {
    totalFeedbackCount: feedData.total || 0,
    averageRating: feedData.averageRating || 0
  };

  const outcomes = {
    totalRecordedOutcomes: outData.totalReported || 0
  };


  return {
    timestamp: new Date().toISOString(),
    activation,
    execution,
    documentation,
    funding,
    dpr,
    aiMitra,
    feedback,
    outcomes
  };
}

/**
 * Calculates business-specific product metrics deterministically for a single business.
 */
async function calculateBusinessMetrics(businessId) {
  if (!businessId) {
    throw new Error('Business ID is required to calculate business metrics.');
  }

  // 1. Fetch tasks
  const tasks = await dbRepository.listTasks(businessId).catch(() => []);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'completed').length;
  const overdueTasks = tasks.filter(t => {
    if (t.status === 'COMPLETED' || t.status === 'completed') return false;
    if (!t.due_date) return false;
    return new Date(t.due_date) < new Date();
  }).length;
  const blockedTasks = tasks.filter(t => t.status === 'BLOCKED' || t.status === 'blocked').length;

  // 2. Fetch documents
  const docs = await dbRepository.listDocuments(businessId).catch(() => []);
  const totalDocs = docs.length;
  const verifiedDocs = docs.filter(d => d.status === 'VERIFIED' || d.status === 'verified').length;
  const providedDocs = docs.filter(d => d.status === 'PROVIDED' || d.status === 'provided' || d.status === 'VERIFIED' || d.status === 'verified').length;
  const missingMandatory = docs.filter(d => d.is_mandatory && d.status === 'MISSING').length;

  // 3. Fetch applications
  const apps = await dbRepository.listApplications(businessId).catch(() => []);
  const totalApps = apps.length;
  const submittedApps = apps.filter(a => ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DISBURSED', 'COMPLETED'].includes(a.status?.toUpperCase())).length;
  const approvedApps = apps.filter(a => ['APPROVED', 'DISBURSED', 'COMPLETED'].includes(a.status?.toUpperCase())).length;
  const completedApps = apps.filter(a => ['DISBURSED', 'COMPLETED'].includes(a.status?.toUpperCase())).length;

  // 4. Fetch DPR versions
  const dprs = await dbRepository.listDprVersions(businessId).catch(() => []);

  // 5. Fetch recommendation actions
  const recActions = await dbRepository.listRecommendationActions({ businessId }).catch(() => []);
  const totalRecs = recActions.length;
  const acceptedRecs = recActions.filter(r => r.status === 'accepted' || r.status === 'converted_to_task' || r.status === 'completed').length;
  const convertedRecs = recActions.filter(r => r.status === 'converted_to_task' || r.status === 'completed').length;
  const completedRecTasks = recActions.filter(r => r.status === 'completed').length;

  // 6. Fetch recorded outcomes
  const outcomes = await dbRepository.listBusinessOutcomes(businessId).catch(() => []);

  // Compute rates deterministically
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const docReadinessRate = totalDocs > 0 ? Math.round((providedDocs / totalDocs) * 100) : 0;
  const docVerifiedRate = totalDocs > 0 ? Math.round((verifiedDocs / totalDocs) * 100) : 0;
  const recAcceptanceRate = totalRecs > 0 ? Math.round((acceptedRecs / totalRecs) * 100) : 0;
  const recConversionRate = totalRecs > 0 ? Math.round((convertedRecs / totalRecs) * 100) : 0;

  return {
    businessId,
    timestamp: new Date().toISOString(),
    execution: {
      totalTasks,
      completedTasks,
      taskCompletionRate,
      overdueTasks,
      blockedTasks
    },
    documentation: {
      totalDocuments: totalDocs,
      providedDocuments: providedDocs,
      verifiedDocuments: verifiedDocs,
      docReadinessRate,
      docVerifiedRate,
      missingMandatory
    },
    funding: {
      totalApplications: totalApps,
      submittedApplications: submittedApps,
      approvedApplications: approvedApps,
      completedApplications: completedApps
    },
    dpr: {
      versionCount: dprs.length,
      hasImmutableSnapshot: dprs.length > 0
    },
    recommendations: {
      totalTracked: totalRecs,
      accepted: acceptedRecs,
      convertedToTask: convertedRecs,
      completedTask: completedRecTasks,
      acceptanceRate: recAcceptanceRate,
      conversionRate: recConversionRate
    },
    outcomes: {
      totalRecorded: outcomes.length,
      types: Array.from(new Set(outcomes.map(o => o.outcome_type)))
    }
  };
}

module.exports = {
  calculatePlatformMetrics,
  calculateBusinessMetrics
};

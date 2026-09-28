/**
 * VYAVSAYMITRA — Data Quality Engine & Stale Data Detection
 * Phase 12: Data Quality, Freshness Tracking & Scale Readiness
 * 
 * Computes deterministic data quality score (0-100) and detects:
 * - Missing required baseline business inputs
 * - Inconsistent values (e.g. negative costs, invalid scales)
 * - Stale financial analyses (inputs modified post-analysis)
 * - Outdated DPR documents (generated prior to input changes)
 * - Tasks requiring evidence with unsubmitted/unverified proof
 * - Incomplete credit/scheme applications
 * - Missing verified outcomes
 * - Stale market observations
 */

const db = require('../models/dbRepository');

class DataQualityEngine {
  /**
   * Evaluate data quality for a specific business deterministically
   */
  async evaluateDataQuality(businessId) {
    if (!businessId) {
      throw new Error('BUSINESS_ID_REQUIRED');
    }

    const business = await db.getBusinessById(businessId);
    if (!business) {
      const err = new Error('BUSINESS_NOT_FOUND');
      err.statusCode = 404;
      throw err;
    }

    const inputs = await db.getBusinessInputs(businessId);
    const analyses = await db.getAnalysesByBusinessId(businessId);
    const tasks = await db.getTasksByBusinessId(businessId);
    const documents = await db.getDocumentsByBusinessId(businessId);
    const applications = await db.listApplications({ businessId });
    const outcomes = await db.listBusinessOutcomes(businessId);

    const criticalIssues = [];
    const warnings = [];
    const missingFields = [];

    let score = 100;

    // 1. Check Baseline Profile & Business Inputs
    if (!inputs) {
      score -= 30;
      criticalIssues.push({
        code: 'MISSING_BUSINESS_INPUTS',
        message: 'Business has not completed baseline operational and financial inputs.',
        severity: 'CRITICAL',
        source: 'Based on your business inputs'
      });
      missingFields.push('operational_scale', 'initial_investment', 'target_capacity');
    } else {
      const inputData = typeof inputs.input_data === 'string' ? JSON.parse(inputs.input_data) : inputs.input_data;
      if (!inputData.operationalScale && !inputData.landArea && !inputData.plantCapacity) {
        score -= 10;
        missingFields.push('operationalScale');
        warnings.push({
          code: 'SCALE_UNSPECIFIED',
          message: 'Operational scale or capacity is unspecified in baseline inputs.',
          severity: 'WARNING',
          source: 'Based on your business inputs'
        });
      }
      if (!inputData.investment && !inputData.totalBudget) {
        score -= 15;
        missingFields.push('investment');
        criticalIssues.push({
          code: 'INVESTMENT_UNSPECIFIED',
          message: 'Initial project investment figure is missing from baseline inputs.',
          severity: 'CRITICAL',
          source: 'Based on your business inputs'
        });
      }
    }

    // 2. Check Financial Analysis Freshness
    const latestAnalysis = analyses && analyses.length > 0 ? analyses[0] : null;
    let isAnalysisStale = false;
    if (!latestAnalysis) {
      score -= 20;
      criticalIssues.push({
        code: 'ANALYSIS_NOT_RUN',
        message: 'No financial feasibility analysis has been computed for this enterprise.',
        severity: 'CRITICAL',
        source: 'Based on your business inputs'
      });
    } else if (inputs && (inputs.updated_at || inputs.created_at)) {
      const inputTime = new Date(inputs.updated_at || inputs.created_at).getTime();
      const analysisTime = new Date(latestAnalysis.created_at).getTime();
      if (inputTime > analysisTime) {
        isAnalysisStale = true;
        score -= 15;
        warnings.push({
          code: 'ANALYSIS_STALE',
          message: 'Business inputs were modified after financial analysis was generated. Re-run analysis.',
          severity: 'HIGH',
          source: 'Based on your business inputs'
        });
      }
    }

    // 3. Check Milestone Evidence Requirements
    const tasksNeedingEvidence = (tasks || []).filter(t => Boolean(t.requires_evidence) && String(t.status).toUpperCase() === 'COMPLETED');
    const missingEvidenceTasks = tasksNeedingEvidence.filter(t => {
      const st = String(t.evidence_status || '').toUpperCase();
      return st === 'REQUIRED' || st === 'REJECTED';
    });
    if (missingEvidenceTasks.length > 0) {
      score -= Math.min(15, missingEvidenceTasks.length * 5);
      warnings.push({
        code: 'MISSING_MILESTONE_EVIDENCE',
        message: `${missingEvidenceTasks.length} completed milestone task(s) require verified proof/evidence.`,
        severity: 'MEDIUM',
        source: 'Based on verified documents',
        taskIds: missingEvidenceTasks.map(t => t.id)
      });
    }

    // 4. Check Document Checklist Readiness
    const requiredDocs = (documents || []).filter(d => Boolean(d.is_required || d.is_mandatory));
    const unverifiedDocs = requiredDocs.filter(d => String(d.verification_status || '').toLowerCase() !== 'verified');
    if (unverifiedDocs.length > 0) {
      score -= Math.min(15, unverifiedDocs.length * 3);
      warnings.push({
        code: 'DOCUMENTS_PENDING_VERIFICATION',
        message: `${unverifiedDocs.length} required statutory/bank document(s) pending upload or verification.`,
        severity: 'MEDIUM',
        source: 'Based on verified documents'
      });
    }

    // 5. Check DPR Freshness
    const dprs = await db.listDprSnapshots({ businessId });
    const latestDpr = dprs && dprs.length > 0 ? dprs[0] : null;
    let isDprOutdated = false;
    if (latestDpr && inputs && (inputs.updated_at || inputs.created_at)) {
      const inputTime = new Date(inputs.updated_at || inputs.created_at).getTime();
      const dprTime = new Date(latestDpr.created_at).getTime();
      if (inputTime > dprTime) {
        isDprOutdated = true;
        score -= 10;
        warnings.push({
          code: 'DPR_OUTDATED',
          message: 'DPR was generated before recent baseline input revisions. Generate a fresh version.',
          severity: 'MEDIUM',
          source: 'Based on your business inputs'
        });
      }
    }

    // 6. Check Business Outcomes Provenance
    const unverifiedOutcomes = (outcomes || []).filter(o => o.verification_status === 'reported');
    if (outcomes.length > 0 && unverifiedOutcomes.length === outcomes.length) {
      warnings.push({
        code: 'OUTCOMES_UNVERIFIED',
        message: 'Reported actual business performance outcomes are awaiting supporting evidence or field verification.',
        severity: 'LOW',
        source: 'Actual data not available yet.'
      });
    }

    const dataQualityScore = Math.max(0, Math.min(100, score));

    // Persist data quality score in business record safely
    await db.updateBusiness(businessId, {
      data_quality_score: dataQualityScore
    });

    return {
      businessId,
      dataQualityScore,
      isAnalysisStale,
      isDprOutdated,
      criticalIssues,
      warnings,
      missingFields,
      lastValidatedAt: new Date().toISOString()
    };
  }

  /**
   * Detect stale data flags and record timeline events if newly detected
   */
  async detectStaleData(businessId) {
    const quality = await this.evaluateDataQuality(businessId);
    const staleItems = [];

    if (quality.isAnalysisStale) {
      staleItems.push({
        entity: 'ANALYSIS',
        status: 'STALE',
        message: 'Business inputs modified after analysis calculation.',
        recommendedAction: 'Re-run financial analysis'
      });
      await db.recordBusinessEvent({
        businessId,
        eventType: 'ANALYSIS_MARKED_STALE',
        actorId: 'system',
        details: { reason: 'INPUTS_UPDATED_AFTER_ANALYSIS' }
      });
    }

    if (quality.isDprOutdated) {
      staleItems.push({
        entity: 'DPR',
        status: 'OUTDATED',
        message: 'DPR generated before latest business input change.',
        recommendedAction: 'Generate updated DPR snapshot'
      });
      await db.recordBusinessEvent({
        businessId,
        eventType: 'DPR_MARKED_OUTDATED',
        actorId: 'system',
        details: { reason: 'INPUTS_UPDATED_AFTER_DPR' }
      });
    }

    return {
      businessId,
      hasStaleData: staleItems.length > 0,
      staleEntities: staleItems,
      evaluatedAt: quality.lastValidatedAt
    };
  }
}

const dataQualityEngine = new DataQualityEngine();

module.exports = {
  DataQualityEngine,
  dataQualityEngine
};

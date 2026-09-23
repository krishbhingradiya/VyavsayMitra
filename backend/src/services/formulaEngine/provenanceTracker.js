/**
 * VYAVSAYMITRA — Formula Provenance & Source Traceability Service
 * 
 * Enforces strict attribution and institutional provenance rules:
 * - Every formula MUST have an explicit source authority
 * - If source is missing or weak, sourceStatus is explicitly marked 'UNVERIFIED'
 * - Preserves source URL, observation date, methodology, and audit trail
 * - Guarantees zero unverified data leakage
 */

const { SOURCE_PRIORITIES } = require('../data/provenanceService');

/**
 * Builds a strict provenance record for a formula definition or calculation result
 * 
 * @param {Object} formulaDef - Formula definition object
 * @param {Object} [executionMeta] - Runtime calculation metadata
 * @returns {Object} Provenance metadata block
 */
function buildFormulaProvenance(formulaDef, executionMeta = {}) {
  const isSourced = formulaDef.source &&
    typeof formulaDef.source === 'string' &&
    formulaDef.source.trim() !== '' &&
    formulaDef.source !== 'UNVERIFIED' &&
    formulaDef.source !== 'UNKNOWN';

  const sourceStatus = isSourced ? 'VERIFIED' : 'UNVERIFIED';

  return {
    sourceType: 'FORMULA',
    priorityRank: SOURCE_PRIORITIES.FORMULA || 2,
    source: isSourced ? formulaDef.source : 'UNVERIFIED',
    sourceStatus,
    sourceURL: formulaDef.sourceURL || null,
    sourceDate: formulaDef.sourceDate || null,
    datasetVersion: formulaDef.provenance?.datasetVersion || 'v1.0.0',
    methodology: formulaDef.methodology || 'UNVERIFIED_METHODOLOGY',
    researchNotes: formulaDef.provenance?.researchNotes || '',
    formulaId: formulaDef.formulaId,
    formulaVersion: formulaDef.version || '1.0.0',
    validationStatus: formulaDef.status || 'RESEARCH_REQUIRED',
    executionTimestamp: new Date().toISOString(),
    isProductionApproved: formulaDef.status === 'VALIDATED',
    warning: sourceStatus === 'UNVERIFIED'
      ? `Formula '${formulaDef.formulaId}' lacks a verified institutional or statutory source. Marked UNVERIFIED.`
      : null,
    ...executionMeta
  };
}

/**
 * Validates whether a formula satisfies minimum provenance standards for execution
 * 
 * @param {Object} formulaDef
 * @returns {{ satisfiesRequirements: boolean, issues: string[] }}
 */
function auditFormulaProvenance(formulaDef) {
  const issues = [];

  if (!formulaDef.source || formulaDef.source === 'UNVERIFIED' || formulaDef.source === 'UNKNOWN') {
    issues.push('Missing authoritative source attribution (source is UNVERIFIED)');
  }

  if (!formulaDef.methodology || formulaDef.methodology.trim() === '') {
    issues.push('Missing documented mathematical methodology');
  }

  if (!formulaDef.sourceDate) {
    issues.push('Missing source observation or publication date');
  }

  return {
    satisfiesRequirements: issues.length === 0,
    sourceStatus: issues.length === 0 ? 'VERIFIED' : 'UNVERIFIED',
    issues
  };
}

module.exports = {
  buildFormulaProvenance,
  auditFormulaProvenance
};

/**
 * VYAVSAYMITRA — Formula Schema & Lifecycle Management
 * 
 * Defines the structured Formula Definition schema, lifecycle statuses,
 * provenance constraints, and validated transitions.
 * 
 * Formula Lifecycle:
 *   RESEARCH_REQUIRED -> SOURCE_IDENTIFIED -> VALIDATING -> VALIDATED -> DEPRECATED / DISABLED
 * 
 * Strict Rule: Only formulas in VALIDATED status can be treated as authoritative business calculations.
 * AI-generated or newly discovered formulas CANNOT jump directly to VALIDATED.
 */

const FORMULA_STATUSES = {
  RESEARCH_REQUIRED: 'RESEARCH_REQUIRED',
  SOURCE_IDENTIFIED: 'SOURCE_IDENTIFIED',
  VALIDATING: 'VALIDATING',
  VALIDATED: 'VALIDATED',
  DEPRECATED: 'DEPRECATED',
  DISABLED: 'DISABLED'
};

const FORMULA_CATEGORIES = [
  'FINANCE',
  'AGRICULTURE',
  'FOODTECH',
  'DAIRY',
  'POULTRY',
  'GENERAL_MSME'
];

/**
 * Valid transitions between lifecycle states
 */
const ALLOWED_TRANSITIONS = {
  RESEARCH_REQUIRED: ['SOURCE_IDENTIFIED', 'DISABLED'],
  SOURCE_IDENTIFIED: ['VALIDATING', 'RESEARCH_REQUIRED', 'DISABLED'],
  VALIDATING: ['VALIDATED', 'RESEARCH_REQUIRED', 'DISABLED'],
  VALIDATED: ['DEPRECATED', 'DISABLED'],
  DEPRECATED: ['DISABLED', 'VALIDATED'],
  DISABLED: ['RESEARCH_REQUIRED', 'SOURCE_IDENTIFIED']
};

/**
 * Validates the schema of a formula definition
 * 
 * @param {Object} def - Formula specification
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateFormulaDefinition(def) {
  const errors = [];
  if (!def || typeof def !== 'object') {
    return { valid: false, errors: ['Formula definition must be an object'] };
  }

  if (!def.formulaId || typeof def.formulaId !== 'string' || !def.formulaId.trim()) {
    errors.push('formulaId is required and must be a non-empty string');
  }

  if (!def.formulaName || typeof def.formulaName !== 'string' || !def.formulaName.trim()) {
    errors.push('formulaName is required and must be a string');
  }

  if (!def.category || !FORMULA_CATEGORIES.includes(def.category.toUpperCase())) {
    errors.push(`category must be one of: ${FORMULA_CATEGORIES.join(', ')}`);
  }

  if (!def.expression || typeof def.expression !== 'string' || !def.expression.trim()) {
    errors.push('expression is required and must be a non-empty string');
  }

  if (!Array.isArray(def.inputs) || def.inputs.length === 0) {
    errors.push('inputs must be a non-empty array of parameter IDs or definitions');
  }

  if (!Array.isArray(def.outputs) || def.outputs.length === 0) {
    errors.push('outputs must be a non-empty array of output field names');
  }

  if (!def.status || !FORMULA_STATUSES[def.status]) {
    errors.push(`status must be one of: ${Object.keys(FORMULA_STATUSES).join(', ')}`);
  }

  if (!def.version || typeof def.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(def.version.trim())) {
    errors.push('version is required and must adhere to semantic versioning (e.g. 1.0.0)');
  }

  // Provenance / Source validation
  const hasSource = def.source && typeof def.source === 'string' && def.source.trim() && def.source !== 'UNVERIFIED';
  if (def.status === FORMULA_STATUSES.VALIDATED && !hasSource) {
    errors.push('A formula CANNOT be marked VALIDATED without an identified, verifiable source authority');
  }

  if (def.status === FORMULA_STATUSES.VALIDATED && (!def.methodology || typeof def.methodology !== 'string' || !def.methodology.trim())) {
    errors.push('A formula CANNOT be marked VALIDATED without documented methodology');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Creates a validated Formula Definition structure
 */
function createFormulaDefinition(spec) {
  const validation = validateFormulaDefinition(spec);
  if (!validation.valid) {
    throw new Error(`Formula Definition Error: ${validation.errors.join('; ')}`);
  }

  const hasSource = spec.source && typeof spec.source === 'string' && spec.source.trim() && spec.source !== 'UNVERIFIED';
  const sourceStatus = hasSource ? 'VERIFIED' : 'UNVERIFIED';

  return {
    formulaId: spec.formulaId.trim(),
    formulaName: spec.formulaName.trim(),
    description: spec.description || '',
    category: spec.category.toUpperCase().trim(),
    expression: spec.expression.trim(),
    inputs: spec.inputs.map(input => (typeof input === 'string' ? input.trim() : input)),
    outputs: spec.outputs.map(out => (typeof out === 'string' ? out.trim() : out)),
    units: spec.units || {},
    assumptions: Array.isArray(spec.assumptions) ? spec.assumptions : [],
    source: spec.source || 'UNVERIFIED',
    sourceURL: spec.sourceURL || null,
    sourceDate: spec.sourceDate || null,
    sourceStatus,
    methodology: spec.methodology || 'Documented mathematical methodology pending validation',
    status: spec.status || FORMULA_STATUSES.RESEARCH_REQUIRED,
    version: spec.version.trim(),
    validationRules: Array.isArray(spec.validationRules) ? spec.validationRules : [],
    provenance: {
      datasetVersion: spec.datasetVersion || 'v1.0.0',
      researchNotes: spec.researchNotes || '',
      validationStatus: spec.status,
      sourceStatus,
      createdAt: spec.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
}

/**
 * Performs a validated lifecycle transition
 * 
 * @param {Object} formula - Existing formula definition
 * @param {string} newStatus - Target status
 * @param {string} [rationale] - Reason for transition
 * @returns {Object} Updated formula definition
 */
function transitionFormulaStatus(formula, newStatus, rationale = '') {
  if (!FORMULA_STATUSES[newStatus]) {
    throw new Error(`Invalid target status '${newStatus}'. Allowed: ${Object.keys(FORMULA_STATUSES).join(', ')}`);
  }

  const currentStatus = formula.status;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(newStatus)) {
    throw new Error(`Illegal lifecycle transition from '${currentStatus}' to '${newStatus}'. Allowed: ${allowed.join(', ') || 'none'}`);
  }

  // Guard against marking VALIDATED without verified source
  if (newStatus === FORMULA_STATUSES.VALIDATED) {
    if (!formula.source || formula.source === 'UNVERIFIED' || !formula.methodology) {
      throw new Error(`Cannot transition formula '${formula.formulaId}' to VALIDATED without verified source and documented methodology`);
    }
  }

  return {
    ...formula,
    status: newStatus,
    provenance: {
      ...formula.provenance,
      validationStatus: newStatus,
      updatedAt: new Date().toISOString(),
      transitionAudit: [
        ...(formula.provenance?.transitionAudit || []),
        {
          from: currentStatus,
          to: newStatus,
          timestamp: new Date().toISOString(),
          rationale: rationale || 'Status transition executed'
        }
      ]
    }
  };
}

module.exports = {
  FORMULA_STATUSES,
  FORMULA_CATEGORIES,
  ALLOWED_TRANSITIONS,
  validateFormulaDefinition,
  createFormulaDefinition,
  transitionFormulaStatus
};

/**
 * VYAVSAYMITRA — Central Formula & Parameter Registry
 * 
 * Manages registered formulas, parameter schemas, semantic versioning,
 * lifecycle state changes, and safe sandboxed execution.
 * 
 * Strict Enforcement:
 * - Only formulas in VALIDATED status can be executed in production business calculations.
 * - Prevents execution of UNKNOWN or uncalibrated parameters.
 * - Enforces immutable provenance and audit trails.
 */

const { validateFormulaDefinition, createFormulaDefinition, transitionFormulaStatus, FORMULA_STATUSES } = require('./formulaSchema');
const { validateParameterDefinition, createParameterDefinition, validateParameterValue, DATA_STATUSES } = require('./parameterSchema');
const { safeEvaluateExpression } = require('./expressionParser');
const { DependencyResolver } = require('./dependencyResolver');
const { buildFormulaProvenance } = require('./provenanceTracker');

class FormulaRegistry {
  constructor() {
    this.formulas = new Map(); // key: `${formulaId}@${version}` -> formulaDef
    this.latestVersions = new Map(); // key: formulaId -> latestVersion string
    this.parameters = new Map(); // key: parameterId -> paramDef
    this.dependencyResolver = new DependencyResolver();
  }

  /**
   * Registers a parameter definition
   */
  registerParameter(paramSpec) {
    const paramDef = createParameterDefinition(paramSpec);
    this.parameters.set(paramDef.parameterId, paramDef);
    return paramDef;
  }

  /**
   * Gets a registered parameter definition
   */
  getParameter(parameterId) {
    return this.parameters.get(parameterId) || null;
  }

  /**
   * Checks whether a parameter is registered
   */
  hasParameter(parameterId) {
    return this.parameters.has(parameterId);
  }

  /**
   * Checks whether a formula is registered
   */
  hasFormula(formulaId, version = 'latest') {
    return this.getFormula(formulaId, version) !== null;
  }

  /**
   * Registers a formula definition with schema validation
   */
  registerFormula(formulaSpec) {
    const formulaDef = createFormulaDefinition(formulaSpec);
    const key = `${formulaDef.formulaId}@${formulaDef.version}`;

    // Verify all input parameters exist or register them as implicit params if provided as specs
    if (Array.isArray(formulaDef.inputs)) {
      for (const input of formulaDef.inputs) {
        const paramId = typeof input === 'string' ? input : input.parameterId;
        if (typeof input === 'object' && input.parameterId && !this.parameters.has(input.parameterId)) {
          this.registerParameter(input);
        }
      }
    }

    this.formulas.set(key, formulaDef);

    // Update latest version pointer
    const currentLatest = this.latestVersions.get(formulaDef.formulaId);
    if (!currentLatest || this._compareVersions(formulaDef.version, currentLatest) > 0) {
      this.latestVersions.set(formulaDef.formulaId, formulaDef.version);
    }

    // Add to dependency resolver
    this.dependencyResolver.addFormula(formulaDef);

    return formulaDef;
  }

  /**
   * SemVer comparator (v1 > v2 returns 1; v1 < v2 returns -1; equal returns 0)
   */
  _compareVersions(v1, v2) {
    const p1 = v1.split('.').map(Number);
    const p2 = v2.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if (p1[i] > p2[i]) return 1;
      if (p1[i] < p2[i]) return -1;
    }
    return 0;
  }

  /**
   * Retrieves a formula by ID and optional version ('latest' by default)
   */
  getFormula(formulaId, version = 'latest') {
    let targetVersion = version;
    if (version === 'latest') {
      targetVersion = this.latestVersions.get(formulaId);
      if (!targetVersion) return null;
    }

    const key = `${formulaId}@${targetVersion}`;
    return this.formulas.get(key) || null;
  }

  /**
   * Lists all registered formulas, optionally filtered by category or status
   */
  listFormulas(filter = {}) {
    const results = [];
    for (const [id, latestVer] of this.latestVersions.entries()) {
      const formula = this.getFormula(id, latestVer);
      if (!formula) continue;

      if (filter.category && formula.category !== filter.category.toUpperCase()) {
        continue;
      }
      if (filter.status && formula.status !== filter.status) {
        continue;
      }
      results.push(formula);
    }
    return results;
  }

  /**
   * Transitions lifecycle state of a formula
   */
  transitionStatus(formulaId, newStatus, rationale = '', version = 'latest') {
    const formula = this.getFormula(formulaId, version);
    if (!formula) {
      throw new Error(`Formula '${formulaId}' not found`);
    }

    const updated = transitionFormulaStatus(formula, newStatus, rationale);
    const key = `${updated.formulaId}@${updated.version}`;
    this.formulas.set(key, updated);
    return updated;
  }

  /**
   * Safely executes a formula against input parameter values
   * 
   * @param {string} formulaId - ID of formula to execute
   * @param {Object} inputValues - Key-value map of parameter values
   * @param {Object} [options] - Execution options
   * @param {string} [options.version='latest'] - Version to execute
   * @param {boolean} [options.allowUnvalidated=false] - Whether non-VALIDATED formulas may execute
   * @returns {Object} Structured calculation output with full provenance
   */
  executeFormula(formulaId, inputValues = {}, options = {}) {
    const version = options.version || 'latest';
    const allowUnvalidated = !!options.allowUnvalidated;

    const formula = this.getFormula(formulaId, version);
    if (!formula) {
      throw new Error(`Formula '${formulaId}' (version: ${version}) not found in registry`);
    }

    // STRICT RULE: Only VALIDATED formulas are authorized for business calculations unless explicitly overridden for validation testing
    if (formula.status !== FORMULA_STATUSES.VALIDATED && !allowUnvalidated) {
      throw new Error(
        `Formula '${formulaId}' cannot be executed as an authoritative business formula because its status is '${formula.status}'. Only '${FORMULA_STATUSES.VALIDATED}' formulas are authorized.`
      );
    }

    if (formula.status === FORMULA_STATUSES.DISABLED) {
      throw new Error(`Formula '${formulaId}' is DISABLED and cannot be executed`);
    }

    // Validate inputs
    const validatedContext = {};
    const inputStatusAudit = {};

    const requiredInputNames = formula.inputs.map(inp => (typeof inp === 'string' ? inp : inp.parameterId));

    for (const paramId of requiredInputNames) {
      const rawVal = inputValues[paramId];
      const paramDef = this.getParameter(paramId);

      if (rawVal === undefined || rawVal === null) {
        throw new Error(`Missing required parameter '${paramId}' for formula '${formulaId}'`);
      }

      if (paramDef) {
        // Enforce parameter schema rules (including UNKNOWN rejection & bounds)
        const check = validateParameterValue(paramDef, rawVal, inputValues[`${paramId}_status`]);
        if (!check.valid) {
          throw new Error(`Parameter validation failed for '${paramId}': ${check.errors.join('; ')}`);
        }
        validatedContext[paramId] = check.value;
        inputStatusAudit[paramId] = check.dataStatus;
      } else {
        // Fallback numeric conversion for un-registered parameter IDs
        const num = Number(rawVal);
        if (isNaN(num)) {
          throw new Error(`Parameter '${paramId}' must be a valid number, received: ${rawVal}`);
        }
        validatedContext[paramId] = num;
        inputStatusAudit[paramId] = DATA_STATUSES.USER_INPUT;
      }
    }

    // Evaluate AST expression safely
    const evalResult = safeEvaluateExpression(formula.expression, validatedContext);
    const primaryOutputName = formula.outputs[0] || 'result';

    // Build comprehensive formula provenance block
    const provenance = buildFormulaProvenance(formula, {
      inputParameterStatuses: inputStatusAudit,
      variablesUsed: evalResult.variables
    });

    return {
      formulaId: formula.formulaId,
      formulaName: formula.formulaName,
      category: formula.category,
      version: formula.version,
      status: formula.status,
      expression: formula.expression,
      outputs: {
        [primaryOutputName]: evalResult.result
      },
      result: evalResult.result,
      provenance
    };
  }
}

module.exports = {
  FormulaRegistry
};

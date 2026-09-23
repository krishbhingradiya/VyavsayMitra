/**
 * VYAVSAYMITRA — Parameter Schema & Data Integrity Validator
 * 
 * Defines standard schemas for business parameters and enforces strict data typing,
 * physical unit validation, and provenance categorization.
 * 
 * Supported Data Statuses:
 * - VERIFIED_DATA: Sourced directly from audited statutory/institutional datasets
 * - USER_INPUT: Entered directly by the entrepreneur/user
 * - CALCULATED: Derived via validated mathematical formulas
 * - ESTIMATE: Statistical or bounded estimate
 * - UNKNOWN: Missing or uncalibrated parameter (NEVER silently converted into a number)
 */

const DATA_STATUSES = {
  VERIFIED_DATA: 'VERIFIED_DATA',
  USER_INPUT: 'USER_INPUT',
  CALCULATED: 'CALCULATED',
  ESTIMATE: 'ESTIMATE',
  UNKNOWN: 'UNKNOWN'
};

const DATA_TYPES = ['number', 'string', 'boolean', 'array'];

/**
 * Validates the schema definition of a Parameter descriptor
 * 
 * @param {Object} def - Parameter descriptor definition
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateParameterDefinition(def) {
  const errors = [];
  if (!def || typeof def !== 'object') {
    return { valid: false, errors: ['Parameter definition must be an object'] };
  }

  if (!def.parameterId || typeof def.parameterId !== 'string' || !def.parameterId.trim()) {
    errors.push('parameterId is required and must be a non-empty string');
  }

  if (!def.name || typeof def.name !== 'string') {
    errors.push('name is required and must be a string');
  }

  if (!def.dataType || !DATA_TYPES.includes(def.dataType)) {
    errors.push(`dataType must be one of: ${DATA_TYPES.join(', ')}`);
  }

  if (!def.unit || typeof def.unit !== 'string') {
    errors.push('unit is required and must be a string');
  }

  if (def.dataStatus && !DATA_STATUSES[def.dataStatus]) {
    errors.push(`dataStatus must be one of: ${Object.keys(DATA_STATUSES).join(', ')}`);
  }

  if (def.minimum !== undefined && def.maximum !== undefined && def.minimum > def.maximum) {
    errors.push(`minimum (${def.minimum}) cannot be greater than maximum (${def.maximum})`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Creates a validated parameter specification object
 */
function createParameterDefinition(spec) {
  const validation = validateParameterDefinition(spec);
  if (!validation.valid) {
    throw new Error(`Invalid parameter definition: ${validation.errors.join('; ')}`);
  }

  return {
    parameterId: spec.parameterId.trim(),
    name: spec.name.trim(),
    description: spec.description || '',
    dataType: spec.dataType,
    unit: spec.unit.trim(),
    currency: spec.currency || (spec.unit.includes('INR') ? 'INR' : null),
    required: spec.required !== false,
    minimum: spec.minimum !== undefined ? Number(spec.minimum) : null,
    maximum: spec.maximum !== undefined ? Number(spec.maximum) : null,
    allowedValues: Array.isArray(spec.allowedValues) ? spec.allowedValues : null,
    source: spec.source || 'UNVERIFIED',
    sourceDate: spec.sourceDate || null,
    dataStatus: spec.dataStatus || DATA_STATUSES.UNKNOWN,
    userInputAllowed: spec.userInputAllowed !== false,
    validationRules: Array.isArray(spec.validationRules) ? spec.validationRules : []
  };
}

/**
 * Validates a runtime parameter value against its schema definition
 * 
 * @param {Object} paramDef - Parameter definition
 * @param {any} value - Value to validate
 * @param {string} [dataStatus] - Status of this specific value instance
 * @returns {{ valid: boolean, value: any, dataStatus: string, errors: string[] }}
 */
function validateParameterValue(paramDef, value, dataStatus = null) {
  const errors = [];
  
  // Resolve instance data status:
  // 1. Explicit dataStatus passed for this instance
  // 2. If value is provided and parameter allows user input, status is USER_INPUT (or paramDef.dataStatus if already VERIFIED/CALCULATED)
  // 3. Otherwise defaults to paramDef.dataStatus or UNKNOWN
  let status = dataStatus;
  if (!status) {
    if (value !== undefined && value !== null) {
      if (paramDef.dataStatus && paramDef.dataStatus !== DATA_STATUSES.UNKNOWN) {
        status = paramDef.dataStatus;
      } else if (paramDef.userInputAllowed !== false) {
        status = DATA_STATUSES.USER_INPUT;
      } else {
        status = DATA_STATUSES.UNKNOWN;
      }
    } else {
      status = paramDef.dataStatus || DATA_STATUSES.UNKNOWN;
    }
  }

  // STRICT RULE: UNKNOWN status must never be silently converted into a real number or accepted as valid resolved data
  if (status === DATA_STATUSES.UNKNOWN || value === undefined || value === null) {
    if (paramDef.required || status === DATA_STATUSES.UNKNOWN) {
      errors.push(`Parameter '${paramDef.parameterId}' is marked UNKNOWN or missing; cannot convert to real value`);
    }
    return {
      valid: false,
      value: null,
      dataStatus: DATA_STATUSES.UNKNOWN,
      errors
    };
  }

  // Type check
  if (paramDef.dataType === 'number') {
    const num = Number(value);
    if (isNaN(num) || typeof value === 'boolean' || (typeof value === 'string' && value.trim() === '')) {
      errors.push(`Parameter '${paramDef.parameterId}' requires a valid numeric value, received '${value}'`);
    } else {
      if (paramDef.minimum !== null && num < paramDef.minimum) {
        errors.push(`Parameter '${paramDef.parameterId}' value (${num}) is less than minimum allowed (${paramDef.minimum})`);
      }
      if (paramDef.maximum !== null && num > paramDef.maximum) {
        errors.push(`Parameter '${paramDef.parameterId}' value (${num}) exceeds maximum allowed (${paramDef.maximum})`);
      }
      if (paramDef.allowedValues && !paramDef.allowedValues.includes(num)) {
        errors.push(`Parameter '${paramDef.parameterId}' value (${num}) is not in allowed values: [${paramDef.allowedValues.join(', ')}]`);
      }
      return {
        valid: errors.length === 0,
        value: num,
        dataStatus: status,
        errors
      };
    }
  } else if (paramDef.dataType === 'string') {
    if (typeof value !== 'string') {
      errors.push(`Parameter '${paramDef.parameterId}' requires string value`);
    } else if (paramDef.allowedValues && !paramDef.allowedValues.includes(value)) {
      errors.push(`Parameter '${paramDef.parameterId}' value '${value}' is not in allowed values`);
    }
    return {
      valid: errors.length === 0,
      value: String(value),
      dataStatus: status,
      errors
    };
  } else if (paramDef.dataType === 'boolean') {
    if (typeof value !== 'boolean') {
      errors.push(`Parameter '${paramDef.parameterId}' requires boolean value`);
    }
    return {
      valid: errors.length === 0,
      value: Boolean(value),
      dataStatus: status,
      errors
    };
  }

  return {
    valid: errors.length === 0,
    value,
    dataStatus: status,
    errors
  };
}

module.exports = {
  DATA_STATUSES,
  DATA_TYPES,
  validateParameterDefinition,
  createParameterDefinition,
  validateParameterValue
};

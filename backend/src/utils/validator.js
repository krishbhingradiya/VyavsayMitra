/**
 * VYAVSAYMITRA — Production Request Validation Utilities
 * 
 * Strict, human-friendly input validation for all business creation, input updates,
 * AI prompts, reports, and profile updates.
 * Guards against negative values, NaN, Infinity, oversized strings, and malformed structures.
 */

const VALID_DOMAINS = ['agriculture', 'foodtech'];

const VALID_LIFECYCLE_STATES = [
  'DRAFT',
  'INPUTS_INCOMPLETE',
  'READY_FOR_ANALYSIS',
  'ANALYZING',
  'ANALYSIS_COMPLETE',
  'ANALYSIS_NEEDS_INPUT',
  'ERROR'
];

/**
 * Checks if a value is a valid non-negative finite number.
 */
function isValidNonNegativeNumber(val) {
  if (val === undefined || val === null || val === '') return true;
  const num = Number(val);
  return !isNaN(num) && isFinite(num) && num >= 0;
}

/**
 * Checks if a value is a positive finite number (> 0).
 */
function isPositiveNumber(val) {
  if (val === undefined || val === null || val === '') return false;
  const num = Number(val);
  return !isNaN(num) && isFinite(num) && num > 0;
}

/**
 * Validates business creation payload.
 */
function validateBusinessCreate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { isValid: false, message: 'Invalid request body format.' };
  }

  const { name, domain, inputs, location } = body;
  const businessType = body.business_type || body.businessType;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return { isValid: false, message: 'Business name is required.' };
  }
  if (name.trim().length > 150) {
    return { isValid: false, message: 'Business name cannot exceed 150 characters.' };
  }

  const normalizedDomain = domain ? String(domain).toLowerCase().trim() : '';
  if (!normalizedDomain || !VALID_DOMAINS.includes(normalizedDomain)) {
    return { isValid: false, message: 'Business domain must be either "agriculture" or "foodtech".' };
  }

  if (!businessType || typeof businessType !== 'string' || !businessType.trim()) {
    return { isValid: false, message: 'Business type is required.' };
  }
  if (businessType.trim().length > 100) {
    return { isValid: false, message: 'Business type cannot exceed 100 characters.' };
  }

  // Validate location if provided
  if (location !== undefined) {
    if (typeof location !== 'object' || Array.isArray(location)) {
      return { isValid: false, message: 'Location must be a valid object.' };
    }
  }

  // Validate inputs if provided
  if (inputs !== undefined) {
    const inputVal = validateInputsByDomain(normalizedDomain, inputs);
    if (!inputVal.isValid) return inputVal;
  }

  return { isValid: true };
}

/**
 * Validates domain-specific inputs.
 */
function validateInputsByDomain(domain, inputs) {
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) {
    return { isValid: false, message: 'Inputs must be a valid key-value object.' };
  }

  // Universal checks: reject NaN, Infinity, negative values on numeric keys
  const numericKeys = [
    'area', 'areaAcres', 'areaHa', 'capitalAvailable', 'customPricePerQtl',
    'raw_material_quantity', 'rawMaterialQuantity', 'selling_price', 'sellingPrice',
    'initial_investment', 'initialInvestment', 'power_kw', 'powerKw',
    'working_days_per_month', 'workingDaysPerMonth', 'daily_operating_hours', 'dailyOperatingHours'
  ];

  for (const key of numericKeys) {
    if (inputs[key] !== undefined && inputs[key] !== null && inputs[key] !== '') {
      const val = Number(inputs[key]);
      if (isNaN(val) || !isFinite(val)) {
        return { isValid: false, message: `Field "${key}" must be a valid numeric number.` };
      }
      if (val < 0) {
        return { isValid: false, message: `Field "${key}" cannot be negative.` };
      }
    }
  }

  // Check excessively large string fields
  for (const [k, v] of Object.entries(inputs)) {
    if (typeof v === 'string' && v.length > 1000) {
      return { isValid: false, message: `Input field "${k}" exceeds the maximum allowed length of 1000 characters.` };
    }
  }

  return { isValid: true };
}

/**
 * Validates AI Mitra Chat input.
 */
function validateAiPrompt(body) {
  if (!body || typeof body !== 'object') {
    return { isValid: false, message: 'Invalid request body format.' };
  }

  const message = body.message || body.prompt;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return { isValid: false, message: 'Message is required.' };
  }

  const trimmed = message.trim();
  if (trimmed.length > 2000) {
    return { isValid: false, message: 'Message is too long. Please limit your question to 2,000 characters.' };
  }

  return { isValid: true, message: trimmed };
}

/**
 * Validates Profile updates.
 */
function validateProfileUpdate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { isValid: false, message: 'Invalid profile data format.' };
  }

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length > 100) {
      return { isValid: false, message: 'Name must be a valid text string (max 100 characters).' };
    }
  }

  if (body.phone !== undefined && body.phone !== null && body.phone !== '') {
    const cleanPhone = String(body.phone).replace(/[\s+-]/g, '');
    if (!/^\d{10,15}$/.test(cleanPhone)) {
      return { isValid: false, message: 'Please enter a valid 10-digit mobile number.' };
    }
  }

  return { isValid: true };
}

module.exports = {
  VALID_DOMAINS,
  VALID_LIFECYCLE_STATES,
  isValidNonNegativeNumber,
  isPositiveNumber,
  validateBusinessCreate,
  validateInputsByDomain,
  validateAiPrompt,
  validateProfileUpdate
};

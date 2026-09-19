/**
 * VYAVSAYMITRA — Production Input Validation Service
 * 
 * Validates request payload against domain boundaries:
 * - Rejects negative values (investment, area, production, expenses, prices)
 * - Validates percentage ranges (0 to 100%)
 * - Validates physical agronomic limits (pH, area, animal capacity)
 * - Identifies missing required fields per business archetype
 * - Returns structured error and missing-data objects
 */

const SUPPORTED_CURRENCIES = ['INR', 'RS', 'RUPEES'];

/**
 * Validates business analysis request payload
 * 
 * @param {Object} input - Raw request body
 * @returns {Object} { isValid: boolean, status: string, missingFields?: string[], errors?: string[], message?: string, sanitized?: Object }
 */
function validateBusinessAnalysisInput(input = {}) {
  const errors = [];
  const missingFields = [];
  const guide = {};

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      isValid: false,
      status: 'invalid_parameter',
      message: 'Request body must be a valid JSON object.',
      errors: ['Invalid JSON payload']
    };
  }

  // 1. Check if ANY business identifier is provided
  const rawIdea = input.businessIdea || input.query || input.name || '';
  const rawType = input.businessType || input.category || '';

  if (!rawIdea && !rawType) {
    missingFields.push('businessType_or_businessIdea');
    guide['businessIdea'] = 'Provide a business description (e.g. "2 cow dairy farm" or "rural mini atta chakki")';
    guide['businessType'] = 'Or select a category: dairy, poultry, agriculture, food-processing';
    return {
      isValid: false,
      status: 'insufficient_data',
      message: 'Please provide either a business category or a descriptive business idea.',
      missingFields,
      requiredParametersGuide: guide
    };
  }

  // 2. Numeric Boundaries & Negative Checks
  const numericFieldsToCheck = [
    { key: 'investmentRequired', label: 'Required Investment', min: 0, max: 500000000 },
    { key: 'capitalAvailable', label: 'Available Capital / Margin', min: 0, max: 500000000 },
    { key: 'customAvailableCapital', label: 'Available Capital', min: 0, max: 500000000 },
    { key: 'monthlyOpex', label: 'Monthly Operating Expenses', min: 0, max: 100000000 },
    { key: 'expectedRevenue', label: 'Expected Annual Revenue', min: 0, max: 500000000 },
    { key: 'areaHa', label: 'Land Area (Hectares)', min: 0.01, max: 10000 },
    { key: 'areaAcres', label: 'Land Area (Acres)', min: 0.01, max: 25000 },
    { key: 'animalCount', label: 'Animal Count', min: 1, max: 2000 },
    { key: 'birdCapacity', label: 'Bird Capacity', min: 50, max: 200000 },
    { key: 'customMilkPrice', label: 'Milk Price per Litre', min: 10, max: 250 },
    { key: 'customPricePerQtl', label: 'Crop Price per Quintal', min: 100, max: 200000 },
    { key: 'customCostPerHa', label: 'Cost of Cultivation per Hectare', min: 500, max: 500000 },
    { key: 'customLivePricePerKg', label: 'Live Bird Price per Kg', min: 20, max: 1000 },
    { key: 'ph', label: 'Soil pH', min: 3.0, max: 11.0 }
  ];

  numericFieldsToCheck.forEach(field => {
    if (input[field.key] !== undefined && input[field.key] !== null && input[field.key] !== '') {
      const val = parseFloat(input[field.key]);
      if (isNaN(val)) {
        errors.push(`${field.label} (${field.key}) must be a valid number.`);
      } else if (val < 0) {
        errors.push(`${field.label} (${field.key}) cannot be negative. Received: ${val}.`);
      } else if (field.min !== undefined && val < field.min) {
        errors.push(`${field.label} (${field.key}) is below realistic operational threshold (${field.min}). Received: ${val}.`);
      } else if (field.max !== undefined && val > field.max) {
        errors.push(`${field.label} (${field.key}) exceeds maximum realistic operational threshold (${field.max}). Received: ${val}.`);
      }
    }
  });

  // 3. Currency Validation
  if (input.currency) {
    const curr = String(input.currency).toUpperCase().trim();
    if (!SUPPORTED_CURRENCIES.includes(curr)) {
      errors.push(`Unsupported currency: ${input.currency}. Only INR is currently supported for Indian rural enterprises.`);
    }
  }

  // 4. Percentage Limits
  if (input.ownMarginPct !== undefined && input.ownMarginPct !== null) {
    const pct = parseFloat(input.ownMarginPct);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      errors.push(`Margin percentage must be between 0 and 100%. Received: ${input.ownMarginPct}.`);
    }
  }

  // 5. Business-specific required parameter checks
  const normType = String(rawType || '').toLowerCase().trim();
  if (normType === 'agriculture' || normType === 'crop') {
    if (!input.crop && !input.product && !rawIdea) {
      missingFields.push('crop');
      guide['crop'] = 'Specify the crop commodity (e.g., Wheat, Rice, Cotton, Soyabean, Maize)';
    }
    if (!input.state && !input.location) {
      missingFields.push('state');
      guide['state'] = 'Specify the Indian state of cultivation (e.g., Gujarat, Maharashtra)';
    }
  }

  if (missingFields.length > 0) {
    return {
      isValid: false,
      status: 'insufficient_data',
      message: 'Additional information is required to perform accurate financial and agronomic calculations.',
      missingFields,
      requiredParametersGuide: guide
    };
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      status: 'invalid_parameter',
      message: 'Input parameter validation failed.',
      errors
    };
  }

  return {
    isValid: true,
    status: 'valid',
    sanitized: {
      ...input,
      businessType: normType,
      state: input.state ? String(input.state).trim() : 'National',
      district: input.district ? String(input.district).trim() : '',
      isRural: input.isRural !== false,
      currency: 'INR'
    }
  };
}

module.exports = {
  validateBusinessAnalysisInput
};

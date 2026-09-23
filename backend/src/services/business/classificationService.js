/**
 * VYAVSAYMITRA — Business Classification & Archetype Mapping Service
 * 
 * Classifies free-text business ideas into:
 * 1. Native application sectors: dairy, poultry, agriculture, food-processing
 * 2. Extended rural MSME archetypes: livestock_allied, micro_manufacturing, rural_service_retail
 * 3. Generalized MSME fallback for novel entrepreneurial concepts
 * 
 * Identifies required vs missing parameters and extracts scale clues from text.
 */

const { classifyBusinessIdea, extractScaleFromText, getArchetypeProfile } = require('./classifier');

/**
 * Classifies an incoming business proposal
 * 
 * @param {Object|string} input - Proposal description or object
 * @returns {Object} Structured classification result
 */
function classifyBusiness(input) {
  const text = typeof input === 'string'
    ? input
    : (input.businessIdea || input.query || input.businessType || input.category || '');

  const result = classifyBusinessIdea(text);

  // If user explicitly specified a valid category in an object, respect their choice
  if (typeof input === 'object' && input.businessType) {
    const explicitType = String(input.businessType).toLowerCase().trim();
    if (['dairy', 'poultry', 'agriculture', 'crop', 'food-processing', 'agro_processing'].includes(explicitType)) {
      result.detectedCategory = explicitType === 'crop' ? 'agriculture' : (explicitType === 'agro_processing' ? 'food-processing' : explicitType);
      result.mappedCalculationTemplate = result.detectedCategory === 'agriculture' ? 'crop' : result.detectedCategory;
      result.isCoreCategory = true;
      result.confidence = 0.98;
    }
  }

  return result;
}

module.exports = {
  classifyBusiness,
  extractScaleFromText,
  getArchetypeProfile
};

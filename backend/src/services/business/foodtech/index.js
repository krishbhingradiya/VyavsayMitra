/**
 * VYAVSAYMITRA — FoodTech Business Model Foundation & Registry Barrel Export
 * 
 * Provides unified access to:
 * - FoodTech Business Model Registry (3-tier resolution: Known, Recognizable, Insufficient)
 * - Standardized Parameter System with institutional metadata & zero fake defaults
 * - Mass Balance Abstraction & Physical Feasibility Engine
 * - Sourced & Verified Generic and Business-Specific Formulas
 * - Bridge helper to populate Phase-1 FormulaRegistry
 */

const {
  FoodTechRegistry,
  BUSINESS_STATUSES,
  RESOLUTION_TIERS,
  defaultFoodTechRegistry,
  seedDefaultFoodTechModels
} = require('./foodtechRegistry');

const {
  FOODTECH_PARAMETERS,
  validateFoodTechParameter
} = require('./foodtechParameters');

const {
  validateMassBalance,
  MASS_BALANCE_TOLERANCE_PCT
} = require('./massBalance');

const {
  FOODTECH_FORMULAS
} = require('./foodtechFormulas');

const {
  runFoodTechBusinessModel,
  normalizeWeight,
  normalizePrice,
  validateNonNegativeCost
} = require('./foodtechExecutionEngine');

const {
  generateFoodTechAdvisory
} = require('./foodtechAdvisoryService');

/**
 * Registers all FoodTech parameters and formulas into a Phase-1 FormulaRegistry instance
 * 
 * @param {import('../../formulaEngine/formulaRegistry').FormulaRegistry} formulaRegistry
 */
function registerFoodTechWithFormulaRegistry(formulaRegistry) {
  if (!formulaRegistry) {
    throw new Error('formulaRegistry instance must be provided');
  }

  // Register parameters (skip duplicates if already registered)
  for (const param of FOODTECH_PARAMETERS) {
    if (!formulaRegistry.hasParameter(param.parameterId)) {
      formulaRegistry.registerParameter(param);
    }
  }

  // Register formulas (skip duplicates if already registered)
  for (const formula of FOODTECH_FORMULAS) {
    if (!formulaRegistry.hasFormula(formula.formulaId)) {
      formulaRegistry.registerFormula(formula);
    }
  }

  return formulaRegistry;
}

module.exports = {
  FoodTechRegistry,
  BUSINESS_STATUSES,
  RESOLUTION_TIERS,
  defaultFoodTechRegistry,
  seedDefaultFoodTechModels,
  FOODTECH_PARAMETERS,
  validateFoodTechParameter,
  validateMassBalance,
  MASS_BALANCE_TOLERANCE_PCT,
  FOODTECH_FORMULAS,
  registerFoodTechWithFormulaRegistry,
  runFoodTechBusinessModel,
  normalizeWeight,
  normalizePrice,
  validateNonNegativeCost,
  generateFoodTechAdvisory
};

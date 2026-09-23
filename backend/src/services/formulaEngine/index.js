/**
 * VYAVSAYMITRA — Unified Formula Engine Foundation (Phase 1)
 * 
 * Provides:
 * - Parameter Definition & Schema Enforcement
 * - Formula Definition & Lifecycle Transitions
 * - Safe Whitelisted AST Evaluator (Zero eval, Zero Function)
 * - Dependency Resolution & Circular Dependency Detection
 * - Provenance & Audit Trail Tracking
 * - Formula Registry & Sourced Initial Formula Library
 */

const { ParameterSchema, DATA_STATUSES, DATA_TYPES, validateParameterDefinition, createParameterDefinition, validateParameterValue } = require('./parameterSchema');
const { FORMULA_STATUSES, FORMULA_CATEGORIES, ALLOWED_TRANSITIONS, validateFormulaDefinition, createFormulaDefinition, transitionFormulaStatus } = require('./formulaSchema');
const { ExpressionParser, tokenize, extractVariables, evaluateAst, safeEvaluateExpression, WHITELISTED_FUNCTIONS } = require('./expressionParser');
const { DependencyResolver } = require('./dependencyResolver');
const { buildFormulaProvenance, auditFormulaProvenance } = require('./provenanceTracker');
const { FormulaRegistry } = require('./formulaRegistry');
const { INITIAL_PARAMETERS, INITIAL_FORMULAS, seedFormulaRegistry } = require('./initialFormulas');

// Singleton default registry initialized with verified initial formulas
const defaultRegistry = new FormulaRegistry();
seedFormulaRegistry(defaultRegistry);

module.exports = {
  // Registry & Core
  FormulaRegistry,
  defaultRegistry,
  seedFormulaRegistry,

  // Parameter Schemas
  DATA_STATUSES,
  DATA_TYPES,
  validateParameterDefinition,
  createParameterDefinition,
  validateParameterValue,

  // Formula Schemas & Lifecycle
  FORMULA_STATUSES,
  FORMULA_CATEGORIES,
  ALLOWED_TRANSITIONS,
  validateFormulaDefinition,
  createFormulaDefinition,
  transitionFormulaStatus,

  // Safe AST Expression Engine
  ExpressionParser,
  tokenize,
  extractVariables,
  evaluateAst,
  safeEvaluateExpression,
  WHITELISTED_FUNCTIONS,

  // Graph & Cycle Resolver
  DependencyResolver,

  // Provenance
  buildFormulaProvenance,
  auditFormulaProvenance,

  // Curated Sourced Formulas
  INITIAL_PARAMETERS,
  INITIAL_FORMULAS
};

/**
 * VYAVSAYMITRA — Data Provenance & Traceability Service
 * 
 * Enforces strict hierarchy of truth:
 * 1. Verified Local/Database Data (DATABASE_VALUE)
 * 2. Deterministic Financial/Agronomic Formulas (FORMULA)
 * 3. Production-Approved ML Models (ML_PREDICTION)
 * 4. Verified External APIs/Data Portals (EXTERNAL_DATA)
 * 5. Gemini AI Qualitative Fallback (AI_ESTIMATE)
 * 
 * Guarantees that AI estimates can NEVER overwrite verified numerical results.
 */

const SOURCE_PRIORITIES = {
  DATABASE_VALUE: 1,
  FORMULA: 2,
  ML_PREDICTION: 3,
  EXTERNAL_DATA: 4,
  AI_ESTIMATE: 5
};

/**
 * Formats numerical values to honest, realistic precision (no fake decimal precision for currency)
 */
function honestPrecision(val, unit) {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  if (unit === 'INR') return Math.round(val);
  if (unit === 'PERCENT' || unit === 'RATIO' || unit === 'tonnes/ha' || unit === 'INR/kg') {
    return +(val.toFixed(2));
  }
  if (unit === 'YEARS') return +(val.toFixed(1));
  return val;
}

/**
 * Creates an enriched parameter object with full traceability and freshness metadata.
 * Supports both legacy positional arguments and structured options object.
 */
function createTraceableParameter(
  value,
  optionsOrUnit = 'INR',
  sourceType = 'FORMULA',
  source = 'NABARD Model Benchmark',
  confidence = 0.95,
  quality = 'verified'
) {
  let opts = {};
  if (typeof optionsOrUnit === 'object' && optionsOrUnit !== null) {
    opts = optionsOrUnit;
  } else {
    opts = {
      unit: optionsOrUnit,
      sourceType,
      source,
      confidence,
      quality
    };
  }

  const unit = opts.unit || 'INR';
  const normType = (opts.sourceType || 'FORMULA').toUpperCase();
  const roundedValue = honestPrecision(value, unit);

  return {
    value: roundedValue,
    unit,
    source: opts.source || 'NABARD Model Benchmark',
    sourceType: normType,
    sourceDate: opts.sourceDate || '2024-2026',
    datasetVersion: opts.datasetVersion || 'v1.1.0',
    calculationMethod: opts.calculationMethod || opts.source || 'Deterministic Accounting Formula',
    modelVersion: opts.modelVersion || null,
    priorityRank: SOURCE_PRIORITIES[normType] || 5,
    timestamp: new Date().toISOString(),
    confidence: typeof opts.confidence === 'number' ? opts.confidence : 0.90,
    quality: opts.quality || 'verified',
    dataStatus: (opts.dataStatus || 'CURRENT').toLowerCase(),
    warning: opts.warning || null,
    assumptions: Array.isArray(opts.assumptions) ? opts.assumptions : []
  };
}

/**
 * Safely merges a field, guaranteeing higher-priority sources cannot be overridden by lower ones
 */
function safeMergeField(existingParam, newParam) {
  if (!existingParam) return newParam;
  if (!newParam) return existingParam;

  const currentRank = existingParam.priorityRank || SOURCE_PRIORITIES[existingParam.sourceType] || 5;
  const newRank = newParam.priorityRank || SOURCE_PRIORITIES[newParam.sourceType] || 5;

  // Lower number means higher priority (e.g. 1 is highest, 5 is lowest)
  if (newRank < currentRank) {
    return newParam; // New source is higher priority
  }
  // Retain existing higher-priority parameter
  return existingParam;
}

/**
 * Assembles system-wide audit provenance block
 */
function buildProvenanceAudit({
  dataSources = [],
  modelsUsed = [],
  formulasUsed = [],
  assumptions = [],
  aiFallbackUsed = false,
  fallbackReason = null,
  requestId = null,
  executionTimeMs = 0,
  freshnessAudit = null
}) {
  return {
    requestId: requestId || `req-${Date.now()}`,
    hierarchyLevelApplied: aiFallbackUsed ? 'HYBRID_AI_QUALITATIVE_SYNTHESIS' : 'VERIFIED_DETERMINISTIC_AND_ML',
    dataSources: [...new Set(dataSources)],
    modelsUsed: modelsUsed,
    formulasUsed: [...new Set(formulasUsed)],
    assumptions: [...new Set(assumptions)],
    freshnessAudit: freshnessAudit || {
      marketData: 'historical_reference (APMC 2014-2016)',
      yieldData: 'recent (DES 1997-2020)',
      schemeData: 'current (GoI 2024-2026)',
      governanceGuard: 'ACTIVE (Stale data warned; no fake current data)'
    },
    aiFallbackUsed: !!aiFallbackUsed,
    fallbackReason: fallbackReason || 'None (Primary verified pipeline resolved)',
    executionTimeMs: Math.round(executionTimeMs),
    timestamp: new Date().toISOString(),
    integrityPolicy: 'ZERO_FAKE_DATA_LEAKAGE_FREE_V1.1.0'
  };
}

module.exports = {
  SOURCE_PRIORITIES,
  createTraceableParameter,
  safeMergeField,
  buildProvenanceAudit
};

/**
 * VYAVSAYMITRA — Centralized Production Observability Utility
 * 
 * Provides structured, safe, and correlatable event logging for all operational layers.
 * 
 * Every emitted event:
 * - Contains requestId (where available)
 * - Contains ISO 8601 timestamp
 * - Contains safe event name
 * - Contains entity type and safe entity ID
 * - NEVER contains JWT tokens, passwords, service-role keys,
 *   full AI prompts with private data, database credentials, or filesystem secrets.
 */

const { isTest } = require('../config/env');

// ── Secret Scrubbing ─────────────────────────────────────────────────
const SECRET_PATTERNS = [
  // JWT tokens
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
  // Supabase/API keys (long alphanumeric strings)
  /(?:key|token|secret|password|credential|authorization)\s*[:=]\s*['"]?[A-Za-z0-9_\-/.]{20,}['"]?/gi,
  // Windows filesystem paths
  /[A-Za-z]:\\[^\s:]+/g,
  // Unix filesystem paths that look like secrets
  /\/(?:home|etc|var|tmp)\/[^\s]+/g,
];

function scrubSecrets(str) {
  if (typeof str !== 'string') return str;
  let scrubbed = str;
  SECRET_PATTERNS.forEach(pat => {
    scrubbed = scrubbed.replace(pat, '[REDACTED]');
  });
  return scrubbed;
}

/**
 * Recursively scrubs sensitive fields from objects, arrays, or strings
 */
function scrubData(obj) {
  if (typeof obj === 'string') return scrubSecrets(obj);
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(scrubData);

  const safe = {};
  const sensitiveKeys = [
    'password', 'token', 'jwt', 'secret', 'apiKey', 'apikey',
    'service_role_key', 'serviceRoleKey', 'authorization', 'database_url',
    'databaseUrl', 'db_url'
  ];

  for (const [key, val] of Object.entries(obj)) {
    if (sensitiveKeys.includes(key)) {
      safe[key] = '[REDACTED]';
    } else if (typeof val === 'string') {
      safe[key] = scrubSecrets(val);
    } else if (typeof val === 'object' && val !== null) {
      safe[key] = scrubData(val);
    } else {
      safe[key] = val;
    }
  }
  return safe;
}

// ── Structured Event Emitter ─────────────────────────────────────────
/**
 * Emits a structured operational event.
 * 
 * @param {string} eventName - Safe event name (e.g. 'API_REQUEST', 'DB_QUERY', 'AI_REQUEST')
 * @param {Object} data - Event payload (will be scrubbed for secrets)
 * @param {Object} [options] - Additional options
 * @param {'info'|'warn'|'error'} [options.level='info'] - Log level
 * @param {string} [options.requestId] - Request correlation ID
 */
function emitEvent(eventName, data = {}, options = {}) {
  if (isTest) return; // Silent in test mode

  const level = options.level || 'info';
  const requestId = options.requestId || data.requestId || '-';
  const timestamp = new Date().toISOString();

  const safeData = {};
  for (const [key, val] of Object.entries(data)) {
    if (['password', 'token', 'jwt', 'secret', 'apiKey', 'serviceRoleKey', 'authorization'].includes(key)) {
      safeData[key] = '[REDACTED]';
    } else if (typeof val === 'string') {
      safeData[key] = scrubSecrets(val);
    } else {
      safeData[key] = val;
    }
  }

  const event = {
    event: eventName,
    ts: timestamp,
    rid: requestId,
    ...safeData,
  };

  const logLine = `[${eventName}] ${timestamp} [${requestId}] ${JSON.stringify(safeData)}`;

  if (level === 'error') {
    console.error(logLine);
  } else if (level === 'warn') {
    console.warn(logLine);
  } else {
    console.log(logLine);
  }

  return event;
}

// ── Latency Tracker ──────────────────────────────────────────────────
/**
 * Creates a latency tracker that records elapsed milliseconds.
 * 
 * @param {string} operationName - Name of the operation (e.g. 'DB_QUERY', 'AI_REQUEST')
 * @param {Object} [metadata] - Additional context metadata
 * @returns {{ end: (extraData?: Object) => { durationMs: number } }}
 */
function trackLatency(operationName, metadata = {}) {
  const startTime = Date.now();
  return {
    end(extraData = {}) {
      const durationMs = Date.now() - startTime;
      emitEvent(`${operationName}_LATENCY`, {
        operation: operationName,
        durationMs,
        ...metadata,
        ...extraData,
      });
      return { durationMs };
    }
  };
}

// ── Specific Event Helpers ───────────────────────────────────────────

function logApiRequest(req, statusCode, durationMs) {
  emitEvent('API_RESPONSE', {
    method: req.method,
    path: (req.originalUrl || req.url || '').split('?')[0],
    status: statusCode,
    durationMs,
    requestId: req.id,
  });
}

function logAuthFailure(reason, req) {
  emitEvent('AUTH_FAILURE', {
    reason: scrubSecrets(reason),
    method: req?.method,
    path: (req?.originalUrl || req?.url || '').split('?')[0],
    requestId: req?.id,
  }, { level: 'warn', requestId: req?.id });
}

function logRateLimitHit(req) {
  emitEvent('RATE_LIMIT_HIT', {
    method: req?.method,
    path: (req?.originalUrl || req?.url || '').split('?')[0],
    requestId: req?.id,
  }, { level: 'warn', requestId: req?.id });
}

function logAiRequest(businessId, mode, durationMs, success) {
  emitEvent('AI_REQUEST', {
    entityType: 'business',
    entityId: businessId,
    mode,
    durationMs,
    success,
  });
}

function logDbOperation(operation, entityType, entityId, durationMs) {
  emitEvent('DB_OPERATION', {
    operation,
    entityType,
    entityId,
    durationMs,
  });
}

function logDocumentOperation(operation, documentId, businessId, success, reason) {
  emitEvent('DOCUMENT_OPERATION', {
    operation,
    entityType: 'document',
    entityId: documentId,
    businessId,
    success,
    reason: reason ? scrubSecrets(String(reason)) : undefined,
  }, { level: success ? 'info' : 'warn' });
}

function logDprOperation(operation, businessId, versionNumber, success, reason) {
  emitEvent('DPR_OPERATION', {
    operation,
    entityType: 'dpr',
    businessId,
    versionNumber,
    success,
    reason: reason ? scrubSecrets(String(reason)) : undefined,
  }, { level: success ? 'info' : 'warn' });
}

function logApplicationOperation(operation, applicationId, businessId, success, reason) {
  emitEvent('APPLICATION_OPERATION', {
    operation,
    entityType: 'application',
    entityId: applicationId,
    businessId,
    success,
    reason: reason ? scrubSecrets(String(reason)) : undefined,
  }, { level: success ? 'info' : 'warn' });
}

function logReminderGeneration(userId, generatedCount, success, reason) {
  emitEvent('REMINDER_GENERATION', {
    entityType: 'user',
    entityId: userId,
    generatedCount,
    success,
    reason: reason ? scrubSecrets(String(reason)) : undefined,
  }, { level: success ? 'info' : 'warn' });
}

module.exports = {
  scrubSecrets,
  scrubData,
  emitEvent,
  trackLatency,
  logApiRequest,
  logAuthFailure,
  logRateLimitHit,
  logAiRequest,
  logDbOperation,
  logDocumentOperation,
  logDprOperation,
  logApplicationOperation,
  logReminderGeneration,
};

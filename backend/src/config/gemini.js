/**
 * VYAVSAYMITRA — Centralized Gemini Configuration & Governance
 * 
 * Provides safe, validated, centralized configuration for Google Gemini API.
 * 
 * SECURITY MANDATE:
 * - API key remains strictly server-side.
 * - Key is never logged, never exposed in JSON/diagnostics, never sent to frontend.
 * - Missing/invalid configuration does not crash the server.
 */

const DEFAULT_MODEL = 'gemini-3.8-flash';
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MAX_OUTPUT_TOKENS = 8192;
const DEFAULT_TIMEOUT_MS = 30000;

const PLACEHOLDER_KEYS = new Set([
  'YOUR_REAL_KEY_HERE',
  'PASTE_YOUR_GEMINI_API_KEY_HERE',
  'YOUR_GEMINI_API_KEY',
  'PLACEHOLDER'
]);

/**
 * Checks whether the configured Gemini API key is valid and usable (not empty, not placeholder).
 * @returns {boolean}
 */
function isConfigured() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (trimmed.length < 10) return false;
  if (PLACEHOLDER_KEYS.has(trimmed) || trimmed.includes('YOUR_REAL_KEY_HERE') || trimmed.includes('PASTE_YOUR_GEMINI_API_KEY')) {
    return false;
  }
  return true;
}

/**
 * Returns the configured Gemini model, defaulting to canonical 'gemini-3.8-flash'.
 * @returns {string}
 */
function getModel() {
  const model = process.env.GEMINI_MODEL;
  if (model && typeof model === 'string' && model.trim().length > 0) {
    return model.trim();
  }
  return DEFAULT_MODEL;
}

/**
 * Returns the configured generation temperature.
 * @returns {number}
 */
function getTemperature() {
  const temp = parseFloat(process.env.GEMINI_TEMPERATURE);
  if (!isNaN(temp) && temp >= 0 && temp <= 2) {
    return temp;
  }
  return DEFAULT_TEMPERATURE;
}

/**
 * Returns the configured maximum output tokens.
 * @returns {number}
 */
function getMaxOutputTokens() {
  const tokens = parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS, 10);
  if (!isNaN(tokens) && tokens > 0 && tokens <= 65536) {
    return tokens;
  }
  return DEFAULT_MAX_OUTPUT_TOKENS;
}

/**
 * Returns the configured request timeout in milliseconds.
 * @returns {number}
 */
function getTimeoutMs() {
  const timeout = parseInt(process.env.GEMINI_TIMEOUT_MS, 10);
  if (!isNaN(timeout) && timeout > 0 && timeout <= 120000) {
    return timeout;
  }
  return DEFAULT_TIMEOUT_MS;
}

/**
 * Server-side accessor for the raw API key.
 * Strictly internal — never serialize or expose in responses.
 * @returns {string|null}
 */
function getApiKey() {
  return isConfigured() ? process.env.GEMINI_API_KEY.trim() : null;
}

/**
 * Returns safe diagnostics representation (NO credentials, NO partial keys).
 * @returns {{ configured: boolean, model: string }}
 */
function getDiagnostics() {
  return {
    configured: isConfigured(),
    model: getModel()
  };
}

/**
 * Safe startup logger for backend initialization.
 * Never prints or leaks secrets.
 */
function logStartupStatus() {
  const configured = isConfigured();
  const model = getModel();

  // Set internal operational state flag
  process.env.GEMINI_CONFIGURED = configured ? 'true' : 'false';

  if (configured) {
    console.log(`[Gemini] Configuration: READY`);
    console.log(`[Gemini] Model: ${model}`);
  } else {
    console.log(`[Gemini] Configuration: NOT CONFIGURED`);
    console.log(`[Gemini] Model: ${model}`);
  }
}

/**
 * Full sanitized configuration object.
 */
function getGeminiConfig() {
  return {
    configured: isConfigured(),
    model: getModel(),
    temperature: getTemperature(),
    maxOutputTokens: getMaxOutputTokens(),
    timeoutMs: getTimeoutMs()
  };
}

// Initialize internal process state flag safely
process.env.GEMINI_CONFIGURED = isConfigured() ? 'true' : 'false';

module.exports = {
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_OUTPUT_TOKENS,
  DEFAULT_TIMEOUT_MS,
  isConfigured,
  getModel,
  getTemperature,
  getMaxOutputTokens,
  getTimeoutMs,
  getApiKey,
  getDiagnostics,
  logStartupStatus,
  getGeminiConfig
};

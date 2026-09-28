/**
 * VYAVSAYMITRA — Production Environment Configuration & Validation
 * 
 * Centralized, secure environment management.
 * Ensures production credentials are valid, prevents secret leakage,
 * and differentiates development, test, and production behavior safely.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';
const isDevelopment = !isProduction && !isTest;

/**
 * Safely masks a secret string for diagnostics, revealing only first and last few chars.
 * @param {string} secret 
 * @returns {string}
 */
function maskSecret(secret) {
  if (!secret || typeof secret !== 'string') return '[NOT_SET]';
  if (secret.length <= 8) return '****';
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}

/**
 * Validates environment variables according to operational mode.
 * In production, missing critical secrets will throw an error to prevent insecure startup.
 */
function validateEnv() {
  const errors = [];
  const warnings = [];

  const PORT = process.env.PORT || '5000';
  if (isNaN(Number(PORT))) {
    errors.push('PORT must be a valid integer.');
  }

  const jwtSecret = process.env.JWT_SECRET || process.env.OTP_SECRET;
  if (!jwtSecret && isProduction) {
    errors.push('JWT_SECRET or OTP_SECRET is required in production.');
  } else if (!jwtSecret) {
    warnings.push('JWT_SECRET is unset; using local development secret.');
  } else if (isProduction && (jwtSecret.includes('default') || jwtSecret.includes('change-me') || jwtSecret.length < 16)) {
    errors.push('JWT_SECRET in production must be a strong random string (minimum 16 chars, no default placeholders).');
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  if (isProduction) {
    if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
      errors.push('SUPABASE_URL is required in production and must start with http/https.');
    }
    if (!supabaseKey || supabaseKey.length < 20 || supabaseKey.includes('your-supabase')) {
      errors.push('SUPABASE_SERVICE_ROLE_KEY is required in production with valid credentials.');
    }
  } else {
    if (!supabaseUrl || !supabaseKey) {
      warnings.push('Supabase credentials not fully configured; offline SQLite fallback active for local/test.');
    }
  }

  if (errors.length > 0) {
    console.error('\n❌ [CONFIG ERROR] Environment validation failed:');
    errors.forEach(err => console.error(`  - ${err}`));
    if (isProduction) {
      throw new Error(`Production environment validation failed: ${errors.join('; ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Returns a sanitized view of configuration (safe for health endpoints & observability).
 * NEVER includes secrets, private keys, or credentials.
 */
function getSanitizedConfig() {
  return {
    nodeEnv: NODE_ENV,
    port: parseInt(process.env.PORT || '5000', 10),
    databaseMode: (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY))
      ? 'supabase_postgresql'
      : 'sqlite_local_fallback',
    isSupabaseConfigured: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY)),
    hasGeminiKey: require('./gemini').isConfigured(),
    gemini: require('./gemini').getDiagnostics(),
    hasSmtpConfig: Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD),
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
      : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173']
  };
}

module.exports = {
  NODE_ENV,
  isProduction,
  isTest,
  isDevelopment,
  maskSecret,
  validateEnv,
  getSanitizedConfig
};

/**
 * VYAVSAYMITRA — Production Rate Limiting & Abuse Protection
 * 
 * Protects endpoints from brute-force, runaway AI costs, and denial of service.
 * Returns clean 429 Too Many Requests status with human-friendly messages.
 * Automatically accommodates automated test suites without blocking legitimate runs.
 */

const rateLimit = require('express-rate-limit');
const { isTest } = require('../config/env');

const skipIfTest = () => isTest;

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipIfTest,
  message: {
    success: false,
    message: 'Too many requests from this address. Please wait a few minutes and try again.',
    code: 'RATE_LIMIT_EXCEEDED',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this address. Please wait a few minutes and try again.'
    }
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 OTP/Auth requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipIfTest,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please wait 15 minutes before trying again.'
    }
  },
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40, // 40 AI conversational requests per 15 minutes to prevent runaway LLM costs
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipIfTest,
  message: {
    success: false,
    message: 'Mitra AI advisory request limit reached. Please wait a few minutes before asking more questions.',
    code: 'AI_RATE_LIMIT_EXCEEDED',
    error: {
      code: 'AI_RATE_LIMIT_EXCEEDED',
      message: 'Mitra AI advisory request limit reached. Please wait a few minutes before asking more questions.'
    }
  },
});

const analysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // 50 calculations per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipIfTest,
  message: {
    success: false,
    message: 'Analysis calculation limit reached. Please wait a few minutes before submitting new runs.',
    code: 'ANALYSIS_RATE_LIMIT_EXCEEDED',
    error: {
      code: 'ANALYSIS_RATE_LIMIT_EXCEEDED',
      message: 'Analysis calculation limit reached. Please wait a few minutes before submitting new runs.'
    }
  },
});

module.exports = {
  globalLimiter,
  authLimiter,
  aiLimiter,
  analysisLimiter,
};

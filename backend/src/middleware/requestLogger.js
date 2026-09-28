/**
 * VYAVSAYMITRA — Structured Production Request Logger
 * 
 * Logs request metadata (timestamp, requestId, method, sanitized route, statusCode, duration).
 * Strictly omits tokens, passwords, authorization headers, and confidential credentials.
 */

const { isTest } = require('../config/env');

function requestLogger(req, res, next) {
  if (isTest) {
    return next();
  }

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const sanitizedUrl = req.originalUrl ? req.originalUrl.split('?')[0] : req.url;
    const requestId = req.id || '-';
    const status = res.statusCode;

    // Format: [ACCESS] 2026-09-25T10:00:00.000Z req_123 GET /api/businesses 200 14ms
    const logLine = `[ACCESS] ${new Date().toISOString()} [${requestId}] ${req.method} ${sanitizedUrl} ${status} ${duration}ms`;

    if (status >= 500) {
      console.error(logLine);
    } else if (status >= 400) {
      console.warn(logLine);
    } else {
      console.log(logLine);
    }
  });

  next();
}

module.exports = {
  requestLogger
};

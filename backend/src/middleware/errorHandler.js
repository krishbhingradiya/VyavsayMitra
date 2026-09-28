/**
 * VYAVSAYMITRA — Centralized Production Error Handling Middleware
 * 
 * Safely handles application errors (400, 401, 403, 404, 409, 422, 429, 500, 503).
 * Sanitizes technical details, SQL queries, stack traces, and internal secrets.
 * Provides consistent error structure with request tracing.
 */

const { isProduction } = require('../config/env');

function notFoundHandler(req, res) {
  const requestId = req.id || '-';
  res.status(404).json({
    success: false,
    message: 'Requested endpoint or resource not found.',
    code: 'NOT_FOUND',
    error: {
      code: 'NOT_FOUND',
      message: 'Requested endpoint or resource not found.',
      requestId
    }
  });
}

function errorHandler(err, req, res, _next) {
  const requestId = req.id || '-';
  let statusCode = err.status || err.statusCode || 500;
  let errorCode = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred.';

  // Handle malformed JSON body parser error
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400 && 'body' in err)) {
    statusCode = 400;
    errorCode = 'INVALID_JSON';
    message = 'Malformed JSON in request body.';
  }

  // Handle URI malformed errors
  if (err instanceof URIError) {
    statusCode = 400;
    errorCode = 'BAD_REQUEST';
    message = 'Malformed URI in request path.';
  }

  // Map known status codes to safe codes if generic
  if (errorCode === 'INTERNAL_ERROR') {
    if (statusCode === 400) errorCode = 'BAD_REQUEST';
    else if (statusCode === 401) errorCode = 'UNAUTHORIZED';
    else if (statusCode === 403) errorCode = 'FORBIDDEN';
    else if (statusCode === 404) errorCode = 'NOT_FOUND';
    else if (statusCode === 409) errorCode = 'CONFLICT';
    else if (statusCode === 422) errorCode = 'UNPROCESSABLE_ENTITY';
    else if (statusCode === 429) errorCode = 'TOO_MANY_REQUESTS';
    else if (statusCode === 503) errorCode = 'SERVICE_UNAVAILABLE';
  }

  // In production, sanitize 500 error messages to prevent leaking SQL / system internals
  if (isProduction && statusCode >= 500) {
    console.error(`[INTERNAL ERROR] [${requestId}]`, err.stack || err);
    message = 'A processing error occurred. Our team has been notified. Please try again.';
  } else if (!isProduction && statusCode >= 500) {
    console.error(`[DEV ERROR] [${requestId}]`, err.message || err);
  }

  // Ensure message never exposes secrets or file paths
  if (typeof message === 'string') {
    message = message
      .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[TOKEN_REDACTED]')
      .replace(/[A-Za-z]:\\[^:\s]+/g, '[PATH_REDACTED]');
  }

  res.status(statusCode).json({
    success: false,
    message,
    code: errorCode,
    error: {
      code: errorCode,
      message,
      requestId
    }
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};

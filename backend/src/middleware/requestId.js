/**
 * VYAVSAYMITRA — Request ID & Traceability Middleware
 * 
 * Attaches a unique UUID to every incoming request for distributed tracing,
 * structured logging, and client error correlation without exposing internals.
 */

const crypto = require('crypto');

function requestIdMiddleware(req, res, next) {
  const existingId = req.headers['x-request-id'];
  const requestId = (existingId && typeof existingId === 'string' && existingId.length < 100)
    ? existingId
    : (crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

module.exports = {
  requestIdMiddleware
};

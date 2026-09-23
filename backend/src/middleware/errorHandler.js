/**
 * VYAVSAYMITRA — Centralized Error Handling Middleware
 */

function notFoundHandler(_req, res) {
  res.status(404).json({ success: false, message: 'Endpoint not found.' });
}

function errorHandler(err, _req, res, _next) {
  console.error('[SERVER ERROR]', err.message || err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error.',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};

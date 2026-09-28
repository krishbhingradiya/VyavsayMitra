/**
 * VYAVSAYMITRA — Express Backend Server
 *
 * Provides OTP authentication, business advisory, ML inference,
 * and market data API endpoints.
 * Runs alongside the Vite frontend dev server.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { initDb } = require('./src/config/db');
const { validateEnv, isProduction, getSanitizedConfig } = require('./src/config/env');
const { logStartupStatus, getDiagnostics: getGeminiDiagnostics } = require('./src/config/gemini');
const { globalLimiter, authLimiter, aiLimiter, analysisLimiter } = require('./src/middleware/rateLimiter');
const { requestIdMiddleware } = require('./src/middleware/requestId');
const { requestLogger } = require('./src/middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorHandler');
const authRoutes = require('./src/routes/authRoutes');
const businessRoutes = require('./src/routes/businessRoutes');
const businessManagementRoutes = require('./src/routes/businessManagementRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const feedbackRoutes = require('./src/routes/feedbackRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const fieldOperationsRoutes = require('./src/routes/fieldOperationsRoutes');


const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Validate environment configuration
validateEnv();

// ─── Security & Observability Middleware ──────────────────────────
app.use(helmet({
  xContentTypeOptions: true,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false // API server serving JSON and assets without blocking Vite/React
}));

// Permissions-Policy header
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(requestIdMiddleware);
app.use(requestLogger);

// CORS configuration (strictly configured origins, no wildcard with credentials)
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : defaultAllowedOrigins;

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (tools, curl, tests) or configured browser origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS origin ${origin} is not permitted.`));
  },
  credentials: true,
}));

// Body parsing with safe size limit supporting secure document uploads up to 10MB
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Global rate limiter
app.use(globalLimiter);

// ─── Abuse-Protected Route Mounts ────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/businesses/:id/ai', aiLimiter);
app.use('/api/business/:id/ai', aiLimiter);
app.use('/api/businesses/:id/analyze', analysisLimiter);
app.use('/api/business/:id/analyze', analysisLimiter);

// ─── Core Domain Routes ──────────────────────────────────────────
app.use('/api/businesses', businessManagementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/field-visits', fieldOperationsRoutes);
app.use('/api/business', businessRoutes);

app.use('/api/business', businessManagementRoutes);
app.use('/api', businessRoutes);

const { isSupabaseConfigured, testSupabaseConnection } = require('./src/config/supabase');

// ─── Health Check (Liveness) ─────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  if (isSupabaseConfigured()) {
    const conn = await testSupabaseConnection();
    if (conn.ok) {
      return res.json({
        status: 'ok',
        database: 'supabase',
        latencyMs: conn.latencyMs,
        timestamp: new Date().toISOString()
      });
    }
    return res.status(503).json({
      status: 'degraded',
      database: 'supabase_unreachable',
      timestamp: new Date().toISOString()
    });
  }

  return res.json({
    status: 'degraded',
    database: 'not_configured',
    fallback: 'sqlite_local',
    timestamp: new Date().toISOString()
  });
});

// ─── Readiness Check (Dependency Validation) ──────────────────────
app.get('/api/ready', async (_req, res) => {
  if (isSupabaseConfigured()) {
    const conn = await testSupabaseConnection();
    if (conn.ok) {
      return res.json({
        status: 'ok',
        database: 'connected',
        mode: 'supabase_postgresql',
        timestamp: new Date().toISOString()
      });
    }
    return res.status(503).json({
      status: 'not_ready',
      database: 'unavailable',
      timestamp: new Date().toISOString()
    });
  }

  // In production, unconfigured database fails readiness check
  if (isProduction) {
    return res.status(503).json({
      status: 'not_ready',
      database: 'unconfigured_production',
      timestamp: new Date().toISOString()
    });
  }

  // Development/Test offline readiness
  return res.json({
    status: 'ok',
    database: 'connected',
    mode: 'sqlite_local_fallback',
    timestamp: new Date().toISOString()
  });
});

// ─── Operational Diagnostics (Phase 9 Safe Internal Diagnostics) ─
app.get('/api/diagnostics', async (_req, res) => {
  const startTime = Date.now();
  let dbStatus = 'sqlite_local';
  let dbLatencyMs = 0;

  if (isSupabaseConfigured()) {
    const conn = await testSupabaseConnection();
    dbStatus = conn.ok ? 'connected' : 'unreachable';
    dbLatencyMs = conn.latencyMs || (Date.now() - startTime);
  }

  const geminiDiag = getGeminiDiagnostics();
  const aiConfigured = geminiDiag.configured;
  const jwtConfigured = !!(process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET);

  return res.json({
    success: true,
    status: dbStatus === 'unreachable' ? 'degraded' : 'ok',
    gemini: geminiDiag,
    system: {
      health: 'ok',
      readiness: dbStatus === 'unreachable' ? 'not_ready' : 'ready',
      database: {
        provider: isSupabaseConfigured() ? 'supabase_postgresql' : 'sqlite_local',
        status: dbStatus,
        latencyMs: dbLatencyMs
      },
      ai: {
        configured: aiConfigured,
        mode: aiConfigured ? 'gemini_grounded' : 'deterministic_rules_engine',
        model: geminiDiag.model
      },
      gemini: geminiDiag,
      config: {
        environment: isProduction ? 'production' : (process.env.NODE_ENV || 'development'),
        jwtConfigured,
        servicesReady: jwtConfigured
      },
      timestamp: new Date().toISOString()
    }
  });
});

// ─── Error Handling ───────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server (after DB initialization) ───────────────────────
async function start(port = PORT) {
  try {
    await initDb();

    console.log('[VYAVSAYMITRA] Backend started');
    logStartupStatus();
    if (isSupabaseConfigured()) {
      console.log('[VYAVSAYMITRA] Database: Supabase PostgreSQL');
      const conn = await testSupabaseConnection();
      if (conn.ok) {
        console.log(`[VYAVSAYMITRA] Database connection: OK (${conn.latencyMs}ms)`);
      } else {
        console.warn(`[VYAVSAYMITRA] Database connection check: ${conn.error}`);
      }
    } else {
      console.log('[VYAVSAYMITRA] Supabase configuration missing');
    }

    const server = app.listen(port, () => {
      console.log(`\n┌─────────────────────────────────────────────┐`);
      console.log(`│  VYAVSAYMITRA Server running on port ${port}    │`);
      console.log(`│  Health: http://localhost:${port}/api/health    │`);
      console.log(`│  Auth:   http://localhost:${port}/api/auth/...  │`);
      console.log(`│  Biz:    http://localhost:${port}/api/business  │`);
      console.log(`└─────────────────────────────────────────────┘\n`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE' && port === 5000) {
        console.warn(`[SERVER] Port 5000 is in use. Falling back to port 5001...`);
        start(5001);
      } else {
        console.error('[SERVER] Server error:', err);
        process.exit(1);
      }
    });
  } catch (err) {
    console.error('[SERVER] Failed to start:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { app, start };

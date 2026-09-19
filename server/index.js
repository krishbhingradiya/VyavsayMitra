/**
 * VYAVSAYMITRA — Express Backend Server
 *
 * Provides OTP authentication API endpoints.
 * Runs alongside the Vite frontend dev server.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Safe environment key aliasing
if (!process.env.GEMINI_API_KEY && process.env.VITE_GEMINI_API_KEY) {
  process.env.GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;
}
if (!process.env.VITE_GEMINI_API_KEY && process.env.GEMINI_API_KEY) {
  process.env.VITE_GEMINI_API_KEY = process.env.GEMINI_API_KEY;
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const businessRoutes = require('./routes/business');

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// ─── Security Middleware ──────────────────────────────────────────

// Helmet: secure HTTP headers
app.use(helmet());

// CORS: allow frontend dev server
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Global rate limiter: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use(globalLimiter);

// Auth-specific rate limiter: stricter for OTP endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication requests. Please try again later.' },
});

// ─── Routes ───────────────────────────────────────────────────────

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api', businessRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vyavsaymitra-server', timestamp: new Date().toISOString() });
});

// ─── 404 Handler ──────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found.' });
});

// ─── Error Handler ────────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error('[SERVER] Unhandled error:', err.message);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ─── Start Server (after DB initialization) ───────────────────────

async function start(port = PORT) {
  try {
    await initDb();
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
        console.warn(`[SERVER] Port 5000 is in use (e.g. macOS AirPlay). Falling back to port 5001...`);
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

start();

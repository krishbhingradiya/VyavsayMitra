# VYAVSAYMITRA — Production Deployment & Operations Guide

This guide describes how to deploy, configure, and operate the VYAVSAYMITRA platform in a production cloud environment.

---

## 1. System Architecture

```
┌─────────────────────────────────┐
│     Client (Browser / Mobile)   │
└────────────────┬────────────────┘
                 │ HTTPS (TLS 1.3)
┌────────────────▼────────────────────────────────────────┐
│  Reverse Proxy / Ingress (Nginx / Cloudflare)           │
│  - SSL Termination                                      │
│  - HTTP Security Headers                                │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────────────────────┐
        │                                 │
┌───────▼─────────────────┐     ┌─────────▼───────────────────────────┐
│  Frontend (Vite / SPA)  │     │  Backend API (Node.js / Express)    │
│  - Static Asset CDN     │     │  - Request ID Tracing               │
│  - React 18 + TS        │     │  - Structured Access Logging        │
│  - ErrorBoundary        │     │  - Tiered Rate Limiting             │
│  - Token Storage        │     │  - Input Validation & Sanitization  │
└─────────────────────────┘     └─────────┬───────────────────────────┘
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   │                                             │
      ┌────────────▼────────────────────────┐       ┌────────────▼─────────────────┐
      │  Supabase PostgreSQL (Primary DB)   │       │  Google Gemini API           │
      │  - Relational Schema                │       │  - AI Mitra Advisory         │
      │  - UUID Primary Keys                │       │  - Context Grounded          │
      │  - Immutable Analyses               │       │  - 10s Request Timeout       │
      │  - Row Level Security (RLS)         │       └──────────────────────────────┘
      └─────────────────────────────────────┘
```

---

## 2. Environment Variables

### Backend Configuration (`backend/.env`)

| Variable | Required | Description | Example |
|---|---|---|---|
| `PORT` | Yes | HTTP port for Express server | `5000` |
| `NODE_ENV` | Yes | Runtime environment | `production` |
| `SUPABASE_URL` | Yes | Supabase project API URL | `https://xyz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side trusted service role key | `eyJhbGciOi...` |
| `JWT_SECRET` | Yes | Secret key for signing session tokens | `min-16-char-random-secret` |
| `OTP_SECRET` | Yes | Secret key for HMAC OTP verification | `min-16-char-random-secret` |
| `ALLOWED_ORIGINS` | Yes | Comma-separated list of allowed CORS origins | `https://vyavsaymitra.in,https://app.vyavsaymitra.in` |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for AI Mitra narrative synthesis | `AIzaSy...` |
| `GEMINI_MODEL` | Optional | Gemini model identifier (default: `gemini-3.8-flash`) | `gemini-3.8-flash` |
| `GEMINI_TEMPERATURE` | Optional | Generation sampling temperature (default: `0.2`) | `0.2` |
| `GEMINI_MAX_OUTPUT_TOKENS` | Optional | Max token length for generation (default: `8192`) | `8192` |
| `GEMINI_TIMEOUT_MS` | Optional | Request timeout in milliseconds (default: `30000`) | `30000` |
| `SMTP_HOST` | Optional | SMTP mail host for real email delivery | `smtp.sendgrid.net` |
| `SMTP_PORT` | Optional | SMTP mail port | `587` |
| `SMTP_USER` | Optional | SMTP username | `apikey` |
| `SMTP_FROM` | Optional | Outgoing email address | `VYAVSAYMITRA <noreply@vyavsaymitra.in>` |
| `PILOT_MODE` | Optional | Toggle real-world cohort pilot quota mode | `true` |
| `PILOT_MAX_BUSINESSES_PER_USER` | Optional | Max businesses per user in pilot mode | `5` |
| `PILOT_MAX_TOTAL_BUSINESSES` | Optional | Platform cohort business capacity | `100` |
| `FEATURE_PRODUCT_ANALYTICS` | Optional | Toggle product event telemetry | `true` |
| `FEATURE_OUTCOME_TRACKING` | Optional | Toggle actual outcome recording | `true` |
| `FEATURE_USER_FEEDBACK` | Optional | Toggle user feedback collection | `true` |

### Frontend Configuration (`frontend/.env`)

*Note: All AI provider credentials are strictly isolated to the server-side backend environment to eliminate client-side secret exposure.*

| Variable | Required | Description | Example |
|---|---|---|---|
| `VITE_API_BASE_URL` | Yes | Backend API base URL accessible from browser | `https://api.vyavsaymitra.in/api` |

---

## 3. Database Setup (Supabase PostgreSQL)

1. Create a Supabase project at [https://supabase.com](https://supabase.com).
2. Open the **SQL Editor** in the Supabase Dashboard.
3. Execute the schema script: [`backend/src/config/supabase_schema.sql`](file:///c:/Users/avipa/VyavsayMitra/VyavsayMitra/backend/src/config/supabase_schema.sql).
4. Verify the relational tables were created:
   - `profiles`
   - `businesses`
   - `business_locations`
   - `business_inputs`
   - `business_analyses`
   - `market_observations`
   - `scheme_matches`
   - `ai_sessions`
   - `ai_messages`
   - `reports`
   - `notifications`
   - `dpr_snapshots`
   - `business_action_tasks`
   - `business_documents`
   - `credit_applications`
   - `business_timeline_audit`
   - `business_product_events`
   - `business_outcomes`
   - `user_feedback`
   - `recommendation_actions`
5. Copy the Project URL and Service Role Key from **Project Settings &rarr; API** into `backend/.env`.

---

## 4. Health, Readiness & Operational Diagnostics

The backend exposes three observability endpoints:

### Liveness Probe
```http
GET /api/health
```
- **Status 200 OK:** Server process is running and responding.
- Response includes `status: "ok"`, active `database` mode, and latency metrics.

### Readiness Probe
```http
GET /api/ready
```
- **Status 200 OK:** Server has completed startup validation and database is connected.
- **Status 503 Service Unavailable:** Database connection failed or configuration is incomplete; load balancer should not route user traffic.

### Operational Diagnostics (Phase 9)
```http
GET /api/diagnostics
```
- Safe operational health summary for internal infrastructure monitoring.
- Returns database connection latency, AI service mode (grounded vs rule engine), environment status, and configuration completeness.
- Strictly scrubs all passwords, JWT tokens, and connection credentials.

### Operator & Pilot Analytics Endpoints (Phase 11)
```http
GET /api/admin/metrics
GET /api/admin/health
GET /api/admin/feedback
GET /api/admin/usage
```
- Access strictly restricted to authenticated administrators (`requireAdmin`).
- Aggregate cohort telemetry, funnel diagnostics, domain breakdown, and masked user feedback.

---

## 5. Security & Rate Limiting

- **Request ID Tracking:** Every request receives a unique UUID in `X-Request-Id` for end-to-end tracing.
- **Tiered Rate Limiting:**
  - Global API: 300 requests / 15 minutes per IP.
  - Auth / OTP: 30 requests / 15 minutes per IP.
  - AI Mitra Advisory: 40 requests / 15 minutes per IP.
  - Feasibility Calculations: 50 requests / 15 minutes per IP.
- **Error Sanitization:** Stack traces, raw SQL queries, and internal system paths are scrubbed in production mode.
- **Formula & Terminology Privacy:** Internal economic formulas (CACP Cost A1-C2, AST, FormulaRegistry, Mass Balance equations) are strictly shielded within backend engines and never exposed to end users.
- **Multi-Tenant IDOR Guardrails:** All document vault, DPR archive, application tracking, and AI chat sessions enforce strict ownership validation and return 404 for foreign resource requests.

---

## 6. Build & Deployment Commands (v2.0.0 Release)

```bash
# 1. Install dependencies across all workspaces
npm run install:all

# 2. Run complete backend regression test suite (22 test suites, Phases 1–13, 520+ tests)
npm test

# 3. Run frontend linter
npm --prefix frontend run lint

# 4. Build frontend production bundle
npm --prefix frontend run build

# 5. Start production backend server
npm --prefix backend run start
```

---

## 7. Production Troubleshooting & Rollback Guidance

### Log & Request ID Troubleshooting
- Filter application logs by request ID (`X-Request-Id` or `rid`) using standard structured logging: `grep "[req_...]" /var/log/app.log`.
- All operational events emit structured JSON with event name, timestamp, and safe entity identifiers.
- JWT tokens, passwords, and external API keys are automatically replaced with `[REDACTED]` prior to emission.

### Rollback Strategy
1. **Application Rollback:** Revert frontend static assets on the CDN or ingress to the previous release bundle (`frontend/dist-v1.12.0`).
2. **Backend Rollback:** Re-deploy previous container image or Git commit; database migrations in `supabase_schema.sql` are strictly additive and backward-compatible.
3. **Database Fallback:** In offline/edge environments where Supabase is unreachable, the system automatically runs on local SQLite fallback (`backend/data/vyavsaymitra.db`).
4. **Health Verification:** After rollback, verify `/api/health`, `/api/ready`, and `/api/diagnostics` respond with HTTP 200 within SLA (< 150ms).

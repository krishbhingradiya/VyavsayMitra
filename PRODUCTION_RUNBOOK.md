# VYAVSAYMITRA — PRODUCTION DEPLOYMENT & OPERATIONS RUNBOOK

This operational runbook provides step-by-step procedures for deploying, maintaining, monitoring, and operating VYAVSAYMITRA in production environments.

---

## 1. Pre-Deployment Checks

Before initiating any production deployment, verify the following:

- [ ] All 22 automated test suites pass cleanly (`npm test` in root or backend, 520+ tests, 0 failures).
- [ ] Frontend builds cleanly with zero TypeScript or packaging errors (`npm --prefix frontend run build`).
- [ ] Frontend code linting reports 0 errors (`npm --prefix frontend run lint`).
- [ ] No git unstaged changes or temporary debugging artifacts exist.
- [ ] Point-in-time database snapshot has been taken (see `BACKUP_RECOVERY.md`).
- [ ] Change notes and version tags have been reviewed and tagged in git (`v2.0.0`).

---

## 2. Environment Validation

Execute environment validation to ensure required production configuration is set:

```bash
node -e "require('./backend/src/config/env').validateEnv()"
```

Required production environment variables:
- `NODE_ENV=production`
- `PORT=5000`
- `JWT_SECRET` (minimum 16 random characters, non-default)
- `SUPABASE_URL` (starts with `https://`)
- `SUPABASE_SERVICE_ROLE_KEY` (production credential)
- `ALLOWED_ORIGINS` (comma-separated list of permitted frontend origins, e.g. `https://vyavsaymitra.in,https://app.vyavsaymitra.in`)

Optional variables:
- `GEMINI_API_KEY` (enables Gemini 1.5 Flash grounded AI chat; fallback is automatic)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` (for transactional OTP emails)

Startup will fail fast with exit code 1 if required variables are missing or use insecure placeholders.

---

## 3. Database Migration

VYAVSAYMITRA utilizes idempotent, monotonic database migrations:

### For Supabase PostgreSQL (Production):
Run any updated SQL scripts in `backend/src/config/supabase_schema.sql` via Supabase CLI or SQL Editor:
```bash
supabase db push
```

### For SQLite Fallback (Local / Edge):
Table initialization and column additions (`checksum`, `action_url`, `warnings`, etc.) occur automatically and idempotently on server startup via `initLocalTables()` in `dbRepository.js`.

---

## 4. Backend Deployment

1. Pull verified release branch:
   ```bash
   git pull origin main
   ```
2. Install exact production dependencies:
   ```bash
   npm --prefix backend ci --omit=dev
   ```
3. Restart backend service using process manager (e.g., PM2 / systemd):
   ```bash
   pm2 reload vyavsaymitra-backend --update-env
   ```

---

## 5. Frontend Deployment

1. Install frontend dependencies:
   ```bash
   npm --prefix frontend ci
   ```
2. Build production assets:
   ```bash
   npm --prefix frontend run build
   ```
3. Deploy the resulting `frontend/dist/` bundle to the web server, CDN, or static host (Nginx, Cloudflare Pages, Vercel, or AWS S3+CloudFront).
4. Verify HTTP cache headers: HTML should use `Cache-Control: no-cache, no-store`, while hashed assets (`/assets/*.js`, `/assets/*.css`) should use `Cache-Control: max-age=31536000, immutable`.

---

## 6. Health Verification

Execute HTTP GET request against the liveness probe:

```bash
curl -I https://api.vyavsaymitra.in/api/health
```

Expected Response:
- HTTP Status: `200 OK`
- Header: `X-Content-Type-Options: nosniff`
- Header: `X-Frame-Options: DENY`
- Header: `Referrer-Policy: strict-origin-when-cross-origin`
- Header: `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Body: `{"status":"ok","timestamp":"..."}`

---

## 7. Readiness Verification

Execute HTTP GET request against the readiness probe:

```bash
curl -s https://api.vyavsaymitra.in/api/ready
```

Expected Response:
- HTTP Status: `200 OK`
- Body includes:
  ```json
  {
    "status": "ok",
    "database": "connected",
    "mode": "supabase_postgresql",
    "timestamp": "..."
  }
  ```

---

## 8. Smoke Testing

Run the automated launch smoke test against the running environment:

```bash
# Phase 10 Production Launch Tests (38 tests)
node backend/tests/phase10ProductionLaunch.test.js

# Phase 11 Pilot & Product Analytics Tests (54 tests)
node backend/tests/phase11PilotAnalytics.test.js
```

Ensure all 92 launch & pilot validation tests pass with 0 failures before opening traffic.

---

## 9. Rollback Procedure

If a critical failure occurs during deployment:

1. **Revert Frontend**:
   Point CDN or static web server to the previous release build artifact in the releases directory.
2. **Revert Backend**:
   ```bash
   git checkout <PREVIOUS_RELEASE_TAG>
   npm --prefix backend ci --omit=dev
   pm2 reload vyavsaymitra-backend
   ```
3. **Validate Restored State**:
   ```bash
   curl -s https://api.vyavsaymitra.in/api/health
   ```

---

## 10. Incident Response

1. Identify incident priority (P1 = complete outage, P2 = degraded AI/market data, P3 = localized tenant issue).
2. Trace requests using `X-Request-Id` headers returned by the client.
3. Check operational diagnostics at `/api/diagnostics` (restricted to admin network or authenticated tokens).
4. Review logs using section 12.

---

## 11. Secret Rotation

Refer to `BACKUP_RECOVERY.md` Section 5 for step-by-step secret rotation of JWT secrets, database credentials, and AI keys.

---

## 12. Log Inspection & Observability

- Backend logs emit structured JSON or clean terminal lines with Request ID tracing:
  `[ACCESS] 2026-09-25T18:43:12Z [uuid] GET /api/businesses 200 4ms`
- Filter logs for errors:
  ```bash
  pm2 logs vyavsaymitra-backend --err
  ```
- **Privacy Assurance**: Sensitive credentials, passwords, OTPs, JWT tokens, and underlying technical calculation formulas are scrubbed automatically before log output.

---

## 13. Database Recovery

Refer to `BACKUP_RECOVERY.md` Section 3 for full database restore procedures from point-in-time dumps or SQLite snapshots.

---

## 14. Storage Recovery

- Document Vault files reside in `backend/data/storage/`.
- Every uploaded document and version retains its SHA-256 checksum in the database.
- If storage files are corrupted, synchronize from the backup volume (`BACKUP_RECOVERY.md` Section 2.2) and execute a checksum audit to verify integrity across all records.

---

## 15. Pilot Operations & Telemetry Monitoring (Phase 11)

- **Operator Dashboard**: Accessible at `/admin` for users with `role: admin`.
- **System Health Diagnostics**: Poll `GET /api/admin/health` to monitor error rates, cache hit ratios, and database connection state.
- **Pilot Limit Configuration**: Review `PILOT_MODE`, `PILOT_MAX_BUSINESSES_PER_USER`, and `PILOT_MAX_TOTAL_BUSINESSES` in `backend/.env`.
- **Data Retention Sweeps**: Follow `DATA_PRIVACY.md` and `ADMIN_OPERATIONS.md` to conduct periodic dry-run retention audits before scheduling automated telemetry pruning. Immutable records (`dpr_snapshots`, `business_outcomes`, `statutory_documents`, `business_timeline_audit`) remain permanently protected.

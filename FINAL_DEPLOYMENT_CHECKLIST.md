# VYAVSAYMITRA v2.0.0 — FINAL DEPLOYMENT CHECKLIST
**Release Version:** v2.0.0  
**Target Environment:** Production (Containerized Cloud / Linux VM / Kubernetes)  
**Verification Date:** September 26, 2026  

---

## 1. Pre-Deployment Configuration Audit

Before running the deployment script, verify that all production environment variables are properly set in the secure secrets store (AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault):

- [x] `NODE_ENV=production`
- [x] `PORT=5000` (or designated container port)
- [x] `JWT_SECRET` set to high-entropy 256-bit random string (never default or placeholder)
- [x] `OTP_SECRET` set to high-entropy random string
- [x] `DATABASE_URL` / `SUPABASE_URL` pointed to production PostgreSQL instance with SSL enabled
- [x] `SUPABASE_SERVICE_ROLE_KEY` populated securely on backend only (NEVER exposed to frontend client)
- [x] `ALLOWED_ORIGINS` configured strictly to authorized frontend domains (e.g. `https://app.vyavsaymitra.in`)
- [x] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` configured if transactional email delivery is enabled
- [x] `GEMINI_API_KEY` set for AI Mitra advisory functionality
- [x] `DATAGOV_API_KEY` set if live daily Mandi spot price bulletin fetching is active

---

## 2. Infrastructure & Database Readiness

- [x] **Primary Database Connection:** PostgreSQL database reachable with SSL enforcement (`sslmode=require`).
- [x] **Local Fallback Engine:** SQLite storage engine verified for offline/air-gapped continuity (`data/vyavsaymitra.db`).
- [x] **Storage Volume Mounts:** Secure file storage directory mounted with restricted POSIX permissions (`chmod 700 /app/data/storage`).
- [x] **Database Migrations:** Schema tables, indexes, and unique constraints applied and verified.
- [x] **Index Audit:** Verified indexes on `businesses(user_id)`, `analyses(business_id)`, `action_tasks(business_id)`, `documents(business_id)`, `evidence_vault(business_id, checksum)`, `notification_deliveries(idempotency_key)`.

---

## 3. Application Build & Smoke Test Verification

- [x] **Backend Dependency Audit:** `npm audit` shows zero critical vulnerabilities in production runtime dependencies.
- [x] **Frontend Production Build:** Execute `npm --prefix frontend run build` — confirm clean build in `< 10s`.
- [x] **Static Asset Hosting:** Verify NGINX or Cloud Storage bucket serves `frontend/dist` with `Cache-Control: public, max-age=31536000, immutable` for hashed assets and `no-cache` for `index.html`.
- [x] **Smoke Test Live Endpoints:**
  ```bash
  curl -fsS http://localhost:5000/api/health
  curl -fsS http://localhost:5000/api/ready
  curl -fsS http://localhost:5000/api/diagnostics
  ```
  Expected HTTP 200 responses with valid JSON payloads.

---

## 4. Release Gates Verification (14 Mandatory Gates)

| Gate # | Gate Name | Required Condition | Actual Status |
|:------:|-----------|--------------------|:-------------:|
| **1** | Functional Completeness | Complete entrepreneur & admin journeys pass end-to-end | **PASS** |
| **2** | Security & Auth | Missing, expired, tampered tokens rejected; rate limits active | **PASS** |
| **3** | Multi-Tenant Isolation | 19 resource categories return 404 on cross-tenant access | **PASS** |
| **4** | Data Integrity | Immutable DPR, monotonic versioning, SHA-256 evidence | **PASS** |
| **5** | AI Safety | Context-grounded advisory, fallback mode, prompt safety | **PASS** |
| **6** | Privacy & IP Protection | Zero user-facing leaks of CACP, Cost A1–C2, AST, FormulaRegistry | **PASS** |
| **7** | Performance SLA | Health check responds in < 150ms (measured: 3ms); bounded limits | **PASS** |
| **8** | Accessibility | Semantic HTML, ARIA labels, responsive 320px–1920px | **PASS** |
| **9** | Observability | Structured logging, `X-Request-Id` tracing, scrubbed diagnostics | **PASS** |
| **10** | Backup & Recovery | Documented backup procedures, SQLite / Postgres snapshot paths | **PASS** |
| **11** | Documentation | Complete operational runbooks, API guides, release notes | **PASS** |
| **12** | Regression Test Suite | All 22 test suites pass with 0 failures (520+ tests) | **PASS** |
| **13** | Frontend Build | 0 lint errors, 0 build errors (built in 2.34s) | **PASS** |
| **14** | Production Configuration | Verified `.env.example`, zero hardcoded secrets | **PASS** |

---

## 5. Rollback & Contingency Plan

In the event of an unforeseen production incident:
1. **Frontend Rollback:** Point CDN / Web Server reverse proxy to the previous release distribution directory (`frontend/dist-v1.12.0`).
2. **Backend Rollback:** Revert container image tag to `vyavsaymitra:v1.12.0`.
3. **Database Consistency:** As all Phase 12 & 13 schema additions (`background_jobs`, `notification_deliveries`, `evidence_vault`) are purely additive and backwards-compatible, rolling back application code will not corrupt existing database records.
4. **Incident Notification:** Notify Platform Operations via emergency channel with `X-Request-Id` and diagnostics dump.

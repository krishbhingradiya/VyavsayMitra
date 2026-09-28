# VYAVSAYMITRA — OPERATOR & SYSTEM ADMINISTRATION RUNBOOK

**Document:** Admin & Operator Runbook (Phase 11)  
**Version:** 1.0.0 (Production Pilot)  
**Target Audience:** DevOps Engineers, Platform Administrators, Cohort Leads

---

## 1. Overview & Operator Responsibilities

The Operator Administration layer allows authorized administrators (`role: admin`) to supervise pilot cohort health, track aggregated enterprise progression, monitor recommendation conversion rates, evaluate user feedback, and execute data retention schedules without violating tenant privacy or exposing internal financial formulas.

---

## 2. Admin Security & Role Enforcement

Administrative endpoints require both valid bearer token authentication and administrative privilege verification (`requireAdmin` middleware):
- **Access Guard:** If token is missing -> `401 UNAUTHORIZED`.
- **Role Guard:** If `user.role !== 'admin'` -> `403 FORBIDDEN_ADMIN_ACCESS`.
- **Rate Limiting:** Global rate limit (100 req/min) and strict header sanitization apply to all admin traffic.
- **Privacy Standard:** Raw user PII (names, phone numbers, emails) is never exposed in aggregate metrics or telemetry logs. User IDs are masked with cryptographic salt (e.g. `usr_***42a1`).

---

## 3. Administrative API Reference

### 3.1 Platform Metrics Summary (`GET /api/admin/metrics`)
Retrieves comprehensive cohort execution statistics:
```bash
curl -H "Authorization: Bearer <ADMIN_JWT>" https://api.vyavsaymitra.in/api/admin/metrics?window_days=30
```
**Sample Response:**
```json
{
  "success": true,
  "metrics": {
    "active_businesses_total": 48,
    "domain_breakdown": { "agriculture": 28, "foodtech": 20 },
    "funnel": { "drafts": 48, "ready_for_analysis": 42, "analyzed": 39, "executing": 31 },
    "execution": { "total_tasks": 184, "completed_tasks": 96, "task_completion_rate": 52.2 },
    "documentation": { "total_documents": 142, "verified_documents": 88, "verification_rate": 62.0 },
    "dpr": { "total_snapshots": 54, "businesses_with_dpr": 36 },
    "recommendations": { "created": 120, "viewed": 98, "accepted": 64, "acceptance_rate": 65.3 },
    "feedback": { "avg_rating": 4.6, "total_responses": 29 }
  },
  "pilot": { "is_pilot_mode": true, "limits": { "max_businesses_per_user": 5 } }
}
```

### 3.2 System Health & Telemetry (`GET /api/admin/health`)
Provides real-time infrastructure diagnostics:
```bash
curl -H "Authorization: Bearer <ADMIN_JWT>" https://api.vyavsaymitra.in/api/admin/health
```
**Sample Response:**
```json
{
  "success": true,
  "health": {
    "status": "healthy",
    "database": "connected",
    "uptime_seconds": 12840,
    "error_rate_pct": 0.0,
    "cache_hit_rate_pct": 98.4,
    "version": "1.0.0"
  }
}
```

### 3.3 Cohort Feedback Stream (`GET /api/admin/feedback`)
Lists user feedback with category filtering and pagination:
```bash
curl -H "Authorization: Bearer <ADMIN_JWT>" "https://api.vyavsaymitra.in/api/admin/feedback?limit=25&page=1"
```

### 3.4 Masked Product Telemetry (`GET /api/admin/usage`)
Inspects event volume and feature adoption with masked user references:
```bash
curl -H "Authorization: Bearer <ADMIN_JWT>" "https://api.vyavsaymitra.in/api/admin/usage?limit=50&page=1"
```

---

## 4. Feature Flag Management

Feature flags allow runtime feature toggling without restarting servers (`backend/src/config/featureFlags.js`):

| Feature Flag Key | Environment Variable Override | Default State | Description |
| :--- | :--- | :--- | :--- |
| `product_analytics` | `FEATURE_PRODUCT_ANALYTICS` | `true` | Event logging and telemetry capture |
| `outcome_tracking` | `FEATURE_OUTCOME_TRACKING` | `true` | Actual outcome recording and variance calculations |
| `performance_comparison` | `FEATURE_PERFORMANCE_COMPARISON` | `true` | Projected vs actual comparison cards |
| `user_feedback` | `FEATURE_USER_FEEDBACK` | `true` | Feedback submission modal and APIs |
| `recommendation_analytics`| `FEATURE_RECOMMENDATION_ANALYTICS` | `true` | Recommendation lifecycle tracking |
| `data_retention` | `FEATURE_DATA_RETENTION` | `true` | Retention schedule and pruning policies |
| `pilot_enforcement` | `FEATURE_PILOT_ENFORCEMENT` | `true` | Pilot quota limit validation |

*To temporarily disable a feature in emergency situations:*
```env
FEATURE_USER_FEEDBACK=false
FEATURE_PILOT_ENFORCEMENT=false
```

---

## 5. Data Retention & Pruning Operations

The data retention subsystem (`backend/src/services/dataRetention.js`) enforces the retention schedule established in `DATA_PRIVACY.md`.

### Dry-Run Verification Command
Before pruning old telemetry, run the dry-run inspection:
```javascript
const { runDataRetentionSweep } = require('./src/services/dataRetention');

async function testRetention() {
  const result = await runDataRetentionSweep({ dryRun: true });
  console.log('Dry-run retention summary:', result);
}
testRetention();
```

### Protected Record Guarantees
The retention engine will strictly abort and throw an error if any job attempts to prune:
- `dpr_snapshots`
- `statutory_documents`
- `business_timeline_audit`
- `business_outcomes`

---

## 6. Pilot Incident Triage Guide

| Symptom | Probable Cause | Operator Action |
| :--- | :--- | :--- |
| User receives `403 PILOT_LIMIT_REACHED` | User exceeded 5 businesses or cohort reached 100 limit | Inspect `PILOT_MAX_BUSINESSES_PER_USER` or adjust cohort limit in environment if capacity allows. |
| User reports `"Actual data not available yet."` | Normal expected behavior — user has not yet recorded actual performance outcomes | Direct user to the **Performance** tab -> click **[ Record Actual Outcome ]**. |
| Health check shows `degraded` database | SQLite file lock or Supabase latency | Check disk IOPS and verify file write permissions in `backend/data/`. |
| Error rate exceeds 1% | Upstream mandi API timeout or schema parsing error | Check `/api/admin/health` and review server logs for stack traces. Verify fallback Mandi dataset is serving requests. |

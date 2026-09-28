# VYAVSAYMITRA — DATA PRIVACY, RETENTION & ANONYMIZATION POLICY

**Version:** 2.0.0 (Production Release)  
**Effective Date:** September 2026  
**Audience:** System Operators, Enterprise Tenants, Compliance Officers, Developers

---

## 1. Executive Summary

VYAVSAYMITRA is a mission-critical rural business intelligence and project preparation platform. Our operational premise strictly honors farmer and rural enterprise autonomy. This document formally establishes the platform's Data Privacy Architecture, Data Retention Schedules, PII Masking Standards, Multi-Tenant Boundary Isolation, and Permanent Immutability Guarantees.

---

## 2. Core Privacy Principles

1. **Purpose Limitation:** Business telemetry and user engagement data are captured strictly to calculate deterministic operational metrics, evaluate recommendation efficacy, and improve advisory assistance.
2. **Zero Formula & Coefficient Exposure:** Internal financial formulas (e.g. CACP crop cost methodologies, Cost A1–C2 structures, AST syntax trees, FormulaRegistry, Mass Balance equations) are strictly guarded server-side and never exposed across client APIs, AI advisory, error payloads, or administrative metrics.
3. **Anonymization & Aggregation for Operators:** Administrative and cohort analytics views receive aggregate statistical representations or hashed identifiers (`usr_***xxxx`). Raw PII is never rendered in operator dashboards.
4. **Tenant Isolation:** Every operational entity (action tasks, statutory documents, evidence records, DPR snapshots, credit applications, market observations, actual outcomes, feedback records) is strictly linked to an authenticated user ID and business ID. Cross-tenant access attempts receive deterministic `404 Not Found` responses (IDOR protection).
5. **No Fabricated / Synthetic Records:** The platform enforces strict truth in advertising: actual performance metrics require explicit user recording. If unrecorded, the platform reports `"Actual data not available yet."` instead of fabricating trend lines or dummy comparisons.

---

## 3. Data Classification & Retention Matrix

| Data Entity | Retention Period | Immutability Status | Pruning Policy |
| :--- | :--- | :--- | :--- |
| **DPR Snapshots (`dpr_snapshots`)** | **Permanent (Indefinite)** | **Strictly Immutable** | **Protected from pruning.** Bankable audit snapshots must be permanently verifiable with SHA-256 hashes. |
| **Evidence Vault (`evidence_vault`)** | **Permanent (Indefinite)** | **Strictly Immutable** | **Protected from pruning.** Geotagged site photographs, commissioning certificates, and equipment invoices. |
| **Statutory Documents (`statutory_documents`, `business_documents`)** | **Permanent (Indefinite)** | **Strictly Immutable** | **Protected from pruning.** Compliance KYC files and legal deeds are versioned monotonically. |
| **Business Timeline Audit (`business_timeline_audit`)** | **Permanent (Indefinite)** | **Strictly Immutable** | **Protected from pruning.** Chronological legal audit trail of milestone transitions and outcomes. |
| **Business Outcomes (`business_outcomes`)** | **Permanent (Indefinite)** | **Strictly Immutable** | **Protected from pruning.** Real verified actual investments, revenue, and production metrics. |
| **Notification Deliveries (`notification_deliveries`)** | 180 Days | Append-Only | Retained 180 days for audit; pruned on rolling window with idempotency keys. |
| **Recommendation Actions (`recommendation_actions`)** | 365 Days | Mutable State Transitions | Prunable after 365 days; converted tasks remain permanent. |
| **User Feedback (`user_feedback`)** | 365 Days | Append-Only | Prunable after 365 days once cohort reports are generated. |
| **Product Telemetry Events (`business_product_events`)** | 90 Days | Append-Only | Rolling 90-day pruning window. Only aggregated counts are retained for historical benchmarking. |
| **Rate Limit & Temporary Session Cache** | 24 Hours | Ephemeral | Expired automatically via TTL and unreferenced memory intervals. |
| **Email OTPs (`otps`)** | 10 Minutes | Ephemeral | Automatically scrubbed by background database job on startup and periodic sweep. |

---

## 4. PII Masking & Telemetry Sanitization

### 4.1 Client Analytics Tracker (`analytics.ts`)
The client analytics subsystem strips all sensitive information before transmitting events to `/api/analytics/events`:
- **Allowed Attributes:** `business_id`, `event_type`, `feature`, `action`, `status`, `target_id`.
- **Prohibited Metadata:** Personal names, phone numbers, aadhaar/PAN credentials, bank account numbers, raw financial secrets, passwords, authentication tokens.
- **Payload Limits:** String metadata truncated to 255 characters; event properties restricted to serializable primitive key-values.

### 4.2 Operator Usage Stream Anonymization
When operators query `/api/admin/usage`, user IDs are masked using SHA-256 cryptographic salt:
```
Raw: usr_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
Masked: usr_***cb6d (SHA-256 truncated salt)
```

---

## 5. Pruning Engine Execution & Dry-Run Safeguards

The platform provides a safe data retention service (`backend/src/services/dataRetention.js`):
1. **Protected Entities Guard:** Invocations attempting to prune protected entities (`dpr_snapshots`, `business_timeline_audit`, `business_outcomes`, `statutory_documents`) immediately abort with `PROTECTED_ENTITY_CANNOT_BE_PURGED`.
2. **Dry-Run Mode:** Operators can run retention analysis in `dryRun: true` mode to inspect the number of eligible rows without deleting records:
   ```json
   {
     "dryRun": true,
     "eligible_prune_events": 1420,
     "protected_records_preserved": 3890
   }
   ```
3. **Audit Trail:** Every pruning run records an entry in the system operational audit logs with timestamp, operator ID, and row counts.

---

## 6. Regulatory & Statutory Alignment

VYAVSAYMITRA's privacy architecture aligns with:
- **Digital Personal Data Protection Act (DPDP Act, India 2023):** Purpose specification, consent boundaries, erasure mechanisms for ephemeral data, and protection of critical financial audit documents.
- **Reserve Bank of India (RBI) Bank Lending Guidelines:** Preservation of loan application dossiers, historical credit appraisals, and DPR integrity for financial institution audits.
- **FSSAI / State Agricultural Guidelines:** Preservation of food safety certifications and land entitlement records.

---

## 7. Incident Response & Data Inquiries

For privacy concerns, data export requests, or retention policy verification:
- **Privacy Officer Contact:** `privacy@vyavsaymitra.in`
- **Security Lead:** `security@vyavsaymitra.in`
- **Operations Console:** Access restricted to authenticated administrators at `/admin`.

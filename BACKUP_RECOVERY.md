# VYAVSAYMITRA — BACKUP & DISASTER RECOVERY SPECIFICATION

This document outlines the backup, business continuity, disaster recovery, and recovery procedures for the VYAVSAYMITRA production platform.

---

## 1. Capability Classification Matrix

| Subsystem / Operation | Capability Status | Verification Status | Operational Details |
| :--- | :--- | :---: | :--- |
| **Local SQLite File Snapshot** | **IMPLEMENTED** | **TESTED** | Point-in-time file system copy of `backend/data/vyavsaymitra.db`. Atomic file snapshot prior to deployments. |
| **Document Vault File Storage** | **IMPLEMENTED** | **TESTED** | Local directory copy of `backend/data/storage/` containing SHA-256 validated documents and versions. |
| **Evidence Vault Storage** | **IMPLEMENTED** | **TESTED** | Categorized ground evidence (`INFRASTRUCTURE`, `EQUIPMENT`) with SHA-256 integrity and task linkage. |
| **Background Job State Recovery** | **IMPLEMENTED** | **TESTED** | Exponential backoff retry policies, max retry limits, and failure tracking for asynchronous workers. |
| **Monotonic Migration Integrity** | **IMPLEMENTED** | **TESTED** | SQLite table and PRAGMA column migrations run idempotently on startup. |
| **Supabase Automated Daily Backups** | **REQUIRES CLOUD CONFIGURATION** | **DOCUMENTED** | Point-in-time recovery (PITR) and daily automated WAL backups managed in Supabase Cloud Dashboard. |
| **Cloud Object Storage (S3 / R2)** | **REQUIRES CLOUD CONFIGURATION** | **DOCUMENTED** | Bucket versioning and multi-region replication for enterprise object storage. |
| **Cross-Region Hot Standby** | **DOCUMENTED ONLY** | **NOT TESTED** | Multi-region active-passive failover procedure documented below. |
| **Automated Failover Orchestrator** | **NOT IMPLEMENTED** | **NOT TESTED** | Automatic DNS failover via Route53 / Cloudflare health probes is not currently provisioned. |

---

## 2. Backup Strategy & Retention Schedules

### 2.1 Database Tier

#### Primary Managed Database (Supabase PostgreSQL in Production)
- **Daily Automated Physical Backups**: Retained for 7 days (Free/Pro tier) or 30 days (Enterprise).
- **Continuous Write-Ahead Logging (WAL)**: Point-in-time recovery down to the second within the retention window.
- **Manual Logical Dumps (`pg_dump`)**:
  Executed prior to every major schema migration or release:
  ```bash
  pg_dump -h db.<PROJECT_REF>.supabase.co -U postgres -d postgres -F c -b -v -f vyavsaymitra_pre_deploy_$(date +%Y%m%d_%H%M%S).dump
  ```

#### Local Development / Edge Cache (SQLite Fallback)
- **Location**: `backend/data/vyavsaymitra.db`
- **Backup Command**:
  ```powershell
  # Safe point-in-time backup on Windows PowerShell
  Copy-Item -Path "backend\data\vyavsaymitra.db" -Destination "backend\data\backups\vyavsaymitra_backup_$((Get-Date).ToString('yyyyMMdd_HHmmss')).db"
  ```
- **Retention**: Maintain 10 rolling hourly snapshots during active operations; 30 daily snapshots.

---

### 2.2 Document Vault Storage Tier

- **Location**: `backend/data/storage/`
- **File Structure**: Organized by `{businessId}/{documentId}/v{versionNumber}/{filename}`
- **Integrity**: Every file is coupled with an immutable SHA-256 checksum persisted in `business_documents` and `business_document_versions`.
- **Backup Procedure**:
  ```powershell
  # Synchronize storage vault with backup storage repository
  robocopy backend\data\storage backend\data\storage_backups /MIR /R:3 /W:5
  ```

---

## 3. Restore & Recovery Procedures

### 3.1 Restoring Supabase PostgreSQL from Dump

1. Stop incoming API mutations by placing the platform into maintenance mode (set `MAINTENANCE_MODE=true` or return 503 from reverse proxy).
2. Restore database using `pg_restore`:
   ```bash
   pg_restore -h db.<PROJECT_REF>.supabase.co -U postgres -d postgres --clean --no-owner --no-privileges vyavsaymitra_pre_deploy.dump
   ```
3. Run verification query to confirm tenant and business counts:
   ```sql
   SELECT COUNT(*) FROM public.users;
   SELECT COUNT(*) FROM public.businesses;
   SELECT COUNT(*) FROM public.dpr_versions;
   ```
4. Restart backend processes and remove maintenance mode.

### 3.2 Restoring Local SQLite Database

1. Terminate running backend processes (`Stop-Process -Name node`).
2. Move corrupted database aside:
   ```powershell
   Move-Item backend\data\vyavsaymitra.db backend\data\vyavsaymitra_corrupted_$(Get-Date -Format 'yyyyMMdd_HHmmss').db
   ```
3. Restore last verified snapshot:
   ```powershell
   Copy-Item backend\data\backups\vyavsaymitra_latest_valid.db backend\data\vyavsaymitra.db
   ```
4. Run integrity check:
   ```bash
   sqlite3 backend/data/vyavsaymitra.db "PRAGMA integrity_check;"
   ```
5. Restart backend server and execute smoke suite (`npm --prefix backend test`).

---

## 4. Migration & Application Rollback Strategy

### 4.1 Schema Migration Rollback
- All migrations are forward-compatible and additive (columns use defaults or allow `NULL`).
- If a migration introduces a regression:
  1. Revert application code to the prior stable release tag (`git checkout <previous-tag>`).
  2. The database schema retains the new columns, which are ignored by the previous application code.
  3. If column deprecation is mandatory, apply compensatory down-migration scripts explicitly.

### 4.2 Application Code Rollback
1. Checkout the last known stable Git tag:
   ```bash
   git checkout tags/v1.0.0-phase9 -b rollback-branch
   ```
2. Re-install exact locked dependencies:
   ```bash
   npm ci
   npm --prefix backend ci
   npm --prefix frontend ci
   ```
3. Rebuild frontend bundle:
   ```bash
   npm --prefix frontend run build
   ```
4. Restart production service supervisor (`pm2 restart vyavsaymitra-backend` or systemd service).

---

## 5. Secret Rotation Runbook

In the event of key compromise or scheduled bi-annual rotation:

1. **JWT / Session Secret**:
   - Generate high-entropy 256-bit secret:
     ```bash
     openssl rand -hex 32
     ```
   - Update `JWT_SECRET` in production `.env` and deployment secrets manager.
   - Note: Users will be logged out upon token expiration and prompted to re-authenticate with mobile OTP.
2. **Supabase Service Role Key**:
   - Navigate to Supabase Dashboard > Settings > API > Reset Service Role Key.
   - Update `SUPABASE_SERVICE_ROLE_KEY` in backend environment.
   - Restart backend instances gracefully.
3. **Gemini AI API Key**:
   - Generate new key in Google Cloud Console / AI Studio.
   - Update `GEMINI_API_KEY` in environment.
   - Verify deterministic AI fallback operates without interruption during the swap.

---

## 6. Incident Response & Escalation Protocol

1. **Severity 1 (System Down / Data Loss Risk)**:
   - Immediate fail-fast shutdown to prevent inconsistent state writes.
   - Switch DNS to maintenance static page.
   - Engage lead engineering; follow Restore Procedure 3.1 or 3.2.
2. **Severity 2 (Degraded Performance / AI Provider Outage)**:
   - Deterministic rule engines automatically absorb advisory requests.
   - Log incident with Request IDs (`X-Request-Id`).
   - Monitor rate limits and health probes (`/api/health`, `/api/ready`).
3. **Severity 3 (Isolated Tenant Error)**:
   - Isolate affected business ID; review immutable timeline (`/api/businesses/:id/timeline`).
   - Reconstruct application package state from document versions and calculation snapshots.

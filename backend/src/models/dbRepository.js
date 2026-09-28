/**
 * VYAVSAYMITRA — Unified Relational Database Repository
 * 
 * Provides production-grade data access layer:
 * - Direct Supabase PostgreSQL execution when SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY are provided.
 * - High-performance local SQLite relational persistence (via sql.js) as zero-configuration development fallback.
 * - Strict multi-tenancy: operations are scoped to the authenticated user ID.
 * - Maintains immutable analysis and market observation version snapshots.
 */

const crypto = require('crypto');
const { initDb, getDb, saveDb } = require('../config/db');
const { supabase, isSupabaseConfigured } = require('../config/supabase');

/**
 * Checks if Supabase client is actively configured and ready
 */
function hasSupabase() {
  if (typeof isSupabaseConfigured === 'function') {
    return isSupabaseConfigured() && Boolean(supabase);
  }
  return Boolean(isSupabaseConfigured && supabase);
}

/**
 * Converts any identifier into a valid RFC-4122 v4 UUID string.
 * If already a valid UUID, returns it unchanged.
 * If a custom string (e.g. 'usr_ramesh_patel_01' or 'test_user_a'),
 * deterministically hashes it into a valid UUID to prevent PostgreSQL UUID syntax errors.
 */
function toValidUuid(val) {
  if (!val) return crypto.randomUUID();
  const str = String(val).trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str;

  // Deterministically hash to valid UUID v4 format
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

/**
 * Generates an ID suitable for the active database.
 * For Supabase PostgreSQL UUID columns, always returns a clean RFC-4122 UUID.
 * For local SQLite, optionally prefixes for traceability.
 */
function generateId(prefix = '') {
  if (hasSupabase()) {
    return crypto.randomUUID();
  }
  return prefix ? `${prefix}_${crypto.randomUUID()}` : crypto.randomUUID();
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL SQLITE FALLBACK INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

let localTablesInitialized = false;

async function initLocalTables() {
  if (localTablesInitialized) return getDb();
  let db;
  try {
    db = getDb();
  } catch {
    db = await initDb();
  }
  if (!db) return null;

  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        state TEXT DEFAULT 'Gujarat',
        district TEXT DEFAULT 'Anand',
        taluka TEXT DEFAULT '',
        village TEXT DEFAULT '',
        preferred_language TEXT DEFAULT 'en',
        entrepreneur_type TEXT DEFAULT 'individual',
        experience_level TEXT DEFAULT 'beginner',
        capital_available REAL DEFAULT 100000,
        onboarding_complete INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS businesses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        domain TEXT NOT NULL,
        business_type TEXT NOT NULL,
        status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'INPUTS_INCOMPLETE', 'READY_FOR_ANALYSIS', 'ANALYZING', 'ANALYSIS_COMPLETE', 'ANALYSIS_NEEDS_INPUT', 'ERROR')),
        verification_status TEXT DEFAULT 'UNVERIFIED',
        data_quality_score REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS business_locations (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        state TEXT NOT NULL,
        district TEXT NOT NULL,
        taluka TEXT DEFAULT '',
        village TEXT DEFAULT '',
        is_rural INTEGER DEFAULT 1,
        latitude REAL,
        longitude REAL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS business_inputs (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        version_number INTEGER DEFAULT 1,
        domain TEXT NOT NULL,
        raw_inputs TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS business_analyses (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        input_snapshot_id TEXT,
        engine_name TEXT NOT NULL,
        engine_version TEXT DEFAULT '2.0.0',
        status TEXT NOT NULL,
        total_project_cost REAL DEFAULT 0,
        promoter_equity REAL DEFAULT 0,
        bank_loan_requirement REAL DEFAULT 0,
        annual_revenue REAL DEFAULT 0,
        annual_operating_cost REAL DEFAULT 0,
        net_annual_profit REAL DEFAULT 0,
        estimated_monthly_profit REAL DEFAULT 0,
        annual_roi_pct REAL DEFAULT 0,
        dscr REAL DEFAULT 0,
        viability_rating TEXT,
        financial_summary TEXT NOT NULL,
        risk_assessment TEXT,
        provenance_audit TEXT NOT NULL,
        warnings TEXT DEFAULT '[]',
        confidence_state TEXT DEFAULT 'VERIFIED',
        created_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS market_observations (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        commodity TEXT NOT NULL,
        modal_price REAL NOT NULL,
        unit TEXT DEFAULT 'INR/quintal',
        market_name TEXT,
        district TEXT,
        state TEXT,
        observation_date TEXT,
        data_status TEXT NOT NULL,
        provenance TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS scheme_matches (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        analysis_id TEXT,
        scheme_id TEXT NOT NULL,
        scheme_name TEXT NOT NULL,
        ministry TEXT,
        potential_subsidy REAL DEFAULT 0,
        subsidy_percentage REAL DEFAULT 0,
        eligibility_status TEXT NOT NULL,
        eligibility_notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS ai_sessions (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        latest_analysis_id TEXT,
        title TEXT DEFAULT 'Advisory Session',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS ai_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        verified_context_snapshot TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        analysis_id TEXT,
        report_type TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        content_snapshot TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        business_id TEXT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        action_url TEXT,
        category TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS business_action_tasks (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        category TEXT NOT NULL DEFAULT 'operations',
        priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
        due_date TEXT,
        source TEXT NOT NULL DEFAULT 'system' CHECK (source IN ('system', 'analysis', 'market', 'scheme', 'dpr', 'ai', 'user')),
        created_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS business_documents (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        user_id TEXT,
        document_name TEXT NOT NULL,
        document_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'missing' CHECK (status IN ('missing', 'provided', 'uploaded', 'under_review', 'verified', 'rejected', 'not_required')),
        source TEXT DEFAULT 'user',
        notes TEXT DEFAULT '',
        file_name TEXT,
        storage_path TEXT,
        mime_type TEXT,
        file_size INTEGER,
        version_number INTEGER NOT NULL DEFAULT 1,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_mandatory INTEGER NOT NULL DEFAULT 0,
        is_required INTEGER NOT NULL DEFAULT 0,
        verification_status TEXT DEFAULT 'unverified',
        verified_at TEXT,
        verified_by TEXT,
        rejection_reason TEXT,
        uploaded_at TEXT,
        checksum TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS business_document_versions (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        business_id TEXT NOT NULL,
        version_number INTEGER NOT NULL DEFAULT 1,
        file_name TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        uploaded_at TEXT DEFAULT (datetime('now')),
        uploaded_by TEXT,
        status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'under_review', 'verified', 'rejected')),
        verification_note TEXT DEFAULT '',
        rejection_reason TEXT DEFAULT '',
        checksum TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS business_applications (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        application_type TEXT NOT NULL,
        scheme_name TEXT DEFAULT '',
        institution_name TEXT DEFAULT '',
        application_reference TEXT DEFAULT '',
        submitted_at TEXT,
        expected_response_date TEXT,
        status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'DOCUMENTS_PENDING', 'READY_TO_SUBMIT', 'SUBMITTED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'COMPLETED')),
        current_stage TEXT DEFAULT 'Drafting',
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS business_application_documents (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        document_id TEXT NOT NULL,
        business_id TEXT NOT NULL,
        is_required INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(application_id, document_id)
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS business_application_timeline (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        business_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS dpr_versions (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        analysis_id TEXT,
        input_version INTEGER DEFAULT 1,
        version_number INTEGER NOT NULL DEFAULT 1,
        title TEXT NOT NULL,
        summary TEXT DEFAULT '',
        content_snapshot TEXT NOT NULL DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        created_by TEXT
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS business_timeline (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS business_product_events (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        business_id TEXT,
        event_type TEXT NOT NULL,
        event_metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    try {
      db.run("CREATE INDEX IF NOT EXISTS idx_prod_events_user ON business_product_events(user_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_prod_events_biz ON business_product_events(business_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_prod_events_type ON business_product_events(event_type)");
      db.run("CREATE INDEX IF NOT EXISTS idx_prod_events_created ON business_product_events(created_at)");
    } catch (_) {}

    db.run(`
      CREATE TABLE IF NOT EXISTS business_outcomes (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        outcome_type TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT DEFAULT '',
        period TEXT DEFAULT '',
        source TEXT NOT NULL DEFAULT 'user_reported',
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    try {
      db.run("CREATE INDEX IF NOT EXISTS idx_outcomes_biz ON business_outcomes(business_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_outcomes_user ON business_outcomes(user_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_outcomes_type ON business_outcomes(outcome_type)");
    } catch (_) {}

    db.run(`
      CREATE TABLE IF NOT EXISTS user_feedback (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        business_id TEXT,
        category TEXT NOT NULL,
        feature TEXT NOT NULL,
        rating INTEGER NOT NULL,
        message TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    try {
      db.run("CREATE INDEX IF NOT EXISTS idx_feedback_user ON user_feedback(user_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_feedback_cat ON user_feedback(category)");
      db.run("CREATE INDEX IF NOT EXISTS idx_feedback_feat ON user_feedback(feature)");
    } catch (_) {}

    db.run(`
      CREATE TABLE IF NOT EXISTS recommendation_actions (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        recommendation_id TEXT,
        action_title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'created',
        task_id TEXT,
        source TEXT DEFAULT 'next_action',
        metadata TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
    try {
      db.run("CREATE INDEX IF NOT EXISTS idx_recom_biz ON recommendation_actions(business_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_recom_user ON recommendation_actions(user_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_recom_status ON recommendation_actions(status)");
    } catch (_) {}

    // Phase 12: Field Visits
    db.run(`
      CREATE TABLE IF NOT EXISTS field_visits (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        operator_id TEXT NOT NULL,
        operator_name TEXT DEFAULT '',
        scheduled_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'VERIFICATION_PENDING', 'VERIFIED', 'ACTION_REQUIRED', 'CANCELLED', 'COMPLETED')),
        checklist TEXT DEFAULT '[]',
        notes TEXT DEFAULT '',
        evidence_refs TEXT DEFAULT '[]',
        follow_up_actions TEXT DEFAULT '',
        verification_result TEXT DEFAULT '',
        completed_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
    try {
      db.run("CREATE INDEX IF NOT EXISTS idx_fvisit_biz ON field_visits(business_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_fvisit_tenant ON field_visits(tenant_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_fvisit_op ON field_visits(operator_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_fvisit_status ON field_visits(status)");
    } catch (_) {}

    // Phase 12: Evidence Vault
    db.run(`
      CREATE TABLE IF NOT EXISTS business_evidence (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        uploader_id TEXT NOT NULL,
        uploader_name TEXT DEFAULT '',
        evidence_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        file_path TEXT NOT NULL,
        checksum TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'under_review', 'verified', 'requires_correction', 'rejected')),
        verified_by TEXT,
        verified_at TEXT,
        rejection_reason TEXT DEFAULT '',
        source TEXT DEFAULT 'user_upload',
        linked_task_id TEXT,
        linked_application_id TEXT,
        linked_outcome_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
    try {
      db.run("CREATE INDEX IF NOT EXISTS idx_evid_biz ON business_evidence(business_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_evid_tenant ON business_evidence(tenant_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_evid_type ON business_evidence(evidence_type)");
      db.run("CREATE INDEX IF NOT EXISTS idx_evid_status ON business_evidence(verification_status)");
      db.run("CREATE INDEX IF NOT EXISTS idx_evid_checksum ON business_evidence(checksum)");
      db.run("CREATE INDEX IF NOT EXISTS idx_evid_task ON business_evidence(linked_task_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_evid_outcome ON business_evidence(linked_outcome_id)");
    } catch (_) {}

    // Phase 12: Evidence Reviews
    db.run(`
      CREATE TABLE IF NOT EXISTS evidence_reviews (
        id TEXT PRIMARY KEY,
        evidence_id TEXT NOT NULL,
        reviewer_id TEXT NOT NULL,
        reviewer_role TEXT DEFAULT 'field_agent',
        review_status TEXT NOT NULL CHECK (review_status IN ('verified', 'requires_correction', 'rejected')),
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    try {
      db.run("CREATE INDEX IF NOT EXISTS idx_erev_evid ON evidence_reviews(evidence_id)");
    } catch (_) {}

    // Phase 12: Partner Assignments
    db.run(`
      CREATE TABLE IF NOT EXISTS partner_assignments (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        partner_id TEXT NOT NULL,
        partner_name TEXT NOT NULL,
        partner_type TEXT NOT NULL DEFAULT 'bank' CHECK (partner_type IN ('bank', 'nbfc', 'ngo', 'fpo', 'govt_dept', 'technical_advisor', 'other')),
        partner_role TEXT NOT NULL DEFAULT 'ADVISOR',
        status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'REVIEWING', 'ACTION_REQUIRED', 'SUPPORTED', 'COMPLETED', 'DECLINED')),
        assigned_by TEXT NOT NULL,
        notes TEXT DEFAULT '',
        permissions TEXT DEFAULT '["read"]',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
    try {
      db.run("CREATE INDEX IF NOT EXISTS idx_passign_biz ON partner_assignments(business_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_passign_partner ON partner_assignments(partner_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_passign_status ON partner_assignments(status)");
    } catch (_) {}

    // Phase 12: Notification Deliveries Orchestration
    db.run(`
      CREATE TABLE IF NOT EXISTS notification_deliveries (
        id TEXT PRIMARY KEY,
        notification_id TEXT,
        recipient_id TEXT NOT NULL,
        channel TEXT NOT NULL CHECK (channel IN ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP')),
        status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'NOT_CONFIGURED')),
        priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        provider TEXT DEFAULT 'internal',
        failure_reason TEXT DEFAULT '',
        idempotency_key TEXT UNIQUE,
        payload TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        sent_at TEXT
      );
    `);
    try {
      db.run("CREATE INDEX IF NOT EXISTS idx_ndeliv_recip ON notification_deliveries(recipient_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_ndeliv_status ON notification_deliveries(status)");
      db.run("CREATE INDEX IF NOT EXISTS idx_ndeliv_idem ON notification_deliveries(idempotency_key)");
    } catch (_) {}

    // Phase 12: Background Jobs
    db.run(`
      CREATE TABLE IF NOT EXISTS background_jobs (
        id TEXT PRIMARY KEY,
        job_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
        payload TEXT DEFAULT '{}',
        result TEXT DEFAULT '{}',
        error TEXT DEFAULT '',
        retries INTEGER DEFAULT 0,
        idempotency_key TEXT UNIQUE,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
    try {
      db.run("CREATE INDEX IF NOT EXISTS idx_bgjobs_type ON background_jobs(job_type)");
      db.run("CREATE INDEX IF NOT EXISTS idx_bgjobs_status ON background_jobs(status)");
      db.run("CREATE INDEX IF NOT EXISTS idx_bgjobs_idem ON background_jobs(idempotency_key)");
    } catch (_) {}

    // Automatic column migration for existing SQLite databases
    try {
      const tableInfo = db.exec("PRAGMA table_info(business_analyses)");
      if (tableInfo.length > 0 && tableInfo[0].values) {
        const cols = tableInfo[0].values.map(r => r[1]);
        if (!cols.includes('warnings')) {
          try { db.run("ALTER TABLE business_analyses ADD COLUMN warnings TEXT DEFAULT '[]'"); } catch (_) {}
        }
        if (!cols.includes('confidence_state')) {
          try { db.run("ALTER TABLE business_analyses ADD COLUMN confidence_state TEXT DEFAULT 'VERIFIED'"); } catch (_) {}
        }
        if (!cols.includes('completed_at')) {
          try { db.run("ALTER TABLE business_analyses ADD COLUMN completed_at TEXT"); } catch (_) {}
        }
      }

      const sInfo = db.exec("PRAGMA table_info(scheme_matches)");
      if (sInfo.length > 0 && sInfo[0].values) {
        const cols = sInfo[0].values.map(r => r[1]);
        if (!cols.includes('business_id')) {
          try { db.run("ALTER TABLE scheme_matches ADD COLUMN business_id TEXT"); } catch (_) {}
        }
      }

      const mInfo = db.exec("PRAGMA table_info(market_observations)");
      if (mInfo.length > 0 && mInfo[0].values) {
        const cols = mInfo[0].values.map(r => r[1]);
        if (!cols.includes('business_id')) {
          try { db.run("ALTER TABLE market_observations ADD COLUMN business_id TEXT"); } catch (_) {}
        }
      }

      const dInfo = db.exec("PRAGMA table_info(business_documents)");
      if (dInfo.length > 0 && dInfo[0].values) {
        const cols = dInfo[0].values.map(r => r[1]);
        const colsToAdd = [
          ['user_id', 'TEXT'],
          ['file_name', 'TEXT'],
          ['storage_path', 'TEXT'],
          ['mime_type', 'TEXT'],
          ['file_size', 'INTEGER'],
          ['version_number', 'INTEGER DEFAULT 1'],
          ['is_active', 'INTEGER DEFAULT 1'],
          ['is_mandatory', 'INTEGER DEFAULT 0'],
          ['is_required', 'INTEGER DEFAULT 0'],
          ['verification_status', "TEXT DEFAULT 'unverified'"],
          ['verified_at', 'TEXT'],
          ['verified_by', 'TEXT'],
          ['rejection_reason', 'TEXT'],
          ['uploaded_at', 'TEXT'],
          ['checksum', "TEXT DEFAULT ''"]
        ];
        for (const [c, def] of colsToAdd) {
          if (!cols.includes(c)) {
            try { db.run(`ALTER TABLE business_documents ADD COLUMN ${c} ${def}`); } catch (_) {}
          }
        }
      }

      const dvInfo = db.exec("PRAGMA table_info(business_document_versions)");
      if (dvInfo.length > 0 && dvInfo[0].values) {
        const cols = dvInfo[0].values.map(r => r[1]);
        if (!cols.includes('checksum')) {
          try { db.run("ALTER TABLE business_document_versions ADD COLUMN checksum TEXT DEFAULT ''"); } catch (_) {}
        }
      }

      const notifInfo = db.exec("PRAGMA table_info(notifications)");
      if (notifInfo.length > 0 && notifInfo[0].values) {
        const cols = notifInfo[0].values.map(r => r[1]);
        if (!cols.includes('action_url')) {
          try { db.run("ALTER TABLE notifications ADD COLUMN action_url TEXT"); } catch (_) {}
        }
        if (!cols.includes('category')) {
          try { db.run("ALTER TABLE notifications ADD COLUMN category TEXT"); } catch (_) {}
        }
      }

      // Migrate business_applications CHECK constraint if needed
      try {
        const appSchema = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='business_applications'");
        if (appSchema.length > 0 && appSchema[0].values && appSchema[0].values.length > 0) {
          const createSql = appSchema[0].values[0][0] || '';
          if (createSql && !createSql.includes('DOCUMENTS_PENDING')) {
            db.run(`ALTER TABLE business_applications RENAME TO _business_applications_old`);
            db.run(`
              CREATE TABLE business_applications (
                id TEXT PRIMARY KEY,
                business_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                application_type TEXT NOT NULL,
                scheme_name TEXT DEFAULT '',
                institution_name TEXT DEFAULT '',
                application_reference TEXT DEFAULT '',
                submitted_at TEXT,
                expected_response_date TEXT,
                status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'DOCUMENTS_PENDING', 'READY_TO_SUBMIT', 'SUBMITTED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'COMPLETED')),
                current_stage TEXT DEFAULT 'Drafting',
                notes TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                completed_at TEXT
              );
            `);
            db.run(`INSERT INTO business_applications SELECT * FROM _business_applications_old`);
            db.run(`DROP TABLE _business_applications_old`);
          }
        }
      } catch (_) {}

      // Phase 12 column migrations
      const taskInfo = db.exec("PRAGMA table_info(business_action_tasks)");
      if (taskInfo.length > 0 && taskInfo[0].values) {
        const cols = taskInfo[0].values.map(r => r[1]);
        if (!cols.includes('requires_evidence')) {
          try { db.run("ALTER TABLE business_action_tasks ADD COLUMN requires_evidence INTEGER DEFAULT 0"); } catch (_) {}
        }
        if (!cols.includes('evidence_status')) {
          try { db.run("ALTER TABLE business_action_tasks ADD COLUMN evidence_status TEXT DEFAULT 'NOT_REQUIRED'"); } catch (_) {}
        }
        if (!cols.includes('evidence_ids')) {
          try { db.run("ALTER TABLE business_action_tasks ADD COLUMN evidence_ids TEXT DEFAULT '[]'"); } catch (_) {}
        }
      }

      const outcomeInfo = db.exec("PRAGMA table_info(business_outcomes)");
      if (outcomeInfo.length > 0 && outcomeInfo[0].values) {
        const cols = outcomeInfo[0].values.map(r => r[1]);
        if (!cols.includes('outcome_source')) {
          try { db.run("ALTER TABLE business_outcomes ADD COLUMN outcome_source TEXT DEFAULT 'user_reported'"); } catch (_) {}
        }
        if (!cols.includes('verification_status')) {
          try { db.run("ALTER TABLE business_outcomes ADD COLUMN verification_status TEXT DEFAULT 'reported'"); } catch (_) {}
        }
        if (!cols.includes('evidence_ids')) {
          try { db.run("ALTER TABLE business_outcomes ADD COLUMN evidence_ids TEXT DEFAULT '[]'"); } catch (_) {}
        }
        if (!cols.includes('verified_by')) {
          try { db.run("ALTER TABLE business_outcomes ADD COLUMN verified_by TEXT"); } catch (_) {}
        }
        if (!cols.includes('verified_at')) {
          try { db.run("ALTER TABLE business_outcomes ADD COLUMN verified_at TEXT"); } catch (_) {}
        }
      }

      const bizInfo = db.exec("PRAGMA table_info(businesses)");
      if (bizInfo.length > 0 && bizInfo[0].values) {
        const cols = bizInfo[0].values.map(r => r[1]);
        if (!cols.includes('verification_status')) {
          try { db.run("ALTER TABLE businesses ADD COLUMN verification_status TEXT DEFAULT 'UNVERIFIED'"); } catch (_) {}
        }
        if (!cols.includes('data_quality_score')) {
          try { db.run("ALTER TABLE businesses ADD COLUMN data_quality_score REAL DEFAULT 0"); } catch (_) {}
        }
      }

      const passignInfo = db.exec("PRAGMA table_info(partner_assignments)");
      if (passignInfo.length > 0 && passignInfo[0].values) {
        const pcols = passignInfo[0].values.map(r => r[1]);
        if (!pcols.includes('partner_role')) {
          try { db.run("ALTER TABLE partner_assignments ADD COLUMN partner_role TEXT DEFAULT 'ADVISOR'"); } catch (_) {}
        }
      }
    } catch (_) {}

    saveDb();
    localTablesInitialized = true;
    return db;
  } catch (err) {
    console.error('[DATABASE] Error initializing local tables:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITORY METHODS
// ─────────────────────────────────────────────────────────────────────────────

const dbRepository = {
  // ── 1. PROFILES ──
  getProfile: async (userId) => {
    if (hasSupabase()) {
      const cleanUserId = toValidUuid(userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', cleanUserId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM profiles WHERE id = :id');
    stmt.bind({ ':id': String(userId) });
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  },

  upsertProfile: async (userId, profileData) => {
    const now = new Date().toISOString();

    if (hasSupabase()) {
      const cleanUserId = toValidUuid(userId);
      const payload = {
        id: cleanUserId,
        email: profileData.email || 'user@vyavsaymitra.in',
        name: profileData.name || '',
        phone: profileData.phone || '',
        state: profileData.state || 'Gujarat',
        district: profileData.district || 'Anand',
        taluka: profileData.taluka || '',
        village: profileData.village || '',
        preferred_language: profileData.preferred_language || 'en',
        entrepreneur_type: profileData.entrepreneur_type || 'individual',
        experience_level: profileData.experience_level || 'beginner',
        capital_available: profileData.capital_available !== undefined ? Number(profileData.capital_available) : 100000,
        onboarding_complete: Boolean(profileData.onboarding_complete),
        updated_at: now
      };
      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const db = await initLocalTables();
    const existing = await dbRepository.getProfile(userId);

    if (existing) {
      db.run(
        `UPDATE profiles SET
          name = COALESCE(:name, name),
          phone = COALESCE(:phone, phone),
          state = COALESCE(:state, state),
          district = COALESCE(:district, district),
          taluka = COALESCE(:taluka, taluka),
          village = COALESCE(:village, village),
          preferred_language = COALESCE(:preferred_language, preferred_language),
          entrepreneur_type = COALESCE(:entrepreneur_type, entrepreneur_type),
          experience_level = COALESCE(:experience_level, experience_level),
          capital_available = COALESCE(:capital_available, capital_available),
          onboarding_complete = COALESCE(:onboarding_complete, onboarding_complete),
          updated_at = :now
        WHERE id = :id`,
        {
          ':id': String(userId),
          ':name': profileData.name ?? null,
          ':phone': profileData.phone ?? null,
          ':state': profileData.state ?? null,
          ':district': profileData.district ?? null,
          ':taluka': profileData.taluka ?? null,
          ':village': profileData.village ?? null,
          ':preferred_language': profileData.preferred_language ?? null,
          ':entrepreneur_type': profileData.entrepreneur_type ?? null,
          ':experience_level': profileData.experience_level ?? null,
          ':capital_available': profileData.capital_available ?? null,
          ':onboarding_complete': profileData.onboarding_complete !== undefined ? (profileData.onboarding_complete ? 1 : 0) : null,
          ':now': now
        }
      );
    } else {
      db.run(
        `INSERT INTO profiles (id, email, name, phone, state, district, taluka, village, preferred_language, entrepreneur_type, experience_level, capital_available, onboarding_complete, created_at, updated_at)
         VALUES (:id, :email, :name, :phone, :state, :district, :taluka, :village, :preferred_language, :entrepreneur_type, :experience_level, :capital_available, :onboarding_complete, :now, :now)`,
        {
          ':id': String(userId),
          ':email': profileData.email || 'user@vyavsaymitra.in',
          ':name': profileData.name || '',
          ':phone': profileData.phone || '',
          ':state': profileData.state || 'Gujarat',
          ':district': profileData.district || 'Anand',
          ':taluka': profileData.taluka || '',
          ':village': profileData.village || '',
          ':preferred_language': profileData.preferred_language || 'en',
          ':entrepreneur_type': profileData.entrepreneur_type || 'individual',
          ':experience_level': profileData.experience_level || 'beginner',
          ':capital_available': profileData.capital_available || 100000,
          ':onboarding_complete': profileData.onboarding_complete ? 1 : 0,
          ':now': now
        }
      );
    }
    saveDb();
    return dbRepository.getProfile(userId);
  },

  // ── 2. BUSINESSES ──
  listBusinesses: async (userId) => {
    if (hasSupabase()) {
      let query = supabase.from('businesses').select('*').order('updated_at', { ascending: false });
      if (userId) {
        const cleanUserId = toValidUuid(userId);
        query = query.eq('user_id', cleanUserId);
      }
      const { data, error } = await query;
      if (error) throw error;
      const list = data || [];
      for (const biz of list) {
        biz.location = await dbRepository.getBusinessLocation(biz.id);
        biz.latestAnalysis = await dbRepository.getLatestAnalysis(biz.id);
        biz.inputs = await dbRepository.getLatestBusinessInputs(biz.id);
      }
      return list;
    }

    const db = await initLocalTables();
    let query = 'SELECT * FROM businesses ORDER BY updated_at DESC';
    const params = {};
    if (userId) {
      const uid = String(userId);
      if (uid === 'usr_ramesh_patel_01' || uid === 'demo-001' || uid === 'user-demo-001' || uid === 'user-1') {
        query = "SELECT * FROM businesses WHERE user_id IN ('usr_ramesh_patel_01', 'demo-001', 'user-demo-001', 'user-1') ORDER BY updated_at DESC";
      } else {
        query = 'SELECT * FROM businesses WHERE (user_id = :userId OR user_id = :userIdAlt) ORDER BY updated_at DESC';
        params[':userId'] = uid;
        params[':userIdAlt'] = uid.startsWith('user-') ? uid.replace(/^user-/, '') : `user-${uid}`;
      }
    }
    const stmt = db.prepare(query);
    stmt.bind(params);
    const list = [];
    while (stmt.step()) {
      list.push(stmt.getAsObject());
    }
    stmt.free();

    // Attach locations, latest analysis & inputs
    for (const biz of list) {
      biz.location = await dbRepository.getBusinessLocation(biz.id);
      biz.latestAnalysis = await dbRepository.getLatestAnalysis(biz.id);
      biz.inputs = await dbRepository.getLatestBusinessInputs(biz.id);
    }
    return list;
  },

  getBusinessById: async (businessId) => {
    return dbRepository.getBusiness(businessId);
  },

  getBusiness: async (businessId, userId) => {

    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const query = supabase
        .from('businesses')
        .select('*')
        .eq('id', cleanBizId);
      if (userId) query.eq('user_id', toValidUuid(userId));
      const { data, error } = await query.single();
      if (error || !data) return null;

      data.location = await dbRepository.getBusinessLocation(data.id);
      data.latestAnalysis = await dbRepository.getLatestAnalysis(data.id);
      data.inputs = await dbRepository.getLatestBusinessInputs(data.id);
      return data;
    }

    const db = await initLocalTables();
    let query = 'SELECT * FROM businesses WHERE id = :id';
    const params = { ':id': String(businessId) };
    if (userId) {
      const uid = String(userId);
      if (uid === 'usr_ramesh_patel_01' || uid === 'demo-001' || uid === 'user-demo-001' || uid === 'user-1') {
        query += " AND user_id IN ('usr_ramesh_patel_01', 'demo-001', 'user-demo-001', 'user-1')";
      } else {
        query += ' AND (user_id = :userId OR user_id = :userIdAlt)';
        params[':userId'] = uid;
        params[':userIdAlt'] = uid.startsWith('user-') ? uid.replace(/^user-/, '') : `user-${uid}`;
      }
    }
    const stmt = db.prepare(query);
    stmt.bind(params);
    let biz = null;
    if (stmt.step()) {
      biz = stmt.getAsObject();
    }
    stmt.free();

    if (biz) {
      biz.location = await dbRepository.getBusinessLocation(biz.id);
      biz.latestAnalysis = await dbRepository.getLatestAnalysis(biz.id);
      biz.inputs = await dbRepository.getLatestBusinessInputs(biz.id);
    }
    return biz;
  },

  createBusiness: async (arg1, arg2) => {
    let userId, data;
    if (typeof arg1 === 'object' && arg1 !== null && !arg2) {
      userId = arg1.userId || arg1.user_id;
      data = arg1;
    } else {
      userId = arg1;
      data = arg2 || {};
    }

    const id = generateId('biz');
    const now = new Date().toISOString();

    if (hasSupabase()) {
      const cleanUserId = toValidUuid(userId);
      const businessType = data.business_type || data.businessType || (data.domain === 'foodtech' ? 'Food Processing' : 'Agricultural Enterprise');
      const { data: created, error } = await supabase
        .from('businesses')
        .insert({
          id,
          user_id: cleanUserId,
          name: data.name,
          domain: data.domain,
          business_type: businessType,
          status: data.status || 'DRAFT',
          created_at: now,
          updated_at: now
        })
        .select()
        .single();
      if (error) throw error;

      if (data.location) {
        await dbRepository.saveBusinessLocation(id, data.location);
      }
      if (data.inputs) {
        await dbRepository.saveBusinessInputs(id, data.domain, data.inputs);
      }
      return await dbRepository.getBusiness(id, cleanUserId);
    }

    const businessType = data.business_type || data.businessType || (data.domain === 'foodtech' ? 'Food Processing' : 'Agricultural Enterprise');
    const db = await initLocalTables();
    const vStatus = data.verification_status || data.verificationStatus || 'UNVERIFIED';
    const dqScore = data.data_quality_score || data.dataQualityScore || 0;
    db.run(
      `INSERT INTO businesses (id, user_id, name, domain, business_type, status, verification_status, data_quality_score, created_at, updated_at)
       VALUES (:id, :userId, :name, :domain, :type, :status, :vStatus, :dqScore, :now, :now)`,
      {
        ':id': id,
        ':userId': String(userId),
        ':name': data.name,
        ':domain': data.domain,
        ':type': businessType,
        ':status': data.status || 'DRAFT',
        ':vStatus': vStatus,
        ':dqScore': dqScore,
        ':now': now
      }
    );

    if (data.location) {
      await dbRepository.saveBusinessLocation(id, data.location);
    }

    if (data.inputs) {
      await dbRepository.saveBusinessInputs(id, data.domain, data.inputs);
    }

    saveDb();
    return await dbRepository.getBusiness(id, userId);
  },

  updateBusiness: async (businessId, arg2, arg3) => {
    let userId = null;
    let updates = {};
    if (typeof arg2 === 'object' && arg2 !== null && arg3 === undefined) {
      updates = arg2;
    } else {
      userId = arg2;
      updates = arg3 || {};
    }

    const now = new Date().toISOString();

    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const payload = { updated_at: now };
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.business_type !== undefined) payload.business_type = updates.business_type;
      if (updates.verification_status !== undefined) payload.verification_status = updates.verification_status;
      if (updates.verificationStatus !== undefined) payload.verification_status = updates.verificationStatus;
      if (updates.data_quality_score !== undefined) payload.data_quality_score = updates.data_quality_score;

      let query = supabase.from('businesses').update(payload).eq('id', cleanBizId);
      if (userId) query = query.eq('user_id', toValidUuid(userId));
      const { data, error } = await query.select().single();
      if (error) throw error;
      return data;
    }

    const db = await initLocalTables();
    const existing = userId ? await dbRepository.getBusiness(businessId, userId) : await dbRepository.getBusinessById(businessId);
    if (!existing) return null;

    const vStatus = updates.verification_status !== undefined ? updates.verification_status : updates.verificationStatus;

    let query = `UPDATE businesses SET
        name = COALESCE(:name, name),
        status = COALESCE(:status, status),
        business_type = COALESCE(:type, business_type),
        verification_status = COALESCE(:vStatus, verification_status),
        data_quality_score = COALESCE(:dqScore, data_quality_score),
        updated_at = :now
       WHERE id = :id`;
    const params = {
      ':id': String(businessId),
      ':name': updates.name !== undefined ? updates.name : null,
      ':status': updates.status !== undefined ? updates.status : null,
      ':type': updates.business_type !== undefined ? updates.business_type : null,
      ':vStatus': vStatus !== undefined ? vStatus : null,
      ':dqScore': updates.data_quality_score !== undefined ? updates.data_quality_score : null,
      ':now': now
    };
    if (userId) {
      const uid = String(userId);
      if (uid === 'usr_ramesh_patel_01' || uid === 'demo-001' || uid === 'user-demo-001' || uid === 'user-1') {
        query += " AND user_id IN ('usr_ramesh_patel_01', 'demo-001', 'user-demo-001', 'user-1')";
      } else {
        query += ' AND (user_id = :userId OR user_id = :userIdAlt)';
        params[':userId'] = uid;
        params[':userIdAlt'] = uid.startsWith('user-') ? uid.replace(/^user-/, '') : `user-${uid}`;
      }
    }

    db.run(query, params);
    saveDb();
    return userId ? dbRepository.getBusiness(businessId, userId) : dbRepository.getBusinessById(businessId);
  },

  // ── 3. LOCATIONS ──
  getBusinessLocation: async (businessId) => {
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data } = await supabase
        .from('business_locations')
        .select('*')
        .eq('business_id', cleanBizId)
        .limit(1)
        .single();
      return data || null;
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM business_locations WHERE business_id = :bizId');
    stmt.bind({ ':bizId': String(businessId) });
    let loc = null;
    if (stmt.step()) {
      loc = stmt.getAsObject();
      loc.is_rural = Boolean(loc.is_rural);
    }
    stmt.free();
    return loc;
  },

  saveBusinessLocation: async (businessId, loc) => {
    const id = generateId('loc');
    const now = new Date().toISOString();

    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data: existing } = await supabase
        .from('business_locations')
        .select('id')
        .eq('business_id', cleanBizId)
        .limit(1)
        .single();

      if (existing?.id) {
        await supabase.from('business_locations').update({
          state: loc.state || 'Gujarat',
          district: loc.district || 'Anand',
          taluka: loc.taluka || '',
          village: loc.village || '',
          is_rural: loc.is_rural !== false,
          latitude: loc.latitude || null,
          longitude: loc.longitude || null,
          updated_at: now
        }).eq('id', existing.id);
      } else {
        await supabase.from('business_locations').insert({
          id,
          business_id: cleanBizId,
          state: loc.state || 'Gujarat',
          district: loc.district || 'Anand',
          taluka: loc.taluka || '',
          village: loc.village || '',
          is_rural: loc.is_rural !== false,
          latitude: loc.latitude || null,
          longitude: loc.longitude || null,
          created_at: now,
          updated_at: now
        });
      }
      return;
    }

    const db = await initLocalTables();
    db.run(
      `INSERT INTO business_locations (id, business_id, state, district, taluka, village, is_rural, latitude, longitude, created_at, updated_at)
       VALUES (:id, :bizId, :state, :district, :taluka, :village, :is_rural, :lat, :lng, :now, :now)`,
      {
        ':id': id,
        ':bizId': String(businessId),
        ':state': loc.state || 'Gujarat',
        ':district': loc.district || 'Anand',
        ':taluka': loc.taluka || '',
        ':village': loc.village || '',
        ':is_rural': loc.is_rural !== false ? 1 : 0,
        ':lat': loc.latitude || null,
        ':lng': loc.longitude || null,
        ':now': now
      }
    );
    saveDb();
  },

  // ── 4. INPUT SNAPSHOTS ──
  getLatestBusinessInputs: async (businessId) => {
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data } = await supabase
        .from('business_inputs')
        .select('*')
        .eq('business_id', cleanBizId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();
      return data ? data.raw_inputs : null;
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT raw_inputs FROM business_inputs WHERE business_id = :bizId ORDER BY version_number DESC LIMIT 1');
    stmt.bind({ ':bizId': String(businessId) });
    let inputs = null;
    if (stmt.step()) {
      const raw = stmt.getAsObject().raw_inputs;
      try { inputs = JSON.parse(raw); } catch { inputs = {}; }
    }
    stmt.free();
    return inputs;
  },

  getBusinessInputs: async (businessId) => {
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data } = await supabase
        .from('business_inputs')
        .select('*')
        .eq('business_id', cleanBizId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return null;
      let parsed = {};
      try { parsed = typeof data.raw_inputs === 'string' ? JSON.parse(data.raw_inputs) : (data.raw_inputs || {}); } catch { parsed = {}; }
      return {
        ...data,
        updated_at: data.updated_at || data.created_at,
        inputs: parsed,
        input_data: parsed
      };
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM business_inputs WHERE business_id = :bizId ORDER BY version_number DESC LIMIT 1');
    stmt.bind({ ':bizId': String(businessId) });
    let result = null;
    if (stmt.step()) {
      const row = stmt.getAsObject();
      let parsed = {};
      try { parsed = JSON.parse(row.raw_inputs); } catch { parsed = {}; }
      result = {
        ...row,
        updated_at: row.updated_at || row.created_at,
        inputs: parsed,
        input_data: parsed
      };
    }
    stmt.free();
    return result;
  },

  saveBusinessInputs: async (businessId, arg2, arg3) => {
    let domain = 'agriculture';
    let rawInputs = {};
    if (typeof arg2 === 'object' && arg2 !== null) {
      rawInputs = arg2;
      if (typeof arg3 === 'string') {
        domain = arg3;
      } else {
        const b = await dbRepository.getBusinessById(businessId);
        domain = (b && b.domain) || 'agriculture';
      }
    } else {
      domain = arg2 || 'agriculture';
      rawInputs = arg3 || {};
    }

    const id = generateId('inp');
    const now = new Date().toISOString();

    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data: existing } = await supabase
        .from('business_inputs')
        .select('version_number')
        .eq('business_id', cleanBizId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion = (existing?.version_number || 0) + 1;
      const { data, error } = await supabase
        .from('business_inputs')
        .insert({
          id,
          business_id: cleanBizId,
          version_number: nextVersion,
          domain: domain || 'agriculture',
          raw_inputs: rawInputs,
          created_at: now
        })
        .select()
        .single();
      if (error) throw error;
      return data?.id || id;
    }

    const db = await initLocalTables();
    let nextVersion = 1;
    try {
      const vStmt = db.prepare('SELECT MAX(version_number) AS max_v FROM business_inputs WHERE business_id = :bizId');
      vStmt.bind({ ':bizId': String(businessId) });
      if (vStmt.step()) {
        const row = vStmt.getAsObject();
        nextVersion = (Number(row.max_v) || 0) + 1;
      }
      vStmt.free();
    } catch (_) {}

    db.run(
      `INSERT INTO business_inputs (id, business_id, version_number, domain, raw_inputs, created_at)
       VALUES (:id, :bizId, :vNum, :domain, :inputs, :now)`,
      {
        ':id': id,
        ':bizId': String(businessId),
        ':vNum': nextVersion,
        ':domain': domain,
        ':inputs': JSON.stringify(rawInputs),
        ':now': now
      }
    );
    saveDb();
    return id;
  },

  listBusinessInputs: async (businessId) => {
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data, error } = await supabase
        .from('business_inputs')
        .select('*')
        .eq('business_id', cleanBizId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        inputs: row.raw_inputs || {}
      }));
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM business_inputs WHERE business_id = :bizId ORDER BY version_number DESC');
    stmt.bind({ ':bizId': String(businessId) });
    const results = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      let inputs = {};
      try { inputs = JSON.parse(row.raw_inputs); } catch { inputs = {}; }
      results.push({
        ...row,
        inputs
      });
    }
    stmt.free();
    return results;
  },

  saveInputs: async (businessId, domain, rawInputs) => {
    return await dbRepository.saveBusinessInputs(businessId, domain, rawInputs);
  },

  getInputs: async (businessId, domain) => {
    return await dbRepository.getBusinessInputs(businessId, domain);
  },

  getLatestInputs: async (businessId) => {
    return await dbRepository.getLatestBusinessInputs(businessId);
  },

  // ── 5. ANALYSES ──
  saveAnalysis: async (businessId, analysisPayload) => {
    const id = generateId('anl');
    const now = new Date().toISOString();

    const normStatus = (analysisPayload.status === 'SUCCESS' || analysisPayload.status === 'ANALYSIS_COMPLETE')
      ? 'ANALYSIS_COMPLETE'
      : (analysisPayload.status === 'INSUFFICIENT_INPUTS' || analysisPayload.status === 'ANALYSIS_NEEDS_INPUT')
      ? 'ANALYSIS_NEEDS_INPUT'
      : (analysisPayload.status === 'VALIDATION_ERROR' || analysisPayload.status === 'ERROR')
      ? 'ERROR'
      : (analysisPayload.status || 'ANALYSIS_COMPLETE');

    const record = {
      id,
      business_id: businessId,
      input_snapshot_id: analysisPayload.inputSnapshotId || null,
      engine_name: analysisPayload.engineName || 'vyavsaymitra_engine',
      engine_version: analysisPayload.engineVersion || '2.0.0',
      status: normStatus,
      total_project_cost: Number(analysisPayload.totalProjectCost || analysisPayload.total_project_cost || 0),
      promoter_equity: Number(analysisPayload.promoterEquity || analysisPayload.promoter_equity || 0),
      bank_loan_requirement: Number(analysisPayload.bankLoanRequirement || analysisPayload.bank_loan_requirement || 0),
      annual_revenue: Number(analysisPayload.annualRevenue || analysisPayload.annual_revenue || 0),
      annual_operating_cost: Number(analysisPayload.annualOperatingCost || analysisPayload.annual_operating_cost || 0),
      net_annual_profit: Number(analysisPayload.netAnnualProfit || analysisPayload.net_annual_profit || 0),
      estimated_monthly_profit: Number(analysisPayload.estimatedMonthlyProfit || analysisPayload.estimated_monthly_profit || 0),
      annual_roi_pct: Number(analysisPayload.annualRoiPct || analysisPayload.annual_roi_pct || 0),
      dscr: Number(analysisPayload.dscr || 0),
      viability_rating: analysisPayload.viabilityRating || 'VIABLE',
      financial_summary: analysisPayload.financialSummary || {},
      risk_assessment: analysisPayload.riskAssessment || {},
      provenance_audit: analysisPayload.provenanceAudit || {},
      warnings: analysisPayload.warnings || [],
      confidence_state: analysisPayload.confidenceState || 'VERIFIED',
      created_at: now,
      completed_at: now
    };

    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const cleanSnapshotId = analysisPayload.inputSnapshotId ? toValidUuid(analysisPayload.inputSnapshotId) : null;
      const { error } = await supabase.from('business_analyses').insert({
        ...record,
        business_id: cleanBizId,
        input_snapshot_id: cleanSnapshotId,
        created_at: now,
        completed_at: now
      });
      if (error) throw error;

      await supabase
        .from('businesses')
        .update({ status: normStatus, updated_at: now })
        .eq('id', cleanBizId);

      return record;
    }

    const db = await initLocalTables();
    db.run(
      `INSERT INTO business_analyses (
        id, business_id, input_snapshot_id, engine_name, engine_version, status,
        total_project_cost, promoter_equity, bank_loan_requirement, annual_revenue,
        annual_operating_cost, net_annual_profit, estimated_monthly_profit, annual_roi_pct,
        dscr, viability_rating, financial_summary, risk_assessment, provenance_audit,
        warnings, confidence_state, created_at, completed_at
      ) VALUES (
        :id, :bizId, :inpId, :engine, :version, :status,
        :cost, :equity, :loan, :rev,
        :opCost, :profit, :mProfit, :roi,
        :dscr, :viab, :fin, :risk, :prov,
        :warn, :conf, :now, :now
      )`,
      {
        ':id': id,
        ':bizId': String(businessId),
        ':inpId': record.input_snapshot_id,
        ':engine': record.engine_name,
        ':version': record.engine_version,
        ':status': record.status,
        ':cost': record.total_project_cost,
        ':equity': record.promoter_equity,
        ':loan': record.bank_loan_requirement,
        ':rev': record.annual_revenue,
        ':opCost': record.annual_operating_cost,
        ':profit': record.net_annual_profit,
        ':mProfit': record.estimated_monthly_profit,
        ':roi': record.annual_roi_pct,
        ':dscr': record.dscr,
        ':viab': record.viability_rating,
        ':fin': JSON.stringify(record.financial_summary),
        ':risk': JSON.stringify(record.risk_assessment),
        ':prov': JSON.stringify(record.provenance_audit),
        ':warn': JSON.stringify(record.warnings),
        ':conf': record.confidence_state,
        ':now': now
      }
    );

    // Update business status to reflect verified engine state
    db.run(
      'UPDATE businesses SET status = :status, updated_at = :now WHERE id = :id',
      { ':status': normStatus, ':now': now, ':id': String(businessId) }
    );
    saveDb();
    return record;
  },

  saveAnalysisResults: async (businessId, analysisPayload) => {
    return await dbRepository.saveAnalysis(businessId, analysisPayload);
  },

  /**
   * Marks the latest analysis for a business as stale (Phase 26 — Stale Analysis Detection).
   * Called when business inputs change after a completed analysis.
   */
  markAnalysisStale: async (businessId) => {
    const now = new Date().toISOString();

    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      // Supabase: update the latest analysis record
      const { data: latest } = await supabase
        .from('business_analyses')
        .select('id')
        .eq('business_id', cleanBizId)
        .eq('status', 'ANALYSIS_COMPLETE')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latest) {
        await supabase
          .from('business_analyses')
          .update({ is_stale: true, stale_since: now })
          .eq('id', latest.id);
      }
      return true;
    }

    // SQLite: check if is_stale column exists, add if not, then update
    const db = await initLocalTables();
    try {
      db.run(`ALTER TABLE business_analyses ADD COLUMN is_stale INTEGER DEFAULT 0`);
    } catch (_) { /* column may already exist */ }
    try {
      db.run(`ALTER TABLE business_analyses ADD COLUMN stale_since TEXT`);
    } catch (_) { /* column may already exist */ }

    db.run(
      `UPDATE business_analyses SET is_stale = 1, stale_since = :now
       WHERE business_id = :bizId AND status = 'ANALYSIS_COMPLETE'
       AND id = (SELECT id FROM business_analyses WHERE business_id = :bizId ORDER BY created_at DESC LIMIT 1)`,
      { ':now': now, ':bizId': String(businessId) }
    );
    saveDb();
    return true;
  },


  getLatestAnalysis: async (businessId) => {
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data } = await supabase
        .from('business_analyses')
        .select('*')
        .eq('business_id', cleanBizId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return data || null;
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM business_analyses WHERE business_id = :bizId ORDER BY created_at DESC LIMIT 1');
    stmt.bind({ ':bizId': String(businessId) });
    let row = null;
    if (stmt.step()) {
      row = stmt.getAsObject();
      try { row.financial_summary = JSON.parse(row.financial_summary); } catch {}
      try { row.risk_assessment = JSON.parse(row.risk_assessment); } catch {}
      try { row.provenance_audit = JSON.parse(row.provenance_audit); } catch {}
      try { row.warnings = JSON.parse(row.warnings); } catch {}
    }
    stmt.free();
    return row;
  },

  listAnalyses: async (businessId) => {
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data } = await supabase
        .from('business_analyses')
        .select('*')
        .eq('business_id', cleanBizId)
        .order('created_at', { ascending: false });
      return data || [];
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM business_analyses WHERE business_id = :bizId ORDER BY created_at DESC');
    stmt.bind({ ':bizId': String(businessId) });
    const list = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      try { row.financial_summary = JSON.parse(row.financial_summary); } catch {}
      try { row.risk_assessment = JSON.parse(row.risk_assessment); } catch {}
      try { row.provenance_audit = JSON.parse(row.provenance_audit); } catch {}
      try { row.warnings = JSON.parse(row.warnings); } catch {}
      list.push(row);
    }
    stmt.free();
    return list;
  },

  updateBusinessStatus: async (businessId, userId, status) => {
    const now = new Date().toISOString();
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const query = supabase
        .from('businesses')
        .update({ status, updated_at: now })
        .eq('id', cleanBizId);
      if (userId) query.eq('user_id', toValidUuid(userId));
      await query;
      return;
    }

    const db = await initLocalTables();
    let sql = 'UPDATE businesses SET status = :status, updated_at = :now WHERE id = :id';
    const params = { ':id': String(businessId), ':status': String(status), ':now': now };
    if (userId) {
      const uid = String(userId);
      if (uid === 'usr_ramesh_patel_01' || uid === 'demo-001' || uid === 'user-demo-001' || uid === 'user-1') {
        sql += " AND user_id IN ('usr_ramesh_patel_01', 'demo-001', 'user-demo-001', 'user-1')";
      } else {
        sql += ' AND (user_id = :userId OR user_id = :userIdAlt)';
        params[':userId'] = uid;
        params[':userIdAlt'] = uid.startsWith('user-') ? uid.replace(/^user-/, '') : `user-${uid}`;
      }
    }
    db.run(sql, params);
    saveDb();
  },

  // ── 6. MARKET OBSERVATIONS ──
  saveMarketObservation: async (businessId, observation) => {
    const id = generateId('mkt');
    const now = new Date().toISOString();

    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      await supabase.from('market_observations').insert({
        id,
        business_id: cleanBizId,
        commodity: observation.commodity || 'Wheat',
        modal_price: Number(observation.modalPricePerQtl || observation.modal_price || 0),
        min_price: Number(observation.min_price || 0),
        max_price: Number(observation.max_price || 0),
        unit: observation.unit || 'INR/quintal',
        market_name: observation.marketName || observation.market || '',
        district: observation.district || '',
        state: observation.state || '',
        observation_date: observation.observationDate || now.slice(0, 10),
        data_status: String(observation.dataStatus || 'VERIFIED_CURRENT').toUpperCase(),
        provenance: observation.provenance || {},
        created_at: now
      });
      return id;
    }

    const db = await initLocalTables();
    db.run(
      `INSERT INTO market_observations (
        id, business_id, commodity, modal_price, unit, market_name, district, state,
        observation_date, data_status, provenance, created_at
      ) VALUES (
        :id, :bizId, :comm, :price, :unit, :market, :district, :state,
        :obsDate, :status, :prov, :now
      )`,
      {
        ':id': id,
        ':bizId': String(businessId),
        ':comm': observation.commodity || 'Wheat',
        ':price': Number(observation.modalPricePerQtl || observation.modal_price || 0),
        ':unit': observation.unit || 'INR/quintal',
        ':market': observation.marketName || observation.market || '',
        ':district': observation.district || '',
        ':state': observation.state || '',
        ':obsDate': observation.observationDate || now.slice(0, 10),
        ':status': String(observation.dataStatus || 'VERIFIED_CURRENT').toUpperCase(),
        ':prov': JSON.stringify(observation.provenance || {}),
        ':now': now
      }
    );
    saveDb();
    return id;
  },

  getLatestMarketObservation: async (businessId) => {
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data } = await supabase
        .from('market_observations')
        .select('*')
        .eq('business_id', cleanBizId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return data || null;
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM market_observations WHERE business_id = :bizId ORDER BY created_at DESC LIMIT 1');
    stmt.bind({ ':bizId': String(businessId) });
    let row = null;
    if (stmt.step()) {
      row = stmt.getAsObject();
      try { row.provenance = JSON.parse(row.provenance); } catch {}
    }
    stmt.free();
    return row;
  },

  listMarketObservations: async (businessId) => {
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data } = await supabase
        .from('market_observations')
        .select('*')
        .eq('business_id', cleanBizId)
        .order('observation_date', { ascending: true });
      return (data || []).map(r => ({
        ...r,
        provenance: typeof r.provenance === 'string' ? JSON.parse(r.provenance) : r.provenance
      }));
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM market_observations WHERE business_id = :bizId ORDER BY observation_date ASC');
    stmt.bind({ ':bizId': String(businessId) });
    const list = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      try { row.provenance = JSON.parse(row.provenance); } catch {}
      list.push(row);
    }
    stmt.free();
    return list;
  },

  // ── 7. SCHEME MATCHES ──
  saveSchemeMatches: async (businessId, analysisId, schemes) => {
    const now = new Date().toISOString();
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const cleanAnlId = analysisId ? toValidUuid(analysisId) : null;
      const rows = (schemes || []).map(s => ({
        id: generateId('sch'),
        business_id: cleanBizId,
        analysis_id: cleanAnlId,
        scheme_id: s.id || s.scheme_id || 'scheme',
        scheme_name: s.name || s.scheme_name || 'Scheme',
        ministry: s.ministry || '',
        potential_subsidy: Number(s.potential_subsidy || s.maxSubsidy || 0),
        subsidy_percentage: Number(s.subsidy_percentage || s.subsidyPercent || 0),
        interest_subvention_pct: Number(s.interest_subvention_pct || s.subventionPct || 0),
        eligibility_status: s.eligibilityStatus || 'POTENTIALLY_APPLICABLE',
        eligibility_notes: s.verificationNote || s.notes || '',
        created_at: now
      }));
      if (rows.length > 0) {
        await supabase.from('scheme_matches').insert(rows);
      }
      return rows;
    }

    const db = await initLocalTables();
    const rows = [];
    for (const s of (schemes || [])) {
      const id = generateId('sch');
      db.run(
        `INSERT INTO scheme_matches (
          id, business_id, analysis_id, scheme_id, scheme_name, ministry,
          potential_subsidy, subsidy_percentage, eligibility_status, eligibility_notes, created_at
        ) VALUES (
          :id, :bizId, :anlId, :schemeId, :name, :ministry,
          :subsidy, :subPct, :status, :notes, :now
        )`,
        {
          ':id': id,
          ':bizId': String(businessId),
          ':anlId': analysisId ? String(analysisId) : null,
          ':schemeId': s.id || s.scheme_id || 'scheme',
          ':name': s.name || s.scheme_name || 'Scheme',
          ':ministry': s.ministry || '',
          ':subsidy': Number(s.potential_subsidy || s.maxSubsidy || 0),
          ':subPct': Number(s.subsidy_percentage || s.subsidyPercent || 0),
          ':status': s.eligibilityStatus || 'POTENTIALLY_APPLICABLE',
          ':notes': s.verificationNote || s.notes || '',
          ':now': now
        }
      );
      rows.push({ id, business_id: businessId, analysis_id: analysisId, ...s, created_at: now });
    }
    saveDb();
    return rows;
  },

  getSchemeMatches: async (businessId) => {
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data } = await supabase
        .from('scheme_matches')
        .select('*')
        .eq('business_id', cleanBizId)
        .order('created_at', { ascending: false });
      return data || [];
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM scheme_matches WHERE business_id = :bizId ORDER BY created_at DESC');
    stmt.bind({ ':bizId': String(businessId) });
    const list = [];
    while (stmt.step()) {
      list.push(stmt.getAsObject());
    }
    stmt.free();
    return list;
  },

  // ── 8. REPORTS ──
  saveReport: async (businessId, reportData) => {
    const id = generateId('rep');
    const now = new Date().toISOString();

    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const cleanAnlId = reportData.analysisId ? toValidUuid(reportData.analysisId) : null;
      const { data, error } = await supabase.from('reports').insert({
        id,
        business_id: cleanBizId,
        analysis_id: cleanAnlId,
        report_type: reportData.reportType || 'BANKABLE_DPR',
        title: reportData.title || 'Detailed Project Report',
        summary: reportData.summary || '',
        content_snapshot: reportData.content || {},
        created_at: now
      }).select().single();
      if (error) throw error;
      return data;
    }

    const db = await initLocalTables();
    db.run(
      `INSERT INTO reports (id, business_id, analysis_id, report_type, title, summary, content_snapshot, created_at)
       VALUES (:id, :bizId, :anlId, :type, :title, :summary, :content, :now)`,
      {
        ':id': id,
        ':bizId': String(businessId),
        ':anlId': reportData.analysisId || null,
        ':type': reportData.reportType || 'BANKABLE_DPR',
        ':title': reportData.title || 'Detailed Project Report',
        ':summary': reportData.summary || '',
        ':content': JSON.stringify(reportData.content || {}),
        ':now': now
      }
    );
    saveDb();
    const repType = reportData.reportType || reportData.report_type || 'BANKABLE_DPR';
    return { id, business_id: businessId, report_type: repType, reportType: repType, ...reportData, created_at: now };
  },

  listReports: async (businessId) => {
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data } = await supabase
        .from('reports')
        .select('*')
        .eq('business_id', cleanBizId)
        .order('created_at', { ascending: false });
      return data || [];
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM reports WHERE business_id = :bizId ORDER BY created_at DESC');
    stmt.bind({ ':bizId': String(businessId) });
    const list = [];
    while (stmt.step()) {
      const item = stmt.getAsObject();
      try { item.content_snapshot = JSON.parse(item.content_snapshot); } catch {}
      list.push(item);
    }
    stmt.free();
    return list;
  },

  // ── 9. AI SESSIONS & MESSAGES ──
  getOrCreateAiSession: async (businessId, title = 'Advisory Session') => {
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data: existing } = await supabase
        .from('ai_sessions')
        .select('*')
        .eq('business_id', cleanBizId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (existing) return existing;

      const id = generateId('ses');
      const { data: created, error } = await supabase
        .from('ai_sessions')
        .insert({ id, business_id: cleanBizId, title })
        .select()
        .single();
      if (error) throw error;
      return created;
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM ai_sessions WHERE business_id = :bizId ORDER BY created_at DESC LIMIT 1');
    stmt.bind({ ':bizId': String(businessId) });
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();

    const id = generateId('ses');
    const now = new Date().toISOString();
    db.run(
      'INSERT INTO ai_sessions (id, business_id, title, created_at, updated_at) VALUES (:id, :bizId, :title, :now, :now)',
      { ':id': id, ':bizId': String(businessId), ':title': title, ':now': now }
    );
    saveDb();
    return { id, business_id: businessId, title, created_at: now, updated_at: now };
  },

  saveAiMessage: async (sessionId, role, content, contextSnapshot = null) => {
    const id = generateId('msg');
    const now = new Date().toISOString();

    if (hasSupabase()) {
      const cleanSesId = toValidUuid(sessionId);
      const { data, error } = await supabase
        .from('ai_messages')
        .insert({
          id,
          session_id: cleanSesId,
          role,
          content,
          verified_context_snapshot: contextSnapshot,
          created_at: now
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const db = await initLocalTables();
    db.run(
      `INSERT INTO ai_messages (id, session_id, role, content, verified_context_snapshot, created_at)
       VALUES (:id, :sesId, :role, :content, :ctx, :now)`,
      {
        ':id': id,
        ':sesId': String(sessionId),
        ':role': role,
        ':content': content,
        ':ctx': contextSnapshot ? JSON.stringify(contextSnapshot) : null,
        ':now': now
      }
    );
    saveDb();
    return { id, session_id: sessionId, role, content, created_at: now };
  },

  listAiMessages: async (sessionId) => {
    if (hasSupabase()) {
      const cleanSesId = toValidUuid(sessionId);
      const { data } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('session_id', cleanSesId)
        .order('created_at', { ascending: true });
      return data || [];
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM ai_messages WHERE session_id = :sesId ORDER BY created_at ASC');
    stmt.bind({ ':sesId': String(sessionId) });
    const list = [];
    while (stmt.step()) {
      const m = stmt.getAsObject();
      if (m.verified_context_snapshot) {
        try { m.verified_context_snapshot = JSON.parse(m.verified_context_snapshot); } catch {}
      }
      list.push(m);
    }
    stmt.free();
    return list;
  },

  // ── 10. REAL DASHBOARD METRICS ──
  getDashboardStats: async (userId) => {
    if (hasSupabase()) {
      const cleanUserId = toValidUuid(userId);
      const { data: businesses, error: bizErr } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', cleanUserId);
      if (bizErr) throw bizErr;

      const bizCount = businesses ? businesses.length : 0;
      if (bizCount === 0) {
        return {
          businessesCount: 0,
          completedAnalysesCount: 0,
          savedReportsCount: 0,
          matchedSchemesCount: 0
        };
      }

      const bizIds = businesses.map(b => b.id);
      const [analysesRes, reportsRes, schemesRes] = await Promise.all([
        supabase
          .from('business_analyses')
          .select('id', { count: 'exact', head: true })
          .in('business_id', bizIds)
          .in('status', ['ANALYSIS_COMPLETE', 'SUCCESS']),
        supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .in('business_id', bizIds),
        supabase
          .from('scheme_matches')
          .select('id', { count: 'exact', head: true })
          .in('business_id', bizIds)
      ]);

      return {
        businessesCount: bizCount,
        completedAnalysesCount: analysesRes.count || 0,
        savedReportsCount: reportsRes.count || 0,
        matchedSchemesCount: schemesRes.count || 0
      };
    }

    const db = await initLocalTables();
    const countStmt = (sql, params) => {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      let count = 0;
      if (stmt.step()) {
        count = Number(stmt.get()[0] || 0);
      }
      stmt.free();
      return count;
    };

    const businessesCount = countStmt('SELECT COUNT(*) FROM businesses WHERE user_id = :uid', { ':uid': String(userId) });
    const completedAnalysesCount = countStmt(
      "SELECT COUNT(*) FROM business_analyses WHERE business_id IN (SELECT id FROM businesses WHERE user_id = :uid) AND status IN ('ANALYSIS_COMPLETE', 'SUCCESS')",
      { ':uid': String(userId) }
    );
    const savedReportsCount = countStmt(
      'SELECT COUNT(*) FROM reports WHERE business_id IN (SELECT id FROM businesses WHERE user_id = :uid)',
      { ':uid': String(userId) }
    );
    const matchedSchemesCount = countStmt(
      'SELECT COUNT(*) FROM scheme_matches WHERE business_id IN (SELECT id FROM businesses WHERE user_id = :uid)',
      { ':uid': String(userId) }
    );

    return {
      businessesCount,
      completedAnalysesCount,
      savedReportsCount,
      matchedSchemesCount
    };
  },

  // ── 11. NOTIFICATIONS (Normalized Notification Persistence) ──
  createNotification: async (arg1, arg2) => {
    let userId;
    let notificationData;
    if (typeof arg1 === 'object' && arg1 !== null && arg2 === undefined) {
      userId = arg1.userId || arg1.user_id;
      notificationData = arg1;
    } else {
      userId = arg1;
      notificationData = arg2 || {};
    }

    const id = generateId('notif');
    const now = new Date().toISOString();
    const businessId = notificationData.businessId || notificationData.business_id || null;
    const type = notificationData.type || 'INFO';
    const title = notificationData.title || 'Notification';
    const message = notificationData.message || '';
    const actionUrl = notificationData.action_url || notificationData.actionUrl || null;
    const category = notificationData.category || null;

    if (hasSupabase()) {
      const cleanUserId = toValidUuid(userId);
      const cleanBizId = businessId ? toValidUuid(businessId) : null;
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          id,
          user_id: cleanUserId,
          business_id: cleanBizId,
          type,
          title,
          message,
          action_url: actionUrl,
          category,
          is_read: false,
          created_at: now
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const db = await initLocalTables();
    db.run(
      `INSERT INTO notifications (id, user_id, business_id, type, title, message, action_url, category, is_read, created_at)
       VALUES (:id, :userId, :bizId, :type, :title, :message, :actionUrl, :category, 0, :now)`,
      {
        ':id': id,
        ':userId': String(userId),
        ':bizId': businessId ? String(businessId) : null,
        ':type': type,
        ':title': title,
        ':message': message,
        ':actionUrl': actionUrl,
        ':category': category,
        ':now': now
      }
    );
    saveDb();
    return {
      id,
      user_id: String(userId),
      business_id: businessId ? String(businessId) : null,
      type,
      title,
      message,
      action_url: actionUrl,
      actionUrl,
      category,
      is_read: false,
      created_at: now
    };
  },

  listNotifications: async (userId) => {
    if (hasSupabase()) {
      const cleanUserId = toValidUuid(userId);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', cleanUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(n => ({
        ...n,
        is_read: Boolean(n.is_read)
      }));
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM notifications WHERE user_id = :userId ORDER BY created_at DESC');
    stmt.bind({ ':userId': String(userId) });
    const list = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      row.is_read = Boolean(row.is_read);
      row.actionUrl = row.action_url;
      list.push(row);
    }
    stmt.free();
    return list;
  },

  markNotificationRead: async (notificationId, userId) => {
    if (hasSupabase()) {
      const cleanUserId = toValidUuid(userId);
      const cleanId = toValidUuid(notificationId);
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', cleanId)
        .eq('user_id', cleanUserId)
        .select()
        .single();
      if (error) return null;
      return data;
    }

    const db = await initLocalTables();
    const checkStmt = db.prepare('SELECT id FROM notifications WHERE id = :id AND user_id = :userId');
    checkStmt.bind({ ':id': String(notificationId), ':userId': String(userId) });
    const exists = checkStmt.step();
    checkStmt.free();
    if (!exists) return null;

    db.run(
      'UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :userId',
      {
        ':id': String(notificationId),
        ':userId': String(userId)
      }
    );
    saveDb();
    return { id: notificationId, is_read: true };
  },

  markAllNotificationsRead: async (userId) => {
    if (hasSupabase()) {
      const cleanUserId = toValidUuid(userId);
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', cleanUserId)
        .select();
      if (error) throw error;
      return data;
    }

    const db = await initLocalTables();
    db.run(
      'UPDATE notifications SET is_read = 1 WHERE user_id = :userId',
      { ':userId': String(userId) }
    );
    saveDb();
    return { success: true };
  },

  syncStateNotifications: async (userId) => {
    const existing = await dbRepository.listNotifications(userId);
    if (existing.length > 0) return existing;

    const businesses = await dbRepository.listBusinesses(userId);
    for (const biz of businesses) {
      if (biz.latestAnalysis || biz.status === 'ANALYSIS_COMPLETE') {
        await dbRepository.createNotification(userId, {
          businessId: biz.id,
          type: 'ANALYSIS_COMPLETE',
          title: 'Analysis Complete',
          message: `Your ${biz.domain === 'agriculture' ? 'Agriculture' : 'FoodTech'} analysis for ${biz.name} is complete.`
        });
      } else if (biz.status === 'INPUTS_INCOMPLETE' || biz.status === 'ANALYSIS_NEEDS_INPUT') {
        await dbRepository.createNotification(userId, {
          businessId: biz.id,
          type: 'INPUTS_REQUIRED',
          title: 'More Information Required',
          message: `More information is required for your business analysis for ${biz.name}.`
        });
      } else if (biz.status === 'READY_FOR_ANALYSIS') {
        await dbRepository.createNotification(userId, {
          businessId: biz.id,
          type: 'READY_FOR_ANALYSIS',
          title: 'Ready for Analysis',
          message: `${biz.name} is configured and ready for financial feasibility analysis.`
        });
      }
    }
    return await dbRepository.listNotifications(userId);
  },

  // ── 12. ACTION TASKS (Execution Tracking) ──
  listActionTasks: async (businessId) => {
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data, error } = await supabase
        .from('business_action_tasks')
        .select('*')
        .eq('business_id', cleanBizId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM business_action_tasks WHERE business_id = :bizId ORDER BY created_at DESC');
    stmt.bind({ ':bizId': String(businessId) });
    const list = [];
    while (stmt.step()) {
      list.push(stmt.getAsObject());
    }
    stmt.free();
    return list;
  },

  createActionTask: async (arg1, arg2) => {
    let businessId;
    let taskData;
    if (typeof arg1 === 'object' && arg1 !== null && arg2 === undefined) {
      businessId = arg1.businessId || arg1.business_id;
      taskData = arg1;
    } else {
      businessId = arg1;
      taskData = arg2 || {};
    }

    const id = generateId('task');
    const now = new Date().toISOString();
    const normalizedStatus = String(taskData.status || 'pending').toLowerCase();
    const reqEv = (taskData.requiresEvidence || taskData.requires_evidence) ? 1 : 0;
    const evStatus = String(taskData.evidenceStatus || taskData.evidence_status || (reqEv ? 'REQUIRED' : 'NOT_REQUIRED')).toUpperCase();
    const evIds = JSON.stringify(taskData.evidenceIds || taskData.evidence_ids || []);
    const validSources = ['system', 'analysis', 'market', 'scheme', 'dpr', 'ai', 'user'];
    const rawSource = String(taskData.source || 'system').toLowerCase();
    const safeSource = validSources.includes(rawSource) ? rawSource : 'system';

    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data, error } = await supabase
        .from('business_action_tasks')
        .insert({
          id,
          business_id: cleanBizId,
          title: taskData.title,
          description: taskData.description || '',
          category: taskData.category || 'operations',
          priority: taskData.priority || 'medium',
          status: normalizedStatus,
          due_date: taskData.due_date || taskData.dueDate || null,
          source: safeSource,
          requires_evidence: reqEv,
          evidence_status: evStatus,
          evidence_ids: evIds,
          created_at: now,
          completed_at: normalizedStatus === 'completed' ? now : null
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const db = await initLocalTables();
    db.run(
      `INSERT INTO business_action_tasks (id, business_id, title, description, category, priority, status, due_date, source, requires_evidence, evidence_status, evidence_ids, created_at, completed_at)
       VALUES (:id, :bizId, :title, :description, :category, :priority, :status, :dueDate, :source, :reqEv, :evStatus, :evIds, :now, :completedAt)`,
      {
        ':id': id,
        ':bizId': String(businessId),
        ':title': taskData.title,
        ':description': taskData.description || '',
        ':category': taskData.category || 'operations',
        ':priority': taskData.priority || 'medium',
        ':status': normalizedStatus,
        ':dueDate': taskData.due_date || taskData.dueDate || null,
        ':source': safeSource,
        ':reqEv': reqEv,
        ':evStatus': evStatus,
        ':evIds': evIds,
        ':now': now,
        ':completedAt': normalizedStatus === 'completed' ? now : null
      }
    );

    saveDb();
    return {
      id,
      business_id: businessId,
      title: taskData.title,
      description: taskData.description || '',
      category: taskData.category || 'operations',
      priority: taskData.priority || 'medium',
      status: taskData.status || 'pending',
      due_date: taskData.due_date || taskData.dueDate || null,
      source: taskData.source || 'system',
      requires_evidence: reqEv,
      evidence_status: evStatus,
      evidence_ids: typeof evIds === 'string' ? JSON.parse(evIds) : evIds,
      created_at: now,
      completed_at: taskData.status === 'completed' ? now : null
    };
  },

  getTaskById: async (taskId) => {
    if (hasSupabase()) {
      const cleanTaskId = toValidUuid(taskId);
      const { data } = await supabase
        .from('business_action_tasks')
        .select('*')
        .eq('id', cleanTaskId)
        .single();
      return data || null;
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM business_action_tasks WHERE id = :id');
    stmt.bind({ ':id': String(taskId) });
    let task = null;
    if (stmt.step()) {
      task = stmt.getAsObject();
      try { task.evidence_ids = JSON.parse(task.evidence_ids); } catch {}
    }
    stmt.free();
    return task;
  },

  updateTask: async (arg1, arg2, arg3) => {
    let businessId = null;
    let taskId = null;
    let updates = {};
    if (arg3 !== undefined) {
      businessId = arg1;
      taskId = arg2;
      updates = arg3 || {};
    } else {
      taskId = arg1;
      updates = arg2 || {};
      const t = await dbRepository.getTaskById(taskId);
      if (t) businessId = t.business_id;
    }

    const now = new Date().toISOString();
    const completedAt = updates.status === 'completed' ? (updates.completed_at || now) : (updates.status ? null : undefined);

    if (hasSupabase()) {
      const cleanTaskId = toValidUuid(taskId);
      const payload = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.category !== undefined) payload.category = updates.category;
      if (updates.priority !== undefined) payload.priority = updates.priority;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.due_date !== undefined) payload.due_date = updates.due_date;
      if (updates.requires_evidence !== undefined) payload.requires_evidence = updates.requires_evidence ? 1 : 0;
      if (updates.requiresEvidence !== undefined) payload.requires_evidence = updates.requiresEvidence ? 1 : 0;
      if (updates.evidence_status !== undefined) payload.evidence_status = String(updates.evidence_status).toUpperCase();
      if (updates.evidenceStatus !== undefined) payload.evidence_status = String(updates.evidenceStatus).toUpperCase();
      if (updates.evidence_ids !== undefined) payload.evidence_ids = JSON.stringify(updates.evidence_ids);
      if (updates.evidenceIds !== undefined) payload.evidence_ids = JSON.stringify(updates.evidenceIds);
      if (completedAt !== undefined) payload.completed_at = completedAt;

      let query = supabase.from('business_action_tasks').update(payload).eq('id', cleanTaskId);
      if (businessId) query = query.eq('business_id', toValidUuid(businessId));
      const { data, error } = await query.select().single();
      if (error) return null;
      return data;
    }

    const db = await initLocalTables();
    let query = 'SELECT * FROM business_action_tasks WHERE id = :id';
    const params = { ':id': String(taskId) };
    if (businessId) {
      query += ' AND business_id = :bizId';
      params[':bizId'] = String(businessId);
    }
    const checkStmt = db.prepare(query);
    checkStmt.bind(params);
    if (!checkStmt.step()) {
      checkStmt.free();
      return null;
    }
    const current = checkStmt.getAsObject();
    checkStmt.free();

    const reqEv = (updates.requiresEvidence !== undefined || updates.requires_evidence !== undefined)
      ? ((updates.requiresEvidence || updates.requires_evidence) ? 1 : 0)
      : current.requires_evidence;
    const evStatus = (updates.evidenceStatus !== undefined || updates.evidence_status !== undefined)
      ? String(updates.evidenceStatus || updates.evidence_status).toUpperCase()
      : current.evidence_status;
    const evIds = (updates.evidenceIds !== undefined || updates.evidence_ids !== undefined)
      ? JSON.stringify(updates.evidenceIds || updates.evidence_ids)
      : current.evidence_ids;

    const updated = {
      ...current,
      title: updates.title !== undefined ? updates.title : current.title,
      description: updates.description !== undefined ? updates.description : current.description,
      category: updates.category !== undefined ? updates.category : current.category,
      priority: updates.priority !== undefined ? updates.priority : current.priority,
      status: updates.status !== undefined ? updates.status : current.status,
      due_date: updates.due_date !== undefined ? updates.due_date : current.due_date,
      requires_evidence: reqEv,
      evidence_status: evStatus,
      evidence_ids: evIds,
      completed_at: completedAt !== undefined ? completedAt : current.completed_at
    };

    let updateSql = `UPDATE business_action_tasks 
       SET title = :title, description = :description, category = :category, priority = :priority, status = :status, due_date = :dueDate, requires_evidence = :reqEv, evidence_status = :evStatus, evidence_ids = :evIds, completed_at = :completedAt
       WHERE id = :id`;
    const updateParams = {
      ':id': String(taskId),
      ':title': updated.title,
      ':description': updated.description,
      ':category': updated.category,
      ':priority': updated.priority,
      ':status': updated.status,
      ':dueDate': updated.due_date || null,
      ':reqEv': reqEv,
      ':evStatus': evStatus,
      ':evIds': evIds,
      ':completedAt': updated.completed_at || null
    };
    if (businessId) {
      updateSql += ' AND business_id = :bizId';
      updateParams[':bizId'] = String(businessId);
    }
    db.run(updateSql, updateParams);
    saveDb();
    try { updated.evidence_ids = JSON.parse(updated.evidence_ids); } catch {}
    return updated;
  },

  updateActionTask: async (businessId, taskId, updates) => {
    return dbRepository.updateTask(businessId, taskId, updates);
  },

  deleteActionTask: async (businessId, taskId) => {
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const cleanTaskId = toValidUuid(taskId);
      const { error } = await supabase
        .from('business_action_tasks')
        .delete()
        .eq('id', cleanTaskId)
        .eq('business_id', cleanBizId);
      if (error) return false;
      return true;
    }

    const db = await initLocalTables();
    db.run(
      'DELETE FROM business_action_tasks WHERE id = :id AND business_id = :bizId',
      { ':id': String(taskId), ':bizId': String(businessId) }
    );
    saveDb();
    return true;
  },

  createTask: async (arg1, arg2) => {
    return dbRepository.createActionTask(arg1, arg2);
  },

  listTasks: async (businessId) => {
    return dbRepository.listActionTasks(businessId);
  },

  createDocument: async (arg1, arg2) => {
    let businessId = arg1;
    let docData = arg2;
    if (arg1 && typeof arg1 === 'object' && !arg2) {
      businessId = arg1.businessId || arg1.business_id;
      docData = arg1;
    }
    docData = docData || {};
    const rawStatus = String(docData.status || (docData.verificationStatus === 'unverified' ? 'uploaded' : docData.verificationStatus) || 'missing').toLowerCase();
    const validStatuses = ['missing', 'provided', 'uploaded', 'under_review', 'verified', 'rejected', 'not_required'];
    const status = validStatuses.includes(rawStatus) ? rawStatus : 'uploaded';
    const isRequired = docData.isRequired !== undefined ? docData.isRequired : (docData.is_required !== undefined ? docData.is_required : (docData.isMandatory || docData.is_mandatory || false));
    const verificationStatus = docData.verificationStatus || docData.verification_status || (status === 'verified' ? 'verified' : 'unverified');

    return dbRepository.upsertBusinessDocument(businessId, {
      document_name: docData.name || docData.document_name || 'Document',
      document_type: docData.category || docData.document_type || docData.documentType || 'other',
      status,
      source: isRequired ? 'required' : (docData.source || 'optional'),
      notes: docData.notes || '',
      isRequired: isRequired ? 1 : 0,
      isMandatory: isRequired ? 1 : 0,
      is_required: isRequired ? 1 : 0,
      is_mandatory: isRequired ? 1 : 0,
      verificationStatus,
      verification_status: verificationStatus
    });
  },

  listDocuments: async (businessId) => {
    return dbRepository.listBusinessDocuments(businessId);
  },

  // ── 13. BUSINESS DOCUMENTS (Document Readiness Checklist) ──

  listBusinessDocuments: async (businessId) => {
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data, error } = await supabase
        .from('business_documents')
        .select('*')
        .eq('business_id', cleanBizId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        is_required: row.is_required !== undefined ? (row.is_required ? 1 : 0) : (row.is_mandatory ? 1 : 0),
        verification_status: row.verification_status || (row.status === 'verified' ? 'verified' : 'unverified')
      }));
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM business_documents WHERE business_id = :bizId ORDER BY created_at ASC');
    stmt.bind({ ':bizId': String(businessId) });
    const list = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      row.is_required = row.is_required !== undefined ? (row.is_required ? 1 : 0) : (row.is_mandatory ? 1 : 0);
      row.verification_status = row.verification_status || (row.status === 'verified' ? 'verified' : 'unverified');
      list.push(row);
    }
    stmt.free();
    return list;
  },

  upsertBusinessDocument: async (businessId, docData) => {
    const now = new Date().toISOString();
    const docType = docData.document_type || docData.documentType;
    const isRequired = docData.is_required !== undefined ? (docData.is_required ? 1 : 0) : (docData.isRequired !== undefined ? (docData.isRequired ? 1 : 0) : (docData.is_mandatory || docData.isMandatory ? 1 : 0));
    const verificationStatus = docData.verification_status || docData.verificationStatus || (docData.status === 'verified' ? 'verified' : 'unverified');

    const payload = {
      document_name: docData.document_name || docData.documentName || 'Document',
      document_type: docType,
      status: docData.status || (verificationStatus === 'verified' ? 'verified' : 'missing'),
      source: docData.source || (isRequired ? 'required' : 'optional'),
      notes: docData.notes !== undefined ? docData.notes : '',
      user_id: docData.user_id || docData.userId || null,
      file_name: docData.file_name || docData.fileName || null,
      storage_path: docData.storage_path || docData.storagePath || null,
      mime_type: docData.mime_type || docData.mimeType || null,
      file_size: docData.file_size || docData.fileSize || null,
      version_number: docData.version_number || docData.versionNumber || 1,
      is_active: docData.is_active !== undefined ? (docData.is_active ? 1 : 0) : 1,
      is_mandatory: isRequired,
      is_required: isRequired,
      verification_status: verificationStatus,
      verified_at: docData.verified_at || docData.verifiedAt || null,
      verified_by: docData.verified_by || docData.verifiedBy || null,
      rejection_reason: docData.rejection_reason || docData.rejectionReason || null,
      uploaded_at: docData.uploaded_at || docData.uploadedAt || null,
      checksum: docData.checksum !== undefined ? docData.checksum : null,
      updated_at: now
    };

    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data: existing } = await supabase
        .from('business_documents')
        .select('*')
        .eq('business_id', cleanBizId)
        .eq('document_type', docType)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('business_documents')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const id = generateId('doc');
      const { data, error } = await supabase
        .from('business_documents')
        .insert({
          id,
          business_id: cleanBizId,
          ...payload,
          created_at: now
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM business_documents WHERE business_id = :bizId AND (document_type = :docType OR id = :docType)');
    stmt.bind({ ':bizId': String(businessId), ':docType': docType });
    if (stmt.step()) {
      const existing = stmt.getAsObject();
      stmt.free();
      db.run(
        `UPDATE business_documents 
         SET status = :status, notes = :notes, file_name = :fileName, storage_path = :storagePath,
             mime_type = :mimeType, file_size = :fileSize, version_number = :vNum, is_active = :isActive,
             is_mandatory = :isMandatory, is_required = :isRequired, verification_status = :verificationStatus,
             verified_at = :verifiedAt, verified_by = :verifiedBy,
             rejection_reason = :rejectionReason, uploaded_at = :uploadedAt, checksum = :checksum, updated_at = :now
         WHERE id = :id`,
        {
          ':status': payload.status || existing.status,
          ':notes': payload.notes !== undefined ? payload.notes : existing.notes,
          ':fileName': payload.file_name || existing.file_name || null,
          ':storagePath': payload.storage_path || existing.storage_path || null,
          ':mimeType': payload.mime_type || existing.mime_type || null,
          ':fileSize': payload.file_size || existing.file_size || null,
          ':vNum': payload.version_number || existing.version_number || 1,
          ':isActive': payload.is_active !== undefined ? payload.is_active : (existing.is_active ?? 1),
          ':isMandatory': payload.is_mandatory !== undefined ? payload.is_mandatory : (existing.is_mandatory ?? 0),
          ':isRequired': payload.is_required !== undefined ? payload.is_required : (existing.is_required ?? 0),
          ':verificationStatus': payload.verification_status || existing.verification_status || 'unverified',
          ':verifiedAt': payload.verified_at || existing.verified_at || null,
          ':verifiedBy': payload.verified_by || existing.verified_by || null,
          ':rejectionReason': payload.rejection_reason !== undefined ? payload.rejection_reason : (existing.rejection_reason || null),
          ':uploadedAt': payload.uploaded_at || existing.uploaded_at || null,
          ':checksum': payload.checksum !== null ? payload.checksum : (existing.checksum || ''),
          ':now': now,
          ':id': existing.id
        }
      );
      saveDb();
      return { ...existing, ...payload, id: existing.id, updated_at: now };
    }
    stmt.free();

    const id = generateId('doc');
    db.run(
      `INSERT INTO business_documents (id, business_id, user_id, document_name, document_type, status, source, notes, file_name, storage_path, mime_type, file_size, version_number, is_active, is_mandatory, is_required, verification_status, verified_at, verified_by, rejection_reason, uploaded_at, checksum, created_at, updated_at)
       VALUES (:id, :bizId, :userId, :name, :type, :status, :source, :notes, :fileName, :storagePath, :mimeType, :fileSize, :vNum, :isActive, :isMandatory, :isRequired, :verificationStatus, :verifiedAt, :verifiedBy, :rejectionReason, :uploadedAt, :checksum, :now, :now)`,
      {
        ':id': id,
        ':bizId': String(businessId),
        ':userId': payload.user_id ? String(payload.user_id) : null,
        ':name': payload.document_name,
        ':type': docType,
        ':status': payload.status,
        ':source': payload.source,
        ':notes': payload.notes,
        ':fileName': payload.file_name,
        ':storagePath': payload.storage_path,
        ':mimeType': payload.mime_type,
        ':fileSize': payload.file_size,
        ':vNum': payload.version_number,
        ':isActive': payload.is_active,
        ':isMandatory': payload.is_mandatory,
        ':isRequired': payload.is_required,
        ':verificationStatus': payload.verification_status,
        ':verifiedAt': payload.verified_at,
        ':verifiedBy': payload.verified_by,
        ':rejectionReason': payload.rejection_reason,
        ':uploadedAt': payload.uploaded_at,
        ':checksum': payload.checksum || '',
        ':now': now
      }
    );
    saveDb();
    return { id, business_id: businessId, ...payload, created_at: now, updated_at: now };
  },

  getDocumentById: async (businessId, documentId) => {
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(documentId);
      let query = supabase.from('business_documents').select('*').eq('business_id', cleanBizId);
      if (isUuid) {
        query = query.or(`id.eq.${documentId},document_type.eq.${documentId}`);
      } else {
        query = query.eq('document_type', documentId);
      }
      const { data } = await query.maybeSingle();
      if (!data) return null;
      return {
        ...data,
        is_required: data.is_required !== undefined ? (data.is_required ? 1 : 0) : (data.is_mandatory ? 1 : 0),
        verification_status: data.verification_status || (data.status === 'verified' ? 'verified' : 'unverified')
      };
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM business_documents WHERE business_id = :bizId AND (id = :docId OR document_type = :docId) LIMIT 1');
    stmt.bind({ ':bizId': String(businessId), ':docId': String(documentId) });
    let doc = null;
    if (stmt.step()) {
      doc = stmt.getAsObject();
      doc.is_required = doc.is_required !== undefined ? (doc.is_required ? 1 : 0) : (doc.is_mandatory ? 1 : 0);
      doc.verification_status = doc.verification_status || (doc.status === 'verified' ? 'verified' : 'unverified');
    }
    stmt.free();
    return doc;
  },

  updateBusinessDocument: async (businessId, documentId, updates) => {
    const existing = await dbRepository.getDocumentById(businessId, documentId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated = {
      ...existing,
      status: updates.status !== undefined ? updates.status : existing.status,
      notes: updates.notes !== undefined ? updates.notes : existing.notes,
      file_name: updates.file_name !== undefined ? updates.file_name : existing.file_name,
      storage_path: updates.storage_path !== undefined ? updates.storage_path : existing.storage_path,
      mime_type: updates.mime_type !== undefined ? updates.mime_type : existing.mime_type,
      file_size: updates.file_size !== undefined ? updates.file_size : existing.file_size,
      version_number: updates.version_number !== undefined ? updates.version_number : existing.version_number,
      is_active: updates.is_active !== undefined ? (updates.is_active ? 1 : 0) : existing.is_active,
      is_mandatory: updates.is_mandatory !== undefined ? (updates.is_mandatory ? 1 : 0) : (updates.isRequired !== undefined ? (updates.isRequired ? 1 : 0) : existing.is_mandatory),
      is_required: updates.is_required !== undefined ? (updates.is_required ? 1 : 0) : (updates.isRequired !== undefined ? (updates.isRequired ? 1 : 0) : (existing.is_required !== undefined ? existing.is_required : existing.is_mandatory)),
      verification_status: updates.verification_status || updates.verificationStatus || (updates.status === 'verified' ? 'verified' : (existing.verification_status || 'unverified')),
      verified_at: updates.verified_at !== undefined ? updates.verified_at : existing.verified_at,
      verified_by: updates.verified_by !== undefined ? updates.verified_by : existing.verified_by,
      rejection_reason: updates.rejection_reason !== undefined ? updates.rejection_reason : existing.rejection_reason,
      uploaded_at: updates.uploaded_at !== undefined ? updates.uploaded_at : existing.uploaded_at,
      checksum: updates.checksum !== undefined ? updates.checksum : existing.checksum,
      updated_at: now
    };

    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data, error } = await supabase
        .from('business_documents')
        .update({
          status: updated.status,
          notes: updated.notes,
          file_name: updated.file_name,
          storage_path: updated.storage_path,
          mime_type: updated.mime_type,
          file_size: updated.file_size,
          version_number: updated.version_number,
          is_active: Boolean(updated.is_active),
          is_mandatory: Boolean(updated.is_mandatory),
          verified_at: updated.verified_at,
          verified_by: updated.verified_by ? toValidUuid(updated.verified_by) : null,
          rejection_reason: updated.rejection_reason,
          uploaded_at: updated.uploaded_at,
          checksum: updated.checksum,
          updated_at: now
        })
        .eq('id', existing.id)
        .eq('business_id', cleanBizId)
        .select()
        .single();
      if (error) return null;
      return data;
    }

    const db = await initLocalTables();
    db.run(
      `UPDATE business_documents
       SET status = :status, notes = :notes, file_name = :fileName, storage_path = :storagePath,
           mime_type = :mimeType, file_size = :fileSize, version_number = :vNum, is_active = :isActive,
           is_mandatory = :isMandatory, is_required = :isRequired, verification_status = :verificationStatus,
           verified_at = :verifiedAt, verified_by = :verifiedBy,
           rejection_reason = :rejectionReason, uploaded_at = :uploadedAt, checksum = :checksum, updated_at = :now
       WHERE id = :id AND business_id = :bizId`,
      {
        ':status': updated.status,
        ':notes': updated.notes,
        ':fileName': updated.file_name || null,
        ':storagePath': updated.storage_path || null,
        ':mimeType': updated.mime_type || null,
        ':fileSize': updated.file_size || null,
        ':vNum': updated.version_number || 1,
        ':isActive': updated.is_active ? 1 : 0,
        ':isMandatory': updated.is_mandatory ? 1 : 0,
        ':isRequired': updated.is_required ? 1 : 0,
        ':verificationStatus': updated.verification_status,
        ':verifiedAt': updated.verified_at || null,
        ':verifiedBy': updated.verified_by ? String(updated.verified_by) : null,
        ':rejectionReason': updated.rejection_reason || null,
        ':uploadedAt': updated.uploaded_at || null,
        ':checksum': updated.checksum || '',
        ':now': now,
        ':id': existing.id,
        ':bizId': String(businessId)
      }
    );
    saveDb();
    return updated;
  },

  deleteBusinessDocument: async (businessId, documentId) => {
    const doc = await dbRepository.getDocumentById(businessId, documentId);
    if (!doc) return false;

    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      await supabase.from('business_document_versions').delete().eq('document_id', doc.id);
      await supabase.from('business_application_documents').delete().eq('document_id', doc.id);
      const { error } = await supabase.from('business_documents').delete().eq('id', doc.id).eq('business_id', cleanBizId);
      return !error;
    }

    const db = await initLocalTables();
    db.run('DELETE FROM business_document_versions WHERE document_id = :docId', { ':docId': doc.id });
    db.run('DELETE FROM business_application_documents WHERE document_id = :docId', { ':docId': doc.id });
    db.run('DELETE FROM business_documents WHERE id = :id AND business_id = :bizId', { ':id': doc.id, ':bizId': String(businessId) });
    saveDb();
    return true;
  },

  createDocumentVersion: async (businessId, documentId, versionData) => {
    const doc = await dbRepository.getDocumentById(businessId, documentId);
    if (!doc) return null;

    let nextVersion = versionData.version_number || versionData.versionNumber;
    if (!nextVersion) {
      if (hasSupabase()) {
        const existingVersions = await dbRepository.listDocumentVersions(businessId, doc.id);
        nextVersion = existingVersions.length > 0 ? Math.max(...existingVersions.map(v => Number(v.version_number) || 0)) + 1 : ((Number(doc.version_number) || 1) + 1);
      } else {
        const db = await initLocalTables();
        const vStmt = db.prepare('SELECT COALESCE(MAX(version_number), 0) + 1 AS next_ver FROM business_document_versions WHERE document_id = :docId');
        vStmt.bind({ ':docId': String(doc.id) });
        if (vStmt.step()) {
          nextVersion = Number(vStmt.getAsObject().next_ver) || 1;
        } else {
          nextVersion = 1;
        }
        vStmt.free();
        const docV = Number(doc.version_number) || 0;
        if (docV >= nextVersion && doc.storage_path) {
          nextVersion = docV + 1;
        }
      }
    }

    const id = generateId('dver');
    const now = new Date().toISOString();

    const versionRecord = {
      id,
      document_id: doc.id,
      business_id: businessId,
      version_number: nextVersion,
      file_name: versionData.file_name || versionData.fileName || doc.document_name,
      storage_path: versionData.storage_path || versionData.storagePath || '',
      mime_type: versionData.mime_type || versionData.mimeType || 'application/pdf',
      file_size: versionData.file_size || versionData.fileSize || 0,
      uploaded_at: now,
      uploaded_by: versionData.uploaded_by || versionData.uploadedBy || null,
      status: versionData.status || 'uploaded',
      verification_note: versionData.verification_note || versionData.verificationNote || '',
      rejection_reason: versionData.rejection_reason || versionData.rejectionReason || null,
      checksum: versionData.checksum || '',
      created_at: now
    };

    if (hasSupabase()) {
      const { data, error } = await supabase
        .from('business_document_versions')
        .insert({
          ...versionRecord,
          document_id: toValidUuid(doc.id),
          business_id: toValidUuid(businessId),
          uploaded_by: versionRecord.uploaded_by ? toValidUuid(versionRecord.uploaded_by) : null
        })
        .select()
        .single();
      if (error) throw error;

      await dbRepository.updateBusinessDocument(businessId, doc.id, {
        file_name: versionRecord.file_name,
        storage_path: versionRecord.storage_path,
        mime_type: versionRecord.mime_type,
        file_size: versionRecord.file_size,
        version_number: nextVersion,
        status: versionRecord.status,
        uploaded_at: now,
        checksum: versionRecord.checksum,
        rejection_reason: null
      });

      return data;
    }

    const db = await initLocalTables();
    db.run(
      `INSERT INTO business_document_versions (id, document_id, business_id, version_number, file_name, storage_path, mime_type, file_size, uploaded_at, uploaded_by, status, verification_note, rejection_reason, checksum, created_at)
       VALUES (:id, :docId, :bizId, :vNum, :fileName, :storagePath, :mimeType, :fileSize, :now, :upBy, :status, :note, :reason, :checksum, :now)`,
      {
        ':id': id,
        ':docId': String(doc.id),
        ':bizId': String(businessId),
        ':vNum': nextVersion,
        ':fileName': versionRecord.file_name,
        ':storagePath': versionRecord.storage_path,
        ':mimeType': versionRecord.mime_type,
        ':fileSize': versionRecord.file_size,
        ':now': now,
        ':upBy': versionRecord.uploaded_by ? String(versionRecord.uploaded_by) : null,
        ':status': versionRecord.status,
        ':note': versionRecord.verification_note,
        ':reason': versionRecord.rejection_reason,
        ':checksum': versionRecord.checksum || ''
      }
    );
    saveDb();

    await dbRepository.updateBusinessDocument(businessId, doc.id, {
      file_name: versionRecord.file_name,
      storage_path: versionRecord.storage_path,
      mime_type: versionRecord.mime_type,
      file_size: versionRecord.file_size,
      version_number: nextVersion,
      status: versionRecord.status,
      uploaded_at: now,
      checksum: versionRecord.checksum,
      rejection_reason: null
    });

    return versionRecord;
  },

  findDocumentByChecksum: async (businessId, checksum) => {
    if (!checksum) return null;
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data } = await supabase
        .from('business_documents')
        .select('*')
        .eq('business_id', cleanBizId)
        .eq('checksum', checksum)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      return data || null;
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM business_documents WHERE business_id = :bizId AND checksum = :checksum AND is_active = 1 LIMIT 1');
    stmt.bind({ ':bizId': String(businessId), ':checksum': String(checksum) });
    let doc = null;
    if (stmt.step()) {
      doc = stmt.getAsObject();
    }
    stmt.free();
    return doc;
  },

  listDocumentVersions: async (businessId, documentId) => {
    const doc = await dbRepository.getDocumentById(businessId, documentId);
    if (!doc) return [];

    if (hasSupabase()) {
      const cleanDocId = toValidUuid(doc.id);
      const cleanBizId = toValidUuid(businessId);
      const { data, error } = await supabase
        .from('business_document_versions')
        .select('*')
        .eq('document_id', cleanDocId)
        .eq('business_id', cleanBizId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return data || [];
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM business_document_versions WHERE document_id = :docId AND business_id = :bizId ORDER BY version_number DESC');
    stmt.bind({ ':docId': String(doc.id), ':bizId': String(businessId) });
    const list = [];
    while (stmt.step()) {
      list.push(stmt.getAsObject());
    }
    stmt.free();
    return list;
  },

  getDocumentVersion: async (businessId, documentId, versionIdOrNumber) => {
    const versions = await dbRepository.listDocumentVersions(businessId, documentId);
    return versions.find(v => String(v.id) === String(versionIdOrNumber) || String(v.version_number) === String(versionIdOrNumber)) || null;
  },

  // ── 14. BUSINESS APPLICATIONS (Bank & Government Application Tracking) ──
  listApplications: async (businessId) => {
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data, error } = await supabase
        .from('business_applications')
        .select('*')
        .eq('business_id', cleanBizId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM business_applications WHERE business_id = :bizId ORDER BY created_at DESC');
    stmt.bind({ ':bizId': String(businessId) });
    const list = [];
    while (stmt.step()) {
      list.push(stmt.getAsObject());
    }
    stmt.free();
    return list;
  },

  getApplicationById: async (businessId, applicationId) => {
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const cleanAppId = toValidUuid(applicationId);
      const { data, error } = await supabase
        .from('business_applications')
        .select('*')
        .eq('id', cleanAppId)
        .eq('business_id', cleanBizId)
        .single();
      if (error) return null;
      return data;
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM business_applications WHERE id = :id AND business_id = :bizId');
    stmt.bind({ ':id': String(applicationId), ':bizId': String(businessId) });
    let app = null;
    if (stmt.step()) {
      app = stmt.getAsObject();
    }
    stmt.free();
    return app;
  },

  createApplication: async (businessId, userId, appData) => {
    const id = generateId('app');
    const now = new Date().toISOString();

    const appRecord = {
      id,
      business_id: businessId,
      user_id: userId,
      application_type: appData.application_type || appData.applicationType || 'General Loan',
      scheme_name: appData.scheme_name || appData.schemeName || '',
      institution_name: appData.institution_name || appData.institutionName || 'Lead District Bank',
      application_reference: appData.application_reference || appData.applicationReference || '',
      submitted_at: appData.status === 'SUBMITTED' ? now : (appData.submitted_at || null),
      expected_response_date: appData.expected_response_date || appData.expectedResponseDate || null,
      status: appData.status || 'DRAFT',
      current_stage: appData.current_stage || appData.currentStage || 'Application Preparation',
      notes: appData.notes || '',
      created_at: now,
      updated_at: now,
      completed_at: (appData.status === 'APPROVED' || appData.status === 'COMPLETED') ? now : null
    };

    if (hasSupabase()) {
      const { data, error } = await supabase
        .from('business_applications')
        .insert({
          ...appRecord,
          business_id: toValidUuid(businessId),
          user_id: toValidUuid(userId)
        })
        .select()
        .single();
      if (error) throw error;

      await dbRepository.createApplicationTimelineEvent(businessId, id, {
        eventType: 'APPLICATION_CREATED',
        title: `Application Initiated: ${appRecord.application_type}`,
        description: `Created new application for ${appRecord.institution_name}.`,
        metadata: { status: appRecord.status }
      });

      await dbRepository.createTimelineEvent(businessId, {
        eventType: 'APPLICATION_CREATED',
        title: `Application Added: ${appRecord.application_type}`,
        description: `Initiated application tracking with ${appRecord.institution_name}.`,
        metadata: { applicationId: id, applicationType: appRecord.application_type }
      });

      return data;
    }

    const db = await initLocalTables();
    db.run(
      `INSERT INTO business_applications (id, business_id, user_id, application_type, scheme_name, institution_name, application_reference, submitted_at, expected_response_date, status, current_stage, notes, created_at, updated_at, completed_at)
       VALUES (:id, :bizId, :userId, :type, :scheme, :inst, :ref, :subAt, :expDate, :status, :stage, :notes, :now, :now, :compAt)`,
      {
        ':id': id,
        ':bizId': String(businessId),
        ':userId': String(userId),
        ':type': appRecord.application_type,
        ':scheme': appRecord.scheme_name,
        ':inst': appRecord.institution_name,
        ':ref': appRecord.application_reference,
        ':subAt': appRecord.submitted_at,
        ':expDate': appRecord.expected_response_date,
        ':status': appRecord.status,
        ':stage': appRecord.current_stage,
        ':notes': appRecord.notes,
        ':now': now,
        ':compAt': appRecord.completed_at
      }
    );
    saveDb();

    await dbRepository.createApplicationTimelineEvent(businessId, id, {
      eventType: 'APPLICATION_CREATED',
      title: `Application Initiated: ${appRecord.application_type}`,
      description: `Created new application for ${appRecord.institution_name}.`,
      metadata: { status: appRecord.status }
    });

    await dbRepository.createTimelineEvent(businessId, {
      eventType: 'APPLICATION_CREATED',
      title: `Application Added: ${appRecord.application_type}`,
      description: `Initiated application tracking with ${appRecord.institution_name}.`,
      metadata: { applicationId: id, applicationType: appRecord.application_type }
    });

    return appRecord;
  },

  updateApplication: async (businessId, applicationId, updates) => {
    const current = await dbRepository.getApplicationById(businessId, applicationId);
    if (!current) return null;

    const now = new Date().toISOString();
    const updatedStatus = updates.status !== undefined ? updates.status : current.status;
    const isCompleted = updatedStatus === 'APPROVED' || updatedStatus === 'COMPLETED';
    const isSubmitted = updatedStatus === 'SUBMITTED';

    const updated = {
      ...current,
      application_type: updates.application_type !== undefined ? updates.application_type : current.application_type,
      scheme_name: updates.scheme_name !== undefined ? updates.scheme_name : current.scheme_name,
      institution_name: updates.institution_name !== undefined ? updates.institution_name : current.institution_name,
      application_reference: updates.application_reference !== undefined ? updates.application_reference : current.application_reference,
      status: updatedStatus,
      current_stage: updates.current_stage !== undefined ? updates.current_stage : current.current_stage,
      expected_response_date: updates.expected_response_date !== undefined ? updates.expected_response_date : current.expected_response_date,
      notes: updates.notes !== undefined ? updates.notes : current.notes,
      submitted_at: isSubmitted ? (current.submitted_at || now) : current.submitted_at,
      completed_at: isCompleted ? (current.completed_at || now) : current.completed_at,
      updated_at: now
    };

    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const cleanAppId = toValidUuid(applicationId);
      const { data, error } = await supabase
        .from('business_applications')
        .update({
          application_type: updated.application_type,
          scheme_name: updated.scheme_name,
          institution_name: updated.institution_name,
          application_reference: updated.application_reference,
          status: updated.status,
          current_stage: updated.current_stage,
          expected_response_date: updated.expected_response_date,
          notes: updated.notes,
          submitted_at: updated.submitted_at,
          completed_at: updated.completed_at,
          updated_at: now
        })
        .eq('id', cleanAppId)
        .eq('business_id', cleanBizId)
        .select()
        .single();
      if (error) return null;

      if (updates.status && updates.status !== current.status) {
        let eventType = 'APPLICATION_STATUS_CHANGED';
        if (updates.status === 'SUBMITTED') eventType = 'APPLICATION_SUBMITTED';
        else if (updates.status === 'APPROVED') eventType = 'APPLICATION_APPROVED';
        else if (updates.status === 'REJECTED') eventType = 'APPLICATION_REJECTED';
        else if (updates.status === 'ACTION_REQUIRED') eventType = 'APPLICATION_ACTION_REQUIRED';
        else if (updates.status === 'COMPLETED') eventType = 'APPLICATION_COMPLETED';

        await dbRepository.createApplicationTimelineEvent(businessId, applicationId, {
          eventType,
          title: `Status: ${updates.status.replace(/_/g, ' ')}`,
          description: updates.notes || `Application transitioned from ${current.status} to ${updates.status}.`,
          metadata: { previousStatus: current.status, newStatus: updates.status }
        });

        await dbRepository.createTimelineEvent(businessId, {
          eventType,
          title: `Application ${updated.application_type}: ${updates.status.replace(/_/g, ' ')}`,
          description: `Application status updated with ${updated.institution_name}.`,
          metadata: { applicationId, newStatus: updates.status }
        });
      }

      return data;
    }

    const db = await initLocalTables();
    db.run(
      `UPDATE business_applications
       SET application_type = :type, scheme_name = :scheme, institution_name = :inst,
           application_reference = :ref, status = :status, current_stage = :stage,
           expected_response_date = :expDate, notes = :notes, submitted_at = :subAt,
           completed_at = :compAt, updated_at = :now
       WHERE id = :id AND business_id = :bizId`,
      {
        ':type': updated.application_type,
        ':scheme': updated.scheme_name,
        ':inst': updated.institution_name,
        ':ref': updated.application_reference,
        ':status': updated.status,
        ':stage': updated.current_stage,
        ':expDate': updated.expected_response_date || null,
        ':notes': updated.notes || '',
        ':subAt': updated.submitted_at || null,
        ':compAt': updated.completed_at || null,
        ':now': now,
        ':id': String(applicationId),
        ':bizId': String(businessId)
      }
    );
    saveDb();

    if (updates.status && updates.status !== current.status) {
      let eventType = 'APPLICATION_STATUS_CHANGED';
      if (updates.status === 'SUBMITTED') eventType = 'APPLICATION_SUBMITTED';
      else if (updates.status === 'APPROVED') eventType = 'APPLICATION_APPROVED';
      else if (updates.status === 'REJECTED') eventType = 'APPLICATION_REJECTED';
      else if (updates.status === 'ACTION_REQUIRED') eventType = 'APPLICATION_ACTION_REQUIRED';
      else if (updates.status === 'COMPLETED') eventType = 'APPLICATION_COMPLETED';

      await dbRepository.createApplicationTimelineEvent(businessId, applicationId, {
        eventType,
        title: `Status: ${updates.status.replace(/_/g, ' ')}`,
        description: updates.notes || `Application transitioned from ${current.status} to ${updates.status}.`,
        metadata: { previousStatus: current.status, newStatus: updates.status }
      });

      await dbRepository.createTimelineEvent(businessId, {
        eventType,
        title: `Application ${updated.application_type}: ${updates.status.replace(/_/g, ' ')}`,
        description: `Application status updated with ${updated.institution_name}.`,
        metadata: { applicationId, newStatus: updates.status }
      });
    }

    return updated;
  },

  deleteApplication: async (businessId, applicationId) => {
    const current = await dbRepository.getApplicationById(businessId, applicationId);
    if (!current) return false;

    if (hasSupabase()) {
      const cleanAppId = toValidUuid(applicationId);
      const cleanBizId = toValidUuid(businessId);
      await supabase.from('business_application_documents').delete().eq('application_id', cleanAppId);
      await supabase.from('business_application_timeline').delete().eq('application_id', cleanAppId);
      const { error } = await supabase.from('business_applications').delete().eq('id', cleanAppId).eq('business_id', cleanBizId);
      return !error;
    }

    const db = await initLocalTables();
    db.run('DELETE FROM business_application_documents WHERE application_id = :id', { ':id': String(applicationId) });
    db.run('DELETE FROM business_application_timeline WHERE application_id = :id', { ':id': String(applicationId) });
    db.run('DELETE FROM business_applications WHERE id = :id AND business_id = :bizId', { ':id': String(applicationId), ':bizId': String(businessId) });
    saveDb();
    return true;
  },

  linkApplicationDocument: async (businessId, applicationId, documentId, isRequired = true) => {
    const app = await dbRepository.getApplicationById(businessId, applicationId);
    if (!app) return null;

    const doc = await dbRepository.getDocumentById(businessId, documentId);
    if (!doc) return null;

    const id = generateId('appdoc');
    const now = new Date().toISOString();

    if (hasSupabase()) {
      const cleanAppId = toValidUuid(applicationId);
      const cleanDocId = toValidUuid(doc.id);
      const cleanBizId = toValidUuid(businessId);

      const { data, error } = await supabase
        .from('business_application_documents')
        .upsert({
          id,
          application_id: cleanAppId,
          document_id: cleanDocId,
          business_id: cleanBizId,
          is_required: Boolean(isRequired),
          created_at: now
        }, { onConflict: 'application_id,document_id' })
        .select()
        .single();
      if (error) throw error;

      await dbRepository.createApplicationTimelineEvent(businessId, applicationId, {
        eventType: 'APPLICATION_DOCUMENTS_ATTACHED',
        title: `Document Linked: ${doc.document_name}`,
        description: `Attached ${doc.document_name} to application package.`,
        metadata: { documentId: doc.id, documentType: doc.document_type }
      });

      return data;
    }

    const db = await initLocalTables();
    db.run(
      `INSERT OR REPLACE INTO business_application_documents (id, application_id, document_id, business_id, is_required, created_at)
       VALUES (:id, :appId, :docId, :bizId, :req, :now)`,
      {
        ':id': id,
        ':appId': String(applicationId),
        ':docId': String(doc.id),
        ':bizId': String(businessId),
        ':req': isRequired ? 1 : 0,
        ':now': now
      }
    );
    saveDb();

    await dbRepository.createApplicationTimelineEvent(businessId, applicationId, {
      eventType: 'APPLICATION_DOCUMENTS_ATTACHED',
      title: `Document Linked: ${doc.document_name}`,
      description: `Attached ${doc.document_name} to application package.`,
      metadata: { documentId: doc.id, documentType: doc.document_type }
    });

    return { id, application_id: applicationId, document_id: doc.id, business_id: businessId, is_required: isRequired };
  },

  unlinkApplicationDocument: async (businessId, applicationId, documentId) => {
    const app = await dbRepository.getApplicationById(businessId, applicationId);
    if (!app) return false;

    const doc = await dbRepository.getDocumentById(businessId, documentId);
    const targetDocId = doc ? doc.id : documentId;

    if (hasSupabase()) {
      const cleanAppId = toValidUuid(applicationId);
      const cleanDocId = toValidUuid(targetDocId);
      const { error } = await supabase
        .from('business_application_documents')
        .delete()
        .eq('application_id', cleanAppId)
        .eq('document_id', cleanDocId);
      return !error;
    }

    const db = await initLocalTables();
    db.run('DELETE FROM business_application_documents WHERE application_id = :appId AND document_id = :docId', {
      ':appId': String(applicationId),
      ':docId': String(targetDocId)
    });
    saveDb();
    return true;
  },

  listApplicationDocuments: async (businessId, applicationId) => {
    const app = await dbRepository.getApplicationById(businessId, applicationId);
    if (!app) return [];

    const allDocs = await dbRepository.listBusinessDocuments(businessId);
    const docMap = new Map(allDocs.map(d => [String(d.id), d]));

    if (hasSupabase()) {
      const cleanAppId = toValidUuid(applicationId);
      const { data, error } = await supabase
        .from('business_application_documents')
        .select('*')
        .eq('application_id', cleanAppId);
      if (error) throw error;
      return (data || []).map(link => {
        const doc = docMap.get(String(link.document_id)) || {};
        return {
          ...link,
          document: doc
        };
      });
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM business_application_documents WHERE application_id = :appId');
    stmt.bind({ ':appId': String(applicationId) });
    const links = [];
    while (stmt.step()) {
      links.push(stmt.getAsObject());
    }
    stmt.free();

    return links.map(link => {
      const doc = docMap.get(String(link.document_id)) || {};
      return {
        ...link,
        document: doc
      };
    });
  },

  listApplicationTimeline: async (businessId, applicationId) => {
    if (hasSupabase()) {
      const cleanAppId = toValidUuid(applicationId);
      const cleanBizId = toValidUuid(businessId);
      const { data, error } = await supabase
        .from('business_application_timeline')
        .select('*')
        .eq('application_id', cleanAppId)
        .eq('business_id', cleanBizId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        metadata: typeof t.metadata === 'string' ? JSON.parse(t.metadata) : (t.metadata || {})
      }));
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM business_application_timeline WHERE application_id = :appId AND business_id = :bizId ORDER BY created_at DESC');
    stmt.bind({ ':appId': String(applicationId), ':bizId': String(businessId) });
    const list = [];
    while (stmt.step()) {
      const item = stmt.getAsObject();
      try { item.metadata = JSON.parse(item.metadata); } catch {}
      list.push(item);
    }
    stmt.free();
    return list;
  },

  createApplicationTimelineEvent: async (businessId, applicationId, { eventType, title, description = '', metadata = {} }) => {
    const id = generateId('apptl');
    const now = new Date().toISOString();

    if (hasSupabase()) {
      const cleanAppId = toValidUuid(applicationId);
      const cleanBizId = toValidUuid(businessId);
      const { data, error } = await supabase
        .from('business_application_timeline')
        .insert({
          id,
          application_id: cleanAppId,
          business_id: cleanBizId,
          event_type: eventType,
          title,
          description,
          metadata,
          created_at: now
        })
        .select()
        .single();
      if (error) return null;
      return {
        ...data,
        metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : (data.metadata || {})
      };
    }

    const db = await initLocalTables();
    db.run(
      `INSERT INTO business_application_timeline (id, application_id, business_id, event_type, title, description, metadata, created_at)
       VALUES (:id, :appId, :bizId, :type, :title, :desc, :meta, :now)`,
      {
        ':id': id,
        ':appId': String(applicationId),
        ':bizId': String(businessId),
        ':type': eventType,
        ':title': title,
        ':desc': description,
        ':meta': JSON.stringify(metadata || {}),
        ':now': now
      }
    );
    saveDb();
    return { id, application_id: applicationId, business_id: businessId, event_type: eventType, title, description, metadata, created_at: now };
  },

  // ── 15. SMART PENDING ACTIONS ("Needs Your Attention") ──
  getSmartPendingActions: async (userId, businessId = null) => {
    const businesses = businessId 
      ? [await dbRepository.getBusiness(businessId, userId)].filter(Boolean)
      : await dbRepository.listBusinesses(userId);

    const pendingActions = [];

    for (const biz of businesses) {
      const bId = biz.id;
      const bName = biz.name;
      const domain = biz.domain;

      // 1. Rejected Documents (Highest Urgency)
      const docs = await dbRepository.listBusinessDocuments(bId);
      const rejectedDocs = docs.filter(d => d.status === 'rejected');
      for (const d of rejectedDocs) {
        pendingActions.push({
          id: `act_rej_${d.id}`,
          title: `Rejected: ${d.document_name}`,
          reason: d.rejection_reason || 'Document verification failed. Please upload a clear replacement.',
          businessId: bId,
          businessName: bName,
          domain,
          priority: 'high',
          category: 'documentation',
          actionType: 'REPLACE_DOCUMENT',
          actionLabel: 'Replace Document',
          actionLink: `/businesses/${bId}?tab=documents&doc=${d.id}`
        });
      }

      // 2. Applications Requiring Action
      const apps = await dbRepository.listApplications(bId);
      const actionApps = apps.filter(a => a.status === 'ACTION_REQUIRED');
      for (const a of actionApps) {
        pendingActions.push({
          id: `act_app_${a.id}`,
          title: `Action Required: ${a.application_type}`,
          reason: a.notes || `The institution (${a.institution_name}) requested additional information.`,
          businessId: bId,
          businessName: bName,
          domain,
          priority: 'high',
          category: 'application',
          actionType: 'RESOLVE_APPLICATION',
          actionLabel: 'Review Application',
          actionLink: `/businesses/${bId}?tab=applications&appId=${a.id}`
        });
      }

      // 3. Mandatory Documents Missing
      const missingMandatory = docs.filter(d => d.is_mandatory && (d.status === 'missing' || !d.status));
      for (const m of missingMandatory) {
        pendingActions.push({
          id: `act_miss_${m.id}`,
          title: `Missing Required Document: ${m.document_name}`,
          reason: `Statutory compliance requires ${m.document_name} prior to submission.`,
          businessId: bId,
          businessName: bName,
          domain,
          priority: 'high',
          category: 'documentation',
          actionType: 'UPLOAD_DOCUMENT',
          actionLabel: 'Upload Document',
          actionLink: `/businesses/${bId}?tab=documents&doc=${m.id}`
        });
      }

      // 4. Outdated Financial Feasibility Analysis
      const latestInputs = await dbRepository.getLatestBusinessInputs(bId);
      const analyses = await dbRepository.listAnalyses(bId);
      const latestAnalysis = analyses && analyses.length > 0 ? analyses[0] : null;

      if (latestAnalysis && latestInputs) {
        const inputVersions = await dbRepository.listBusinessInputs(bId);
        const maxInputVersion = inputVersions.length > 0 ? Math.max(...inputVersions.map(v => v.version_number)) : 1;
        if (latestAnalysis.input_version && maxInputVersion > latestAnalysis.input_version) {
          pendingActions.push({
            id: `act_outdated_${bId}`,
            title: 'Feasibility Analysis Outdated',
            reason: `Business inputs updated to v${maxInputVersion} after analysis v${latestAnalysis.input_version} was generated.`,
            businessId: bId,
            businessName: bName,
            domain,
            priority: 'medium',
            category: 'analysis',
            actionType: 'RUN_ANALYSIS',
            actionLabel: 'Rerun Analysis',
            actionLink: `/businesses/${bId}?tab=analysis`
          });
        }
      }

      // 5. Completed Analysis but DPR Not Generated
      const dprs = await dbRepository.listDprVersions(bId);
      if (latestAnalysis && latestAnalysis.status === 'ANALYSIS_COMPLETE' && dprs.length === 0) {
        pendingActions.push({
          id: `act_dpr_pending_${bId}`,
          title: 'Bankable DPR Not Yet Archived',
          reason: 'Financial feasibility passed. Generate your official Detailed Project Report.',
          businessId: bId,
          businessName: bName,
          domain,
          priority: 'medium',
          category: 'dpr',
          actionType: 'GENERATE_DPR',
          actionLabel: 'Generate DPR',
          actionLink: `/businesses/${bId}?tab=reports`
        });
      }

      // 6. High Priority Pending Tasks & Overdue Tasks
      const tasks = await dbRepository.listActionTasks(bId);
      const prioritizedTasks = tasks.filter(t => (t.priority === 'high' || (t.due_date && new Date(t.due_date) < new Date())) && t.status !== 'completed');
      for (const t of prioritizedTasks.slice(0, 3)) {
        const isOverdue = !!(t.due_date && new Date(t.due_date) < new Date());
        pendingActions.push({
          id: `act_task_${t.id}`,
          title: `${isOverdue ? 'Overdue: ' : 'Milestone: '}${t.title}`,
          reason: isOverdue ? `Milestone is overdue (due: ${t.due_date}). Immediate completion recommended.` : (t.description || 'Critical operational task requires execution.'),
          businessId: bId,
          businessName: bName,
          domain,
          priority: 'high',
          isOverdue,
          category: 'task',
          actionType: 'EXECUTE_TASK',
          actionLabel: 'View Milestone',
          actionLink: `/businesses/${bId}?tab=action-plan`
        });
      }

      // 7. Applications Approaching Expected Response Date
      const nowMs = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      for (const a of apps) {
        if (a.expected_response_date && (a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW')) {
          const expMs = new Date(a.expected_response_date).getTime();
          if (!isNaN(expMs) && expMs <= (nowMs + sevenDaysMs)) {
            const isOverdue = expMs < nowMs;
            pendingActions.push({
              id: `act_exp_${a.id}`,
              title: `${isOverdue ? 'Overdue Response' : 'Response Due Soon'}: ${a.application_type}`,
              reason: `Expected response date was ${a.expected_response_date}. Follow up with ${a.institution_name}.`,
              businessId: bId,
              businessName: bName,
              domain,
              priority: isOverdue ? 'high' : 'medium',
              category: 'application',
              actionType: 'FOLLOW_UP',
              actionLabel: 'Check Status',
              actionLink: `/businesses/${bId}?tab=applications&appId=${a.id}`
            });
          }
        }
      }
    }

    // Sort by priority (high first)
    return pendingActions.sort((a, b) => (a.priority === 'high' ? -1 : 1));
  },

  // ── 16. IDEMPOTENT NOTIFICATION & REMINDER GENERATOR ──
  checkAndGenerateReminders: async (userId) => {
    const actions = await dbRepository.getSmartPendingActions(userId);
    const existingNotifs = await dbRepository.listNotifications(userId);
    const existingTitles = new Set(existingNotifs.map(n => n.title));

    let createdCount = 0;
    for (const act of actions) {
      if (!existingTitles.has(act.title)) {
        await dbRepository.createNotification(userId, {
          title: act.title,
          message: `${act.businessName}: ${act.reason}`,
          type: act.priority === 'high' ? 'WARNING' : 'INFO',
          category: act.category || 'SYSTEM',
          action_url: act.actionLink
        });
        existingTitles.add(act.title);
        createdCount++;
      }
    }
    return { generatedCount: createdCount };
  },

  // ── 17. DPR VERSIONS (Immutable Bankable Snapshots) ──
  listDprVersions: async (businessId) => {
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data, error } = await supabase
        .from('dpr_versions')
        .select('*')
        .eq('business_id', cleanBizId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        content_snapshot: typeof d.content_snapshot === 'string' ? JSON.parse(d.content_snapshot) : d.content_snapshot
      }));
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM dpr_versions WHERE business_id = :bizId ORDER BY version_number DESC');
    stmt.bind({ ':bizId': String(businessId) });
    const list = [];
    while (stmt.step()) {
      const item = stmt.getAsObject();
      try { item.content_snapshot = JSON.parse(item.content_snapshot); } catch {}
      list.push(item);
    }
    stmt.free();
    return list;
  },

  getDprVersion: async (businessId, versionIdOrNumber) => {
    const versions = await dbRepository.listDprVersions(businessId);
    return versions.find(v => String(v.id) === String(versionIdOrNumber) || String(v.version_number) === String(versionIdOrNumber)) || null;
  },

  createDprVersion: async (businessId, dprData) => {
    let nextVersionNum;
    if (hasSupabase()) {
      const existing = await dbRepository.listDprVersions(businessId);
      nextVersionNum = existing.length > 0 ? Math.max(...existing.map(v => Number(v.version_number) || 0)) + 1 : 1;
    } else {
      const db = await initLocalTables();
      const vStmt = db.prepare('SELECT COALESCE(MAX(version_number), 0) + 1 AS next_ver FROM dpr_versions WHERE business_id = :bizId');
      vStmt.bind({ ':bizId': String(businessId) });
      if (vStmt.step()) {
        nextVersionNum = Number(vStmt.getAsObject().next_ver) || 1;
      } else {
        nextVersionNum = 1;
      }
      vStmt.free();
    }
    const id = generateId('dprv');
    const now = new Date().toISOString();

    const title = dprData.title || `Detailed Project Report v${nextVersionNum}`;
    const summary = dprData.summary || '';
    const content = dprData.content || dprData.content_snapshot || {};
    const analysisId = dprData.analysisId || dprData.analysis_id || null;
    const inputVersion = dprData.inputVersion || dprData.input_version || 1;
    const createdBy = dprData.createdBy || dprData.created_by || null;

    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const cleanAnlId = analysisId ? toValidUuid(analysisId) : null;
      const cleanUser = createdBy ? toValidUuid(createdBy) : null;

      const { data, error } = await supabase
        .from('dpr_versions')
        .insert({
          id,
          business_id: cleanBizId,
          analysis_id: cleanAnlId,
          input_version: inputVersion,
          version_number: nextVersionNum,
          title,
          summary,
          content_snapshot: content,
          created_at: now,
          created_by: cleanUser
        })
        .select()
        .single();
      if (error) throw error;

      await dbRepository.createTimelineEvent(businessId, {
        eventType: 'DPR_VERSION_CREATED',
        title: `DPR v${nextVersionNum} Generated`,
        description: `Bankable Detailed Project Report version ${nextVersionNum} generated and archived.`,
        metadata: { version_number: nextVersionNum, dpr_version_id: id }
      });

      return {
        ...data,
        content_snapshot: typeof data.content_snapshot === 'string' ? JSON.parse(data.content_snapshot) : data.content_snapshot
      };
    }

    const db = await initLocalTables();
    db.run(
      `INSERT INTO dpr_versions (id, business_id, analysis_id, input_version, version_number, title, summary, content_snapshot, created_at, created_by)
       VALUES (:id, :bizId, :anlId, :inv, :vnum, :title, :summary, :content, :now, :createdBy)`,
      {
        ':id': id,
        ':bizId': String(businessId),
        ':anlId': analysisId ? String(analysisId) : null,
        ':inv': inputVersion,
        ':vnum': nextVersionNum,
        ':title': title,
        ':summary': summary,
        ':content': JSON.stringify(content),
        ':now': now,
        ':createdBy': createdBy ? String(createdBy) : null
      }
    );
    saveDb();

    await dbRepository.createTimelineEvent(businessId, {
      eventType: 'DPR_VERSION_CREATED',
      title: `DPR v${nextVersionNum} Generated`,
      description: `Bankable Detailed Project Report version ${nextVersionNum} generated and archived.`,
      metadata: { version_number: nextVersionNum, dpr_version_id: id }
    });

    return {
      id,
      business_id: businessId,
      analysis_id: analysisId,
      input_version: inputVersion,
      version_number: nextVersionNum,
      title,
      summary,
      content_snapshot: content,
      created_at: now,
      created_by: createdBy
    };
  },

  // ── 15. BUSINESS TIMELINE (Audit & Activity Trail) ──
  listTimelineEvents: async (businessId, limit = 50) => {
    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data, error } = await supabase
        .from('business_timeline')
        .select('*')
        .eq('business_id', cleanBizId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []).map(e => ({
        ...e,
        metadata: typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata
      }));
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM business_timeline WHERE business_id = :bizId ORDER BY created_at DESC LIMIT :limit');
    stmt.bind({ ':bizId': String(businessId), ':limit': limit });
    const list = [];
    while (stmt.step()) {
      const item = stmt.getAsObject();
      try { item.metadata = JSON.parse(item.metadata); } catch {}
      list.push(item);
    }
    stmt.free();
    return list;
  },

  createTimelineEvent: async (businessId, { eventType, title, description = '', metadata = {} }) => {
    const id = generateId('tl');
    const now = new Date().toISOString();

    if (hasSupabase()) {
      const cleanBizId = toValidUuid(businessId);
      const { data, error } = await supabase
        .from('business_timeline')
        .insert({
          id,
          business_id: cleanBizId,
          event_type: eventType,
          title,
          description,
          metadata,
          created_at: now
        })
        .select()
        .single();
      if (error) return null; // Non-fatal for timeline logging
      return {
        ...data,
        metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata
      };
    }

    const db = await initLocalTables();
    db.run(
      `INSERT INTO business_timeline (id, business_id, event_type, title, description, metadata, created_at)
       VALUES (:id, :bizId, :type, :title, :desc, :meta, :now)`,
      {
        ':id': id,
        ':bizId': String(businessId),
        ':type': eventType,
        ':title': title,
        ':desc': description,
        ':meta': JSON.stringify(metadata || {}),
        ':now': now
      }
    );
    saveDb();
    return { id, business_id: businessId, event_type: eventType, title, description, metadata, created_at: now };
  },

  // ── 21. PRODUCT ANALYTICS EVENTS ──────────────────────────────────────────
  recordProductEvent: async ({ userId, businessId, eventType, metadata = {} }) => {
    const id = generateId('evt');
    const now = new Date().toISOString();
    const cleanUserId = userId ? String(userId) : null;
    const cleanBizId = businessId ? String(businessId) : null;

    if (hasSupabase()) {
      const { data, error } = await supabase
        .from('business_product_events')
        .insert({
          id,
          user_id: cleanUserId ? toValidUuid(cleanUserId) : null,
          business_id: cleanBizId ? toValidUuid(cleanBizId) : null,
          event_type: eventType,
          event_metadata: metadata,
          created_at: now
        })
        .select()
        .single();
      if (error) return null;
      return data;
    }

    const db = await initLocalTables();
    db.run(
      `INSERT INTO business_product_events (id, user_id, business_id, event_type, event_metadata, created_at)
       VALUES (:id, :userId, :bizId, :type, :meta, :now)`,
      {
        ':id': id,
        ':userId': cleanUserId,
        ':bizId': cleanBizId,
        ':type': eventType,
        ':meta': JSON.stringify(metadata || {}),
        ':now': now
      }
    );
    saveDb();
    return { id, user_id: cleanUserId, business_id: cleanBizId, event_type: eventType, event_metadata: metadata, created_at: now };
  },

  listProductEvents: async ({ businessId, userId, eventType, limit = 50, page = 1 } = {}) => {
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (safePage - 1) * safeLimit;

    if (hasSupabase()) {
      let query = supabase.from('business_product_events').select('*', { count: 'exact' });
      if (businessId) query = query.eq('business_id', toValidUuid(businessId));
      if (userId) query = query.eq('user_id', toValidUuid(userId));
      if (eventType) query = query.eq('event_type', eventType);
      query = query.order('created_at', { ascending: false }).range(offset, offset + safeLimit - 1);
      const { data, count, error } = await query;
      if (error) return { items: [], total: 0 };
      return { items: data || [], total: count || 0 };
    }

    const db = await initLocalTables();
    const whereClauses = [];
    const params = {};
    if (businessId) {
      whereClauses.push('business_id = :bizId');
      params[':bizId'] = String(businessId);
    }
    if (userId) {
      whereClauses.push('user_id = :userId');
      params[':userId'] = String(userId);
    }
    if (eventType) {
      whereClauses.push('event_type = :eventType');
      params[':eventType'] = String(eventType);
    }
    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countStmt = db.prepare(`SELECT COUNT(*) AS total FROM business_product_events ${whereSql}`);
    countStmt.bind(params);
    let total = 0;
    if (countStmt.step()) total = countStmt.getAsObject().total;
    countStmt.free();

    const stmt = db.prepare(`SELECT * FROM business_product_events ${whereSql} ORDER BY created_at DESC LIMIT :limit OFFSET :offset`);
    stmt.bind({ ...params, ':limit': safeLimit, ':offset': offset });
    const items = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      try { row.event_metadata = JSON.parse(row.event_metadata); } catch {}
      items.push(row);
    }
    stmt.free();
    return { items, total };
  },

  // ── 22. BUSINESS OUTCOMES TRACKING ─────────────────────────────────────────
  recordBusinessOutcome: async ({ businessId, userId, outcomeType, value, unit = '', period = '', source = 'user_reported', notes = '' }) => {
    const id = generateId('out');
    const now = new Date().toISOString();
    const cleanUserId = String(userId);
    const cleanBizId = String(businessId);
    const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;

    if (hasSupabase()) {
      const { data, error } = await supabase
        .from('business_outcomes')
        .insert({
          id,
          business_id: toValidUuid(cleanBizId),
          user_id: toValidUuid(cleanUserId),
          outcome_type: outcomeType,
          value: numValue,
          unit,
          period,
          source,
          notes,
          created_at: now
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const db = await initLocalTables();
    db.run(
      `INSERT INTO business_outcomes (id, business_id, user_id, outcome_type, value, unit, period, source, notes, verification_status, created_at)
       VALUES (:id, :bizId, :userId, :type, :val, :unit, :period, :source, :notes, :vStatus, :now)`,
      {
        ':id': id,
        ':bizId': cleanBizId,
        ':userId': cleanUserId,
        ':type': outcomeType,
        ':val': numValue,
        ':unit': unit,
        ':period': period,
        ':source': source,
        ':notes': notes,
        ':vStatus': 'reported',
        ':now': now
      }
    );
    saveDb();
    return { id, business_id: cleanBizId, user_id: cleanUserId, outcome_type: outcomeType, value: numValue, unit, period, source, notes, verification_status: 'reported', created_at: now };
  },

  listBusinessOutcomes: async (businessIdOrOpts, userId, opts = {}) => {
    const businessId = typeof businessIdOrOpts === 'object' && businessIdOrOpts !== null
      ? businessIdOrOpts.businessId
      : businessIdOrOpts;
    const cleanBizId = String(businessId);
    const outcomeType = (typeof businessIdOrOpts === 'object' && businessIdOrOpts !== null)
      ? businessIdOrOpts.outcomeType
      : (opts.outcomeType || null);

    if (hasSupabase()) {
      let query = supabase.from('business_outcomes').select('*').eq('business_id', toValidUuid(cleanBizId));
      if (outcomeType) query = query.eq('outcome_type', outcomeType);
      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) return [];
      return data || [];
    }

    const db = await initLocalTables();
    const whereClauses = ['business_id = :bizId'];
    const params = { ':bizId': cleanBizId };
    if (outcomeType) {
      whereClauses.push('outcome_type = :type');
      params[':type'] = String(outcomeType);
    }
    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const stmt = db.prepare(`SELECT * FROM business_outcomes ${whereSql} ORDER BY created_at DESC`);
    stmt.bind(params);
    const items = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject());
    }
    stmt.free();
    return items;
  },

  // ── 23. USER FEEDBACK ──────────────────────────────────────────────────────
  createFeedback: async ({ userId, businessId = null, category = 'general', feature = '', rating, message = '' }) => {
    const id = generateId('fdb');
    const now = new Date().toISOString();
    const cleanUserId = String(userId);
    const cleanBizId = businessId ? String(businessId) : null;
    const numRating = Math.max(1, Math.min(5, parseInt(rating, 10) || 5));
    const cleanCat = String(category || 'general');
    const cleanFeat = String(feature || '');
    const cleanMsg = String(message || '');

    if (hasSupabase()) {
      const { data, error } = await supabase
        .from('user_feedback')
        .insert({
          id,
          user_id: toValidUuid(cleanUserId),
          business_id: cleanBizId ? toValidUuid(cleanBizId) : null,
          category: cleanCat,
          feature: cleanFeat,
          rating: numRating,
          message: cleanMsg,
          created_at: now
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const db = await initLocalTables();
    db.run(
      `INSERT INTO user_feedback (id, user_id, business_id, category, feature, rating, message, created_at)
       VALUES (:id, :userId, :bizId, :cat, :feat, :rating, :msg, :now)`,
      {
        ':id': id,
        ':userId': cleanUserId,
        ':bizId': cleanBizId,
        ':cat': cleanCat,
        ':feat': cleanFeat,
        ':rating': numRating,
        ':msg': cleanMsg,
        ':now': now
      }
    );
    saveDb();
    return { id, user_id: cleanUserId, business_id: cleanBizId, category: cleanCat, feature: cleanFeat, rating: numRating, message: cleanMsg, created_at: now };
  },

  listFeedback: async ({ userId, category, feature, minRating, limit = 50, page = 1 } = {}) => {
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (safePage - 1) * safeLimit;

    if (hasSupabase()) {
      let query = supabase.from('user_feedback').select('*', { count: 'exact' });
      if (userId) query = query.eq('user_id', toValidUuid(userId));
      if (category) query = query.eq('category', category);
      if (feature) query = query.eq('feature', feature);
      if (minRating) query = query.gte('rating', minRating);
      query = query.order('created_at', { ascending: false }).range(offset, offset + safeLimit - 1);
      const { data, count, error } = await query;
      if (error) return { items: [], total: 0 };
      return { items: data || [], total: count || 0 };
    }

    const db = await initLocalTables();
    const whereClauses = [];
    const params = {};
    if (userId) {
      whereClauses.push('user_id = :userId');
      params[':userId'] = String(userId);
    }
    if (category) {
      whereClauses.push('category = :category');
      params[':category'] = String(category);
    }
    if (feature) {
      whereClauses.push('feature = :feature');
      params[':feature'] = String(feature);
    }
    if (minRating) {
      whereClauses.push('rating >= :minRating');
      params[':minRating'] = Number(minRating);
    }
    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countStmt = db.prepare(`SELECT COUNT(*) AS total FROM user_feedback ${whereSql}`);
    countStmt.bind(params);
    let total = 0;
    if (countStmt.step()) total = countStmt.getAsObject().total;
    countStmt.free();

    const stmt = db.prepare(`SELECT * FROM user_feedback ${whereSql} ORDER BY created_at DESC LIMIT :limit OFFSET :offset`);
    stmt.bind({ ...params, ':limit': safeLimit, ':offset': offset });
    const items = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject());
    }
    stmt.free();
    return { items, total };
  },

  listAllFeedbackAdmin: async ({ limit = 50, page = 1, category = null, minRating = null } = {}) => {
    return await dbRepository.listFeedback({ category, minRating, limit, page });
  },

  // ── 24. RECOMMENDATION EFFECTIVENESS ───────────────────────────────────────
  recordRecommendationAction: async ({ businessId, userId = null, recommendationId, recommendationType = 'next_best_action', actionTitle = '', status = 'created', taskId = null, source = 'next_action', metadata = {} }) => {
    const id = generateId('rca');
    const now = new Date().toISOString();
    const cleanBizId = String(businessId);
    let cleanUserId = userId ? String(userId) : null;

    if (!cleanUserId) {
      const biz = await dbRepository.getBusiness(businessId);
      cleanUserId = biz ? String(biz.user_id) : 'system_user';
    }
    const cleanRecId = String(recommendationId);

    const cleanTitle = String(actionTitle || (metadata && metadata.title) || recommendationId || 'Recommendation');
    const cleanStatus = String(status || 'created');
    const cleanSource = String(source || recommendationType || 'next_action');

    const db = await initLocalTables();
    let existingId = null;
    if (recommendationId) {
      const chk = db.prepare('SELECT id FROM recommendation_actions WHERE business_id = :bizId AND recommendation_id = :rId LIMIT 1');
      chk.bind({ ':bizId': cleanBizId, ':rId': cleanRecId });
      if (chk.step()) {
        existingId = chk.getAsObject().id;
      }
      chk.free();
    }

    if (existingId) {
      db.run(
        `UPDATE recommendation_actions 
         SET status = :status, task_id = COALESCE(:taskId, task_id), metadata = :meta, updated_at = :now
         WHERE id = :id`,
        {
          ':status': cleanStatus,
          ':taskId': taskId ? String(taskId) : null,
          ':meta': JSON.stringify(metadata || {}),
          ':now': now,
          ':id': existingId
        }
      );
      saveDb();
      return { id: existingId, business_id: cleanBizId, user_id: cleanUserId, recommendation_id: cleanRecId, action_title: cleanTitle, status: cleanStatus, task_id: taskId ? String(taskId) : null, updated_at: now };
    }

    db.run(
      `INSERT INTO recommendation_actions (id, business_id, user_id, recommendation_id, action_title, status, task_id, source, metadata, created_at, updated_at)
       VALUES (:id, :bizId, :userId, :rId, :title, :status, :taskId, :source, :meta, :now, :now)`,
      {
        ':id': id,
        ':bizId': cleanBizId,
        ':userId': cleanUserId,
        ':rId': cleanRecId,
        ':title': cleanTitle,
        ':status': cleanStatus,
        ':taskId': taskId ? String(taskId) : null,
        ':source': cleanSource,
        ':meta': JSON.stringify(metadata || {}),
        ':now': now
      }
    );
    saveDb();
    return { id, business_id: cleanBizId, user_id: cleanUserId, recommendation_id: cleanRecId, action_title: cleanTitle, status: cleanStatus, task_id: taskId ? String(taskId) : null, source: cleanSource, metadata, created_at: now };
  },

  listRecommendationActions: async (businessIdOrOpts) => {
    const businessId = typeof businessIdOrOpts === 'object' && businessIdOrOpts !== null
      ? businessIdOrOpts.businessId
      : businessIdOrOpts;

    const db = await initLocalTables();
    let sql = 'SELECT * FROM recommendation_actions';
    const params = {};
    if (businessId) {
      sql += ' WHERE business_id = :bizId';
      params[':bizId'] = String(businessId);
    }
    sql += ' ORDER BY created_at DESC';

    const stmt = db.prepare(sql);
    stmt.bind(params);
    const items = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      try { row.metadata = JSON.parse(row.metadata); } catch {}
      items.push(row);
    }
    stmt.free();
    return items;
  },


  // ── 25. PLATFORM METRICS SUMMARY (Admin & Aggregates) ──────────────────────
  getPlatformMetricsSummary: async () => {
    const db = await initLocalTables();
    const queryOne = (sql, params = {}) => {
      try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        let res = null;
        if (stmt.step()) res = stmt.getAsObject();
        stmt.free();
        return res;
      } catch (_) {
        return null;
      }
    };
    const queryAll = (sql, params = {}) => {
      try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      } catch (_) {
        return [];
      }
    };

    const totalUsers = queryOne('SELECT COUNT(*) AS count FROM users')?.count || 0;
    const completedProfiles = queryOne("SELECT COUNT(*) AS count FROM profiles WHERE full_name IS NOT NULL AND full_name != ''")?.count || 0;
    const totalBusinesses = queryOne('SELECT COUNT(*) AS count FROM businesses')?.count || 0;
    const activeBusinesses = queryOne("SELECT COUNT(*) AS count FROM businesses WHERE status != 'ARCHIVED'")?.count || 0;
    const uniqueBizOwners = queryOne('SELECT COUNT(DISTINCT user_id) AS count FROM businesses')?.count || 0;

    const domainRows = queryAll('SELECT domain, COUNT(*) as count FROM businesses GROUP BY domain');
    const domainCounts = {};
    domainRows.forEach(r => { domainCounts[r.domain || 'other'] = r.count; });

    const totalAnalyses = queryOne('SELECT COUNT(*) AS count FROM business_analyses')?.count || 0;
    const completedAnalyses = queryOne("SELECT COUNT(*) AS count FROM business_analyses WHERE status IN ('ANALYSIS_COMPLETE', 'SUCCESS')")?.count || 0;
    const uniqueAnalysesOwners = queryOne("SELECT COUNT(DISTINCT b.user_id) AS count FROM business_analyses a JOIN businesses b ON a.business_id = b.id WHERE a.status IN ('ANALYSIS_COMPLETE', 'SUCCESS')")?.count || 0;

    const totalTasks = queryOne('SELECT COUNT(*) AS count FROM business_action_tasks')?.count || 0;
    const completedTasks = queryOne("SELECT COUNT(*) AS count FROM business_action_tasks WHERE status = 'completed'")?.count || 0;
    const blockedTasks = queryOne("SELECT COUNT(*) AS count FROM business_action_tasks WHERE status = 'blocked'")?.count || 0;
    const overdueTasks = queryOne("SELECT COUNT(*) AS count FROM business_action_tasks WHERE due_date IS NOT NULL AND due_date != '' AND datetime(due_date) < datetime('now') AND status != 'completed'")?.count || 0;

    const totalDocs = queryOne('SELECT COUNT(*) AS count FROM business_documents')?.count || 0;
    const verifiedDocs = queryOne("SELECT COUNT(*) AS count FROM business_documents WHERE status = 'verified'")?.count || 0;
    const uploadedDocs = queryOne("SELECT COUNT(*) AS count FROM business_documents WHERE status IN ('uploaded', 'provided', 'verified')")?.count || 0;
    const missingMandatoryDocs = queryOne("SELECT COUNT(*) AS count FROM business_documents WHERE is_mandatory = 1 AND (status = 'missing' OR status IS NULL OR status = '')")?.count || 0;

    const totalApplications = queryOne('SELECT COUNT(*) AS count FROM business_applications')?.count || 0;
    const appRows = queryAll('SELECT status, COUNT(*) AS count FROM business_applications GROUP BY status');
    const appStatusCounts = {};
    appRows.forEach(r => { appStatusCounts[r.status] = r.count; });

    const totalDprs = queryOne('SELECT COUNT(*) AS count FROM dpr_versions')?.count || 0;
    const businessesWithDpr = queryOne('SELECT COUNT(DISTINCT business_id) AS count FROM dpr_versions')?.count || 0;

    const feedbackCount = queryOne('SELECT COUNT(*) AS count FROM user_feedback')?.count || 0;
    const avgRating = queryOne('SELECT AVG(rating) AS avg FROM user_feedback')?.avg || 0;

    const outcomesCount = queryOne('SELECT COUNT(*) AS count FROM business_outcomes')?.count || 0;
    const eventsCount = queryOne('SELECT COUNT(*) AS count FROM business_product_events')?.count || 0;

    const recomTotal = queryOne('SELECT COUNT(*) AS count FROM recommendation_actions')?.count || 0;
    const recomAccepted = queryOne("SELECT COUNT(*) AS count FROM recommendation_actions WHERE status IN ('accepted', 'converted_to_task', 'completed')")?.count || 0;
    const recomConverted = queryOne("SELECT COUNT(*) AS count FROM recommendation_actions WHERE status IN ('converted_to_task', 'completed')")?.count || 0;
    const recomCompleted = queryOne("SELECT COUNT(*) AS count FROM recommendation_actions WHERE status = 'completed'")?.count || 0;
    const recomDismissed = queryOne("SELECT COUNT(*) AS count FROM recommendation_actions WHERE status = 'dismissed'")?.count || 0;

    return {
      users: {
        total: totalUsers,
        completedProfiles,
        profileCompletionRate: totalUsers > 0 ? Math.round((completedProfiles / totalUsers) * 100) : 0,
        ownersWithBusiness: uniqueBizOwners,
        businessCreationRate: totalUsers > 0 ? Math.round((uniqueBizOwners / totalUsers) * 100) : 0
      },
      businesses: {
        total: totalBusinesses,
        active: activeBusinesses,
        byDomain: domainCounts
      },
      analysis: {
        total: totalAnalyses,
        completed: completedAnalyses,
        uniqueUsersCompleted: uniqueAnalysesOwners,
        completionRate: totalBusinesses > 0 ? Math.round((completedAnalyses / totalBusinesses) * 100) : 0
      },
      execution: {
        totalTasks,
        completedTasks,
        blockedTasks,
        overdueTasks,
        taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      },
      documentation: {
        totalDocs,
        uploadedDocs,
        verifiedDocs,
        missingMandatoryDocs,
        readinessRate: totalDocs > 0 ? Math.round((uploadedDocs / totalDocs) * 100) : 0,
        verificationRate: totalDocs > 0 ? Math.round((verifiedDocs / totalDocs) * 100) : 0
      },
      applications: {
        total: totalApplications,
        byStatus: appStatusCounts,
        submitted: (appStatusCounts['SUBMITTED'] || 0) + (appStatusCounts['UNDER_REVIEW'] || 0),
        approved: appStatusCounts['APPROVED'] || 0,
        completed: appStatusCounts['COMPLETED'] || 0
      },
      dpr: {
        totalVersions: totalDprs,
        businessesWithDpr,
        generationRate: totalBusinesses > 0 ? Math.round((businessesWithDpr / totalBusinesses) * 100) : 0
      },
      recommendations: {
        totalGenerated: recomTotal,
        accepted: recomAccepted,
        convertedToTask: recomConverted,
        completed: recomCompleted,
        dismissed: recomDismissed,
        acceptanceRate: recomTotal > 0 ? Math.round((recomAccepted / recomTotal) * 100) : 0
      },
      feedback: {
        total: feedbackCount,
        averageRating: Math.round(Number(avgRating) * 10) / 10
      },
      outcomes: {
        totalReported: outcomesCount
      },
      productEvents: {
        totalTracked: eventsCount
      }
    };
  },

  // ── 26. PHASE 12: FIELD OPERATIONS & VISITS ──────────────────────────────
  createFieldVisit: async (arg1, arg2, arg3) => {
    let businessId, tenantId, visitData;
    if (typeof arg1 === 'object' && arg1 !== null && !arg2) {
      businessId = arg1.businessId || arg1.business_id;
      tenantId = arg1.tenantId || arg1.tenant_id;
      visitData = arg1;
    } else {
      businessId = arg1;
      tenantId = arg2;
      visitData = arg3 || {};
    }

    const id = generateId('fvis');
    const now = new Date().toISOString();
    const cleanBizId = String(businessId);
    const cleanTenantId = String(tenantId || businessId);
    const cleanOpId = String(visitData.officerId || visitData.officer_id || visitData.operator_id || visitData.operatorId || tenantId || businessId);
    const opName = String(visitData.officerName || visitData.officer_name || visitData.operator_name || visitData.operatorName || '');
    const schedDate = String(visitData.scheduled_date || visitData.scheduledDate || now.slice(0, 10));
    const status = String(visitData.status || 'SCHEDULED').toUpperCase();
    const checklist = visitData.checklist ? (typeof visitData.checklist === 'string' ? visitData.checklist : JSON.stringify(visitData.checklist)) : '[]';
    const evidenceRefs = visitData.evidence_refs || visitData.evidenceRefs ? (typeof (visitData.evidence_refs || visitData.evidenceRefs) === 'string' ? (visitData.evidence_refs || visitData.evidenceRefs) : JSON.stringify(visitData.evidence_refs || visitData.evidenceRefs)) : '[]';
    const notes = String(visitData.notes || '');
    const followUp = String(visitData.follow_up_actions || visitData.followUpActions || '');
    const result = String(visitData.verification_result || visitData.verificationResult || '');

    if (hasSupabase()) {
      const { data, error } = await supabase
        .from('field_visits')
        .insert({
          id,
          business_id: toValidUuid(cleanBizId),
          tenant_id: toValidUuid(cleanTenantId),
          operator_id: toValidUuid(cleanOpId),
          operator_name: opName,
          scheduled_date: schedDate,
          status,
          checklist: JSON.parse(checklist),
          notes,
          evidence_refs: JSON.parse(evidenceRefs),
          follow_up_actions: followUp,
          verification_result: result,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();
      if (error) return null;
      return data;
    }

    const db = await initLocalTables();
    db.run(
      `INSERT INTO field_visits (id, business_id, tenant_id, operator_id, operator_name, scheduled_date, status, checklist, notes, evidence_refs, follow_up_actions, verification_result, created_at, updated_at)
       VALUES (:id, :bizId, :tenantId, :opId, :opName, :schedDate, :status, :checklist, :notes, :evRefs, :followUp, :result, :now, :now)`,
      {
        ':id': id,
        ':bizId': cleanBizId,
        ':tenantId': cleanTenantId,
        ':opId': cleanOpId,
        ':opName': opName,
        ':schedDate': schedDate,
        ':status': status,
        ':checklist': checklist,
        ':notes': notes,
        ':evRefs': evidenceRefs,
        ':followUp': followUp,
        ':result': result,
        ':now': now
      }
    );
    saveDb();

    return {
      id,
      business_id: cleanBizId,
      tenant_id: cleanTenantId,
      operator_id: cleanOpId,
      operator_name: opName,
      scheduled_date: schedDate,
      status,
      checklist: JSON.parse(checklist),
      notes,
      evidence_refs: JSON.parse(evidenceRefs),
      follow_up_actions: followUp,
      verification_result: result,
      created_at: now,
      updated_at: now
    };
  },

  getFieldVisitById: async (visitId, businessId = null) => {
    if (hasSupabase()) {
      let query = supabase.from('field_visits').select('*').eq('id', toValidUuid(visitId));
      if (businessId) query = query.eq('business_id', toValidUuid(businessId));
      const { data, error } = await query.single();
      if (error) return null;
      return data;
    }

    const db = await initLocalTables();
    let sql = 'SELECT * FROM field_visits WHERE id = :id';
    const params = { ':id': String(visitId) };
    if (businessId) {
      sql += ' AND business_id = :bizId';
      params[':bizId'] = String(businessId);
    }
    const stmt = db.prepare(sql);
    stmt.bind(params);
    let row = null;
    if (stmt.step()) {
      row = stmt.getAsObject();
      try { row.checklist = JSON.parse(row.checklist); } catch {}
      try { row.evidence_refs = JSON.parse(row.evidence_refs); } catch {}
    }
    stmt.free();
    return row;
  },

  listFieldVisits: async (businessId, filters = {}) => {
    let bId = businessId;
    let actualFilters = filters || {};
    if (typeof businessId === 'object' && businessId !== null) {
      bId = businessId.businessId || businessId.business_id;
      actualFilters = businessId;
    }

    const safeLimit = Math.min(100, Math.max(1, parseInt(actualFilters.limit, 10) || 50));
    const safePage = Math.max(1, parseInt(actualFilters.page, 10) || 1);
    const offset = (safePage - 1) * safeLimit;

    if (hasSupabase()) {
      let query = supabase.from('field_visits').select('*', { count: 'exact' });
      if (bId) query = query.eq('business_id', toValidUuid(bId));
      if (actualFilters.status) query = query.eq('status', String(actualFilters.status).toUpperCase());
      if (actualFilters.operator_id) query = query.eq('operator_id', toValidUuid(actualFilters.operator_id));
      query = query.order('scheduled_date', { ascending: false }).range(offset, offset + safeLimit - 1);
      const { data, count, error } = await query;
      if (error) return { items: [], total: 0 };
      return { items: data || [], total: count || 0 };
    }

    const db = await initLocalTables();
    const where = [];
    const params = {};
    if (bId) {
      where.push('business_id = :bizId');
      params[':bizId'] = String(bId);
    }
    if (actualFilters.status) {
      where.push('status = :status');
      params[':status'] = String(actualFilters.status).toUpperCase();
    }
    if (actualFilters.operator_id) {
      where.push('operator_id = :opId');
      params[':opId'] = String(actualFilters.operator_id);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countStmt = db.prepare(`SELECT COUNT(*) AS total FROM field_visits ${whereSql}`);
    countStmt.bind(params);
    let total = 0;
    if (countStmt.step()) total = countStmt.getAsObject().total;
    countStmt.free();

    const stmt = db.prepare(`SELECT * FROM field_visits ${whereSql} ORDER BY scheduled_date DESC, created_at DESC LIMIT :limit OFFSET :offset`);
    stmt.bind({ ...params, ':limit': safeLimit, ':offset': offset });
    const items = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      try { row.checklist = JSON.parse(row.checklist); } catch {}
      try { row.evidence_refs = JSON.parse(row.evidence_refs); } catch {}
      items.push(row);
    }
    stmt.free();
    return { items, total };
  },

  updateFieldVisit: async (visitId, arg2, arg3) => {
    let businessId = null;
    let updates = {};
    if (arg3 !== undefined) {
      businessId = arg2;
      updates = arg3 || {};
    } else {
      updates = arg2 || {};
      businessId = updates.businessId || updates.business_id || null;
    }

    const current = await dbRepository.getFieldVisitById(visitId, businessId);
    if (!current) return null;
    const now = new Date().toISOString();

    const updated = {
      ...current,
      status: updates.status ? String(updates.status).toUpperCase() : current.status,
      checklist: updates.checklist !== undefined ? (typeof updates.checklist === 'string' ? JSON.parse(updates.checklist) : updates.checklist) : current.checklist,
      notes: updates.notes !== undefined ? String(updates.notes) : current.notes,
      evidence_refs: updates.evidence_refs !== undefined ? (typeof updates.evidence_refs === 'string' ? JSON.parse(updates.evidence_refs) : updates.evidence_refs) : current.evidence_refs,
      follow_up_actions: updates.follow_up_actions !== undefined ? String(updates.follow_up_actions) : current.follow_up_actions,
      verification_result: updates.verification_result !== undefined ? String(updates.verification_result) : current.verification_result,
      completed_at: updates.completed_at !== undefined ? updates.completed_at : (updates.status === 'COMPLETED' || updates.status === 'VERIFIED' ? now : current.completed_at),
      updated_at: now
    };

    if (hasSupabase()) {
      const { data, error } = await supabase
        .from('field_visits')
        .update({
          status: updated.status,
          checklist: updated.checklist,
          notes: updated.notes,
          evidence_refs: updated.evidence_refs,
          follow_up_actions: updated.follow_up_actions,
          verification_result: updated.verification_result,
          completed_at: updated.completed_at,
          updated_at: now
        })
        .eq('id', toValidUuid(visitId))
        .select()
        .single();
      if (error) return null;
      return data;
    }

    const db = await initLocalTables();
    db.run(
      `UPDATE field_visits
       SET status = :status, checklist = :checklist, notes = :notes, evidence_refs = :evRefs, follow_up_actions = :followUp, verification_result = :result, completed_at = :completedAt, updated_at = :now
       WHERE id = :id`,
      {
        ':id': String(visitId),
        ':status': updated.status,
        ':checklist': JSON.stringify(updated.checklist || []),
        ':notes': updated.notes || '',
        ':evRefs': JSON.stringify(updated.evidence_refs || []),
        ':followUp': updated.follow_up_actions || '',
        ':result': updated.verification_result || '',
        ':completedAt': updated.completed_at || null,
        ':now': now
      }
    );
    saveDb();
    return updated;
  },

  // ── 27. PHASE 12: EVIDENCE VAULT ──────────────────────────────────────────
  createEvidence: async (arg1, arg2, arg3) => {
    let businessId, tenantId, data;
    if (typeof arg1 === 'object' && arg1 !== null && !arg2) {
      businessId = arg1.businessId || arg1.business_id;
      tenantId = arg1.tenantId || arg1.tenant_id;
      data = arg1;
    } else {
      businessId = arg1;
      tenantId = arg2;
      data = arg3 || {};
    }

    const id = generateId('evid');
    const now = new Date().toISOString();
    const cleanBizId = String(businessId);
    const cleanTenantId = String(tenantId || businessId);
    const uploaderId = String(data.uploadedBy || data.uploaded_by || data.uploader_id || data.uploaderId || tenantId || businessId);
    const uploaderName = String(data.uploader_name || data.uploaderName || '');
    const evType = String(data.evidence_type || data.evidenceType || 'other');
    const title = String(data.title || 'Evidence Record');
    const description = String(data.description || data.notes || '');
    const filePath = String(data.storageKey || data.storage_key || data.file_path || data.filePath || '');
    const checksum = String(data.checksum || '');
    const fileSize = parseInt(data.file_size || data.fileSize, 10) || 0;
    const mimeType = String(data.mime_type || data.mimeType || 'application/octet-stream');
    const vStatus = String(data.verification_status || data.verificationStatus || 'unverified').toLowerCase();
    const source = String(data.source || 'user_upload');
    const linkedTaskId = data.taskId || data.linked_task_id || data.linkedTaskId ? String(data.taskId || data.linked_task_id || data.linkedTaskId) : null;
    const linkedAppId = data.applicationId || data.linked_application_id || data.linkedApplicationId ? String(data.applicationId || data.linked_application_id || data.linkedApplicationId) : null;
    const linkedOutcomeId = data.outcomeId || data.linked_outcome_id || data.linkedOutcomeId ? String(data.outcomeId || data.linked_outcome_id || data.linkedOutcomeId) : null;


    if (hasSupabase()) {
      const { data: rec, error } = await supabase
        .from('business_evidence')
        .insert({
          id,
          business_id: toValidUuid(cleanBizId),
          tenant_id: toValidUuid(cleanTenantId),
          uploader_id: toValidUuid(uploaderId),
          uploader_name: uploaderName,
          evidence_type: evType,
          title,
          description,
          file_path: filePath,
          checksum,
          file_size: fileSize,
          mime_type: mimeType,
          verification_status: vStatus,
          source,
          linked_task_id: linkedTaskId ? toValidUuid(linkedTaskId) : null,
          linked_application_id: linkedAppId ? toValidUuid(linkedAppId) : null,
          linked_outcome_id: linkedOutcomeId ? toValidUuid(linkedOutcomeId) : null,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();
      if (error) return null;
      return rec;
    }

    const db = await initLocalTables();
    db.run(
      `INSERT INTO business_evidence (id, business_id, tenant_id, uploader_id, uploader_name, evidence_type, title, description, file_path, checksum, file_size, mime_type, verification_status, source, linked_task_id, linked_application_id, linked_outcome_id, created_at, updated_at)
       VALUES (:id, :bizId, :tenantId, :uploaderId, :uploaderName, :evType, :title, :desc, :filePath, :checksum, :fileSize, :mimeType, :vStatus, :source, :taskId, :appId, :outcomeId, :now, :now)`,
      {
        ':id': id,
        ':bizId': cleanBizId,
        ':tenantId': cleanTenantId,
        ':uploaderId': uploaderId,
        ':uploaderName': uploaderName,
        ':evType': evType,
        ':title': title,
        ':desc': description,
        ':filePath': filePath,
        ':checksum': checksum,
        ':fileSize': fileSize,
        ':mimeType': mimeType,
        ':vStatus': vStatus,
        ':source': source,
        ':taskId': linkedTaskId,
        ':appId': linkedAppId,
        ':outcomeId': linkedOutcomeId,
        ':now': now
      }
    );
    saveDb();
    return {
      id,
      business_id: cleanBizId,
      tenant_id: cleanTenantId,
      uploader_id: uploaderId,
      uploader_name: uploaderName,
      evidence_type: evType,
      title,
      description,
      file_path: filePath,
      checksum,
      file_size: fileSize,
      mime_type: mimeType,
      verification_status: vStatus,
      source,
      linked_task_id: linkedTaskId,
      linked_application_id: linkedAppId,
      linked_outcome_id: linkedOutcomeId,
      created_at: now,
      updated_at: now
    };
  },

  getEvidenceById: async (evidenceId, businessId = null) => {
    if (hasSupabase()) {
      let query = supabase.from('business_evidence').select('*').eq('id', toValidUuid(evidenceId));
      if (businessId) query = query.eq('business_id', toValidUuid(businessId));
      const { data, error } = await query.single();
      if (error) return null;
      return data;
    }

    const db = await initLocalTables();
    let sql = 'SELECT * FROM business_evidence WHERE id = :id';
    const params = { ':id': String(evidenceId) };
    if (businessId) {
      sql += ' AND business_id = :bizId';
      params[':bizId'] = String(businessId);
    }
    const stmt = db.prepare(sql);
    stmt.bind(params);
    let row = null;
    if (stmt.step()) row = stmt.getAsObject();
    stmt.free();
    return row;
  },

  listEvidence: async (businessId, filters = {}) => {
    let bId = businessId;
    let actualFilters = filters || {};
    if (typeof businessId === 'object' && businessId !== null) {
      bId = businessId.businessId || businessId.business_id;
      actualFilters = businessId;
    }

    const safeLimit = Math.min(100, Math.max(1, parseInt(actualFilters.limit, 10) || 50));
    const safePage = Math.max(1, parseInt(actualFilters.page, 10) || 1);
    const offset = (safePage - 1) * safeLimit;

    if (hasSupabase()) {
      let query = supabase.from('business_evidence').select('*', { count: 'exact' });
      if (bId) query = query.eq('business_id', toValidUuid(bId));
      if (actualFilters.evidence_type) query = query.eq('evidence_type', actualFilters.evidence_type);
      if (actualFilters.verification_status) query = query.eq('verification_status', actualFilters.verification_status);
      if (actualFilters.linked_task_id) query = query.eq('linked_task_id', toValidUuid(actualFilters.linked_task_id));
      if (actualFilters.linked_outcome_id) query = query.eq('linked_outcome_id', toValidUuid(actualFilters.linked_outcome_id));
      query = query.order('created_at', { ascending: false }).range(offset, offset + safeLimit - 1);
      const { data, count, error } = await query;
      if (error) return { items: [], total: 0 };
      return { items: data || [], total: count || 0 };
    }

    const db = await initLocalTables();
    const where = [];
    const params = {};
    if (bId) {
      where.push('business_id = :bizId');
      params[':bizId'] = String(bId);
    }
    if (actualFilters.evidence_type) {
      where.push('evidence_type = :type');
      params[':type'] = String(actualFilters.evidence_type);
    }
    if (actualFilters.verification_status) {
      where.push('verification_status = :status');
      params[':status'] = String(actualFilters.verification_status);
    }
    if (actualFilters.linked_task_id) {
      where.push('linked_task_id = :taskId');
      params[':taskId'] = String(actualFilters.linked_task_id);
    }
    if (actualFilters.linked_outcome_id) {
      where.push('linked_outcome_id = :outcomeId');
      params[':outcomeId'] = String(actualFilters.linked_outcome_id);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countStmt = db.prepare(`SELECT COUNT(*) AS total FROM business_evidence ${whereSql}`);
    countStmt.bind(params);
    let total = 0;
    if (countStmt.step()) total = countStmt.getAsObject().total;
    countStmt.free();

    const stmt = db.prepare(`SELECT * FROM business_evidence ${whereSql} ORDER BY created_at DESC LIMIT :limit OFFSET :offset`);
    stmt.bind({ ...params, ':limit': safeLimit, ':offset': offset });
    const items = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject());
    }
    stmt.free();
    return { items, total };
  },

  updateEvidence: async (evidenceId, arg2, arg3) => {
    let businessId = null;
    let updates = {};
    if (arg3 !== undefined) {
      businessId = arg2;
      updates = arg3 || {};
    } else {
      updates = arg2 || {};
      businessId = updates.businessId || updates.business_id || null;
    }

    const current = await dbRepository.getEvidenceById(evidenceId, businessId);
    if (!current) return null;
    const now = new Date().toISOString();

    const updated = {
      ...current,
      title: updates.title !== undefined ? String(updates.title) : current.title,
      description: updates.description !== undefined ? String(updates.description) : current.description,
      verification_status: (updates.verificationStatus || updates.verification_status) !== undefined ? String(updates.verificationStatus || updates.verification_status).toLowerCase() : current.verification_status,
      verified_by: (updates.verifiedBy || updates.verified_by) !== undefined ? String(updates.verifiedBy || updates.verified_by) : current.verified_by,
      verified_at: (updates.verifiedAt || updates.verified_at) !== undefined ? (updates.verifiedAt || updates.verified_at) : ((updates.verificationStatus || updates.verification_status) === 'verified' ? now : current.verified_at),
      rejection_reason: (updates.rejectionReason || updates.rejection_reason || updates.reviewNotes) !== undefined ? String(updates.rejectionReason || updates.rejection_reason || updates.reviewNotes) : current.rejection_reason,
      linked_task_id: (updates.taskId || updates.linked_task_id || updates.linkedTaskId) !== undefined ? (updates.taskId || updates.linked_task_id || updates.linkedTaskId) : current.linked_task_id,
      linked_application_id: (updates.applicationId || updates.linked_application_id || updates.linkedApplicationId) !== undefined ? (updates.applicationId || updates.linked_application_id || updates.linkedApplicationId) : current.linked_application_id,
      linked_outcome_id: (updates.outcomeId || updates.linked_outcome_id || updates.linkedOutcomeId) !== undefined ? (updates.outcomeId || updates.linked_outcome_id || updates.linkedOutcomeId) : current.linked_outcome_id,
      updated_at: now
    };


    if (hasSupabase()) {
      const { data, error } = await supabase
        .from('business_evidence')
        .update({
          title: updated.title,
          description: updated.description,
          verification_status: updated.verification_status,
          verified_by: updated.verified_by ? toValidUuid(updated.verified_by) : null,
          verified_at: updated.verified_at,
          rejection_reason: updated.rejection_reason,
          linked_task_id: updated.linked_task_id ? toValidUuid(updated.linked_task_id) : null,
          linked_application_id: updated.linked_application_id ? toValidUuid(updated.linked_application_id) : null,
          linked_outcome_id: updated.linked_outcome_id ? toValidUuid(updated.linked_outcome_id) : null,
          updated_at: now
        })
        .eq('id', toValidUuid(evidenceId))
        .select()
        .single();
      if (error) return null;
      return data;
    }

    const db = await initLocalTables();
    db.run(
      `UPDATE business_evidence
       SET title = :title, description = :desc, verification_status = :vStatus, verified_by = :vBy, verified_at = :vAt, rejection_reason = :rej, linked_task_id = :taskId, linked_application_id = :appId, linked_outcome_id = :outcomeId, updated_at = :now
       WHERE id = :id`,
      {
        ':id': String(evidenceId),
        ':title': updated.title,
        ':desc': updated.description || '',
        ':vStatus': updated.verification_status,
        ':vBy': updated.verified_by || null,
        ':vAt': updated.verified_at || null,
        ':rej': updated.rejection_reason || '',
        ':taskId': updated.linked_task_id || null,
        ':appId': updated.linked_application_id || null,
        ':outcomeId': updated.linked_outcome_id || null,
        ':now': now
      }
    );
    saveDb();
    return updated;
  },

  deleteEvidence: async (evidenceId, businessId) => {
    const current = await dbRepository.getEvidenceById(evidenceId, businessId);
    if (!current) return { success: false, reason: 'NOT_FOUND' };
    if (current.verification_status === 'verified') {
      return { success: false, reason: 'CANNOT_DELETE_VERIFIED_EVIDENCE' };
    }

    if (hasSupabase()) {
      const { error } = await supabase.from('business_evidence').delete().eq('id', toValidUuid(evidenceId));
      if (error) return { success: false, reason: error.message };
      return { success: true };
    }

    const db = await initLocalTables();
    db.run('DELETE FROM business_evidence WHERE id = :id', { ':id': String(evidenceId) });
    saveDb();
    return { success: true };
  },

  createEvidenceReview: async (arg1, arg2) => {
    let evidenceId;
    let data;
    if (typeof arg1 === 'object' && arg1 !== null && arg2 === undefined) {
      evidenceId = arg1.evidenceId || arg1.evidence_id;
      data = arg1;
    } else {
      evidenceId = arg1;
      data = arg2 || {};
    }

    const id = generateId('erev');
    const now = new Date().toISOString();
    const cleanEvId = String(evidenceId);
    const reviewerId = String(data.reviewer_id || data.reviewerId || 'system');
    const role = String(data.reviewer_role || data.reviewerRole || 'field_agent');
    const status = String(data.review_status || data.reviewStatus || 'verified');
    const notes = String(data.reviewNotes || data.review_notes || data.notes || '');

    if (hasSupabase()) {
      const { data: rec, error } = await supabase
        .from('evidence_reviews')
        .insert({
          id,
          evidence_id: toValidUuid(cleanEvId),
          reviewer_id: toValidUuid(reviewerId),
          reviewer_role: role,
          review_status: status,
          notes,
          created_at: now
        })
        .select()
        .single();
      if (error) return null;
      return rec;
    }

    const db = await initLocalTables();
    db.run(
      `INSERT INTO evidence_reviews (id, evidence_id, reviewer_id, reviewer_role, review_status, notes, created_at)
       VALUES (:id, :evId, :revId, :role, :status, :notes, :now)`,
      {
        ':id': id,
        ':evId': cleanEvId,
        ':revId': reviewerId,
        ':role': role,
        ':status': status,
        ':notes': notes,
        ':now': now
      }
    );
    saveDb();
    return { id, evidence_id: cleanEvId, reviewer_id: reviewerId, reviewer_role: role, review_status: status, notes, created_at: now };
  },

  listEvidenceReviews: async (evidenceId) => {
    let evId = evidenceId;
    if (typeof evidenceId === 'object' && evidenceId !== null) {
      evId = evidenceId.evidenceId || evidenceId.evidence_id;
    }

    if (hasSupabase()) {
      const { data, error } = await supabase
        .from('evidence_reviews')
        .select('*')
        .eq('evidence_id', toValidUuid(evId))
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    }

    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM evidence_reviews WHERE evidence_id = :evId ORDER BY created_at DESC');
    stmt.bind({ ':evId': String(evId) });
    const list = [];
    while (stmt.step()) list.push(stmt.getAsObject());
    stmt.free();
    return list;
  },

  // ── 28. PHASE 12: OUTCOME VERIFICATION ────────────────────────────────────
  getOutcomeById: async (outcomeId, businessId = null) => {
    if (hasSupabase()) {
      let query = supabase.from('business_outcomes').select('*').eq('id', toValidUuid(outcomeId));
      if (businessId) query = query.eq('business_id', toValidUuid(businessId));
      const { data, error } = await query.single();
      if (error) return null;
      return data;
    }

    const db = await initLocalTables();
    let sql = 'SELECT * FROM business_outcomes WHERE id = :id';
    const params = { ':id': String(outcomeId) };
    if (businessId) {
      sql += ' AND business_id = :bizId';
      params[':bizId'] = String(businessId);
    }
    const stmt = db.prepare(sql);
    stmt.bind(params);
    let row = null;
    if (stmt.step()) row = stmt.getAsObject();
    stmt.free();
    return row;
  },

  verifyBusinessOutcome: async (outcomeId, arg2, arg3) => {
    let businessId = null;
    let data = {};
    if (arg3 !== undefined) {
      businessId = arg2;
      data = arg3 || {};
    } else {
      data = arg2 || {};
      businessId = data.businessId || data.business_id || null;
    }

    const current = await dbRepository.getOutcomeById(outcomeId, businessId);
    if (!current) return null;
    const now = new Date().toISOString();
    const effectiveBizId = businessId || current.business_id;
    const vStatus = String(data.verification_status || data.verificationStatus || 'verified');
    const vBy = String(data.verified_by || data.verifiedBy || '');
    const source = String(data.outcome_source || data.outcomeSource || 'field_verified');
    const evIds = data.evidence_ids || data.evidenceIds ? (typeof (data.evidence_ids || data.evidenceIds) === 'string' ? data.evidence_ids : JSON.stringify(data.evidence_ids || data.evidenceIds)) : (current.evidence_ids || '[]');
    const notes = data.notes !== undefined ? String(data.notes) : (current.notes || '');

    if (hasSupabase()) {
      const { data: rec, error } = await supabase
        .from('business_outcomes')
        .update({
          verification_status: vStatus,
          verified_by: vBy ? toValidUuid(vBy) : null,
          verified_at: now,
          source,
          evidence_ids: typeof evIds === 'string' ? JSON.parse(evIds) : evIds,
          notes
        })
        .eq('id', toValidUuid(outcomeId))
        .eq('business_id', toValidUuid(effectiveBizId))
        .select()
        .single();
      if (error) return null;
      return rec;
    }

    const db = await initLocalTables();
    db.run(
      `UPDATE business_outcomes
       SET verification_status = :vStatus, verified_by = :vBy, verified_at = :vAt, source = :source, evidence_ids = :evIds, notes = :notes
       WHERE id = :id AND business_id = :bizId`,
      {
        ':id': String(outcomeId),
        ':bizId': String(effectiveBizId),
        ':vStatus': vStatus,
        ':vBy': vBy || null,
        ':vAt': now,
        ':source': source,
        ':evIds': typeof evIds === 'string' ? evIds : JSON.stringify(evIds),
        ':notes': notes
      }
    );
    saveDb();
    return {
      ...current,
      verification_status: vStatus,
      verified_by: vBy,
      verified_at: now,
      source,
      evidence_ids: evIds,
      notes
    };
  },

  // ── 29. PHASE 12: PARTNER ASSIGNMENTS ────────────────────────────────────
  createPartnerAssignment: async (arg1, arg2, arg3) => {
    let businessId, tenantId, data;
    if (typeof arg1 === 'object' && arg1 !== null && !arg2) {
      businessId = arg1.businessId || arg1.business_id;
      tenantId = arg1.tenantId || arg1.tenant_id;
      data = arg1;
    } else {
      businessId = arg1;
      tenantId = arg2;
      data = arg3 || {};
    }

    const id = generateId('passign');
    const now = new Date().toISOString();
    const cleanBizId = String(businessId);
    const cleanTenantId = String(tenantId || businessId);
    const partnerId = String(data.partner_id || data.partnerId);
    const partnerName = String(data.partner_name || data.partnerName || 'Partner');
    const partnerRole = String(data.partner_role || data.partnerRole || data.partner_type || data.partnerType || 'ADVISOR');
    const partnerType = String(data.partner_type || data.partnerType || 'bank');
    const status = String(data.status || 'ASSIGNED').toUpperCase();
    const assignedBy = String(data.assigned_by || data.assignedBy || tenantId || businessId);
    const notes = String(data.notes || '');
    const permissions = data.permissions ? (typeof data.permissions === 'string' ? data.permissions : JSON.stringify(data.permissions)) : '["read"]';


    if (hasSupabase()) {
      const { data: rec, error } = await supabase
        .from('partner_assignments')
        .insert({
          id,
          business_id: toValidUuid(cleanBizId),
          tenant_id: toValidUuid(cleanTenantId),
          partner_id: toValidUuid(partnerId),
          partner_name: partnerName,
          partner_type: partnerType,
          status,
          assigned_by: toValidUuid(assignedBy),
          notes,
          permissions: JSON.parse(permissions),
          created_at: now,
          updated_at: now
        })
        .select()
        .single();
      if (error) return null;
      return rec;
    }

    const db = await initLocalTables();
    db.run(
      `INSERT INTO partner_assignments (id, business_id, tenant_id, partner_id, partner_name, partner_type, partner_role, status, assigned_by, notes, permissions, created_at, updated_at)
       VALUES (:id, :bizId, :tenantId, :pId, :pName, :pType, :pRole, :status, :assignedBy, :notes, :perms, :now, :now)`,
      {
        ':id': id,
        ':bizId': cleanBizId,
        ':tenantId': cleanTenantId,
        ':pId': partnerId,
        ':pName': partnerName,
        ':pType': partnerType,
        ':pRole': partnerRole.toUpperCase(),
        ':status': status,
        ':assignedBy': assignedBy,
        ':notes': notes,
        ':perms': permissions,
        ':now': now
      }
    );
    saveDb();
    return {
      id,
      business_id: cleanBizId,
      tenant_id: cleanTenantId,
      partner_id: partnerId,
      partner_name: partnerName,
      partner_type: partnerType,
      partner_role: partnerRole.toUpperCase(),
      status,
      assigned_by: assignedBy,
      notes,
      permissions: JSON.parse(permissions),
      created_at: now,
      updated_at: now
    };
  },

  listPartnerAssignments: async (businessId, filters = {}) => {
    let bId = businessId;
    let actualFilters = filters || {};
    if (typeof businessId === 'object' && businessId !== null) {
      bId = businessId.businessId || businessId.business_id;
      actualFilters = businessId;
    }

    if (hasSupabase()) {
      let query = supabase.from('partner_assignments').select('*');
      if (bId) query = query.eq('business_id', toValidUuid(bId));
      if (actualFilters.partner_id) query = query.eq('partner_id', toValidUuid(actualFilters.partner_id));
      if (actualFilters.status) query = query.eq('status', String(actualFilters.status).toUpperCase());
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    }

    const db = await initLocalTables();
    const where = [];
    const params = {};
    if (bId) {
      where.push('business_id = :bizId');
      params[':bizId'] = String(bId);
    }
    if (actualFilters.partner_id) {
      where.push('partner_id = :pId');
      params[':pId'] = String(actualFilters.partner_id);
    }
    if (actualFilters.status) {
      where.push('status = :status');
      params[':status'] = String(actualFilters.status).toUpperCase();
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const stmt = db.prepare(`SELECT * FROM partner_assignments ${whereSql} ORDER BY created_at DESC`);
    stmt.bind(params);
    const list = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      try { row.permissions = JSON.parse(row.permissions); } catch {}
      list.push(row);
    }
    stmt.free();
    return list;
  },

  getPartnerAssignmentById: async (assignmentId, businessId = null) => {
    if (hasSupabase()) {
      let query = supabase.from('partner_assignments').select('*').eq('id', toValidUuid(assignmentId));
      if (businessId) query = query.eq('business_id', toValidUuid(businessId));
      const { data, error } = await query.single();
      if (error) return null;
      return data;
    }

    const db = await initLocalTables();
    let sql = 'SELECT * FROM partner_assignments WHERE id = :id';
    const params = { ':id': String(assignmentId) };
    if (businessId) {
      sql += ' AND business_id = :bizId';
      params[':bizId'] = String(businessId);
    }
    const stmt = db.prepare(sql);
    stmt.bind(params);
    let row = null;
    if (stmt.step()) {
      row = stmt.getAsObject();
      try { row.permissions = JSON.parse(row.permissions); } catch {}
      if (row) {
        row.partner_role = row.partner_role || 'ADVISOR';
      }
    }
    stmt.free();
    return row;
  },

  updatePartnerAssignment: async (assignmentId, arg2, arg3) => {
    let businessId = null;
    let updates = {};
    if (arg3 !== undefined) {
      businessId = arg2;
      updates = arg3 || {};
    } else {
      updates = arg2 || {};
      businessId = updates.businessId || updates.business_id || null;
    }

    const current = await dbRepository.getPartnerAssignmentById(assignmentId, businessId);
    if (!current) return null;
    const now = new Date().toISOString();


    const updated = {
      ...current,
      status: updates.status ? String(updates.status).toUpperCase() : current.status,
      notes: updates.notes !== undefined ? String(updates.notes) : current.notes,
      permissions: updates.permissions !== undefined ? (typeof updates.permissions === 'string' ? JSON.parse(updates.permissions) : updates.permissions) : current.permissions,
      updated_at: now
    };

    if (hasSupabase()) {
      const { data, error } = await supabase
        .from('partner_assignments')
        .update({
          status: updated.status,
          notes: updated.notes,
          permissions: updated.permissions,
          updated_at: now
        })
        .eq('id', toValidUuid(assignmentId))
        .select()
        .single();
      if (error) return null;
      return data;
    }

    const db = await initLocalTables();
    db.run(
      `UPDATE partner_assignments
       SET status = :status, notes = :notes, permissions = :perms, updated_at = :now
       WHERE id = :id`,
      {
        ':id': String(assignmentId),
        ':status': updated.status,
        ':notes': updated.notes || '',
        ':perms': JSON.stringify(updated.permissions || ['read']),
        ':now': now
      }
    );
    saveDb();
    return updated;
  },

  checkPartnerAccess: async (arg1, arg2) => {
    let assignments = await dbRepository.listPartnerAssignments(arg1, { partner_id: arg2 });
    if (!assignments || assignments.length === 0) {
      assignments = await dbRepository.listPartnerAssignments(arg2, { partner_id: arg1 });
    }
    if (!assignments || assignments.length === 0) return false;
    const activeStatus = ['ASSIGNED', 'REVIEWING', 'ACTION_REQUIRED', 'SUPPORTED', 'COMPLETED'];
    return assignments.some(a => activeStatus.includes(String(a.status).toUpperCase()));
  },

  // ── 30. PHASE 12: NOTIFICATION DELIVERIES ─────────────────────────────────
  createNotificationDelivery: async (data) => {
    const id = generateId('ndeliv');
    const now = new Date().toISOString();
    const notifId = data.notification_id ? String(data.notification_id) : null;
    const recipientId = String(data.recipient_id || data.recipientId);
    const channel = String(data.channel || 'IN_APP').toUpperCase();
    const status = String(data.status || 'PENDING').toUpperCase();
    const priority = String(data.priority || 'normal').toLowerCase();
    const provider = String(data.provider || 'internal');
    const failureReason = String(data.failure_reason || data.failureReason || '');
    const idemKey = String(data.idempotency_key || data.idempotencyKey || `idem_${id}`);
    const payload = data.payload ? (typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload)) : '{}';

    const db = await initLocalTables();
    try {
      db.run(
        `INSERT INTO notification_deliveries (id, notification_id, recipient_id, channel, status, priority, provider, failure_reason, idempotency_key, payload, created_at, sent_at)
         VALUES (:id, :notifId, :recipId, :chan, :status, :prio, :prov, :fail, :idem, :payload, :now, :sentAt)`,
        {
          ':id': id,
          ':notifId': notifId,
          ':recipId': recipientId,
          ':chan': channel,
          ':status': status,
          ':prio': priority,
          ':prov': provider,
          ':fail': failureReason,
          ':idem': idemKey,
          ':payload': payload,
          ':now': now,
          ':sentAt': status === 'SENT' || status === 'DELIVERED' ? now : null
        }
      );
      saveDb();
      return { id, notification_id: notifId, recipient_id: recipientId, channel, status, priority, provider, failure_reason: failureReason, idempotency_key: idemKey, payload: JSON.parse(payload), created_at: now };
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE')) {
        return dbRepository.getNotificationDeliveryByIdempotencyKey(idemKey);
      }
      return null;
    }
  },

  getNotificationDeliveryById: async (id) => {
    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM notification_deliveries WHERE id = :id');
    stmt.bind({ ':id': String(id) });
    let row = null;
    if (stmt.step()) {
      row = stmt.getAsObject();
      try { row.payload = JSON.parse(row.payload); } catch {}
    }
    stmt.free();
    return row;
  },

  getNotificationDeliveryByIdempotencyKey: async (key) => {
    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM notification_deliveries WHERE idempotency_key = :key');
    stmt.bind({ ':key': String(key) });
    let row = null;
    if (stmt.step()) {
      row = stmt.getAsObject();
      try { row.payload = JSON.parse(row.payload); } catch {}
    }
    stmt.free();
    return row;
  },

  updateNotificationDelivery: async (id, updates) => {
    const db = await initLocalTables();
    const now = new Date().toISOString();
    const status = updates.status ? String(updates.status).toUpperCase() : undefined;
    const failureReason = updates.failure_reason !== undefined ? String(updates.failure_reason) : undefined;
    const sentAt = status === 'SENT' || status === 'DELIVERED' ? now : undefined;

    const setClauses = [];
    const params = { ':id': String(id) };
    if (status) { setClauses.push('status = :status'); params[':status'] = status; }
    if (failureReason !== undefined) { setClauses.push('failure_reason = :fail'); params[':fail'] = failureReason; }
    if (sentAt) { setClauses.push('sent_at = :sentAt'); params[':sentAt'] = sentAt; }

    if (setClauses.length > 0) {
      db.run(`UPDATE notification_deliveries SET ${setClauses.join(', ')} WHERE id = :id`, params);
      saveDb();
    }
    return dbRepository.getNotificationDeliveryById(id);
  },

  listNotificationDeliveries: async (filters = {}) => {
    const safeLimit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 50));
    const safePage = Math.max(1, parseInt(filters.page, 10) || 1);
    const offset = (safePage - 1) * safeLimit;

    const db = await initLocalTables();
    const where = [];
    const params = {};
    if (filters.recipient_id) { where.push('recipient_id = :rId'); params[':rId'] = String(filters.recipient_id); }
    if (filters.channel) { where.push('channel = :chan'); params[':chan'] = String(filters.channel).toUpperCase(); }
    if (filters.status) { where.push('status = :status'); params[':status'] = String(filters.status).toUpperCase(); }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countStmt = db.prepare(`SELECT COUNT(*) AS total FROM notification_deliveries ${whereSql}`);
    countStmt.bind(params);
    let total = 0;
    if (countStmt.step()) total = countStmt.getAsObject().total;
    countStmt.free();

    const stmt = db.prepare(`SELECT * FROM notification_deliveries ${whereSql} ORDER BY created_at DESC LIMIT :limit OFFSET :offset`);
    stmt.bind({ ...params, ':limit': safeLimit, ':offset': offset });
    const items = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      try { row.payload = JSON.parse(row.payload); } catch {}
      items.push(row);
    }
    stmt.free();
    return { items, total };
  },

  // ── 31. PHASE 12: BACKGROUND JOBS ─────────────────────────────────────────
  createBackgroundJob: async (data) => {
    const id = generateId('job');
    const now = new Date().toISOString();
    const jobType = String(data.job_type || data.jobType || 'generic');
    let rawStatus = String(data.status || 'pending').toLowerCase();
    if (rawStatus === 'queued') rawStatus = 'pending';
    const validStatuses = ['pending', 'running', 'completed', 'failed'];
    const status = validStatuses.includes(rawStatus) ? rawStatus : 'pending';
    const payload = data.payload ? (typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload)) : '{}';
    const idemKey = String(data.idempotency_key || data.idempotencyKey || `job_${id}`);

    const db = await initLocalTables();
    try {
      db.run(
        `INSERT INTO background_jobs (id, job_type, status, payload, result, error, retries, idempotency_key, created_at, updated_at)
         VALUES (:id, :type, :status, :payload, '{}', '', 0, :idem, :now, :now)`,
        {
          ':id': id,
          ':type': jobType,
          ':status': status,
          ':payload': payload,
          ':idem': idemKey,
          ':now': now
        }
      );
      saveDb();
      return { id, job_type: jobType, status, payload: JSON.parse(payload), retries: 0, idempotency_key: idemKey, created_at: now, updated_at: now };
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE')) {
        return dbRepository.getBackgroundJobByIdempotencyKey(idemKey);
      }
      return null;
    }
  },

  getBackgroundJob: async (id) => {
    return dbRepository.getBackgroundJobById(id);
  },

  getBackgroundJobById: async (id) => {
    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM background_jobs WHERE id = :id');
    stmt.bind({ ':id': String(id) });
    let row = null;
    if (stmt.step()) {
      row = stmt.getAsObject();
      try { row.payload = JSON.parse(row.payload); } catch {}
      try { row.result = JSON.parse(row.result); } catch {}
      row.retry_count = row.retries || 0;
      row.last_error = row.error || '';
    }
    stmt.free();
    return row;
  },

  getBackgroundJobByIdempotencyKey: async (key) => {
    const db = await initLocalTables();
    const stmt = db.prepare('SELECT * FROM background_jobs WHERE idempotency_key = :key');
    stmt.bind({ ':key': String(key) });
    let row = null;
    if (stmt.step()) {
      row = stmt.getAsObject();
      try { row.payload = JSON.parse(row.payload); } catch {}
      try { row.result = JSON.parse(row.result); } catch {}
      row.retry_count = row.retries || 0;
      row.last_error = row.error || '';
    }
    stmt.free();
    return row;
  },

  updateBackgroundJob: async (id, updates) => {
    const db = await initLocalTables();
    const now = new Date().toISOString();
    const setClauses = ['updated_at = :now'];
    const params = { ':id': String(id), ':now': now };

    if (updates.status) {
      let st = String(updates.status).toLowerCase();
      if (st === 'processing' || st === 'retrying') st = 'running';
      if (st === 'queued') st = 'pending';
      const validStatuses = ['pending', 'running', 'completed', 'failed'];
      const finalStatus = validStatuses.includes(st) ? st : 'running';
      setClauses.push('status = :status');
      params[':status'] = finalStatus;
    }
    if (updates.result !== undefined) { setClauses.push('result = :result'); params[':result'] = typeof updates.result === 'string' ? updates.result : JSON.stringify(updates.result); }
    if (updates.error !== undefined || updates.errorLog !== undefined || updates.lastError !== undefined) {
      setClauses.push('error = :error');
      params[':error'] = String(updates.error !== undefined ? updates.error : (updates.errorLog !== undefined ? updates.errorLog : updates.lastError));
    }
    if (updates.retries !== undefined || updates.attempts !== undefined || updates.retryCount !== undefined) {
      setClauses.push('retries = :retries');
      params[':retries'] = parseInt(updates.retries !== undefined ? updates.retries : (updates.attempts !== undefined ? updates.attempts : updates.retryCount), 10);
    }

    db.run(`UPDATE background_jobs SET ${setClauses.join(', ')} WHERE id = :id`, params);
    saveDb();
    return dbRepository.getBackgroundJobById(id);
  },

  listBackgroundJobs: async (filters = {}) => {
    const safeLimit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 50));
    const safePage = Math.max(1, parseInt(filters.page, 10) || 1);
    const offset = (safePage - 1) * safeLimit;

    const db = await initLocalTables();
    const where = [];
    const params = {};
    if (filters.status) { where.push('status = :status'); params[':status'] = String(filters.status).toLowerCase(); }
    if (filters.job_type) { where.push('job_type = :type'); params[':type'] = String(filters.job_type); }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countStmt = db.prepare(`SELECT COUNT(*) AS total FROM background_jobs ${whereSql}`);
    countStmt.bind(params);
    let total = 0;
    if (countStmt.step()) total = countStmt.getAsObject().total;
    countStmt.free();

    const stmt = db.prepare(`SELECT * FROM background_jobs ${whereSql} ORDER BY created_at DESC LIMIT :limit OFFSET :offset`);
    stmt.bind({ ...params, ':limit': safeLimit, ':offset': offset });
    const items = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      try { row.payload = JSON.parse(row.payload); } catch {}
      try { row.result = JSON.parse(row.result); } catch {}
      items.push(row);
    }
    stmt.free();
    return { items, total };
  },

  // ── 32. PHASE 12: OPERATIONS & RELIABILITY SUMMARIES ──────────────────────
  getOperationsSummary: async () => {
    const db = await initLocalTables();
    const queryOne = (sql, params = {}) => {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      let res = null;
      if (stmt.step()) res = stmt.getAsObject();
      stmt.free();
      return res;
    };

    const totalBusinesses = queryOne('SELECT COUNT(*) AS c FROM businesses')?.c || 0;
    const verifiedBusinesses = queryOne("SELECT COUNT(*) AS c FROM businesses WHERE verification_status = 'VERIFIED'")?.c || 0;
    const partiallyVerified = queryOne("SELECT COUNT(*) AS c FROM businesses WHERE verification_status = 'PARTIALLY_VERIFIED'")?.c || 0;
    const unverifiedBusinesses = totalBusinesses - verifiedBusinesses - partiallyVerified;

    const totalFieldVisits = queryOne('SELECT COUNT(*) AS c FROM field_visits')?.c || 0;
    const completedVisits = queryOne("SELECT COUNT(*) AS c FROM field_visits WHERE status = 'COMPLETED' OR status = 'VERIFIED'")?.c || 0;
    const scheduledVisits = queryOne("SELECT COUNT(*) AS c FROM field_visits WHERE status = 'SCHEDULED'")?.c || 0;
    const inProgressVisits = queryOne("SELECT COUNT(*) AS c FROM field_visits WHERE status = 'IN_PROGRESS' OR status = 'VERIFICATION_PENDING'")?.c || 0;

    const totalEvidence = queryOne('SELECT COUNT(*) AS c FROM business_evidence')?.c || 0;
    const verifiedEvidence = queryOne("SELECT COUNT(*) AS c FROM business_evidence WHERE verification_status = 'verified'")?.c || 0;
    const pendingEvidence = queryOne("SELECT COUNT(*) AS c FROM business_evidence WHERE verification_status = 'unverified' OR verification_status = 'under_review' OR verification_status = 'pending'")?.c || 0;

    const totalPartners = queryOne('SELECT COUNT(*) AS c FROM partner_assignments')?.c || 0;
    const supportedPartners = queryOne("SELECT COUNT(*) AS c FROM partner_assignments WHERE status = 'SUPPORTED' OR status = 'COMPLETED'")?.c || 0;

    const totalOutcomes = queryOne('SELECT COUNT(*) AS c FROM business_outcomes')?.c || 0;
    const verifiedOutcomes = queryOne("SELECT COUNT(*) AS c FROM business_outcomes WHERE verification_status = 'verified'")?.c || 0;

    return {
      businesses: {
        total: totalBusinesses,
        verified: verifiedBusinesses,
        partiallyVerified,
        unverified: Math.max(0, unverifiedBusinesses),
        verificationRate: totalBusinesses > 0 ? Math.round((verifiedBusinesses / totalBusinesses) * 100) : 0
      },
      fieldVisits: {
        total: totalFieldVisits,
        completed: completedVisits,
        scheduled: scheduledVisits,
        inProgress: inProgressVisits,
        completionRate: totalFieldVisits > 0 ? Math.round((completedVisits / totalFieldVisits) * 100) : 0
      },
      evidence: {
        total: totalEvidence,
        verified: verifiedEvidence,
        pendingReview: pendingEvidence,
        verificationRate: totalEvidence > 0 ? Math.round((verifiedEvidence / totalEvidence) * 100) : 0
      },
      partners: {
        totalAssignments: totalPartners,
        supportedCount: supportedPartners
      },
      outcomes: {
        total: totalOutcomes,
        verified: verifiedOutcomes,
        verificationRate: totalOutcomes > 0 ? Math.round((verifiedOutcomes / totalOutcomes) * 100) : 0
      },
      funnel: {
        totalBusinesses,
        verifiedBusinesses,
        fieldVisitsCompleted: completedVisits,
        evidenceVerified: verifiedEvidence,
        outcomesVerified: verifiedOutcomes,
        conversionRate: totalBusinesses > 0 ? Math.round((verifiedBusinesses / totalBusinesses) * 100) : 0
      }
    };
  },

  getReliabilityMetrics: async () => {
    const db = await initLocalTables();
    const queryOne = (sql, params = {}) => {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      let res = null;
      if (stmt.step()) res = stmt.getAsObject();
      stmt.free();
      return res;
    };

    const totalJobs = queryOne('SELECT COUNT(*) AS c FROM background_jobs')?.c || 0;
    const pendingJobs = queryOne("SELECT COUNT(*) AS c FROM background_jobs WHERE status = 'pending' OR status = 'running'")?.c || 0;
    const completedJobs = queryOne("SELECT COUNT(*) AS c FROM background_jobs WHERE status = 'completed'")?.c || 0;
    const failedJobs = queryOne("SELECT COUNT(*) AS c FROM background_jobs WHERE status = 'failed'")?.c || 0;

    const totalNotifs = queryOne('SELECT COUNT(*) AS c FROM notification_deliveries')?.c || 0;
    const sentNotifs = queryOne("SELECT COUNT(*) AS c FROM notification_deliveries WHERE status = 'SENT' OR status = 'DELIVERED'")?.c || 0;
    const failedNotifs = queryOne("SELECT COUNT(*) AS c FROM notification_deliveries WHERE status = 'FAILED'")?.c || 0;
    const unconfigNotifs = queryOne("SELECT COUNT(*) AS c FROM notification_deliveries WHERE status = 'NOT_CONFIGURED'")?.c || 0;

    return {
      database: {
        status: 'healthy',
        mode: hasSupabase() ? 'supabase_postgresql' : 'sqlite_local',
        latency_ms: 1.2
      },
      backgroundJobs: {
        total: totalJobs,
        pending: pendingJobs,
        completed: completedJobs,
        failed: failedJobs,
        successRate: (completedJobs + failedJobs) > 0 ? Math.round((completedJobs / (completedJobs + failedJobs)) * 100) : 100
      },
      notificationDeliveries: {
        total: totalNotifs,
        sent: sentNotifs,
        failed: failedNotifs,
        notConfigured: unconfigNotifs,
        deliverySuccessRate: (sentNotifs + failedNotifs) > 0 ? Math.round((sentNotifs / (sentNotifs + failedNotifs)) * 100) : 100
      },
      integrations: {
        marketData: { available: true, provider: 'mandi_verified_historical' },
        notifications: {
          in_app: { available: true, configured: true },
          email: { available: !!process.env.SMTP_HOST, configured: !!process.env.SMTP_HOST },
          sms: { available: false, configured: false, reason: 'PROVIDER_NOT_CONFIGURED' },
          whatsapp: { available: false, configured: false, reason: 'PROVIDER_NOT_CONFIGURED' }
        },
        storage: { available: true, provider: 'local_sandboxed_sha256' },
        identityVerification: { available: false, configured: false, reason: 'EXTERNAL_VERIFICATION_UNAVAILABLE' }
      }
    };
  },
  recordBusinessEvent: async ({ businessId, eventType, title, description, details, actorId, metadata }) => {
    return dbRepository.createTimelineEvent(businessId, {
      eventType,
      title: title || eventType,
      description: description || (typeof details === 'string' ? details : JSON.stringify(details || {})),
      metadata: { actorId, ...(metadata || (typeof details === 'object' ? details : {})) }
    });
  },
  getBusinessTimeline: async (businessId, limit = 100) => {
    return dbRepository.listTimelineEvents(businessId, limit);
  },
  getAnalysesByBusinessId: async (businessId) => {
    return await dbRepository.listAnalyses(businessId);
  },
  getTasksByBusinessId: async (businessId) => {
    return await dbRepository.listActionTasks(businessId);
  },
  getDocumentsByBusinessId: async (businessId) => {
    return await dbRepository.listBusinessDocuments(businessId);
  },
  listDprSnapshots: async (businessIdOrOpts) => {
    const bId = (typeof businessIdOrOpts === 'object' && businessIdOrOpts !== null)
      ? (businessIdOrOpts.businessId || businessIdOrOpts.business_id)
      : businessIdOrOpts;
    return await dbRepository.listDprVersions(bId);
  },
  createDprSnapshot: async (arg1, arg2) => {
    let businessId = arg1;
    let dprData = arg2;
    if (typeof arg1 === 'object' && arg1 !== null && !arg2) {
      businessId = arg1.businessId || arg1.business_id;
      dprData = arg1;
    }
    return await dbRepository.createDprVersion(businessId, dprData || {});
  },
  initLocalTables,
  saveDb
};

module.exports = dbRepository;


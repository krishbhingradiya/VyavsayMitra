-- ==============================================================================
-- VYAVSAYMITRA — Supabase PostgreSQL Production Schema & Migrations
-- Normalized relational architecture with Row Level Security (RLS)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. PROFILES (Extends Auth Users) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  state TEXT NOT NULL DEFAULT 'Gujarat',
  district TEXT NOT NULL DEFAULT 'Anand',
  taluka TEXT DEFAULT '',
  village TEXT DEFAULT '',
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'hi', 'gu')),
  entrepreneur_type TEXT DEFAULT 'individual' CHECK (entrepreneur_type IN ('individual', 'shg', 'fpo', 'cooperative', 'partnership')),
  experience_level TEXT DEFAULT 'beginner' CHECK (experience_level IN ('beginner', 'intermediate', 'experienced')),
  capital_available NUMERIC DEFAULT 100000 CHECK (capital_available >= 0),
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. BUSINESSES (One User -> Many Businesses) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('agriculture', 'foodtech')),
  business_type TEXT NOT NULL, -- e.g. 'crop_farming', 'horticulture', 'dairy', 'poultry', 'FOODTECH_FLOUR_MILL', 'FOODTECH_RICE_MILL', etc.
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'INPUTS_INCOMPLETE', 'READY_FOR_ANALYSIS', 'ANALYZING', 'ANALYSIS_COMPLETE', 'ANALYSIS_NEEDS_INPUT', 'ERROR')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. BUSINESS_PROFILES (Metadata & Context per Business) ────────────────────
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID UNIQUE NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  stage TEXT DEFAULT 'planning' CHECK (stage IN ('idea', 'planning', 'ready_to_launch', 'operational', 'scaling')),
  land_ownership TEXT DEFAULT 'owned' CHECK (land_ownership IN ('owned', 'leased', 'rented', 'contract')),
  target_market TEXT DEFAULT 'local_mandi',
  electricity_connection TEXT DEFAULT 'three_phase',
  water_source TEXT DEFAULT 'borewell',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. BUSINESS_LOCATIONS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.business_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID UNIQUE NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  taluka TEXT DEFAULT '',
  village TEXT DEFAULT '',
  pincode TEXT,
  is_rural BOOLEAN NOT NULL DEFAULT TRUE,
  latitude NUMERIC,
  longitude NUMERIC,
  nearest_apmc_mandi TEXT,
  distance_to_mandi_km NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. BUSINESS_INPUTS (Input snapshots for versioned reproducibility) ─────────
CREATE TABLE IF NOT EXISTS public.business_inputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  domain TEXT NOT NULL,
  raw_inputs JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. ANALYSIS_INPUTS (Normalized linking table) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.analysis_inputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_input_id UUID NOT NULL REFERENCES public.business_inputs(id) ON DELETE CASCADE,
  parameter_key TEXT NOT NULL,
  parameter_value TEXT NOT NULL,
  unit TEXT,
  source_type TEXT NOT NULL DEFAULT 'USER_PROVIDED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. BUSINESS_ANALYSES (Immutable calculation runs) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.business_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  input_snapshot_id UUID REFERENCES public.business_inputs(id) ON DELETE SET NULL,
  engine_name TEXT NOT NULL,
  engine_version TEXT NOT NULL DEFAULT '2.0.0',
  status TEXT NOT NULL CHECK (status IN ('ANALYSIS_COMPLETE', 'ANALYSIS_NEEDS_INPUT', 'ERROR', 'SUCCESS', 'INSUFFICIENT_INPUTS', 'EXECUTION_ERROR', 'VALIDATION_ERROR')),
  total_project_cost NUMERIC DEFAULT 0 CHECK (total_project_cost >= 0),
  promoter_equity NUMERIC DEFAULT 0 CHECK (promoter_equity >= 0),
  bank_loan_requirement NUMERIC DEFAULT 0 CHECK (bank_loan_requirement >= 0),
  annual_revenue NUMERIC DEFAULT 0,
  annual_operating_cost NUMERIC DEFAULT 0 CHECK (annual_operating_cost >= 0),
  net_annual_profit NUMERIC DEFAULT 0,
  estimated_monthly_profit NUMERIC DEFAULT 0,
  annual_roi_pct NUMERIC DEFAULT 0,
  dscr NUMERIC DEFAULT 0,
  break_even_point JSONB,
  viability_rating TEXT,
  financial_summary JSONB NOT NULL,
  risk_assessment JSONB,
  provenance_audit JSONB NOT NULL,
  warnings JSONB DEFAULT '[]'::jsonb,
  confidence_state TEXT DEFAULT 'VERIFIED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ── 8. MARKET_SOURCES ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.market_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_code TEXT UNIQUE NOT NULL, -- e.g. 'AGMARKNET_DAILY', 'APMC_HISTORICAL', 'NABARD_MBP'
  name TEXT NOT NULL,
  authority TEXT NOT NULL,
  url TEXT,
  is_official BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 9. MARKET_OBSERVATIONS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.market_observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  market_source_id UUID REFERENCES public.market_sources(id),
  commodity TEXT NOT NULL,
  variety TEXT,
  modal_price NUMERIC NOT NULL,
  min_price NUMERIC,
  max_price NUMERIC,
  unit TEXT NOT NULL DEFAULT 'INR/quintal',
  market_name TEXT,
  district TEXT,
  state TEXT,
  observation_date DATE,
  data_status TEXT NOT NULL CHECK (data_status IN ('VERIFIED_CURRENT', 'HISTORICAL_REFERENCE', 'INSTITUTIONAL_BENCHMARK', 'DATA_UNAVAILABLE')),
  provenance JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 10. SCHEME_MATCHES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scheme_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.business_analyses(id) ON DELETE CASCADE,
  scheme_id TEXT NOT NULL, -- e.g. 'pmegp', 'mudra_kishore', 'pmfme', 'aif'
  scheme_name TEXT NOT NULL,
  ministry TEXT,
  potential_subsidy NUMERIC DEFAULT 0,
  subsidy_percentage NUMERIC DEFAULT 0,
  interest_subvention_pct NUMERIC DEFAULT 0,
  eligibility_status TEXT NOT NULL CHECK (eligibility_status IN ('POTENTIALLY_APPLICABLE', 'REQUIRES_VERIFICATION', 'INSUFFICIENT_DATA')),
  eligibility_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 11. SCHEME_DOCUMENTS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scheme_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheme_match_id UUID NOT NULL REFERENCES public.scheme_matches(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_category TEXT DEFAULT 'identity',
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 12. AI_SESSIONS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  latest_analysis_id UUID REFERENCES public.business_analyses(id),
  title TEXT DEFAULT 'Advisory Session',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 13. AI_MESSAGES ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.ai_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  verified_context_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 14. REPORTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.business_analyses(id),
  report_type TEXT NOT NULL CHECK (report_type IN ('BANKABLE_DPR', 'FEASIBILITY_SUMMARY', 'SCHEME_DOSSIER', 'RISK_REPORT')),
  title TEXT NOT NULL,
  summary TEXT,
  content_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 15. AUDIT_RUNS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES public.business_analyses(id) ON DELETE CASCADE,
  action_name TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  duration_ms INTEGER DEFAULT 0,
  status TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INDEXES FOR HIGH QUERY PERFORMANCE ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON public.businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON public.businesses(status);
CREATE INDEX IF NOT EXISTS idx_business_inputs_biz_id ON public.business_inputs(business_id);
CREATE INDEX IF NOT EXISTS idx_business_analyses_biz_id ON public.business_analyses(business_id);
CREATE INDEX IF NOT EXISTS idx_scheme_matches_analysis_id ON public.scheme_matches(analysis_id);
CREATE INDEX IF NOT EXISTS idx_scheme_matches_biz_id ON public.scheme_matches(business_id);
CREATE INDEX IF NOT EXISTS idx_market_observations_biz_id ON public.market_observations(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_biz_id ON public.ai_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_session_id ON public.ai_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_reports_biz_id ON public.reports(business_id);

-- ── ROW LEVEL SECURITY (RLS) POLICIES ─────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheme_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheme_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_runs ENABLE ROW LEVEL SECURITY;

-- Profile RLS: User can read and update only their own profile
CREATE POLICY "Users can manage their own profile"
  ON public.profiles
  FOR ALL
  USING (auth.uid() = id);

-- Businesses RLS: User can only see/modify their own businesses
CREATE POLICY "Users can manage their own businesses"
  ON public.businesses
  FOR ALL
  USING (auth.uid() = user_id);

-- Business Locations RLS
CREATE POLICY "Users can manage locations of their businesses"
  ON public.business_locations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.business_locations.business_id
      AND public.businesses.user_id = auth.uid()
    )
  );

-- Business Analyses RLS
CREATE POLICY "Users can access analyses of their businesses"
  ON public.business_analyses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.business_analyses.business_id
      AND public.businesses.user_id = auth.uid()
    )
  );

-- AI Sessions RLS
CREATE POLICY "Users can access AI sessions of their businesses"
  ON public.ai_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.ai_sessions.business_id
      AND public.businesses.user_id = auth.uid()
    )
  );

-- Reports RLS
CREATE POLICY "Users can access reports of their businesses"
  ON public.reports
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.reports.business_id
      AND public.businesses.user_id = auth.uid()
    )
  );

-- Business Inputs RLS
CREATE POLICY "Users can manage inputs of their businesses"
  ON public.business_inputs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.business_inputs.business_id
      AND public.businesses.user_id = auth.uid()
    )
  );

-- Market Observations RLS
CREATE POLICY "Users can view market observations of their businesses"
  ON public.market_observations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.market_observations.business_id
      AND public.businesses.user_id = auth.uid()
    )
  );

-- Scheme Matches RLS
CREATE POLICY "Users can view scheme matches of their businesses"
  ON public.scheme_matches
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.scheme_matches.business_id
      AND public.businesses.user_id = auth.uid()
    )
  );

-- ── 16. NOTIFICATIONS (Normalized Notification Persistence) ───────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_biz_id ON public.notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own notifications"
  ON public.notifications
  FOR ALL
  USING (auth.uid() = user_id);

-- ── 17. BUSINESS_ACTION_TASKS (Phase 7 Execution & Action Plan) ────────────────
CREATE TABLE IF NOT EXISTS public.business_action_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'operations',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  due_date TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'system' CHECK (source IN ('system', 'analysis', 'market', 'scheme', 'dpr', 'ai', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_action_tasks_biz_id ON public.business_action_tasks(business_id);
CREATE INDEX IF NOT EXISTS idx_action_tasks_status ON public.business_action_tasks(status);

ALTER TABLE public.business_action_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage action tasks for their businesses"
  ON public.business_action_tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.business_action_tasks.business_id
      AND public.businesses.user_id = auth.uid()
    )
  );

-- ── 18. BUSINESS_DOCUMENTS (Phase 7 Document Readiness Checklist) ───────────────
CREATE TABLE IF NOT EXISTS public.business_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'missing' CHECK (status IN ('missing', 'provided', 'verified', 'not_required')),
  source TEXT DEFAULT 'user',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_biz_id ON public.business_documents(business_id);

ALTER TABLE public.business_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage documents for their businesses"
  ON public.business_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.business_documents.business_id
      AND public.businesses.user_id = auth.uid()
    )
  );

-- ── 19. DPR_VERSIONS (Phase 7 Immutable Bankable DPR Snapshots) ────────────────
CREATE TABLE IF NOT EXISTS public.dpr_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.business_analyses(id) ON DELETE SET NULL,
  input_version INTEGER DEFAULT 1,
  version_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  summary TEXT,
  content_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_dpr_versions_biz_id ON public.dpr_versions(business_id);
CREATE INDEX IF NOT EXISTS idx_dpr_versions_vnum ON public.dpr_versions(business_id, version_number DESC);

ALTER TABLE public.dpr_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage DPR versions for their businesses"
  ON public.dpr_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.dpr_versions.business_id
      AND public.businesses.user_id = auth.uid()
    )
  );

-- ── 20. BUSINESS_TIMELINE (Phase 7 Audit & Activity Feed) ──────────────────────
CREATE TABLE IF NOT EXISTS public.business_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_biz_id ON public.business_timeline(business_id);
CREATE INDEX IF NOT EXISTS idx_timeline_created_at ON public.business_timeline(business_id, created_at DESC);

ALTER TABLE public.business_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view timeline for their businesses"
  ON public.business_timeline
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.business_timeline.business_id
      AND public.businesses.user_id = auth.uid()
    )
  );

-- ── 21. BUSINESS_DOCUMENT_VERSIONS (Phase 8 Multi-Version Document Vault) ───────────
CREATE TABLE IF NOT EXISTS public.business_document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.business_documents(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'under_review', 'verified', 'rejected')),
  verification_note TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_doc_id ON public.business_document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_biz_id ON public.business_document_versions(business_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_vnum ON public.business_document_versions(document_id, version_number DESC);

ALTER TABLE public.business_document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage document versions for their businesses"
  ON public.business_document_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.business_document_versions.business_id
      AND public.businesses.user_id = auth.uid()
    )
  );

-- ── 22. BUSINESS_APPLICATIONS (Phase 8 Bank & Govt Application Tracking) ──────────
CREATE TABLE IF NOT EXISTS public.business_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  application_type TEXT NOT NULL,
  scheme_name TEXT,
  institution_name TEXT,
  application_reference TEXT,
  submitted_at TIMESTAMPTZ,
  expected_response_date DATE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'DOCUMENTS_PENDING', 'READY_TO_SUBMIT', 'SUBMITTED', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'COMPLETED')),
  current_stage TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_applications_biz_id ON public.business_applications(business_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.business_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.business_applications(business_id, status);

ALTER TABLE public.business_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage applications for their businesses"
  ON public.business_applications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.business_applications.business_id
      AND public.businesses.user_id = auth.uid()
    )
  );

-- ── 23. BUSINESS_APPLICATION_DOCUMENTS (Phase 8 Application-Document Link) ────────
CREATE TABLE IF NOT EXISTS public.business_application_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES public.business_applications(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.business_documents(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_app_doc UNIQUE (application_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_app_docs_app_id ON public.business_application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_app_docs_doc_id ON public.business_application_documents(document_id);

ALTER TABLE public.business_application_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage application documents for their businesses"
  ON public.business_application_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.business_application_documents.business_id
      AND public.businesses.user_id = auth.uid()
    )
  );

-- ── 24. BUSINESS_APPLICATION_TIMELINE (Phase 8 Application Audit Feed) ─────────────
CREATE TABLE IF NOT EXISTS public.business_application_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES public.business_applications(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_timeline_app_id ON public.business_application_timeline(application_id);
CREATE INDEX IF NOT EXISTS idx_app_timeline_biz_id ON public.business_application_timeline(business_id);

ALTER TABLE public.business_application_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view application timeline for their businesses"
  ON public.business_application_timeline
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE public.businesses.id = public.business_application_timeline.business_id
      AND public.businesses.user_id = auth.uid()
    )
  );

-- ── 23. BUSINESS_PRODUCT_EVENTS (Phase 11 Privacy-Safe Product Analytics) ───────
CREATE TABLE IF NOT EXISTS public.business_product_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prod_events_user ON public.business_product_events(user_id);
CREATE INDEX IF NOT EXISTS idx_prod_events_biz ON public.business_product_events(business_id);
CREATE INDEX IF NOT EXISTS idx_prod_events_type ON public.business_product_events(event_type);
CREATE INDEX IF NOT EXISTS idx_prod_events_created ON public.business_product_events(created_at DESC);

ALTER TABLE public.business_product_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and insert own product events"
  ON public.business_product_events
  FOR ALL
  USING (auth.uid() = user_id);

-- ── 24. BUSINESS_OUTCOMES (Phase 11 Real-World Outcome Tracking) ───────────────
CREATE TABLE IF NOT EXISTS public.business_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  outcome_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT DEFAULT '',
  period TEXT DEFAULT '',
  source TEXT NOT NULL DEFAULT 'user_reported',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outcomes_biz ON public.business_outcomes(business_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_user ON public.business_outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_type ON public.business_outcomes(outcome_type);

ALTER TABLE public.business_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage outcomes for their businesses"
  ON public.business_outcomes
  FOR ALL
  USING (auth.uid() = user_id);

-- ── 25. USER_FEEDBACK (Phase 11 User Feedback System) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  feature TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user ON public.user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_cat ON public.user_feedback(category);
CREATE INDEX IF NOT EXISTS idx_feedback_feat ON public.user_feedback(feature);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and submit their own feedback"
  ON public.user_feedback
  FOR ALL
  USING (auth.uid() = user_id);

-- ── 26. RECOMMENDATION_ACTIONS (Phase 11 Recommendation Effectiveness) ────────
CREATE TABLE IF NOT EXISTS public.recommendation_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recommendation_id TEXT,
  action_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  task_id UUID REFERENCES public.business_action_tasks(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'next_action',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recom_biz ON public.recommendation_actions(business_id);
CREATE INDEX IF NOT EXISTS idx_recom_user ON public.recommendation_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_recom_status ON public.recommendation_actions(status);

-- ── 27. FIELD_VISITS (Phase 12 Field Operations & Operator Verification) ───────
CREATE TABLE IF NOT EXISTS public.field_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  operator_name TEXT DEFAULT '',
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'VERIFICATION_PENDING', 'VERIFIED', 'ACTION_REQUIRED', 'CANCELLED', 'COMPLETED')),
  checklist JSONB DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT '',
  evidence_refs JSONB DEFAULT '[]'::jsonb,
  follow_up_actions TEXT DEFAULT '',
  verification_result TEXT DEFAULT '',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fvisit_biz ON public.field_visits(business_id);
CREATE INDEX IF NOT EXISTS idx_fvisit_tenant ON public.field_visits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fvisit_op ON public.field_visits(operator_id);
CREATE INDEX IF NOT EXISTS idx_fvisit_status ON public.field_visits(status);

ALTER TABLE public.field_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users and operators can view and manage field visits"
  ON public.field_visits
  FOR ALL
  USING (auth.uid() = tenant_id OR auth.uid() = operator_id);

-- ── 28. BUSINESS_EVIDENCE (Phase 12 Real-World Evidence Vault) ─────────────────
CREATE TABLE IF NOT EXISTS public.business_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  uploader_name TEXT DEFAULT '',
  evidence_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  file_path TEXT NOT NULL,
  checksum TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'under_review', 'verified', 'requires_correction', 'rejected')),
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT DEFAULT '',
  source TEXT DEFAULT 'user_upload',
  linked_task_id UUID REFERENCES public.business_action_tasks(id) ON DELETE SET NULL,
  linked_application_id UUID REFERENCES public.business_applications(id) ON DELETE SET NULL,
  linked_outcome_id UUID REFERENCES public.business_outcomes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evid_biz ON public.business_evidence(business_id);
CREATE INDEX IF NOT EXISTS idx_evid_tenant ON public.business_evidence(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evid_type ON public.business_evidence(evidence_type);
CREATE INDEX IF NOT EXISTS idx_evid_status ON public.business_evidence(verification_status);
CREATE INDEX IF NOT EXISTS idx_evid_checksum ON public.business_evidence(checksum);
CREATE INDEX IF NOT EXISTS idx_evid_task ON public.business_evidence(linked_task_id);
CREATE INDEX IF NOT EXISTS idx_evid_outcome ON public.business_evidence(linked_outcome_id);

ALTER TABLE public.business_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage evidence for their businesses"
  ON public.business_evidence
  FOR ALL
  USING (auth.uid() = tenant_id OR auth.uid() = uploader_id);

-- ── 29. EVIDENCE_REVIEWS (Phase 12 Verification Audit) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.evidence_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evidence_id UUID NOT NULL REFERENCES public.business_evidence(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_role TEXT DEFAULT 'field_agent',
  review_status TEXT NOT NULL CHECK (review_status IN ('verified', 'requires_correction', 'rejected')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erev_evid ON public.evidence_reviews(evidence_id);

ALTER TABLE public.evidence_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view evidence reviews"
  ON public.evidence_reviews
  FOR ALL
  USING (TRUE);

-- ── 30. PARTNER_ASSIGNMENTS (Phase 12 Institution & Partner Access) ───────────
CREATE TABLE IF NOT EXISTS public.partner_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_name TEXT NOT NULL,
  partner_type TEXT NOT NULL DEFAULT 'bank' CHECK (partner_type IN ('bank', 'nbfc', 'ngo', 'fpo', 'govt_dept', 'technical_advisor', 'other')),
  status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'REVIEWING', 'ACTION_REQUIRED', 'SUPPORTED', 'COMPLETED', 'DECLINED')),
  assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notes TEXT DEFAULT '',
  permissions JSONB DEFAULT '["read"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passign_biz ON public.partner_assignments(business_id);
CREATE INDEX IF NOT EXISTS idx_passign_partner ON public.partner_assignments(partner_id);
CREATE INDEX IF NOT EXISTS idx_passign_status ON public.partner_assignments(status);

ALTER TABLE public.partner_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners and owners can view assignments"
  ON public.partner_assignments
  FOR ALL
  USING (auth.uid() = tenant_id OR auth.uid() = partner_id);

-- ── 31. NOTIFICATION_DELIVERIES (Phase 12 Channel Orchestration) ───────────────
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'NOT_CONFIGURED')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  provider TEXT DEFAULT 'internal',
  failure_reason TEXT DEFAULT '',
  idempotency_key TEXT UNIQUE,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ndeliv_recip ON public.notification_deliveries(recipient_id);
CREATE INDEX IF NOT EXISTS idx_ndeliv_status ON public.notification_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_ndeliv_idem ON public.notification_deliveries(idempotency_key);

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipients can view own notification deliveries"
  ON public.notification_deliveries
  FOR ALL
  USING (auth.uid() = recipient_id);

-- ── 32. BACKGROUND_JOBS (Phase 12 Asynchronous Job Queue) ──────────────────────
CREATE TABLE IF NOT EXISTS public.background_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  payload JSONB DEFAULT '{}'::jsonb,
  result JSONB DEFAULT '{}'::jsonb,
  error TEXT DEFAULT '',
  retries INTEGER DEFAULT 0,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bgjobs_type ON public.background_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_bgjobs_status ON public.background_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bgjobs_idem ON public.background_jobs(idempotency_key);






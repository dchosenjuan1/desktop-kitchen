-- =============================================================================
-- Sales Team Commission Tracking System
-- Platform-level tables (no tenant RLS — accessed via adminSql)
-- =============================================================================

-- ── sales_reps ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_reps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,                          -- future auth system reference
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  is_manager BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── prospect_status enum via CHECK ──────────────────────────────────────────
-- Follows project convention: TEXT + CHECK instead of native ENUM

-- ── prospects ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_rep_id UUID NOT NULL REFERENCES sales_reps(id) ON DELETE RESTRICT,
  business_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  neighborhood TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'visited'
    CHECK (status IN ('visited', 'interested', 'demo_scheduled', 'trial', 'converted', 'not_interested')),
  converted_tenant_id TEXT,              -- references tenants(id) when matched
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-matching indexes
CREATE INDEX IF NOT EXISTS idx_prospects_phone ON prospects(phone);
CREATE INDEX IF NOT EXISTS idx_prospects_email ON prospects(email);
CREATE INDEX IF NOT EXISTS idx_prospects_sales_rep ON prospects(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);

-- ── commissions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_rep_id UUID NOT NULL REFERENCES sales_reps(id) ON DELETE RESTRICT,
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE RESTRICT,
  tenant_id TEXT NOT NULL,               -- the converted tenant (references tenants.id)
  plan_name TEXT NOT NULL,               -- snapshot of plan at conversion time
  plan_price_usd NUMERIC(10,2) NOT NULL, -- snapshot of price at conversion time
  commission_amount_usd NUMERIC(10,2) NOT NULL, -- same as plan_price for one month
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  approved_by UUID REFERENCES sales_reps(id), -- manager who approved
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,                            -- manager can leave a note
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_sales_rep ON commissions(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_tenant ON commissions(tenant_id);

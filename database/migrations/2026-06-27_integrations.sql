-- ============================================================
--  Integrations — per-tenant third-party credentials
--  Run in the Supabase SQL editor for the Noomerical project.
--  Each tenant configures their own providers (no hardcoded keys).
-- ============================================================

CREATE TABLE IF NOT EXISTS integrations (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id  UUID REFERENCES tenants(id) ON DELETE CASCADE,
  provider   TEXT NOT NULL,          -- whatsapp | email | meta
  config     JSONB DEFAULT '{}',     -- provider-specific keys
  is_active  BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, provider)
);
CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integrations(tenant_id);

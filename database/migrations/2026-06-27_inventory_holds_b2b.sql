-- ============================================================
--  Phase 3 batch 2 — Inventory, Holds, B2B Agents
--  Run this in the Supabase SQL editor for the Noomerical project.
--  All tables are tenant-scoped (multi-tenant).
-- ============================================================

-- ── Accommodation / resource inventory ───────────────────────
CREATE TABLE IF NOT EXISTS accommodation_inventory (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id          UUID REFERENCES tenants(id) ON DELETE CASCADE,
  accommodation_type TEXT NOT NULL,          -- e.g. "Cottage 4-Sharing"
  total_units        INT  NOT NULL DEFAULT 0,
  capacity_per_unit  INT  DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, accommodation_type)
);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant ON accommodation_inventory(tenant_id);

-- ── Holds (block out capacity for maintenance/events) ────────
CREATE TABLE IF NOT EXISTS holds (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id          UUID REFERENCES tenants(id) ON DELETE CASCADE,
  accommodation_type TEXT NOT NULL,
  from_date          DATE NOT NULL,
  to_date            DATE NOT NULL,
  number_of_units    INT  NOT NULL DEFAULT 1,
  reason             TEXT,
  created_at         TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_holds_tenant ON holds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_holds_dates  ON holds(tenant_id, from_date, to_date);

-- ── B2B partner agents ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS b2b_agents (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id             UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  company_name          TEXT,
  phone                 TEXT,
  email                 TEXT,
  commission_percentage NUMERIC(5,2) DEFAULT 0,
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_b2b_tenant ON b2b_agents(tenant_id);

-- Link deals to a B2B agent (optional column add)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS b2b_agent_id UUID REFERENCES b2b_agents(id);

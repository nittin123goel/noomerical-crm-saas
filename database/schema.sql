-- ============================================================
--  CRM SaaS — Multi-Tenant Database Schema
--  All tables are scoped to tenant_id.
--  Enable RLS on every table in Supabase dashboard.
-- ============================================================

-- ── Tenants ──────────────────────────────────────────────────
CREATE TABLE tenants (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  subdomain       TEXT UNIQUE NOT NULL,         -- hilton.yourcrm.com
  industry        TEXT DEFAULT 'general',       -- hospitality | real_estate | education | healthcare | general
  status          TEXT DEFAULT 'trial',         -- trial | active | suspended | cancelled
  plan            TEXT DEFAULT 'starter',       -- starter | pro | enterprise
  plan_expires_at TIMESTAMPTZ,
  -- Branding (white-label)
  logo_url        TEXT,
  primary_color   TEXT DEFAULT '#4f46e5',
  company_tagline TEXT,
  -- Locale
  timezone        TEXT DEFAULT 'Asia/Kolkata',
  currency        TEXT DEFAULT 'INR',
  locale          TEXT DEFAULT 'en-IN',
  -- Billing contact
  billing_email   TEXT,
  billing_phone   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Tenant Settings (integrations + module toggles) ──────────
CREATE TABLE tenant_settings (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  -- Terminology (industry-specific labels)
  lead_label        TEXT DEFAULT 'Lead',        -- Lead | Patient | Student | Prospect
  deal_label        TEXT DEFAULT 'Booking',     -- Booking | Deal | Admission | Appointment
  pipeline_stages   JSONB DEFAULT '["new","contacted","interested","converted","lost"]',
  -- Module toggles
  module_deals      BOOLEAN DEFAULT true,
  module_inventory  BOOLEAN DEFAULT false,
  module_checkin    BOOLEAN DEFAULT false,
  module_loyalty    BOOLEAN DEFAULT false,
  module_b2b        BOOLEAN DEFAULT false,
  module_campaigns  BOOLEAN DEFAULT true,
  module_payments   BOOLEAN DEFAULT false,
  module_creative   BOOLEAN DEFAULT false,
  -- WhatsApp (Wati)
  wati_api_url    TEXT,
  wati_api_token  TEXT,
  wati_phone      TEXT,
  -- WhatsApp (Aisensy)
  aisensy_api_key TEXT,
  -- Meta (Facebook/Instagram lead ads)
  meta_app_id             TEXT,
  meta_app_secret         TEXT,
  meta_page_access_token  TEXT,
  meta_webhook_verify_token TEXT,
  -- Email
  smtp_host       TEXT,
  smtp_port       INT DEFAULT 587,
  smtp_user       TEXT,
  smtp_pass       TEXT,
  smtp_from_email TEXT,
  -- Payments (Cashfree)
  cashfree_app_id     TEXT,
  cashfree_secret_key TEXT,
  cashfree_env        TEXT DEFAULT 'sandbox',
  -- Telephony (Knowlarity)
  knowlarity_api_key TEXT,
  knowlarity_sr_key  TEXT,
  knowlarity_sr_number TEXT,
  -- Team notification
  admin_phone          TEXT,
  resort_manager_phone TEXT,
  resort_phone         TEXT,
  -- Tax
  tax_label TEXT DEFAULT 'GST',
  tax_rate  NUMERIC(5,2) DEFAULT 0,
  -- Custom field definitions (JSON schema per industry)
  lead_custom_fields JSONB DEFAULT '[]',
  deal_custom_fields JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT DEFAULT 'sales',   -- master | admin | manager | sales | custom
  is_active     BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, email)
);

-- ── Leads ────────────────────────────────────────────────────
CREATE TABLE leads (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT,
  phone       TEXT,
  email       TEXT,
  source      TEXT,   -- whatsapp_inbound | ivr_call | meta_lead | wordpress_form | walk_in | referral | manual
  status      TEXT DEFAULT 'new',
  temperature TEXT DEFAULT 'warm',    -- hot | warm | cold
  assigned_to UUID REFERENCES users(id),
  follow_up_at TIMESTAMPTZ,
  notes       TEXT,
  lead_score  INT DEFAULT 0,
  disposition TEXT,
  is_spam     BOOLEAN DEFAULT false,
  is_old_lead BOOLEAN DEFAULT false,
  custom_fields JSONB DEFAULT '{}',   -- industry-specific fields
  -- UTM / Ad attribution
  gclid          TEXT,
  utm_source     TEXT,
  utm_medium     TEXT,
  utm_campaign   TEXT,
  utm_content    TEXT,
  landing_page   TEXT,
  -- Meta (Facebook/Instagram Lead Ads)
  meta_lead_id      TEXT,             -- Facebook lead ID from webhook
  meta_form_id      TEXT,
  meta_ad_id        TEXT,
  meta_adset_id     TEXT,
  meta_campaign_id  TEXT,
  meta_campaign_name TEXT,
  meta_page_id      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_leads_tenant   ON leads(tenant_id);
CREATE INDEX idx_leads_phone    ON leads(tenant_id, phone);
CREATE INDEX idx_leads_status   ON leads(tenant_id, status);
CREATE INDEX idx_leads_assigned ON leads(tenant_id, assigned_to);

-- ── Lead Activities ──────────────────────────────────────────
CREATE TABLE lead_activities (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT,
  description   TEXT,
  channel       TEXT,
  direction     TEXT,
  performed_by  UUID REFERENCES users(id),
  performed_by_name TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_activities_lead   ON lead_activities(lead_id);
CREATE INDEX idx_activities_tenant ON lead_activities(tenant_id, created_at DESC);

-- ── Customers ────────────────────────────────────────────────
CREATE TABLE customers (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);

-- ── Deals (generic Bookings/Orders/Appointments) ─────────────
CREATE TABLE deals (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  deal_number  TEXT NOT NULL,
  customer_id  UUID REFERENCES customers(id),
  lead_id      UUID REFERENCES leads(id),
  status       TEXT DEFAULT 'confirmed',
  start_date   DATE,
  end_date     DATE,
  -- Financials
  total_amount   NUMERIC(12,2) DEFAULT 0,
  advance_amount NUMERIC(12,2) DEFAULT 0,
  balance_amount NUMERIC(12,2) DEFAULT 0,
  tax_amount     NUMERIC(12,2) DEFAULT 0,
  -- Hospitality extras (null for other industries)
  accommodation_type TEXT,
  number_of_units    INT,
  adults             INT,
  children           INT,
  price_per_adult    NUMERIC(10,2),
  price_per_child    NUMERIC(10,2),
  -- Flexible custom fields
  custom_fields JSONB DEFAULT '{}',
  notes         TEXT,
  created_by    UUID REFERENCES users(id),
  salesperson_id UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_deals_tenant   ON deals(tenant_id);
CREATE INDEX idx_deals_customer ON deals(tenant_id, customer_id);
CREATE INDEX idx_deals_lead     ON deals(tenant_id, lead_id);

-- ── Payments ─────────────────────────────────────────────────
CREATE TABLE payments (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id      UUID REFERENCES tenants(id) ON DELETE CASCADE,
  deal_id        UUID REFERENCES deals(id),
  lead_id        UUID REFERENCES leads(id),
  amount         NUMERIC(12,2) NOT NULL,
  payment_method TEXT,
  transaction_id TEXT,
  gateway        TEXT DEFAULT 'manual',  -- manual | cashfree | razorpay
  gateway_order_id TEXT,
  status         TEXT DEFAULT 'captured', -- pending | captured | failed
  recorded_by    UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ── Campaigns ────────────────────────────────────────────────
CREATE TABLE campaigns (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT,
  template_name TEXT,
  channel       TEXT DEFAULT 'whatsapp',  -- whatsapp | email | sms
  filters       JSONB,
  total_leads   INT DEFAULT 0,
  sent          INT DEFAULT 0,
  failed        INT DEFAULT 0,
  status        TEXT DEFAULT 'pending',
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Role Permissions (per tenant) ────────────────────────────
CREATE TABLE role_permissions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id  UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  page       TEXT NOT NULL,
  can_view   BOOLEAN DEFAULT false,
  can_edit   BOOLEAN DEFAULT false,
  UNIQUE(tenant_id, role, page)
);

-- ── Communication Log ────────────────────────────────────────
CREATE TABLE communication_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id     UUID REFERENCES leads(id),
  phone       TEXT,
  channel     TEXT,   -- whatsapp | sms | email | call
  direction   TEXT,   -- inbound | outbound
  message     TEXT,
  media_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Meta Lead Forms Mapping ──────────────────────────────────
CREATE TABLE meta_lead_forms (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  form_id       TEXT NOT NULL,          -- Facebook Lead Form ID
  form_name     TEXT,
  page_id       TEXT,
  -- Maps Meta field labels → CRM lead columns
  -- e.g. {"full_name": "name", "phone_number": "phone", "email": "email"}
  field_mapping JSONB DEFAULT '{}',
  -- Default values to set on created lead
  default_source TEXT DEFAULT 'meta_lead',
  default_status TEXT DEFAULT 'new',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, form_id)
);

-- ── Notification Recipients ──────────────────────────────────
CREATE TABLE notification_recipients (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id            UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name                 TEXT,
  phone                TEXT,
  email                TEXT,
  receive_new_lead     BOOLEAN DEFAULT false,
  receive_new_deal     BOOLEAN DEFAULT false,
  receive_daily_report BOOLEAN DEFAULT false,
  is_active            BOOLEAN DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- ── Superadmin (platform-level, no tenant_id) ────────────────
CREATE TABLE superadmins (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
--  ROW LEVEL SECURITY — enable on all tenant-scoped tables
--  Run in Supabase dashboard after creating tables.
-- ============================================================
-- ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "tenant_isolation" ON leads
--   USING (tenant_id = (current_setting('app.tenant_id'))::uuid);
-- (repeat for all tables)

# CRM SaaS — Architecture Reference

## Folder structure

```
CRM_SaaS/
├── backend/
│   ├── src/
│   │   ├── index.js                        Main Express app
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js           JWT + requireRole + requirePermission (tenant-scoped cache)
│   │   │   └── tenant.middleware.js         Subdomain → tenant resolver (60s cache)
│   │   ├── routes/
│   │   │   ├── auth.routes.js              Login, /me
│   │   │   ├── leads.routes.js             Full leads CRUD + activities
│   │   │   ├── admin.routes.js             Users + permissions per tenant
│   │   │   ├── superadmin.routes.js        Create/manage tenants (platform-level)
│   │   │   ├── webhook.routes.js           Meta, Knowlarity, Aisensy, form webhooks
│   │   │   └── meta-forms.routes.js        Configure Facebook Lead Ad form mappings
│   │   └── services/
│   │       ├── supabase.js                 Supabase client
│   │       └── meta.service.js             Meta Graph API lead fetcher + upsert
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx                         Routes + protected layout
│   │   ├── index.css                       Design tokens + base classes
│   │   ├── context/AuthContext.jsx         User + tenant state
│   │   ├── services/api.js                 Axios client with JWT + 401 redirect
│   │   ├── components/Sidebar.jsx          Collapsible nav, tenant branding
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Leads.jsx
│   │       ├── Admin.jsx                   User management + permission matrix
│   │       └── MetaForms.jsx               Connect Facebook Lead Ad forms
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── database/
    └── schema.sql                          Full multi-tenant schema with RLS notes
```

## Multi-tenancy

- Every request hits `tenantMiddleware` which reads the subdomain (`hilton.yourcrm.com` → `hilton`) and resolves it to a tenant row from the DB (60s cache).
- `req.tenant` and `req.tenantId` are set on every request.
- Every DB query filters by `tenant_id` — no cross-tenant data leaks.
- JWT tokens embed `tenantId`; auth middleware rejects tokens from wrong tenants.
- Row Level Security (RLS) is the last line of defence in Supabase.

## Meta (Facebook/Instagram) Lead Ads

```
User submits Meta Lead Ad form
  → Meta sends POST /api/webhook/meta
  → We verify X-Hub-Signature-256 (HMAC-SHA256 with META_APP_SECRET)
  → We look up which tenant owns that page_id via meta_lead_forms table
  → We fetch full lead data from Graph API (/v20.0/{lead_id}?fields=field_data,...)
  → We map Meta fields → CRM fields using tenant's field_mapping JSON
  → We upsert into leads table with source='meta_lead' + all Meta attribution fields
  → We log an activity: "Lead captured from Meta"
```

To connect a new form:
1. Admin creates a `meta_lead_forms` row (via MetaForms page or API)
2. Provides `form_id`, `page_id`, `field_mapping`
3. Meta webhook already subscribed at app level — no per-tenant webhook needed

## Adding new routes

1. Create `backend/src/routes/feature.routes.js`
2. Always filter by `req.tenantId` in every query
3. Add `requirePermission('page', 'edit')` on mutations
4. Mount in `backend/src/index.js`
5. Add to frontend `PAGES` array in Admin.jsx if it needs permission control

## Environment variables

Copy `backend/.env.example` to `backend/.env` and fill in:
- `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` — from Supabase dashboard
- `JWT_SECRET` — random 64-char string
- `META_APP_ID` + `META_APP_SECRET` + `META_WEBHOOK_VERIFY_TOKEN` — from Meta App Dashboard
- `SUPERADMIN_SECRET` — secret for creating tenants (keep this safe)

Per-tenant integration credentials (Wati, Aisensy, Cashfree, SMTP, Knowlarity)
are stored in the `tenant_settings` table, not in .env.

## Creating the first tenant

```bash
curl -X POST https://yourcrm.com/api/superadmin/tenants \
  -H "x-superadmin-secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Adventuria Resort",
    "subdomain": "adventuria",
    "industry": "hospitality",
    "admin_email": "admin@adventuria.com",
    "admin_password": "secure-password",
    "billing_email": "billing@adventuria.com"
  }'
```

The tenant can then log in at `https://adventuria.yourcrm.com`.

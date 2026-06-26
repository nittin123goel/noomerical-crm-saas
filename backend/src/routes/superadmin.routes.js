/**
 * Superadmin routes — platform-level management (tenants, billing, usage).
 * Accessible only at app.yourcrm.com or with SUPERADMIN_SECRET header.
 * These routes are NOT tenant-scoped.
 */

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const router   = express.Router();
const supabase = require('../services/supabase');
const { clearTenantCache } = require('../middleware/tenant.middleware');

// Guard for superadmin routes. Accepts EITHER:
//   1. the shared SUPERADMIN_SECRET header (programmatic / bootstrap use), or
//   2. a superadmin JWT issued by POST /api/superadmin/login (the panel).
function superadminAuth(req, res, next) {
  const secret = req.headers['x-superadmin-secret'];
  if (secret && secret === process.env.SUPERADMIN_SECRET) return next();

  const authz = req.headers.authorization || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload.scope === 'superadmin') {
        req.superadmin = { id: payload.id, email: payload.email, name: payload.name };
        return next();
      }
    } catch { /* invalid token — fall through to 403 */ }
  }
  return res.status(403).json({ error: 'Forbidden' });
}

// POST /api/superadmin/bootstrap — create the first superadmin account.
// Protected by the shared secret so it can be called once during setup.
router.post('/bootstrap', async (req, res) => {
  const secret = req.headers['x-superadmin-secret'];
  if (!secret || secret !== process.env.SUPERADMIN_SECRET)
    return res.status(403).json({ error: 'Forbidden' });

  const { name, email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'email and password required' });

  const { data: existing } = await supabase
    .from('superadmins').select('id').eq('email', email.toLowerCase().trim()).maybeSingle();
  if (existing) return res.status(409).json({ error: 'A superadmin with that email already exists' });

  const hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from('superadmins')
    .insert({ name: name || 'Super Admin', email: email.toLowerCase().trim(), password_hash: hash })
    .select('id, name, email')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ superadmin: data });
});

// POST /api/superadmin/login — email + password → superadmin JWT
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const { data: sa } = await supabase
    .from('superadmins')
    .select('id, name, email, password_hash')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();
  if (!sa) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, sa.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: sa.id, email: sa.email, name: sa.name, scope: 'superadmin' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
  res.json({ token, superadmin: { id: sa.id, name: sa.name, email: sa.email } });
});

// GET /api/superadmin/me — restore session
router.get('/me', superadminAuth, (req, res) => {
  res.json({ superadmin: req.superadmin || { secret: true } });
});

// GET /api/superadmin/tenants
router.get('/tenants', superadminAuth, async (req, res) => {
  const { data } = await supabase
    .from('tenants')
    .select('id, name, subdomain, industry, status, plan, plan_expires_at, billing_email, created_at')
    .order('created_at', { ascending: false });
  res.json(data || []);
});

// POST /api/superadmin/tenants  — create new tenant (onboard new customer)
router.post('/tenants', superadminAuth, async (req, res) => {
  const {
    name, subdomain, industry, plan, billing_email, billing_phone,
    admin_name, admin_email, admin_password,
    timezone, currency, locale,
  } = req.body;

  if (!name || !subdomain || !admin_email || !admin_password)
    return res.status(400).json({ error: 'name, subdomain, admin_email, admin_password required' });

  // 1. Create tenant
  const { data: tenant, error: tErr } = await supabase
    .from('tenants')
    .insert({
      name, subdomain: subdomain.toLowerCase(), industry: industry || 'general',
      status: 'trial', plan: plan || 'starter',
      billing_email, billing_phone,
      timezone: timezone || 'Asia/Kolkata',
      currency: currency || 'INR',
      locale: locale || 'en-IN',
    })
    .select()
    .single();
  if (tErr) return res.status(400).json({ error: tErr.message });

  // 2. Seed tenant_settings
  await supabase.from('tenant_settings').insert({ tenant_id: tenant.id });

  // 3. Create master user
  const hash = await bcrypt.hash(admin_password, 10);
  await supabase.from('users').insert({
    tenant_id:     tenant.id,
    name:          admin_name || name + ' Admin',
    email:         admin_email.toLowerCase(),
    password_hash: hash,
    role:          'master',
  });

  // 4. Seed default permissions (admin + manager + sales)
  const ROLES = ['admin', 'manager', 'sales'];
  const PAGES = ['leads', 'deals', 'customers', 'inventory', 'reports', 'campaigns', 'payments', 'admin'];
  const perms = [];
  for (const role of ROLES) {
    for (const page of PAGES) {
      perms.push({
        tenant_id: tenant.id, role, page,
        can_view: role !== 'sales' || page !== 'admin',
        can_edit: role === 'admin' || role === 'manager',
      });
    }
  }
  await supabase.from('role_permissions').insert(perms);

  clearTenantCache(subdomain.toLowerCase());

  res.status(201).json({ tenant, message: `Tenant created — login at https://${subdomain}.yourcrm.com` });
});

// PATCH /api/superadmin/tenants/:id
router.patch('/tenants/:id', superadminAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('tenants')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });

  if (data.subdomain) clearTenantCache(data.subdomain);
  res.json(data);
});

// DELETE /api/superadmin/tenants/:id  — hard delete (dangerous)
router.delete('/tenants/:id', superadminAuth, async (req, res) => {
  await supabase.from('tenants').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

module.exports = router;

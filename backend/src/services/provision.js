/**
 * Tenant provisioning — shared by superadmin (manual create) and public signup.
 * Creates a tenant + its settings + master user + default role permissions.
 */

const bcrypt   = require('bcryptjs');
const supabase = require('./supabase');
const { clearTenantCache } = require('../middleware/tenant.middleware');

// Subdomains that may never be claimed by a tenant (system / routing hosts).
const RESERVED = [
  'app', 'www', 'api', 'admin', 'superadmin', 'mail', 'smtp', 'ftp',
  'blog', 'dev', 'staging', 'test', 'support', 'help', 'noomerical',
  'dashboard', 'account', 'billing', 'status', 'docs', 'cdn', 'static',
];

function validateSubdomain(sub) {
  if (!sub) return 'Subdomain is required';
  if (!/^[a-z0-9-]{3,30}$/.test(sub)) return 'Use 3–30 lowercase letters, numbers, or hyphens';
  if (sub.startsWith('-') || sub.endsWith('-')) return 'Cannot start or end with a hyphen';
  if (RESERVED.includes(sub)) return 'That subdomain is reserved';
  return null;
}

async function isSubdomainAvailable(sub) {
  const { data } = await supabase.from('tenants').select('id').eq('subdomain', sub).maybeSingle();
  return !data;
}

/**
 * Provision a new tenant. Returns { tenant } on success, or { error, status }.
 */
async function createTenant(payload) {
  const {
    name, subdomain, industry, plan, billing_email, billing_phone,
    admin_name, admin_email, admin_password,
    timezone, currency, locale,
  } = payload || {};

  const sub = (subdomain || '').toLowerCase().trim();
  const vErr = validateSubdomain(sub);
  if (vErr) return { error: vErr, status: 400 };

  if (!name || !admin_email || !admin_password)
    return { error: 'name, admin_email and admin_password are required', status: 400 };
  if (String(admin_password).length < 6)
    return { error: 'Password must be at least 6 characters', status: 400 };

  if (!(await isSubdomainAvailable(sub)))
    return { error: 'That subdomain is already taken', status: 409 };

  // 1. Tenant
  const { data: tenant, error: tErr } = await supabase
    .from('tenants')
    .insert({
      name, subdomain: sub, industry: industry || 'general',
      status: 'trial', plan: plan || 'starter',
      billing_email: billing_email || admin_email,
      billing_phone,
      timezone: timezone || 'Asia/Kolkata',
      currency: currency || 'INR',
      locale: locale || 'en-IN',
    })
    .select()
    .single();
  if (tErr) return { error: tErr.message, status: 400 };

  // 2. Settings
  await supabase.from('tenant_settings').insert({ tenant_id: tenant.id });

  // 3. Master user
  const hash = await bcrypt.hash(admin_password, 10);
  const { error: uErr } = await supabase.from('users').insert({
    tenant_id:     tenant.id,
    name:          admin_name || name + ' Admin',
    email:         admin_email.toLowerCase().trim(),
    password_hash: hash,
    role:          'master',
  });
  if (uErr) {
    // Roll back the tenant so we don't leave an orphan with no login.
    await supabase.from('tenants').delete().eq('id', tenant.id);
    return { error: uErr.message, status: 400 };
  }

  // 4. Default permissions (admin + manager + sales)
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

  clearTenantCache(sub);
  return { tenant };
}

module.exports = { createTenant, validateSubdomain, isSubdomainAvailable, RESERVED };

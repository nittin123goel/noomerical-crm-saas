/**
 * Tenant resolution middleware.
 * Reads the subdomain from the request hostname and resolves it to a tenant record.
 * Attaches req.tenant (full row) to every request.
 *
 * yourcrm.com          → no tenant (marketing / signup)
 * hilton.yourcrm.com   → tenant { id, name, subdomain, status, ... }
 * app.yourcrm.com      → reserved for superadmin panel
 */

const supabase = require('../services/supabase');

// Simple in-memory cache: subdomain → { tenant, expiresAt }
const _cache   = new Map();
const TTL_MS   = 60_000;

async function resolveTenant(subdomain) {
  const cached = _cache.get(subdomain);
  if (cached && Date.now() < cached.expiresAt) return cached.tenant;

  const { data } = await supabase
    .from('tenants')
    .select('id, name, subdomain, status, plan, plan_expires_at, industry, primary_color, logo_url, timezone, currency, locale')
    .eq('subdomain', subdomain)
    .maybeSingle();

  _cache.set(subdomain, { tenant: data || null, expiresAt: Date.now() + TTL_MS });
  return data || null;
}

async function tenantMiddleware(req, res, next) {
  // Platform-level & public routes don't belong to a tenant. They must bypass
  // subdomain resolution — superadmin creates tenants, webhooks resolve the
  // tenant themselves (e.g. by Meta page_id), and /health is unauthenticated.
  const p = req.path;
  if (p === '/health' || p.startsWith('/api/superadmin') || p.startsWith('/api/webhook') || p.startsWith('/api/signup')) {
    req.tenant = null;
    return next();
  }

  // Resolve which tenant this request belongs to. Priority:
  //   1. X-Tenant header — the frontend sends its own subdomain. Required because
  //      the frontend (app.*) and API (api.*) are on different hosts, so the API
  //      cannot read the tenant subdomain from its own hostname.
  //   2. The request's own subdomain (acme.noomerical.website -> "acme").
  //   3. DEFAULT_TENANT_SUBDOMAIN fallback (single-tenant / bare-host access).
  const headerTenant = (req.headers['x-tenant'] || '').toString().trim().toLowerCase();
  let subdomain = null;
  if (headerTenant) {
    subdomain = headerTenant;
  } else {
    const host    = req.hostname || '';
    const parts   = host.split('.');
    const hostSub = parts.length >= 3 ? parts[0].toLowerCase() : null;
    if (hostSub && !['www', 'app', 'api'].includes(hostSub) && !host.endsWith('.onrender.com')) {
      subdomain = hostSub;
    } else {
      subdomain = process.env.DEFAULT_TENANT_SUBDOMAIN || null;
    }
  }

  // No subdomain — routes like /api/auth/signup, /health
  if (!subdomain || subdomain === 'www' || subdomain === 'app') {
    req.tenant = null;
    return next();
  }

  const tenant = await resolveTenant(subdomain);

  if (!tenant) {
    return res.status(404).json({ error: 'Organisation not found' });
  }

  if (tenant.status === 'suspended') {
    return res.status(402).json({ error: 'Account suspended — please contact support' });
  }

  if (tenant.status === 'cancelled') {
    return res.status(410).json({ error: 'Account cancelled' });
  }

  req.tenant   = tenant;
  req.tenantId = tenant.id;
  next();
}

function clearTenantCache(subdomain) {
  if (subdomain) _cache.delete(subdomain);
  else _cache.clear();
}

module.exports = { tenantMiddleware, clearTenantCache };

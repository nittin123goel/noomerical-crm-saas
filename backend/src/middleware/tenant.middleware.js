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
    .select('id, name, subdomain, status, plan, plan_expires_at, primary_color, logo_url, timezone, currency, locale')
    .eq('subdomain', subdomain)
    .maybeSingle();

  _cache.set(subdomain, { tenant: data || null, expiresAt: Date.now() + TTL_MS });
  return data || null;
}

async function tenantMiddleware(req, res, next) {
  const host      = req.hostname || '';
  const parts     = host.split('.');
  const subdomain = parts.length >= 3 ? parts[0] : null;

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

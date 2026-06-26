// Determines which tenant (business) the app is currently being viewed as,
// based on the subdomain — e.g. rbl.noomerical.website -> "rbl".
//
// Returns null when there is no tenant subdomain (the root domain, the `app`
// superadmin host, localhost dev, or a plain *.onrender.com URL). In those
// cases the backend falls back to DEFAULT_TENANT_SUBDOMAIN.

const BASE_DOMAIN = 'noomerical.website';
const RESERVED    = ['app', 'www', 'api'];

export function currentTenant() {
  const host = window.location.hostname;
  if (!host.endsWith('.' + BASE_DOMAIN)) return null;        // onrender / localhost / root
  const sub = host.slice(0, host.length - BASE_DOMAIN.length - 1).split('.')[0].toLowerCase();
  if (!sub || RESERVED.includes(sub)) return null;
  return sub;
}

// The base domain, used to build per-tenant URLs in the superadmin panel.
export function baseDomain() {
  const host = window.location.hostname;
  const parts = host.split('.');
  return parts.length >= 2 ? parts.slice(-2).join('.') : host;
}

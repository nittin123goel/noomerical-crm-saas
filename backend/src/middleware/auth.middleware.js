const jwt      = require('jsonwebtoken');
const supabase = require('../services/supabase');

// ── JWT authentication ─────────────────────────────────────────────────────────

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Not logged in' });

  const token = header.split(' ')[1];
  try {
    const decoded  = jwt.verify(token, process.env.JWT_SECRET);
    req.user       = decoded;
    // Ensure tenant isolation: token's tenant_id must match resolved tenant
    if (req.tenantId && decoded.tenantId !== req.tenantId) {
      return res.status(403).json({ error: 'Token does not match organisation' });
    }
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired — please login again' });
  }
}

// ── Hard role guard ────────────────────────────────────────────────────────────

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role))
      return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

// ── DB-backed permission guard ─────────────────────────────────────────────────
// Checks role_permissions table per tenant.
// Only 'master' auto-bypasses; all others including 'admin' are DB-checked
// so superadmins of a tenant can restrict even admin access.

const _permCache  = new Map();
const PERM_TTL_MS = 60_000;

function requirePermission(page, action = 'edit') {
  return async (req, res, next) => {
    const { role, tenantId } = req.user || {};
    if (!role)     return res.status(401).json({ error: 'Not authenticated' });
    if (!tenantId) return res.status(403).json({ error: 'No organisation context' });

    if (role === 'master') return next();

    const key    = `${tenantId}:${role}:${page}`;
    let   cached = _permCache.get(key);

    if (!cached || Date.now() > cached.expiresAt) {
      const { data } = await supabase
        .from('role_permissions')
        .select('can_view, can_edit')
        .eq('tenant_id', tenantId)
        .eq('role', role)
        .eq('page', page)
        .maybeSingle();

      cached = {
        canView:   data?.can_view  ?? false,
        canEdit:   data?.can_edit  ?? false,
        expiresAt: Date.now() + PERM_TTL_MS,
      };
      _permCache.set(key, cached);
    }

    const allowed = action === 'edit' ? cached.canEdit : cached.canView;
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

function clearPermCache(tenantId) {
  if (tenantId) {
    for (const k of _permCache.keys()) {
      if (k.startsWith(tenantId)) _permCache.delete(k);
    }
  } else {
    _permCache.clear();
  }
}

module.exports               = authMiddleware;
module.exports.requireRole       = requireRole;
module.exports.requirePermission = requirePermission;
module.exports.clearPermCache    = clearPermCache;

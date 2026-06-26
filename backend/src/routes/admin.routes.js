/**
 * Admin routes — manage users and permissions within a tenant.
 * Superadmin routes (manage tenants/billing) are in superadmin.routes.js.
 */

const express  = require('express');
const bcrypt   = require('bcryptjs');
const router   = express.Router();
const supabase = require('../services/supabase');
const auth     = require('../middleware/auth.middleware');
const { requireRole, clearPermCache } = auth;

// GET /api/admin/users
router.get('/users', auth, requireRole('master', 'admin'), async (req, res) => {
  const { data } = await supabase
    .from('users')
    .select('id, name, email, phone, role, is_active, last_login_at, created_at')
    .eq('tenant_id', req.tenantId)
    .order('created_at', { ascending: true });
  res.json(data || []);
});

// POST /api/admin/users
router.post('/users', auth, requireRole('master', 'admin'), async (req, res) => {
  const { name, email, phone, role, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from('users')
    .insert({ tenant_id: req.tenantId, name, email: email.toLowerCase(), phone, role: role || 'sales', password_hash: hash })
    .select('id, name, email, role')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /api/admin/users/:id
router.patch('/users/:id', auth, requireRole('master', 'admin'), async (req, res) => {
  const updates = { ...req.body };
  if (updates.password) {
    updates.password_hash = await bcrypt.hash(updates.password, 10);
    delete updates.password;
  }
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .select('id, name, email, role, is_active')
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', auth, requireRole('master'), async (req, res) => {
  await supabase.from('users').delete().eq('id', req.params.id).eq('tenant_id', req.tenantId);
  res.json({ ok: true });
});

// ── Permissions ───────────────────────────────────────────────────────────────

const DEFAULT_PAGES = ['leads', 'deals', 'customers', 'inventory', 'reports', 'campaigns', 'payments', 'admin'];

// GET /api/admin/permissions?role=sales
router.get('/permissions', auth, async (req, res) => {
  const { role } = req.query;
  let q = supabase.from('role_permissions').select('*').eq('tenant_id', req.tenantId);
  if (role) q = q.eq('role', role);
  const { data } = await q;
  res.json(data || []);
});

// PATCH /api/admin/permissions
router.patch('/permissions', auth, requireRole('master', 'admin'), async (req, res) => {
  const { role, page, can_view, can_edit } = req.body;
  const { data, error } = await supabase
    .from('role_permissions')
    .upsert({ tenant_id: req.tenantId, role, page, can_view, can_edit })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  clearPermCache(req.tenantId);
  res.json(data);
});

module.exports = router;

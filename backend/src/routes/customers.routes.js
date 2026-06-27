const express  = require('express');
const router   = express.Router();
const supabase = require('../services/supabase');
const auth     = require('../middleware/auth.middleware');
const { requirePermission, requireRole } = auth;

// GET /api/customers  — list (optional search)
router.get('/', auth, async (req, res) => {
  const { search } = req.query;
  let q = supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', req.tenantId)
    .order('created_at', { ascending: false });
  if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// POST /api/customers
router.post('/', auth, requirePermission('customers', 'edit'), async (req, res) => {
  const { data, error } = await supabase
    .from('customers')
    .insert({ ...req.body, tenant_id: req.tenantId })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /api/customers/:id
router.patch('/:id', auth, requirePermission('customers', 'edit'), async (req, res) => {
  const { data, error } = await supabase
    .from('customers')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/customers/:id
router.delete('/:id', auth, requireRole('master', 'admin'), async (req, res) => {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;

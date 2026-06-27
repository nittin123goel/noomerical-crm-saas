const express  = require('express');
const router   = express.Router();
const supabase = require('../services/supabase');
const auth     = require('../middleware/auth.middleware');
const { requirePermission, requireRole } = auth;

// GET /api/b2b-agents
router.get('/', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('b2b_agents').select('*').eq('tenant_id', req.tenantId)
    .order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// POST /api/b2b-agents
router.post('/', auth, requirePermission('deals', 'edit'), async (req, res) => {
  const { data, error } = await supabase
    .from('b2b_agents').insert({ ...req.body, tenant_id: req.tenantId }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /api/b2b-agents/:id
router.patch('/:id', auth, requirePermission('deals', 'edit'), async (req, res) => {
  const { data, error } = await supabase
    .from('b2b_agents').update(req.body).eq('id', req.params.id).eq('tenant_id', req.tenantId)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/b2b-agents/:id
router.delete('/:id', auth, requireRole('master', 'admin'), async (req, res) => {
  const { error } = await supabase.from('b2b_agents')
    .delete().eq('id', req.params.id).eq('tenant_id', req.tenantId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;

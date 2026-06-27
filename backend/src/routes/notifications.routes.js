const express  = require('express');
const router   = express.Router();
const supabase = require('../services/supabase');
const auth     = require('../middleware/auth.middleware');
const { requireRole } = auth;

// GET /api/notifications/recipients
router.get('/recipients', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('notification_recipients')
    .select('*')
    .eq('tenant_id', req.tenantId)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// POST /api/notifications/recipients
router.post('/recipients', auth, requireRole('master', 'admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('notification_recipients')
    .insert({ ...req.body, tenant_id: req.tenantId })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /api/notifications/recipients/:id
router.patch('/recipients/:id', auth, requireRole('master', 'admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('notification_recipients')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/notifications/recipients/:id
router.delete('/recipients/:id', auth, requireRole('master', 'admin'), async (req, res) => {
  const { error } = await supabase
    .from('notification_recipients')
    .delete()
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;

const express  = require('express');
const router   = express.Router();
const supabase = require('../services/supabase');
const auth     = require('../middleware/auth.middleware');
const { requirePermission, requireRole } = auth;

// All routes require auth + tenant context (tenant is attached by tenantMiddleware)

// GET /api/leads  — list with filters
router.get('/', auth, async (req, res) => {
  const { status, source, temperature, assigned_to, search, from, to, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let q = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('tenant_id', req.tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + parseInt(limit) - 1);

  if (status)      q = q.eq('status', status);
  if (source)      q = q.eq('source', source);
  if (temperature) q = q.eq('temperature', temperature);
  if (assigned_to) q = q.eq('assigned_to', assigned_to);
  if (from)        q = q.gte('created_at', from);
  if (to)          q = q.lte('created_at', to);
  if (search)      q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);

  const { data, error, count } = await q;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ leads: data, total: count, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/leads/counts  — tab badge counts
router.get('/counts', auth, async (req, res) => {
  const { data, error } = await supabase.rpc('lead_status_counts', { p_tenant_id: req.tenantId });
  if (error) {
    // Fallback: manual group-by
    const { data: rows } = await supabase
      .from('leads')
      .select('status')
      .eq('tenant_id', req.tenantId)
      .eq('is_spam', false);
    const counts = {};
    for (const r of rows || []) counts[r.status] = (counts[r.status] || 0) + 1;
    return res.json(counts);
  }
  res.json(data);
});

// GET /api/leads/followups  — due follow-ups
router.get('/followups', auth, async (req, res) => {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from('leads')
    .select('id, name, phone, status, follow_up_at, assigned_to')
    .eq('tenant_id', req.tenantId)
    .lte('follow_up_at', now)
    .not('follow_up_at', 'is', null)
    .order('follow_up_at', { ascending: true })
    .limit(100);
  res.json(data || []);
});

// GET /api/leads/:id/activities
router.get('/:id/activities', auth, async (req, res) => {
  const { data } = await supabase
    .from('lead_activities')
    .select('*')
    .eq('tenant_id', req.tenantId)
    .eq('lead_id', req.params.id)
    .order('created_at', { ascending: false });
  res.json(data || []);
});

// POST /api/leads
router.post('/', auth, requirePermission('leads', 'edit'), async (req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .insert({ ...req.body, tenant_id: req.tenantId })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// POST /api/leads/:id/activities
router.post('/:id/activities', auth, requirePermission('leads', 'edit'), async (req, res) => {
  const { data, error } = await supabase
    .from('lead_activities')
    .insert({
      ...req.body,
      tenant_id:       req.tenantId,
      lead_id:         req.params.id,
      performed_by:    req.user.id,
      performed_by_name: req.user.name,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /api/leads/:id
router.patch('/:id', auth, requirePermission('leads', 'edit'), async (req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /api/leads/:id/spam
router.patch('/:id/spam', auth, requirePermission('leads', 'edit'), async (req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .update({ is_spam: true, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /api/leads/:id/snooze-followup
router.patch('/:id/snooze-followup', auth, requirePermission('leads', 'edit'), async (req, res) => {
  const snoozeUntil = new Date(Date.now() + 15 * 60_000).toISOString();
  const { data, error } = await supabase
    .from('leads')
    .update({ follow_up_at: snoozeUntil, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/leads/:id
router.delete('/:id', auth, requireRole('master', 'admin'), async (req, res) => {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// PATCH /api/leads/bulk
router.patch('/bulk', auth, requirePermission('leads', 'edit'), async (req, res) => {
  const { ids, ...updates } = req.body;
  if (!Array.isArray(ids) || ids.length === 0)
    return res.status(400).json({ error: 'ids array required' });

  const { error } = await supabase
    .from('leads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .in('id', ids)
    .eq('tenant_id', req.tenantId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, updated: ids.length });
});

module.exports = router;

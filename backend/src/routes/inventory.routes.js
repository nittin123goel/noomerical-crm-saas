const express  = require('express');
const router   = express.Router();
const supabase = require('../services/supabase');
const auth     = require('../middleware/auth.middleware');
const { requirePermission, requireRole } = auth;

// ── Inventory (accommodation types) ──────────────────────────
router.get('/', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('accommodation_inventory')
    .select('*')
    .eq('tenant_id', req.tenantId)
    .order('accommodation_type');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/', auth, requirePermission('inventory', 'edit'), async (req, res) => {
  const { data, error } = await supabase
    .from('accommodation_inventory')
    .insert({ ...req.body, tenant_id: req.tenantId })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.patch('/:id', auth, requirePermission('inventory', 'edit'), async (req, res) => {
  const { data, error } = await supabase
    .from('accommodation_inventory')
    .update(req.body).eq('id', req.params.id).eq('tenant_id', req.tenantId)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', auth, requireRole('master', 'admin'), async (req, res) => {
  const { error } = await supabase.from('accommodation_inventory')
    .delete().eq('id', req.params.id).eq('tenant_id', req.tenantId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── Holds ────────────────────────────────────────────────────
router.get('/holds', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('holds').select('*').eq('tenant_id', req.tenantId)
    .order('from_date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/holds', auth, requirePermission('inventory', 'edit'), async (req, res) => {
  const { data, error } = await supabase
    .from('holds').insert({ ...req.body, tenant_id: req.tenantId }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.delete('/holds/:id', auth, requirePermission('inventory', 'edit'), async (req, res) => {
  const { error } = await supabase.from('holds')
    .delete().eq('id', req.params.id).eq('tenant_id', req.tenantId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── Availability for a date ──────────────────────────────────
// GET /api/inventory/availability?date=YYYY-MM-DD
router.get('/availability', auth, async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  const [{ data: inv }, { data: deals }, { data: holds }] = await Promise.all([
    supabase.from('accommodation_inventory').select('*').eq('tenant_id', req.tenantId),
    supabase.from('deals').select('accommodation_type, number_of_units, start_date, end_date, status')
      .eq('tenant_id', req.tenantId).in('status', ['confirmed', 'checked_in']),
    supabase.from('holds').select('accommodation_type, number_of_units, from_date, to_date')
      .eq('tenant_id', req.tenantId),
  ]);

  const result = (inv || []).map(row => {
    const booked = (deals || [])
      .filter(d => d.accommodation_type === row.accommodation_type && d.start_date && d.end_date
        && d.start_date <= date && date < d.end_date)
      .reduce((s, d) => s + (d.number_of_units || 1), 0);
    const held = (holds || [])
      .filter(h => h.accommodation_type === row.accommodation_type
        && h.from_date <= date && date <= h.to_date)
      .reduce((s, h) => s + (h.number_of_units || 1), 0);
    const available = Math.max(0, (row.total_units || 0) - booked - held);
    return { accommodation_type: row.accommodation_type, total: row.total_units || 0, booked, held, available };
  });

  res.json({ date, inventory: result });
});

module.exports = router;

const express  = require('express');
const router   = express.Router();
const supabase = require('../services/supabase');
const auth     = require('../middleware/auth.middleware');
const { requirePermission, requireRole } = auth;

function genDealNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `D-${ymd}-${rand}`;
}

// GET /api/deals — list with optional status filter + search
router.get('/', auth, async (req, res) => {
  const { status, search } = req.query;
  let q = supabase
    .from('deals')
    .select('*, customers(name, phone)')
    .eq('tenant_id', req.tenantId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (status) q = q.eq('status', status);
  if (search) q = q.or(`deal_number.ilike.%${search}%,notes.ilike.%${search}%`);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// POST /api/deals — create booking/deal
router.post('/', auth, requirePermission('deals', 'edit'), async (req, res) => {
  const body = { ...req.body };
  if (!body.deal_number) body.deal_number = genDealNumber();
  // Auto-compute balance if not supplied
  const total = Number(body.total_amount || 0);
  const adv   = Number(body.advance_amount || 0);
  if (body.balance_amount === undefined) body.balance_amount = Math.max(0, total - adv);

  const { data, error } = await supabase
    .from('deals')
    .insert({ ...body, tenant_id: req.tenantId })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /api/deals/:id
router.patch('/:id', auth, requirePermission('deals', 'edit'), async (req, res) => {
  const updates = { ...req.body, updated_at: new Date().toISOString() };
  if (updates.total_amount !== undefined || updates.advance_amount !== undefined) {
    // Recompute balance when financials change and balance not explicitly set
    if (updates.balance_amount === undefined) {
      const total = Number(updates.total_amount ?? 0);
      const adv   = Number(updates.advance_amount ?? 0);
      if (updates.total_amount !== undefined && updates.advance_amount !== undefined)
        updates.balance_amount = Math.max(0, total - adv);
    }
  }
  const { data, error } = await supabase
    .from('deals')
    .update(updates)
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /api/deals/:id/check-in — Front Desk
router.patch('/:id/check-in', auth, requirePermission('deals', 'edit'), async (req, res) => {
  const { data, error } = await supabase
    .from('deals')
    .update({ status: 'checked_in', updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/deals/:id
router.delete('/:id', auth, requireRole('master', 'admin'), async (req, res) => {
  const { error } = await supabase
    .from('deals')
    .delete()
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;

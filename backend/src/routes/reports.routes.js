const express  = require('express');
const router   = express.Router();
const supabase = require('../services/supabase');
const auth     = require('../middleware/auth.middleware');

// GET /api/reports/dashboard — headline metrics for the current tenant
router.get('/dashboard', auth, async (req, res) => {
  const tid = req.tenantId;
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
  const now = new Date();

  // ── Leads ────────────────────────────────────────────────
  const { data: leads } = await supabase
    .from('leads')
    .select('status, temperature, created_at, follow_up_at, is_spam')
    .eq('tenant_id', tid);

  const active = (leads || []).filter(l => !l.is_spam);
  const byStatus = {};
  let newToday = 0, hot = 0, followupsDue = 0;
  for (const l of active) {
    byStatus[l.status] = (byStatus[l.status] || 0) + 1;
    if (new Date(l.created_at) >= startOfToday) newToday++;
    if (l.temperature === 'hot') hot++;
    if (l.follow_up_at && new Date(l.follow_up_at) <= now) followupsDue++;
  }

  // ── Customers ────────────────────────────────────────────
  const { count: customers } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tid);

  // ── Deals ────────────────────────────────────────────────
  const { data: deals } = await supabase
    .from('deals')
    .select('status, total_amount, advance_amount, balance_amount, created_at')
    .eq('tenant_id', tid);

  let open = 0, revenueMonth = 0, outstanding = 0, advanceCollected = 0, thisMonth = 0;
  for (const d of deals || []) {
    if (!['cancelled', 'lost', 'completed'].includes(d.status)) open++;
    if (new Date(d.created_at) >= startOfMonth) { revenueMonth += Number(d.total_amount || 0); thisMonth++; }
    outstanding       += Number(d.balance_amount || 0);
    advanceCollected  += Number(d.advance_amount || 0);
  }

  res.json({
    leads:       { total: active.length, newToday, hot, byStatus },
    followupsDue,
    customers:   customers || 0,
    deals:       { open, revenueMonth, outstanding, advanceCollected, thisMonth },
  });
});

module.exports = router;

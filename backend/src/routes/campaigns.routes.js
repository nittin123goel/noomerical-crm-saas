const express  = require('express');
const router   = express.Router();
const supabase = require('../services/supabase');
const auth     = require('../middleware/auth.middleware');
const { requirePermission, requireRole } = auth;

// GET /api/campaigns — list past + draft campaigns
router.get('/', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('tenant_id', req.tenantId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// POST /api/campaigns — create a campaign (draft).
// Actual sending requires the tenant's WhatsApp/Email provider creds; until those
// are configured a campaign is saved as 'draft'. Sending is wired in a later phase.
router.post('/', auth, requirePermission('campaigns', 'edit'), async (req, res) => {
  const { name, channel, template_name, filters } = req.body;
  if (!name) return res.status(400).json({ error: 'Campaign name required' });

  // Count the audience matching the filters (status/source/temperature).
  let q = supabase.from('leads').select('id', { count: 'exact', head: true })
    .eq('tenant_id', req.tenantId).eq('is_spam', false);
  if (filters?.status)      q = q.eq('status', filters.status);
  if (filters?.source)      q = q.eq('source', filters.source);
  if (filters?.temperature) q = q.eq('temperature', filters.temperature);
  const { count } = await q;

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      tenant_id: req.tenantId,
      name, channel: channel || 'whatsapp', template_name,
      filters: filters || {}, total_leads: count || 0,
      status: 'draft', created_by: req.user.id,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// DELETE /api/campaigns/:id
router.delete('/:id', auth, requireRole('master', 'admin'), async (req, res) => {
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

module.exports = router;

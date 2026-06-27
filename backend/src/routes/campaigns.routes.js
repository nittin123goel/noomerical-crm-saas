const express  = require('express');
const router   = express.Router();
const supabase = require('../services/supabase');
const auth     = require('../middleware/auth.middleware');
const { requirePermission, requireRole } = auth;
const { getIntegration } = require('../services/integrations.service');
const { sendTemplate } = require('../services/wati.service');

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

// POST /api/campaigns/:id/send — send a WhatsApp campaign via the tenant's Wati config
router.post('/:id/send', auth, requirePermission('campaigns', 'edit'), async (req, res) => {
  const { data: campaign } = await supabase
    .from('campaigns').select('*').eq('id', req.params.id).eq('tenant_id', req.tenantId).maybeSingle();
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  if (campaign.channel !== 'whatsapp') return res.status(400).json({ error: 'Only WhatsApp sending is supported right now' });
  if (!campaign.template_name) return res.status(400).json({ error: 'Set a WhatsApp template name on the campaign first' });

  const cfg = await getIntegration(req.tenantId, 'whatsapp');
  if (!cfg) return res.status(400).json({ error: 'Connect WhatsApp under Integrations first' });

  const f = campaign.filters || {};
  let q = supabase.from('leads')
    .select('id, name, phone').eq('tenant_id', req.tenantId)
    .eq('is_spam', false).not('phone', 'is', null);
  if (f.status)      q = q.eq('status', f.status);
  if (f.source)      q = q.eq('source', f.source);
  if (f.temperature) q = q.eq('temperature', f.temperature);
  const { data: leads } = await q;

  let sent = 0, failed = 0;
  for (const lead of leads || []) {
    const r = await sendTemplate(cfg, campaign.template_name, lead.phone, [lead.name || '']);
    if (r.ok) {
      sent++;
      await supabase.from('lead_activities').insert({
        tenant_id: req.tenantId, lead_id: lead.id, activity_type: 'whatsapp_sent',
        description: `Campaign: ${campaign.name}`, channel: 'whatsapp', direction: 'outbound',
        performed_by: req.user.id, performed_by_name: req.user.name,
      });
    } else { failed++; }
  }

  const { data: updated } = await supabase
    .from('campaigns')
    .update({ status: 'sent', sent, failed, total_leads: (leads || []).length })
    .eq('id', campaign.id).eq('tenant_id', req.tenantId).select().single();
  res.json(updated);
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

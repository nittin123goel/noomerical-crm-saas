const express  = require('express');
const router   = express.Router();
const supabase = require('../services/supabase');
const auth     = require('../middleware/auth.middleware');
const { requireRole } = auth;
const { sendTemplate } = require('../services/wati.service');

const PROVIDERS = ['whatsapp', 'email', 'meta'];

// GET /api/integrations — all configured integrations for the tenant
router.get('/', auth, requireRole('master', 'admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('integrations').select('*').eq('tenant_id', req.tenantId);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// PUT /api/integrations/:provider — upsert config + active flag
router.put('/:provider', auth, requireRole('master', 'admin'), async (req, res) => {
  const provider = req.params.provider;
  if (!PROVIDERS.includes(provider)) return res.status(400).json({ error: 'Unknown provider' });
  const { config, is_active } = req.body;
  const { data, error } = await supabase
    .from('integrations')
    .upsert({
      tenant_id: req.tenantId, provider,
      config: config || {}, is_active: !!is_active,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,provider' })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/integrations/:provider
router.delete('/:provider', auth, requireRole('master', 'admin'), async (req, res) => {
  const { error } = await supabase
    .from('integrations').delete()
    .eq('tenant_id', req.tenantId).eq('provider', req.params.provider);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// POST /api/integrations/whatsapp/test — send a test template
router.post('/whatsapp/test', auth, requireRole('master', 'admin'), async (req, res) => {
  const { data } = await supabase
    .from('integrations').select('config, is_active')
    .eq('tenant_id', req.tenantId).eq('provider', 'whatsapp').maybeSingle();
  if (!data) return res.status(400).json({ error: 'WhatsApp not configured yet' });
  if (!req.body.phone) return res.status(400).json({ error: 'phone required' });
  const result = await sendTemplate(data.config, req.body.template_name || 'hello_world', req.body.phone, []);
  if (!result.ok) return res.status(400).json({ error: String(result.error) });
  res.json({ ok: true });
});

module.exports = router;

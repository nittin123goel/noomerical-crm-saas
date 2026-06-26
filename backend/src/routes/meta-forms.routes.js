/**
 * Manage Meta lead form mappings per tenant.
 * This is how a tenant connects their Facebook Lead Ad form to the CRM.
 */

const express  = require('express');
const router   = express.Router();
const supabase = require('../services/supabase');
const auth     = require('../middleware/auth.middleware');
const { requireRole } = auth;

// GET /api/meta-forms  — list all configured forms
router.get('/', auth, async (req, res) => {
  const { data } = await supabase
    .from('meta_lead_forms')
    .select('*')
    .eq('tenant_id', req.tenantId)
    .order('created_at', { ascending: false });
  res.json(data || []);
});

// POST /api/meta-forms  — add a new form mapping
router.post('/', auth, requireRole('master', 'admin'), async (req, res) => {
  const { form_id, form_name, page_id, field_mapping, default_source, default_status } = req.body;
  if (!form_id) return res.status(400).json({ error: 'form_id required' });

  const { data, error } = await supabase
    .from('meta_lead_forms')
    .insert({
      tenant_id:      req.tenantId,
      form_id,
      form_name:      form_name || '',
      page_id:        page_id   || '',
      field_mapping:  field_mapping  || {},
      default_source: default_source || 'meta_lead',
      default_status: default_status || 'new',
      is_active:      true,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /api/meta-forms/:id  — update mapping or toggle active
router.patch('/:id', auth, requireRole('master', 'admin'), async (req, res) => {
  const { data, error } = await supabase
    .from('meta_lead_forms')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// DELETE /api/meta-forms/:id
router.delete('/:id', auth, requireRole('master', 'admin'), async (req, res) => {
  await supabase.from('meta_lead_forms').delete().eq('id', req.params.id).eq('tenant_id', req.tenantId);
  res.json({ ok: true });
});

module.exports = router;

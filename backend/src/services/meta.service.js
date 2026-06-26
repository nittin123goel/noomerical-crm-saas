/**
 * Meta (Facebook / Instagram) Lead Ads integration.
 *
 * Flow:
 *   1. User sets up a Facebook Lead Ad form.
 *   2. Meta sends a real-time lead to our webhook POST /api/webhook/meta.
 *   3. We fetch the full lead data from the Graph API using the tenant's page_access_token.
 *   4. We map the Meta fields to CRM lead fields using the meta_lead_forms config.
 *   5. We upsert the lead into the `leads` table with source='meta_lead'.
 *
 * Setup in Meta Business Suite:
 *   - Create a Meta App at developers.facebook.com
 *   - Subscribe to the "leadgen" webhook event on the App → Webhooks panel
 *   - Point the webhook URL to: https://{tenant}.yourcrm.com/api/webhook/meta
 *   - Use META_WEBHOOK_VERIFY_TOKEN in .env as the verify token
 *   - Subscribe the Page to the leadgen product
 */

const axios    = require('axios');
const supabase = require('./supabase');

const GRAPH_API = 'https://graph.facebook.com/v20.0';

// ── Fetch lead data from Meta Graph API ───────────────────────────────────────
async function fetchLeadFromMeta(leadId, pageAccessToken) {
  const url    = `${GRAPH_API}/${leadId}?fields=field_data,created_time,ad_id,adset_id,campaign_id,form_id,page_id&access_token=${pageAccessToken}`;
  const { data } = await axios.get(url);
  return data;
}

// ── Resolve tenant + form config from a Meta form_id ─────────────────────────
async function resolveFormConfig(tenantId, formId) {
  const { data } = await supabase
    .from('meta_lead_forms')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('form_id', formId)
    .eq('is_active', true)
    .maybeSingle();
  return data;
}

// ── Map Meta field_data array to CRM lead fields ──────────────────────────────
// field_data example: [{ name: "full_name", values: ["John Doe"] }, { name: "phone_number", values: ["+91..."] }]
function mapMetaFields(fieldData, fieldMapping) {
  const flat = {};
  for (const f of fieldData) {
    flat[f.name] = f.values?.[0] || null;
  }

  const lead = {};
  for (const [metaKey, crmKey] of Object.entries(fieldMapping)) {
    if (flat[metaKey] !== undefined) {
      lead[crmKey] = flat[metaKey];
    }
  }

  // Common automatic mappings if not explicitly configured
  if (!lead.name  && flat.full_name)     lead.name  = flat.full_name;
  if (!lead.name  && flat.first_name)    lead.name  = [flat.first_name, flat.last_name].filter(Boolean).join(' ');
  if (!lead.phone && flat.phone_number)  lead.phone = flat.phone_number;
  if (!lead.email && flat.email)         lead.email = flat.email;

  return lead;
}

// ── Upsert lead into DB ───────────────────────────────────────────────────────
async function upsertMetaLead({ tenantId, leadFields, metaLead, formConfig }) {
  const now = new Date().toISOString();

  const record = {
    tenant_id:          tenantId,
    source:             formConfig?.default_source || 'meta_lead',
    status:             formConfig?.default_status || 'new',
    meta_lead_id:       metaLead.id,
    meta_form_id:       metaLead.form_id,
    meta_ad_id:         metaLead.ad_id    || null,
    meta_adset_id:      metaLead.adset_id || null,
    meta_campaign_id:   metaLead.campaign_id   || null,
    meta_page_id:       metaLead.page_id  || null,
    created_at:         now,
    updated_at:         now,
    ...leadFields,
  };

  // Deduplicate by meta_lead_id within tenant
  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('meta_lead_id', metaLead.id)
    .maybeSingle();

  if (existing) {
    console.log(`[Meta] Lead ${metaLead.id} already exists for tenant ${tenantId}`);
    return existing.id;
  }

  const { data, error } = await supabase
    .from('leads')
    .insert(record)
    .select('id')
    .single();

  if (error) throw error;

  // Log activity
  await supabase.from('lead_activities').insert({
    tenant_id:   tenantId,
    lead_id:     data.id,
    activity_type: 'lead_created',
    description: `Lead captured from Meta (Facebook/Instagram) — Form: ${formConfig?.form_name || metaLead.form_id}`,
    channel:     'meta',
    direction:   'inbound',
    created_at:  now,
  });

  return data.id;
}

// ── Main handler — called from webhook.routes.js ──────────────────────────────
async function processMetaLead({ tenantId, pageAccessToken, entry }) {
  try {
    const formId    = entry.form_id;
    const metaLeadId = entry.leadgen_id;

    if (!metaLeadId) return;

    const [metaLead, formConfig] = await Promise.all([
      fetchLeadFromMeta(metaLeadId, pageAccessToken),
      resolveFormConfig(tenantId, formId),
    ]);

    const fieldMapping = formConfig?.field_mapping || {};
    const leadFields   = mapMetaFields(metaLead.field_data || [], fieldMapping);

    const leadId = await upsertMetaLead({ tenantId, leadFields, metaLead, formConfig });
    console.log(`[Meta] Lead created/found: ${leadId} for tenant ${tenantId}`);
    return leadId;
  } catch (err) {
    console.error('[Meta] processMetaLead error:', err.message);
  }
}

module.exports = { processMetaLead, fetchLeadFromMeta };

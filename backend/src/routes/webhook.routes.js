/**
 * Incoming webhooks from external systems.
 *
 * All webhook routes are PUBLIC (no auth) — payload verification is done per-provider.
 * Meta uses a hub challenge for GET verification and X-Hub-Signature-256 for POST.
 */

const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();

const supabase             = require('../services/supabase');
const { processMetaLead }  = require('../services/meta.service');

// ── Helper ─────────────────────────────────────────────────────────────────────

function verifyMetaSignature(rawBody, signature) {
  if (!process.env.META_APP_SECRET) return true; // skip in dev
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.META_APP_SECRET)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ── Meta (Facebook / Instagram) Lead Ads ───────────────────────────────────────
//
// GET  — Meta sends this to verify the webhook endpoint (one-time handshake)
// POST — Meta sends this for every new lead submitted via a Lead Ad form

router.get('/meta', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('[Meta] Webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

router.post('/meta', express.raw({ type: 'application/json' }), async (req, res) => {
  // Verify signature
  const sig = req.headers['x-hub-signature-256'];
  if (!verifyMetaSignature(req.body, sig || '')) {
    console.warn('[Meta] Invalid signature');
    return res.sendStatus(403);
  }

  let payload;
  try {
    payload = JSON.parse(req.body.toString());
  } catch {
    return res.sendStatus(400);
  }

  // Respond immediately — Meta expects 200 within 20s
  res.sendStatus(200);

  // Process in background
  if (payload.object !== 'page') return;

  for (const pageEntry of payload.entry || []) {
    const pageId  = pageEntry.id;

    // Find which tenant owns this page
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('tenant_id, meta_page_access_token')
      .filter('meta_page_access_token', 'not.is', null)
      .limit(100); // bounded — iterate to find the right tenant

    // In production: index page_id in tenant_settings for O(1) lookup
    // For now: resolve via meta_lead_forms
    const { data: formRow } = await supabase
      .from('meta_lead_forms')
      .select('tenant_id')
      .eq('page_id', pageId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const tenantId = formRow?.tenant_id;
    if (!tenantId) {
      console.warn(`[Meta] No tenant found for page ${pageId}`);
      continue;
    }

    const tenantSettings = settings?.find(s => s.tenant_id === tenantId);
    const pageAccessToken = tenantSettings?.meta_page_access_token;
    if (!pageAccessToken) {
      console.warn(`[Meta] No page_access_token for tenant ${tenantId}`);
      continue;
    }

    for (const change of pageEntry.changes || []) {
      if (change.field !== 'leadgen') continue;
      await processMetaLead({
        tenantId,
        pageAccessToken,
        entry: change.value,
      });
    }
  }
});

// ── Knowlarity IVR ────────────────────────────────────────────────────────────
// Receives missed/answered call events; upserts lead by caller phone.

router.post('/knowlarity', async (req, res) => {
  res.sendStatus(200);
  const body = req.body;

  // Extract caller phone — Knowlarity sends it in different fields by event type
  const phone = body.caller_id || body.customer_number || body.caller_number;
  if (!phone || !req.tenantId) return;

  const callStatus   = body.call_status || body.status;
  const callDuration = parseInt(body.call_duration || body.duration || 0);

  // Upsert lead
  const { data: existingLead } = await supabase
    .from('leads')
    .select('id')
    .eq('tenant_id', req.tenantId)
    .eq('phone', phone)
    .maybeSingle();

  if (!existingLead) {
    await supabase.from('leads').insert({
      tenant_id: req.tenantId,
      phone,
      source: 'ivr_call',
      status: 'new',
    });
  }

  await supabase.from('communication_log').insert({
    tenant_id:  req.tenantId,
    phone,
    channel:    'call',
    direction:  'inbound',
    message:    `Call ${callStatus} — duration ${callDuration}s`,
  });
});

// ── WhatsApp Inbound (Aisensy) ────────────────────────────────────────────────

router.post('/aisensy', async (req, res) => {
  res.sendStatus(200);
  const { waId, phone_number, userName, message } = req.body || {};
  const phone = waId || phone_number;
  if (!phone || !req.tenantId) return;

  // Upsert lead
  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .eq('tenant_id', req.tenantId)
    .eq('phone', phone)
    .maybeSingle();

  if (!existing) {
    await supabase.from('leads').insert({
      tenant_id: req.tenantId,
      name:   userName || null,
      phone,
      source: 'whatsapp_inbound',
      status: 'new',
    });
  }

  await supabase.from('communication_log').insert({
    tenant_id: req.tenantId,
    phone,
    channel:   'whatsapp',
    direction: 'inbound',
    message:   message?.text || '',
  });
});

// ── Website Form (Elementor / generic POST) ───────────────────────────────────

router.post('/form', async (req, res) => {
  res.sendStatus(200);
  const { name, email, phone, source, ...extra } = req.body || {};
  if (!phone || !req.tenantId) return;

  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .eq('tenant_id', req.tenantId)
    .eq('phone', phone)
    .maybeSingle();

  if (!existing) {
    await supabase.from('leads').insert({
      tenant_id:    req.tenantId,
      name:         name   || null,
      email:        email  || null,
      phone,
      source:       source || 'website_form',
      status:       'new',
      utm_source:   extra.utm_source   || null,
      utm_medium:   extra.utm_medium   || null,
      utm_campaign: extra.utm_campaign || null,
      gclid:        extra.gclid        || null,
    });
  }
});

// ── Health ────────────────────────────────────────────────────────────────────

router.get('/health', (req, res) => res.json({ ok: true }));

module.exports = router;

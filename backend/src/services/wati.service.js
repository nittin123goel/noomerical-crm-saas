const axios = require('axios');

function normalizePhone(phone) {
  let p = String(phone || '').replace(/[\s\-().+]/g, '');
  if (p.startsWith('0')) p = '91' + p.slice(1);
  if (p.length === 10)   p = '91' + p;
  return p;
}

/**
 * Send a WhatsApp template message via Wati using a tenant's own config.
 * @param {object} cfg  - { api_url, token, channel_phone }
 * @param {string} templateName
 * @param {string} destination - raw phone
 * @param {string[]} params
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
async function sendTemplate(cfg, templateName, destination, params = []) {
  if (!cfg?.api_url || !cfg?.token) return { ok: false, error: 'WhatsApp not configured' };
  const phone = normalizePhone(destination);
  if (!phone) return { ok: false, error: 'Invalid phone' };

  const body = {
    template_name:      templateName,
    broadcast_name:     templateName,
    parameters:         params.map((value, i) => ({ name: String(i + 1), value: String(value ?? '') })),
    receivers:          [{ whatsappNumber: phone, customParams: [] }],
    channelPhoneNumber: cfg.channel_phone || undefined,
  };

  try {
    await axios.post(`${cfg.api_url.replace(/\/$/, '')}/api/v1/sendTemplateMessage`, body, {
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      timeout: 12000,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.response?.data?.message || err.response?.status || err.message };
  }
}

module.exports = { sendTemplate, normalizePhone };

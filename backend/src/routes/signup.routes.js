/**
 * Public self-serve signup — a business registers itself and gets a tenant
 * + master login created automatically. No auth required.
 */

const express = require('express');
const router  = express.Router();
const { createTenant, validateSubdomain, isSubdomainAvailable } = require('../services/provision');

const BASE_DOMAIN = process.env.APP_BASE_DOMAIN || 'noomerical.website';

// GET /api/signup/check-subdomain?subdomain=acme
router.get('/check-subdomain', async (req, res) => {
  const sub = (req.query.subdomain || '').toString().toLowerCase().trim();
  const vErr = validateSubdomain(sub);
  if (vErr) return res.json({ available: false, reason: vErr });
  const available = await isSubdomainAvailable(sub);
  res.json({ available, reason: available ? null : 'Already taken' });
});

// POST /api/signup  — create a new business account
router.post('/', async (req, res) => {
  const result = await createTenant(req.body);
  if (result.error) return res.status(result.status || 400).json({ error: result.error });
  res.status(201).json({
    tenant:   result.tenant,
    loginUrl: `https://${result.tenant.subdomain}.${BASE_DOMAIN}/login`,
  });
});

module.exports = router;

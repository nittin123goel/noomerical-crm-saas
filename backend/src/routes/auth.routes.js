const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const router   = express.Router();
const supabase = require('../services/supabase');
const auth     = require('../middleware/auth.middleware');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (!req.tenantId)        return res.status(400).json({ error: 'No organisation context' });

  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, phone, role, password_hash, is_active')
    .eq('tenant_id', req.tenantId)
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (!user || !user.is_active)
    return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  await supabase.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, tenantId: req.tenantId, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  res.json({ user: req.user, tenant: req.tenant });
});

module.exports = router;

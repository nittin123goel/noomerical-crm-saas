require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const { tenantMiddleware } = require('./middleware/tenant.middleware');

// Routes
const authRoutes       = require('./routes/auth.routes');
const leadsRoutes      = require('./routes/leads.routes');
const adminRoutes      = require('./routes/admin.routes');
const superadminRoutes = require('./routes/superadmin.routes');
const webhookRoutes    = require('./routes/webhook.routes');
const metaFormsRoutes  = require('./routes/meta-forms.routes');
const signupRoutes     = require('./routes/signup.routes');
const customersRoutes  = require('./routes/customers.routes');
const reportsRoutes    = require('./routes/reports.routes');
const dealsRoutes      = require('./routes/deals.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const campaignsRoutes  = require('./routes/campaigns.routes');
const inventoryRoutes  = require('./routes/inventory.routes');
const b2bRoutes        = require('./routes/b2b.routes');
const integrationsRoutes = require('./routes/integrations.routes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow requests from any subdomain of the main domain + local dev
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // server-to-server
    const allowed = process.env.FRONTEND_URL || 'http://localhost:5173';
    // Allow the configured frontend, *.yourcrm.com subdomains, and Render-hosted
    // frontends (*.onrender.com) so the app works before a custom domain is set up.
    if (origin === allowed
        || origin.endsWith('.noomerical.com')
        || origin.endsWith('.noomerical.website')
        || origin.endsWith('.onrender.com'))
      return cb(null, true);
    if (process.env.NODE_ENV !== 'production') return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
// Note: Meta webhook route uses express.raw() — must be mounted BEFORE json()
app.use('/api/webhook/meta', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Tenant resolution (attaches req.tenant + req.tenantId) ───────────────────
app.use(tenantMiddleware);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/signup',      signupRoutes);
app.use('/api/auth',        authRoutes);
app.use('/api/leads',       leadsRoutes);
app.use('/api/customers',   customersRoutes);
app.use('/api/reports',     reportsRoutes);
app.use('/api/deals',       dealsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/campaigns',   campaignsRoutes);
app.use('/api/inventory',   inventoryRoutes);
app.use('/api/b2b-agents',  b2bRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/superadmin',  superadminRoutes);
app.use('/api/webhook',     webhookRoutes);
app.use('/api/meta-forms',  metaFormsRoutes);

// Health check
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// 404
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[Noomerical CRM] Backend running on port ${PORT}`);
});

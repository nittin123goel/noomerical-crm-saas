import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import saApi from '../services/superadmin';

const BLANK = {
  name: '', subdomain: '', industry: 'general',
  admin_name: '', admin_email: '', admin_password: '',
  billing_email: '',
};

const STATUS_COLORS = {
  trial:     '#2563eb',
  active:    '#16a34a',
  suspended: '#d97706',
  cancelled: '#dc2626',
};

export default function SuperadminDashboard() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form,    setForm]    = useState(BLANK);
  const [saving,  setSaving]  = useState(false);
  const [formError, setFormError] = useState('');
  const [created, setCreated] = useState(null); // shows credentials after creation

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await saApi.get('/tenants');
      setTenants(data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load businesses');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  // Auto-slug the subdomain from the business name
  function onNameChange(value) {
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    setForm(f => ({ ...f, name: value, subdomain: slug }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const { data } = await saApi.post('/tenants', form);
      setCreated({ ...form, tenant: data.tenant });
      setForm(BLANK);
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create business');
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(t, status) {
    if (status === 'suspended' && !confirm(`Suspend "${t.name}"? Their users will be locked out.`)) return;
    try {
      await saApi.patch(`/tenants/${t.id}`, { status });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Update failed');
    }
  }

  async function remove(t) {
    if (!confirm(`Permanently DELETE "${t.name}" and ALL its data? This cannot be undone.`)) return;
    try {
      await saApi.delete(`/tenants/${t.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  }

  function logout() {
    localStorage.removeItem('sa_token');
    navigate('/superadmin/login');
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: 'var(--clr-primary)' }}>PLATFORM ADMIN</div>
          <h1 style={{ fontSize: 24, margin: '4px 0 0' }}>Businesses</h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => { setShowForm(s => !s); setCreated(null); }}>
            {showForm ? 'Cancel' : '+ New business'}
          </button>
          <button className="btn" onClick={logout}>Logout</button>
        </div>
      </div>

      {created && (
        <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid #16a34a' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>✅ Business created — share these login details</h3>
          <p style={{ fontSize: 13, color: 'var(--clr-muted)', margin: '0 0 8px' }}>
            The admin can sign in at the main app login page with:
          </p>
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <div><strong>Business:</strong> {created.tenant.name} ({created.tenant.subdomain})</div>
            <div><strong>Email:</strong> {created.admin_email}</div>
            <div><strong>Password:</strong> {created.admin_password}</div>
          </div>
        </div>
      )}

      {showForm && (
        <form className="card" onSubmit={handleCreate} style={{ marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <h3 style={{ gridColumn: '1 / -1', margin: 0, fontSize: 16 }}>New business</h3>

          <Field label="Business name *">
            <input className="input" value={form.name} onChange={e => onNameChange(e.target.value)} required />
          </Field>
          <Field label="Subdomain / slug *">
            <input className="input" value={form.subdomain} onChange={e => update('subdomain', e.target.value)} required />
          </Field>

          <Field label="Industry">
            <select className="input" value={form.industry} onChange={e => update('industry', e.target.value)}>
              <option value="general">General</option>
              <option value="hospitality">Hospitality</option>
              <option value="real_estate">Real Estate</option>
              <option value="education">Education</option>
              <option value="healthcare">Healthcare</option>
            </select>
          </Field>
          <Field label="Billing email">
            <input className="input" type="email" value={form.billing_email} onChange={e => update('billing_email', e.target.value)} />
          </Field>

          <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--clr-border)', paddingTop: 12, fontSize: 13, fontWeight: 600 }}>
            Admin (master) login for this business
          </div>

          <Field label="Admin name">
            <input className="input" value={form.admin_name} onChange={e => update('admin_name', e.target.value)} />
          </Field>
          <Field label="Admin email *">
            <input className="input" type="email" value={form.admin_email} onChange={e => update('admin_email', e.target.value)} required />
          </Field>
          <Field label="Admin password *">
            <input className="input" value={form.admin_password} onChange={e => update('admin_password', e.target.value)} required minLength={6} />
          </Field>

          {formError && <p style={{ gridColumn: '1 / -1', color: 'var(--clr-danger)', fontSize: 13, margin: 0 }}>{formError}</p>}

          <div style={{ gridColumn: '1 / -1' }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create business'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : error ? (
        <p style={{ color: 'var(--clr-danger)' }}>{error}</p>
      ) : tenants.length === 0 ? (
        <div className="card"><p style={{ margin: 0, color: 'var(--clr-muted)' }}>No businesses yet. Create your first one above.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Business</th><th>Subdomain</th><th>Industry</th>
                <th>Status</th><th>Plan</th><th>Created</th><th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td>{t.subdomain}</td>
                  <td>{t.industry}</td>
                  <td>
                    <span className="badge" style={{ background: (STATUS_COLORS[t.status] || '#64748b') + '22', color: STATUS_COLORS[t.status] || '#64748b' }}>
                      {t.status}
                    </span>
                  </td>
                  <td>{t.plan}</td>
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {t.status === 'suspended'
                      ? <button className="btn" style={{ padding: '4px 10px' }} onClick={() => setStatus(t, 'active')}>Activate</button>
                      : <button className="btn" style={{ padding: '4px 10px' }} onClick={() => setStatus(t, 'suspended')}>Suspend</button>}
                    {' '}
                    <button className="btn" style={{ padding: '4px 10px', color: 'var(--clr-danger)' }} onClick={() => remove(t)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{label}</label>
      {children}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { baseDomain } from '../services/tenant';

const BLANK = {
  name: '', subdomain: '', industry: 'general',
  admin_name: '', admin_email: '', admin_password: '',
};

export default function Signup() {
  const [form,    setForm]    = useState(BLANK);
  const [touchedSub, setTouchedSub] = useState(false);
  const [avail,   setAvail]   = useState(null);   // { available, reason } | null
  const [checking, setChecking] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [done,    setDone]    = useState(null);   // { loginUrl, ... }
  const debounce = useRef(null);

  function slugify(v) {
    return v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function onNameChange(value) {
    setForm(f => ({ ...f, name: value, subdomain: touchedSub ? f.subdomain : slugify(value) }));
  }
  function onSubChange(value) {
    setTouchedSub(true);
    setForm(f => ({ ...f, subdomain: slugify(value) }));
  }
  function update(field, value) { setForm(f => ({ ...f, [field]: value })); }

  // Live subdomain availability check (debounced)
  useEffect(() => {
    const sub = form.subdomain;
    setAvail(null);
    if (!sub || sub.length < 3) return;
    setChecking(true);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/signup/check-subdomain', { params: { subdomain: sub } });
        setAvail(data);
      } catch { /* ignore */ } finally { setChecking(false); }
    }, 400);
    return () => clearTimeout(debounce.current);
  }, [form.subdomain]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (avail && !avail.available) { setError('Please choose an available subdomain'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/signup', form);
      setDone(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <Centered>
        <div className="card" style={{ width: 440 }}>
          <h2 style={{ marginBottom: 6, fontSize: 20 }}>🎉 Account created!</h2>
          <p style={{ color: 'var(--clr-muted)', fontSize: 13, marginBottom: 16 }}>
            Your CRM is ready. Sign in at your business URL:
          </p>
          <a className="btn btn-primary" href={done.loginUrl} style={{ display: 'block', textAlign: 'center', marginBottom: 12 }}>
            Go to {done.tenant.subdomain}.{baseDomain()}
          </a>
          <p style={{ fontSize: 12, color: 'var(--clr-muted)' }}>
            Login: <strong>{form.admin_email}</strong> with the password you chose.
          </p>
        </div>
      </Centered>
    );
  }

  return (
    <Centered>
      <div className="card" style={{ width: 440 }}>
        <h2 style={{ marginBottom: 6, fontSize: 20 }}>Create your CRM</h2>
        <p style={{ color: 'var(--clr-muted)', marginBottom: 20, fontSize: 13 }}>
          Set up your business account in seconds.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Business name">
            <input className="input" value={form.name} onChange={e => onNameChange(e.target.value)} required />
          </Field>

          <Field label="Your CRM address">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input className="input" value={form.subdomain} onChange={e => onSubChange(e.target.value)} required
                     style={{ flex: '0 1 160px' }} placeholder="yourbiz" />
              <span style={{ color: 'var(--clr-muted)', fontSize: 13 }}>.{baseDomain()}</span>
            </div>
            <div style={{ fontSize: 12, marginTop: 4, minHeight: 16 }}>
              {checking && <span style={{ color: 'var(--clr-muted)' }}>Checking…</span>}
              {!checking && avail && avail.available && <span style={{ color: '#16a34a' }}>✓ Available</span>}
              {!checking && avail && !avail.available && <span style={{ color: 'var(--clr-danger)' }}>✗ {avail.reason}</span>}
            </div>
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

          <Field label="Your name">
            <input className="input" value={form.admin_name} onChange={e => update('admin_name', e.target.value)} />
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={form.admin_email} onChange={e => update('admin_email', e.target.value)} required />
          </Field>
          <Field label="Password">
            <input className="input" type="password" value={form.admin_password} onChange={e => update('admin_password', e.target.value)} required minLength={6} />
          </Field>

          {error && <p style={{ color: 'var(--clr-danger)', fontSize: 13, margin: 0 }}>{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={saving} style={{ marginTop: 4 }}>
            {saving ? 'Creating…' : 'Create account'}
          </button>
        </form>
      </div>
    </Centered>
  );
}

function Centered({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--clr-bg)', padding: 20 }}>
      {children}
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

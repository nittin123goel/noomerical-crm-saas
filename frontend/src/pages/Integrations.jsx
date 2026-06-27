import React, { useEffect, useState } from 'react';
import { Plug, MessageCircle, Mail, Facebook, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function Integrations() {
  const [map, setMap]     = useState({});   // provider -> { config, is_active }
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/integrations');
      const m = {};
      for (const row of data || []) m[row.provider] = row;
      setMap(m);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  if (loading) return <p style={{ color: 'var(--clr-muted)' }}>Loading…</p>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Plug size={20} /><h1 style={{ fontSize: 20, fontWeight: 700 }}>Integrations</h1>
      </div>
      <p style={{ color: 'var(--clr-muted)', marginBottom: 20, fontSize: 13 }}>
        Connect your own accounts. Credentials are stored for your business only.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        <WhatsAppCard row={map.whatsapp} onSaved={load} />
        <EmailCard row={map.email} onSaved={load} />
        <FacebookCard row={map.meta} />
      </div>
    </div>
  );
}

function Card({ icon: Icon, title, subtitle, active, children }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon size={22} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--clr-muted)' }}>{subtitle}</div>
        </div>
        {active && <span className="badge badge-green" style={{ gap: 4 }}><CheckCircle2 size={12} /> Connected</span>}
      </div>
      {children}
    </div>
  );
}

function Lbl({ label, children }) {
  return <div><label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 12.5 }}>{label}</label>{children}</div>;
}

function WhatsAppCard({ row, onSaved }) {
  const cfg = row?.config || {};
  const [form, setForm] = useState({ api_url: cfg.api_url || '', token: cfg.token || '', channel_phone: cfg.channel_phone || '' });
  const [active, setActive] = useState(row?.is_active || false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]   = useState('');
  const [testPhone, setTestPhone] = useState('');

  async function save() {
    setSaving(true); setMsg('');
    try { await api.put('/integrations/whatsapp', { config: form, is_active: active }); setMsg('Saved ✓'); onSaved(); }
    catch (e) { setMsg(e.response?.data?.error || 'Failed'); } finally { setSaving(false); }
  }
  async function test() {
    setMsg('Sending test…');
    try { await api.post('/integrations/whatsapp/test', { phone: testPhone, template_name: 'hello_world' }); setMsg('Test sent ✓'); }
    catch (e) { setMsg(e.response?.data?.error || 'Test failed'); }
  }

  return (
    <Card icon={MessageCircle} title="WhatsApp (Wati)" subtitle="Send template campaigns & alerts" active={row?.is_active}>
      <Lbl label="Wati API URL"><input className="input" placeholder="https://live-server-xxxx.wati.io" value={form.api_url} onChange={e => setForm(s => ({ ...s, api_url: e.target.value }))} /></Lbl>
      <Lbl label="Access token"><input className="input" type="password" placeholder="Bearer token" value={form.token} onChange={e => setForm(s => ({ ...s, token: e.target.value }))} /></Lbl>
      <Lbl label="Channel phone (optional)"><input className="input" placeholder="9173xxxxxxx" value={form.channel_phone} onChange={e => setForm(s => ({ ...s, channel_phone: e.target.value }))} /></Lbl>
      <label style={{ display: 'flex', gap: 8, fontSize: 13 }}><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Enabled</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderTop: '1px solid var(--clr-border)', paddingTop: 10 }}>
        <input className="input" placeholder="Test phone" value={testPhone} onChange={e => setTestPhone(e.target.value)} />
        <button className="btn btn-secondary" onClick={test} style={{ whiteSpace: 'nowrap' }}>Send test</button>
      </div>
      {msg && <p style={{ fontSize: 12.5, color: 'var(--clr-muted)', margin: 0 }}>{msg}</p>}
    </Card>
  );
}

function EmailCard({ row, onSaved }) {
  const cfg = row?.config || {};
  const [form, setForm] = useState({ host: cfg.host || '', port: cfg.port || '587', user: cfg.user || '', pass: cfg.pass || '', from: cfg.from || '' });
  const [active, setActive] = useState(row?.is_active || false);
  const [saving, setSaving] = useState(false); const [msg, setMsg] = useState('');

  async function save() {
    setSaving(true); setMsg('');
    try { await api.put('/integrations/email', { config: form, is_active: active }); setMsg('Saved ✓'); onSaved(); }
    catch (e) { setMsg(e.response?.data?.error || 'Failed'); } finally { setSaving(false); }
  }

  return (
    <Card icon={Mail} title="Email (SMTP)" subtitle="Send email campaigns" active={row?.is_active}>
      <Lbl label="SMTP host"><input className="input" placeholder="smtp.gmail.com" value={form.host} onChange={e => setForm(s => ({ ...s, host: e.target.value }))} /></Lbl>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Lbl label="Port"><input className="input" value={form.port} onChange={e => setForm(s => ({ ...s, port: e.target.value }))} /></Lbl>
        <Lbl label="From address"><input className="input" value={form.from} onChange={e => setForm(s => ({ ...s, from: e.target.value }))} /></Lbl>
      </div>
      <Lbl label="Username"><input className="input" value={form.user} onChange={e => setForm(s => ({ ...s, user: e.target.value }))} /></Lbl>
      <Lbl label="Password / app key"><input className="input" type="password" value={form.pass} onChange={e => setForm(s => ({ ...s, pass: e.target.value }))} /></Lbl>
      <label style={{ display: 'flex', gap: 8, fontSize: 13 }}><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Enabled</label>
      <button className="btn btn-primary" onClick={save} disabled={saving} style={{ alignSelf: 'flex-start' }}>{saving ? 'Saving…' : 'Save'}</button>
      {msg && <p style={{ fontSize: 12.5, color: 'var(--clr-muted)', margin: 0 }}>{msg}</p>}
    </Card>
  );
}

function FacebookCard({ row }) {
  return (
    <Card icon={Facebook} title="Facebook Lead Ads" subtitle="Auto-import leads from your forms" active={row?.is_active}>
      <p style={{ fontSize: 13, color: 'var(--clr-muted)', margin: 0 }}>
        One-click connect: log in with Facebook, pick your Page, choose the lead form, and map fields.
      </p>
      <button className="btn btn-primary" style={{ alignSelf: 'flex-start', background: '#1877f2' }} disabled>
        <Facebook size={15} /> Connect with Facebook (coming next)
      </button>
    </Card>
  );
}

import React, { useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2, Send } from 'lucide-react';
import api from '../services/api';

const STATUS_LABELS = { new: 'New', contacted: 'Contacted', interested: 'Interested', converted: 'Converted', lost: 'Lost' };

export default function Campaigns() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    setLoading(true);
    try { const { data } = await api.get('/campaigns'); setRows(data || []); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function remove(c) {
    if (!confirm(`Delete campaign "${c.name}"?`)) return;
    await api.delete(`/campaigns/${c.id}`); load();
  }

  async function send(c) {
    if (!confirm(`Send "${c.name}" to ${c.total_leads} leads now?`)) return;
    try { await api.post(`/campaigns/${c.id}/send`); load(); }
    catch (e) { alert(e.response?.data?.error || 'Send failed'); }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Megaphone size={20} /><h1 style={{ fontSize: 20, fontWeight: 700 }}>Campaigns</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}><Plus size={15} />New Campaign</button>
      </div>
      <p style={{ color: 'var(--clr-muted)', marginBottom: 16, fontSize: 13 }}>
        Build a WhatsApp/Email/SMS broadcast to a filtered audience. Sending activates once your messaging provider is connected.
      </p>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Channel</th><th>Audience</th><th>Status</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 32 }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 32 }}>No campaigns yet</td></tr>
              ) : rows.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td><span className="badge badge-blue">{c.channel}</span></td>
                  <td>{c.total_leads} leads</td>
                  <td><span className="badge badge-gray">{c.status}</span></td>
                  <td style={{ color: 'var(--clr-muted)' }}>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {c.channel === 'whatsapp' && c.status !== 'sent' && (
                      <button className="btn btn-primary" style={{ padding: '4px 10px' }} onClick={() => send(c)}><Send size={13} />Send</button>
                    )}{' '}
                    <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => remove(c)}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && <CampaignModal onClose={() => setShowNew(false)} onSaved={() => { setShowNew(false); load(); }} />}
    </div>
  );
}

function CampaignModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', channel: 'whatsapp', template_name: '', status: '', source: '', temperature: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  function update(f, v) { setForm(s => ({ ...s, [f]: v })); }

  async function submit(e) {
    e.preventDefault(); setError('');
    if (!form.name) { setError('Name required'); return; }
    setSaving(true);
    try {
      await api.post('/campaigns', {
        name: form.name, channel: form.channel, template_name: form.template_name,
        filters: { status: form.status || undefined, source: form.source || undefined, temperature: form.temperature || undefined },
      });
      onSaved();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); setSaving(false); }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ width: 440, maxWidth: '100%' }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>New Campaign</h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Campaign name"><input className="input" value={form.name} onChange={e => update('name', e.target.value)} autoFocus /></Field>
          <Field label="Channel">
            <select className="input" value={form.channel} onChange={e => update('channel', e.target.value)}>
              <option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="sms">SMS</option>
            </select>
          </Field>
          <Field label="Template name (optional)"><input className="input" value={form.template_name} onChange={e => update('template_name', e.target.value)} /></Field>
          <div style={{ borderTop: '1px solid var(--clr-border)', paddingTop: 10, fontSize: 13, fontWeight: 600 }}>Audience filters</div>
          <Field label="Status">
            <select className="input" value={form.status} onChange={e => update('status', e.target.value)}>
              <option value="">Any</option>{Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Temperature">
            <select className="input" value={form.temperature} onChange={e => update('temperature', e.target.value)}>
              <option value="">Any</option><option value="hot">Hot</option><option value="warm">Warm</option><option value="cold">Cold</option>
            </select>
          </Field>
          {error && <p style={{ color: 'var(--clr-danger)', fontSize: 13, margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create draft'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{label}</label>{children}</div>;
}

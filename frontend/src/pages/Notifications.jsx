import React, { useEffect, useState } from 'react';
import { BellRing, Plus, Trash2 } from 'lucide-react';
import api from '../services/api';

export default function Notifications() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    try { const { data } = await api.get('/notifications/recipients'); setRows(data || []); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function toggle(r, field) {
    await api.patch(`/notifications/recipients/${r.id}`, { [field]: !r[field] });
    load();
  }
  async function remove(r) {
    if (!confirm(`Remove ${r.name || 'this recipient'}?`)) return;
    await api.delete(`/notifications/recipients/${r.id}`); load();
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BellRing size={20} /><h1 style={{ fontSize: 20, fontWeight: 700 }}>Notifications</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({})}><Plus size={15} />Add Recipient</button>
      </div>
      <p style={{ color: 'var(--clr-muted)', marginBottom: 16, fontSize: 13 }}>
        Team members who receive alerts. Toggle which alerts each person gets.
      </p>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th>
              <th style={{ textAlign: 'center' }}>New Lead</th><th style={{ textAlign: 'center' }}>New Deal</th>
              <th style={{ textAlign: 'center' }}>Daily Report</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 32 }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 32 }}>No recipients yet</td></tr>
              ) : rows.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.name}</td>
                  <td>{r.phone || '—'}</td>
                  <td>{r.email || '—'}</td>
                  <td style={{ textAlign: 'center' }}><input type="checkbox" checked={!!r.receive_new_lead} onChange={() => toggle(r, 'receive_new_lead')} /></td>
                  <td style={{ textAlign: 'center' }}><input type="checkbox" checked={!!r.receive_new_deal} onChange={() => toggle(r, 'receive_new_deal')} /></td>
                  <td style={{ textAlign: 'center' }}><input type="checkbox" checked={!!r.receive_daily_report} onChange={() => toggle(r, 'receive_daily_report')} /></td>
                  <td style={{ textAlign: 'right' }}><button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => remove(r)}><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && <RecipientModal onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function RecipientModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', receive_new_lead: true, receive_new_deal: true, receive_daily_report: false });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  function update(f, v) { setForm(s => ({ ...s, [f]: v })); }

  async function submit(e) {
    e.preventDefault(); setError('');
    if (!form.name) { setError('Name required'); return; }
    setSaving(true);
    try { await api.post('/notifications/recipients', form); onSaved(); }
    catch (err) { setError(err.response?.data?.error || 'Failed'); setSaving(false); }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ width: 400, maxWidth: '100%' }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Add Recipient</h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Name"><input className="input" value={form.name} onChange={e => update('name', e.target.value)} autoFocus /></Field>
          <Field label="Phone"><input className="input" value={form.phone} onChange={e => update('phone', e.target.value)} /></Field>
          <Field label="Email"><input className="input" type="email" value={form.email} onChange={e => update('email', e.target.value)} /></Field>
          <label style={{ display: 'flex', gap: 8, fontSize: 13 }}><input type="checkbox" checked={form.receive_new_lead} onChange={e => update('receive_new_lead', e.target.checked)} /> New lead alerts</label>
          <label style={{ display: 'flex', gap: 8, fontSize: 13 }}><input type="checkbox" checked={form.receive_new_deal} onChange={e => update('receive_new_deal', e.target.checked)} /> New deal alerts</label>
          <label style={{ display: 'flex', gap: 8, fontSize: 13 }}><input type="checkbox" checked={form.receive_daily_report} onChange={e => update('receive_daily_report', e.target.checked)} /> Daily report</label>
          {error && <p style={{ color: 'var(--clr-danger)', fontSize: 13, margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{label}</label>{children}</div>;
}

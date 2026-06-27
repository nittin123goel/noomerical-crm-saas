import React, { useEffect, useState } from 'react';
import { Briefcase, Plus, Trash2 } from 'lucide-react';
import api from '../services/api';

export default function B2BAgents() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    try { const { data } = await api.get('/b2b-agents'); setRows(data || []); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function remove(a) {
    if (!confirm(`Delete agent "${a.name}"?`)) return;
    await api.delete(`/b2b-agents/${a.id}`); load();
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Briefcase size={20} /><h1 style={{ fontSize: 20, fontWeight: 700 }}>B2B Agents</h1>
          <span className="badge badge-gray">{rows.length}</span>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({})}><Plus size={15} />Add Agent</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Company</th><th>Phone</th><th>Email</th><th>Commission %</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 32 }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 32 }}>No agents yet</td></tr>
              ) : rows.map(a => (
                <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setEditing(a)}>
                  <td style={{ fontWeight: 500 }}>{a.name}</td>
                  <td>{a.company_name || '—'}</td>
                  <td>{a.phone || '—'}</td>
                  <td>{a.email || '—'}</td>
                  <td>{a.commission_percentage}%</td>
                  <td><span className={`badge ${a.is_active ? 'badge-green' : 'badge-gray'}`}>{a.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}><button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => remove(a)}><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && <AgentModal agent={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function AgentModal({ agent, onClose, onSaved }) {
  const isNew = !agent.id;
  const [form, setForm] = useState({
    name: agent.name || '', company_name: agent.company_name || '', phone: agent.phone || '',
    email: agent.email || '', commission_percentage: agent.commission_percentage ?? '', is_active: agent.is_active ?? true,
  });
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  function update(f, v) { setForm(s => ({ ...s, [f]: v })); }

  async function submit(e) {
    e.preventDefault(); setError('');
    if (!form.name) { setError('Name required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, commission_percentage: Number(form.commission_percentage || 0) };
      if (isNew) await api.post('/b2b-agents', payload);
      else       await api.patch(`/b2b-agents/${agent.id}`, payload);
      onSaved();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); setSaving(false); }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: '100%' }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>{isNew ? 'Add Agent' : 'Edit Agent'}</h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <F label="Name"><input className="input" value={form.name} onChange={e => update('name', e.target.value)} autoFocus /></F>
          <F label="Company"><input className="input" value={form.company_name} onChange={e => update('company_name', e.target.value)} /></F>
          <F label="Phone"><input className="input" value={form.phone} onChange={e => update('phone', e.target.value)} /></F>
          <F label="Email"><input className="input" type="email" value={form.email} onChange={e => update('email', e.target.value)} /></F>
          <F label="Commission %"><input className="input" type="number" step="0.01" value={form.commission_percentage} onChange={e => update('commission_percentage', e.target.value)} /></F>
          <label style={{ display: 'flex', gap: 8, fontSize: 13 }}><input type="checkbox" checked={form.is_active} onChange={e => update('is_active', e.target.checked)} /> Active</label>
          {error && <p style={{ color: 'var(--clr-danger)', fontSize: 13, margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function F({ label, children }) { return <div><label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{label}</label>{children}</div>; }

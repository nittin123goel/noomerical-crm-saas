import React, { useEffect, useState } from 'react';
import { UserCircle, Plus, Search } from 'lucide-react';
import api from '../services/api';

export default function Customers() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [editing, setEditing] = useState(null); // customer object or {} for new

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/customers', { params: search ? { search } : {} });
      setRows(data || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [search]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserCircle size={20} />
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Customers</h1>
          <span className="badge badge-gray">{rows.length}</span>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({})}><Plus size={15} />Add Customer</button>
      </div>

      <div style={{ position: 'relative', maxWidth: 300, marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-muted)' }} />
        <input className="input" placeholder="Search name, phone, email…" style={{ paddingLeft: 32 }}
               value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Address</th><th>Added</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 32 }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 32 }}>No customers yet</td></tr>
              ) : rows.map(c => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setEditing(c)}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td style={{ color: 'var(--clr-muted)' }}>{c.address || '—'}</td>
                  <td style={{ color: 'var(--clr-muted)' }}>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <CustomerModal customer={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}

function CustomerModal({ customer, onClose, onSaved }) {
  const isNew = !customer.id;
  const [form, setForm] = useState({
    name: customer.name || '', phone: customer.phone || '',
    email: customer.email || '', address: customer.address || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function update(f, v) { setForm(s => ({ ...s, [f]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name) { setError('Name is required'); return; }
    setSaving(true);
    try {
      if (isNew) await api.post('/customers', form);
      else       await api.patch(`/customers/${customer.id}`, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: '100%' }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>{isNew ? 'Add Customer' : 'Edit Customer'}</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Name"><input className="input" value={form.name} onChange={e => update('name', e.target.value)} autoFocus /></Field>
          <Field label="Phone"><input className="input" value={form.phone} onChange={e => update('phone', e.target.value)} /></Field>
          <Field label="Email"><input className="input" type="email" value={form.email} onChange={e => update('email', e.target.value)} /></Field>
          <Field label="Address"><input className="input" value={form.address} onChange={e => update('address', e.target.value)} /></Field>
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

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{label}</label>
      {children}
    </div>
  );
}

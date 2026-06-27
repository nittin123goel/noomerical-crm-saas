import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, Search } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS = ['confirmed', 'checked_in', 'completed', 'cancelled'];
const STATUS_BADGE = { confirmed: 'badge-blue', checked_in: 'badge-green', completed: 'badge-gray', cancelled: 'badge-red' };

export default function Deals() {
  const { tenant } = useAuth();
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [editing, setEditing] = useState(null);

  const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: tenant?.currency || 'INR', maximumFractionDigits: 0 }).format(n || 0);

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (status) params.status = status;
      const { data } = await api.get('/deals', { params });
      setRows(data || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [search, status]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={20} />
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{tenant?.industry === 'hospitality' ? 'Bookings' : 'Deals'}</h1>
          <span className="badge badge-gray">{rows.length}</span>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({})}><Plus size={15} />New {tenant?.industry === 'hospitality' ? 'Booking' : 'Deal'}</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-muted)' }} />
          <input className="input" placeholder="Search deal #, notes…" style={{ paddingLeft: 32 }} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 150 }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Deal #</th><th>Customer</th><th>Status</th><th>Dates</th><th>Total</th><th>Balance</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 32 }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 32 }}>No deals yet</td></tr>
              ) : rows.map(d => (
                <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => setEditing(d)}>
                  <td style={{ fontWeight: 500 }}>{d.deal_number}</td>
                  <td>{d.customers?.name || '—'}</td>
                  <td><span className={`badge ${STATUS_BADGE[d.status] || 'badge-gray'}`}>{(d.status || '').replace('_', ' ')}</span></td>
                  <td style={{ color: 'var(--clr-muted)' }}>{d.start_date || '—'}{d.end_date ? ` → ${d.end_date}` : ''}</td>
                  <td>{money(d.total_amount)}</td>
                  <td style={{ color: Number(d.balance_amount) > 0 ? 'var(--clr-danger)' : 'var(--clr-muted)' }}>{money(d.balance_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && <DealModal deal={editing} hospitality={tenant?.industry === 'hospitality'} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function DealModal({ deal, hospitality, onClose, onSaved }) {
  const isNew = !deal.id;
  const [form, setForm] = useState({
    status: deal.status || 'confirmed',
    start_date: deal.start_date || '', end_date: deal.end_date || '',
    total_amount: deal.total_amount || '', advance_amount: deal.advance_amount || '',
    accommodation_type: deal.accommodation_type || '', number_of_units: deal.number_of_units || '',
    adults: deal.adults || '', children: deal.children || '',
    notes: deal.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  function update(f, v) { setForm(s => ({ ...s, [f]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const payload = { ...form };
      ['total_amount', 'advance_amount', 'number_of_units', 'adults', 'children'].forEach(k => {
        payload[k] = payload[k] === '' ? null : Number(payload[k]);
      });
      ['start_date', 'end_date', 'accommodation_type'].forEach(k => { if (payload[k] === '') payload[k] = null; });
      if (isNew) await api.post('/deals', payload);
      else       await api.patch(`/deals/${deal.id}`, payload);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ width: 520, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 18, marginBottom: 4 }}>{isNew ? `New ${hospitality ? 'Booking' : 'Deal'}` : deal.deal_number}</h2>
        {!isNew && <p style={{ color: 'var(--clr-muted)', fontSize: 12, marginBottom: 14 }}>{deal.deal_number}</p>}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
          <DField label="Status">
            <select className="input" value={form.status} onChange={e => update('status', e.target.value)}>
              {STATUS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </DField>
          <div />
          <DField label="Start date"><input className="input" type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} /></DField>
          <DField label="End date"><input className="input" type="date" value={form.end_date} onChange={e => update('end_date', e.target.value)} /></DField>
          <DField label="Total amount"><input className="input" type="number" value={form.total_amount} onChange={e => update('total_amount', e.target.value)} /></DField>
          <DField label="Advance paid"><input className="input" type="number" value={form.advance_amount} onChange={e => update('advance_amount', e.target.value)} /></DField>

          {hospitality && <>
            <DField label="Accommodation"><input className="input" value={form.accommodation_type} onChange={e => update('accommodation_type', e.target.value)} placeholder="e.g. Cottage 4-Sharing" /></DField>
            <DField label="Units"><input className="input" type="number" value={form.number_of_units} onChange={e => update('number_of_units', e.target.value)} /></DField>
            <DField label="Adults"><input className="input" type="number" value={form.adults} onChange={e => update('adults', e.target.value)} /></DField>
            <DField label="Children"><input className="input" type="number" value={form.children} onChange={e => update('children', e.target.value)} /></DField>
          </>}

          <DField label="Notes" span><textarea className="input" style={{ height: 'auto', minHeight: 56, padding: 8 }} rows={2} value={form.notes} onChange={e => update('notes', e.target.value)} /></DField>

          {error && <p style={{ gridColumn: '1 / -1', color: 'var(--clr-danger)', fontSize: 13, margin: 0 }}>{error}</p>}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DField({ label, span, children }) {
  return (
    <div style={span ? { gridColumn: '1 / -1' } : undefined}>
      <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{label}</label>
      {children}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { BedDouble, Plus, Trash2 } from 'lucide-react';
import api from '../services/api';

export default function Inventory() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate]   = useState(today);
  const [avail, setAvail] = useState([]);
  const [types, setTypes] = useState([]);
  const [holds, setHolds] = useState([]);
  const [showType, setShowType] = useState(false);
  const [showHold, setShowHold] = useState(false);

  async function loadAvail() {
    const { data } = await api.get('/inventory/availability', { params: { date } });
    setAvail(data.inventory || []);
  }
  async function loadTypes() { const { data } = await api.get('/inventory'); setTypes(data || []); }
  async function loadHolds() { const { data } = await api.get('/inventory/holds'); setHolds(data || []); }

  useEffect(() => { loadAvail(); }, [date]);
  useEffect(() => { loadTypes(); loadHolds(); }, []);

  async function delType(t) { if (confirm(`Delete "${t.accommodation_type}"?`)) { await api.delete(`/inventory/${t.id}`); loadTypes(); loadAvail(); } }
  async function delHold(h) { if (confirm('Remove this hold?')) { await api.delete(`/inventory/holds/${h.id}`); loadHolds(); loadAvail(); } }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <BedDouble size={20} /><h1 style={{ fontSize: 20, fontWeight: 700 }}>Inventory</h1>
      </div>

      {/* Availability */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 15 }}>Availability</h3>
          <input className="input" type="date" style={{ width: 170 }} value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Type</th><th>Total</th><th>Booked</th><th>Held</th><th>Available</th></tr></thead>
            <tbody>
              {avail.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 24 }}>No inventory configured</td></tr>
              ) : avail.map(a => (
                <tr key={a.accommodation_type}>
                  <td style={{ fontWeight: 500 }}>{a.accommodation_type}</td>
                  <td>{a.total}</td><td>{a.booked}</td><td>{a.held}</td>
                  <td><span className={`badge ${a.available > 0 ? 'badge-green' : 'badge-red'}`}>{a.available}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Types */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 15 }}>Accommodation types</h3>
          <button className="btn btn-secondary" onClick={() => setShowType(true)}><Plus size={14} />Add type</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Type</th><th>Total units</th><th>Capacity / unit</th><th></th></tr></thead>
            <tbody>
              {types.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 24 }}>No types yet</td></tr>
              ) : types.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.accommodation_type}</td>
                  <td>{t.total_units}</td><td>{t.capacity_per_unit || '—'}</td>
                  <td style={{ textAlign: 'right' }}><button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => delType(t)}><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Holds */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 15 }}>Holds</h3>
          <button className="btn btn-secondary" onClick={() => setShowHold(true)}><Plus size={14} />Add hold</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Type</th><th>From</th><th>To</th><th>Units</th><th>Reason</th><th></th></tr></thead>
            <tbody>
              {holds.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 24 }}>No holds</td></tr>
              ) : holds.map(h => (
                <tr key={h.id}>
                  <td style={{ fontWeight: 500 }}>{h.accommodation_type}</td>
                  <td>{h.from_date}</td><td>{h.to_date}</td><td>{h.number_of_units}</td>
                  <td style={{ color: 'var(--clr-muted)' }}>{h.reason || '—'}</td>
                  <td style={{ textAlign: 'right' }}><button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => delHold(h)}><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showType && <TypeModal types={types} onClose={() => setShowType(false)} onSaved={() => { setShowType(false); loadTypes(); loadAvail(); }} />}
      {showHold && <HoldModal types={types} onClose={() => setShowHold(false)} onSaved={() => { setShowHold(false); loadHolds(); loadAvail(); }} />}
    </div>
  );
}

function TypeModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ accommodation_type: '', total_units: '', capacity_per_unit: '' });
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setError('');
    if (!form.accommodation_type) { setError('Type name required'); return; }
    setSaving(true);
    try {
      await api.post('/inventory', { accommodation_type: form.accommodation_type, total_units: Number(form.total_units || 0), capacity_per_unit: Number(form.capacity_per_unit || 0) });
      onSaved();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); setSaving(false); }
  }
  return (
    <Modal title="Add accommodation type" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <F label="Type name"><input className="input" value={form.accommodation_type} onChange={e => setForm(s => ({ ...s, accommodation_type: e.target.value }))} autoFocus /></F>
        <F label="Total units"><input className="input" type="number" value={form.total_units} onChange={e => setForm(s => ({ ...s, total_units: e.target.value }))} /></F>
        <F label="Capacity per unit"><input className="input" type="number" value={form.capacity_per_unit} onChange={e => setForm(s => ({ ...s, capacity_per_unit: e.target.value }))} /></F>
        {error && <p style={{ color: 'var(--clr-danger)', fontSize: 13, margin: 0 }}>{error}</p>}
        <Actions onClose={onClose} saving={saving} />
      </form>
    </Modal>
  );
}

function HoldModal({ types, onClose, onSaved }) {
  const [form, setForm] = useState({ accommodation_type: types[0]?.accommodation_type || '', from_date: '', to_date: '', number_of_units: 1, reason: '' });
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setError('');
    if (!form.accommodation_type || !form.from_date || !form.to_date) { setError('Type and dates required'); return; }
    setSaving(true);
    try { await api.post('/inventory/holds', { ...form, number_of_units: Number(form.number_of_units) }); onSaved(); }
    catch (err) { setError(err.response?.data?.error || 'Failed'); setSaving(false); }
  }
  return (
    <Modal title="Add hold" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <F label="Type">
          <select className="input" value={form.accommodation_type} onChange={e => setForm(s => ({ ...s, accommodation_type: e.target.value }))}>
            {types.map(t => <option key={t.id} value={t.accommodation_type}>{t.accommodation_type}</option>)}
          </select>
        </F>
        <F label="From"><input className="input" type="date" value={form.from_date} onChange={e => setForm(s => ({ ...s, from_date: e.target.value }))} /></F>
        <F label="To"><input className="input" type="date" value={form.to_date} onChange={e => setForm(s => ({ ...s, to_date: e.target.value }))} /></F>
        <F label="Units"><input className="input" type="number" value={form.number_of_units} onChange={e => setForm(s => ({ ...s, number_of_units: e.target.value }))} /></F>
        <F label="Reason"><input className="input" value={form.reason} onChange={e => setForm(s => ({ ...s, reason: e.target.value }))} /></F>
        {error && <p style={{ color: 'var(--clr-danger)', fontSize: 13, margin: 0 }}>{error}</p>}
        <Actions onClose={onClose} saving={saving} />
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ width: 400, maxWidth: '100%' }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>{title}</h2>{children}
      </div>
    </div>
  );
}
function F({ label, children }) { return <div><label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{label}</label>{children}</div>; }
function Actions({ onClose, saving }) {
  return <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
    <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
  </div>;
}

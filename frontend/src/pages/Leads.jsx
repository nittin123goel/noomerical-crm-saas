import React, { useEffect, useState } from 'react';
import { Users, Plus, Search, RefreshCw } from 'lucide-react';
import api from '../services/api';

const STATUS_LABELS = {
  new: 'New', contacted: 'Contacted', interested: 'Interested',
  converted: 'Converted', lost: 'Lost',
};
const TEMP_BADGE = {
  hot:  'badge-red',
  warm: 'badge-yellow',
  cold: 'badge-blue',
};

export default function Leads() {
  const [leads,   setLeads]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = { limit: 50, page: 1 };
      if (search) params.search = search;
      if (status) params.status = status;
      const { data } = await api.get('/leads', { params });
      setLeads(data.leads || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [search, status]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={20} />
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Leads</h1>
          <span className="badge badge-gray">{total}</span>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} />Add Lead</button>
      </div>

      {showAdd && <AddLeadModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-muted)' }} />
          <input
            className="input"
            placeholder="Search name, phone, email…"
            style={{ paddingLeft: 32 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input" style={{ width: 140 }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button className="btn btn-secondary" onClick={load}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Source</th>
                <th>Status</th>
                <th>Temp</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 32 }}>Loading…</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 32 }}>No leads found</td></tr>
              ) : leads.map(lead => (
                <tr key={lead.id} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 500 }}>{lead.name || <span style={{ color: 'var(--clr-muted)' }}>Unknown</span>}</td>
                  <td>{lead.phone}</td>
                  <td><span className="badge badge-gray">{lead.source || '—'}</span></td>
                  <td><span className="badge badge-blue">{STATUS_LABELS[lead.status] || lead.status}</span></td>
                  <td>
                    {lead.temperature && (
                      <span className={`badge ${TEMP_BADGE[lead.temperature] || 'badge-gray'}`}>
                        {lead.temperature}
                      </span>
                    )}
                  </td>
                  <td style={{ color: 'var(--clr-muted)' }}>
                    {new Date(lead.created_at).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const SOURCES = ['manual', 'walk_in', 'referral', 'whatsapp_inbound', 'ivr_call', 'meta_lead', 'form'];

function AddLeadModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', source: 'manual',
    status: 'new', temperature: 'warm', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  function update(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name && !form.phone) { setError('Enter at least a name or phone number'); return; }
    setSaving(true);
    try {
      await api.post('/leads', form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add lead');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20,
    }}>
      <div className="card" onClick={e => e.stopPropagation()} style={{ width: 460, maxWidth: '100%' }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Add Lead</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <LField label="Name">
            <input className="input" value={form.name} onChange={e => update('name', e.target.value)} autoFocus />
          </LField>
          <LField label="Phone">
            <input className="input" value={form.phone} onChange={e => update('phone', e.target.value)} />
          </LField>
          <LField label="Email" span>
            <input className="input" type="email" value={form.email} onChange={e => update('email', e.target.value)} />
          </LField>

          <LField label="Source">
            <select className="input" value={form.source} onChange={e => update('source', e.target.value)}>
              {SOURCES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </LField>
          <LField label="Temperature">
            <select className="input" value={form.temperature} onChange={e => update('temperature', e.target.value)}>
              <option value="hot">Hot</option><option value="warm">Warm</option><option value="cold">Cold</option>
            </select>
          </LField>

          <LField label="Status" span>
            <select className="input" value={form.status} onChange={e => update('status', e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </LField>
          <LField label="Notes" span>
            <textarea className="input" rows={3} value={form.notes} onChange={e => update('notes', e.target.value)} />
          </LField>

          {error && <p style={{ gridColumn: '1 / -1', color: 'var(--clr-danger)', fontSize: 13, margin: 0 }}>{error}</p>}

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add Lead'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LField({ label, span, children }) {
  return (
    <div style={span ? { gridColumn: '1 / -1' } : undefined}>
      <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>{label}</label>
      {children}
    </div>
  );
}

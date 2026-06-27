import React, { useEffect, useState } from 'react';
import { Archive, Search } from 'lucide-react';
import api from '../services/api';

const STATUS_LABELS = { new: 'New', contacted: 'Contacted', interested: 'Interested', converted: 'Converted', lost: 'Lost' };

export default function OldLeads() {
  const [leads, setLeads]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  async function load() {
    setLoading(true);
    try {
      const params = { is_old_lead: true, limit: 100 };
      if (search) params.search = search;
      const { data } = await api.get('/leads', { params });
      setLeads(data.leads || []);
      setTotal(data.total || 0);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [search]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Archive size={20} />
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Old Leads</h1>
        <span className="badge badge-gray">{total}</span>
      </div>
      <p style={{ color: 'var(--clr-muted)', marginBottom: 16, fontSize: 13 }}>
        Archived / backfilled leads, kept separate from your active pipeline.
      </p>

      <div style={{ position: 'relative', maxWidth: 300, marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-muted)' }} />
        <input className="input" placeholder="Search name, phone, email…" style={{ paddingLeft: 32 }}
               value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Source</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 32 }}>Loading…</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 32 }}>No old leads</td></tr>
              ) : leads.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 500 }}>{l.name || <span style={{ color: 'var(--clr-muted)' }}>Unknown</span>}</td>
                  <td>{l.phone}</td>
                  <td><span className="badge badge-gray">{l.source || '—'}</span></td>
                  <td><span className="badge badge-blue">{STATUS_LABELS[l.status] || l.status}</span></td>
                  <td style={{ color: 'var(--clr-muted)' }}>{new Date(l.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

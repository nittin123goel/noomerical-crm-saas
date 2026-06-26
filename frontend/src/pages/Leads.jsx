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
        <button className="btn btn-primary"><Plus size={15} />Add Lead</button>
      </div>

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

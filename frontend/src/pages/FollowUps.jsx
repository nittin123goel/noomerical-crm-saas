import React, { useEffect, useState } from 'react';
import { BellRing, Clock, Check } from 'lucide-react';
import api from '../services/api';

export default function FollowUps() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/leads/followups');
      setRows(data || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function snooze(id) {
    await api.patch(`/leads/${id}/snooze-followup`);
    load();
  }
  async function done(id) {
    await api.patch(`/leads/${id}`, { follow_up_at: null });
    load();
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <BellRing size={20} />
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Follow-ups</h1>
        <span className="badge badge-yellow">{rows.length} due</span>
      </div>
      <p style={{ color: 'var(--clr-muted)', marginBottom: 16, fontSize: 13 }}>
        Leads whose follow-up time has arrived. Snooze 15 min or mark done.
      </p>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Status</th><th>Due</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 32 }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 32 }}>🎉 No follow-ups due</td></tr>
              ) : rows.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 500 }}>{l.name || <span style={{ color: 'var(--clr-muted)' }}>Unknown</span>}</td>
                  <td>{l.phone}</td>
                  <td><span className="badge badge-blue">{l.status}</span></td>
                  <td style={{ color: 'var(--clr-danger)' }}>{new Date(l.follow_up_at).toLocaleString('en-IN')}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px' }} onClick={() => snooze(l.id)}><Clock size={13} />Snooze</button>
                    {' '}
                    <button className="btn btn-secondary" style={{ padding: '4px 10px' }} onClick={() => done(l.id)}><Check size={13} />Done</button>
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

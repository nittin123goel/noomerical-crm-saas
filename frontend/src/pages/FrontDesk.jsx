import React, { useEffect, useState } from 'react';
import { ConciergeBell, LogIn } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function FrontDesk() {
  const { tenant } = useAuth();
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: tenant?.currency || 'INR', maximumFractionDigits: 0 }).format(n || 0);

  async function load() {
    setLoading(true);
    try {
      // Upcoming/active bookings to check in (confirmed, not yet checked-in)
      const { data } = await api.get('/deals', { params: { status: 'confirmed' } });
      setRows(data || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function checkIn(d) {
    await api.patch(`/deals/${d.id}/check-in`);
    load();
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <ConciergeBell size={20} /><h1 style={{ fontSize: 20, fontWeight: 700 }}>Front Desk</h1>
        <span className="badge badge-blue">{rows.length} to check in</span>
      </div>
      <p style={{ color: 'var(--clr-muted)', marginBottom: 16, fontSize: 13 }}>Confirmed bookings awaiting check-in.</p>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Booking #</th><th>Guest</th><th>Accommodation</th><th>Dates</th><th>Balance</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 32 }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--clr-muted)', padding: 32 }}>No bookings awaiting check-in</td></tr>
              ) : rows.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 500 }}>{d.deal_number}</td>
                  <td>{d.customers?.name || '—'}</td>
                  <td>{d.accommodation_type || '—'}{d.number_of_units ? ` ×${d.number_of_units}` : ''}</td>
                  <td style={{ color: 'var(--clr-muted)' }}>{d.start_date || '—'}{d.end_date ? ` → ${d.end_date}` : ''}</td>
                  <td style={{ color: Number(d.balance_amount) > 0 ? 'var(--clr-danger)' : 'var(--clr-muted)' }}>{money(d.balance_amount)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-primary" style={{ padding: '4px 12px' }} onClick={() => checkIn(d)}><LogIn size={13} />Check in</button>
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

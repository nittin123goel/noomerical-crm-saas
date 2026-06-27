import React, { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS = { new: 'New', contacted: 'Contacted', interested: 'Interested', converted: 'Converted', lost: 'Lost' };

export default function Reports() {
  const { tenant } = useAuth();
  const [m, setM] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/dashboard').then(r => setM(r.data)).catch(() => setM(null)).finally(() => setLoading(false));
  }, []);

  const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: tenant?.currency || 'INR', maximumFractionDigits: 0 }).format(n || 0);

  if (loading) return <p style={{ color: 'var(--clr-muted)' }}>Loading…</p>;
  if (!m) return <p style={{ color: 'var(--clr-danger)' }}>Couldn't load reports.</p>;

  const conv = m.leads.total ? Math.round(((m.leads.byStatus.converted || 0) / m.leads.total) * 100) : 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <BarChart3 size={20} /><h1 style={{ fontSize: 20, fontWeight: 700 }}>Reports</h1>
      </div>

      <h3 style={{ fontSize: 14, color: 'var(--clr-muted)', marginBottom: 10 }}>Revenue</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 16, marginBottom: 24 }}>
        <Stat label="Revenue (this month)" value={money(m.deals.revenueMonth)} />
        <Stat label="Advance collected" value={money(m.deals.advanceCollected)} color="#059669" />
        <Stat label="Outstanding balance" value={money(m.deals.outstanding)} color="#dc2626" />
        <Stat label="Open deals" value={m.deals.open} />
      </div>

      <h3 style={{ fontSize: 14, color: 'var(--clr-muted)', marginBottom: 10 }}>Lead funnel</h3>
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          {Object.keys(STATUS_LABELS).map(s => (
            <div key={s}><div style={{ fontSize: 24, fontWeight: 700 }}>{m.leads.byStatus[s] || 0}</div>
              <div style={{ fontSize: 12.5, color: 'var(--clr-muted)' }}>{STATUS_LABELS[s]}</div></div>
          ))}
          <div><div style={{ fontSize: 24, fontWeight: 700 }}>{conv}%</div>
            <div style={{ fontSize: 12.5, color: 'var(--clr-muted)' }}>Conversion</div></div>
        </div>
      </div>

      <h3 style={{ fontSize: 14, color: 'var(--clr-muted)', marginBottom: 10 }}>Leads</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 16 }}>
        <Stat label="Total leads" value={m.leads.total} />
        <Stat label="New today" value={m.leads.newToday} />
        <Stat label="Hot leads" value={m.leads.hot} color="#ef4444" />
        <Stat label="Follow-ups due" value={m.followupsDue} color="#f59e0b" />
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="card">
      <div style={{ fontSize: 12.5, color: 'var(--clr-muted)', fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || 'var(--clr-text)' }}>{value}</div>
    </div>
  );
}

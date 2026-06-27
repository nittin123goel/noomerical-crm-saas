import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Flame, BellRing, UserCircle, BookOpen, IndianRupee } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS = {
  new: 'New', contacted: 'Contacted', interested: 'Interested',
  converted: 'Converted', lost: 'Lost',
};

export default function Dashboard() {
  const { user, tenant } = useAuth();
  const navigate = useNavigate();
  const [m, setM] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/dashboard')
      .then(r => setM(r.data))
      .catch(() => setM(null))
      .finally(() => setLoading(false));
  }, []);

  const fmtMoney = n => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: tenant?.currency || 'INR', maximumFractionDigits: 0,
  }).format(n || 0);

  const cards = m ? [
    { label: 'New Leads Today',  value: m.leads.newToday,               icon: Users,       color: '#4f46e5', to: '/leads' },
    { label: 'Hot Leads',        value: m.leads.hot,                    icon: Flame,       color: '#ef4444', to: '/leads' },
    { label: 'Follow-ups Due',   value: m.followupsDue,                 icon: BellRing,    color: '#f59e0b', to: '/follow-ups' },
    { label: 'Customers',        value: m.customers,                    icon: UserCircle,  color: '#10b981', to: '/customers' },
    { label: 'Open Deals',       value: m.deals.open,                   icon: BookOpen,    color: '#6366f1', to: '/deals' },
    { label: 'Revenue (Month)',  value: fmtMoney(m.deals.revenueMonth), icon: IndianRupee, color: '#059669', to: '/deals', money: true },
  ] : [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>{greeting}, {user?.name?.split(' ')[0] || 'there'}</h1>
      <p style={{ color: 'var(--clr-muted)', marginBottom: 24 }}>
        Here's what's happening at {tenant?.name || 'your business'} today
      </p>

      {loading ? (
        <p style={{ color: 'var(--clr-muted)' }}>Loading…</p>
      ) : !m ? (
        <div className="card"><p style={{ margin: 0, color: 'var(--clr-muted)' }}>Couldn't load metrics.</p></div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            {cards.map(c => (
              <div key={c.label} className="card" onClick={() => navigate(c.to)}
                   style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--clr-muted)', fontWeight: 600 }}>{c.label}</span>
                  <c.icon size={18} color={c.color} />
                </div>
                <span style={{ fontSize: c.money ? 22 : 28, fontWeight: 700 }}>{c.value}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 14 }}>Leads by status</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              {Object.keys(STATUS_LABELS).map(s => (
                <div key={s} style={{ minWidth: 90 }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{m.leads.byStatus[s] || 0}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--clr-muted)' }}>{STATUS_LABELS[s]}</div>
                </div>
              ))}
              <div style={{ minWidth: 90 }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{m.leads.total}</div>
                <div style={{ fontSize: 12.5, color: 'var(--clr-muted)' }}>Total</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

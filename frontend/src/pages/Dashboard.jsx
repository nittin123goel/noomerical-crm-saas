import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, tenant } = useAuth();

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        Good to see you, {user?.name?.split(' ')[0]}
      </h1>
      <p style={{ color: 'var(--clr-muted)', marginBottom: 28 }}>
        {tenant?.name} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {/* Placeholder metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {[
          { label: 'New Leads Today',  value: '—' },
          { label: 'Open Deals',       value: '—' },
          { label: 'Revenue This Month', value: '—' },
          { label: 'Campaigns Sent',   value: '—' },
        ].map(({ label, value }) => (
          <div className="card" key={label}>
            <p style={{ color: 'var(--clr-muted)', fontSize: 12, fontWeight: 500, marginBottom: 8 }}>{label}</p>
            <p style={{ fontSize: 26, fontWeight: 700 }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, BookOpen, Settings,
  Megaphone, ChevronLeft, ChevronRight, Share2, LogOut,
} from 'lucide-react';

const NAV = [
  { to: '/',          label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/leads',     label: 'Leads',      icon: Users },
  { to: '/deals',     label: 'Deals',      icon: BookOpen },
  { to: '/campaigns', label: 'Campaigns',  icon: Megaphone },
  { to: '/meta-forms',label: 'Meta Forms', icon: Share2 },
  { to: '/admin',     label: 'Admin',      icon: Settings },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, tenant, logout } = useAuth();

  const initial = (tenant?.name || user?.name || 'C')[0].toUpperCase();
  const displayName = tenant?.name || 'CRM';

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        {tenant?.logo_url
          ? <img src={tenant.logo_url} alt={displayName} />
          : <div className="sidebar-logo-fallback">{initial}</div>
        }
        <span className="nav-label" style={{ fontSize: 14, fontWeight: 700 }}>{displayName}</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            title={collapsed ? label : undefined}
          >
            <Icon size={17} strokeWidth={2} style={{ flexShrink: 0 }} />
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: '8px 6px', borderTop: '1px solid var(--clr-border)' }}>
        <button
          onClick={logout}
          className="nav-link"
          style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={17} strokeWidth={2} style={{ flexShrink: 0 }} />
          <span className="nav-label">{user?.name || 'Logout'}</span>
        </button>
      </div>

      {/* Collapse toggle */}
      <div className="sidebar-collapse-btn" onClick={() => setCollapsed(c => !c)}>
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </div>
    </aside>
  );
}

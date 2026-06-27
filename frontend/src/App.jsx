import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import OldLeads from './pages/OldLeads';
import FollowUps from './pages/FollowUps';
import Customers from './pages/Customers';
import Deals from './pages/Deals';
import FrontDesk from './pages/FrontDesk';
import Inventory from './pages/Inventory';
import B2BAgents from './pages/B2BAgents';
import Reports from './pages/Reports';
import Campaigns from './pages/Campaigns';
import Notifications from './pages/Notifications';
import Integrations from './pages/Integrations';
import Admin from './pages/Admin';
import MetaForms from './pages/MetaForms';
import SuperadminLogin from './pages/SuperadminLogin';
import SuperadminDashboard from './pages/SuperadminDashboard';
import Signup from './pages/Signup';

function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading…</div>;
  if (!user)   return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Routes>
          <Route index        element={<Dashboard />} />
          <Route path="leads" element={<Leads />} />
          <Route path="old-leads" element={<OldLeads />} />
          <Route path="follow-ups" element={<FollowUps />} />
          <Route path="customers" element={<Customers />} />
          <Route path="deals" element={<Deals />} />
          <Route path="front-desk" element={<FrontDesk />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="b2b-agents" element={<B2BAgents />} />
          <Route path="reports" element={<Reports />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="admin" element={<Admin />} />
          <Route path="meta-forms" element={<MetaForms />} />
          {/* Add more pages here as they are built */}
        </Routes>
      </div>
    </div>
  );
}

function SuperadminGuard() {
  const token = localStorage.getItem('sa_token');
  if (!token) return <Navigate to="/superadmin/login" replace />;
  return <SuperadminDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Platform-level superadmin (separate auth from tenant users) */}
        <Route path="/superadmin/login" element={<SuperadminLogin />} />
        <Route path="/superadmin"       element={<SuperadminGuard />} />

        {/* Public self-serve signup */}
        <Route path="/signup" element={<Signup />} />

        {/* Tenant app */}
        <Route path="/login" element={<Login />} />
        <Route path="/*"    element={<ProtectedLayout />} />
      </Routes>
    </AuthProvider>
  );
}

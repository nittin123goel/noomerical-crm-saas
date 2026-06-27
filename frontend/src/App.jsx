import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
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

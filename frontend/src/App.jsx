import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Admin from './pages/Admin';
import MetaForms from './pages/MetaForms';

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

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*"    element={<ProtectedLayout />} />
      </Routes>
    </AuthProvider>
  );
}

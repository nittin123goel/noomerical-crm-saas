import React, { useEffect, useState } from 'react';
import { Settings, Users, Plus } from 'lucide-react';
import api from '../services/api';

const ROLES = ['admin', 'manager', 'sales'];
const PAGES = ['leads', 'deals', 'customers', 'inventory', 'reports', 'campaigns', 'payments', 'admin'];

export default function Admin() {
  const [users,      setUsers]      = useState([]);
  const [perms,      setPerms]      = useState({});
  const [tab,        setTab]        = useState('users');
  const [permRole,   setPermRole]   = useState('sales');
  const [loading,    setLoading]    = useState(true);

  async function loadUsers() {
    const { data } = await api.get('/admin/users');
    setUsers(data);
  }

  async function loadPerms(role) {
    const { data } = await api.get('/admin/permissions', { params: { role } });
    const map = {};
    for (const p of data) map[p.page] = p;
    setPerms(map);
  }

  useEffect(() => {
    Promise.all([loadUsers(), loadPerms(permRole)]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadPerms(permRole); }, [permRole]);

  async function togglePerm(page, field, current) {
    await api.patch('/admin/permissions', { role: permRole, page, [field]: !current });
    loadPerms(permRole);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Settings size={20} />
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Admin</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {['users', 'permissions'].map(t => (
          <button
            key={t}
            className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500 }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className="badge badge-blue">{u.role}</span></td>
                    <td><span className={`badge ${u.is_active ? 'badge-green' : 'badge-gray'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ color: 'var(--clr-muted)', fontSize: 12 }}>
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {tab === 'permissions' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {ROLES.map(r => (
              <button key={r} className={`btn ${permRole === r ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPermRole(r)}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
          <div className="card" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Page</th><th style={{ textAlign: 'center' }}>Can View</th><th style={{ textAlign: 'center' }}>Can Edit</th>
                </tr>
              </thead>
              <tbody>
                {PAGES.map(page => {
                  const p = perms[page] || { can_view: false, can_edit: false };
                  return (
                    <tr key={page}>
                      <td style={{ fontWeight: 500, textTransform: 'capitalize' }}>{page}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" checked={!!p.can_view} onChange={() => togglePerm(page, 'can_view', p.can_view)} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" checked={!!p.can_edit} onChange={() => togglePerm(page, 'can_edit', p.can_edit)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import saApi from '../services/superadmin';

export default function SuperadminLogin() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await saApi.post('/login', { email, password });
      localStorage.setItem('sa_token', data.token);
      navigate('/superadmin');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0f172a',
    }}>
      <div className="card" style={{ width: 380 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: 'var(--clr-primary)', marginBottom: 6 }}>
          PLATFORM ADMIN
        </div>
        <h2 style={{ marginBottom: 6, fontSize: 20 }}>Superadmin sign in</h2>
        <p style={{ color: 'var(--clr-muted)', marginBottom: 24, fontSize: 13 }}>
          Manage all businesses on the platform
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 13 }}>Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && <p style={{ color: 'var(--clr-danger)', fontSize: 13 }}>{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Meta Lead Form Configuration page.
 *
 * Admins use this to connect Facebook/Instagram lead ad forms to the CRM.
 * Each form can have a custom field mapping (Meta field name → CRM field name).
 *
 * Setup guide shown on the page so non-technical admins can follow along.
 */

import React, { useEffect, useState } from 'react';
import { Share2, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../services/api';

const DEFAULT_MAPPING = {
  full_name:    'name',
  phone_number: 'phone',
  email:        'email',
};

export default function MetaForms() {
  const [forms,   setForms]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [draft,   setDraft]   = useState({
    form_id:        '',
    form_name:      '',
    page_id:        '',
    field_mapping:  DEFAULT_MAPPING,
    default_source: 'meta_lead',
    default_status: 'new',
  });

  async function load() {
    setLoading(true);
    const { data } = await api.get('/meta-forms');
    setForms(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    await api.post('/meta-forms', draft);
    setAdding(false);
    setDraft({ form_id: '', form_name: '', page_id: '', field_mapping: DEFAULT_MAPPING, default_source: 'meta_lead', default_status: 'new' });
    load();
  }

  async function toggleActive(form) {
    await api.patch(`/meta-forms/${form.id}`, { is_active: !form.is_active });
    load();
  }

  async function deleteForm(id) {
    if (!confirm('Delete this form mapping?')) return;
    await api.delete(`/meta-forms/${id}`);
    load();
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Share2 size={20} />
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Meta Lead Forms</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <Plus size={15} />Connect Form
        </button>
      </div>

      {/* Setup Guide */}
      <div className="card" style={{ background: '#eef2ff', border: '1px solid #c7d2fe', marginBottom: 20 }}>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>Setup Instructions</p>
        <ol style={{ paddingLeft: 20, lineHeight: 2, fontSize: 13, color: 'var(--clr-muted)' }}>
          <li>Go to <strong>Meta Business Suite → Leads Centre → Lead Ads</strong></li>
          <li>Create or open a Lead Ad form and copy the <strong>Form ID</strong></li>
          <li>In your <strong>Admin → Integrations</strong>, add your <strong>Page Access Token</strong></li>
          <li>In <strong>Meta App Dashboard → Webhooks</strong>, subscribe the <code>leadgen</code> event to:<br />
            <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4 }}>
              https://YOUR_SUBDOMAIN.yourcrm.com/api/webhook/meta
            </code>
          </li>
          <li>Click <strong>Connect Form</strong> here and paste the Form ID + field mapping</li>
        </ol>
      </div>

      {/* Add form modal */}
      {adding && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16 }}>Connect a Lead Ad Form</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Form ID *</label>
                <input className="input" required placeholder="123456789" value={draft.form_id} onChange={e => setDraft(d => ({ ...d, form_id: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Form Name</label>
                <input className="input" placeholder="Summer Campaign Form" value={draft.form_name} onChange={e => setDraft(d => ({ ...d, form_name: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Page ID</label>
                <input className="input" placeholder="987654321" value={draft.page_id} onChange={e => setDraft(d => ({ ...d, page_id: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Lead Status on Capture</label>
                <select className="input" value={draft.default_status} onChange={e => setDraft(d => ({ ...d, default_status: e.target.value }))}>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="interested">Interested</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                Field Mapping (JSON: Meta field → CRM field)
              </label>
              <textarea
                className="input"
                style={{ height: 100, resize: 'vertical', paddingTop: 8 }}
                value={JSON.stringify(draft.field_mapping, null, 2)}
                onChange={e => {
                  try { setDraft(d => ({ ...d, field_mapping: JSON.parse(e.target.value) })); } catch {}
                }}
              />
              <p style={{ fontSize: 11, color: 'var(--clr-muted)', marginTop: 4 }}>
                Default mapping auto-captures full_name→name, phone_number→phone, email→email
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" type="button" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit">Save Form</button>
            </div>
          </form>
        </div>
      )}

      {/* Forms list */}
      {loading ? (
        <p style={{ color: 'var(--clr-muted)' }}>Loading…</p>
      ) : forms.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--clr-muted)' }}>
          No forms connected yet. Click <strong>Connect Form</strong> to start capturing Meta leads.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {forms.map(form => (
            <div key={form.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600 }}>{form.form_name || `Form ${form.form_id}`}</p>
                <p style={{ fontSize: 12, color: 'var(--clr-muted)' }}>
                  ID: {form.form_id} · Page: {form.page_id || '—'} · Default: {form.default_status}
                </p>
              </div>
              <button onClick={() => toggleActive(form)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: form.is_active ? 'var(--clr-success)' : 'var(--clr-muted)' }}>
                {form.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>
              <span className={`badge ${form.is_active ? 'badge-green' : 'badge-gray'}`}>
                {form.is_active ? 'Active' : 'Paused'}
              </span>
              <button className="btn btn-secondary" style={{ height: 30, padding: '0 10px' }} onClick={() => deleteForm(form.id)}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

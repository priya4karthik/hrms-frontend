import { useState } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api from '../../utils/api'
import { FiEdit2, FiSave, FiX, FiMail, FiPhone, FiBriefcase, FiCalendar, FiUser } from 'react-icons/fi'
import { format } from 'date-fns'

export default function EmployeeProfile() {
  const { user, updateUser } = useAuth()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })
  const [saving, setSaving] = useState(false)
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}` : '?'

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await api.patch('/auth/me/', form)
      updateUser(data)
      setEditing(false)
      toast('Profile updated successfully', 'success')
    } catch (e) {
      toast(Object.values(e.response?.data || {})[0]?.[0] || 'Error updating profile', 'error')
    } finally { setSaving(false) }
  }

  const handleChangePassword = async () => {
    if (pwForm.new_password !== pwForm.confirm) { toast('Passwords do not match', 'error'); return }
    if (pwForm.new_password.length < 6) { toast('Password must be at least 6 characters', 'error'); return }
    setPwSaving(true)
    try {
      await api.post('/auth/change-password/', { old_password: pwForm.old_password, new_password: pwForm.new_password })
      toast('Password changed successfully', 'success')
      setPwForm({ old_password: '', new_password: '', confirm: '' })
      setShowPw(false)
    } catch (e) {
      toast(e.response?.data?.error || 'Error changing password', 'error')
    } finally { setPwSaving(false) }
  }

  return (
    <DashboardLayout title="My Profile">
      {/* Hero — NO photo edit button, photo set by admin only */}
      <div className="profile-hero mb-3">
        <div style={{ position: 'relative', flexShrink: 0, zIndex: 1 }}>
          {user?.profile_image ? (
            <img src={user.profile_image} alt="profile" className="profile-photo" />
          ) : (
            <div className="profile-photo-placeholder">{initials}</div>
          )}
          {/* No camera/edit button here — admin only sets photo */}
        </div>

        <div className="profile-info">
          <h2>{user?.first_name} {user?.last_name}</h2>
          <p className="position">{user?.position || 'Team Member'}</p>
          <div className="profile-tags">
            {user?.department && <span className="profile-tag">🏢 {user.department}</span>}
            <span className="profile-tag">👤 {user?.role}</span>
            {user?.date_joined_company && (
              <span className="profile-tag">📅 Joined {format(new Date(user.date_joined_company), 'MMM yyyy')}</span>
            )}
          </div>
          {/* Info note */}
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
            🔒 Profile photo is managed by your administrator
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Info card */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Personal Information</span>
            {!editing ? (
              <button className="btn btn-outline btn-sm" onClick={() => { setForm({ first_name: user?.first_name||'', last_name: user?.last_name||'', email: user?.email||'', phone: user?.phone||'' }); setEditing(true) }}>
                <FiEdit2 size={13} /> Edit
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                  <FiSave size={13} /> {saving ? 'Saving...' : 'Save'}
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}><FiX size={13} /></button>
              </div>
            )}
          </div>
          <div className="card-body">
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>First Name</label>
                    <input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Last Name</label>
                    <input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Phone</label>
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { icon: <FiUser size={14} />, label: 'Full Name', value: `${user?.first_name} ${user?.last_name}` },
                  { icon: <FiMail size={14} />, label: 'Email', value: user?.email || '—' },
                  { icon: <FiPhone size={14} />, label: 'Phone', value: user?.phone || '—' },
                  { icon: <FiBriefcase size={14} />, label: 'Position', value: user?.position || '—' },
                  { icon: <FiBriefcase size={14} />, label: 'Department', value: user?.department || '—' },
                  { icon: <FiCalendar size={14} />, label: 'Joined', value: user?.date_joined_company ? format(new Date(user.date_joined_company), 'MMMM d, yyyy') : '—' },
                ].map(({ icon, label, value }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--gray-100)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gray-800)', marginTop: 1 }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Account card */}
          <div className="card">
            <div className="card-header"><span className="card-title">Account Details</span></div>
            <div className="card-body">
              {[
                { label: 'Username', value: user?.username },
                { label: 'Role', value: user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) },
                { label: 'Account Status', value: user?.is_active ? '✅ Active' : '❌ Inactive' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--gray-100)', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--gray-500)' }}>{label}</span>
                  <span style={{ fontWeight: 700, color: 'var(--gray-800)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Change Password */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Security</span>
              <button className="btn btn-outline btn-sm" onClick={() => setShowPw(!showPw)}>
                {showPw ? 'Cancel' : 'Change Password'}
              </button>
            </div>
            {showPw && (
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[{ label: 'Current Password', key: 'old_password' }, { label: 'New Password', key: 'new_password' }, { label: 'Confirm New Password', key: 'confirm' }].map(({ label, key }) => (
                    <div className="form-group" key={key} style={{ marginBottom: 0 }}>
                      <label>{label}</label>
                      <input type="password" value={pwForm[key]} onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))} placeholder="••••••••" />
                    </div>
                  ))}
                  <button className="btn btn-primary" onClick={handleChangePassword} disabled={pwSaving} style={{ marginTop: 4 }}>
                    {pwSaving ? 'Changing...' : 'Update Password'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
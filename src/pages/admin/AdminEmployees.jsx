import { useState, useEffect, useRef } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/common/Modal'
import api from '../../utils/api'
import { useToast } from '../../context/ToastContext'
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiMail, FiPhone, FiCamera, FiEye, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

const TODAY = new Date().toISOString().slice(0, 10)

const EMPTY_FORM = {
  username: '', email: '', first_name: '', last_name: '',
  password: '', role: 'employee', department: '', position: '',
  phone: '', date_joined_company: TODAY,
  salary: '', bank_account: '', emergency_contact: '',
  emergency_phone: '', address: '', skills: '', bio: '',
}

// Field component defined OUTSIDE main component to prevent re-render cursor loss
const Field = ({ label, value, onChange, type = 'text', placeholder = '', required = false, error = '', fullWidth = false, min }) => (
  <div className="form-group" style={{ marginBottom: 0, gridColumn: fullWidth ? '1 / -1' : undefined }}>
    <label>{label}{required && ' *'}</label>
    {type === 'textarea' ? (
      <textarea
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        style={{ minHeight: 72, border: error ? '1.5px solid var(--danger)' : undefined }}
      />
    ) : (
      <input
        type={type}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        style={{ border: error ? '1.5px solid var(--danger)' : undefined }}
      />
    )}
    {error && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>⚠️ {error}</p>}
  </div>
)

export default function AdminEmployees() {
  const [employees, setEmployees] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [modal, setModal] = useState({ open: false, mode: 'add', data: null })
  const [form, setForm] = useState(EMPTY_FORM)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' })
  const [showExtended, setShowExtended] = useState(false)
  const fileInputRef = useRef()
  const navigate = useNavigate()
  const toast = useToast()

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/auth/users/')
      setEmployees(data)
      setFiltered(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchEmployees() }, [])

  useEffect(() => {
    let result = employees
    if (search) result = result.filter(e =>
      `${e.first_name} ${e.last_name} ${e.username} ${e.email}`.toLowerCase().includes(search.toLowerCase())
    )
    if (deptFilter) result = result.filter(e => e.department === deptFilter)
    setFiltered(result)
  }, [search, deptFilter, employees])

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))]

  const set = (field) => (e) => {
    setForm(p => ({ ...p, [field]: e.target.value }))
    setErrors(p => ({ ...p, [field]: '' }))
  }

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, phone_code: '+91', phone_number: '' })
    setPhotoFile(null)
    setPhotoPreview(null)
    setErrors({})
    setShowExtended(false)
    setModal({ open: true, mode: 'add', data: null })
  }

  const openEdit = async (emp) => {
    // Split phone into code + number
    let phone_code = '+91', phone_number = ''
    if (emp.phone) {
      const codes = ['+971', '+61', '+44', '+65', '+60', '+91', '+1']
      const found = codes.find(c => emp.phone.startsWith(c))
      if (found) { phone_code = found; phone_number = emp.phone.slice(found.length) }
      else { phone_number = emp.phone.replace(/\D/g, '').slice(0, 10) }
    }
    setForm({
      ...EMPTY_FORM, ...emp, password: '',
      date_joined_company: emp.date_joined_company ? emp.date_joined_company.slice(0, 10) : TODAY,
      salary: '', bank_account: '', emergency_contact: '',
      emergency_phone: '', address: '', skills: '', bio: '',
      phone_code, phone_number,
    })
    setPhotoFile(null)
    setPhotoPreview(emp.profile_image || null)
    setErrors({})
    setShowExtended(false)
    setModal({ open: true, mode: 'edit', data: emp })
    try {
      const { data } = await api.get(`/auth/users/${emp.id}/profile/`)
      setForm(prev => ({
        ...prev,
        salary: data.salary || '',
        bank_account: data.bank_account || '',
        emergency_contact: data.emergency_contact || '',
        emergency_phone: data.emergency_phone || '',
        address: data.address || '',
        skills: data.skills || '',
        bio: data.bio || '',
      }))
    } catch {}
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast('Image must be under 5MB', 'error'); return }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const validate = () => {
    const e = {}
    if (!form.first_name.trim()) e.first_name = 'First name is required'
    if (!form.last_name.trim()) e.last_name = 'Last name is required'
    if (!form.username.trim()) e.username = 'Username is required'
    else if (form.username.length < 3) e.username = 'Min 3 characters'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    if (modal.mode === 'add' && !form.password) e.password = 'Password is required'
    else if (form.password && form.password.length < 6) e.password = 'Min 6 characters'
    if (!form.department.trim()) e.department = 'Department is required'
    if (!form.position.trim()) e.position = 'Position is required'
    if (form.phone_number && form.phone_number.length !== 10) e.phone = 'Phone number must be exactly 10 digits'
    if (showExtended) {
      if (form.salary && (isNaN(form.salary) || Number(form.salary) < 0)) e.salary = 'Must be a positive number'
      if (form.bank_account && !/^[0-9]+$/.test(form.bank_account)) e.bank_account = 'Numbers only'
      if (form.bank_account && form.bank_account.length < 8) e.bank_account = 'Min 8 digits'
      if (form.emergency_phone && form.emergency_phone.length < 7) e.emergency_phone = 'Phone too short'
      if (form.address && form.address.trim().length < 10) e.address = 'Min 10 characters'
      if (form.bio && form.bio.trim().length < 10) e.bio = 'Min 10 characters'
      if (Object.keys(e).some(k => ['salary','bank_account','emergency_contact','emergency_phone','address','skills','bio'].includes(k))) {
        setShowExtended(true)
      }
    }
    return e
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); toast('Please fix the errors below', 'error'); return }
    setErrors({})
    setSaving(true)
    try {
      let userId = modal.data?.id
      if (modal.mode === 'add') {
        const { data } = await api.post('/auth/users/', {
          username: form.username, email: form.email,
          first_name: form.first_name, last_name: form.last_name,
          password: form.password, role: form.role,
          department: form.department, position: form.position,
          phone: form.phone || '',
          date_joined_company: form.date_joined_company || null,
        })
        userId = data.id
        toast('Employee added successfully', 'success')
      } else {
        const payload = {
          first_name: form.first_name, last_name: form.last_name,
          email: form.email, username: form.username,
          role: form.role, department: form.department,
          position: form.position, phone: form.phone || '',
          date_joined_company: form.date_joined_company || null,
        }
        if (form.password) payload.password = form.password
        await api.patch(`/auth/users/${userId}/`, payload)
        toast('Employee updated successfully', 'success')
      }
      // Save extended profile
      await api.post(`/auth/users/${userId}/profile/`, {
        salary: form.salary || null,
        bank_account: form.bank_account || '',
        emergency_contact: form.emergency_contact || '',
        emergency_phone: form.emergency_phone || '',
        address: form.address || '',
        skills: form.skills || '',
        bio: form.bio || '',
      })
      // Upload photo using dedicated photo endpoint
      if (photoFile && userId) {
        const fd = new FormData()
        fd.append('profile_image', photoFile)
        const token = localStorage.getItem('access_token')
        await fetch(`/api/auth/users/${userId}/photo/`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: fd,
        })
      }
      setModal({ open: false, mode: 'add', data: null })
      fetchEmployees()
    } catch (e) {
      const errData = e.response?.data || {}
      const first = Object.values(errData)[0]
      toast(Array.isArray(first) ? first[0] : (first || 'Error saving'), 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/auth/users/${deleteModal.id}/`)
      toast('Employee deleted', 'success')
      setDeleteModal({ open: false, id: null, name: '' })
      fetchEmployees()
    } catch { toast('Error deleting employee', 'error') }
  }

  const getInitials = (e) => `${e.first_name?.[0] || ''}${e.last_name?.[0] || ''}`.toUpperCase()
  const COLORS = ['#4f46e5','#10b981','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#ec4899']

  return (
    <DashboardLayout title="Employees">
      <div className="d-flex justify-between align-center mb-3" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700 }}>Team Members</h2>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', marginTop: 2 }}>{employees.length} total employees</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><FiPlus /> Add Employee</button>
      </div>

      <div className="filter-bar">
        <div className="search-wrapper">
          <FiSearch className="search-icon" />
          <input className="search-input" placeholder="Search by name, email or username..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select-filter" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="icon">👥</div><p>No employees found</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map((emp, i) => (
            <div key={emp.id} className="card"
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
              style={{ transition: 'var(--transition)' }}
            >
              <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--gray-100)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                  {emp.profile_image ? (
                    <img src={emp.profile_image} alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gray-200)', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg,${COLORS[i%COLORS.length]},${COLORS[(i+1)%COLORS.length]})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}>
                      {getInitials(emp)}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--gray-900)' }}>{emp.first_name} {emp.last_name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 2 }}>{emp.position || '—'}</div>
                    <span className={`badge ${emp.role === 'admin' ? 'badge-primary' : 'badge-gray'}`} style={{ marginTop: 4 }}>{emp.role}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--gray-500)' }}><FiMail size={12} /> {emp.email || '—'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--gray-500)' }}><FiPhone size={12} /> {emp.phone || '—'}</div>
                </div>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ background: 'var(--primary-bg)', color: 'var(--primary)', padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700 }}>{emp.department || 'No Dept'}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-outline btn-sm btn-icon" onClick={() => navigate('/admin/employees/'+emp.id)} title="View"><FiEye size={14} /></button>
                  <button className="btn btn-outline btn-sm btn-icon" onClick={() => openEdit(emp)} title="Edit"><FiEdit2 size={14} /></button>
                  <button className="btn btn-sm btn-icon" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: 'none' }}
                    onClick={() => setDeleteModal({ open: true, id: emp.id, name: `${emp.first_name} ${emp.last_name}` })} title="Delete">
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, mode: 'add', data: null })}
        title={modal.mode === 'add' ? '➕ Add New Employee' : '✏️ Edit Employee'}
        size="modal-lg"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModal({ open: false, mode: 'add', data: null })}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : modal.mode === 'add' ? 'Add Employee' : 'Save Changes'}</button>
          </>
        }
      >
        {/* Photo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ position: 'relative' }}>
            {photoPreview ? (
              <img src={photoPreview} alt="" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary-light)' }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', fontSize: '2rem', border: '3px dashed var(--gray-200)' }}>👤</div>
            )}
            <button type="button" onClick={() => fileInputRef.current.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: 'var(--primary)', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
              <FiCamera size={12} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          </div>
        </div>

        {/* Basic Info */}
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, paddingBottom: 6, borderBottom: '2px solid var(--primary-bg)' }}>
          👤 Basic Information
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <Field label="First Name" value={form.first_name} onChange={set('first_name')} placeholder="John" required error={errors.first_name} />
          <Field label="Last Name" value={form.last_name} onChange={set('last_name')} placeholder="Doe" required error={errors.last_name} />
          <Field label="Username" value={form.username} onChange={set('username')} placeholder="john.doe" required error={errors.username} />
          <Field label="Email" value={form.email} onChange={set('email')} type="email" placeholder="john@company.com" required error={errors.email} />
          <Field label={modal.mode === 'add' ? 'Password *' : 'New Password (leave blank to keep)'} value={form.password} onChange={set('password')} type="password" placeholder="••••••••" error={errors.password} />
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Role</label>
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Field label="Department" value={form.department} onChange={set('department')} placeholder="Engineering" required error={errors.department} />
          <Field label="Position" value={form.position} onChange={set('position')} placeholder="Senior Developer" required error={errors.position} />
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Phone</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={form.phone_code || '+91'}
                onChange={e => setForm(p => ({ ...p, phone_code: e.target.value }))}
                style={{ width: 90, padding: '10px 8px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.875rem', background: '#fff', flexShrink: 0 }}
              >
                <option value="+91">🇮🇳 +91</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+61">🇦🇺 +61</option>
                <option value="+971">🇦🇪 +971</option>
                <option value="+65">🇸🇬 +65</option>
                <option value="+60">🇲🇾 +60</option>
              </select>
              <div style={{ flex: 1 }}>
                <input
                  type="tel"
                  value={form.phone_number || ''}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setForm(p => ({ ...p, phone_number: val, phone: (p.phone_code || '+91') + val }))
                    setErrors(p => ({ ...p, phone: '' }))
                  }}
                  placeholder="9876543210"
                  maxLength={10}
                  style={{ width: '100%', padding: '10px 12px', border: errors.phone ? '1.5px solid var(--danger)' : '1.5px solid var(--gray-200)', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.875rem' }}
                />
                <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 3 }}>
                  {(form.phone_number || '').length}/10 digits
                </div>
              </div>
            </div>
            {errors.phone && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>⚠️ {errors.phone}</p>}
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Date Joined Company</label>
            <input
              type="date"
              value={form.date_joined_company || ''}
              max={TODAY}
              onChange={e => setForm(p => ({ ...p, date_joined_company: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer', background: '#fff' }}
            />
          </div>
        </div>

        {/* Extended Info Toggle */}
        <button type="button" onClick={() => setShowExtended(!showExtended)}
          style={{ width: '100%', padding: '10px 14px', background: 'var(--gray-50)', border: '1.5px solid var(--gray-200)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: showExtended ? 14 : 0 }}>
          <span>💼 Extended Profile Info <span style={{ fontWeight: 400, color: 'var(--gray-400)', fontSize: '0.78rem' }}>(Salary, Bank, Emergency, Address, Skills, Bio)</span></span>
          {showExtended ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        </button>

        {showExtended && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: 1, gridColumn: '1/-1', paddingBottom: 6, borderBottom: '1px solid var(--gray-100)' }}>💰 Financial & Emergency</div>
            <Field label="Salary (₹)" value={form.salary} onChange={set('salary')} type="number" placeholder="e.g. 50000" error={errors.salary} />
            <Field label="Bank Account Number" value={form.bank_account} onChange={set('bank_account')} placeholder="Account number" error={errors.bank_account} />
            <Field label="Emergency Contact Name" value={form.emergency_contact} onChange={set('emergency_contact')} placeholder="Full name" error={errors.emergency_contact} />
            <Field label="Emergency Contact Phone" value={form.emergency_phone} onChange={set('emergency_phone')} placeholder="+91-9876543210" error={errors.emergency_phone} />
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: 1, gridColumn: '1/-1', marginTop: 8, paddingBottom: 6, borderBottom: '1px solid var(--gray-100)' }}>📍 Address & Profile</div>
            <Field label="Address" value={form.address} onChange={set('address')} type="textarea" placeholder="Full address..." fullWidth error={errors.address} />
            <Field label="Skills" value={form.skills} onChange={set('skills')} type="textarea" placeholder="e.g. Python, React, Django..." fullWidth error={errors.skills} />
            <Field label="Bio" value={form.bio} onChange={set('bio')} type="textarea" placeholder="Brief description about the employee..." fullWidth error={errors.bio} />
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, name: '' })}
        title="Delete Employee"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setDeleteModal({ open: false, id: null, name: '' })}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
          </>
        }
      >
        <p style={{ color: 'var(--gray-600)', lineHeight: 1.6 }}>
          Are you sure you want to delete <strong>{deleteModal.name}</strong>? This cannot be undone.
        </p>
      </Modal>
    </DashboardLayout>
  )
}
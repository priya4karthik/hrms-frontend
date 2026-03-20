import { useState, useEffect } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/common/Modal'
import api from '../../utils/api'
import { useToast } from '../../context/ToastContext'
import { FiPlus, FiEdit2, FiTrash2, FiCalendar } from 'react-icons/fi'
import { format, differenceInDays, addDays } from 'date-fns'

const EMPTY_FORM = { leave_type: 'casual', start_date: '', end_date: '', reason: '' }

export default function EmployeeLeaves() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState({ open: false, mode: 'add', data: null })
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [errors, setErrors] = useState({})
  const toast = useToast()

  const fetch = async () => {
    setLoading(true)
    try {
      const params = statusFilter ? `?status=${statusFilter}` : ''
      const { data } = await api.get(`/leaves/${params}`)
      setLeaves(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [statusFilter])

  const openAdd = () => { setForm(EMPTY_FORM); setErrors({}); setModal({ open: true, mode: 'add', data: null }) }
  const openEdit = (leave) => {
    setForm({ leave_type: leave.leave_type, start_date: leave.start_date, end_date: leave.end_date, reason: leave.reason })
    setErrors({})
    setModal({ open: true, mode: 'edit', data: leave })
  }

  const handleSave = async () => {
    // Field-level validation
    const newErrors = {}
    if (!form.start_date) newErrors.start_date = 'Please select a start date'
    if (!form.end_date) newErrors.end_date = 'Please select an end date'
    if (form.start_date && form.end_date && new Date(form.end_date) < new Date(form.start_date)) {
      newErrors.end_date = 'End date must be after start date'
    }
    if (!form.reason.trim()) newErrors.reason = 'Please provide a reason for your leave'
    else if (form.reason.trim().length < 10) newErrors.reason = 'Reason must be at least 10 characters'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast('Please fill all required fields', 'error')
      return
    }
    setErrors({})
    setSaving(true)
    try {
      if (modal.mode === 'add') {
        await api.post('/leaves/', form)
        toast('Leave request submitted successfully', 'success')
      } else {
        await api.patch(`/leaves/${modal.data.id}/`, form)
        toast('Leave request updated', 'success')
      }
      setModal({ open: false, mode: 'add', data: null })
      fetch()
    } catch (e) {
      toast(Object.values(e.response?.data || {})[0]?.[0] || 'Error submitting request', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Cancel this leave request?')) return
    try {
      await api.delete(`/leaves/${id}/`)
      toast('Leave request cancelled', 'success')
      fetch()
    } catch { toast('Cannot delete approved/denied requests', 'error') }
  }

  const getDays = () => {
    if (!form.start_date || !form.end_date) return 0
    return differenceInDays(new Date(form.end_date), new Date(form.start_date)) + 1
  }

  const statusColor = { pending: '#f59e0b', approved: '#10b981', denied: '#ef4444' }
  const statusBg = { pending: '#fef3c7', approved: '#d1fae5', denied: '#fee2e2' }
  const leaveIcon = { sick: '🤒', casual: '☀️', annual: '🌴', maternity: '👶', paternity: '👨‍👶', unpaid: '💸', other: '📝' }

  const stats = {
    pending: leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    denied: leaves.filter(l => l.status === 'denied').length,
  }

  return (
    <DashboardLayout title="Leave Requests">
      <div className="d-flex justify-between align-center mb-3" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--gray-900)' }}>My Leave Requests</h2>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', marginTop: 2 }}>{leaves.length} requests total</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <FiPlus /> Apply for Leave
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid mb-3">
        {[
          { label: 'Pending', count: stats.pending, icon: '⏳', color: '#d97706', bg: '#fef3c7' },
          { label: 'Approved', count: stats.approved, icon: '✅', color: '#10b981', bg: '#d1fae5' },
          { label: 'Denied', count: stats.denied, icon: '❌', color: '#ef4444', bg: '#fee2e2' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color, fontSize: 22 }}>{s.icon}</div>
            <div className="stat-info"><h3>{s.count}</h3><p>{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar mb-3">
        {['', 'pending', 'approved', 'denied'].map(v => (
          <button key={v} className={`btn btn-sm ${statusFilter === v ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStatusFilter(v)}>
            {v === '' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Leave Cards */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : leaves.length === 0 ? (
        <div className="empty-state card" style={{ padding: 48 }}>
          <div className="icon">🏖️</div>
          <p>No leave requests found. <a href="#" onClick={(e) => { e.preventDefault(); openAdd() }} style={{ color: 'var(--primary)', fontWeight: 600 }}>Apply now →</a></p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {leaves.map(leave => (
            <div key={leave.id} className="card" style={{ borderLeft: `4px solid ${statusColor[leave.status]}` }}>
              <div className="card-body" style={{ paddingTop: 16, paddingBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: statusBg[leave.status], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                    {leaveIcon[leave.leave_type] || '📝'}
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '1rem', textTransform: 'capitalize' }}>
                        {leave.leave_type} Leave
                      </span>
                      <span style={{ background: statusBg[leave.status], color: statusColor[leave.status], padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700 }}>
                        {leave.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FiCalendar size={12} />
                      {format(new Date(leave.start_date), 'MMM d')} – {format(new Date(leave.end_date), 'MMM d, yyyy')}
                      <span style={{ background: 'var(--gray-100)', padding: '1px 8px', borderRadius: 99, fontWeight: 700, color: 'var(--gray-600)' }}>
                        {leave.days_count}d
                      </span>
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Reason</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--gray-700)', lineHeight: 1.4 }}>{leave.reason}</div>
                  </div>
                  {leave.admin_notes && (
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Admin Notes</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--gray-700)', fontStyle: 'italic' }}>"{leave.admin_notes}"</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {leave.status === 'pending' && (
                      <>
                        <button className="btn btn-outline btn-sm btn-icon" onClick={() => openEdit(leave)} title="Edit">
                          <FiEdit2 size={13} />
                        </button>
                        <button className="btn btn-sm btn-icon" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: 'none' }} onClick={() => handleDelete(leave.id)} title="Cancel">
                          <FiTrash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apply/Edit Modal */}
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, mode: 'add', data: null })}
        title={modal.mode === 'add' ? '🌴 Apply for Leave' : '✏️ Edit Leave Request'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModal({ open: false, mode: 'add', data: null })}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Submitting...' : (modal.mode === 'add' ? 'Submit Request' : 'Save Changes')}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Leave Type *</label>
          <select value={form.leave_type} onChange={e => { setForm(p => ({ ...p, leave_type: e.target.value })); setErrors(p => ({ ...p, leave_type: '' })) }}>
            <option value="casual">Casual Leave</option>
            <option value="sick">Sick Leave</option>
            <option value="annual">Annual Leave</option>
            <option value="maternity">Maternity Leave</option>
            <option value="paternity">Paternity Leave</option>
            <option value="unpaid">Unpaid Leave</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Start Date *</label>
            <input
              type="date"
              value={form.start_date}
              min={format(new Date(), 'yyyy-MM-dd')}
              onChange={e => { setForm(p => ({ ...p, start_date: e.target.value })); setErrors(p => ({ ...p, start_date: '' })) }}
              style={{ border: errors.start_date ? '1.5px solid var(--danger)' : undefined }}
            />
            {errors.start_date && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>⚠️ {errors.start_date}</p>}
          </div>
          <div className="form-group">
            <label>End Date *</label>
            <input
              type="date"
              value={form.end_date}
              min={form.start_date || format(new Date(), 'yyyy-MM-dd')}
              onChange={e => { setForm(p => ({ ...p, end_date: e.target.value })); setErrors(p => ({ ...p, end_date: '' })) }}
              style={{ border: errors.end_date ? '1.5px solid var(--danger)' : undefined }}
            />
            {errors.end_date && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>⚠️ {errors.end_date}</p>}
          </div>
        </div>

        {getDays() > 0 && (
          <div style={{ background: 'var(--primary-bg)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: '0.875rem', color: 'var(--primary-dark)', fontWeight: 600 }}>
            📅 Duration: <strong>{getDays()} day{getDays() !== 1 ? 's' : ''}</strong>
          </div>
        )}

        <div className="form-group">
          <label>Reason * <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', fontWeight: 400 }}>(min 10 characters)</span></label>
          <textarea
            value={form.reason}
            onChange={e => { setForm(p => ({ ...p, reason: e.target.value })); setErrors(p => ({ ...p, reason: '' })) }}
            placeholder="Please provide a reason for your leave request..."
            style={{ minHeight: 100, border: errors.reason ? '1.5px solid var(--danger)' : undefined }}
          />
          {errors.reason && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>⚠️ {errors.reason}</p>}
          {form.reason && !errors.reason && (
            <p style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 4 }}>{form.reason.length} characters</p>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  )
}
import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/common/Modal'
import api from '../../utils/api'
import { useToast } from '../../context/ToastContext'
import { FiCheck, FiX } from 'react-icons/fi'
import { format } from 'date-fns'

export default function AdminLeaves() {
  const [leaves, setLeaves] = useState([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [reviewModal, setReviewModal] = useState({ open: false, leave: null, action: '' })
  const [adminNotes, setAdminNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const toast = useToast()

  const fetchLeaves = useCallback(async () => {
    setLoading(true)
    try {
      const params = statusFilter ? `?status=${statusFilter}` : ''
      const { data } = await api.get(`/leaves/${params}`)
      setLeaves(data)
    } catch (e) {
      toast('Error fetching leaves', 'error')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchLeaves()
  }, [fetchLeaves])

  const openReview = (leave, action) => {
    setReviewModal({ open: true, leave, action })
    setAdminNotes('')
  }

  const handleReview = async () => {
    setProcessing(true)
    try {
      await api.post(`/leaves/${reviewModal.leave.id}/review/`, {
        action: reviewModal.action,
        admin_notes: adminNotes,
      })
      toast(`Leave request ${reviewModal.action}`, reviewModal.action === 'approved' ? 'success' : 'warning')
      setReviewModal({ open: false, leave: null, action: '' })
      setSelected(null)
      fetchLeaves()
    } catch (e) {
      toast(e.response?.data?.error || 'Error processing request', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const statusBadge = (s) => {
    const map = { pending: 'badge-warning', approved: 'badge-success', denied: 'badge-danger' }
    return <span className={`badge ${map[s]}`}>{s}</span>
  }

  const leaveTypeIcon = (t) => {
    const m = { sick: '🤒', casual: '☀️', annual: '🌴', maternity: '👶', paternity: '👨‍👶', unpaid: '💸', other: '📝' }
    return m[t] || '📝'
  }

  const allLeaves = leaves
  const stats = {
    pending: allLeaves.filter(l => l.status === 'pending').length,
    approved: allLeaves.filter(l => l.status === 'approved').length,
    denied: allLeaves.filter(l => l.status === 'denied').length,
  }

  return (
    <DashboardLayout title="Leave Requests">
      <div className="d-flex justify-between align-center mb-3" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--gray-900)' }}>Leave Management</h2>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', marginTop: 2 }}>{leaves.length} requests</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchLeaves}>↻ Refresh</button>
      </div>

      {/* Summary */}
      <div className="stat-grid mb-3">
        {[
          { label: 'Pending', count: stats.pending, color: '#d97706', bg: '#fef3c7', icon: '⏳' },
          { label: 'Approved', count: stats.approved, color: '#10b981', bg: '#d1fae5', icon: '✅' },
          { label: 'Denied', count: stats.denied, color: '#ef4444', bg: '#fee2e2', icon: '❌' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color, fontSize: 22 }}>{s.icon}</div>
            <div className="stat-info"><h3>{s.count}</h3><p>{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="filter-bar mb-3">
        {['', 'pending', 'approved', 'denied'].map(v => (
          <button
            key={v}
            className={`btn btn-sm ${statusFilter === v ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setStatusFilter(v); setSelected(null) }}
          >
            {v === '' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : leaves.length === 0 ? (
        <div className="empty-state card" style={{ padding: 48 }}>
          <div className="icon">🎉</div>
          <p>No {statusFilter || ''} leave requests found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20 }}>
          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {leaves.map(leave => (
              <div
                key={leave.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  borderLeft: `4px solid ${leave.status === 'pending' ? '#f59e0b' : leave.status === 'approved' ? '#10b981' : '#ef4444'}`,
                  transition: 'var(--transition)',
                  boxShadow: selected?.id === leave.id ? 'var(--shadow-md)' : 'var(--shadow-sm)'
                }}
                onClick={() => setSelected(selected?.id === leave.id ? null : leave)}
              >
                <div className="card-body" style={{ paddingTop: 16, paddingBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    {leave.user_profile_image ? (
                      <img src={leave.user_profile_image} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gray-200)', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                        {leave.user_name?.[0] || 'U'}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '0.95rem' }}>{leave.user_name}</span>
                        {statusBadge(leave.status)}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 3 }}>
                        {leaveTypeIcon(leave.leave_type)} {leave.leave_type} leave &bull; {leave.days_count} day{leave.days_count !== 1 ? 's' : ''} &bull; {leave.user_department}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-700)' }}>
                        {format(new Date(leave.start_date), 'MMM d')} – {format(new Date(leave.end_date), 'MMM d, yyyy')}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 2 }}>
                        Applied {format(new Date(leave.created_at), 'MMM d')}
                      </div>
                    </div>
                    {leave.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-success btn-sm btn-icon" title="Approve" onClick={() => openReview(leave, 'approved')}>
                          <FiCheck size={14} />
                        </button>
                        <button className="btn btn-danger btn-sm btn-icon" title="Deny" onClick={() => openReview(leave, 'denied')}>
                          <FiX size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="card" style={{ alignSelf: 'flex-start', position: 'sticky', top: 0 }}>
              <div className="card-header">
                <span className="card-title">Leave Details</span>
                <button className="modal-close" onClick={() => setSelected(null)} style={{ fontSize: 16 }}>✕</button>
              </div>
              <div className="card-body">
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  {selected.user_profile_image ? (
                    <img src={selected.user_profile_image} alt="" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--gray-200)', margin: '0 auto 10px', display: 'block' }} />
                  ) : (
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.3rem', margin: '0 auto 10px' }}>
                      {selected.user_name?.[0] || 'U'}
                    </div>
                  )}
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--gray-900)' }}>{selected.user_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>{selected.user_department}</div>
                  <div style={{ marginTop: 8 }}>{statusBadge(selected.status)}</div>
                </div>
                {[
                  ['Leave Type', `${leaveTypeIcon(selected.leave_type)} ${selected.leave_type}`],
                  ['From', format(new Date(selected.start_date), 'MMMM d, yyyy')],
                  ['To', format(new Date(selected.end_date), 'MMMM d, yyyy')],
                  ['Duration', `${selected.days_count} day${selected.days_count !== 1 ? 's' : ''}`],
                  ['Applied On', format(new Date(selected.created_at), 'MMM d, yyyy')],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gray-100)', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--gray-500)' }}>{k}</span>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize', color: 'var(--gray-800)' }}>{v}</span>
                  </div>
                ))}
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Reason</div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--gray-700)', lineHeight: 1.6, background: 'var(--gray-50)', padding: '10px 12px', borderRadius: 8 }}>{selected.reason}</p>
                </div>
                {selected.admin_notes && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Admin Notes</div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--gray-700)', lineHeight: 1.6, background: 'var(--primary-bg)', padding: '10px 12px', borderRadius: 8 }}>{selected.admin_notes}</p>
                  </div>
                )}
                {selected.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                    <button className="btn btn-success" style={{ flex: 1 }} onClick={() => openReview(selected, 'approved')}>
                      <FiCheck /> Approve
                    </button>
                    <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => openReview(selected, 'denied')}>
                      <FiX /> Deny
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      <Modal
        isOpen={reviewModal.open}
        onClose={() => setReviewModal({ open: false, leave: null, action: '' })}
        title={reviewModal.action === 'approved' ? '✅ Approve Leave' : '❌ Deny Leave'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setReviewModal({ open: false, leave: null, action: '' })}>Cancel</button>
            <button
              className={`btn ${reviewModal.action === 'approved' ? 'btn-success' : 'btn-danger'}`}
              onClick={handleReview}
              disabled={processing}
            >
              {processing ? 'Processing...' : (reviewModal.action === 'approved' ? 'Confirm Approve' : 'Confirm Deny')}
            </button>
          </>
        }
      >
        <p style={{ marginBottom: 16, color: 'var(--gray-600)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          You are about to <strong>{reviewModal.action}</strong> the leave request from <strong>{reviewModal.leave?.user_name}</strong>.
        </p>
        <div className="form-group">
          <label>Admin Notes (optional)</label>
          <textarea
            value={adminNotes}
            onChange={e => setAdminNotes(e.target.value)}
            placeholder="Add a note for the employee..."
            style={{ minHeight: 80 }}
          />
        </div>
      </Modal>
    </DashboardLayout>
  )
}
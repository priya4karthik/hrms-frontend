import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout'
import api from '../../utils/api'
import { FiArrowLeft, FiDownload, FiMail, FiPhone, FiBriefcase, FiCalendar, FiUser, FiMapPin } from 'react-icons/fi'
import { format } from 'date-fns'

export default function AdminEmployeeView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [emp, setEmp] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [tasks, setTasks] = useState([])
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const printRef = useRef()

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [empRes, attRes, taskRes, leaveRes] = await Promise.all([
          api.get(`/auth/users/${id}/`),
          api.get(`/attendance/?user_id=${id}`),
          api.get(`/tasks/?user_id=${id}`),
          api.get(`/leaves/?user_id=${id}`),
        ])
        setEmp(empRes.data)
        setAttendance(attRes.data.slice(0, 10))
        setTasks(taskRes.data)
        setLeaves(leaveRes.data)
      } finally { setLoading(false) }
    }
    fetchAll()
  }, [id])

  const handlePrint = () => {
    const content = printRef.current?.innerHTML
    if (!content) return
    const win = window.open('', '_blank')
    win.document.write(`
      <html>
        <head>
          <title>Employee Profile — ${emp?.first_name} ${emp?.last_name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', sans-serif; color: #1f2937; background: #fff; }
            .hero { background: linear-gradient(135deg, #1e1b4b, #4f46e5); padding: 32px; display: flex; align-items: center; gap: 24px; }
            .avatar { width: 90px; height: 90px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.3); object-fit: cover; }
            .avatar-placeholder { width: 90px; height: 90px; border-radius: 50%; background: rgba(255,255,255,0.15); border: 3px solid rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 2rem; font-weight: 700; }
            .hero-info h1 { color: #fff; font-size: 1.8rem; margin-bottom: 4px; }
            .hero-info p { color: rgba(255,255,255,0.7); font-size: 1rem; }
            .badge { display: inline-block; background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.9); padding: 3px 12px; border-radius: 99px; font-size: 0.78rem; margin-top: 8px; }
            .section { padding: 24px 32px; border-bottom: 1px solid #e5e7eb; }
            .section h2 { font-size: 1rem; font-weight: 700; color: #374151; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .info-item { display: flex; flex-direction: column; gap: 2px; }
            .info-label { font-size: 0.72rem; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            .info-value { font-size: 0.9rem; font-weight: 600; color: #1f2937; }
            .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
            .stat-box { background: #f9fafb; border-radius: 8px; padding: 14px; text-align: center; border: 1px solid #e5e7eb; }
            .stat-num { font-size: 1.8rem; font-weight: 800; }
            .stat-label { font-size: 0.72rem; color: #6b7280; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
            th { background: #f9fafb; padding: 10px 12px; text-align: left; font-size: 0.72rem; font-weight: 700; color: #6b7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; }
            td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
            .badge-success { background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 99px; font-size: 0.72rem; font-weight: 700; }
            .badge-danger { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 99px; font-size: 0.72rem; font-weight: 700; }
            .badge-warning { background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 99px; font-size: 0.72rem; font-weight: 700; }
            .footer { padding: 16px 32px; text-align: center; font-size: 0.75rem; color: #9ca3af; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  if (loading) return <DashboardLayout title="Employee Profile"><div className="loading-spinner"><div className="spinner" /></div></DashboardLayout>
  if (!emp) return <DashboardLayout title="Employee Profile"><div className="empty-state"><p>Employee not found</p></div></DashboardLayout>

  const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`
  const presentDays = attendance.filter(a => a.status === 'present').length
  const doneTasks = tasks.filter(t => t.status === 'done').length
  const approvedLeaves = leaves.filter(l => l.status === 'approved').length
  const activeTasks = tasks.filter(t => ['todo','inprogress'].includes(t.status)).length

  return (
    <DashboardLayout title="Employee Profile">
      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/employees')}>
          <FiArrowLeft size={14} /> Back to Employees
        </button>
        <button className="btn btn-primary btn-sm" onClick={handlePrint}>
          <FiDownload size={14} /> Print / Download Profile
        </button>
      </div>

      {/* Printable Content */}
      <div ref={printRef}>
        {/* Hero */}
        <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#4f46e5)', borderRadius: 16, padding: '32px', display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }} className="hero">
          {emp.profile_image ? (
            <img src={emp.profile_image} alt="profile" className="avatar" style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
          ) : (
            <div className="avatar-placeholder" style={{ width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '3px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '2rem', fontWeight: 700, flexShrink: 0 }}>
              {initials}
            </div>
          )}
          <div className="hero-info">
            <h1 style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, marginBottom: 4 }}>{emp.first_name} {emp.last_name}</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', marginBottom: 8 }}>{emp.position || 'Employee'} · {emp.department || 'No Department'}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)', padding: '3px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 600 }}>
                {emp.role?.toUpperCase()}
              </span>
              <span style={{ background: emp.is_active ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '3px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 600 }}>
                {emp.is_active ? '✅ Active' : '❌ Inactive'}
              </span>
              {emp.date_joined_company && (
                <span style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)', padding: '3px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 600 }}>
                  📅 Joined {format(new Date(emp.date_joined_company), 'MMM yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }} className="stat-grid">
          {[
            { label: 'Days Present', value: presentDays, color: '#10b981', bg: '#d1fae5', icon: '✅' },
            { label: 'Tasks Done', value: doneTasks, color: '#4f46e5', bg: '#eef2ff', icon: '🎯' },
            { label: 'Active Tasks', value: activeTasks, color: '#f59e0b', bg: '#fef3c7', icon: '⚡' },
            { label: 'Leaves Taken', value: approvedLeaves, color: '#06b6d4', bg: '#cffafe', icon: '🌴' },
          ].map(s => (
            <div key={s.label} className="card stat-box" style={{ background: s.bg, border: 'none', textAlign: 'center', padding: '20px 14px' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>
          {/* Personal Info */}
          <div className="card">
            <div className="card-header"><span className="card-title">👤 Personal Information</span></div>
            <div className="card-body">
              {[
                { icon: <FiUser size={14} />, label: 'Full Name', value: `${emp.first_name} ${emp.last_name}` },
                { icon: <FiMail size={14} />, label: 'Email', value: emp.email || '—' },
                { icon: <FiPhone size={14} />, label: 'Phone', value: emp.phone || '—' },
                { icon: <FiBriefcase size={14} />, label: 'Username', value: emp.username },
                { icon: <FiCalendar size={14} />, label: 'Date Joined', value: emp.date_joined_company ? format(new Date(emp.date_joined_company), 'MMMM d, yyyy') : '—' },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-800)' }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Work Info */}
          <div className="card">
            <div className="card-header"><span className="card-title">💼 Work Information</span></div>
            <div className="card-body">
              {[
                { label: 'Department', value: emp.department || '—' },
                { label: 'Position', value: emp.position || '—' },
                { label: 'Role', value: emp.role?.charAt(0).toUpperCase() + emp.role?.slice(1) },
                { label: 'Status', value: emp.is_active ? '✅ Active' : '❌ Inactive' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--gray-100)', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--gray-500)', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontWeight: 700, color: 'var(--gray-800)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Attendance */}
        <div className="card mb-3" style={{ marginBottom: 20 }}>
          <div className="card-header"><span className="card-title">📅 Recent Attendance</span></div>
          <div className="table-wrapper">
            {attendance.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}><p>No attendance records</p></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th></tr></thead>
                <tbody>
                  {attendance.map(a => {
                    let hours = '—'
                    if (a.check_in && a.check_out) {
                      const [ih,im] = a.check_in.split(':').map(Number)
                      const [oh,om] = a.check_out.split(':').map(Number)
                      const total = (oh*60+om)-(ih*60+im)
                      if (total > 0) hours = `${Math.floor(total/60)}h ${total%60}m`
                    }
                    return (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{a.date}</td>
                        <td><span style={{ background: 'var(--success-bg)', color: '#065f46', padding: '2px 8px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600 }}>{a.check_in?.slice(0,5)||'—'}</span></td>
                        <td><span style={{ background: 'var(--danger-bg)', color: '#991b1b', padding: '2px 8px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600 }}>{a.check_out?.slice(0,5)||'—'}</span></td>
                        <td style={{ fontWeight: 600 }}>{hours}</td>
                        <td><span className={`badge badge-${a.status==='present'?'success':a.status==='absent'?'danger':a.status==='late'?'warning':'info'}`}>{a.status?.replace('_',' ')}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Tasks */}
        <div className="card mb-3" style={{ marginBottom: 20 }}>
          <div className="card-header"><span className="card-title">✅ Assigned Tasks</span></div>
          <div className="table-wrapper">
            {tasks.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}><p>No tasks assigned</p></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Task</th><th>Priority</th><th>Due Date</th><th>Status</th></tr></thead>
                <tbody>
                  {tasks.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600, maxWidth: 220 }}>{t.title}</td>
                      <td>
                        <span style={{ background: t.priority==='urgent'?'#fee2e2':t.priority==='high'?'#fef3c7':t.priority==='medium'?'#dbeafe':'#f3f4f6', color: t.priority==='urgent'?'#991b1b':t.priority==='high'?'#92400e':t.priority==='medium'?'#1d4ed8':'#4b5563', padding: '2px 8px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize' }}>
                          {t.priority}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{t.due_date || '—'}</td>
                      <td><span className={`badge badge-${t.status==='done'?'success':t.status==='inprogress'?'info':t.status==='review'?'warning':'gray'}`}>{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Leave History */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><span className="card-title">🌴 Leave History</span></div>
          <div className="table-wrapper">
            {leaves.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}><p>No leave requests</p></div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead>
                <tbody>
                  {leaves.map(l => (
                    <tr key={l.id}>
                      <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{l.leave_type}</td>
                      <td>{l.start_date}</td>
                      <td>{l.end_date}</td>
                      <td style={{ fontWeight: 700 }}>{l.days_count}d</td>
                      <td><span className={`badge badge-${l.status==='approved'?'success':l.status==='denied'?'danger':'warning'}`}>{l.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Print footer */}
        <div className="footer" style={{ textAlign: 'center', padding: '16px', fontSize: '0.75rem', color: 'var(--gray-400)', borderTop: '1px solid var(--gray-100)' }}>
          Generated by HRMS · {format(new Date(), 'MMMM d, yyyy HH:mm')}
        </div>
      </div>
    </DashboardLayout>
  )
}
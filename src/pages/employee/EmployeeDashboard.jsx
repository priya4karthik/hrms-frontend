import { useState, useEffect } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import GreetingBanner from '../../components/common/GreetingBanner'
import api from '../../utils/api'
import { useToast } from '../../context/ToastContext'
import { FiClock, FiCheckSquare, FiCalendar, FiTrendingUp, FiFlag } from 'react-icons/fi'
import { format } from 'date-fns'

const PRIORITY_COLORS = {
  low: { color: '#6b7280', bg: '#f3f4f6' },
  medium: { color: '#1d4ed8', bg: '#dbeafe' },
  high: { color: '#d97706', bg: '#fef3c7' },
  urgent: { color: '#dc2626', bg: '#fee2e2' },
}

export default function EmployeeDashboard() {
  const [stats, setStats] = useState(null)
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [tasks, setTasks] = useState([])
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const toast = useToast()

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [s, att, t, l] = await Promise.all([
        api.get('/auth/dashboard-stats/'),
        api.get('/attendance/check/'),
        api.get('/tasks/'),
        api.get('/leaves/'),
      ])
      setStats(s.data)
      setTodayAttendance(att.data?.status ? att.data : null)
      setTasks(t.data.slice(0, 10))
      setLeaves(l.data.slice(0, 5))
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const handleCheckIn = async (action) => {
    setCheckingIn(true)
    try {
      const { data } = await api.post('/attendance/check/', { action })
      toast(data.message, 'success')
      const att = await api.get('/attendance/check/')
      setTodayAttendance(att.data?.status ? att.data : null)
      const s = await api.get('/auth/dashboard-stats/')
      setStats(s.data)
    } catch (e) {
      toast(e.response?.data?.error || 'Error', 'error')
    } finally { setCheckingIn(false) }
  }

  const getCheckInStatus = () => {
    if (!todayAttendance) return 'not_started'
    if (todayAttendance.check_in && !todayAttendance.check_out) return 'checked_in'
    if (todayAttendance.check_in && todayAttendance.check_out) return 'checked_out'
    return 'not_started'
  }

  const checkStatus = getCheckInStatus()

  const statCards = stats ? [
    { label: 'Days Present', value: stats.total_present, icon: <FiCalendar />, color: '#10b981', bg: '#d1fae5' },
    { label: 'Leaves Taken', value: stats.total_leaves, icon: <FiClock />, color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Active Tasks', value: stats.pending_tasks, icon: <FiCheckSquare />, color: '#4f46e5', bg: '#eef2ff' },
    { label: 'Tasks Done', value: stats.completed_tasks, icon: <FiTrendingUp />, color: '#06b6d4', bg: '#cffafe' },
  ] : []

  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo'),
    inprogress: tasks.filter(t => t.status === 'inprogress'),
    review: tasks.filter(t => t.status === 'review'),
    done: tasks.filter(t => t.status === 'done'),
  }

  return (
    <DashboardLayout title="My Dashboard">
      <GreetingBanner />

      {/* Stat Cards */}
      <div className="stat-grid">
        {statCards.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="stat-info">
              <h3>{loading ? '—' : s.value}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2-1">
        {/* Left: Tasks preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Task Summary */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">My Tasks Overview</span>
              <a href="/employee/tasks" style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>View Board →</a>
            </div>
            <div className="card-body" style={{ paddingTop: 12 }}>
              {tasks.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px' }}><div className="icon">🎯</div><p>No tasks assigned</p></div>
              ) : (
                <>
                  {/* Progress bars */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    {[
                      { label: 'To Do', count: tasksByStatus.todo.length, color: '#9ca3af' },
                      { label: 'In Progress', count: tasksByStatus.inprogress.length, color: '#3b82f6' },
                      { label: 'In Review', count: tasksByStatus.review.length, color: '#f59e0b' },
                      { label: 'Done', count: tasksByStatus.done.length, color: '#10b981' },
                    ].map(s => (
                      <div key={s.label} style={{ background: 'var(--gray-50)', padding: '10px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                          <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)', fontWeight: 500 }}>{s.label}</span>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--gray-900)' }}>{s.count}</span>
                      </div>
                    ))}
                  </div>

                  {/* Recent tasks list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tasks.filter(t => t.status !== 'done').slice(0, 4).map(task => {
                      const p = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium
                      return (
                        <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--gray-50)', borderRadius: 8 }}>
                          <div style={{ width: 3, height: 32, borderRadius: 2, background: task.status === 'inprogress' ? '#3b82f6' : task.status === 'review' ? '#f59e0b' : '#9ca3af', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 2 }}>
                              {task.due_date && `Due ${format(new Date(task.due_date), 'MMM d')}`}
                            </div>
                          </div>
                          <span style={{ background: p.bg, color: p.color, padding: '2px 8px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}>
                            {task.priority}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recent Leaves */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">My Leave Requests</span>
              <a href="/employee/leaves" style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>View All →</a>
            </div>
            <div style={{ padding: '0 4px' }}>
              {leaves.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px' }}><div className="icon">🏖️</div><p>No leave requests yet</p></div>
              ) : leaves.map(l => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-800)', textTransform: 'capitalize' }}>{l.leave_type} Leave</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2 }}>
                      {format(new Date(l.start_date), 'MMM d')} – {format(new Date(l.end_date), 'MMM d, yyyy')} ({l.days_count}d)
                    </div>
                  </div>
                  <span className={`badge ${l.status === 'approved' ? 'badge-success' : l.status === 'denied' ? 'badge-danger' : 'badge-warning'}`}>{l.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Check-in widget */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Check-in Card */}
          <div className={`checkin-card ${checkStatus === 'checked_in' ? 'checked-in' : checkStatus === 'checked_out' ? 'checked-out' : ''}`}>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: 4 }}>
              {checkStatus === 'not_started' ? '🟢 Ready to check in' : checkStatus === 'checked_in' ? '🔵 Currently working' : '⚫ Work day ended'}
            </div>
            <div className="checkin-time">{format(currentTime, 'HH:mm:ss')}</div>
            <div className="checkin-label">{format(currentTime, 'EEEE, MMMM d')}</div>

            {todayAttendance && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: '0.7rem', opacity: 0.7, marginBottom: 2 }}>Checked In</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{todayAttendance.check_in?.slice(0, 5) || '—'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: '0.7rem', opacity: 0.7, marginBottom: 2 }}>Checked Out</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{todayAttendance.check_out?.slice(0, 5) || '—'}</div>
                </div>
              </div>
            )}

            {checkStatus === 'not_started' && (
              <button className="btn-checkin" onClick={() => handleCheckIn('check_in')} disabled={checkingIn}>
                {checkingIn ? 'Processing...' : '▶ Check In'}
              </button>
            )}
            {checkStatus === 'checked_in' && (
              <button className="btn-checkin" onClick={() => handleCheckIn('check_out')} disabled={checkingIn}>
                {checkingIn ? 'Processing...' : '⏹ Check Out'}
              </button>
            )}
            {checkStatus === 'checked_out' && (
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '12px 16px', fontSize: '0.875rem', textAlign: 'center' }}>
                ✅ Work day completed!
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="card">
            <div className="card-header"><span className="card-title">Quick Actions</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12 }}>
              {[
                { label: 'Apply for Leave', icon: '🌴', href: '/employee/leaves', color: '#4f46e5' },
                { label: 'View My Tasks', icon: '✅', href: '/employee/tasks', color: '#10b981' },
                { label: 'My Attendance', icon: '📅', href: '/employee/attendance', color: '#f59e0b' },
                { label: 'Edit Profile', icon: '👤', href: '/employee/profile', color: '#06b6d4' },
              ].map(action => (
                <a key={action.label} href={action.href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 8, textDecoration: 'none', transition: 'var(--transition)', color: 'var(--gray-700)', fontWeight: 600, fontSize: '0.875rem' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--gray-50)'}
                >
                  <span style={{ fontSize: '1.2rem' }}>{action.icon}</span>
                  {action.label}
                  <span style={{ marginLeft: 'auto', color: 'var(--gray-300)', fontSize: '1rem' }}>→</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

import { useState, useEffect } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import GreetingBanner from '../../components/common/GreetingBanner'
import api from '../../utils/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'
import { FiUsers, FiCalendar, FiFileText, FiCheckSquare, FiClock, FiTrendingUp } from 'react-icons/fi'
import { format } from 'date-fns'

const DEPT_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6']

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [recentLeaves, setRecentLeaves] = useState([])
  const [recentAttendance, setRecentAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/auth/dashboard-stats/'),
      api.get('/leaves/?status=pending'),
      api.get(`/attendance/?date=${format(new Date(), 'yyyy-MM-dd')}`),
    ]).then(([s, l, a]) => {
      setStats(s.data)
      setRecentLeaves(l.data.slice(0, 5))
      setRecentAttendance(a.data.slice(0, 8))
    }).finally(() => setLoading(false))
  }, [])

  const statCards = stats ? [
    { label: 'Total Employees', value: stats.total_employees, icon: <FiUsers />, color: '#4f46e5', bg: '#eef2ff', trend: '+2 this month', up: true },
    { label: 'Present Today', value: stats.present_today, icon: <FiCalendar />, color: '#10b981', bg: '#d1fae5', trend: `${stats.total_employees ? Math.round((stats.present_today/stats.total_employees)*100) : 0}% attendance`, up: true },
    { label: 'Pending Leaves', value: stats.pending_leaves, icon: <FiFileText />, color: '#f59e0b', bg: '#fef3c7', trend: 'Needs review', up: false },
    { label: 'Tasks Completed', value: stats.tasks_completed, icon: <FiCheckSquare />, color: '#06b6d4', bg: '#cffafe', trend: 'All time', up: true },
  ] : []

  return (
    <DashboardLayout title="Dashboard">
      <GreetingBanner />

      {/* Stat Cards */}
      <div className="stat-grid">
        {statCards.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
              {s.icon}
            </div>
            <div className="stat-info">
              <h3>{loading ? '—' : s.value}</h3>
              <p>{s.label}</p>
              <div className={`stat-trend ${s.up ? 'up' : 'down'}`}>
                <FiTrendingUp size={11} /> {s.trend}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid-2-1 mb-3">
        {/* Attendance Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Monthly Attendance</span>
            <span className="badge badge-primary">This Month</span>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats?.monthly_attendance?.slice(-14) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v ? format(new Date(v), 'dd') : ''}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => [v, 'Present']}
                  labelFormatter={(v) => v ? format(new Date(v), 'MMM dd') : ''}
                  contentStyle={{ borderRadius: 8, fontSize: '0.8rem' }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Pie */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">By Department</span>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats?.department_data || []}
                  dataKey="count"
                  nameKey="department"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ department, percent }) =>
                    `${department || 'N/A'} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {(stats?.department_data || []).map((_, i) => (
                    <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: '0.8rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid-2">
        {/* Today's Attendance */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Today's Attendance</span>
            <span className="badge badge-success">{format(new Date(), 'MMM d')}</span>
          </div>
          <div className="table-wrapper" style={{ margin: '0' }}>
            {recentAttendance.length === 0 ? (
              <div className="empty-state"><div className="icon">📅</div><p>No attendance records today</p></div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAttendance.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className="avatar-group">
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                            {a.user_name?.[0] || 'U'}
                          </div>
                          <div>
                            <div className="avatar-name">{a.user_name}</div>
                            <div className="avatar-sub">{a.user_department}</div>
                          </div>
                        </div>
                      </td>
                      <td>{a.check_in || '—'}</td>
                      <td>{a.check_out || '—'}</td>
                      <td>
                        <span className={`badge badge-${
                          a.status === 'present' ? 'success' :
                          a.status === 'absent' ? 'danger' :
                          a.status === 'late' ? 'warning' : 'gray'
                        }`}>{a.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pending Leaves */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Pending Leave Requests</span>
            {recentLeaves.length > 0 && (
              <span className="badge badge-warning">{recentLeaves.length} pending</span>
            )}
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {recentLeaves.length === 0 ? (
              <div className="empty-state"><div className="icon">🎉</div><p>No pending requests</p></div>
            ) : (
              <div style={{ padding: '0 4px' }}>
                {recentLeaves.map((l) => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--gray-100)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                      {l.user_name?.[0] || 'U'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.user_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{l.leave_type} · {l.days_count} day{l.days_count !== 1 ? 's' : ''}</div>
                    </div>
                    <span className="badge badge-warning">pending</span>
                  </div>
                ))}
                <div style={{ padding: '12px 18px' }}>
                  <a href="/admin/leaves" style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>View all →</a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

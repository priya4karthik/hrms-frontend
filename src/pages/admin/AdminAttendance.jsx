import { useState, useEffect } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import api from '../../utils/api'
import { FiCalendar, FiDownload } from 'react-icons/fi'
import { SiMicrosoftexcel } from 'react-icons/si'
import { format } from 'date-fns'

export default function AdminAttendance() {
  const [records, setRecords] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState('')
  const [filters, setFilters] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    user_id: '',
    status: '',
    month: '',
    year: '',
  })

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.date) params.append('date', filters.date)
      if (filters.user_id) params.append('user_id', filters.user_id)
      if (filters.status) params.append('status', filters.status)
      if (filters.month) params.append('month', filters.month)
      if (filters.year) params.append('year', filters.year)
      const { data } = await api.get(`/attendance/?${params}`)
      setRecords(data)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    api.get('/auth/users/').then(({ data }) => setEmployees(data.filter(u => u.role === 'employee')))
  }, [])

  useEffect(() => { fetchRecords() }, [filters])

  const buildExportParams = () => {
    const params = new URLSearchParams()
    if (filters.user_id) params.append('user_id', filters.user_id)
    if (filters.status) params.append('status', filters.status)
    if (filters.month) params.append('month', filters.month)
    if (filters.year) params.append('year', filters.year)
    if (filters.date && !filters.month) params.append('start_date', filters.date)
    return params.toString()
  }

  const handleExport = async (type) => {
    setExporting(type)
    try {
      const params = buildExportParams()
      const token = localStorage.getItem('access_token')
      const response = await fetch(`https://priyak.pythonanywhere.com/api/attendance/export/${type}/?${params}`, {
  headers: { Authorization: `Bearer ${token}` }
})
      if (!response.ok) {
        const text = await response.text()
        alert(`Export failed: ${text}`)
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${format(new Date(), 'yyyy-MM-dd')}.${type === 'excel' ? 'xlsx' : 'pdf'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Export error: ' + e.message)
    } finally {
      setExporting('')
    }
  }

  const statusBadge = (s) => {
    const map = { present: 'badge-success', absent: 'badge-danger', late: 'badge-warning', half_day: 'badge-info' }
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace('_', ' ')}</span>
  }

  const summary = {
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
    half_day: records.filter(r => r.status === 'half_day').length,
  }

  return (
    <DashboardLayout title="Attendance">
      <div className="d-flex justify-between align-center mb-3" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--gray-900)' }}>Attendance Tracker</h2>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', marginTop: 2 }}>{records.length} records found</p>
        </div>
        {/* Export Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => handleExport('excel')}
            disabled={exporting === 'excel'}
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#166534', borderColor: '#16a34a' }}
          >
            <FiDownload size={14} />
            {exporting === 'excel' ? 'Exporting...' : 'Export Excel'}
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => handleExport('pdf')}
            disabled={exporting === 'pdf'}
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#991b1b', borderColor: '#ef4444' }}
          >
            <FiDownload size={14} />
            {exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stat-grid mb-3">
        {[
          { label: 'Present', count: summary.present, color: '#10b981', bg: '#d1fae5', icon: '✅' },
          { label: 'Absent', count: summary.absent, color: '#ef4444', bg: '#fee2e2', icon: '❌' },
          { label: 'Late', count: summary.late, color: '#f59e0b', bg: '#fef3c7', icon: '⏰' },
          { label: 'Half Day', count: summary.half_day, color: '#06b6d4', bg: '#cffafe', icon: '🌓' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color, fontSize: 22 }}>{s.icon}</div>
            <div className="stat-info"><h3>{s.count}</h3><p>{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-3">
        <div className="card-body" style={{ paddingTop: 16, paddingBottom: 16 }}>
          <div className="filter-bar" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiCalendar color="var(--gray-400)" />
              <input
                type="date"
                className="select-filter"
                value={filters.date}
                onChange={e => setFilters(p => ({ ...p, date: e.target.value, month: '', year: '' }))}
              />
            </div>
            <select className="select-filter" value={filters.month} onChange={e => setFilters(p => ({ ...p, month: e.target.value, date: '' }))}>
              <option value="">All Months</option>
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i) => (
                <option key={m} value={i+1}>{m}</option>
              ))}
            </select>
            <select className="select-filter" value={filters.year} onChange={e => setFilters(p => ({ ...p, year: e.target.value }))}>
              <option value="">All Years</option>
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="select-filter" value={filters.user_id} onChange={e => setFilters(p => ({ ...p, user_id: e.target.value }))}>
              <option value="">All Employees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
            <select className="select-filter" value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
              <option value="">All Statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="half_day">Half Day</option>
            </select>
            <button className="btn btn-outline btn-sm" onClick={() => setFilters({ date: format(new Date(), 'yyyy-MM-dd'), user_id: '', status: '', month: '', year: '' })}>
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : records.length === 0 ? (
            <div className="empty-state"><div className="icon">📅</div><p>No attendance records for selected filters</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  let hours = '—'
                  if (r.check_in && r.check_out) {
                    const [ih, im] = r.check_in.split(':').map(Number)
                    const [oh, om] = r.check_out.split(':').map(Number)
                    const total = (oh * 60 + om) - (ih * 60 + im)
                    if (total > 0) hours = `${Math.floor(total / 60)}h ${total % 60}m`
                  }
                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="avatar-group">
                          {r.user_profile_image ? (
                            <img src={r.user_profile_image} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gray-200)', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                              {r.user_name?.[0] || 'U'}
                            </div>
                          )}
                          <div><div className="avatar-name">{r.user_name}</div></div>
                        </div>
                      </td>
                      <td><span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{r.user_department || '—'}</span></td>
                      <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.date}</td>
                      <td><span style={{ background: 'var(--success-bg)', color: '#065f46', padding: '3px 8px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600 }}>{r.check_in?.slice(0, 5) || '—'}</span></td>
                      <td><span style={{ background: 'var(--danger-bg)', color: '#991b1b', padding: '3px 8px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600 }}>{r.check_out?.slice(0, 5) || '—'}</span></td>
                      <td style={{ fontWeight: 600, color: 'var(--gray-700)', fontSize: '0.85rem' }}>{hours}</td>
                      <td>{statusBadge(r.status)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'
import {
  FiGrid, FiUsers, FiCalendar, FiCheckSquare, FiFileText,
  FiUser, FiClock, FiLogOut, FiChevronLeft, FiChevronRight,
  FiMenu, FiZap
} from 'react-icons/fi'

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [badges, setBadges] = useState({ pendingLeaves: 0, newTasks: 0, leaveUpdates: 0 })
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Fetch badge counts
  useEffect(() => {
    if (!user) return

    const fetchBadges = async () => {
      try {
        if (user.role === 'admin') {
          const { data } = await api.get('/leaves/?status=pending')
          setBadges(prev => ({ ...prev, pendingLeaves: data.length }))
        } else {
          // Employee badges
          const [tasksRes, leavesRes] = await Promise.all([
            api.get('/tasks/'),
            api.get('/leaves/'),
          ])
          // New/active tasks (todo + inprogress)
          const activeTasks = tasksRes.data.filter(t => t.status === 'todo' || t.status === 'inprogress').length

          // Leave updates — only show NEW ones since last seen
          // Store seen leave IDs in localStorage
          const reviewedLeaves = leavesRes.data.filter(l => l.status === 'approved' || l.status === 'denied')
          const seenIds = JSON.parse(localStorage.getItem('seen_leave_ids') || '[]')
          const unseenLeaves = reviewedLeaves.filter(l => !seenIds.includes(l.id))

          // New tasks since last seen
          const seenTaskIds = JSON.parse(localStorage.getItem('seen_task_ids') || '[]')
          const newTasks = tasksRes.data.filter(t => !seenTaskIds.includes(t.id))

          setBadges({ pendingLeaves: 0, newTasks: newTasks.length, leaveUpdates: unseenLeaves.length })
        }
      } catch {}
    }

    fetchBadges()
    // Refresh every 30 seconds
    const interval = setInterval(fetchBadges, 30000)
    return () => clearInterval(interval)
  }, [user, location.pathname])

  const ADMIN_NAV = [
    { group: 'Main', items: [
      { path: '/admin/dashboard', icon: <FiGrid />, label: 'Dashboard' },
      { path: '/admin/employees', icon: <FiUsers />, label: 'Employees' },
    ]},
    { group: 'Management', items: [
      { path: '/admin/attendance', icon: <FiCalendar />, label: 'Attendance' },
      { path: '/admin/tasks', icon: <FiCheckSquare />, label: 'Tasks' },
      { path: '/admin/leaves', icon: <FiFileText />, label: 'Leave Requests', badgeCount: badges.pendingLeaves },
    ]},
    { group: 'AI Tools', items: [
      { path: '/admin/performance', icon: <FiZap />, label: 'AI Performance' },
    ]},
  ]

  const EMPLOYEE_NAV = [
    { group: 'Main', items: [
      { path: '/employee/dashboard', icon: <FiGrid />, label: 'Dashboard' },
      { path: '/employee/profile', icon: <FiUser />, label: 'My Profile' },
    ]},
    { group: 'Work', items: [
      { path: '/employee/attendance', icon: <FiClock />, label: 'Attendance' },
      { path: '/employee/tasks', icon: <FiCheckSquare />, label: 'My Tasks', badgeCount: badges.newTasks },
      { path: '/employee/leaves', icon: <FiFileText />, label: 'Leave Requests', badgeCount: badges.leaveUpdates, badgeColor: '#10b981' },
    ]},
    { group: 'AI Tools', items: [
      { path: '/employee/performance', icon: <FiZap />, label: 'My Performance' },
    ]},
  ]

  const navItems = user?.role === 'admin' ? ADMIN_NAV : EMPLOYEE_NAV
  const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}` : 'U'

  const handleNav = (path) => {
    navigate(path)
    setMobileOpen(false)
    // Mark as seen and clear badge when visiting that page
    if (path === '/employee/tasks') {
      api.get('/tasks/').then(({ data }) => {
        const ids = data.map(t => t.id)
        localStorage.setItem('seen_task_ids', JSON.stringify(ids))
      }).catch(() => {})
      setBadges(p => ({ ...p, newTasks: 0 }))
    }
    if (path === '/employee/leaves') {
      api.get('/leaves/').then(({ data }) => {
        const reviewed = data.filter(l => l.status === 'approved' || l.status === 'denied').map(l => l.id)
        localStorage.setItem('seen_leave_ids', JSON.stringify(reviewed))
      }).catch(() => {})
      setBadges(p => ({ ...p, leaveUpdates: 0 }))
    }
    if (path === '/admin/leaves') setBadges(p => ({ ...p, pendingLeaves: 0 }))
  }

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <>
      <button
  className="d-md-none btn btn-outline btn-sm"
  style={{ position: 'fixed', top: 16, left: 16, zIndex: 400 }}
  onClick={() => setMobileOpen(!mobileOpen)}
>
  <FiMenu />
</button>

{mobileOpen && (
  <div 
    style={{ 
      position: 'fixed', inset: 0, 
      background: 'rgba(0,0,0,0.4)', 
      zIndex: 298,
      touchAction: 'none'
    }} 
    onClick={() => setMobileOpen(false)}
    onTouchStart={() => setMobileOpen(false)}
  />
)}

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`} style={{ zIndex: 299 }}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">🏢</div>
            <div className="sidebar-brand-text">
              <h3>HRMS</h3>
              <span>Workspace</span>
            </div>
          </div>
          <button className="sidebar-toggle d-none d-md-flex" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
          </button>
          {/* Mobile close button */}
<button 
  className="d-md-none btn btn-outline btn-sm" 
  onClick={() => setMobileOpen(false)}
  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
>
  <FiChevronLeft size={14} />
</button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((group) => (
            <div key={group.group}>
              <div className="nav-section-label">{group.group}</div>
              {group.items.map((item) => (
                <div
                  key={item.path}
                  className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={() => handleNav(item.path)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  {item.badgeCount > 0 && (
                    <span className="nav-badge" style={{ background: item.badgeColor || 'var(--danger)' }}>
                      {item.badgeCount}
                    </span>
                  )}
                  {collapsed && <span className="sidebar-tooltip">{item.label}</span>}
                </div>
              ))}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="sidebar-user">
          {user?.profile_image ? (
            <img src={user.profile_image} alt="avatar" className="sidebar-user-avatar" />
          ) : (
            <div className="sidebar-user-avatar-placeholder">{initials}</div>
          )}
          <div className="sidebar-user-info">
            <h4>{user?.first_name} {user?.last_name}</h4>
            <span>{user?.position || user?.role}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <FiLogOut size={15} />
          </button>
        </div>
      </aside>
    </>
  )
}
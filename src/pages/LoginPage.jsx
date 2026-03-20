import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FiUser, FiLock, FiShield, FiAlertCircle } from 'react-icons/fi'

export default function LoginPage() {
  const [role, setRole] = useState('employee')
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(form)

      // Role mismatch check
      if (data.role !== role) {
        setError(
          data.role === 'admin'
            ? '⚠️ This is an Admin account. Please select "Administrator" to login.'
            : '⚠️ This is an Employee account. Please select "Employee" to login.'
        )
        setLoading(false)
        // Logout since we already logged in
        localStorage.clear()
        return
      }

      navigate(data.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = () => {
    const creds = {
      admin: { username: 'admin', password: 'admin123' },
      employee: { username: 'liya.k', password: 'employee123' },
    }
    setForm(creds[role])
  }

  return (
    <div className="login-page">
      {/* Left Panel */}
      <div className="login-left">
        <div className="login-left-content">
          <div className="login-brand">
            <div className="login-brand-icon">🏢</div>
            <h1>HRMS</h1>
          </div>

          <div className="login-illustration-cards">
            <div className="login-card-preview">
              <div className="login-card-icon" style={{ background: 'rgba(99,102,241,0.2)' }}>📊</div>
              <div>
                <h4>Analytics Dashboard</h4>
                <p>Real-time workforce insights</p>
              </div>
            </div>
            <div className="login-card-preview">
              <div className="login-card-icon" style={{ background: 'rgba(16,185,129,0.2)' }}>✅</div>
              <div>
                <h4>Task Management</h4>
                <p>Kanban-style productivity</p>
              </div>
            </div>
            <div className="login-card-preview">
              <div className="login-card-icon" style={{ background: 'rgba(245,158,11,0.2)' }}>📅</div>
              <div>
                <h4>Leave Management</h4>
                <p>Streamlined approvals</p>
              </div>
            </div>
            <div className="login-card-preview">
              <div className="login-card-icon" style={{ background: 'rgba(245, 11, 202, 0.2)' }}>📷</div>
              <div>
                <h4>AI Live Attendance</h4>
                <p>AI integration</p>
              </div>
            </div>
            <div className="login-card-preview">
              <div className="login-card-icon" style={{ background: 'rgba(245, 66, 11, 0.2)' }}>🤖</div>
              <div>
                <h4>AI Performance summary </h4>
                <p>AI integration</p>
              </div>
            </div>
          </div>

          <p className="login-tagline">Empowering teams, one click at a time</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="login-right">
        <div className="login-form-wrapper">
          <h2>Welcome back</h2>
          <p className="subtitle">Sign in to your HRMS account</p>

          {/* Role Toggle */}
          <div className="role-toggle">
            <button
              className={role === 'employee' ? 'active' : ''}
              onClick={() => { setRole('employee'); setError('') }}
              type="button"
            >
              <FiUser size={15} /> Employee
            </button>
            <button
              className={role === 'admin' ? 'active' : ''}
              onClick={() => { setRole('admin'); setError('') }}
              type="button"
            >
              <FiShield size={15} /> Administrator
            </button>
          </div>

          {/* Role hint */}
          <div style={{
            background: role === 'admin' ? 'var(--primary-bg)' : 'var(--success-bg)',
            border: `1px solid ${role === 'admin' ? 'var(--primary-light)' : '#6ee7b7'}`,
            borderRadius: 8,
            padding: '8px 14px',
            marginBottom: 16,
            fontSize: '0.8rem',
            fontWeight: 600,
            color: role === 'admin' ? 'var(--primary-dark)' : '#065f46',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            {role === 'admin' ? <FiShield size={14} /> : <FiUser size={14} />}
            Logging in as: <strong>{role === 'admin' ? 'Administrator' : 'Employee'}</strong>
          </div>

          {error && (
            <div className="login-error">
              <FiAlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 1 }}>
                  <FiUser size={16} />
                </span>
                <input
                  type="text"
                  style={{ width: '100%', padding: '12px 14px 12px 42px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.9rem', color: '#1f2937', background: '#fff', outline: 'none', transition: 'border-color 0.2s' }}
                  placeholder={role === 'admin' ? 'admin' : 'liya.k'}
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = '#4f46e5'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 1 }}>
                  <FiLock size={16} />
                </span>
                <input
                  type="password"
                  style={{ width: '100%', padding: '12px 14px 12px 42px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.9rem', color: '#1f2937', background: '#fff', outline: 'none', transition: 'border-color 0.2s' }}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  onFocus={e => e.target.style.borderColor = '#4f46e5'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary-full" disabled={loading}>
              {loading ? 'Signing in...' : `Sign in as ${role === 'admin' ? 'Administrator' : 'Employee'}`}
            </button>
          </form>

          <div className="login-demo-hint">
            <strong>Demo credentials</strong><br />
            {role === 'admin'
              ? <span>Username: <strong>admin</strong> · Password: <strong>admin123</strong></span>
              : <span>Username: <strong>liya.k</strong> · Password: <strong>employee123</strong></span>
            }
            <br />
            <button
              type="button"
              onClick={fillDemo}
              style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem', padding: 0, fontFamily: 'inherit' }}
            >
              Click to autofill →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
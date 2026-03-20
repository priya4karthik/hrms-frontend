import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { FiShield, FiUser } from 'react-icons/fi'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return '☀️ Good Morning'
  if (h < 17) return '🌤️ Good Afternoon'
  return '🌙 Good Evening'
}

export default function GreetingBanner() {
  const { user } = useAuth()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}` : '?'

  return (
    <div className="greeting-banner">
      {user?.profile_image ? (
        <img src={user.profile_image} alt="avatar" className="greeting-avatar" />
      ) : (
        <div className="greeting-avatar-placeholder">{initials}</div>
      )}
      <div className="greeting-text">
        <p className="greeting">{getGreeting()}</p>
        <h2>{user?.first_name} {user?.last_name}</h2>
        <span className="role-badge">
          {user?.role === 'admin' ? <FiShield size={12} /> : <FiUser size={12} />}
          {user?.position || (user?.role === 'admin' ? 'Administrator' : 'Employee')}
          {user?.department ? ` · ${user.department}` : ''}
        </span>
      </div>
      <div className="greeting-datetime">
        <div className="time">{format(now, 'HH:mm')}</div>
        <div className="date">{format(now, 'EEEE')}</div>
        <div className="date">{format(now, 'MMM d, yyyy')}</div>
      </div>
    </div>
  )
}

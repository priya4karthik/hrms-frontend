import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { FiBell } from 'react-icons/fi'

export default function Topbar({ title }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="topbar">
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-right">
        <span className="topbar-date d-none d-sm-block">
          {format(now, 'EEEE, MMM d yyyy')} &bull; {format(now, 'HH:mm:ss')}
        </span>
      </div>
    </div>
  )
}

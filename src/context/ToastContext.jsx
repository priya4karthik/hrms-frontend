import { createContext, useContext, useState, useCallback } from 'react'
import { FiCheckCircle, FiXCircle, FiAlertCircle, FiInfo } from 'react-icons/fi'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const icons = {
    success: <FiCheckCircle color="var(--success)" size={18} />,
    error: <FiXCircle color="var(--danger)" size={18} />,
    warning: <FiAlertCircle color="var(--warning)" size={18} />,
    info: <FiInfo color="var(--info)" size={18} />,
  }

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {icons[t.type]}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

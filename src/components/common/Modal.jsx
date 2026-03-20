import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FiX } from 'react-icons/fi'

export default function Modal({ isOpen, onClose, title, children, footer, size = '' }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    if (isOpen) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '40px 20px',
        overflowY: 'auto',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: size === 'modal-lg' ? '700px' : '520px',
          position: 'relative',
          marginBottom: '20px',
        }}
      >
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#111827',
            margin: 0,
          }}>{title}</h3>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: '#f3f4f6', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 18,
          }}>
            <FiX />
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {children}
        </div>

        {footer && (
          <div style={{
            padding: '14px 24px', borderTop: '1px solid #e5e7eb',
            display: 'flex', justifyContent: 'flex-end', gap: 10,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

import { useState, useEffect, useRef } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/common/Modal'
import api from '../../utils/api'
import { useToast } from '../../context/ToastContext'
import { FiCalendar, FiFlag, FiEdit2, FiInfo } from 'react-icons/fi'
import { format } from 'date-fns'

const COLUMNS = [
  { key: 'todo', label: 'To Do', dot: '#9ca3af', bg: '#f9fafb', color: '#6b7280' },
  { key: 'inprogress', label: 'In Progress', dot: '#3b82f6', bg: '#eff6ff', color: '#1d4ed8' },
  { key: 'review', label: 'In Review', dot: '#f59e0b', bg: '#fffbeb', color: '#d97706' },
  { key: 'done', label: 'Done', dot: '#10b981', bg: '#f0fdf4', color: '#065f46' },
]

const PRIORITY_COLORS = {
  low: { color: '#6b7280', bg: '#f3f4f6' },
  medium: { color: '#1d4ed8', bg: '#dbeafe' },
  high: { color: '#d97706', bg: '#fef3c7' },
  urgent: { color: '#dc2626', bg: '#fee2e2' },
}

const STATUS_FLOW = { todo: 'inprogress', inprogress: 'review', review: 'done', done: 'todo' }
const STATUS_LABELS = { todo: 'Start Task →', inprogress: 'Submit for Review →', review: 'Mark Done ✓', done: 'Re-open ↩' }

export default function EmployeeTasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [updating, setUpdating] = useState(false)
  const dragTask = useRef(null)
  const toast = useToast()

  const fetch = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/tasks/')
      setTasks(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const getCol = (key) => tasks.filter(t => t.status === key)

  const handleStatusChange = async (task, newStatus) => {
    setUpdating(true)
    try {
      await api.patch(`/tasks/${task.id}/`, { status: newStatus })
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
      if (selected?.id === task.id) setSelected(prev => ({ ...prev, status: newStatus }))
      toast(`Task moved to ${newStatus}`, 'success')
    } catch { toast('Error updating task', 'error') }
    finally { setUpdating(false) }
  }

  const handleDragStart = (task) => { dragTask.current = task }
  const handleDrop = (newStatus) => {
    if (!dragTask.current || dragTask.current.status === newStatus) return
    handleStatusChange(dragTask.current, newStatus)
    dragTask.current = null
  }

  const totalTasks = tasks.length
  const doneTasks = tasks.filter(t => t.status === 'done').length
  const progress = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0

  return (
    <DashboardLayout title="My Tasks">
      {/* Progress */}
      <div className="card mb-3">
        <div className="card-body" style={{ paddingTop: 18, paddingBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-900)' }}>Overall Progress</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>{doneTasks} of {totalTasks} tasks completed</div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: progress === 100 ? 'var(--success)' : 'var(--primary)' }}>{progress}%</div>
          </div>
          <div style={{ height: 8, background: 'var(--gray-100)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--success)' : 'linear-gradient(90deg, var(--primary), var(--primary-light))', borderRadius: 99, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
            {COLUMNS.map(col => (
              <div key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.dot }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--gray-500)', fontWeight: 500 }}>{col.label}: <strong style={{ color: 'var(--gray-700)' }}>{getCol(col.key).length}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : tasks.length === 0 ? (
        <div className="empty-state card" style={{ padding: 48 }}>
          <div className="icon">🎯</div>
          <p>No tasks assigned to you yet</p>
        </div>
      ) : (
        <>
          {/* Tip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--primary-bg)', borderRadius: 8, marginBottom: 16, fontSize: '0.8rem', color: 'var(--primary-dark)', fontWeight: 500 }}>
            <FiInfo size={14} /> Drag & drop cards between columns or use the action button to advance tasks
          </div>

          <div className="kanban-board">
            {COLUMNS.map(col => (
              <div
                key={col.key}
                className="kanban-col"
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(col.key)}
              >
                <div className="kanban-col-header" style={{ borderBottom: `2px solid ${col.dot}` }}>
                  <div className="kanban-col-title" style={{ color: col.color }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.dot, display: 'inline-block' }} />
                    {col.label}
                  </div>
                  <span className="kanban-col-count">{getCol(col.key).length}</span>
                </div>

                <div className="kanban-cards">
                  {getCol(col.key).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px 8px', color: 'var(--gray-300)', fontSize: '0.8rem' }}>Empty</div>
                  )}
                  {getCol(col.key).map(task => {
                    const p = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
                    return (
                      <div
                        key={task.id}
                        className="kanban-card"
                        draggable
                        onDragStart={() => handleDragStart(task)}
                        style={{ borderLeft: `3px solid ${col.dot}` }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div className="kanban-card-title" style={{ flex: 1 }}>{task.title}</div>
                          <button
                            style={{ width: 22, height: 22, border: 'none', borderRadius: 4, background: 'var(--gray-100)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)', flexShrink: 0 }}
                            onClick={() => setSelected(task)}
                          >
                            <FiEdit2 size={10} />
                          </button>
                        </div>

                        {task.description && (
                          <p style={{ fontSize: '0.73rem', color: 'var(--gray-400)', lineHeight: 1.4, marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {task.description}
                          </p>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ background: p.bg, color: p.color, padding: '2px 7px', borderRadius: 99, fontSize: '0.67rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <FiFlag size={9} />{task.priority}
                          </span>
                          {task.due_date && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: isOverdue ? 'var(--danger)' : 'var(--gray-400)' }}>
                              <FiCalendar size={10} />
                              <span style={{ fontSize: '0.72rem', fontWeight: isOverdue ? 700 : 400 }}>
                                {format(new Date(task.due_date), 'MMM d')}
                              </span>
                            </div>
                          )}
                        </div>

                        {task.status !== 'done' && (
                          <button
                            onClick={() => handleStatusChange(task, STATUS_FLOW[task.status])}
                            disabled={updating}
                            style={{ width: '100%', padding: '6px', borderRadius: 6, border: `1px solid ${col.dot}30`, background: `${col.dot}10`, color: col.color, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', transition: 'var(--transition)', fontFamily: 'inherit' }}
                          >
                            {STATUS_LABELS[task.status]}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Task Detail Modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Task Details"
        footer={
          selected?.status !== 'done' ? (
            <>
              <button className="btn btn-outline" onClick={() => setSelected(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => { handleStatusChange(selected, STATUS_FLOW[selected.status]); setSelected(null) }} disabled={updating}>
                {STATUS_LABELS[selected?.status]}
              </button>
            </>
          ) : (
            <button className="btn btn-outline" onClick={() => setSelected(null)}>Close</button>
          )
        }
      >
        {selected && (
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 10, color: 'var(--gray-900)' }}>{selected.title}</h3>
            {selected.description && (
              <p style={{ fontSize: '0.9rem', color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: 16, background: 'var(--gray-50)', padding: '12px', borderRadius: 8 }}>
                {selected.description}
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                ['Status', <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{selected.status}</span>],
                ['Priority', <span style={{ background: (PRIORITY_COLORS[selected.priority]||PRIORITY_COLORS.medium).bg, color: (PRIORITY_COLORS[selected.priority]||PRIORITY_COLORS.medium).color, padding: '2px 10px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700, textTransform: 'capitalize' }}>{selected.priority}</span>],
                ['Due Date', selected.due_date ? format(new Date(selected.due_date), 'MMMM d, yyyy') : '—'],
                ['Assigned By', selected.created_by_name || '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--gray-100)', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--gray-500)' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}

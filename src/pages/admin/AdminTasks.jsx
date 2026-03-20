import { useState, useEffect, useRef } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/common/Modal'
import api from '../../utils/api'
import { useToast } from '../../context/ToastContext'
import { FiPlus, FiCalendar, FiFlag, FiTrash2, FiEdit2 } from 'react-icons/fi'
import { format } from 'date-fns'

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: '#6b7280', bg: '#f9fafb', dot: '#9ca3af' },
  { key: 'inprogress', label: 'In Progress', color: '#1d4ed8', bg: '#eff6ff', dot: '#3b82f6' },
  { key: 'review', label: 'In Review', color: '#d97706', bg: '#fffbeb', dot: '#f59e0b' },
  { key: 'done', label: 'Done', color: '#065f46', bg: '#f0fdf4', dot: '#10b981' },
]

const PRIORITY_COLORS = {
  low: { color: '#6b7280', bg: '#f3f4f6' },
  medium: { color: '#1d4ed8', bg: '#dbeafe' },
  high: { color: '#d97706', bg: '#fef3c7' },
  urgent: { color: '#dc2626', bg: '#fee2e2' },
}

const EMPTY_FORM = { title: '', description: '', assigned_to: '', priority: 'medium', status: 'todo', due_date: '' }

export default function AdminTasks() {
  const [tasks, setTasks] = useState([])
  const [employees, setEmployees] = useState([])
  const [modal, setModal] = useState({ open: false, mode: 'add', data: null })
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [errors, setErrors] = useState({})
  const dragTask = useRef(null)
  const toast = useToast()

  const fetchAll = async () => {
    setLoading(true)
    try {
      const params = employeeFilter ? `?user_id=${employeeFilter}` : ''
      const [t, e] = await Promise.all([
        api.get(`/tasks/${params}`),
        api.get('/auth/users/'),
      ])
      setTasks(t.data)
      setEmployees(e.data.filter(u => u.role === 'employee'))
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [employeeFilter])

  const getCol = (key) => tasks.filter(t => t.status === key)

  const openAdd = (status = 'todo') => {
    setForm({ ...EMPTY_FORM, status })
    setErrors({})
    setModal({ open: true, mode: 'add', data: null })
  }

  const openEdit = (task) => {
    setForm({ ...task, assigned_to: task.assigned_to, due_date: task.due_date || '' })
    setErrors({})
    setModal({ open: true, mode: 'edit', data: task })
  }

  const handleSave = async () => {
    const newErrors = {}
    if (!form.title.trim()) newErrors.title = 'Task title is required'
    else if (form.title.trim().length < 3) newErrors.title = 'Title must be at least 3 characters'
    if (!form.assigned_to) newErrors.assigned_to = 'Please select an employee to assign'
    if (form.due_date && new Date(form.due_date) < new Date(new Date().toDateString())) newErrors.due_date = 'Due date cannot be in the past'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); toast('Please fix the errors below', 'error'); return }
    setErrors({})
    setSaving(true)
    try {
      if (modal.mode === 'add') {
        await api.post('/tasks/', form)
        toast('Task created', 'success')
      } else {
        await api.patch(`/tasks/${modal.data.id}/`, form)
        toast('Task updated', 'success')
      }
      setModal({ open: false, mode: 'add', data: null })
      fetchAll()
    } catch (e) {
      toast(Object.values(e.response?.data || {})[0]?.[0] || 'Error saving task', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return
    try {
      await api.delete(`/tasks/${id}/`)
      toast('Task deleted', 'success')
      fetchAll()
    } catch { toast('Error deleting task', 'error') }
  }

  const handleDragStart = (task) => { dragTask.current = task }

  const handleDrop = async (newStatus) => {
    if (!dragTask.current || dragTask.current.status === newStatus) return
    try {
      await api.patch(`/tasks/${dragTask.current.id}/`, { status: newStatus })
      setTasks(prev => prev.map(t => t.id === dragTask.current.id ? { ...t, status: newStatus } : t))
      toast(`Moved to ${newStatus}`, 'info')
    } catch { toast('Error updating task', 'error') }
    dragTask.current = null
  }

  return (
    <DashboardLayout title="Tasks">
      <div className="d-flex justify-between align-center mb-3" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--gray-900)' }}>Task Board</h2>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', marginTop: 2 }}>{tasks.length} total tasks</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select className="select-filter" value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}>
            <option value="">All Employees</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => openAdd()}>
            <FiPlus /> New Task
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : (
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
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className="kanban-col-count">{getCol(col.key).length}</span>
                  <button
                    style={{ width: 24, height: 24, border: 'none', borderRadius: 6, background: 'var(--gray-200)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)' }}
                    onClick={() => openAdd(col.key)}
                    title="Add task"
                  >
                    <FiPlus size={12} />
                  </button>
                </div>
              </div>

              <div className="kanban-cards">
                {getCol(col.key).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 8px', color: 'var(--gray-300)', fontSize: '0.8rem' }}>
                    Drop tasks here
                  </div>
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
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                        <div className="kanban-card-title" style={{ flex: 1 }}>{task.title}</div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button style={{ width: 22, height: 22, border: 'none', borderRadius: 4, background: 'var(--gray-100)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)' }} onClick={() => openEdit(task)}>
                            <FiEdit2 size={11} />
                          </button>
                          <button style={{ width: 22, height: 22, border: 'none', borderRadius: 4, background: 'var(--danger-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }} onClick={() => handleDelete(task.id)}>
                            <FiTrash2 size={11} />
                          </button>
                        </div>
                      </div>

                      {task.description && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', lineHeight: 1.4, marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {task.description}
                        </p>
                      )}

                      <div className="kanban-card-meta">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ background: p.bg, color: p.color, padding: '2px 7px', borderRadius: 99, fontSize: '0.68rem', fontWeight: 700, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <FiFlag size={9} />{task.priority}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          {task.due_date && (
                            <div className="kanban-card-due" style={{ color: isOverdue ? 'var(--danger)' : 'var(--gray-400)' }}>
                              <FiCalendar size={10} />
                              <span style={{ fontSize: '0.72rem', fontWeight: isOverdue ? 700 : 400 }}>
                                {format(new Date(task.due_date), 'MMM d')}
                              </span>
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            {task.assigned_to_image ? (
                              <img src={task.assigned_to_image} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--gray-200)', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.55rem', fontWeight: 700 }}>
                                {task.assigned_to_name?.[0] || 'U'}
                              </div>
                            )}
                            <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{task.assigned_to_name?.split(' ')[0]}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, mode: 'add', data: null })}
        title={modal.mode === 'add' ? 'Create New Task' : 'Edit Task'}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setModal({ open: false, mode: 'add', data: null })}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : (modal.mode === 'add' ? 'Create Task' : 'Save Changes')}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Task Title *</label>
          <input
            value={form.title}
            onChange={e => { setForm(p => ({ ...p, title: e.target.value })); setErrors(p => ({ ...p, title: '' })) }}
            placeholder="Enter task title..."
            style={{ border: errors.title ? '1.5px solid var(--danger)' : undefined }}
          />
          {errors.title && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>⚠️ {errors.title}</p>}
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the task..." />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Assign To *</label>
            <select
              value={form.assigned_to}
              onChange={e => { setForm(p => ({ ...p, assigned_to: e.target.value })); setErrors(p => ({ ...p, assigned_to: '' })) }}
              style={{ border: errors.assigned_to ? '1.5px solid var(--danger)' : undefined }}
            >
              <option value="">Select employee</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
            {errors.assigned_to && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>⚠️ {errors.assigned_to}</p>}
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              <option value="todo">To Do</option>
              <option value="inprogress">In Progress</option>
              <option value="review">In Review</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div className="form-group">
            <label>Due Date</label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => { setForm(p => ({ ...p, due_date: e.target.value })); setErrors(p => ({ ...p, due_date: '' })) }}
              style={{ border: errors.due_date ? '1.5px solid var(--danger)' : undefined }}
            />
            {errors.due_date && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>⚠️ {errors.due_date}</p>}
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
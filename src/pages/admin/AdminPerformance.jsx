import { useState, useEffect, useRef } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import api from '../../utils/api'
import { useToast } from '../../context/ToastContext'
import { FiZap, FiDownload } from 'react-icons/fi'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

async function callGroq(apiKey, prompt) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error: ${response.status}`)
  }
  const data = await response.json()
  return data.choices[0].message.content
}

export default function AdminPerformance() {
  const [employees, setEmployees] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('groq_api_key') || '')
  const [showKey, setShowKey] = useState(!localStorage.getItem('groq_api_key'))
  const [keySaved, setKeySaved] = useState(!!localStorage.getItem('groq_api_key'))
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const reportRef = useRef()
  const toast = useToast()

  useEffect(() => {
    api.get('/auth/users/').then(({ data }) => setEmployees(data.filter(u => u.role === 'employee')))
  }, [])

  const handleGenerate = async () => {
    if (!selectedUser) { toast('Please select an employee', 'error'); return }
    if (!apiKey) { toast('Please enter your Groq API key', 'error'); return }
    localStorage.setItem('groq_api_key', apiKey)
    setKeySaved(true)
    setShowKey(false)
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const emp = employees.find(e => e.id === parseInt(selectedUser))
      const today = new Date()
      const [attRes, tasksRes, leavesRes] = await Promise.all([
        api.get(`/attendance/?user_id=${selectedUser}&month=${month}&year=${year}`),
        api.get(`/tasks/?user_id=${selectedUser}`),
        api.get(`/leaves/?user_id=${selectedUser}`),
      ])
      const attendance = attRes.data
      const tasks = tasksRes.data
      const leaves = leavesRes.data
      const checkIns = attendance.filter(a => a.check_in).map(a => { const [h,m] = a.check_in.split(':').map(Number); return h*60+m })
      const avgCheckin = checkIns.length ? `${String(Math.floor(checkIns.reduce((a,b)=>a+b,0)/checkIns.length/60)).padStart(2,'0')}:${String(Math.round(checkIns.reduce((a,b)=>a+b,0)/checkIns.length)%60).padStart(2,'0')}` : null
      const ed = {
        name: `${emp.first_name} ${emp.last_name}`, position: emp.position||'Employee', department: emp.department||'General', month, year,
        attendance: { present: attendance.filter(a=>a.status==='present').length, late: attendance.filter(a=>a.status==='late').length, absent: attendance.filter(a=>a.status==='absent').length, half_day: attendance.filter(a=>a.status==='half_day').length, avg_checkin: avgCheckin },
        tasks: { done: tasks.filter(t=>t.status==='done').length, inprogress: tasks.filter(t=>t.status==='inprogress').length, review: tasks.filter(t=>t.status==='review').length, todo: tasks.filter(t=>t.status==='todo').length, overdue: tasks.filter(t=>['todo','inprogress'].includes(t.status)&&t.due_date&&new Date(t.due_date)<today).length, total: tasks.length },
        leaves: { total_days: leaves.filter(l=>l.status==='approved').reduce((s,l)=>s+l.days_count,0), types: leaves.filter(l=>l.status==='approved').map(l=>l.leave_type), pending: leaves.filter(l=>l.status==='pending').length },
      }
      const prompt = `You are an HR manager. Generate a performance summary for ${ed.name} (${ed.position}, ${ed.department}) for ${MONTHS[month-1]} ${year}.
Attendance: Present=${ed.attendance.present}, Late=${ed.attendance.late}, Absent=${ed.attendance.absent}, AvgCheckIn=${ed.attendance.avg_checkin||'N/A'}
Tasks: Done=${ed.tasks.done}, InProgress=${ed.tasks.inprogress}, Overdue=${ed.tasks.overdue}, Total=${ed.tasks.total}
Leaves: ${ed.leaves.total_days} days (${ed.leaves.types.join(',')||'none'})
Write sections: 1.ATTENDANCE ANALYSIS 2.TASK PERFORMANCE 3.LEAVE PATTERN 4.OVERALL RATING 5.AI RECOMMENDATIONS. Use emojis.`
      const summary = await callGroq(apiKey, prompt)
      setResult({ summary, employee: { name: ed.name, position: ed.position, department: ed.department }, period: { month, year }, stats: { attendance: ed.attendance, tasks: ed.tasks, leaves: ed.leaves } })
      toast('Performance report generated!', 'success')
    } catch (e) {
      setError(e.message || 'Failed to generate report')
      toast(e.message || 'Error', 'error')
    } finally { setLoading(false) }
  }

  const handlePrint = () => {
    const content = reportRef.current?.innerHTML
    if (!content) return
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>Performance Report</title><style>body{font-family:'Segoe UI',sans-serif;max-width:800px;margin:40px auto;color:#1f2937;line-height:1.8;}@media print{body{margin:20px;}}</style></head><body>${content}</body></html>`)
    win.document.close()
    win.print()
  }

  const selectedEmp = employees.find(e => e.id === parseInt(selectedUser))

  return (
    <DashboardLayout title="AI Performance">
      <div className="d-flex justify-between align-center mb-3" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--gray-900)' }}>🤖 AI Performance Summary</h2>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', marginTop: 2 }}>Powered by Groq AI (Llama 3)</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: result ? '360px 1fr' : '400px 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* API Key */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">🔑 Groq API Key</span>
              <button className="btn btn-outline btn-sm" onClick={() => { setShowKey(!showKey); setKeySaved(false) }}>
                {keySaved ? '✏️ Change' : showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="card-body">
              {keySaved && !showKey ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--success-bg)', borderRadius: 8 }}>
                  <span>✅</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#065f46' }}>API Key Saved</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {apiKey.slice(0,8)}...{apiKey.slice(-4)}&nbsp;
                      <button onClick={() => { localStorage.removeItem('groq_api_key'); setApiKey(''); setKeySaved(false); setShowKey(true) }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Remove</button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="gsk_..." style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontFamily: 'monospace', fontSize: '0.8rem', marginBottom: 8 }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', margin: 0 }}>Get from <a href="https://console.groq.com" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>console.groq.com</a></p>
                    {apiKey && <button className="btn btn-primary btn-sm" onClick={() => { localStorage.setItem('groq_api_key', apiKey); setKeySaved(true); setShowKey(false) }}>Save Key</button>}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Employee */}
          <div className="card">
            <div className="card-header"><span className="card-title">👤 Select Employee</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '0.875rem' }}>
                <option value="">-- Select Employee --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.department}</option>)}
              </select>

              {selectedEmp && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--primary-bg)', borderRadius: 8 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                    {selectedEmp.first_name?.[0]}{selectedEmp.last_name?.[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{selectedEmp.first_name} {selectedEmp.last_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{selectedEmp.position} · {selectedEmp.department}</div>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: 6, display: 'block' }}>Month</label>
                  <select value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '0.875rem' }}>
                    {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: 6, display: 'block' }}>Year</label>
                  <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '0.875rem' }}>
                    {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleGenerate} disabled={loading || !selectedUser || !apiKey} style={{ width: '100%', padding: '12px', justifyContent: 'center' }}>
                {loading ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Generating...</span>
                : <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><FiZap size={16} /> Generate AI Report</span>}
              </button>
              {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: '0.82rem' }}>❌ {error}</div>}
            </div>
          </div>
        </div>

        {result && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">📊 Performance Report</span>
              <button className="btn btn-outline btn-sm" onClick={handlePrint}><FiDownload size={13} /> Print</button>
            </div>
            <div className="card-body" ref={reportRef}>
              <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#4f46e5)', borderRadius: 12, padding: '20px 24px', marginBottom: 20, color: '#fff', display: 'flex', alignItems: 'center', gap: 16 }}>
                {selectedEmp?.profile_image ? (
                  <img src={selectedEmp.profile_image} alt="profile" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '3px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.5rem', fontWeight: 700, flexShrink: 0 }}>
                    {result.employee.name?.[0]}
                  </div>
                )}
                <div>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>{result.employee.name}</h1>
                  <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 10px', fontSize: '0.875rem' }}>{result.employee.position} · {result.employee.department}</p>
                  <span style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)', padding: '3px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 600 }}>📅 {MONTHS[result.period.month-1]} {result.period.year}</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                {[{label:'Present Days',value:result.stats.attendance.present,color:'#10b981',bg:'#d1fae5',icon:'✅'},{label:'Tasks Done',value:result.stats.tasks.done,color:'#4f46e5',bg:'#eef2ff',icon:'🎯'},{label:'Leave Days',value:result.stats.leaves.total_days,color:'#f59e0b',bg:'#fef3c7',icon:'🌴'}].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--gray-50)', borderRadius: 12, padding: '20px 24px', border: '1px solid var(--gray-100)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiZap size={12} color="var(--primary)" /> AI Analysis
                </div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: 1.8 }}>{result.summary}</div>
              </div>
            </div>
          </div>
        )}
        {!result && !loading && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: 16 }}>🤖</div>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--gray-400)' }}>Select an employee and generate report</p>
            </div>
          </div>
        )}
        {loading && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, border: '4px solid var(--gray-200)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Groq AI is analyzing...</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
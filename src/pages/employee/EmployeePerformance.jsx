import { useState, useRef } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import api from '../../utils/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { FiZap, FiDownload } from 'react-icons/fi'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

async function callGroq(apiKey, prompt) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'llama-3.1-8b-instant', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error: ${response.status}`)
  }
  const data = await response.json()
  return data.choices[0].message.content
}

export default function EmployeePerformance() {
  const { user } = useAuth()
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

  const handleGenerate = async () => {
    if (!apiKey) { toast('Please enter your Groq API key', 'error'); return }
    localStorage.setItem('groq_api_key', apiKey)
    setKeySaved(true)
    setShowKey(false)
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const today = new Date()
      const [attRes, tasksRes, leavesRes, meRes] = await Promise.all([
        api.get(`/attendance/?month=${month}&year=${year}`),
        api.get('/tasks/'),
        api.get('/leaves/'),
        api.get('/auth/me/'),
      ])
      const me = meRes.data
      const attendance = attRes.data
      const tasks = tasksRes.data
      const leaves = leavesRes.data
      const checkIns = attendance.filter(a => a.check_in).map(a => { const [h,m] = a.check_in.split(':').map(Number); return h*60+m })
      const avgCheckin = checkIns.length ? `${String(Math.floor(checkIns.reduce((a,b)=>a+b,0)/checkIns.length/60)).padStart(2,'0')}:${String(Math.round(checkIns.reduce((a,b)=>a+b,0)/checkIns.length)%60).padStart(2,'0')}` : null
      const ed = {
        name: `${me.first_name} ${me.last_name}`, position: me.position||'Employee', department: me.department||'General',
        attendance: { present: attendance.filter(a=>a.status==='present').length, late: attendance.filter(a=>a.status==='late').length, absent: attendance.filter(a=>a.status==='absent').length, avg_checkin: avgCheckin },
        tasks: { done: tasks.filter(t=>t.status==='done').length, inprogress: tasks.filter(t=>t.status==='inprogress').length, overdue: tasks.filter(t=>['todo','inprogress'].includes(t.status)&&t.due_date&&new Date(t.due_date)<today).length, total: tasks.length },
        leaves: { total_days: leaves.filter(l=>l.status==='approved').reduce((s,l)=>s+l.days_count,0), types: leaves.filter(l=>l.status==='approved').map(l=>l.leave_type) },
      }
      const prompt = `You are an HR manager. Generate a performance summary for ${ed.name} (${ed.position}, ${ed.department}) for ${MONTHS[month-1]} ${year}.
Attendance: Present=${ed.attendance.present}, Late=${ed.attendance.late}, Absent=${ed.attendance.absent}, AvgCheckIn=${ed.attendance.avg_checkin||'N/A'}
Tasks: Done=${ed.tasks.done}, InProgress=${ed.tasks.inprogress}, Overdue=${ed.tasks.overdue}, Total=${ed.tasks.total}
Leaves: ${ed.leaves.total_days} days (${ed.leaves.types.join(',')||'none'})
Write sections: 1.ATTENDANCE ANALYSIS 2.TASK PERFORMANCE 3.LEAVE PATTERN 4.OVERALL RATING 5.AI RECOMMENDATIONS. Use emojis.`
      const summary = await callGroq(apiKey, prompt)
      setResult({ summary, employee: { name: ed.name, position: ed.position, department: ed.department }, period: { month, year }, stats: { attendance: ed.attendance, tasks: ed.tasks, leaves: ed.leaves } })
      toast('Your performance report is ready!', 'success')
    } catch (e) {
      setError(e.message || 'Failed to generate report')
      toast(e.message || 'Error', 'error')
    } finally { setLoading(false) }
  }

  const handlePrint = () => {
    const content = reportRef.current?.innerHTML
    if (!content) return
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>My Performance</title><style>body{font-family:'Segoe UI',sans-serif;max-width:800px;margin:40px auto;color:#1f2937;line-height:1.8;}@media print{body{margin:20px;}}</style></head><body>${content}</body></html>`)
    win.document.close()
    win.print()
  }

  return (
    <DashboardLayout title="My Performance">
      <div className="mb-3">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--gray-900)' }}>🤖 My Performance Report</h2>
        <p style={{ color: 'var(--gray-400)', fontSize: '0.85rem', marginTop: 2 }}>AI-powered analysis powered by Groq</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: result ? '300px 1fr' : '380px 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">⚙️ Settings</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🔑 Groq API Key</span>
                  <button style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }} onClick={() => { setShowKey(!showKey); setKeySaved(false) }}>
                    {keySaved ? '✏️ Change' : showKey ? 'Hide' : 'Show'}
                  </button>
                </label>
                {keySaved && !showKey ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--success-bg)', borderRadius: 8 }}>
                    <span>✅</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#065f46' }}>API Key Saved</div>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                        {apiKey.slice(0,8)}...{apiKey.slice(-4)}&nbsp;
                        <button onClick={() => { localStorage.removeItem('groq_api_key'); setApiKey(''); setKeySaved(false); setShowKey(true) }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>Remove</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="gsk_..." style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontFamily: 'monospace', fontSize: '0.8rem', marginBottom: 6 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: '0.72rem', color: 'var(--gray-400)', margin: 0 }}>Get from <a href="https://console.groq.com" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>console.groq.com</a></p>
                      {apiKey && <button className="btn btn-primary btn-sm" onClick={() => { localStorage.setItem('groq_api_key', apiKey); setKeySaved(true); setShowKey(false) }}>Save Key</button>}
                    </div>
                  </>
                )}
              </div>

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

              <button className="btn btn-primary" onClick={handleGenerate} disabled={loading || !apiKey} style={{ width: '100%', padding: '12px', justifyContent: 'center' }}>
                {loading ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Analyzing...</span>
                : <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><FiZap size={16} /> Generate My Report</span>}
              </button>
              {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: 'var(--danger)', fontSize: '0.82rem' }}>❌ {error}</div>}
            </div>
          </div>
        </div>

        {result ? (
          <div className="card">
            <div className="card-header">
              <span className="card-title">📊 {MONTHS[result.period.month-1]} {result.period.year}</span>
              <button className="btn btn-outline btn-sm" onClick={handlePrint}><FiDownload size={13} /> Print</button>
            </div>
            <div className="card-body" ref={reportRef}>
              <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#4f46e5)', borderRadius: 12, padding: '20px 24px', marginBottom: 20, color: '#fff', display: 'flex', alignItems: 'center', gap: 16 }}>
                {user?.profile_image ? (
                  <img src={user.profile_image} alt="profile" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.3)', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '3px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.4rem', fontWeight: 700, flexShrink: 0 }}>
                    {result.employee.name?.[0]}
                  </div>
                )}
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{result.employee.name}</h2>
                  <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '0.875rem' }}>{result.employee.position} · {result.employee.department}</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                {[{label:'Present',value:result.stats.attendance.present,color:'#10b981',bg:'#d1fae5',icon:'✅'},{label:'Tasks Done',value:result.stats.tasks.done,color:'#4f46e5',bg:'#eef2ff',icon:'🎯'},{label:'Leave Days',value:result.stats.leaves.total_days,color:'#f59e0b',bg:'#fef3c7',icon:'🌴'}].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--gray-50)', borderRadius: 12, padding: '20px 24px', border: '1px solid var(--gray-100)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>⚡ AI Analysis</div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: 'var(--gray-700)', lineHeight: 1.8 }}>{result.summary}</div>
              </div>
            </div>
          </div>
        ) : !loading && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: 16 }}>🤖</div>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--gray-400)' }}>Your AI report will appear here</p>
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
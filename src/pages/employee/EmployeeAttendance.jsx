import { useState, useEffect, useRef, useCallback } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import api from '../../utils/api'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWeekend } from 'date-fns'
import { FiChevronLeft, FiChevronRight, FiCamera, FiClock } from 'react-icons/fi'

function ManualTab({ todayAtt, onCheckin, checkingIn, currentTime }) {
  const status = !todayAtt ? 'not_started'
    : todayAtt.check_in && !todayAtt.check_out ? 'checked_in'
    : todayAtt.check_in && todayAtt.check_out ? 'checked_out' : 'not_started'
  return (
    <div className={`checkin-card ${status === 'checked_in' ? 'checked-in' : status === 'checked_out' ? 'checked-out' : ''}`}>
      <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: 4 }}>
        {status === 'not_started' ? '🟢 Ready to check in' : status === 'checked_in' ? '🔵 Currently working' : '⚫ Work day completed'}
      </div>
      <div className="checkin-time">{format(currentTime, 'HH:mm:ss')}</div>
      <div className="checkin-label">{format(currentTime, 'EEEE, MMMM d, yyyy')}</div>
      {todayAtt && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '12px 0' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Check In</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{todayAtt.check_in?.slice(0,5) || '—'}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Check Out</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{todayAtt.check_out?.slice(0,5) || '—'}</div>
          </div>
        </div>
      )}
      {status === 'not_started' && <button className="btn-checkin" style={{ width: '100%' }} onClick={() => onCheckin('check_in')} disabled={checkingIn}>{checkingIn ? 'Processing...' : '▶ Check In Now'}</button>}
      {status === 'checked_in' && <button className="btn-checkin" style={{ width: '100%' }} onClick={() => onCheckin('check_out')} disabled={checkingIn}>{checkingIn ? 'Processing...' : '⏹ Check Out'}</button>}
      {status === 'checked_out' && <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '12px 16px', textAlign: 'center', fontSize: '0.875rem' }}>✅ Have a great rest of your day!</div>}
    </div>
  )
}

function FaceTab({ onCheckin, checkingIn, todayAtt, user }) {
  const videoRef = useRef()
  const streamRef = useRef()
  const intervalRef = useRef()
  const [phase, setPhase] = useState('idle') // idle | starting | scanning | success | error
  const [msg, setMsg] = useState('')
  const [blinks, setBlinks] = useState(0)

  const checkStatus = !todayAtt ? 'not_started'
    : todayAtt.check_in && !todayAtt.check_out ? 'checked_in'
    : todayAtt.check_in && todayAtt.check_out ? 'checked_out' : 'not_started'

  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
  }, [])

  useEffect(() => () => stop(), [stop])

  const start = async () => {
    if (!user?.profile_image) {
      setPhase('error')
      setMsg('No profile photo. Ask admin to upload your photo first.')
      return
    }

    setPhase('starting')
    setMsg('Starting camera...')
    setBlinks(0)

    try {
      // Step 1: Get camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      const video = videoRef.current
      video.srcObject = stream
      await video.play()
      setMsg('Camera ready! Loading face recognition...')

      // Step 2: Load face-api
      const faceapi = await import('face-api.js')
      const URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'
      setMsg('Loading AI models (please wait)...')
      await faceapi.nets.ssdMobilenetv1.loadFromUri(URL)
      await faceapi.nets.tinyFaceDetector.loadFromUri(URL)
      await faceapi.nets.faceLandmark68Net.loadFromUri(URL)
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri(URL)
      await faceapi.nets.faceRecognitionNet.loadFromUri(URL)
      setMsg('Models ready! Loading your reference photo...')

      // Step 3: Get reference face
      const img = document.createElement('img')
      img.crossOrigin = 'anonymous'
      img.src = user.profile_image + '?t=' + Date.now()
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; setTimeout(rej, 8000) })
      const refResult = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
      if (!refResult) {
        setPhase('error')
        setMsg('Could not find face in your profile photo. Ask admin to upload a clear front-facing photo.')
        stop()
        return
      }

      setPhase('scanning')
      setMsg('Blink 2 times slowly to verify you are live...')
      let blinkCount = 0
      let eyeOpen = true
      let livenessOk = false

      // Step 4: Scan loop
      // Create hidden canvas for detection (not mirrored)
      const snapCanvas = document.createElement('canvas')
      const snapCtx = snapCanvas.getContext('2d')

      intervalRef.current = setInterval(async () => {
        if (!video || video.readyState < 3 || video.videoWidth === 0) return
        try {
          // Draw video frame to canvas (no mirror - for accurate detection)
          snapCanvas.width = video.videoWidth
          snapCanvas.height = video.videoHeight
          snapCtx.drawImage(video, 0, 0)

          // Detect from canvas snapshot
          const detOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.2 })
          const result = await faceapi.detectSingleFace(snapCanvas, detOptions)
            .withFaceLandmarks().withFaceDescriptor()

          if (!result) {
            setMsg('No face detected (' + video.videoWidth + 'x' + video.videoHeight + ') — move closer')
            return
          }

          // Blink check using EAR
          if (!livenessOk) {
            try {
              const lm = result.landmarks
              const le = lm.getLeftEye()
              const re = lm.getRightEye()
              const earL = (Math.hypot(le[1].x-le[5].x,le[1].y-le[5].y) + Math.hypot(le[2].x-le[4].x,le[2].y-le[4].y)) / (2*Math.hypot(le[0].x-le[3].x,le[0].y-le[3].y))
              const earR = (Math.hypot(re[1].x-re[5].x,re[1].y-re[5].y) + Math.hypot(re[2].x-re[4].x,re[2].y-re[4].y)) / (2*Math.hypot(re[0].x-re[3].x,re[0].y-re[3].y))
              const ear = (earL + earR) / 2
              console.log('EAR:', ear.toFixed(3), 'Blinks:', blinkCount)
              if (ear < 0.27 && eyeOpen) { blinkCount++; setBlinks(blinkCount); eyeOpen = false }
              else if (ear > 0.30) { eyeOpen = true }
            } catch(e) { console.warn('EAR error:', e) }

            if (blinkCount >= 2) { livenessOk = true; setMsg('Liveness verified! Matching your face...') }
            else { setMsg('Face found! Blink ' + blinkCount + '/2 — blink ' + (2-blinkCount) + ' more time' + (2-blinkCount>1?'s':'')); return }
          }

          // Face match
          const dist = faceapi.euclideanDistance(refResult.descriptor, result.descriptor)
          const conf = Math.max(0, Math.round((1-dist)*100))
          console.log('Distance:', dist.toFixed(3), 'Confidence:', conf + '%')
          setMsg('Matching... ' + conf + '% confidence')

          if (dist < 0.65) {
            clearInterval(intervalRef.current)
            setPhase('success')
            setMsg('Face matched! ' + conf + '% confidence')
            setTimeout(() => { onCheckin(checkStatus === 'not_started' ? 'check_in' : 'check_out'); stop() }, 1500)
          }
        } catch(e) { console.error('Detection error:', e) }
      }, 600)

    } catch (e) {
      setPhase('error')
      setMsg('Error: ' + e.message)
      stop()
    }
  }

  const handleStop = () => { stop(); setPhase('idle'); setBlinks(0) }

  if (checkStatus === 'checked_out') return (
    <div style={{ background: 'linear-gradient(135deg,#374151,#4b5563)', borderRadius: 16, padding: 28, textAlign: 'center', color: '#fff' }}>
      <div style={{ fontSize: '3rem', marginBottom: 8 }}>✅</div>
      <div style={{ fontWeight: 700 }}>Work day completed!</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Video — always visible when camera is on */}
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', maxWidth: 480, margin: '0 auto', width: '100%', minHeight: 240 }}>
        <video
          ref={videoRef}
          autoPlay muted playsInline
          style={{
            width: '100%',
            display: 'block',
            transform: 'scaleX(-1)',
            minHeight: 200,
          }}
        />
        {/* Overlays only when camera NOT running */}
        {phase === 'idle' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 10, borderRadius: 16 }}>
            <div style={{ fontSize: '3rem' }}>📷</div>
            <p style={{ fontWeight: 700 }}>Face Recognition</p>
            <p style={{ fontSize: '0.8rem', opacity: 0.6, textAlign: 'center', padding: '0 20px' }}>Blink twice for liveness, then face matched</p>
          </div>
        )}
        {phase === 'starting' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 12, borderRadius: 16, padding: 20, textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, border: '4px solid rgba(255,255,255,0.2)', borderTopColor: '#818cf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: '0.875rem' }}>{msg}</p>
          </div>
        )}
        {phase === 'success' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(16,185,129,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 8, borderRadius: 16 }}>
            <div style={{ fontSize: '3rem' }}>✅</div>
            <p style={{ fontWeight: 800, fontSize: '1.2rem' }}>Face Matched!</p>
            <p style={{ fontSize: '0.85rem', opacity: 0.9 }}>{msg}</p>
          </div>
        )}
        {phase === 'error' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 8, borderRadius: 16, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem' }}>❌</div>
            <p style={{ fontWeight: 700 }}>Error</p>
            <p style={{ fontSize: '0.82rem', opacity: 0.9 }}>{msg}</p>
          </div>
        )}
        {/* Scanning info bar — shown below video */}
        {phase === 'scanning' && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
              {[0,1].map(i => (
                <div key={i} style={{ width: 30, height: 30, borderRadius: '50%', background: blinks > i ? '#10b981' : 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem', transition: 'background 0.3s' }}>
                  {blinks > i ? '✓' : i+1}
                </div>
              ))}
            </div>
            <p style={{ color: '#fff', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>{msg}</p>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div style={{ maxWidth: 480, margin: '0 auto', width: '100%', display: 'flex', gap: 10 }}>
        {(phase === 'idle' || phase === 'error') && (
          <button className="btn btn-primary" style={{ flex: 1, padding: '12px', justifyContent: 'center' }} onClick={start} disabled={checkingIn}>
            <FiCamera size={16} /> {checkStatus === 'checked_in' ? ' Face Scan Check Out' : ' Start Face Scan'}
          </button>
        )}
        {(phase === 'scanning' || phase === 'starting') && (
          <button onClick={handleStop} style={{ flex: 1, padding: '12px', border: '1.5px solid var(--danger)', background: 'white', color: 'var(--danger)', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', fontSize: '0.9rem' }}>
            ⏹ Stop Camera
          </button>
        )}
      </div>

      {phase === 'idle' && (
        <div style={{ background: 'var(--primary-bg)', borderRadius: 10, padding: '12px 16px', fontSize: '0.8rem', color: 'var(--primary-dark)', maxWidth: 480, margin: '0 auto', width: '100%' }}>
          <strong>Tips:</strong> Good lighting · Face camera directly · Blink slowly · Remove glasses if needed
        </div>
      )}
    </div>
  )
}

export default function EmployeeAttendance() {
  const [activeTab, setActiveTab] = useState('manual')
  const [records, setRecords] = useState([])
  const [todayAtt, setTodayAtt] = useState(null)
  const [checkingIn, setCheckingIn] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [viewMonth, setViewMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const toast = useToast()

  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t) }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [att, today] = await Promise.all([
        api.get(`/attendance/?month=${viewMonth.getMonth()+1}&year=${viewMonth.getFullYear()}`),
        api.get('/attendance/check/'),
      ])
      setRecords(att.data)
      setTodayAtt(today.data?.status ? today.data : null)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [viewMonth])

  const handleCheckin = async (action) => {
    setCheckingIn(true)
    try {
      const { data } = await api.post('/attendance/check/', { action })
      toast(data.message, 'success')
      fetchData()
      setActiveTab('manual')
    } catch (e) { toast(e.response?.data?.error || 'Error', 'error') }
    finally { setCheckingIn(false) }
  }

  const handleExport = async (type) => {
    try {
      const token = localStorage.getItem('access_token')
      const m = viewMonth.getMonth()+1, y = viewMonth.getFullYear()
      const res = await fetch(`https://priyak.pythonanywhere.com/api/attendance/export/${type}/?month=${m}&year=${y}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) { alert('Export failed'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `attendance_${y}_${m}.${type==='excel'?'xlsx':'pdf'}`; a.click(); URL.revokeObjectURL(url)
    } catch(e) { alert('Export error: '+e.message) }
  }

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) })
  const getRecord = (date) => records.find(r => isSameDay(new Date(r.date), date))
  const summary = { present: records.filter(r=>r.status==='present').length, late: records.filter(r=>r.status==='late').length, absent: records.filter(r=>r.status==='absent').length, halfDay: records.filter(r=>r.status==='half_day').length }

  return (
    <DashboardLayout title="Attendance">
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className="btn btn-outline btn-sm" onClick={() => handleExport('excel')} style={{ color: '#166534', borderColor: '#16a34a' }}>⬇ Excel</button>
        <button className="btn btn-outline btn-sm" onClick={() => handleExport('pdf')} style={{ color: '#991b1b', borderColor: '#ef4444' }}>⬇ PDF</button>
      </div>

      <div className="grid-1-2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tabs */}
          <div style={{ background: 'var(--gray-100)', borderRadius: 12, padding: 4, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {[{key:'manual',icon:<FiClock size={15}/>,label:'Manual'},{key:'face',icon:<FiCamera size={15}/>,label:'Face Scan'}].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{ padding: '10px 8px', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s', background: activeTab===tab.key?'#fff':'transparent', color: activeTab===tab.key?'var(--primary)':'var(--gray-500)', fontWeight: activeTab===tab.key?700:500, boxShadow: activeTab===tab.key?'var(--shadow-sm)':'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontFamily: 'var(--font-primary)' }}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'manual' && <ManualTab todayAtt={todayAtt} onCheckin={handleCheckin} checkingIn={checkingIn} currentTime={currentTime} />}
          {activeTab === 'face' && <FaceTab onCheckin={handleCheckin} checkingIn={checkingIn} todayAtt={todayAtt} user={user} />}

          {/* Summary */}
          <div className="card">
            <div className="card-header"><span className="card-title">Monthly Summary</span><span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>{format(viewMonth, 'MMMM yyyy')}</span></div>
            <div className="card-body" style={{ paddingTop: 12 }}>
              {[{label:'Present',count:summary.present,color:'#10b981',bg:'#d1fae5',icon:'✅'},{label:'Late',count:summary.late,color:'#f59e0b',bg:'#fef3c7',icon:'⏰'},{label:'Absent',count:summary.absent,color:'#ef4444',bg:'#fee2e2',icon:'❌'},{label:'Half Day',count:summary.halfDay,color:'#06b6d4',bg:'#cffafe',icon:'🌓'}].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.icon}</div>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-700)' }}>{s.label}</span>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: '1.2rem', color: s.color }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="card">
          <div className="card-header">
            <button className="btn btn-outline btn-sm btn-icon" onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))}><FiChevronLeft /></button>
            <span className="card-title">{format(viewMonth, 'MMMM yyyy')}</span>
            <button className="btn btn-outline btn-sm btn-icon" onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))}><FiChevronRight /></button>
          </div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-400)', padding: '4px 0', textTransform: 'uppercase' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
              {Array.from({ length: startOfMonth(viewMonth).getDay() }).map((_,i) => <div key={i} />)}
              {daysInMonth.map(day => {
                const rec = getRecord(day)
                const isToday = isSameDay(day, new Date())
                const weekend = isWeekend(day)
                let bg = 'var(--gray-100)', color = weekend ? 'var(--gray-300)' : 'var(--gray-600)'
                if (rec) { const c = { present: ['#d1fae5','#065f46'], late: ['#fef3c7','#92400e'], absent: ['#fee2e2','#991b1b'], half_day: ['#cffafe','#164e63'] };[bg, color] = c[rec.status] || [bg, color] }
                return <div key={day.toString()} style={{ aspectRatio: '1', borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: isToday?800:500, color, border: isToday?'2px solid var(--primary)':'none' }} title={rec?rec.status:''}>{day.getDate()}</div>
              })}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
              {[{l:'Present',c:'#d1fae5'},{l:'Late',c:'#fef3c7'},{l:'Absent',c:'#fee2e2'},{l:'Half Day',c:'#cffafe'}].map(x => (
                <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 12, height: 12, borderRadius: 3, background: x.c }} /><span style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>{x.l}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><span className="card-title">Recent Records</span></div>
        <div>
          {records.slice(0,6).map(r => {
            let hours = '—'
            if (r.check_in && r.check_out) { const [ih,im]=r.check_in.split(':').map(Number),[oh,om]=r.check_out.split(':').map(Number),total=(oh*60+om)-(ih*60+im); if(total>0) hours=Math.floor(total/60)+'h '+(total%60)+'m' }
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: '1px solid var(--gray-100)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.status==='present'?'#10b981':r.status==='absent'?'#ef4444':r.status==='late'?'#f59e0b':'#06b6d4', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{format(new Date(r.date), 'EEE, MMM d')}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 1 }}>{r.check_in?.slice(0,5)||'—'} → {r.check_out?.slice(0,5)||'—'} · {hours}</div>
                </div>
                <span className={`badge badge-${r.status==='present'?'success':r.status==='absent'?'danger':r.status==='late'?'warning':'info'}`}>{r.status?.replace('_',' ')}</span>
              </div>
            )
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}
import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'

import SplashScreen from './components/SplashScreen'
import LoginPage from './pages/LoginPage'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminEmployees from './pages/admin/AdminEmployees'
import AdminAttendance from './pages/admin/AdminAttendance'
import AdminTasks from './pages/admin/AdminTasks'
import AdminLeaves from './pages/admin/AdminLeaves'
import AdminEmployeeView from './pages/admin/AdminEmployeeView'
import AdminPerformance from './pages/admin/AdminPerformance'

// Employee Pages
import EmployeeDashboard from './pages/employee/EmployeeDashboard'
import EmployeeProfile from './pages/employee/EmployeeProfile'
import EmployeeAttendance from './pages/employee/EmployeeAttendance'
import EmployeeTasks from './pages/employee/EmployeeTasks'
import EmployeeLeaves from './pages/employee/EmployeeLeaves'
import EmployeePerformance from './pages/employee/EmployeePerformance'

// Protected Route
function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard'} replace />
  }
  return children
}

// Root redirect
function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/employees" element={<ProtectedRoute requiredRole="admin"><AdminEmployees /></ProtectedRoute>} />
      <Route path="/admin/employees/:id" element={<ProtectedRoute requiredRole="admin"><AdminEmployeeView /></ProtectedRoute>} />
      <Route path="/admin/attendance" element={<ProtectedRoute requiredRole="admin"><AdminAttendance /></ProtectedRoute>} />
      <Route path="/admin/tasks" element={<ProtectedRoute requiredRole="admin"><AdminTasks /></ProtectedRoute>} />
      <Route path="/admin/leaves" element={<ProtectedRoute requiredRole="admin"><AdminLeaves /></ProtectedRoute>} />
      <Route path="/admin/performance" element={<ProtectedRoute requiredRole="admin"><AdminPerformance /></ProtectedRoute>} />

      {/* Employee Routes */}
      <Route path="/employee/dashboard" element={<ProtectedRoute requiredRole="employee"><EmployeeDashboard /></ProtectedRoute>} />
      <Route path="/employee/profile" element={<ProtectedRoute requiredRole="employee"><EmployeeProfile /></ProtectedRoute>} />
      <Route path="/employee/attendance" element={<ProtectedRoute requiredRole="employee"><EmployeeAttendance /></ProtectedRoute>} />
      <Route path="/employee/tasks" element={<ProtectedRoute requiredRole="employee"><EmployeeTasks /></ProtectedRoute>} />
      <Route path="/employee/leaves" element={<ProtectedRoute requiredRole="employee"><EmployeeLeaves /></ProtectedRoute>} />
      <Route path="/employee/performance" element={<ProtectedRoute requiredRole="employee"><EmployeePerformance /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 3200)
    return () => clearTimeout(t)
  }, [])

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          {showSplash && <SplashScreen />}
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
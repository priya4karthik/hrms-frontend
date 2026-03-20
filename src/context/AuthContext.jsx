import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me/')
      setUser(data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) fetchMe()
    else setLoading(false)
  }, [fetchMe])

  const login = async (credentials) => {
    const { data } = await api.post('/auth/login/', credentials)
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    await fetchMe()
    return data
  }

  const logout = () => {
    // Keep groq_api_key — no need to re-enter after every login
    const groqKey = localStorage.getItem('groq_api_key')
    localStorage.clear()
    if (groqKey) localStorage.setItem('groq_api_key', groqKey)
    setUser(null)
  }

  const updateUser = (updated) => setUser(prev => ({ ...prev, ...updated }))

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, fetchMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
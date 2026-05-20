import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, clearToken, getToken, setToken } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  async function refreshUser() {
    if (!getToken()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      setUser(await api('/api/auth/me'))
    } catch {
      clearToken()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  async function login(email, password) {
    const token = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    setToken(token.access_token)
    await refreshUser()
  }

  async function register(email, password, full_name) {
    const token = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, full_name }) })
    setToken(token.access_token)
    await refreshUser()
  }

  function logout() {
    clearToken()
    setUser(null)
  }

  const value = useMemo(() => ({ user, loading, login, register, logout, refreshUser }), [user, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

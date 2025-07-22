import React, { createContext, useContext, useEffect, useState } from 'react'
import { authService, AuthUser } from '../lib/auth'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ error: string | null }>
  register: (data: { email: string; password: string; name: string; phone: string }) => Promise<{ error: string | null }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial user
    authService.getCurrentUser().then((user) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      setUser(user)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    const { user: loggedInUser, error } = await authService.login({ email, password })
    if (loggedInUser) {
      setUser(loggedInUser)
    }
    setLoading(false)
    return { error }
  }

  const register = async (data: { email: string; password: string; name: string; phone: string }) => {
    setLoading(true)
    const { user: registeredUser, error } = await authService.register(data)
    if (registeredUser) {
      setUser(registeredUser)
    }
    setLoading(false)
    return { error }
  }

  const logout = async () => {
    setLoading(true)
    await authService.logout()
    setUser(null)
    setLoading(false)
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
import { supabase } from './supabase'
import { User } from './supabase'

export interface AuthUser extends User {
  email: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  phone: string
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) {
        return { user: null, error: error.message }
      }

      if (data.user) {
        // Get user profile from our users table
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (profileError) {
          return { user: null, error: 'Failed to fetch user profile' }
        }

        return { 
          user: { 
            ...profile, 
            email: data.user.email || credentials.email 
          }, 
          error: null 
        }
      }

      return { user: null, error: 'Login failed' }
    } catch (error) {
      return { user: null, error: 'An unexpected error occurred' }
    }
  }

  async register(userData: RegisterData): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      // First create auth user
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      })

      if (error) {
        return { user: null, error: error.message }
      }

      if (data.user) {
        // Create user profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              email: userData.email,
              name: userData.name,
              phone: userData.phone,
              role: 'CUSTOMER',
            },
          ])
          .select()
          .single()

        if (profileError) {
          return { user: null, error: 'Failed to create user profile' }
        }

        return { 
          user: { 
            ...profile, 
            email: userData.email 
          }, 
          error: null 
        }
      }

      return { user: null, error: 'Registration failed' }
    } catch (error) {
      return { user: null, error: 'An unexpected error occurred' }
    }
  }

  async logout(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut()
      return { error: error?.message || null }
    } catch (error) {
      return { error: 'Logout failed' }
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return null

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profile) return null

      return { ...profile, email: user.email || profile.email }
    } catch (error) {
      return null
    }
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = await this.getCurrentUser()
        callback(user)
      } else {
        callback(null)
      }
    })
  }
}

export const authService = new AuthService()
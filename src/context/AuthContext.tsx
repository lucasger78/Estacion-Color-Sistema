import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

// ── Tipos ──────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'vendedor'

export interface UserProfile {
  id:              string
  email:           string
  nombre_completo: string
  rol:             UserRole
  activo:          boolean
  creado_at:       string
}

interface AuthContextValue {
  session:       Session | null
  user:          User    | null
  profile:       UserProfile | null
  isLoading:     boolean
  isAdmin:       boolean
  isVendedor:    boolean
  signIn:        (email: string, password: string) => Promise<void>
  signUp:        (email: string, password: string, nombreCompleto: string) => Promise<void>
  signOut:       () => Promise<void>
  refreshProfile:() => Promise<void>
}

// ── Contexto ───────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]   = useState<Session | null>(null)
  const [user,    setUser]      = useState<User    | null>(null)
  const [profile, setProfile]   = useState<UserProfile | null>(null)
  const [isLoading, setLoading] = useState(true)

  // ── Cargar perfil desde public.usuarios ──
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[AuthContext] Error cargando perfil:', error.message)
      setProfile(null)
    } else {
      setProfile(data as UserProfile)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id)
  }, [user, fetchProfile])

  // ── Escuchar cambios de sesión ──
  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Suscribirse a cambios
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  // ── Acciones ──
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, nombreCompleto: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre_completo: nombreCompleto },
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setProfile(null)
  }

  const isAdmin    = profile?.rol === 'admin'
  const isVendedor = profile?.rol === 'vendedor'

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isLoading,
        isAdmin,
        isVendedor,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('[useAuth] Debe usarse dentro de <AuthProvider>')
  }
  return ctx
}

export default AuthContext

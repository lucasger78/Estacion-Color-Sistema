import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface Props {
  children: React.ReactNode
}

/**
 * ProtectedRoute: Redirige a /login si el usuario:
 * - No tiene sesión activa
 * - Su cuenta está desactivada (activo = false)
 */
export default function ProtectedRoute({ children }: Props) {
  const { session, isLoading, profile } = useAuth()

  if (isLoading) return null // El LoadingScreen se muestra en App.tsx

  // Sin sesión o cuenta desactivada → fuera
  if (!session || profile?.activo === false) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

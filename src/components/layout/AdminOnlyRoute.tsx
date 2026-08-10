import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface Props {
  children: React.ReactNode
}

/**
 * AdminOnlyRoute: Redirige a /facturacion si el usuario no es admin.
 * Usar redirect en lugar de mostrar UI bloqueada evita que los componentes
 * hijos monten y disparen queries de datos sensibles.
 */
export default function AdminOnlyRoute({ children }: Props) {
  const { isAdmin, isLoading } = useAuth()

  if (isLoading) return null

  // No es admin → redirigir silenciosamente (no revelar que la ruta existe)
  if (!isAdmin) {
    return <Navigate to="/facturacion" replace />
  }

  return <>{children}</>
}

import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface Props {
  children: React.ReactNode
}

/**
 * ProtectedRoute: Redirige a /login si el usuario no tiene sesión activa.
 */
export default function ProtectedRoute({ children }: Props) {
  const { session, isLoading } = useAuth()

  if (isLoading) return null // El LoadingScreen se muestra en App.tsx

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

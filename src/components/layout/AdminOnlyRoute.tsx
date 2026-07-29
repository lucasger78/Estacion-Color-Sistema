import React from 'react'
import { useAuth } from '../../context/AuthContext'
import { ShieldOff } from 'lucide-react'

interface Props {
  children: React.ReactNode
}

/**
 * AdminOnlyRoute: Muestra un mensaje de acceso denegado si el usuario no es admin.
 * No redirige para que el usuario sea consciente de dónde está.
 */
export default function AdminOnlyRoute({ children }: Props) {
  const { isAdmin, isLoading } = useAuth()

  if (isLoading) return null

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-danger-light flex items-center justify-center">
          <ShieldOff className="w-10 h-10 text-danger" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-secondary mb-2">Acceso Denegado</h2>
          <p className="text-secondary-400 max-w-sm">
            Esta sección es exclusiva para administradores. Si necesitás acceso,
            contactá con un administrador del sistema.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

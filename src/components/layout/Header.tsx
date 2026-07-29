import { Bell, Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/inventario':  'Inventario',
  '/facturacion': 'Facturación',
  '/usuarios':    'Gestión de Usuarios',
}

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { pathname } = useLocation()
  const { profile }  = useAuth()

  const title = PAGE_TITLES[pathname] ?? 'Estación Color'

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between
                 px-6 h-16 bg-white/90 backdrop-blur-sm
                 border-b border-slate-100 shadow-sm"
    >
      {/* Botón hamburguesa (solo móvil) */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5 text-secondary" />
      </button>

      {/* Título de página */}
      <h1 className="text-lg font-bold text-secondary hidden md:block">{title}</h1>
      <h1 className="text-base font-bold text-secondary md:hidden">{title}</h1>

      {/* Acciones de cabecera */}
      <div className="flex items-center gap-3">
        {/* Notificaciones (placeholder visual) */}
        <button
          className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
          aria-label="Notificaciones"
        >
          <Bell className="w-5 h-5 text-secondary-400" />
        </button>

        {/* Avatar del usuario */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">
              {profile?.nombre_completo?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
          </div>
          <span className="text-sm font-medium text-secondary hidden sm:block">
            {profile?.nombre_completo?.split(' ')[0] ?? 'Usuario'}
          </span>
        </div>
      </div>
    </header>
  )
}

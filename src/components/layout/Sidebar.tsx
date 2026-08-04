import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  LogOut,
  X,
  Truck,
  Tag,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

interface SidebarProps {
  onClose: () => void
}

const NAV_ITEMS = [
  { to: '/dashboard',   label: 'Dashboard',     icon: LayoutDashboard, adminOnly: true  },
  { to: '/inventario',  label: 'Inventario',    icon: Package,         adminOnly: true  },
  { to: '/proveedores', label: 'Proveedores',   icon: Truck,           adminOnly: true  },
  { to: '/convenios',   label: 'Convenios',     icon: Tag,             adminOnly: true  },
  { to: '/facturacion', label: 'Facturación',   icon: ShoppingCart,    adminOnly: false },
  { to: '/usuarios',    label: 'Usuarios',      icon: Users,           adminOnly: true  },
]

export default function Sidebar({ onClose }: SidebarProps) {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <nav className="flex flex-col h-full text-white">
      {/* ── Logo / Header ── */}
      <div className="flex items-center justify-between p-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="w-10 object-contain drop-shadow-md" />
          <div>
            <p className="text-sm font-bold leading-tight">Estación Color</p>
            <p className="text-xs text-white/50 leading-tight">Sistema de Gestión</p>
          </div>
        </div>
        {/* Botón cerrar (solo móvil) */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Cerrar menú"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Navegación ── */}
      <div className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          if (item.adminOnly && !isAdmin) return null
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                isActive ? 'nav-item-active' : 'nav-item'
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </div>

      {/* ── Perfil de Usuario ── */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-primary">
              {profile?.nombre_completo?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {profile?.nombre_completo ?? 'Usuario'}
            </p>
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
              isAdmin
                ? 'bg-primary/20 text-primary-300'
                : 'bg-white/10 text-white/60'
            }`}>
              {profile?.rol ?? 'vendedor'}
            </span>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm
                     text-white/60 hover:text-white hover:bg-white/10
                     transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </nav>
  )
}

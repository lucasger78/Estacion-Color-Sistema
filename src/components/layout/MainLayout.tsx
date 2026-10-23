import { useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import Sidebar from './Sidebar'
import Header  from './Header'
import { useLowStockProducts } from '../../hooks/useAnalytics'

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: lowStock } = useLowStockProducts()
  const hasLowStock = lowStock && lowStock.length > 0

  return (
    <div className="main-layout">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Contenido principal */}
      <div className="main-content">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Alerta Global de Stock */}
        {hasLowStock && (
          <div className="bg-warning-light border-b border-warning text-warning-700 px-4 py-3 flex items-center justify-between shadow-sm z-10 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <p className="text-sm font-semibold">
                Atención: Hay {lowStock.length} producto{lowStock.length > 1 ? 's' : ''} con stock mínimo o agotado.
              </p>
            </div>
            <Link to="/inventario?filter=critico" className="px-3 py-1.5 bg-warning text-white rounded-lg text-xs font-bold shadow-sm hover:bg-orange-500 transition-colors">
              Revisar Inventario
            </Link>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">

          <Outlet />
        </main>
      </div>
    </div>
  )
}

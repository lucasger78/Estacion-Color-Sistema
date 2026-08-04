import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// ── Layouts ──
import MainLayout from './components/layout/MainLayout'

// ── Páginas ──
import LoginPage    from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage   from './pages/DashboardPage'
import InventarioPage  from './pages/InventarioPage'
import FacturacionPage from './pages/FacturacionPage'
import UsuariosPage    from './pages/UsuariosPage'
import ProveedoresPage from './pages/ProveedoresPage'
import ConveniosPage   from './pages/ConveniosPage'

// ── Guards ──
import ProtectedRoute  from './components/layout/ProtectedRoute'
import AdminOnlyRoute  from './components/layout/AdminOnlyRoute'

// ── Loading global ──
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-secondary-400 text-sm font-medium">Cargando sistema…</p>
      </div>
    </div>
  )
}

export default function App() {
  const { isLoading, session, isAdmin } = useAuth()

  if (isLoading) return <LoadingScreen />

  // El home depende del rol
  const homePath = isAdmin ? "/dashboard" : "/facturacion"

  return (
    <Routes>
      {/* Rutas públicas */}
      <Route
        path="/login"
        element={session ? <Navigate to={homePath} replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={session ? <Navigate to={homePath} replace /> : <RegisterPage />}
      />

      {/* Rutas protegidas con layout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={homePath} replace />} />
        
        {/* Solo admins */}
        <Route
          path="/dashboard"
          element={
            <AdminOnlyRoute>
              <DashboardPage />
            </AdminOnlyRoute>
          }
        />
        <Route
          path="/inventario"
          element={
            <AdminOnlyRoute>
              <InventarioPage />
            </AdminOnlyRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <AdminOnlyRoute>
              <UsuariosPage />
            </AdminOnlyRoute>
          }
        />
        <Route
          path="/proveedores"
          element={
            <AdminOnlyRoute>
              <ProveedoresPage />
            </AdminOnlyRoute>
          }
        />
        <Route
          path="/convenios"
          element={
            <AdminOnlyRoute>
              <ConveniosPage />
            </AdminOnlyRoute>
          }
        />

        {/* Accesible por todos los autenticados */}
        <Route path="/facturacion" element={<FacturacionPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to={homePath} replace />} />
    </Routes>
  )
}

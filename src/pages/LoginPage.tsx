import { useState, useRef } from 'react'
import { Eye, EyeOff, LogIn, Paintbrush2, AlertCircle, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [blocked,  setBlocked]  = useState(false)
  const failCount = useRef(0)
  const blockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (blocked) return
    setError(null)
    setLoading(true)
    try {
      await signIn(email.trim(), password)
    } catch (err: unknown) {
      failCount.current += 1
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión'
      if (msg.includes('Invalid login')) {
        if (failCount.current >= 5) {
          setBlocked(true)
          setError('Demasiados intentos fallidos. Esperá 30 segundos antes de volver a intentar.')
          blockTimer.current = setTimeout(() => {
            setBlocked(false)
            failCount.current = 0
            setError(null)
          }, 30_000)
        } else {
          setError(`Email o contraseña incorrectos. (Intento ${failCount.current}/5)`)
        }
      } else if (msg.includes('Email not confirmed')) {
        setError('Por favor, confirmá tu email antes de ingresar.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Panel izquierdo — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)' }}
      >
        {/* Elementos decorativos */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #E55B2B, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-5"
             style={{ background: 'radial-gradient(circle, #E55B2B, transparent)', transform: 'translate(-40%, 40%)' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <img src="/logo.png" alt="Estación Color" className="w-16 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
            <span className="text-white font-bold text-2xl tracking-tight">Estación Color</span>
          </div>
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Sistema de Gestión<br />
            <span className="text-primary">Integral</span>
          </h2>
          <p className="text-white/60 text-lg leading-relaxed max-w-sm">
            Control de stock, facturación y análisis de ventas para Pinturerías Estación Color.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { label: 'Productos', value: 'Stock en tiempo real' },
            { label: 'Ventas',    value: 'Facturación rápida' },
            { label: 'KPIs',      value: 'Análisis avanzado' },
          ].map((f) => (
            <div key={f.label} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <p className="text-white/50 text-xs mb-1">{f.label}</p>
              <p className="text-white text-sm font-semibold">{f.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo móvil */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Paintbrush2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-secondary font-bold text-lg">Estación Color</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-secondary mb-1">Bienvenido de vuelta</h1>
            <p className="text-secondary-400 text-sm">Ingresá tus credenciales para continuar</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-danger-light border border-red-200 mb-6 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-sm text-danger font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-1.5" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="input-field"
                required
                autoComplete="email"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-1.5" htmlFor="login-password">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pr-11"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary transition-colors"
                  aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botón */}
            <button
            id="btn-login"
            type="submit"
            disabled={loading || blocked}
            className="btn-primary w-full justify-center py-3 text-base disabled:opacity-60"
          >
            {blocked ? (
              <>
                <Lock className="w-4 h-4" />
                Bloqueado temporalmente…
              </>
            ) : loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Ingresando…
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Ingresar
              </>
            )}
          </button>
        </form>

          <p className="text-center text-xs text-secondary-400 mt-6">
            Sistema de uso interno · Estación Color
          </p>
        </div>
      </div>
    </div>
  )
}

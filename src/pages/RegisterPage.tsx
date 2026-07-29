import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { signUp } = useAuth()

  const [nombreCompleto, setNombreCompleto] = useState('')
  const [email,          setEmail]          = useState('')
  const [password,       setPassword]       = useState('')
  const [confirm,        setConfirm]        = useState('')
  const [showPwd,        setShowPwd]        = useState(false)
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [success,        setSuccess]        = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      await signUp(email.trim(), password, nombreCompleto)
      setSuccess(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrarse'
      if (msg.includes('already registered')) {
        setError('Este email ya está registrado. Intentá iniciar sesión.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center animate-scale-in">
          <div className="w-20 h-20 rounded-3xl bg-success-light flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-2xl font-extrabold text-secondary mb-2">¡Registro exitoso!</h1>
          <p className="text-secondary-400 mb-6 leading-relaxed">
            Te enviamos un email de confirmación a <strong>{email}</strong>.
            Por favor revisá tu bandeja y confirmá tu cuenta para poder ingresar.
          </p>
          <Link to="/login" className="btn-primary justify-center w-full py-3">
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <img src="/logo.png" alt="Logo" className="w-10 object-contain drop-shadow-md" />
          <span className="text-secondary font-bold text-lg">Estación Color</span>
        </div>

        <div className="card">
          <div className="mb-6">
            <h1 className="text-xl font-extrabold text-secondary mb-1">Crear cuenta</h1>
            <p className="text-secondary-400 text-sm">
              Todos los nuevos usuarios reciben el rol de <strong>vendedor</strong> automáticamente.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-danger-light border border-red-200 mb-5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-sm text-danger font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-1.5" htmlFor="reg-nombre">
                Nombre completo
              </label>
              <input
                id="reg-nombre"
                type="text"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                placeholder="Juan Pérez"
                className="input-field"
                required
                autoComplete="name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-1.5" htmlFor="reg-email">
                Email
              </label>
              <input
                id="reg-email"
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
              <label className="block text-sm font-semibold text-secondary mb-1.5" htmlFor="reg-password">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="input-field pr-11"
                  required
                  minLength={6}
                  autoComplete="new-password"
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

            {/* Confirmar contraseña */}
            <div>
              <label className="block text-sm font-semibold text-secondary mb-1.5" htmlFor="reg-confirm">
                Confirmar contraseña
              </label>
              <input
                id="reg-confirm"
                type={showPwd ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repetí tu contraseña"
                className="input-field"
                required
                autoComplete="new-password"
              />
            </div>

            <button
              id="btn-register"
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Registrando…
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Crear cuenta
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-secondary-400 mt-5">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

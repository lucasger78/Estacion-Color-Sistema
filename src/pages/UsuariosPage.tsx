import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Shield, UserCheck, UserX, RefreshCw, Search,
  ChevronUp, ChevronDown, ToggleLeft, ToggleRight, AlertCircle,
  UserPlus, X, Eye, EyeOff, Loader2,
} from 'lucide-react'
import { supabase, supabaseSignupHelper } from '../lib/supabaseClient'
import { formatDate } from '../utils/formatters'
import type { UserProfile } from '../context/AuthContext'

// ── Queries / Mutations ─────────────────────────────────────────────────────

function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('creado_at', { ascending: false })
      if (error) throw error
      return data as UserProfile[]
    },
  })
}

function useUpdateRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, rol }: { id: string; rol: 'admin' | 'vendedor' }) => {
      const { error } = await supabase
        .from('usuarios')
        .update({ rol })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

function useToggleActivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase
        .from('usuarios')
        .update({ activo })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

// ── Modal: Agregar Usuario ──────────────────────────────────────────────────

interface AgregarUsuarioModalProps {
  onClose: () => void
  onSuccess: () => void
}

function AgregarUsuarioModal({ onClose, onSuccess }: AgregarUsuarioModalProps) {
  const [form, setForm] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    rol: 'vendedor' as 'admin' | 'vendedor',
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!form.nombre_completo.trim()) {
      setError('El nombre completo es obligatorio.')
      return
    }
    if (!emailRegex.test(form.email.trim())) {
      setError('Ingresá un email válido.')
      return
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (!/[A-Z]/.test(form.password)) {
      setError('La contraseña debe contener al menos una letra mayúscula.')
      return
    }
    if (!/[0-9]/.test(form.password)) {
      setError('La contraseña debe contener al menos un número.')
      return
    }

    setLoading(true)
    try {
      // 1. Crear usuario en Supabase Auth usando el cliente sin persistencia de sesión
      // para evitar desloguear al administrador.
      const { data: authData, error: authError } = await supabaseSignupHelper.auth.signUp({
        email:    form.email.trim(),
        password: form.password,
        options: {
          data: { nombre_completo: form.nombre_completo.trim() },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('No se pudo crear el usuario.')

      // 2. Actualizar el perfil en public.usuarios con el rol correcto
      // (el trigger lo inserta como 'vendedor', nosotros lo actualizamos)
      const { error: updateError } = await supabase
        .from('usuarios')
        .upsert({
          id:              authData.user.id,
          email:           form.email.trim(),
          nombre_completo: form.nombre_completo.trim(),
          rol:             form.rol,
          activo:          true,
        }, { onConflict: 'id' })

      if (updateError) throw updateError

      onSuccess()
      onClose()
    } catch (err: any) {
      const msg = err?.message || 'Error al crear el usuario.'
      if (msg.includes('already registered')) {
        setError('Este email ya está registrado en el sistema.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-secondary/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-secondary">Nuevo Usuario</h3>
              <p className="text-xs text-secondary-400">Completá los datos del nuevo usuario</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-secondary-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-1.5">
              Nombre completo
            </label>
            <input
              type="text"
              value={form.nombre_completo}
              onChange={e => setForm(p => ({ ...p, nombre_completo: e.target.value }))}
              placeholder="Ej: María García"
              className="input-field"
              autoFocus
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="usuario@estacioncolor.com"
              className="input-field"
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                className="input-field pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Rol */}
          <div>
            <label className="block text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-1.5">
              Rol del usuario
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['vendedor', 'admin'] as const).map(rol => (
                <button
                  key={rol}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, rol }))}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-150 ${
                    form.rol === rol
                      ? rol === 'admin'
                        ? 'border-primary bg-primary-soft text-primary'
                        : 'border-secondary bg-secondary/5 text-secondary'
                      : 'border-slate-200 text-secondary-400 hover:border-slate-300'
                  }`}
                >
                  {rol === 'admin' ? (
                    <Shield className="w-4 h-4" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  {rol === 'admin' ? 'Administrador' : 'Vendedor'}
                </button>
              ))}
            </div>
            <p className="text-xs text-secondary-400 mt-2">
              {form.rol === 'admin'
                ? '⚠️ Admin tiene acceso total al sistema (dashboard, inventario, usuarios).'
                : '✓ Vendedor solo puede registrar ventas en el punto de venta.'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
              <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando…
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Crear usuario
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Fila de usuario ─────────────────────────────────────────────────────────

function UsuarioRow({
  usuario,
  onRolChange,
  onActivoChange,
}: {
  usuario:        UserProfile
  onRolChange:    (id: string, rol: 'admin' | 'vendedor') => void
  onActivoChange: (id: string, activo: boolean) => void
}) {
  return (
    <tr className="table-row">
      <td className="table-cell">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">
              {usuario.nombre_completo?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-secondary text-sm">{usuario.nombre_completo}</p>
            <p className="text-xs text-secondary-400">{usuario.email}</p>
          </div>
        </div>
      </td>
      <td className="table-cell text-center">
        {usuario.rol === 'admin' ? (
          <span className="badge-admin">
            <Shield className="w-3 h-3" />
            admin
          </span>
        ) : (
          <span className="badge-vendedor">vendedor</span>
        )}
      </td>
      <td className="table-cell text-center">
        {usuario.activo ? (
          <span className="badge-success">Activo</span>
        ) : (
          <span className="badge-danger">Inactivo</span>
        )}
      </td>
      <td className="table-cell text-center text-xs text-secondary-400">
        {formatDate(usuario.creado_at)}
      </td>
      <td className="table-cell">
        <div className="flex items-center gap-2 justify-center">
          {/* Cambiar rol */}
          {usuario.rol === 'vendedor' ? (
            <button
              onClick={() => onRolChange(usuario.id, 'admin')}
              title="Promover a Admin"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-soft text-primary text-xs font-semibold
                         hover:bg-primary hover:text-white transition-all duration-150"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              Admin
            </button>
          ) : (
            <button
              onClick={() => onRolChange(usuario.id, 'vendedor')}
              title="Degradar a Vendedor"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary-50 text-secondary-400 text-xs font-semibold
                         hover:bg-secondary-100 transition-all duration-150"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Vendedor
            </button>
          )}
          {/* Activar / Desactivar */}
          <button
            onClick={() => onActivoChange(usuario.id, !usuario.activo)}
            title={usuario.activo ? 'Desactivar' : 'Activar'}
            className={`p-1.5 rounded-lg transition-colors ${
              usuario.activo
                ? 'text-success hover:bg-success-light'
                : 'text-danger hover:bg-danger-light'
            }`}
          >
            {usuario.activo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Página Usuarios ─────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const [search, setSearch]       = useState('')
  const [error,  setError]        = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const { data: usuarios, isLoading, refetch } = useUsuarios()
  const updateRol    = useUpdateRol()
  const toggleActivo = useToggleActivo()

  const filtered = usuarios?.filter(u =>
    u.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  const admins   = filtered.filter(u => u.rol === 'admin').length
  const activos  = filtered.filter(u => u.activo).length

  const handleRolChange = async (id: string, rol: 'admin' | 'vendedor') => {
    setError(null)
    try {
      await updateRol.mutateAsync({ id, rol })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cambiar rol.')
    }
  }

  const handleActivoChange = async (id: string, activo: boolean) => {
    setError(null)
    try {
      await toggleActivo.mutateAsync({ id, activo })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cambiar estado.')
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Modal ── */}
      {showModal && (
        <AgregarUsuarioModal
          onClose={() => setShowModal(false)}
          onSuccess={() => refetch()}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-secondary">Gestión de Usuarios</h2>
          <p className="text-sm text-secondary-400">Solo accesible por administradores</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost">
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <UserPlus className="w-4 h-4" />
            Agregar usuario
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4 max-w-lg">
        {[
          { label: 'Total', value: filtered.length, icon: Users,     color: 'text-secondary',  bg: 'bg-slate-100' },
          { label: 'Admins', value: admins,          icon: Shield,    color: 'text-primary',    bg: 'bg-primary-soft' },
          { label: 'Activos', value: activos,        icon: UserCheck, color: 'text-success',    bg: 'bg-success-light' },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="card flex items-center gap-3 p-4">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-extrabold text-secondary">{s.value}</p>
                <p className="text-xs text-secondary-400">{s.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-danger-light border border-red-200 max-w-lg">
          <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* ── Buscador ── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email…"
          className="input-field pl-10"
        />
      </div>

      {/* ── Tabla ── */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-secondary-400">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Cargando usuarios…
          </div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header text-left">Usuario</th>
                  <th className="table-header">Rol</th>
                  <th className="table-header">Estado</th>
                  <th className="table-header">Registrado</th>
                  <th className="table-header">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <UsuarioRow
                    key={u.id}
                    usuario={u}
                    onRolChange={handleRolChange}
                    onActivoChange={handleActivoChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-secondary-400">
            <UserX className="w-8 h-8 opacity-40" />
            <p className="text-sm">No se encontraron usuarios.</p>
          </div>
        )}
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import {
  Search, Plus, RefreshCw, Truck, Check, X, AlertTriangle, Edit3, Loader2, Phone, MapPin, Mail, ToggleLeft, ToggleRight
} from 'lucide-react'
import { useProveedores, useCreateProveedor, useUpdateProveedor, type Proveedor } from '../hooks/useProveedores'

// ── Fila de Proveedor ───────────────────────────────────────────────────────

function ProveedorRow({ proveedor, onSave }: { proveedor: Proveedor; onSave: (updates: Partial<Proveedor> & { id: number }) => void }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    nombre: proveedor.nombre,
    telefono: proveedor.telefono || '',
    email: proveedor.email || '',
    direccion: proveedor.direccion || ''
  })

  const handleSave = () => {
    onSave({ id: proveedor.id, ...form })
    setEditing(false)
  }

  const inputClass = "px-2 py-1 rounded-lg border border-primary/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-full"

  return (
    <tr className="table-row">
      <td className="table-cell">
        {editing ? (
          <input type="text" value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} className={inputClass} />
        ) : (
          <p className="font-semibold text-secondary text-sm">{proveedor.nombre}</p>
        )}
      </td>
      <td className="table-cell">
        {editing ? (
          <input type="text" value={form.telefono} onChange={e => setForm(p => ({...p, telefono: e.target.value}))} className={inputClass} placeholder="Teléfono" />
        ) : (
          <div className="flex items-center gap-1 text-sm text-secondary-400">
            {proveedor.telefono ? <><Phone className="w-3.5 h-3.5"/> {proveedor.telefono}</> : '—'}
          </div>
        )}
      </td>
      <td className="table-cell">
        {editing ? (
          <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} className={inputClass} placeholder="Email" />
        ) : (
          <div className="flex items-center gap-1 text-sm text-secondary-400 truncate max-w-[150px]">
             {proveedor.email ? <><Mail className="w-3.5 h-3.5"/> {proveedor.email}</> : '—'}
          </div>
        )}
      </td>
      <td className="table-cell">
         {editing ? (
          <input type="text" value={form.direccion} onChange={e => setForm(p => ({...p, direccion: e.target.value}))} className={inputClass} placeholder="Dirección" />
        ) : (
          <div className="flex items-center gap-1 text-sm text-secondary-400 truncate max-w-[200px]" title={proveedor.direccion || ''}>
             {proveedor.direccion ? <><MapPin className="w-3.5 h-3.5"/> {proveedor.direccion}</> : '—'}
          </div>
        )}
      </td>
      <td className="table-cell text-center">
        {editing ? (
           <span className="text-xs text-secondary-400">N/A</span>
        ) : (
           <button
            onClick={() => onSave({ id: proveedor.id, activo: !proveedor.activo })}
            title={proveedor.activo ? 'Desactivar' : 'Activar'}
            className={`p-1.5 rounded-lg transition-colors ${proveedor.activo ? 'text-success hover:bg-success-light' : 'text-danger hover:bg-danger-light'}`}
          >
            {proveedor.activo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
        )}
      </td>
      <td className="table-cell text-center">
        {editing ? (
          <div className="flex items-center justify-center gap-1">
            <button onClick={handleSave} className="p-1.5 rounded-lg bg-success text-white hover:bg-emerald-600 transition-colors">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setForm({ nombre: proveedor.nombre, telefono: proveedor.telefono || '', email: proveedor.email || '', direccion: proveedor.direccion || ''}); setEditing(false) }} className="p-1.5 rounded-lg bg-slate-200 text-secondary-400 hover:bg-slate-300 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-primary-soft hover:text-primary text-secondary-400 transition-colors" title="Editar">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}
      </td>
    </tr>
  )
}

// ── Modal Cargar Proveedor ──────────────────────────────────────────────────

function CargarProveedorModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [form, setForm] = useState({ nombre: '', telefono: '', direccion: '', email: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const createProveedor = useCreateProveedor()

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.nombre.trim()) return setError('El nombre es obligatorio.')

    setLoading(true)
    try {
      await createProveedor.mutateAsync(form)
      setSuccess(true)
      setTimeout(() => { onSuccess(); onClose() }, 800)
    } catch (err: any) {
      setError(err?.message || 'Error al guardar el proveedor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-secondary/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-secondary">Cargar Proveedor</h3>
              <p className="text-xs text-secondary-400">Datos del nuevo proveedor</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-secondary-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary-400 uppercase mb-1.5">Nombre *</label>
            <input type="text" value={form.nombre} onChange={set('nombre')} className="input-field" autoFocus placeholder="Nombre del proveedor o empresa" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary-400 uppercase mb-1.5">Teléfono</label>
            <input type="text" value={form.telefono} onChange={set('telefono')} className="input-field" placeholder="Ej: +54 9 11..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary-400 uppercase mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={set('email')} className="input-field" placeholder="contacto@empresa.com" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary-400 uppercase mb-1.5">Dirección</label>
            <input type="text" value={form.direccion} onChange={set('direccion')} className="input-field" placeholder="Calle, Ciudad..." />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200">
              <Check className="w-4 h-4 text-success" />
              <p className="text-sm text-success font-semibold">¡Guardado!</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading || success} className="btn-primary flex-1 justify-center">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin"/> Guardando</> : success ? <><Check className="w-4 h-4"/> ¡Listo!</> : <><Plus className="w-4 h-4"/> Cargar proveedor</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Página Proveedores ──────────────────────────────────────────────────────

export default function ProveedoresPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const { data: proveedores, isLoading, refetch } = useProveedores(search)
  const updateProveedor = useUpdateProveedor()

  return (
    <div className="space-y-6">
      {showModal && <CargarProveedorModal onClose={() => setShowModal(false)} onSuccess={() => refetch()} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-secondary">Proveedores</h2>
          <p className="text-sm text-secondary-400">Gestión del directorio de proveedores</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Cargar proveedor
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre..." className="input-field pl-10" />
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 gap-3 text-secondary-400">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Cargando proveedores…</span>
          </div>
        ) : proveedores && proveedores.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header text-left">Nombre</th>
                  <th className="table-header text-left">Teléfono</th>
                  <th className="table-header text-left">Email</th>
                  <th className="table-header text-left">Dirección</th>
                  <th className="table-header text-center">Estado</th>
                  <th className="table-header text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {proveedores.map((p) => (
                  <ProveedorRow key={p.id} proveedor={p} onSave={(updates) => updateProveedor.mutate(updates)} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-secondary-400">
            <Truck className="w-10 h-10 opacity-40" />
            <p className="text-sm">No hay proveedores cargados.</p>
          </div>
        )}
      </div>
    </div>
  )
}

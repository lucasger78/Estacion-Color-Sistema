import React, { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Swal from 'sweetalert2'
import {
  Search, Plus, Upload, Download, RefreshCw,
  Edit3, Package, Check, X, AlertTriangle, FileSpreadsheet,
  Loader2, Trash2, DatabaseBackup
} from 'lucide-react'
import {
  useProductos, useMarcas, useUpdateProducto,
  useImportProductos, useBulkUpdatePrecios, useDeleteVariantes, useLimpiarCatalogo,
} from '../hooks/useProductos'
import { formatARS } from '../utils/formatters'
import {
  parseProductosFile, exportToExcel, exportToCSV,
  type ProductoImportRow,
} from '../utils/excelParser'
import type { Producto } from '../hooks/useProductos'
import { supabase } from '../lib/supabaseClient'
import { useSearchParams } from 'react-router-dom'

// ── Tipos ──────────────────────────────────────────────────────────────────

interface EditState {
  precio_costo_sin_iva: string
  precio_costo_con_iva: string
  precio_venta:         string
  stock_actual:         string
  stock_minimo:         string
  fecha_vencimiento:    string
}

// ── Badge de Stock ──────────────────────────────────────────────────────────

function StockBadge({ actual, minimo }: { actual: number; minimo: number }) {
  if (actual === 0) return <span className="badge-danger">Sin stock</span>
  if (actual <= minimo) return <span className="badge-warning">Bajo</span>
  return <span className="badge-success">OK</span>
}

// ── Modal: Cargar Producto Manual ───────────────────────────────────────────

interface CargarProductoModalProps {
  marcas: { id: number; nombre: string }[]
  onClose: () => void
  onSuccess: () => void
}

function CargarProductoModal({ marcas, onClose, onSuccess }: CargarProductoModalProps) {
  const [form, setForm] = useState({
    nombre:               '',
    variante:             '',
    marca_id:             '',
    precio_sin_iva:       '',
    precio_con_iva:       '',
    precio_mostrador:     '',
    stock_disponible:     '',
    fecha_vencimiento:    '',
  })
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState(false)
  // Estado para agregar marca nueva inline
  const [marcasList, setMarcasList]     = useState(marcas)
  const [showNuevaMarca, setShowNuevaMarca] = useState(false)
  const [nuevaMarca, setNuevaMarca]     = useState('')
  const [savingMarca, setSavingMarca]   = useState(false)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }))

  const handlePrecioChange = (field: 'precio_sin_iva' | 'precio_con_iva', value: string) => {
    setForm(prev => {
      const valNum = parseFloat(value) || 0
      const next = { ...prev, [field]: value }
      
      if (field === 'precio_sin_iva') {
        if (value === '') {
          next.precio_con_iva = ''
          next.precio_mostrador = ''
        } else {
          next.precio_con_iva = (valNum * 1.21).toFixed(2)
          next.precio_mostrador = (valNum * 1.21 * 1.20).toFixed(2)
        }
      } else if (field === 'precio_con_iva') {
        if (value === '') {
          next.precio_mostrador = ''
        } else {
          next.precio_mostrador = (valNum * 1.20).toFixed(2)
        }
      }
      
      return next
    })
  }

  // Guarda la nueva marca en Supabase y la selecciona
  const handleGuardarMarca = async () => {
    if (!nuevaMarca.trim()) return
    setSavingMarca(true)
    try {
      const { data, error: mErr } = await supabase
        .from('marcas')
        .insert({ nombre: nuevaMarca.trim().toUpperCase() })
        .select('id, nombre, creado_at')
        .single()
      if (mErr) throw mErr
      setMarcasList(prev => [...prev, data])
      setForm(p => ({ ...p, marca_id: String(data.id) }))
      setNuevaMarca('')
      setShowNuevaMarca(false)
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la marca.')
    } finally {
      setSavingMarca(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.nombre.trim()) {
      setError('El nombre del producto es obligatorio.')
      return
    }
    if (!form.precio_mostrador || parseFloat(form.precio_mostrador) <= 0) {
      setError('El precio de venta (mostrador) es obligatorio.')
      return
    }

    setLoading(true)
    try {
      // 1. Insertar o encontrar el producto base
      let productoId: number | null = null

      // Buscar si ya existe un producto con ese nombre y marca
      const { data: existing } = await supabase
        .from('productos')
        .select('id')
        .eq('nombre', form.nombre.trim())
        .eq('marca_id', form.marca_id ? parseInt(form.marca_id) : 0)
        .maybeSingle()

      if (existing) {
        productoId = existing.id
      } else {
        // Crear nuevo producto base
        const { data: newProd, error: prodErr } = await supabase
          .from('productos')
          .insert({
            nombre:   form.nombre.trim(),
            marca_id: form.marca_id ? parseInt(form.marca_id) : null,
          })
          .select('id')
          .single()

        if (prodErr) throw prodErr
        productoId = newProd.id
      }

      // 2. Insertar la variante con los precios y stock
      const { error: varErr } = await supabase
        .from('variantes')
        .insert({
          producto_id:      productoId,
          variante:         form.variante.trim() || form.nombre.trim(),
          precio_sin_iva:   parseFloat(form.precio_sin_iva) || 0,
          precio_con_iva:   parseFloat(form.precio_con_iva) || 0,
          precio_mostrador: parseFloat(form.precio_mostrador) || 0,
          stock_disponible: parseInt(form.stock_disponible) || 0,
          stock_actual:     parseInt(form.stock_disponible) || 0,
          fecha_vencimiento: form.fecha_vencimiento || null,
        })

      if (varErr) throw varErr

      setSuccess(true)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 800)
    } catch (err: any) {
      setError(err?.message || 'Error al guardar el producto.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'input-field'
  const labelClass = 'block text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Overlay */}
      <div className="absolute inset-0 bg-secondary/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 animate-fade-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-secondary">Cargar Producto Manual</h3>
              <p className="text-xs text-secondary-400">Completá los datos del nuevo producto</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-secondary-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">

          {/* Nombre + Variante */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Nombre del producto *</label>
              <input type="text" value={form.nombre} onChange={set('nombre')}
                placeholder="Ej: PINTURA LATEX INTERIOR" className={inputClass} autoFocus />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Variante / Presentación</label>
              <input type="text" value={form.variante} onChange={set('variante')}
                placeholder="Ej: 4 litros, Rojo, Negro…" className={inputClass} />
              <p className="text-xs text-secondary-400 mt-1">
                Si el producto no tiene variante, se usa el nombre como variante.
              </p>
            </div>
          </div>

          {/* Marca */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass}>Marca</label>
              {!showNuevaMarca && (
                <button
                  type="button"
                  onClick={() => setShowNuevaMarca(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nueva marca
                </button>
              )}
            </div>

            {showNuevaMarca ? (
              // Mini formulario para nueva marca
              <div className="flex gap-2 items-center animate-fade-in">
                <input
                  type="text"
                  value={nuevaMarca}
                  onChange={e => setNuevaMarca(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleGuardarMarca())}
                  placeholder="Nombre de la marca"
                  className="input-field flex-1"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleGuardarMarca}
                  disabled={savingMarca || !nuevaMarca.trim()}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary text-white text-sm font-semibold
                             hover:bg-primary-600 disabled:opacity-50 transition-colors flex-shrink-0"
                >
                  {savingMarca ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNuevaMarca(false); setNuevaMarca('') }}
                  className="p-2 rounded-xl hover:bg-slate-100 text-secondary-400 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <select value={form.marca_id} onChange={set('marca_id')} className={inputClass}>
                <option value="">— Sin marca —</option>
                {marcasList.map(m => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            )}
          </div>

          {/* Precios */}
          <div className="p-4 rounded-xl bg-slate-50 space-y-3">
            <p className="text-xs font-bold text-secondary-400 uppercase tracking-wider">Precios</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Costo s/IVA</label>
                <input type="number" min="0" step="0.01" value={form.precio_sin_iva}
                  onChange={e => handlePrecioChange('precio_sin_iva', e.target.value)} placeholder="0.00" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Costo c/IVA</label>
                <input type="number" min="0" step="0.01" value={form.precio_con_iva}
                  onChange={e => handlePrecioChange('precio_con_iva', e.target.value)} placeholder="0.00" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Precio Venta *</label>
                <input type="number" min="0" step="0.01" value={form.precio_mostrador}
                  onChange={set('precio_mostrador')} placeholder="0.00"
                  className="input-field border-primary/40 focus:ring-primary/30" />
              </div>
            </div>
          </div>

          {/* Stock y Vencimiento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Stock inicial</label>
              <input type="number" min="0" value={form.stock_disponible}
                onChange={set('stock_disponible')} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Vencimiento</label>
              <input type="date" value={form.fecha_vencimiento}
                onChange={set('fecha_vencimiento')} className={inputClass} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {/* Éxito */}
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200">
              <Check className="w-4 h-4 text-success" />
              <p className="text-sm text-success font-semibold">¡Producto guardado correctamente!</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={loading || success} className="btn-primary flex-1 justify-center">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
              ) : success ? (
                <><Check className="w-4 h-4" /> ¡Guardado!</>
              ) : (
                <><Plus className="w-4 h-4" /> Cargar producto</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Fila editable ───────────────────────────────────────────────────────────

function ProductRow({
  producto,
  isSelected,
  onSelect,
  onSave,
  onDelete
}: {
  producto: Producto
  isSelected: boolean
  onSelect: (selected: boolean) => void
  onSave: (updates: Partial<Producto> & { id: number }) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<EditState>({
    precio_costo_sin_iva: String(producto.precio_costo_sin_iva),
    precio_costo_con_iva: String(producto.precio_costo_con_iva),
    precio_venta:         String(producto.precio_venta),
    stock_actual:         String(producto.stock_actual),
    stock_minimo:         String(producto.stock_minimo),
    fecha_vencimiento:    producto.fecha_vencimiento || '',
  })

  const handleSave = () => {
    onSave({
      id:                    producto.id,
      precio_costo_sin_iva:  parseFloat(form.precio_costo_sin_iva) || 0,
      precio_costo_con_iva:  parseFloat(form.precio_costo_con_iva) || 0,
      precio_venta:          parseFloat(form.precio_venta) || 0,
      stock_actual:          parseInt(form.stock_actual) || 0,
      stock_minimo:          parseInt(form.stock_minimo) || 0,
      fecha_vencimiento:     form.fecha_vencimiento || null,
    })
    setEditing(false)
  }

  const handleCancel = () => {
    setForm({
      precio_costo_sin_iva: String(producto.precio_costo_sin_iva),
      precio_costo_con_iva: String(producto.precio_costo_con_iva),
      precio_venta:         String(producto.precio_venta),
      stock_actual:         String(producto.stock_actual),
      stock_minimo:         String(producto.stock_minimo),
      fecha_vencimiento:    producto.fecha_vencimiento || '',
    })
    setEditing(false)
  }

  const handlePriceChange = (field: keyof EditState, value: string) => {
    setForm(prev => {
      const valNum = parseFloat(value) || 0
      const next = { ...prev, [field]: value }
      
      if (field === 'precio_costo_sin_iva') {
        if (value === '') {
          next.precio_costo_con_iva = ''
          next.precio_venta = ''
        } else {
          next.precio_costo_con_iva = (valNum * 1.21).toFixed(2)
          next.precio_venta = (valNum * 1.21 * 1.20).toFixed(2)
        }
      } else if (field === 'precio_costo_con_iva') {
        if (value === '') {
          next.precio_venta = ''
        } else {
          next.precio_venta = (valNum * 1.20).toFixed(2)
        }
      }
      
      return next
    })
  }

  const tdInput = (field: keyof EditState) => (
    <input
      type="number"
      step="any"
      value={form[field]}
      onChange={(e) => {
        if (field === 'precio_costo_sin_iva' || field === 'precio_costo_con_iva') {
          handlePriceChange(field, e.target.value)
        } else {
          setForm(prev => ({ ...prev, [field]: e.target.value }))
        }
      }}
      className="w-24 px-2 py-1 rounded-lg border border-primary/40 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
    />
  )

  return (
    <tr className="table-row">
      <td className="table-cell text-center w-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
          className="rounded text-primary focus:ring-primary border-slate-300 w-4 h-4 cursor-pointer"
        />
      </td>
      <td className="table-cell">
        <div>
          <p className="font-semibold text-secondary text-sm">{producto.nombre}</p>
          {producto.presentacion && (
            <p className="text-xs text-secondary-400">{producto.presentacion}</p>
          )}
        </div>
      </td>
      <td className="table-cell">
        <span className="text-xs font-medium text-secondary-400">
          {producto.marcas?.nombre ?? '—'}
        </span>
      </td>
      <td className="table-cell text-center">
        {editing ? tdInput('precio_costo_sin_iva') : <span className="text-sm">{formatARS(producto.precio_costo_sin_iva)}</span>}
      </td>
      <td className="table-cell text-center">
        {editing ? tdInput('precio_costo_con_iva') : <span className="text-sm">{formatARS(producto.precio_costo_con_iva)}</span>}
      </td>
      <td className="table-cell text-center">
        {editing ? tdInput('precio_venta') : (
          <span className="font-bold text-primary">{formatARS(producto.precio_venta)}</span>
        )}
      </td>
      <td className="table-cell text-center">
        {editing ? (
          <div className="flex flex-col gap-1 items-center">
            {tdInput('stock_actual')}
            <span className="text-xs text-secondary-400">Mín: {tdInput('stock_minimo')}</span>
          </div>
        ) : (
          <span className="font-bold text-secondary">{producto.stock_actual}</span>
        )}
      </td>
      <td className="table-cell text-center">
        {editing ? null : <StockBadge actual={producto.stock_actual} minimo={producto.stock_minimo} />}
      </td>
      <td className="table-cell text-center">
        {editing ? (
          <input type="date" value={form.fecha_vencimiento} onChange={e => setForm(p => ({...p, fecha_vencimiento: e.target.value}))} className="w-[110px] px-2 py-1 rounded-lg border border-primary/40 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
        ) : (
          <span className={`text-xs ${(() => {
            if (!producto.fecha_vencimiento) return 'text-secondary-400'
            const [y, m, d] = producto.fecha_vencimiento.split('-')
            const vto = new Date(Number(y), Number(m) - 1, Number(d))
            const limite = new Date()
            limite.setDate(limite.getDate() + 30)
            return vto <= limite ? 'text-danger font-bold' : 'text-secondary-400'
          })()}`}>
            {producto.fecha_vencimiento ? (() => {
              const [y, m, d] = producto.fecha_vencimiento.split('-')
              return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString()
            })() : '—'}
          </span>
        )}
      </td>
      <td className="table-cell text-center">
        {editing ? (
          <div className="flex items-center gap-1 justify-center">
            <button onClick={handleSave} className="p-1.5 rounded-lg bg-success text-white hover:bg-emerald-600 transition-colors">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleCancel} className="p-1.5 rounded-lg bg-slate-200 text-secondary-400 hover:bg-slate-300 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 justify-center">
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg hover:bg-primary-soft hover:text-primary text-secondary-400 transition-colors"
              title="Editar"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-danger-light hover:text-danger text-secondary-400 transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

// ── Modal: Actualización de Precios en Bloque ───────────────────────────────

function BulkPreciosModal({
  productos,
  marcaFiltradaNombre,
  onClose,
  onApply,
  loading,
}: {
  productos: import('../hooks/useProductos').Producto[]
  marcaFiltradaNombre: string
  onClose: () => void
  onApply: (porcentaje: number) => Promise<void>
  loading: boolean
}) {
  const [porcentaje, setPorcentaje] = useState('')
  const pct = parseFloat(porcentaje) || 0

  const preview = productos.slice(0, 5).map(p => ({
    nombre: p.nombre,
    precioActual: p.precio_costo_sin_iva,
    precioNuevo: parseFloat((p.precio_costo_sin_iva * (1 + pct / 100)).toFixed(2)),
  }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-secondary/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-bold text-secondary">Modificar Precio S/IVA en Bloque</h3>
              <p className="text-xs text-secondary-400">
                {productos.length} productos · <span className="font-semibold text-primary">{marcaFiltradaNombre}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-secondary-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Porcentaje */}
          <div>
            <label className="block text-xs font-bold text-secondary-400 uppercase tracking-wider mb-2">
              Porcentaje de aumento / descuento
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.01"
                value={porcentaje}
                onChange={e => setPorcentaje(e.target.value)}
                placeholder="Ej: 10 para +10%  /  -5 para bajar 5%"
                className="input-field flex-1 text-lg font-bold"
                autoFocus
              />
              <span className="text-2xl font-extrabold text-secondary">%</span>
            </div>
            {pct !== 0 && (
              <p className={`mt-1 text-sm font-semibold ${pct > 0 ? 'text-emerald-600' : 'text-danger'}`}>
                {pct > 0 ? `↑ Aumento del ${pct}%` : `↓ Descuento del ${Math.abs(pct)}%`} sobre el precio s/IVA.
                Los precios c/IVA y de venta se recalcularán automáticamente.
              </p>
            )}
          </div>

          {/* Preview */}
          {pct !== 0 && preview.length > 0 && (
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-bold text-secondary-400 uppercase tracking-wider mb-3">Vista previa (primeros 5)</p>
              <div className="space-y-2">
                {preview.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-secondary truncate max-w-[60%]">{item.nombre}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-secondary-400 line-through text-xs">${item.precioActual.toFixed(2)}</span>
                      <span className="font-bold text-primary">${item.precioNuevo.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                {productos.length > 5 && (
                  <p className="text-xs text-secondary-400 text-center pt-1">… y {productos.length - 5} productos más</p>
                )}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button
              onClick={() => pct !== 0 && onApply(pct)}
              disabled={pct === 0 || loading}
              className="btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Aplicando…</>
              ) : (
                <><Check className="w-4 h-4" /> Aplicar a {productos.length} productos</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Página Inventario ───────────────────────────────────────────────────────

export default function InventarioPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filtroStock = searchParams.get('filter') || 'todos'

  const [search, setSearch]               = useState('')
  const [filtroMarca, setFiltroMarca]     = useState('')
  const [importPreview, setImportPreview] = useState<ProductoImportRow[] | null>(null)
  const [importError, setImportError]     = useState<string | null>(null)
  const [importing, setImporting]         = useState(false)
  const [showModal, setShowModal]         = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedIds, setSelectedIds]     = useState<number[]>([])

  const qc = useQueryClient()
  const { data: productos, isLoading, refetch } = useProductos(search)
  const { data: marcas = [] }                    = useMarcas()
  const updateProducto                           = useUpdateProducto()
  const importProductos                          = useImportProductos()
  const bulkUpdatePrecios                        = useBulkUpdatePrecios()
  const deleteVariantes                          = useDeleteVariantes()
  const limpiarCatalogo                          = useLimpiarCatalogo()

  // ── Import ──
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    try {
      const rows = await parseProductosFile(file)
      setImportPreview(rows)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Error al procesar el archivo.')
    }
    e.target.value = ''
  }

  const handleImportConfirm = async () => {
    if (!importPreview) return
    setImporting(true)
    try {
      // 1. Obtener nombres de marcas únicos y no vacíos
      const marcasUnicasExcel = Array.from(new Set(
        importPreview
          .map(row => row.marca.trim().toUpperCase())
          .filter(name => name.length > 0)
      ))

      // 2. Traer marcas de la DB actuales
      const { data: dbBrands, error: bErr } = await supabase.from('marcas').select('*')
      if (bErr) throw bErr

      const brandMap = new Map<string, number>()
      if (dbBrands) {
        dbBrands.forEach(b => brandMap.set(b.nombre.toUpperCase().trim(), b.id))
      }

      // 3. Crear marcas faltantes
      for (const brandName of marcasUnicasExcel) {
        if (!brandMap.has(brandName)) {
          const { data: newBrand, error: insertErr } = await supabase
            .from('marcas')
            .insert({ nombre: brandName })
            .select('id')
            .single()

          if (insertErr) throw insertErr
          brandMap.set(brandName, newBrand.id)
        }
      }

      // 4. Mapear productos vinculando marca_id correcta
      const prods = importPreview.map(row => {
        const brandKey = row.marca.trim().toUpperCase()
        return {
          nombre:               row.nombre,
          presentacion:         row.presentacion || null,
          marca_id:             brandMap.get(brandKey) ?? null,
          precio_costo_sin_iva: row.precio_costo_sin_iva,
          precio_costo_con_iva: row.precio_costo_con_iva,
          precio_venta:         row.precio_venta,
          stock_actual:         row.stock_actual,
          stock_minimo:         row.stock_minimo || 5,
          fecha_vencimiento:    null,
          codigo_barras:        row.codigo_barras || null,
          activo:               true,
        }
      })

      await importProductos.mutateAsync(prods)
      setImportPreview(null)
      refetch()
      qc.invalidateQueries({ queryKey: ['marcas'] })
    } catch (err: any) {
      // Extraer detalle completo del error (Supabase devuelve objetos, no Error estándar)
      const msg = err?.message
        || err?.error_description
        || (err?.details ? `${err.code}: ${err.details}` : null)
        || (typeof err === 'string' ? err : null)
        || JSON.stringify(err)
        || 'Error al importar productos.'
      setImportError(msg)
    } finally {
      setImporting(false)
    }
  }


  // ── Export ──
  const handleExport = (format: 'xlsx' | 'csv') => {
    if (!productos) return
    const data = productos.map(p => ({
      'Código Barras':  p.codigo_barras ?? '',
      'Nombre':         p.nombre,
      'Presentación':   p.presentacion ?? '',
      'Marca':          p.marcas?.nombre ?? '',
      'Costo S/IVA':    p.precio_costo_sin_iva,
      'Costo C/IVA':    p.precio_costo_con_iva,
      'Precio Venta':   p.precio_venta,
      'Stock Actual':   p.stock_actual,
      'Stock Mínimo':   p.stock_minimo,
      'Estado':         p.activo ? 'Activo' : 'Inactivo',
    }))
    if (format === 'xlsx') exportToExcel(data)
    else exportToCSV(data)
  }

  // Standalone Brand Creation
  const handleCrearNuevaMarcaStandalone = async () => {
    const { value: brandName } = await Swal.fire({
      title: 'Crear Nueva Marca',
      input: 'text',
      inputLabel: 'Nombre de la marca',
      inputPlaceholder: 'Ej: VICTORIA, ALBA...',
      showCancelButton: true,
      confirmButtonText: 'Crear',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#E55B2B',
      inputValidator: (value) => {
        if (!value) {
          return '¡Tenés que ingresar un nombre!'
        }
      }
    })

    if (brandName) {
      try {
        const { error } = await supabase
          .from('marcas')
          .insert({ nombre: brandName.trim().toUpperCase() })
        if (error) throw error

        await Swal.fire({
          title: '¡Creada!',
          text: `La marca "${brandName.trim().toUpperCase()}" se creó correctamente.`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
        })

        qc.invalidateQueries({ queryKey: ['marcas'] })
      } catch (err: any) {
        Swal.fire('Error', err.message || 'No se pudo crear la marca.', 'error')
      }
    }
  }

  const handleSingleDelete = async (producto: Producto) => {
    const result = await Swal.fire({
      title: '¿Eliminar producto?',
      text: `Esta acción eliminará "${producto.nombre}" definitivamente del inventario y no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#E55B2B',
    })

    if (result.isConfirmed) {
      try {
        await deleteVariantes.mutateAsync([producto.id])
        Swal.fire({
          title: '¡Eliminado!',
          text: 'El producto fue eliminado del inventario.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
        })
        setSelectedIds(prev => prev.filter(id => id !== producto.id))
      } catch (err: any) {
        Swal.fire('Error', err.message || 'No se pudo eliminar el producto.', 'error')
      }
    }
  }

  const handleBulkDelete = async () => {
    const result = await Swal.fire({
      title: `¿Eliminar ${selectedIds.length} productos?`,
      text: 'Esta acción eliminará todos los elementos seleccionados definitivamente y no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar todos',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#E55B2B',
    })

    if (result.isConfirmed) {
      try {
        await deleteVariantes.mutateAsync(selectedIds)
        Swal.fire({
          title: '¡Eliminados!',
          text: `${selectedIds.length} productos fueron eliminados.`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
        })
        setSelectedIds([])
      } catch (err: any) {
        Swal.fire('Error', err.message || 'No se pudieron eliminar los productos.', 'error')
      }
    }
  }

  const handleLimpiarCatalogo = async () => {
    // Primera confirmación
    const paso1 = await Swal.fire({
      title: '⚠️ Limpiar catálogo completo',
      html: `<p class="text-sm text-gray-600">Esta acción eliminará <strong>todos los productos y variantes</strong> del inventario.</p>
             <p class="text-sm text-gray-600 mt-2">Las marcas, convenios, usuarios y el historial de ventas se conservarán.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Continuar →',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
    })
    if (!paso1.isConfirmed) return

    // Segunda confirmación — escribir CONFIRMAR
    const paso2 = await Swal.fire({
      title: 'Confirmación final',
      html: `<p class="text-sm text-gray-600 mb-3">Escribí <strong>LIMPIAR</strong> para confirmar la eliminación de todo el catálogo.</p>`,
      input: 'text',
      inputPlaceholder: 'LIMPIAR',
      showCancelButton: true,
      confirmButtonText: 'Eliminar todo',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      inputValidator: (val) => {
        if (val !== 'LIMPIAR') return 'Debés escribir LIMPIAR exactamente'
      }
    })
    if (!paso2.isConfirmed) return

    try {
      await limpiarCatalogo.mutateAsync()
      await Swal.fire({
        title: '¡Catálogo limpio!',
        text: 'Todos los productos y variantes fueron eliminados. Podés importar el nuevo catálogo.',
        icon: 'success',
        confirmButtonColor: '#E55B2B',
      })
      setSelectedIds([])
      refetch()
    } catch (err: any) {
      Swal.fire('Error', err.message || 'No se pudo limpiar el catálogo.', 'error')
    }
  }

  const handleToggleSelect = (id: number, selected: boolean) => {
    setSelectedIds(prev => selected ? [...prev, id] : prev.filter(x => x !== id))
  }

  const handleToggleSelectAll = (selected: boolean) => {
    if (selected && productosFiltrados) {
      setSelectedIds(productosFiltrados.map(p => p.id))
    } else {
      setSelectedIds([])
    }
  }

  // Filter products based on stock filter + marca filter
  const productosFiltrados = productos?.filter(p => {
    if (filtroMarca && String(p.marca_id) !== filtroMarca) return false
    if (filtroStock === 'sin_stock') return p.stock_actual <= 0
    if (filtroStock === 'critico') return p.stock_actual <= 1
    if (filtroStock === 'por_vencer') {
      if (!p.fecha_vencimiento) return false
      const [y, m, d] = p.fecha_vencimiento.split('-')
      const fechaVenc = new Date(Number(y), Number(m) - 1, Number(d))
      const unMesMas = new Date()
      unMesMas.setDate(unMesMas.getDate() + 30)
      return fechaVenc <= unMesMas
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* ── Modal Cargar Producto ── */}
      {showModal && (
        <CargarProductoModal
          marcas={marcas}
          onClose={() => setShowModal(false)}
          onSuccess={() => refetch()}
        />
      )}

      {/* ── Modal Actualización Masiva de Precios ── */}
      {showBulkModal && (
        <BulkPreciosModal
          productos={productosFiltrados ?? []}
          marcaFiltradaNombre={filtroMarca ? (marcas.find(m => String(m.id) === filtroMarca)?.nombre ?? 'Seleccionados') : 'Todos los productos'}
          onClose={() => setShowBulkModal(false)}
          onApply={async (pct) => {
            const updates = (productosFiltrados ?? []).map(p => {
              const nuevoSinIva = p.precio_costo_sin_iva * (1 + pct / 100)
              return {
                id: p.id,
                sin_iva: parseFloat(nuevoSinIva.toFixed(2)),
                con_iva: parseFloat((nuevoSinIva * 1.21).toFixed(2)),
                venta: parseFloat((nuevoSinIva * 1.21 * 1.20).toFixed(2)),
              }
            })
            await bulkUpdatePrecios.mutateAsync(updates)
            setShowBulkModal(false)
            refetch()
          }}
          loading={bulkUpdatePrecios.isPending}
        />
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-secondary">Inventario de Productos</h2>
          <p className="text-sm text-secondary-400">
            {productosFiltrados?.length ?? 0} de {productos?.length ?? 0} variantes
            {filtroMarca && ` · ${marcas.find(m => String(m.id) === filtroMarca)?.nombre ?? ''}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* ✅ Botón Cargar Producto */}
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Cargar producto
          </button>
          <button onClick={handleCrearNuevaMarcaStandalone} className="btn-secondary">
            <Plus className="w-4 h-4" />
            Nueva marca
          </button>
          <button onClick={() => setShowBulkModal(true)} className="btn-secondary border-orange-300 text-orange-600 hover:bg-orange-50">
            <RefreshCw className="w-4 h-4" />
            Modificar precio en bloque
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary">
            <Upload className="w-4 h-4" />
            Importar
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileChange} />
          <button onClick={() => handleExport('xlsx')} className="btn-secondary">
            <FileSpreadsheet className="w-4 h-4" />
            .xlsx
          </button>
          <button onClick={() => handleExport('csv')} className="btn-secondary">
            <Download className="w-4 h-4" />
            .csv
          </button>
          <button
            onClick={handleLimpiarCatalogo}
            disabled={limpiarCatalogo.isPending}
            className="btn-secondary border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {limpiarCatalogo.isPending
              ? <><span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> Limpiando…</>
              : <><DatabaseBackup className="w-4 h-4" /> Limpiar catálogo</>
            }
          </button>
        </div>
      </div>

      {/* ── Barra de acciones por lote ── */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-red-50 border border-red-100 animate-fade-in shadow-sm">
          <div className="flex items-center gap-2 text-danger">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-bounce" />
            <span className="font-semibold text-sm">
              Has seleccionado {selectedIds.length} producto{selectedIds.length > 1 ? 's' : ''} para eliminar.
            </span>
          </div>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 py-2 px-4 rounded-xl bg-danger hover:bg-red-600 text-white text-sm font-semibold transition-all shadow-md shadow-red-200"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar seleccionados
          </button>
        </div>
      )}

      {/* ── Error de importación ── */}
      {importError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-danger-light border border-red-200 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-danger">Error al importar</p>
            <p className="text-sm text-danger mt-0.5">{importError}</p>
          </div>
          <button onClick={() => setImportError(null)} className="ml-auto">
            <X className="w-4 h-4 text-danger" />
          </button>
        </div>
      )}

      {/* ── Preview de importación ── */}
      {importPreview && (
        <div className="card border-2 border-warning animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-secondary">Vista previa de importación</h3>
              <p className="text-sm text-secondary-400">{importPreview.length} productos detectados</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setImportPreview(null)} className="btn-ghost">
                <X className="w-4 h-4" />
                Cancelar
              </button>
              <button onClick={handleImportConfirm} disabled={importing} className="btn-primary">
                {importing ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : <Check className="w-4 h-4" />}
                Confirmar importación
              </button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-48">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="table-header text-left">Nombre</th>
                  <th className="table-header">Marca</th>
                  <th className="table-header">Precio Venta</th>
                  <th className="table-header">Stock</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.slice(0, 10).map((r, i) => (
                  <tr key={i} className="table-row">
                    <td className="table-cell">{r.nombre} <span className="text-secondary-400">{r.presentacion}</span></td>
                    <td className="table-cell text-center">{r.marca}</td>
                    <td className="table-cell text-center">{formatARS(r.precio_venta)}</td>
                    <td className="table-cell text-center">{r.stock_actual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {importPreview.length > 10 && (
              <p className="text-center text-xs text-secondary-400 py-2">
                … y {importPreview.length - 10} productos más
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Buscador y Filtros ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            id="inv-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, presentación o marca…"
            className="input-field pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-secondary-400 whitespace-nowrap">
            Marca:
          </label>
          <select
            value={filtroMarca}
            onChange={e => setFiltroMarca(e.target.value)}
            className="input-field py-1.5 px-3 min-w-[150px]"
          >
            <option value="">Todas las marcas</option>
            {marcas.map(m => (
              <option key={m.id} value={String(m.id)}>{m.nombre}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-secondary-400 whitespace-nowrap">
            Stock:
          </label>
          <select
            value={filtroStock}
            onChange={(e) => {
              if (e.target.value === 'todos') {
                searchParams.delete('filter')
              } else {
                searchParams.set('filter', e.target.value)
              }
              setSearchParams(searchParams)
            }}
            className="input-field py-1.5 px-3 min-w-[150px]"
          >
            <option value="todos">Mostrar todos</option>
            <option value="critico">Stock crítico (≤ 1)</option>
            <option value="sin_stock">Sin stock (0)</option>
            <option value="por_vencer">Por vencer (30 días)</option>
          </select>
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 gap-3 text-secondary-400">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Cargando inventario…</span>
          </div>
        ) : productosFiltrados && productosFiltrados.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header w-10 text-center rounded-tl-2xl">
                    <input
                      type="checkbox"
                      checked={productosFiltrados.length > 0 && selectedIds.length === productosFiltrados.length}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="rounded text-primary focus:ring-primary border-slate-300 w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="table-header text-left">Producto</th>
                  <th className="table-header">Marca</th>
                  <th className="table-header">Costo S/IVA</th>
                  <th className="table-header">Costo C/IVA</th>
                  <th className="table-header">Precio Venta</th>
                  <th className="table-header">Stock</th>
                  <th className="table-header">Estado</th>
                  <th className="table-header">Vencimiento</th>
                  <th className="table-header rounded-tr-2xl">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map((p) => (
                  <ProductRow
                    key={p.id}
                    producto={p}
                    isSelected={selectedIds.includes(p.id)}
                    onSelect={(sel) => handleToggleSelect(p.id, sel)}
                    onSave={(updates) => updateProducto.mutate(updates)}
                    onDelete={() => handleSingleDelete(p)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-secondary-400">
            <Package className="w-10 h-10 opacity-40" />
            <p className="text-sm">
              {search ? 'No se encontraron productos con ese criterio.' : 'Aún no hay productos cargados.'}
            </p>
            <button onClick={() => setShowModal(true)} className="btn-primary mt-1">
              <Plus className="w-4 h-4" />
              Cargar primer producto
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

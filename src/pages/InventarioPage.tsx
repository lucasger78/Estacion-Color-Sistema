import React, { useState, useRef } from 'react'
import {
  Search, Plus, Upload, Download, RefreshCw,
  Edit3, Package, Check, X, AlertTriangle, FileSpreadsheet,
  Loader2,
} from 'lucide-react'
import {
  useProductos, useMarcas, useUpdateProducto,
  useImportProductos,
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
                  onChange={set('precio_sin_iva')} placeholder="0.00" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Costo c/IVA</label>
                <input type="number" min="0" step="0.01" value={form.precio_con_iva}
                  onChange={set('precio_con_iva')} placeholder="0.00" className={inputClass} />
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

function ProductRow({ producto, onSave }: { producto: Producto; onSave: (updates: Partial<Producto> & { id: number }) => void }) {
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

  const tdInput = (field: keyof EditState) => (
    <input
      type="number"
      value={form[field]}
      onChange={(e) => setForm(prev => ({ ...prev, [field]: e.target.value }))}
      className="w-24 px-2 py-1 rounded-lg border border-primary/40 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
    />
  )

  return (
    <tr className="table-row">
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
          <div className="flex items-center gap-1">
            <button onClick={handleSave} className="p-1.5 rounded-lg bg-success text-white hover:bg-emerald-600 transition-colors">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleCancel} className="p-1.5 rounded-lg bg-slate-200 text-secondary-400 hover:bg-slate-300 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg hover:bg-primary-soft hover:text-primary text-secondary-400 transition-colors"
            title="Editar"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}
      </td>
    </tr>
  )
}

// ── Página Inventario ───────────────────────────────────────────────────────

export default function InventarioPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filtroStock = searchParams.get('filter') || 'todos'

  const [search, setSearch]               = useState('')
  const [importPreview, setImportPreview] = useState<ProductoImportRow[] | null>(null)
  const [importError, setImportError]     = useState<string | null>(null)
  const [importing, setImporting]         = useState(false)
  const [showModal, setShowModal]         = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: productos, isLoading, refetch } = useProductos(search)
  const { data: marcas = [] }                    = useMarcas()
  const updateProducto                           = useUpdateProducto()
  const importProductos                          = useImportProductos()

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
    if (!importPreview || !marcas) return
    setImporting(true)
    try {
      const marcaMap = new Map(marcas.map(m => [m.nombre.toLowerCase(), m.id]))

      const prods = importPreview.map(row => {
        const marcaKey = row.marca.toLowerCase().trim()
        return {
          nombre:               row.nombre,
          presentacion:         row.presentacion || null,
          marca_id:             marcaMap.get(marcaKey) ?? null,
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
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Error al importar productos.')
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

  // Filter products based on the stock filter
  const productosFiltrados = productos?.filter(p => {
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

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-secondary">Inventario de Productos</h2>
          <p className="text-sm text-secondary-400">
            {productos?.length ?? 0} variantes · Edición inline habilitada
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* ✅ Botón Cargar Producto */}
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Cargar producto
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
        </div>
      </div>

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
            Filtro de Stock:
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
                  <th className="table-header text-left rounded-tl-2xl">Producto</th>
                  <th className="table-header">Marca</th>
                  <th className="table-header">Costo S/IVA</th>
                  <th className="table-header">Costo C/IVA</th>
                  <th className="table-header">Precio Venta</th>
                  <th className="table-header">Stock</th>
                  <th className="table-header">Estado</th>
                  <th className="table-header">Vencimiento</th>
                  <th className="table-header rounded-tr-2xl">Editar</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map((p) => (
                  <ProductRow
                    key={p.id}
                    producto={p}
                    onSave={(updates) => updateProducto.mutate(updates)}
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

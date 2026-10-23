import { useState, useRef, useEffect } from 'react'
import {
  Search, Plus, Trash2, FileText, Printer, Save,
  Minus, UserPlus, UserCheck, Clock, X
} from 'lucide-react'
import { useProductos, type Producto } from '../hooks/useProductos'
import { useClientes, useCrearCliente } from '../hooks/useClientes'
import {
  usePresupuestos, useGuardarPresupuesto,
  useEliminarPresupuesto, type PresupuestoItem
} from '../hooks/usePresupuestos'
import { formatARS, formatDateTime } from '../utils/formatters'
import Swal from 'sweetalert2'

// ── Item de Carrito de Presupuesto ─────────────────────────────────────────

type CartPresupuestoItem = PresupuestoItem & {
  stock_actual?: number
}

function PresupuestoCartItem({
  item,
  index,
  onQtyChange,
  onPriceChange,
  onRemove,
}: {
  item:          CartPresupuestoItem
  index:         number
  onQtyChange:   (index: number, qty: number) => void
  onPriceChange: (index: number, price: number) => void
  onRemove:      (index: number) => void
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-slate-100 last:border-0 animate-fade-in">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-secondary truncate">{item.nombre_producto}</p>
        {item.presentacion && (
          <p className="text-xs text-secondary-400">{item.presentacion}</p>
        )}
      </div>

      {/* Cantidad */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-secondary-400 sm:hidden">Cant:</span>
        <button
          type="button"
          onClick={() => onQtyChange(index, Math.max(1, item.cantidad - 1))}
          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center
                     text-secondary-400 hover:border-primary hover:text-primary transition-colors text-sm font-bold"
        >
          <Minus className="w-3 h-3" />
        </button>
        <input
          type="number"
          min="1"
          value={item.cantidad}
          onChange={(e) => onQtyChange(index, Math.max(1, parseInt(e.target.value) || 1))}
          className="w-12 text-center text-sm font-bold text-secondary border border-slate-200 rounded-lg py-1 focus:outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => onQtyChange(index, item.cantidad + 1)}
          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center
                     text-secondary-400 hover:border-primary hover:text-primary transition-colors text-sm font-bold"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Precio Unitario editable */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-secondary-400 sm:hidden">Unit:</span>
        <span className="text-xs text-secondary-400 font-semibold">$</span>
        <input
          type="number"
          step="any"
          min="0"
          value={item.precio_unitario}
          onChange={(e) => onPriceChange(index, parseFloat(e.target.value) || 0)}
          className="w-24 px-2 py-1 text-right text-sm font-semibold text-secondary border border-slate-200 rounded-lg focus:outline-none focus:border-primary"
        />
      </div>

      {/* Subtotal */}
      <p className="w-28 text-right text-sm font-bold text-primary">
        {formatARS(item.cantidad * item.precio_unitario)}
      </p>

      {/* Eliminar */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-secondary-300 hover:text-red-500 hover:bg-red-50 transition-colors"
        title="Eliminar ítem"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── MODAL DE IMPRESIÓN Y VISTA PREVIA PROFESIONAL ─────────────────────────

function PresupuestoPrintModal({
  presupuesto,
  onClose,
}: {
  presupuesto: {
    numero_presupuesto?: number
    cliente_nombre:      string
    cliente_telefono?:   string | null
    cliente_email?:      string | null
    cliente_direccion?:  string | null
    monto_total:         number
    validez_dias:        number
    notas?:              string | null
    fecha_presupuesto?:  string
    items:               CartPresupuestoItem[]
  }
  onClose: () => void
}) {
  const handlePrint = () => {
    window.print()
  }

  const fechaEmision = presupuesto.fecha_presupuesto
    ? new Date(presupuesto.fecha_presupuesto).toLocaleDateString()
    : new Date().toLocaleDateString()

  const fechaVencimiento = (() => {
    const d = presupuesto.fecha_presupuesto ? new Date(presupuesto.fecha_presupuesto) : new Date()
    d.setDate(d.getDate() + (presupuesto.validez_dias || 15))
    return d.toLocaleDateString()
  })()

  return (
    <div className="fixed inset-0 bg-secondary/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-card-lg max-w-3xl w-full p-6 sm:p-8 my-auto border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Barra superior de acciones (Se oculta al imprimir) */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-primary" />
            <h3 className="font-extrabold text-secondary text-lg">Vista Previa de Presupuesto</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary bg-emerald-600 hover:bg-emerald-700"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Guardar PDF
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-secondary-300 hover:text-secondary hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Documento Imprimible ── */}
        <div id="printable-presupuesto" className="flex-1 overflow-y-auto p-4 space-y-6 text-secondary bg-white">
          {/* Membrete / Encabezado */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b-2 border-primary/20 pb-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Estación Color Logo" className="w-16 h-16 object-contain" />
              <div>
                <h1 className="text-xl font-black text-secondary tracking-tight">Estación Color Pinturería</h1>
                <p className="text-xs text-secondary-400 font-medium">Venta de Pinturas, Impermeabilizantes y Accesorios</p>
                <p className="text-xs text-secondary-400">Ruta C45 KM 1, Córdoba</p>
              </div>
            </div>

            <div className="text-right bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-[200px]">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary uppercase tracking-wider mb-1">
                PRESUPUESTO
              </span>
              <p className="text-lg font-extrabold text-secondary">
                {presupuesto.numero_presupuesto
                  ? `#PRES-${String(presupuesto.numero_presupuesto).padStart(6, '0')}`
                  : '#BORRADOR'}
              </p>
              <p className="text-xs text-secondary-400 mt-1">Fecha: <strong>{fechaEmision}</strong></p>
              <p className="text-xs text-secondary-400">Válido hasta: <strong>{fechaVencimiento}</strong> ({presupuesto.validez_dias} días)</p>
            </div>
          </div>

          {/* Datos del Cliente */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-bold text-secondary-400 uppercase tracking-wider text-[10px] mb-0.5">Cliente</p>
              <p className="text-sm font-extrabold text-secondary">{presupuesto.cliente_nombre}</p>
              {presupuesto.cliente_direccion && <p className="text-secondary-400 mt-0.5">📍 {presupuesto.cliente_direccion}</p>}
            </div>
            <div className="sm:text-right">
              {presupuesto.cliente_telefono && <p className="text-secondary-400">📞 Teléfono: <strong className="text-secondary">{presupuesto.cliente_telefono}</strong></p>}
              {presupuesto.cliente_email && <p className="text-secondary-400">✉️ Email: <strong className="text-secondary">{presupuesto.cliente_email}</strong></p>}
            </div>
          </div>

          {/* Tabla de Productos */}
          <div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 text-[11px] font-bold uppercase tracking-wider text-secondary-400 bg-slate-50">
                  <th className="py-2.5 px-3 text-center w-10">#</th>
                  <th className="py-2.5 px-3">Producto / Descripción</th>
                  <th className="py-2.5 px-3 text-center w-20">Cant.</th>
                  <th className="py-2.5 px-3 text-right w-28">P. Unitario</th>
                  <th className="py-2.5 px-3 text-right w-32">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {presupuesto.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-center text-secondary-400">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-secondary">{item.nombre_producto}</p>
                      {item.presentacion && <p className="text-[11px] text-secondary-400">{item.presentacion}</p>}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-secondary">{item.cantidad}</td>
                    <td className="py-2.5 px-3 text-right text-secondary-400">{formatARS(item.precio_unitario)}</td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-secondary">{formatARS(item.cantidad * item.precio_unitario)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total e Importes */}
          <div className="flex flex-col sm:flex-row items-end justify-between gap-4 pt-4 border-t-2 border-slate-200">
            <div className="text-xs text-secondary-400 space-y-1 max-w-md">
              {presupuesto.notas && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800">
                  <p className="font-bold text-[11px] uppercase tracking-wider mb-0.5">Observaciones</p>
                  <p className="whitespace-pre-line">{presupuesto.notas}</p>
                </div>
              )}
              <p className="text-[11px] text-secondary-400 pt-1">
                • Los precios del presente presupuesto están sujetos a modificaciones según variación de lista sin previo aviso una vez transcurrido el plazo de validez.
              </p>
            </div>

            <div className="w-full sm:w-64 bg-secondary text-white p-4 rounded-xl text-right">
              <p className="text-xs text-white/70 uppercase tracking-wider font-semibold">Total Presupuestado</p>
              <p className="text-2xl font-black text-white">{formatARS(presupuesto.monto_total)}</p>
            </div>
          </div>

          {/* Firma / Pie */}
          <div className="pt-8 text-center border-t border-slate-100 text-xs text-secondary-400">
            <p className="font-semibold">¡Gracias por elegir Pinturerías Estación Color!</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MODAL NUEVO CLIENTE RÁPIDO ──────────────────────────────────────────────

function NuevoClienteModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: (client: any) => void
}) {
  const [nombre, setNombre]       = useState('')
  const [telefono, setTelefono]   = useState('')
  const [email, setEmail]         = useState('')
  const [direccion, setDireccion] = useState('')
  const crearCliente              = useCrearCliente()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return

    try {
      const newClient = await crearCliente.mutateAsync({
        nombre:         nombre.trim(),
        telefono:       telefono.trim() || null,
        email:          email.trim() || null,
        direccion:      direccion.trim() || null,
        limite_credito: 0,
        activo:         true,
      })

      Swal.fire({
        icon: 'success',
        title: '¡Cliente Creado!',
        text: `${newClient.nombre} fue registrado y seleccionado.`,
        timer: 1500,
        showConfirmButton: false,
        customClass: {
          popup: 'rounded-2xl',
        }
      })

      onSuccess(newClient)
      onClose()
      setNombre('')
      setTelefono('')
      setEmail('')
      setDireccion('')
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err instanceof Error ? err.message : 'No se pudo crear el cliente.',
        customClass: { popup: 'rounded-2xl' }
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-secondary/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-card-lg max-w-md w-full p-6 border border-slate-100">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-primary font-bold text-lg">
            <UserPlus className="w-5 h-5" />
            <h3>Registrar Nuevo Cliente</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-secondary hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              Nombre Completo / Razón Social <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Juan Pérez / Constructora SRL"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Teléfono</label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="3541-123456"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Dirección</label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Av. San Martín 123"
              className="input-field"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs py-2 px-4"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={crearCliente.isPending || !nombre.trim()}
              className="btn-primary text-xs py-2 px-5"
            >
              {crearCliente.isPending ? 'Guardando...' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── PÁGINA PRINCIPAL PRESUPUESTOS ──────────────────────────────────────────

export default function PresupuestosPage() {
  const [activeTab, setActiveTab] = useState<'crear' | 'historial'>('crear')

  // Estado del Carrito de Presupuesto
  const [search, setSearch]               = useState('')
  const [showResults, setShowResults]     = useState(false)
  const [cart, setCart]                   = useState<CartPresupuestoItem[]>([])
  const [validezDias, setValidezDias]     = useState(15)
  const [notas, setNotas]                 = useState('')

  // Estado del Cliente seleccionado
  const [clienteId, setClienteId]         = useState<number | null>(null)
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteTel, setClienteTel]       = useState('')
  const [clienteEmail, setClienteEmail]   = useState('')
  const [clienteDir, setClienteDir]       = useState('')

  // Modal Nuevo Cliente y Vista Previa
  const [showNuevoClienteModal, setShowNuevoClienteModal] = useState(false)
  const [previewPresupuesto, setPreviewPresupuesto]       = useState<any | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // Hooks
  const { data: productos } = useProductos(search)
  const { data: clientes }  = useClientes()
  const guardarPresupuesto  = useGuardarPresupuesto()

  // Historial
  const [searchHistorial, setSearchHistorial]             = useState('')
  const [estadoFilterHistorial, setEstadoFilterHistorial] = useState('todos')
  const { data: presupuestos, isLoading: loadingHistorial } = usePresupuestos(searchHistorial, estadoFilterHistorial)
  const eliminarPresupuesto = useEliminarPresupuesto()

  // Cerrar buscador al hacer click fuera
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Seleccionar cliente de la lista
  const handleSelectCliente = (idStr: string) => {
    if (!idStr) {
      setClienteId(null)
      setClienteNombre('Cliente Ocasional')
      setClienteTel('')
      setClienteEmail('')
      setClienteDir('')
      return
    }

    const cId = Number(idStr)
    const found = clientes?.find(c => c.id === cId)
    if (found) {
      setClienteId(found.id)
      setClienteNombre(found.nombre)
      setClienteTel(found.telefono || '')
      setClienteEmail(found.email || '')
      setClienteDir(found.direccion || '')
    }
  }

  // Agregar producto al carrito de presupuesto
  const addToCart = (p: Producto) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(i => i.variante_id === p.id)
      if (existingIdx >= 0) {
        const updated = [...prev]
        updated[existingIdx].cantidad += 1
        updated[existingIdx].subtotal = updated[existingIdx].cantidad * updated[existingIdx].precio_unitario
        return updated
      }

      return [...prev, {
        producto_id:     p.producto_id,
        variante_id:     p.id,
        nombre_producto: `${p.nombre}`,
        presentacion:    p.presentacion || null,
        cantidad:        1,
        precio_unitario: p.precio_venta,
        subtotal:        p.precio_venta,
        stock_actual:    p.stock_actual,
      }]
    })
    setSearch('')
    setShowResults(false)
  }

  const handleQtyChange = (index: number, qty: number) => {
    setCart(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, cantidad: qty, subtotal: qty * item.precio_unitario }
      }
      return item
    }))
  }

  const handlePriceChange = (index: number, price: number) => {
    setCart(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, precio_unitario: price, subtotal: item.cantidad * price }
      }
      return item
    }))
  }

  const handleRemoveItem = (index: number) => {
    setCart(prev => prev.filter((_, idx) => idx !== index))
  }

  const totalPresupuesto = cart.reduce((acc, i) => acc + (i.cantidad * i.precio_unitario), 0)

  // Guardar Presupuesto en Supabase
  const handleGuardar = async () => {
    if (cart.length === 0) {
      Swal.fire('Carrito Vacío', 'Agregá al menos un producto para guardar el presupuesto.', 'warning')
      return
    }

    try {
      const res = await guardarPresupuesto.mutateAsync({
        cliente_id:        clienteId,
        cliente_nombre:    clienteNombre.trim() || 'Cliente Ocasional',
        cliente_telefono:  clienteTel.trim() || null,
        cliente_email:     clienteEmail.trim() || null,
        cliente_direccion: clienteDir.trim() || null,
        validez_dias:      validezDias,
        notas:             notas.trim() || null,
        items:             cart,
      })

      Swal.fire({
        icon: 'success',
        title: '¡Presupuesto Guardado!',
        text: `Presupuesto #${res.numero_presupuesto} guardado por ${formatARS(res.monto_total)}.`,
        confirmButtonColor: '#E55B2B'
      })

      // Ofrecer abrir vista previa de impresión
      setPreviewPresupuesto({
        numero_presupuesto: res.numero_presupuesto,
        cliente_nombre:     clienteNombre.trim() || 'Cliente Ocasional',
        cliente_telefono:   clienteTel.trim() || null,
        cliente_email:      clienteEmail.trim() || null,
        cliente_direccion:  clienteDir.trim() || null,
        monto_total:        res.monto_total,
        validez_dias:       validezDias,
        notas:              notas.trim() || null,
        fecha_presupuesto:  new Date().toISOString(),
        items:              cart,
      })

    } catch (err) {
      Swal.fire('Error', err instanceof Error ? err.message : 'Error al guardar el presupuesto.', 'error')
    }
  }

  // Previsualizar / Imprimir borrador directamente
  const handlePreviewDirect = () => {
    if (cart.length === 0) {
      Swal.fire('Carrito Vacío', 'Agregá productos al presupuesto antes de imprimir.', 'warning')
      return
    }
    setPreviewPresupuesto({
      cliente_nombre:    clienteNombre.trim() || 'Cliente Ocasional',
      cliente_telefono:  clienteTel.trim() || null,
      cliente_email:     clienteEmail.trim() || null,
      cliente_direccion: clienteDir.trim() || null,
      monto_total:       totalPresupuesto,
      validez_dias:      validezDias,
      notas:             notas.trim() || null,
      fecha_presupuesto: new Date().toISOString(),
      items:             cart,
    })
  }

  // Eliminar un presupuesto guardado
  const handleEliminarHistorial = async (id: number) => {
    const res = await Swal.fire({
      title: '¿Eliminar presupuesto?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#E55B2B'
    })
    if (res.isConfirmed) {
      await eliminarPresupuesto.mutateAsync(id)
      Swal.fire('Eliminado', 'El presupuesto fue eliminado.', 'success')
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Tabs y Encabezado ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-secondary">Presupuestos</h1>
          <p className="text-xs text-secondary-400">Generación, cotización, guardado e impresión de presupuestos comerciales.</p>
        </div>

        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('crear')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'crear' ? 'bg-white text-secondary shadow-sm' : 'text-secondary-400 hover:text-secondary'
            }`}
          >
            Crear Presupuesto
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'historial' ? 'bg-white text-secondary shadow-sm' : 'text-secondary-400 hover:text-secondary'
            }`}
          >
            Historial de Presupuestos
          </button>
        </div>
      </div>

      {/* ── TAB 1: CREAR PRESUPUESTO ── */}
      {activeTab === 'crear' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Buscador + Carrito */}
          <div className="lg:col-span-3 space-y-4">
            {/* Buscador de productos */}
            <div className="card">
              <h3 className="font-bold text-secondary mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                Buscar productos para cotizar
              </h3>

              <div className="relative" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowResults(true) }}
                  onFocus={() => setShowResults(true)}
                  placeholder="Buscar pintura por nombre, marca o código…"
                  className="input-field pl-10"
                  autoComplete="off"
                />

                {/* Resultados desplegables */}
                {showResults && search.length >= 2 && productos && productos.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-card-lg border border-slate-100 z-20 max-h-64 overflow-y-auto animate-fade-in">
                    {productos.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addToCart(p)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary-soft transition-colors text-left border-b border-slate-50 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-semibold text-secondary">{p.nombre}</p>
                          <p className="text-xs text-secondary-400">
                            {p.marcas?.nombre ?? ''} {p.presentacion ? `· ${p.presentacion}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">{formatARS(p.precio_venta)}</p>
                          <p className="text-xs text-secondary-400">Stock: {p.stock_actual}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Carrito / Tabla del Presupuesto */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-secondary flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Productos del Presupuesto
                </h3>
                {cart.length > 0 && (
                  <span className="badge-admin">{cart.length} ítems</span>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-secondary-400 gap-2">
                  <FileText className="w-8 h-8 opacity-30" />
                  <p className="text-sm">Buscá un producto arriba para agregarlo al presupuesto.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="hidden sm:flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-secondary-400 pb-2 border-b border-slate-100">
                    <span className="flex-1">Producto</span>
                    <span className="w-28 text-center">Cantidad</span>
                    <span className="w-28 text-right">P. Unitario</span>
                    <span className="w-28 text-right">Subtotal</span>
                    <span className="w-8"></span>
                  </div>

                  {cart.map((item, index) => (
                    <PresupuestoCartItem
                      key={index}
                      item={item}
                      index={index}
                      onQtyChange={handleQtyChange}
                      onPriceChange={handlePriceChange}
                      onRemove={handleRemoveItem}
                    />
                  ))}

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200">
                    <span className="font-extrabold text-secondary text-base">Total Presupuestado</span>
                    <span className="text-2xl font-black text-primary">{formatARS(totalPresupuesto)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panel Datos del Cliente y Guardado */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card space-y-4">
              <h3 className="font-bold text-secondary flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" />
                Datos del Cliente
              </h3>

              {/* Selector de Cliente */}
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">Seleccionar Cliente</label>
                <div className="flex gap-2">
                  <select
                    value={clienteId || ''}
                    onChange={(e) => handleSelectCliente(e.target.value)}
                    className="input-field flex-1 cursor-pointer"
                  >
                    <option value="">Cliente Ocasional / No Guardado</option>
                    {clientes?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} {c.telefono ? `(${c.telefono})` : ''}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setShowNuevoClienteModal(true)}
                    className="btn-secondary text-xs px-3 py-2 whitespace-nowrap bg-primary-soft text-primary hover:bg-primary/20"
                    title="Registrar cliente rápido"
                  >
                    <UserPlus className="w-4 h-4" />
                    + Cliente
                  </button>
                </div>
              </div>

              {/* Formulario editable cliente */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-secondary-400 mb-1">Nombre / Razón Social *</label>
                  <input
                    type="text"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    placeholder="Cliente Ocasional"
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-secondary-400 mb-1">Teléfono</label>
                    <input
                      type="text"
                      value={clienteTel}
                      onChange={(e) => setClienteTel(e.target.value)}
                      placeholder="3541-123456"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-secondary-400 mb-1">Email</label>
                    <input
                      type="email"
                      value={clienteEmail}
                      onChange={(e) => setClienteEmail(e.target.value)}
                      placeholder="email@cliente.com"
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary-400 mb-1">Dirección</label>
                  <input
                    type="text"
                    value={clienteDir}
                    onChange={(e) => setClienteDir(e.target.value)}
                    placeholder="Av. San Martín 123"
                    className="input-field"
                  />
                </div>
              </div>

              {/* Opciones de Presupuesto */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h3 className="font-bold text-secondary text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Condiciones del Presupuesto
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-secondary-400 mb-1">Validez de la cotización</label>
                  <select
                    value={validezDias}
                    onChange={(e) => setValidezDias(Number(e.target.value))}
                    className="input-field cursor-pointer"
                  >
                    <option value={7}>Válido por 7 días</option>
                    <option value={15}>Válido por 15 días</option>
                    <option value={30}>Válido por 30 días</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary-400 mb-1">Notas u Observaciones</label>
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Ej: Precios sujetos a modificación sin previo aviso. Pago contado/transferencia."
                    rows={2}
                    className="input-field resize-none"
                  />
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="pt-4 space-y-2">
                <button
                  type="button"
                  onClick={handleGuardar}
                  disabled={cart.length === 0 || guardarPresupuesto.isPending}
                  className="btn-primary w-full justify-center py-3 text-sm"
                >
                  {guardarPresupuesto.isPending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Guardando…
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Guardar Presupuesto ({formatARS(totalPresupuesto)})
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePreviewDirect}
                  disabled={cart.length === 0}
                  className="btn-secondary w-full justify-center py-2.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                >
                  <Printer className="w-4 h-4 text-emerald-600" />
                  Imprimir / Descargar PDF Directo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: HISTORIAL DE PRESUPUESTOS ── */}
      {activeTab === 'historial' && (
        <div className="card space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="font-bold text-secondary flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Presupuestos Guardados
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              {/* Filtro por estado */}
              <select
                value={estadoFilterHistorial}
                onChange={(e) => setEstadoFilterHistorial(e.target.value)}
                className="input-field py-1.5 px-3 text-xs sm:w-44 cursor-pointer"
              >
                <option value="todos">Todos los Estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="aprobado">Aprobados / Facturados</option>
                <option value="vencido">Vencidos</option>
                <option value="rechazado">Rechazados</option>
              </select>

              {/* Buscador */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <input
                  type="text"
                  value={searchHistorial}
                  onChange={(e) => setSearchHistorial(e.target.value)}
                  placeholder="Buscar por cliente, N° o nota…"
                  className="input-field pl-9 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>

          {loadingHistorial ? (
            <div className="flex items-center justify-center h-48 gap-2 text-secondary-400">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Cargando historial de presupuestos…
            </div>
          ) : !presupuestos || presupuestos.length === 0 ? (
            <div className="text-center py-12 text-secondary-400 space-y-2">
              <FileText className="w-10 h-10 opacity-30 mx-auto" />
              <p className="text-sm font-semibold">No se encontraron presupuestos guardados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-secondary-400">
                    <th className="py-3 px-4"># Presupuesto</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4 text-right">Monto Total</th>
                    <th className="py-3 px-4 text-center">Validez</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {presupuestos.map((p) => {
                    const items = (p.presupuestos_detalle || []).map(d => ({
                      nombre_producto: d.nombre_producto,
                      presentacion:    d.presentacion,
                      cantidad:        d.cantidad,
                      precio_unitario: d.precio_unitario,
                      subtotal:        d.subtotal,
                    }))

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-extrabold text-primary">
                          #PRES-{String(p.numero_presupuesto).padStart(6, '0')}
                        </td>
                        <td className="py-3 px-4 text-secondary-400">
                          {formatDateTime(p.fecha_presupuesto)}
                        </td>
                        <td className="py-3 px-4 font-bold text-secondary">
                          {p.cliente_nombre}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-secondary text-sm">
                          {formatARS(p.monto_total)}
                        </td>
                        <td className="py-3 px-4 text-center text-secondary-400">
                          {p.validez_dias} días
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`badge ${
                            p.estado === 'aprobado' ? 'bg-emerald-100 text-emerald-700' :
                            p.estado === 'vencido'  ? 'bg-amber-100 text-amber-700' :
                            p.estado === 'rechazado'? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-secondary-500'
                          }`}>
                            {p.estado}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setPreviewPresupuesto({
                                numero_presupuesto: p.numero_presupuesto,
                                cliente_nombre:     p.cliente_nombre,
                                cliente_telefono:   p.cliente_telefono,
                                cliente_email:      p.cliente_email,
                                cliente_direccion:  p.cliente_direccion,
                                monto_total:        p.monto_total,
                                validez_dias:       p.validez_dias,
                                notas:              p.notas,
                                fecha_presupuesto:  p.fecha_presupuesto,
                                items:              items,
                              })}
                              className="p-1.5 rounded-lg text-primary hover:bg-primary-soft transition-colors"
                              title="Ver / Imprimir Presupuesto"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleEliminarHistorial(p.id)}
                              className="p-1.5 rounded-lg text-secondary-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal de Vista Previa e Impresión ── */}
      {previewPresupuesto && (
        <PresupuestoPrintModal
          presupuesto={previewPresupuesto}
          onClose={() => setPreviewPresupuesto(null)}
        />
      )}

      {/* ── Modal Registrar Nuevo Cliente ── */}
      <NuevoClienteModal
        isOpen={showNuevoClienteModal}
        onClose={() => setShowNuevoClienteModal(false)}
        onSuccess={(newClient) => {
          setClienteId(newClient.id)
          setClienteNombre(newClient.nombre)
          setClienteTel(newClient.telefono || '')
          setClienteEmail(newClient.email || '')
          setClienteDir(newClient.direccion || '')
        }}
      />
    </div>
  )
}

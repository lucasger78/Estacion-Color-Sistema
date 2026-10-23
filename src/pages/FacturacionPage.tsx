import { useState, useRef, useEffect } from 'react'
import {
  Search, Plus, Trash2, ShoppingCart, CheckCircle2,
  CreditCard, DollarSign, Smartphone, Building2, Receipt,
  RefreshCw, Minus, FileText, X
} from 'lucide-react'
import { useProductos } from '../hooks/useProductos'
import { useClientes, type Cliente } from '../hooks/useClientes'
import { useVentasHoy, useProcesarVenta } from '../hooks/useVentas'
import { usePresupuestos, useCambiarEstadoPresupuesto, type Presupuesto } from '../hooks/usePresupuestos'
import { formatARS, formatDateTime } from '../utils/formatters'
import Swal from 'sweetalert2'
import type { VentaItem } from '../hooks/useVentas'
import type { Producto } from '../hooks/useProductos'

// ── MODAL CARGAR PRESUPUESTO A FACTURACIÓN ─────────────────────────────────

function CargarPresupuestoModal({
  isOpen,
  onClose,
  onSelectPresupuesto,
}: {
  isOpen: boolean
  onClose: () => void
  onSelectPresupuesto: (presupuesto: Presupuesto) => void
}) {
  const [search, setSearch] = useState('')
  const { data: presupuestos, isLoading } = usePresupuestos(search, 'pendiente')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-secondary/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-card-lg max-w-2xl w-full p-6 border border-slate-100 flex flex-col max-h-[85vh]">
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-primary font-bold text-lg">
            <FileText className="w-5 h-5" />
            <h3>Cargar Presupuesto a Facturación</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-secondary hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buscador */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente o número de presupuesto (#PRES-000001)..."
            className="input-field pl-9 py-2.5 text-sm"
            autoFocus
          />
        </div>

        {/* Lista de Presupuestos Pendientes */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 gap-2 text-secondary-400">
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
              Buscando presupuestos pendientes...
            </div>
          ) : !presupuestos || presupuestos.length === 0 ? (
            <div className="text-center py-10 text-secondary-400 space-y-2">
              <FileText className="w-8 h-8 opacity-30 mx-auto" />
              <p className="text-sm font-medium">No se encontraron presupuestos pendientes.</p>
            </div>
          ) : (
            presupuestos.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-slate-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-primary text-sm">
                      #PRES-{String(p.numero_presupuesto).padStart(6, '0')}
                    </span>
                    <span className="text-xs text-secondary-400">
                      • {formatDateTime(p.fecha_presupuesto)}
                    </span>
                  </div>
                  <p className="font-bold text-secondary text-sm">{p.cliente_nombre}</p>
                  <p className="text-xs text-secondary-400 mt-0.5">
                    {p.presupuestos_detalle?.length || 0} producto(s) • Validez: {p.validez_dias} días
                  </p>
                </div>

                <div className="flex items-center gap-3 justify-between sm:justify-end">
                  <span className="text-base font-extrabold text-secondary">
                    {formatARS(p.monto_total)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectPresupuesto(p)}
                    className="btn-primary text-xs py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Cargar a Carrito
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}


// ── Constantes ──────────────────────────────────────────────────────────────

const MEDIOS_PAGO = [
  { value: 'efectivo',         label: 'Efectivo',        icon: DollarSign  },
  { value: 'debito',           label: 'Débito',          icon: CreditCard  },
  { value: 'credito',          label: 'Crédito',         icon: CreditCard  },
  { value: 'transferencia',    label: 'Transferencia',   icon: Smartphone  },
  { value: 'cuenta_corriente', label: 'Cta. Corriente',  icon: Building2   },
]

// ── Carrito ítem ────────────────────────────────────────────────────────────

type CartItemFull = VentaItem & { precio_venta: number }

function CartItem({
  item,
  stockActual,
  onQtyChange,
  onRemove,
}: {
  item:        CartItemFull
  stockActual: number
  onQtyChange: (id: number, qty: number, stockActual: number) => void
  onRemove:    (id: number) => void
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 animate-fade-in">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-secondary truncate">{item.nombre}</p>
        <p className="text-xs text-secondary-400">{formatARS(item.precio_unitario)} / u</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onQtyChange(item.variante_id!, Math.max(1, item.cantidad - 1), stockActual)}
          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center
                     text-secondary-400 hover:border-primary hover:text-primary transition-colors text-sm font-bold"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="w-8 text-center text-sm font-bold text-secondary">{item.cantidad}</span>
        <button
          onClick={() => onQtyChange(item.variante_id!, item.cantidad + 1, stockActual)}
          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center
                     text-secondary-400 hover:border-primary hover:text-primary transition-colors text-sm font-bold"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="w-24 text-right text-sm font-bold text-primary">
        {formatARS(item.cantidad * item.precio_unitario)}
      </p>
      <button
        onClick={() => onRemove(item.variante_id!)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-secondary-300 hover:text-red-500 hover:bg-red-50 transition-colors"
        title="Eliminar"
      >  <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Historial de ventas ─────────────────────────────────────────────────────

function HistorialVentas() {
  const { data: ventas, isLoading } = useVentasHoy()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 gap-2 text-secondary-400">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Cargando historial…
      </div>
    )
  }

  if (!ventas?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 text-secondary-400">
        <Receipt className="w-8 h-8 opacity-40" />
        <p className="text-sm">Sin ventas hoy</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {ventas.map((v) => (
        <div key={v.id} className="p-4 rounded-xl border border-slate-100 hover:border-primary/20 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-bold text-primary">#{v.numero_comprobante}</span>
              <span className="text-xs text-secondary-400 ml-2">{formatDateTime(v.fecha_venta)}</span>
            </div>
            <span className="font-bold text-secondary">{formatARS(v.monto_total)}</span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-secondary-400">{v.cliente_nombre}</p>
            <span className="badge-vendedor capitalize">{v.medio_pago}</span>
          </div>
          {v.ventas_detalle && (
            <ul className="mt-2 space-y-0.5">
              {v.ventas_detalle.map((d) => (
                <li key={d.id} className="text-xs text-secondary-400">
                  × {d.cantidad} {d.nombre_producto ?? d.productos?.nombre ?? 'Producto eliminado'}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Página Facturación ──────────────────────────────────────────────────────

export default function FacturacionPage() {
  const [search,      setSearch]      = useState('')
  const [showResults, setShowResults] = useState(false)
  const [cart,        setCart]        = useState<CartItemFull[]>([])
  const [medioPago,   setMedioPago]   = useState('efectivo')
  const [cliente,     setCliente]     = useState('')
  const [clienteId,   setClienteId]   = useState<number | null>(null)
  const [notas,       setNotas]       = useState('')
  const [success,     setSuccess]     = useState<{ comprobante: number; monto: number } | null>(null)
  const [activeTab,   setActiveTab]   = useState<'pos' | 'historial'>('pos')
  const [presupuestoCargadoId, setPresupuestoCargadoId]   = useState<number | null>(null)
  const [presupuestoCargadoNum, setPresupuestoCargadoNum] = useState<number | null>(null)
  const [showCargarPresupuestoModal, setShowCargarPresupuestoModal] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const { data: productos } = useProductos(search)
  const { data: clientes }  = useClientes()
  const procesarVenta       = useProcesarVenta()
  const cambiarEstadoPresupuesto = useCambiarEstadoPresupuesto()

  const handleSelectPresupuesto = (p: Presupuesto) => {
    const loadedItems: CartItemFull[] = (p.presupuestos_detalle || []).map((d) => ({
      producto_id:     d.producto_id || 0,
      variante_id:     d.variante_id || d.producto_id || Math.floor(Math.random() * 100000),
      nombre:          d.nombre_producto,
      cantidad:        d.cantidad,
      precio_unitario: d.precio_unitario,
      precio_venta:    d.precio_unitario,
    }))

    setCart(loadedItems)
    if (p.cliente_id) {
      setClienteId(p.cliente_id)
      setCliente(p.cliente_nombre)
    } else {
      setClienteId(null)
      setCliente(p.cliente_nombre || '')
    }
    setPresupuestoCargadoId(p.id)
    setPresupuestoCargadoNum(p.numero_presupuesto)
    setShowCargarPresupuestoModal(false)

    Swal.fire({
      icon: 'success',
      title: '¡Presupuesto Cargado!',
      text: `Se cargó el presupuesto #PRES-${String(p.numero_presupuesto).padStart(6, '0')} al carrito.`,
      timer: 2000,
      showConfirmButton: false,
      customClass: { popup: 'rounded-2xl' },
    })
  }

  // Cerrar resultados al hacer click fuera
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const addToCart = (p: Producto) => {
    setCart(prev => {
      const existing = prev.find(i => i.variante_id === p.id)
      const currentQty = existing ? existing.cantidad : 0
      
      if (currentQty + 1 > p.stock_actual) {
        Swal.fire({
          title: 'Stock insuficiente',
          text: `No hay suficiente stock de ${p.nombre}. Stock actual: ${p.stock_actual}`,
          icon: 'error',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#E55B2B'
        })
        return prev
      }

      if (existing) {
        return prev.map(i =>
          i.variante_id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      }
      return [...prev, {
        producto_id:     p.producto_id,
        variante_id:     p.id,
        cantidad:        1,
        precio_unitario: p.precio_venta,
        precio_venta:    p.precio_venta,
        nombre:          p.nombre,
      }]
    })
    setSearch('')
    setShowResults(false)
  }

  const updateQty = (id: number, qty: number, stockActual: number) => {
    if (qty > stockActual) {
      Swal.fire({
        title: 'Stock insuficiente',
        text: `Stock máximo disponible: ${stockActual}`,
        icon: 'error',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#E55B2B'
      })
      return
    }
    setCart(prev => prev.map(i => (i.variante_id === id) ? { ...i, cantidad: qty } : i))
  }

  const removeItem = (id: number) => {
    setCart(prev => prev.filter(i => i.variante_id !== id))
  }

  const total = cart.reduce((acc, i) => acc + i.cantidad * i.precio_unitario, 0)

  const handleCobrar = async () => {
    if (!cart.length) return

    // Validar si el medio de pago es cuenta corriente
    if (medioPago === 'cuenta_corriente' && !clienteId) {
      Swal.fire({
        title: 'Cliente Requerido',
        text: 'Para facturar a Cuenta Corriente debés seleccionar un cliente registrado.',
        icon: 'warning',
        confirmButtonColor: '#E55B2B'
      })
      return
    }

    // Si hay cliente seleccionado y límite de crédito configurado, verificar límite
    if (medioPago === 'cuenta_corriente' && clienteId) {
      const cliObj = clientes?.find((c: Cliente) => c.id === clienteId)
      if (cliObj && cliObj.limite_credito > 0) {
        const saldoSimulado = cliObj.saldo_actual + total
        if (saldoSimulado > cliObj.limite_credito) {
          const res = await Swal.fire({
            title: 'Límite de Crédito Superado',
            html: `La compra supera el límite de crédito de <b>${cliObj.nombre}</b>.<br><br>` +
                  `Saldo actual: <b>${formatARS(cliObj.saldo_actual)}</b><br>` +
                  `Monto venta: <b>${formatARS(total)}</b><br>` +
                  `Límite asignado: <b>${formatARS(cliObj.limite_credito)}</b><br><br>` +
                  `¿Deseás autorizar de todas formas la venta?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, autorizar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#E55B2B'
          })
          if (!res.isConfirmed) return
        }
      }
    }

    try {
      const selectedCliName = clienteId ? clientes?.find((c: Cliente) => c.id === clienteId)?.nombre : (cliente || 'Consumidor Final')

      const result = await procesarVenta.mutateAsync({
        cliente:    selectedCliName || 'Consumidor Final',
        medio_pago: medioPago,
        notas,
        items:      cart,
        cliente_id: clienteId,
      })

      // Si la venta provino de un presupuesto cargado, cambiar su estado a 'aprobado'
      if (presupuestoCargadoId) {
        try {
          await cambiarEstadoPresupuesto.mutateAsync({
            id: presupuestoCargadoId,
            estado: 'aprobado',
          })
        } catch (e) {
          console.error('Error al actualizar estado de presupuesto:', e)
        }
      }

      setSuccess({ comprobante: result.venta_id, monto: result.monto_total })
      setCart([])
      setCliente('')
      setClienteId(null)
      setNotas('')
      setPresupuestoCargadoId(null)
      setPresupuestoCargadoNum(null)
    } catch (err) {
      Swal.fire('Error', err instanceof Error ? err.message : 'Error al procesar la venta.', 'error')
    }
  }


  return (
    <div className="space-y-6">
      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['pos', 'historial'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === tab
                ? 'bg-white text-secondary shadow-sm'
                : 'text-secondary-400 hover:text-secondary'
            }`}
          >
            {tab === 'pos' ? 'Punto de Venta' : 'Historial de Hoy'}
          </button>
        ))}
      </div>

      {/* ── POS ── */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Buscador y carrito */}
          <div className="lg:col-span-3 space-y-4">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-secondary flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" />
                  Buscar producto
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCargarPresupuestoModal(true)}
                  className="btn-secondary text-xs py-1.5 px-3 bg-primary-soft text-primary hover:bg-primary/20 flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  Cargar Presupuesto
                </button>
              </div>
              <div className="relative" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <input
                  id="pos-search"
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowResults(true) }}
                  onFocus={() => setShowResults(true)}
                  placeholder="Buscar por nombre, marca o código…"
                  className="input-field pl-10"
                  autoComplete="off"
                />
                {/* Resultados */}
                {showResults && search.length >= 2 && productos && productos.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-card-lg border border-slate-100 z-10 max-h-64 overflow-y-auto animate-fade-in">
                    {productos.map((p) => (
                      <button

                        key={p.id}
                        onClick={() => addToCart(p)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary-soft transition-colors text-left"
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

            {/* Carrito */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-secondary flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                  Carrito
                  {cart.length > 0 && (
                    <span className="badge-admin">{cart.length} ítems</span>
                  )}
                </h3>

                {presupuestoCargadoNum && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                    <span>Presupuesto #PRES-{String(presupuestoCargadoNum).padStart(6, '0')}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPresupuestoCargadoId(null)
                        setPresupuestoCargadoNum(null)
                      }}
                      className="hover:text-red-600 ml-1"
                      title="Desvincular presupuesto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-secondary-400 gap-2">
                  <ShoppingCart className="w-8 h-8 opacity-30" />
                  <p className="text-sm">Buscá un producto para agregar</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-slate-100">
                    {cart.map((item) => (
                      <CartItem
                        key={item.variante_id}
                        item={item}
                        stockActual={productos?.find(p => p.id === item.variante_id)?.stock_actual || 0}
                        onQtyChange={updateQty}
                        onRemove={removeItem}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
                    <span className="font-bold text-secondary">Total</span>
                    <span className="text-2xl font-extrabold text-primary">{formatARS(total)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Panel de cobro */}
          <div className="lg:col-span-2 space-y-4">
            {/* Éxito */}
            {success && (
              <div className="card bg-success-light border-2 border-emerald-300 animate-scale-in">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                  <div>
                    <p className="font-bold text-success">¡Venta registrada!</p>
                    <p className="text-xs text-success/70">Comprobante #{String(success.comprobante).padStart(8, '0')}</p>
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-success">{formatARS(success.monto)}</p>
                <button onClick={() => setSuccess(null)} className="btn-secondary mt-3 w-full justify-center">
                  Nueva venta
                </button>
              </div>
            )}

            <div className="card">
              <h3 className="font-bold text-secondary mb-4 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                Detalle de cobro
              </h3>

              {/* Cliente */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-secondary-400 uppercase tracking-wider">
                    Cliente / Cuenta Corriente
                  </label>
                  {clienteId && (
                    <button
                      onClick={() => { setClienteId(null); setCliente('') }}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      Restablecer a Consumidor Final
                    </button>
                  )}
                </div>

                <select
                  value={clienteId || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '') {
                      setClienteId(null)
                      setCliente('Consumidor Final')
                    } else {
                      const cId = Number(val)
                      setClienteId(cId)
                      const found = clientes?.find((c: Cliente) => c.id === cId)
                      if (found) setCliente(found.nombre)
                    }
                  }}
                  className="input-field cursor-pointer"
                >
                  <option value="">Consumidor Final (Cliente Ocasional)</option>
                  {clientes?.map((c: Cliente) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.saldo_actual > 0 ? `(Deuda: ${formatARS(c.saldo_actual)})` : '(Al día)'}
                    </option>
                  ))}
                </select>

                {/* Si no hay cliente seleccionado en la lista pero se ingresó un texto libre */}
                {!clienteId && (
                  <input
                    type="text"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    placeholder="O tipear nombre del cliente puntual…"
                    className="input-field mt-2 text-xs"
                  />
                )}

                {/* Info adicional del cliente seleccionado */}
                {clienteId && (() => {
                  const selectedCli = clientes?.find((c: Cliente) => c.id === clienteId)
                  if (!selectedCli) return null
                  return (
                    <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-secondary-400">Saldo Deudor: </span>
                        <span className={`font-bold ${selectedCli.saldo_actual > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {formatARS(selectedCli.saldo_actual)}
                        </span>
                      </div>
                      {selectedCli.limite_credito > 0 && (
                        <div>
                          <span className="text-secondary-400">Límite: </span>
                          <span className="font-semibold text-secondary">{formatARS(selectedCli.limite_credito)}</span>
                        </div>
                      )}
                    </div>
                  )
                })()}

              </div>


              {/* Medio de pago */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-2">
                  Medio de pago
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {MEDIOS_PAGO.map((m) => {
                    const Icon = m.icon
                    return (
                      <button
                        key={m.value}
                        onClick={() => setMedioPago(m.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-150 ${
                          medioPago === m.value
                            ? 'border-primary bg-primary-soft text-primary'
                            : 'border-slate-200 text-secondary-400 hover:border-primary/40'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {m.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Notas */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-1.5">
                  Notas (opcional)
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Observaciones de la venta…"
                  rows={2}
                  className="input-field resize-none"
                />
              </div>

              {/* Total + Botón cobrar */}
              <div className="p-4 rounded-xl bg-secondary/5 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-secondary-400">Total a cobrar</span>
                  <span className="text-2xl font-extrabold text-secondary">{formatARS(total)}</span>
                </div>
              </div>

              <button
                id="btn-cobrar"
                onClick={handleCobrar}
                disabled={cart.length === 0 || procesarVenta.isPending}
                className="btn-primary w-full justify-center py-3.5 text-base"
              >
                {procesarVenta.isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Procesando…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Cobrar {formatARS(total)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Historial ── */}
      {activeTab === 'historial' && (
        <div className="card max-w-2xl">
          <h3 className="font-bold text-secondary mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Ventas de hoy
          </h3>
          <HistorialVentas />
        </div>
      )}

      {/* ── Modal Cargar Presupuesto ── */}
      <CargarPresupuestoModal
        isOpen={showCargarPresupuestoModal}
        onClose={() => setShowCargarPresupuestoModal(false)}
        onSelectPresupuesto={handleSelectPresupuesto}
      />
    </div>
  )
}

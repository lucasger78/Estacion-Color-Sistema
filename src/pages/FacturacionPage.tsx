import { useState, useRef, useEffect } from 'react'
import {
  Search, Plus, Trash2, ShoppingCart, CheckCircle2,
  CreditCard, DollarSign, Smartphone, Building2, Receipt,
  RefreshCw, Minus, FileText
} from 'lucide-react'
import { useProductos } from '../hooks/useProductos'
import { useVentasHoy, useProcesarVenta } from '../hooks/useVentas'
import { formatARS, formatDateTime } from '../utils/formatters'
import Swal from 'sweetalert2'
import type { VentaItem } from '../hooks/useVentas'
import type { Producto } from '../hooks/useProductos'

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
  const [notas,       setNotas]       = useState('')
  const [success,     setSuccess]     = useState<{ comprobante: number; monto: number } | null>(null)
  const [activeTab,   setActiveTab]   = useState<'pos' | 'historial'>('pos')
  const searchRef = useRef<HTMLInputElement>(null)

  const { data: productos } = useProductos(search)
  const procesarVenta = useProcesarVenta()

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
    try {
      const result = await procesarVenta.mutateAsync({
        cliente:    cliente || 'Consumidor Final',
        medio_pago: medioPago,
        notas,
        items:      cart,
      })
      setSuccess({ comprobante: result.venta_id, monto: result.monto_total })
      setCart([])
      setCliente('')
      setNotas('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al procesar la venta.')
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
              <h3 className="font-bold text-secondary mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                Buscar producto
              </h3>
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
              <h3 className="font-bold text-secondary mb-4 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" />
                Carrito
                {cart.length > 0 && (
                  <span className="ml-auto badge-admin">{cart.length} ítems</span>
                )}
              </h3>
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
                <label className="block text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-1.5">
                  Cliente
                </label>
                <input
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Consumidor Final"
                  className="input-field"
                />
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
    </div>
  )
}

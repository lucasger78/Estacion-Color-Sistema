import { useState } from 'react'
import {
  Search, UserPlus, DollarSign, Wallet, FileText,
  Phone, Mail, MapPin, AlertCircle, History,
  X, ChevronDown, ChevronUp, Printer, Edit2, UserCheck, Trash2
} from 'lucide-react'
import {
  useClientes, useClienteDetalle, useCrearCliente, useEditarCliente,
  useRegistrarPagoCliente, useEliminarCtaCte, type Cliente
} from '../hooks/useClientes'
import { formatARS, formatDateTime } from '../utils/formatters'
import Swal from 'sweetalert2'


// ── MODAL: Crear / Editar Cliente ──────────────────────────────────────────

function ClienteModal({
  cliente,
  onClose,
}: {
  cliente: Cliente | null
  onClose: () => void
}) {
  const [form, setForm] = useState({
    nombre:         cliente?.nombre || '',
    telefono:       cliente?.telefono || '',
    email:          cliente?.email || '',
    direccion:      cliente?.direccion || '',
    limite_credito: cliente ? String(cliente.limite_credito) : '0',
  })

  const crearCliente = useCrearCliente()
  const editarCliente = useEditarCliente()
  const eliminarCtaCte = useEliminarCtaCte()

  const isEditing = !!cliente
  const isLoading = crearCliente.isPending || editarCliente.isPending

  const handleEliminarCtaCte = async () => {
    if (!cliente) return

    const result = await Swal.fire({
      icon: 'warning',
      iconColor: '#DC2626',
      title: '⚠️ Eliminar Cuenta Corriente',
      html: `
        <div style="text-align: center; padding: 8px 0;">
          <p style="font-size: 16px; font-weight: 600; color: #1E293B; margin-bottom: 8px;">
            ¿Estás seguro de que querés eliminar la cuenta corriente de
          </p>
          <p style="font-size: 20px; font-weight: 800; color: #DC2626; margin-bottom: 12px;">
            ${cliente.nombre}?
          </p>
          <p style="font-size: 13px; color: #64748B; line-height: 1.5;">
            Se van a borrar <strong>todos los movimientos</strong> (deudas, pagos, entregas) y el saldo se va a resetear a $0.<br/>
            <strong>El cliente NO se elimina</strong>, sigue apareciendo en la lista.
          </p>
          <p style="font-size: 13px; color: #DC2626; font-weight: 700; margin-top: 12px;">
            ⛔ Esta acción no se puede deshacer.
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar cuenta corriente',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#DC2626',
      cancelButtonColor: '#64748B',
      width: 500,
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-xl font-bold',
        cancelButton: 'rounded-xl font-bold',
      },
    })

    if (result.isConfirmed) {
      try {
        await eliminarCtaCte.mutateAsync(cliente.id)
        Swal.fire({
          icon: 'success',
          title: '¡Cuenta corriente eliminada!',
          text: `Se eliminaron todos los movimientos de ${cliente.nombre}. El saldo ahora es $0.`,
          confirmButtonColor: '#E55B2B',
          timer: 3000,
        })
        onClose()
      } catch (err) {
        Swal.fire('Error', err instanceof Error ? err.message : 'No se pudo eliminar la cuenta corriente.', 'error')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) {
      Swal.fire('Error', 'El nombre del cliente es obligatorio.', 'error')
      return
    }

    try {
      if (isEditing) {
        await editarCliente.mutateAsync({
          id:             cliente.id,
          nombre:         form.nombre.trim(),
          telefono:       form.telefono.trim() || null,
          email:          form.email.trim() || null,
          direccion:      form.direccion.trim() || null,
          limite_credito: parseFloat(form.limite_credito) || 0,
        })
        Swal.fire({ icon: 'success', title: 'Cliente actualizado', timer: 1500, showConfirmButton: false })
      } else {
        await crearCliente.mutateAsync({
          nombre:         form.nombre.trim(),
          telefono:       form.telefono.trim() || null,
          email:          form.email.trim() || null,
          direccion:      form.direccion.trim() || null,
          limite_credito: parseFloat(form.limite_credito) || 0,
          activo:         true,
        })
        Swal.fire({ icon: 'success', title: 'Cliente registrado', timer: 1500, showConfirmButton: false })
      }
      onClose()
    } catch (err) {
      Swal.fire('Error', err instanceof Error ? err.message : 'No se pudo guardar el cliente.', 'error')
    }
  }

  return (
    <div className="fixed inset-0 bg-secondary/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-card-lg max-w-lg w-full p-6 border border-slate-100">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-primary font-bold text-lg">
            <UserPlus className="w-5 h-5" />
            <h3>{isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-secondary-300 hover:text-secondary hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Nombre Completo *</label>
            <input
              type="text"
              required
              value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Juan Pérez / Constructora SRL"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Teléfono</label>
              <input
                type="text"
                value={form.telefono}
                onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
                placeholder="3541-123456"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="cliente@email.com"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Dirección</label>
            <input
              type="text"
              value={form.direccion}
              onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))}
              placeholder="Av. San Martín 123"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Límite de Crédito ($)</label>
            <input
              type="number"
              step="any"
              min="0"
              value={form.limite_credito}
              onChange={e => setForm(p => ({ ...p, limite_credito: e.target.value }))}
              placeholder="0.00"
              className="input-field"
            />
            <p className="text-[11px] text-secondary-400 mt-1">Monto máximo que se le permite fiar / fiado disponible.</p>
          </div>

          {/* Botón eliminar cta. cte. — solo en modo edición */}
          {isEditing && (
            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleEliminarCtaCte}
                disabled={eliminarCtaCte.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                {eliminarCtaCte.isPending ? 'Eliminando…' : 'Eliminar Cuenta Corriente'}
              </button>
              <p className="text-[10px] text-secondary-400 text-center mt-1.5">
                Se borran los movimientos y el saldo. El cliente NO se elimina.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading} className="btn-primary flex-1 justify-center">
              {isLoading ? 'Guardando…' : (isEditing ? 'Actualizar' : 'Crear Cliente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── MODAL: Registrar Pago / Entrega de Dinero ─────────────────────────────

function RegistrarPagoModal({
  clienteInicial,
  clientes,
  onClose,
}: {
  clienteInicial: Cliente | null
  clientes: Cliente[]
  onClose: () => void
}) {
  const [selectedClienteId, setSelectedClienteId] = useState<number>(clienteInicial?.id || (clientes[0]?.id || 0))
  const [monto, setMonto]                         = useState('')
  const [medioPago, setMedioPago]                 = useState('efectivo')
  const [notas, setNotas]                         = useState('')

  const registrarPago = useRegistrarPagoCliente()

  const selectedCliente = clientes.find(c => c.id === selectedClienteId) || clienteInicial

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const montoNum = parseFloat(monto)
    if (!selectedClienteId || isNaN(montoNum) || montoNum <= 0) {
      Swal.fire('Error', 'Ingrese un monto mayor a cero y seleccione un cliente.', 'error')
      return
    }

    try {
      await registrarPago.mutateAsync({
        cliente_id: selectedClienteId,
        monto:      montoNum,
        medio_pago: medioPago,
        notas:      notas.trim(),
      })
      Swal.fire({
        icon: 'success',
        title: '¡Entrega registrada!',
        text: `Se descontaron ${formatARS(montoNum)} de la cuenta corriente de ${selectedCliente?.nombre}.`,
        confirmButtonColor: '#E55B2B'
      })
      onClose()
    } catch (err) {
      Swal.fire('Error', err instanceof Error ? err.message : 'Error al registrar el pago.', 'error')
    }
  }

  return (
    <div className="fixed inset-0 bg-secondary/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-card-lg max-w-md w-full p-6 border border-slate-100">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-lg">
            <DollarSign className="w-5 h-5" />
            <h3>Registrar Entrega de Dinero</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-secondary-300 hover:text-secondary hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Cliente</label>
            <select
              value={selectedClienteId}
              onChange={e => setSelectedClienteId(Number(e.target.value))}
              className="input-field cursor-pointer"
            >
              {clientes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nombre} (Deuda: {formatARS(c.saldo_actual)})
                </option>
              ))}
            </select>
          </div>

          {selectedCliente && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-secondary-400">Saldo Deudor Actual</p>
                <p className="text-base font-extrabold text-red-500">{formatARS(selectedCliente.saldo_actual)}</p>
              </div>
              {selectedCliente.limite_credito > 0 && (
                <div className="text-right">
                  <p className="text-xs text-secondary-400">Límite</p>
                  <p className="text-xs font-semibold text-secondary">{formatARS(selectedCliente.limite_credito)}</p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Monto Entregado ($) *</label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={monto}
              onChange={e => setMonto(e.target.value)}
              placeholder="0.00"
              className="input-field text-lg font-bold text-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Medio de Pago</label>
            <select
              value={medioPago}
              onChange={e => setMedioPago(e.target.value)}
              className="input-field cursor-pointer capitalize"
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia Bancaria</option>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">Notas / Recibo de Pago</label>
            <input
              type="text"
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Ej: Pago a cuenta / Recibo #0012"
              className="input-field"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={registrarPago.isPending} className="btn-primary bg-emerald-600 hover:bg-emerald-700 flex-1 justify-center">
              {registrarPago.isPending ? 'Procesando…' : 'Confirmar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── MODAL: Ficha e Histórico de Cuenta Corriente ───────────────────────────

function FichaClienteModal({
  clienteId,
  onClose,
}: {
  clienteId: number
  onClose: () => void
}) {
  const { data, isLoading } = useClienteDetalle(clienteId)
  const [openVentaId, setOpenVentaId] = useState<number | null>(null)

  if (isLoading || !data) {
    return (
      <div className="fixed inset-0 bg-secondary/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-secondary-400 font-medium text-sm">Cargando cuenta corriente del cliente…</p>
        </div>
      </div>
    )
  }

  const { cliente, movimientos } = data

  const toggleVenta = (vId: number) => {
    setOpenVentaId(prev => prev === vId ? null : vId)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 bg-secondary/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-card-lg max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-100">
        {/* Cabecera modal */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-xl text-secondary">{cliente.nombre}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                cliente.saldo_actual > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {cliente.saldo_actual > 0 ? 'Con Deuda' : 'Al Día'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-secondary-400 mt-1">
              {cliente.telefono && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{cliente.telefono}</span>}
              {cliente.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{cliente.email}</span>}
              {cliente.direccion && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{cliente.direccion}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl text-secondary-400 hover:text-secondary hover:bg-white border border-slate-200 shadow-sm transition-all"
              title="Imprimir resumen"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-secondary-300 hover:text-secondary hover:bg-slate-200 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tarjetas resumen de saldo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 border-b border-slate-100 bg-white">
          <div className="p-4 rounded-xl border border-slate-100 bg-red-50/50">
            <p className="text-xs text-red-600 font-semibold mb-1">Saldo Deudor Actual</p>
            <p className="text-2xl font-black text-red-600">{formatARS(cliente.saldo_actual)}</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
            <p className="text-xs text-secondary-400 font-semibold mb-1">Límite de Crédito</p>
            <p className="text-xl font-bold text-secondary">{formatARS(cliente.limite_credito)}</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
            <p className="text-xs text-secondary-400 font-semibold mb-1">Crédito Disponible</p>
            <p className="text-xl font-bold text-emerald-600">
              {formatARS(Math.max(0, cliente.limite_credito - cliente.saldo_actual))}
            </p>
          </div>
        </div>

        {/* Historial de movimientos */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h4 className="font-bold text-secondary text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Histórico de Movimientos y Compras ({movimientos.length})
          </h4>

          {movimientos.length === 0 ? (
            <div className="text-center py-10 text-secondary-400">
              <FileText className="w-10 h-10 opacity-30 mx-auto mb-2" />
              <p className="text-sm font-medium">El cliente no registra movimientos aún.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {movimientos.map((m) => {
                const isDebe = m.tipo === 'debe'
                const venta = m.ventas
                const isOpen = openVentaId === m.venta_id

                return (
                  <div
                    key={m.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isDebe
                        ? 'border-red-100 bg-white hover:border-red-200'
                        : 'border-emerald-100 bg-emerald-50/30 hover:border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isDebe ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {isDebe ? 'DEBE' : 'PAGO'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-secondary">
                            {isDebe ? (m.descripcion || `Venta a crédito #${venta?.numero_comprobante || m.venta_id}`) : (m.descripcion || 'Entrega de Dinero / Pago')}
                          </p>
                          <p className="text-xs text-secondary-400">
                            {formatDateTime(m.fecha)} {m.medio_pago ? `• ${m.medio_pago.toUpperCase()}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`text-base font-extrabold ${isDebe ? 'text-red-600' : 'text-emerald-600'}`}>
                          {isDebe ? `+ ${formatARS(m.monto)}` : `- ${formatARS(m.monto)}`}
                        </p>
                        <p className="text-[11px] text-secondary-400">
                          Saldo Cta: <span className="font-semibold">{formatARS(m.saldo_resultante)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Botón desplegable si tiene productos comprados en esta venta */}
                    {isDebe && venta?.ventas_detalle && venta.ventas_detalle.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => toggleVenta(m.venta_id!)}
                          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {isOpen ? 'Ocultar productos comprados' : `Ver ${venta.ventas_detalle.length} productos comprados en esta venta`}
                        </button>

                        {isOpen && (
                          <div className="mt-2 p-3 bg-slate-50 rounded-lg space-y-1.5 border border-slate-100 animate-fade-in">
                            {venta.ventas_detalle.map((d) => {
                              const nombreProd = d.nombre_producto || d.productos?.nombre || 'Producto'
                              const varianteStr = d.variantes?.variante ? ` (${d.variantes.variante})` : ''
                              return (
                                <div key={d.id} className="flex items-center justify-between text-xs text-secondary">
                                  <span>• <strong>{d.cantidad}x</strong> {nombreProd}{varianteStr}</span>
                                  <span className="font-semibold">{formatARS(d.subtotal)} ({formatARS(d.precio_unitario)}/u)</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── PÁGINA PRINCIPAL: Clientes y Cuentas Corrientes ───────────────────────

export default function ClientesPage() {
  const [search, setSearch]             = useState('')
  const [filtroDeuda, setFiltroDeuda]   = useState<'todos' | 'deuda' | 'aldia'>('todos')
  const [modalCliente, setModalCliente] = useState<{ open: boolean; cliente: Cliente | null }>({ open: false, cliente: null })
  const [modalPago, setModalPago]       = useState<{ open: boolean; cliente: Cliente | null }>({ open: false, cliente: null })
  const [fichaClienteId, setFichaClienteId] = useState<number | null>(null)

  const { data: clientes, isLoading } = useClientes(search)

  // Filtrado secundario
  const clientesFiltrados = (clientes || []).filter(c => {
    if (filtroDeuda === 'deuda') return c.saldo_actual > 0
    if (filtroDeuda === 'aldia') return c.saldo_actual <= 0
    return true
  })

  // Métricas
  const totalClientes = clientes?.length || 0
  const clientesConDeuda = clientes?.filter(c => c.saldo_actual > 0).length || 0
  const totalSaldoDeudor = clientes?.reduce((acc, c) => acc + (c.saldo_actual || 0), 0) || 0

  return (
    <div className="space-y-6">
      {/* ── Encabezado y resumen ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-secondary">Clientes y Cuentas Corrientes</h1>
          <p className="text-xs text-secondary-400">Gestión de saldo deudor, ficha de clientes y entregas de dinero a cuenta.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalPago({ open: true, cliente: null })}
            className="btn-secondary bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Registrar Pago / Entrega</span>
          </button>
          <button
            onClick={() => setModalCliente({ open: true, cliente: null })}
            className="btn-primary"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* ── Tarjetas de métricas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-secondary-400 font-semibold">Total Clientes</p>
            <p className="text-2xl font-black text-secondary">{totalClientes}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-secondary-400 font-semibold">Con Deuda Acumulada</p>
            <p className="text-2xl font-black text-red-600">{clientesConDeuda}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-secondary-400 font-semibold">Saldo Deudor Total</p>
            <p className="text-2xl font-black text-emerald-600">{formatARS(totalSaldoDeudor)}</p>
          </div>
        </div>
      </div>

      {/* ── Buscador y filtros ── */}
      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Buscador */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar cliente por nombre, teléfono o email…"
              className="input-field pl-10"
            />
          </div>

          {/* Filtros de deuda */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            {(['todos', 'deuda', 'aldia'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFiltroDeuda(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtroDeuda === tab
                    ? 'bg-white text-secondary shadow-sm'
                    : 'text-secondary-400 hover:text-secondary'
                }`}
              >
                {tab === 'todos' && 'Todos'}
                {tab === 'deuda' && 'Con Deuda'}
                {tab === 'aldia' && 'Al Día'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tabla de clientes ── */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48 gap-2 text-secondary-400">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Cargando clientes…
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="text-center py-12 text-secondary-400 space-y-2">
            <UserCheck className="w-10 h-10 opacity-30 mx-auto" />
            <p className="text-sm font-semibold">No se encontraron clientes.</p>
            <p className="text-xs">Podés registrar uno nuevo usando el botón "Nuevo Cliente".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-secondary-400">
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Contacto</th>
                  <th className="py-3 px-4 text-right">Límite Crédito</th>
                  <th className="py-3 px-4 text-right">Saldo Deudor</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {clientesFiltrados.map((c) => {
                  const tieneDeuda = c.saldo_actual > 0
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-bold text-secondary text-sm">{c.nombre}</p>
                          {c.direccion && (
                            <p className="text-[11px] text-secondary-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {c.direccion}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-secondary-400">
                        {c.telefono && <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.telefono}</p>}
                        {c.email && <p className="flex items-center gap-1 text-[11px]"><Mail className="w-3 h-3" />{c.email}</p>}
                        {!c.telefono && !c.email && '—'}
                      </td>

                      <td className="py-3 px-4 text-right font-semibold text-secondary">
                        {c.limite_credito > 0 ? formatARS(c.limite_credito) : 'Sin límite'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className={`font-extrabold text-sm ${tieneDeuda ? 'text-red-600' : 'text-emerald-600'}`}>
                          {formatARS(c.saldo_actual)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`badge ${tieneDeuda ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {tieneDeuda ? 'Deuda' : 'Al Día'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setFichaClienteId(c.id)}
                            className="p-1.5 rounded-lg text-primary hover:bg-primary-soft transition-colors"
                            title="Ver Ficha e Histórico"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setModalPago({ open: true, cliente: c })}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Registrar Entrega de Dinero"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setModalCliente({ open: true, cliente: c })}
                            className="p-1.5 rounded-lg text-secondary-400 hover:bg-slate-100 transition-colors"
                            title="Editar Datos"
                          >
                            <Edit2 className="w-4 h-4" />
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

      {/* ── Modales ── */}
      {modalCliente.open && (
        <ClienteModal
          cliente={modalCliente.cliente}
          onClose={() => setModalCliente({ open: false, cliente: null })}
        />
      )}

      {modalPago.open && (
        <RegistrarPagoModal
          clienteInicial={modalPago.cliente}
          clientes={clientes || []}
          onClose={() => setModalPago({ open: false, cliente: null })}
        />
      )}

      {fichaClienteId && (
        <FichaClienteModal
          clienteId={fichaClienteId}
          onClose={() => setFichaClienteId(null)}
        />
      )}
    </div>
  )
}

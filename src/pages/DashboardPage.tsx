import React, { useState } from 'react'
import {
  TrendingUp, DollarSign, ShoppingBag, Receipt,
  Award, AlertTriangle, Calendar, RefreshCw, Package,
  ChevronDown, ChevronUp
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useKPIs, useRankingProductos, useVentasPorDia, usePagosDistribucion, useStockMetrics, useLowStockProducts, useExpiringProducts, useFacturacionHoyDetalle } from '../hooks/useAnalytics'
import { formatARS, daysAgo, startOfMonth, todayStart } from '../utils/formatters'

// ── Filtros de fecha ────────────────────────────────────────────────────────

const PERIODOS = [
  { label: 'Hoy',       value: 'hoy'    },
  { label: '7 días',    value: '7d'     },
  { label: 'Este mes',  value: 'mes'    },
  { label: 'Este año',  value: 'anio'   },
] as const

type Periodo = typeof PERIODOS[number]['value']

function getDesde(periodo: Periodo): string {
  switch (periodo) {
    case 'hoy':  return todayStart()
    case '7d':   return daysAgo(7)
    case 'mes':  return startOfMonth()
    case 'anio': return new Date(new Date().getFullYear(), 0, 1).toISOString()
  }
}

const PAGO_LABELS: Record<string, string> = {
  efectivo:          'Efectivo',
  debito:            'Débito',
  credito:           'Crédito',
  transferencia:     'Transferencia',
  cuenta_corriente:  'Cta. Corriente',
}

const PAGO_COLORS = ['#E55B2B', '#1E293B', '#10B981', '#F59E0B', '#6366F1']

// ── KPI Card ────────────────────────────────────────────────────────────────

interface KPICardProps {
  label:    string
  value:    string
  subtitle?: string
  icon:     React.ReactNode
  color:    string
  bgColor:  string
}

function KPICard({ label, value, subtitle, icon, color, bgColor }: KPICardProps) {
  return (
    <div className="card flex items-start gap-3.5 p-4 sm:p-5 animate-fade-in">
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${bgColor}`}>
        <div className={color}>{icon}</div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] sm:text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-0.5 leading-tight">{label}</p>
        <p className="text-lg sm:text-xl font-extrabold text-secondary leading-tight tracking-tight break-words">{value}</p>
        {subtitle && <p className="text-[11px] text-secondary-400 mt-1 leading-tight">{subtitle}</p>}
      </div>
    </div>
  )
}

// ── Custom Tooltip del gráfico ──────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 shadow-card-md text-sm">
      <p className="font-semibold text-secondary mb-1">{label}</p>
      <p className="text-primary font-bold">{formatARS(payload[0]?.value)}</p>
      <p className="text-secondary-400">{payload[1]?.value ?? 0} ventas</p>
    </div>
  )
}

// ── Página Dashboard ────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [showFacturacionDetalle, setShowFacturacionDetalle] = useState(false)
  const desde = getDesde(periodo)

  const { data: kpis,    isLoading: loadingKpis    } = useKPIs()
  const { data: ranking, isLoading: loadingRanking  } = useRankingProductos(desde)
  const { data: porDia,  isLoading: loadingPorDia   } = useVentasPorDia(desde)
  const { data: pagos,   isLoading: loadingPagos    } = usePagosDistribucion(desde)
  
  const { data: stockMetrics, isLoading: loadingStock } = useStockMetrics()
  const { data: lowStock,     isLoading: loadingLow   } = useLowStockProducts()
  const { data: expiring,     isLoading: loadingExp   } = useExpiringProducts()
  const { data: factHoyDetalle } = useFacturacionHoyDetalle()

  const isLoading = loadingKpis || loadingRanking || loadingPorDia || loadingPagos || loadingStock || loadingLow || loadingExp

  return (
    <div className="space-y-6">
      {/* ── Encabezado ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-secondary">Indicadores de Negocio</h2>
          <p className="text-sm text-secondary-400 mt-0.5">KPIs en tiempo real · Solo lectura</p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-secondary-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Actualizando…
          </div>
        )}
      </div>

      {/* ── Filtros de período ── */}
      <div className="flex gap-2 flex-wrap">
        {PERIODOS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriodo(p.value)}
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 ${
              periodo === p.value
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-secondary-400 border border-slate-200 hover:border-primary/40 hover:text-primary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Facturación Hoy — Expandible */}
        <div className="card p-0 animate-fade-in sm:col-span-2 lg:col-span-1">
          <button
            onClick={() => setShowFacturacionDetalle(!showFacturacionDetalle)}
            className="w-full flex items-start gap-3.5 p-4 sm:p-5 text-left hover:bg-slate-50/50 transition-colors rounded-2xl"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary-soft">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] sm:text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-0.5 leading-tight">Facturación Hoy</p>
              <p className="text-lg sm:text-xl font-extrabold text-secondary leading-tight tracking-tight">
                {formatARS((factHoyDetalle?.totalGeneral ?? kpis?.facturacion_hoy) ?? 0)}
              </p>
              <p className="text-[11px] text-secondary-400 mt-1 leading-tight flex items-center gap-1">
                {factHoyDetalle?.cantVentas ?? kpis?.ventas_hoy_count ?? 0} venta{(factHoyDetalle?.cantVentas ?? kpis?.ventas_hoy_count ?? 0) === 1 ? '' : 's'}
                {(factHoyDetalle?.cantEntregas ?? 0) > 0 && (
                  <span className="text-emerald-600 font-semibold">
                    + {factHoyDetalle!.cantEntregas} entrega{factHoyDetalle!.cantEntregas === 1 ? '' : 's'} cta. cte.
                  </span>
                )}
              </p>
            </div>
            <div className="text-secondary-300 mt-1">
              {showFacturacionDetalle ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {/* Desglose expandido */}
          {showFacturacionDetalle && factHoyDetalle && (
            <div className="border-t border-slate-100 px-4 sm:px-5 pb-4 pt-3 space-y-2 animate-fade-in max-h-80 overflow-y-auto">
              {/* Resumen rápido */}
              {factHoyDetalle.cantEntregas > 0 && (
                <div className="flex gap-2 mb-3">
                  <div className="flex-1 bg-primary-soft rounded-lg px-3 py-2 text-center">
                    <p className="text-[10px] font-semibold text-primary uppercase">Ventas</p>
                    <p className="text-sm font-extrabold text-secondary">{formatARS(factHoyDetalle.totalVentas)}</p>
                  </div>
                  <div className="flex-1 bg-emerald-50 rounded-lg px-3 py-2 text-center">
                    <p className="text-[10px] font-semibold text-emerald-600 uppercase">Entregas Cta. Cte.</p>
                    <p className="text-sm font-extrabold text-emerald-600">{formatARS(factHoyDetalle.totalEntregas)}</p>
                  </div>
                </div>
              )}

              {factHoyDetalle.items.length === 0 ? (
                <p className="text-xs text-secondary-400 text-center py-4">Sin movimientos hoy.</p>
              ) : (
                factHoyDetalle.items.map((item) => (
                  <div
                    key={`${item.tipo}-${item.id}`}
                    className={`flex items-center justify-between py-2 px-3 rounded-lg text-xs ${
                      item.tipo === 'entrega_cta_cte'
                        ? 'bg-emerald-50/60 border border-emerald-100'
                        : 'bg-slate-50/80 border border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[10px] text-secondary-400 font-mono w-11 flex-shrink-0">{item.hora}</span>
                      <div className="min-w-0">
                        <p className={`font-semibold truncate ${item.tipo === 'entrega_cta_cte' ? 'text-emerald-700' : 'text-secondary'}`}>
                          {item.descripcion}
                        </p>
                        <p className="text-[10px] text-secondary-400 truncate">
                          {item.cliente_nombre}
                          {item.medio_pago && ` • ${item.medio_pago.charAt(0).toUpperCase() + item.medio_pago.slice(1)}`}
                        </p>
                      </div>
                    </div>
                    <span className={`font-extrabold flex-shrink-0 ml-2 ${item.tipo === 'entrega_cta_cte' ? 'text-emerald-600' : 'text-secondary'}`}>
                      {formatARS(item.monto)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <KPICard
          label="Facturación Semanal"
          value={formatARS(kpis?.facturacion_semana ?? 0)}
          subtitle="Últimos 7 días"
          icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />}
          color="text-success"
          bgColor="bg-success-light"
        />
        <KPICard
          label="Facturación Mensual"
          value={formatARS(kpis?.facturacion_mes ?? 0)}
          subtitle="Mes en curso"
          icon={<Calendar className="w-5 h-5 sm:w-6 sm:h-6" />}
          color="text-blue-500"
          bgColor="bg-blue-50"
        />
        <KPICard
          label="Ticket Promedio Hoy"
          value={formatARS(kpis?.ticket_promedio_hoy ?? 0)}
          subtitle="Por venta"
          icon={<Receipt className="w-5 h-5 sm:w-6 sm:h-6" />}
          color="text-warning"
          bgColor="bg-warning-light"
        />
      </div>

      {/* ── KPI Cards de Stock ── */}
      <h3 className="font-bold text-secondary mt-6 mb-2 flex items-center gap-2">
        <Package className="w-5 h-5 text-primary" />
        Métricas de Inventario
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <KPICard
          label="Valor de Venta (Stock)"
          value={formatARS(stockMetrics?.valorVenta ?? 0)}
          subtitle={`${stockMetrics?.totalUnidades ?? 0} unidades totales`}
          icon={<DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <KPICard
          label="Costo Total (C/IVA)"
          value={formatARS(stockMetrics?.valorCostoConIva ?? 0)}
          subtitle="Capital inmovilizado"
          icon={<ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />}
          color="text-indigo-600"
          bgColor="bg-indigo-50"
        />
        <KPICard
          label="Rentabilidad Proyectada"
          value={formatARS(stockMetrics?.rentabilidadEstimada ?? 0)}
          subtitle="Bruta (Venta - Costo)"
          icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />}
          color="text-primary"
          bgColor="bg-primary-soft"
        />
        <KPICard
          label="Alertas de Stock"
          value={String(lowStock?.length ?? 0)}
          subtitle="Productos críticos"
          icon={<AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />}
          color={lowStock && lowStock.length > 0 ? "text-danger" : "text-success"}
          bgColor={lowStock && lowStock.length > 0 ? "bg-danger-light" : "bg-success-light"}
        />
        <KPICard
          label="Próximos a Vencer"
          value={String(expiring?.length ?? 0)}
          subtitle="< 30 días"
          icon={<Calendar className="w-5 h-5 sm:w-6 sm:h-6" />}
          color={expiring && expiring.length > 0 ? "text-warning-600" : "text-secondary-400"}
          bgColor={expiring && expiring.length > 0 ? "bg-warning-50" : "bg-slate-100"}
        />
      </div>

      {/* ── Ranking + Distribución ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Ranking de productos */}
        <div className="card lg:col-span-1 space-y-4">
          <h3 className="font-bold text-secondary flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            Ranking de Productos
          </h3>

          {/* Más vendido */}
          {ranking?.masVendido && (
            <div className="p-4 rounded-xl bg-success-light border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-success" />
                <span className="text-xs font-bold text-success uppercase tracking-wider">Más Vendido</span>
              </div>
              <p className="font-bold text-secondary text-sm">{ranking.masVendido.nombre}</p>
              {ranking.masVendido.presentacion && (
                <p className="text-xs text-secondary-400">{ranking.masVendido.presentacion}</p>
              )}
              {ranking.masVendido.marca && (
                <span className="badge-success mt-1">{ranking.masVendido.marca}</span>
              )}
              <p className="text-lg font-extrabold text-success mt-2">
                {ranking.masVendido.unidades} unidades
              </p>
              <p className="text-xs text-secondary-400">{formatARS(ranking.masVendido.monto_total)}</p>
            </div>
          )}

          {/* Menos vendido */}
          {ranking?.menosVendido && ranking.menosVendido.producto_id !== ranking.masVendido?.producto_id && (
            <div className="p-4 rounded-xl bg-danger-light border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-danger" />
                <span className="text-xs font-bold text-danger uppercase tracking-wider">Menos Vendido</span>
              </div>
              <p className="font-bold text-secondary text-sm">{ranking.menosVendido.nombre}</p>
              {ranking.menosVendido.presentacion && (
                <p className="text-xs text-secondary-400">{ranking.menosVendido.presentacion}</p>
              )}
              <p className="text-lg font-extrabold text-danger mt-2">
                {ranking.menosVendido.unidades} unidades
              </p>
            </div>
          )}

          {!ranking?.masVendido && !loadingRanking && (
            <div className="text-center py-6 text-secondary-400 text-sm">
              Sin ventas en el período seleccionado.
            </div>
          )}
        </div>

        {/* Distribución de medios de pago */}
        <div className="card lg:col-span-2 overflow-hidden">
          <h3 className="font-bold text-secondary flex items-center gap-2 mb-4">
            <Receipt className="w-4 h-4 text-primary" />
            Distribución por Medio de Pago
          </h3>
          {pagos && pagos.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Pie
                  data={pagos}
                  dataKey="total"
                  nameKey="medio"
                  cx="35%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={3}
                >
                  {pagos.map((_, i) => (
                    <Cell key={i} fill={PAGO_COLORS[i % PAGO_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [formatARS(val), 'Total']}
                  labelFormatter={(label) => PAGO_LABELS[label] ?? label}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  formatter={(val) => PAGO_LABELS[val] ?? val}
                  wrapperStyle={{ fontSize: '11px', paddingLeft: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-secondary-400 text-sm">
              Sin datos en el período seleccionado.
            </div>
          )}
        </div>
      </div>

      {/* ── Gráfico evolución de ventas ── */}
      <div className="card">
        <h3 className="font-bold text-secondary flex items-center gap-2 mb-6">
          <TrendingUp className="w-4 h-4 text-primary" />
          Evolución de Ventas
        </h3>
        {porDia && porDia.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={porDia} margin={{ top: 10, right: 16, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPrimary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#E55B2B" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#E55B2B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#E55B2B"
                strokeWidth={2.5}
                fill="url(#gradPrimary)"
                dot={{ fill: '#E55B2B', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: '#E55B2B' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-48 text-secondary-400 text-sm">
            Sin datos para graficar en el período seleccionado.
          </div>
        )}
      </div>
    </div>
  )
}


import React, { useState } from 'react'
import {
  TrendingUp, DollarSign, ShoppingBag, Receipt,
  Award, AlertTriangle, Calendar, RefreshCw, Package
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useKPIs, useRankingProductos, useVentasPorDia, usePagosDistribucion, useStockMetrics, useLowStockProducts, useExpiringProducts } from '../hooks/useAnalytics'
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
    <div className="card flex items-start gap-4 animate-fade-in">
      <div className={`kpi-icon ${bgColor}`}>
        <div className={color}>{icon}</div>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-extrabold text-secondary truncate">{value}</p>
        {subtitle && <p className="text-xs text-secondary-400 mt-0.5">{subtitle}</p>}
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
  const desde = getDesde(periodo)

  const { data: kpis,    isLoading: loadingKpis    } = useKPIs()
  const { data: ranking, isLoading: loadingRanking  } = useRankingProductos(desde)
  const { data: porDia,  isLoading: loadingPorDia   } = useVentasPorDia(desde)
  const { data: pagos,   isLoading: loadingPagos    } = usePagosDistribucion(desde)
  
  const { data: stockMetrics, isLoading: loadingStock } = useStockMetrics()
  const { data: lowStock,     isLoading: loadingLow   } = useLowStockProducts()
  const { data: expiring,     isLoading: loadingExp   } = useExpiringProducts()

  const isLoading = loadingKpis || loadingRanking || loadingPorDia || loadingPagos || loadingStock || loadingLow || loadingExp

  return (
    <div className="space-y-8">
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
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          label="Facturación Hoy"
          value={formatARS(kpis?.facturacion_hoy ?? 0)}
          subtitle={`${kpis?.ventas_hoy_count ?? 0} venta${kpis?.ventas_hoy_count === 1 ? '' : 's'} realizadas`}
          icon={<DollarSign className="w-6 h-6" />}
          color="text-primary"
          bgColor="bg-primary-soft"
        />
        <KPICard
          label="Facturación Semanal"
          value={formatARS(kpis?.facturacion_semana ?? 0)}
          subtitle="Últimos 7 días"
          icon={<TrendingUp className="w-6 h-6" />}
          color="text-success"
          bgColor="bg-success-light"
        />
        <KPICard
          label="Facturación Mensual"
          value={formatARS(kpis?.facturacion_mes ?? 0)}
          subtitle="Mes en curso"
          icon={<Calendar className="w-6 h-6" />}
          color="text-blue-500"
          bgColor="bg-blue-50"
        />
        <KPICard
          label="Ticket Promedio Hoy"
          value={formatARS(kpis?.ticket_promedio_hoy ?? 0)}
          subtitle="Por venta"
          icon={<Receipt className="w-6 h-6" />}
          color="text-warning"
          bgColor="bg-warning-light"
        />
      </div>

      {/* ── KPI Cards de Stock ── */}
      <h3 className="font-bold text-secondary mt-8 mb-2 flex items-center gap-2">
        <Package className="w-5 h-5 text-primary" />
        Métricas de Inventario
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <KPICard
          label="Valor de Venta (Stock)"
          value={formatARS(stockMetrics?.valorVenta ?? 0)}
          subtitle={`${stockMetrics?.totalUnidades ?? 0} unidades totales`}
          icon={<DollarSign className="w-6 h-6" />}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <KPICard
          label="Costo Total (C/IVA)"
          value={formatARS(stockMetrics?.valorCostoConIva ?? 0)}
          subtitle="Capital inmovilizado"
          icon={<ShoppingBag className="w-6 h-6" />}
          color="text-indigo-600"
          bgColor="bg-indigo-50"
        />
        <KPICard
          label="Rentabilidad Proyectada"
          value={formatARS(stockMetrics?.rentabilidadEstimada ?? 0)}
          subtitle="Bruta (Venta - Costo C/IVA)"
          icon={<TrendingUp className="w-6 h-6" />}
          color="text-primary"
          bgColor="bg-primary-soft"
        />
        <KPICard
          label="Alertas de Stock"
          value={String(lowStock?.length ?? 0)}
          subtitle="Productos críticos"
          icon={<AlertTriangle className="w-6 h-6" />}
          color={lowStock && lowStock.length > 0 ? "text-danger" : "text-success"}
          bgColor={lowStock && lowStock.length > 0 ? "bg-danger-light" : "bg-success-light"}
        />
        <KPICard
          label="Próximos a Vencer"
          value={String(expiring?.length ?? 0)}
          subtitle="< 30 días"
          icon={<Calendar className="w-6 h-6" />}
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
        <div className="card lg:col-span-2">
          <h3 className="font-bold text-secondary flex items-center gap-2 mb-4">
            <Receipt className="w-4 h-4 text-primary" />
            Distribución por Medio de Pago
          </h3>
          {pagos && pagos.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pagos}
                  dataKey="total"
                  nameKey="medio"
                  cx="40%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
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
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={porDia} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
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

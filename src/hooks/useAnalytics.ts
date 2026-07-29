import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { todayStart, daysAgo, startOfMonth } from '../utils/formatters'
import type { Venta } from './useVentas'

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface KPISummary {
  facturacion_hoy:      number
  facturacion_semana:   number
  facturacion_mes:      number
  ventas_hoy_count:     number
  ticket_promedio_hoy:  number
}

export interface ProductoRanking {
  producto_id:   number
  nombre:        string
  marca:         string | null
  presentacion:  string | null
  unidades:      number
  monto_total:   number
}

export interface VentaPorDia {
  dia:   string
  total: number
  count: number
}

export interface PagoDistribucion {
  medio:      string
  total:      number
  porcentaje: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

function sumMonto(ventas: Venta[]): number {
  return ventas.reduce((acc, v) => acc + (v.monto_total ?? 0), 0)
}

// ── Hooks ──────────────────────────────────────────────────────────────────

/** KPIs principales: facturación hoy / semana / mes. */
export function useKPIs() {
  return useQuery({
    queryKey: ['analytics', 'kpis'],
    queryFn:  async (): Promise<KPISummary> => {
      const { data: ventasMes, error } = await supabase
        .from('ventas')
        .select('monto_total, fecha_venta')
        .gte('fecha_venta', startOfMonth())
        .order('fecha_venta', { ascending: false })

      if (error) throw error

      const hoy    = new Date(todayStart())
      const semana = new Date(daysAgo(7))

      const ventasHoy    = (ventasMes as Venta[]).filter(v => new Date(v.fecha_venta) >= hoy)
      const ventasSemana = (ventasMes as Venta[]).filter(v => new Date(v.fecha_venta) >= semana)
      const ventasMesAll = ventasMes as Venta[]

      const facturacion_hoy    = sumMonto(ventasHoy)
      const facturacion_semana = sumMonto(ventasSemana)
      const facturacion_mes    = sumMonto(ventasMesAll)
      const ventas_hoy_count   = ventasHoy.length
      const ticket_promedio_hoy = ventas_hoy_count > 0
        ? facturacion_hoy / ventas_hoy_count
        : 0

      return {
        facturacion_hoy,
        facturacion_semana,
        facturacion_mes,
        ventas_hoy_count,
        ticket_promedio_hoy,
      }
    },
    refetchInterval: 60_000,
  })
}

/** Ranking de productos más y menos vendidos en un rango de fechas. */
export function useRankingProductos(desde: string, hasta?: string) {
  return useQuery({
    queryKey: ['analytics', 'ranking', desde, hasta],
    queryFn:  async (): Promise<{ masVendido: ProductoRanking | null; menosVendido: ProductoRanking | null; top5: ProductoRanking[] }> => {
      let q = supabase
        .from('ventas_detalle')
        .select(`
          cantidad,
          precio_unitario,
          subtotal,
          productos(id, nombre),
          variantes(id, variante),
          ventas!inner(fecha_venta)
        `)
        .gte('ventas.fecha_venta', desde)

      if (hasta) q = q.lte('ventas.fecha_venta', hasta)

      const { data, error } = await q
      if (error) throw error

      // Agrupar por producto o variante
      const grouped = (data as any[]).reduce((acc: Record<string, ProductoRanking>, curr) => {
        const p = curr.productos
        const v = curr.variantes
        if (!p) return acc

        const key = v?.id ? `v-${v.id}` : `p-${p.id}`
        
        if (!acc[key]) {
          acc[key] = {
            producto_id: p.id,
            nombre: p.nombre + (v?.variante && v.variante !== '-' && v.variante !== p.nombre ? ` - ${v.variante}` : ''),
            marca: '',
            presentacion: null,
            unidades: 0,
            monto_total: 0,
          }
        }
        acc[key].unidades += curr.cantidad || 0
        acc[key].monto_total += curr.subtotal || (curr.cantidad * curr.precio_unitario)

        return acc
      }, {})

      const sorted = Object.values(grouped).sort((a: any, b: any) => b.unidades - a.unidades) as ProductoRanking[]

      return {
        masVendido:    sorted[0] ?? null,
        menosVendido:  sorted[sorted.length - 1] ?? null,
        top5:          sorted.slice(0, 5),
      }
    },
    staleTime: 1000 * 60 * 5,
  })
}

/** Evolución de ventas por día en un rango. */
export function useVentasPorDia(desde: string, hasta?: string) {
  return useQuery({
    queryKey: ['analytics', 'por-dia', desde, hasta],
    queryFn:  async (): Promise<VentaPorDia[]> => {
      let q = supabase
        .from('ventas')
        .select('monto_total, fecha_venta')
        .gte('fecha_venta', desde)
        .order('fecha_venta', { ascending: true })

      if (hasta) q = q.lte('fecha_venta', hasta)

      const { data, error } = await q
      if (error) throw error

      // Agrupar por día
      const dayMap = new Map<string, VentaPorDia>()
      for (const v of data as Venta[]) {
        const dia = v.fecha_venta.slice(0, 10)
        const ex  = dayMap.get(dia)
        if (ex) {
          ex.total += v.monto_total
          ex.count += 1
        } else {
          dayMap.set(dia, { dia, total: v.monto_total, count: 1 })
        }
      }

      return [...dayMap.values()]
    },
    staleTime: 1000 * 60 * 5,
  })
}

/** Distribución de ventas por medio de pago. */
export function usePagosDistribucion(desde: string, hasta?: string) {
  return useQuery({
    queryKey: ['analytics', 'pagos', desde, hasta],
    queryFn:  async (): Promise<PagoDistribucion[]> => {
      let q = supabase
        .from('ventas')
        .select('medio_pago, monto_total')
        .gte('fecha_venta', desde)

      if (hasta) q = q.lte('fecha_venta', hasta)

      const { data, error } = await q
      if (error) throw error

      const map = new Map<string, number>()
      let grandTotal = 0

      for (const v of data as Venta[]) {
        const mp = v.medio_pago ?? 'efectivo'
        map.set(mp, (map.get(mp) ?? 0) + v.monto_total)
        grandTotal += v.monto_total
      }

      return [...map.entries()].map(([medio, total]) => ({
        medio,
        total,
        porcentaje: grandTotal > 0 ? total / grandTotal : 0,
      })).sort((a, b) => b.total - a.total)
    },
    staleTime: 1000 * 60 * 5,
  })
}
/** Productos con stock crítico (actual <= minimo) */
export function useLowStockProducts() {
  return useQuery({
    queryKey: ['analytics', 'low_stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('variantes')
        .select(`
          id,
          variante,
          stock_actual,
          stock_disponible,
          productos!inner(nombre)
        `)
      if (error) throw error
      
      const res = (data || []).map((v: any) => ({
        id: v.id,
        nombre: v.productos?.nombre + (v.variante && v.variante !== '-' ? ` - ${v.variante}` : ''),
        stock_actual: v.stock_disponible ?? v.stock_actual ?? 0,
        stock_minimo: 1 // Default to 1 as requested by user
      }))

      return res.filter(p => p.stock_actual <= p.stock_minimo)
    },
    refetchInterval: 60_000,
  })
}

/** Productos próximos a vencer (30 días) */
export function useExpiringProducts() {
  return useQuery({
    queryKey: ['analytics', 'expiring_products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('variantes')
        .select(`
          id,
          variante,
          fecha_vencimiento,
          productos!inner(nombre)
        `)
        .not('fecha_vencimiento', 'is', null)
      if (error) throw error
      
      const unMesMas = new Date()
      unMesMas.setDate(unMesMas.getDate() + 30)

      const res = (data || []).map((v: any) => ({
        id: v.id,
        nombre: v.productos?.nombre + (v.variante && v.variante !== '-' ? ` - ${v.variante}` : ''),
        fecha_vencimiento: v.fecha_vencimiento
      }))

      return res.filter(p => {
        const [y, m, d] = p.fecha_vencimiento.split('-')
        const fechaVenc = new Date(Number(y), Number(m) - 1, Number(d))
        return fechaVenc <= unMesMas
      })
    },
    refetchInterval: 60_000,
  })
}

/** Métricas globales de stock (valorización) */
export function useStockMetrics() {
  return useQuery({
    queryKey: ['analytics', 'stock_metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('variantes')
        .select('stock_actual, stock_disponible, precio_sin_iva, precio_con_iva, precio_mostrador')
      
      if (error) throw error

      let valorCostoSinIva = 0
      let valorCostoConIva = 0
      let valorVenta = 0
      let totalUnidades = 0

      for (const v of (data || [])) {
        const stock = v.stock_disponible ?? v.stock_actual ?? 0
        if (stock > 0) {
          totalUnidades += stock
          valorCostoSinIva += stock * (v.precio_sin_iva || 0)
          valorCostoConIva += stock * (v.precio_con_iva || 0)
          valorVenta += stock * (v.precio_mostrador || 0)
        }
      }

      return {
        valorCostoSinIva,
        valorCostoConIva,
        valorVenta,
        totalUnidades,
        rentabilidadEstimada: valorVenta - valorCostoConIva
      }
    },
    refetchInterval: 120_000,
  })
}

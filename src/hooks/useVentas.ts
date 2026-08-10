import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { todayStart } from '../utils/formatters'

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface VentaItem {
  producto_id:    number
  variante_id?:   number
  cantidad:       number
  precio_unitario: number
  nombre:         string // solo para display en el carrito
}

export interface VentaDetalle {
  id:              string
  producto_id:     number | null
  variante_id:     number | null
  cantidad:        number
  precio_unitario: number
  subtotal:        number
  nombre_producto: string | null  // snapshot guardado al momento de la venta
  productos?:      { nombre: string } | null
  variantes?:      { variante: string } | null
}

export interface Venta {
  id:                 number
  numero_comprobante: number
  usuario_id:         string
  cliente_nombre:     string
  medio_pago:         string
  monto_total:        number
  notas:              string | null
  fecha_venta:        string
  ventas_detalle?:    VentaDetalle[]
}

// ── Queries ────────────────────────────────────────────────────────────────

/** Obtiene las ventas del día actual con su detalle. */
export function useVentasHoy() {
  return useQuery({
    queryKey: ['ventas', 'hoy'],
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('ventas')
        .select(`
          id,
          numero_comprobante,
          usuario_id,
          cliente_nombre,
          medio_pago,
          monto_total,
          notas,
          fecha_venta,
          ventas_detalle (
            id,
            cantidad,
            precio_unitario,
            subtotal,
            producto_id,
            variante_id,
            nombre_producto,
            productos ( nombre ),
            variantes ( variante )
          )
        `)
        .gte('fecha_venta', todayStart())
        .order('fecha_venta', { ascending: false })

      if (error) throw error
      return data as unknown as Venta[]
    },
    refetchInterval: 30_000,
  })
}

/** Obtiene ventas con filtros dinámicos (usado en Dashboard). */
export function useVentas(desde: string, hasta?: string) {
  return useQuery({
    queryKey: ['ventas', 'rango', desde, hasta],
    queryFn:  async () => {
      let q = supabase
        .from('ventas')
        .select(`
          id,
          numero_comprobante,
          usuario_id,
          cliente_nombre,
          medio_pago,
          monto_total,
          notas,
          fecha_venta
        `)
        .gte('fecha_venta', desde)
        .order('fecha_venta', { ascending: false })

      if (hasta) q = q.lte('fecha_venta', hasta)

      const { data, error } = await q
      if (error) throw error
      return data as Venta[]
    },
    staleTime: 1000 * 60,
  })
}

// ── Mutations ──────────────────────────────────────────────────────────────

interface ProcesarVentaParams {
  cliente:      string
  medio_pago:   string
  notas:        string
  items:        VentaItem[]
}

/**
 * Invoca la función RPC atómica procesar_venta_transaccion.
 * Descuenta stock y registra la venta en una sola transacción.
 */
export function useProcesarVenta() {
  const qc      = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ cliente, medio_pago, notas, items }: ProcesarVentaParams) => {
      if (!user) throw new Error('No hay sesión activa.')

      const p_items = items.map(({ producto_id, variante_id, cantidad, precio_unitario }) => ({
        producto_id,
        ...(variante_id ? { variante_id } : {}),
        cantidad,
        precio_unitario,
      }))

      const { data, error } = await supabase.rpc('procesar_venta_transaccion', {
        p_usuario_id: user.id,
        p_cliente:    cliente || 'Consumidor Final',
        p_medio_pago: medio_pago,
        p_notas:      notas || null,
        p_items:      p_items,
      })

      if (error) throw error
      return data as { success: boolean; venta_id: number; monto_total: number }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventas'] })
      qc.invalidateQueries({ queryKey: ['productos'] })
    },
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface Cliente {
  id:             number
  nombre:         string
  telefono:       string | null
  email:          string | null
  direccion:      string | null
  limite_credito: number
  saldo_actual:   number
  activo:         boolean
  created_at:     string
  updated_at:     string
}

export interface MovimientoCtaCte {
  id:               number
  cliente_id:       number
  venta_id:         number | null
  tipo:             'debe' | 'haber'
  monto:            number
  saldo_resultante: number
  medio_pago:       string | null
  descripcion:      string | null
  fecha:            string
  usuario_id:       string | null
  ventas?: {
    id:                 number
    numero_comprobante: number
    fecha_venta:        string
    monto_total:        number
    ventas_detalle?: {
      id:              string
      cantidad:        number
      precio_unitario: number
      subtotal:        number
      nombre_producto: string | null
      productos?:      { nombre: string } | null
      variantes?:      { variante: string } | null
    }[]
  } | null
}

export type ClienteCreate = Omit<Cliente, 'id' | 'saldo_actual' | 'created_at' | 'updated_at'>
export type ClienteUpdate = Partial<ClienteCreate> & { id: number }

// ── Queries ────────────────────────────────────────────────────────────────

/** Obtiene todos los clientes activos con búsqueda por nombre, teléfono o email. */
export function useClientes(search = '') {
  return useQuery({
    queryKey: ['clientes', search],
    queryFn:  async () => {
      let q = supabase
        .from('clientes')
        .select('*')
        .order('nombre', { ascending: true })

      if (search.trim()) {
        const s = `%${search.trim()}%`
        q = q.or(`nombre.ilike.${s},telefono.ilike.${s},email.ilike.${s}`)
      }

      const { data, error } = await q
      if (error) throw error
      return data as Cliente[]
    },
    staleTime: 1000 * 60 * 2,
  })
}

/** Obtiene el historial completo de movimientos (ventas a crédito y entregas de dinero) de un cliente. */
export function useClienteDetalle(clienteId: number | null) {
  return useQuery({
    queryKey: ['cliente', clienteId, 'movimientos'],
    enabled:  !!clienteId,
    queryFn:  async () => {
      if (!clienteId) return null

      // 1. Datos del cliente
      const { data: cliente, error: errCli } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single()

      if (errCli) throw errCli

      // 2. Movimientos con desglose de venta si aplica
      const { data: movimientos, error: errMov } = await supabase
        .from('cuenta_corriente_movimientos')
        .select(`
          id,
          cliente_id,
          venta_id,
          tipo,
          monto,
          saldo_resultante,
          medio_pago,
          descripcion,
          fecha,
          usuario_id,
          ventas (
            id,
            numero_comprobante,
            fecha_venta,
            monto_total,
            ventas_detalle (
              id,
              cantidad,
              precio_unitario,
              subtotal,
              nombre_producto,
              productos ( nombre ),
              variantes ( variante )
            )
          )
        `)
        .eq('cliente_id', clienteId)
        .order('fecha', { ascending: false })

      if (errMov) throw errMov

      return {
        cliente: cliente as Cliente,
        movimientos: (movimientos || []) as unknown as MovimientoCtaCte[]
      }
    },
  })
}

// ── Mutations ──────────────────────────────────────────────────────────────

/** Crear un cliente nuevo. */
export function useCrearCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (cliente: ClienteCreate) => {
      const { data, error } = await supabase
        .from('clientes')
        .insert([{
          nombre:         cliente.nombre.trim(),
          telefono:       cliente.telefono?.trim() || null,
          email:          cliente.email?.trim() || null,
          direccion:      cliente.direccion?.trim() || null,
          limite_credito: cliente.limite_credito || 0,
          activo:         cliente.activo ?? true,
        }])
        .select()
        .single()

      if (error) throw error
      return data as Cliente
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}

/** Editar datos de un cliente existente. */
export function useEditarCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...changes }: ClienteUpdate) => {
      const { data, error } = await supabase
        .from('clientes')
        .update({
          ...changes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Cliente
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
      qc.invalidateQueries({ queryKey: ['cliente'] })
    },
  })
}

interface RegistrarPagoParams {
  cliente_id: number
  monto:      number
  medio_pago: string
  notas:      string
}

/** Invoca el RPC registrar_pago_cliente para procesar entregas de dinero a cuenta. */
export function useRegistrarPagoCliente() {
  const qc       = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ cliente_id, monto, medio_pago, notas }: RegistrarPagoParams) => {
      if (!user) throw new Error('No hay sesión activa.')

      const { data, error } = await supabase.rpc('registrar_pago_cliente', {
        p_cliente_id: cliente_id,
        p_monto:      monto,
        p_medio_pago: medio_pago,
        p_notas:      notas || null,
        p_usuario_id: user.id,
      })

      if (error) throw error
      return data as { success: boolean; movimiento_id: number; saldo_resultante: number }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
      qc.invalidateQueries({ queryKey: ['cliente', variables.cliente_id] })
    },
  })
}

/** Elimina todos los movimientos de cuenta corriente de un cliente y resetea su saldo a 0. */
export function useEliminarCtaCte() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (clienteId: number) => {
      const { data, error } = await supabase.rpc('eliminar_cta_cte', {
        p_cliente_id: clienteId,
      })

      if (error) throw error
      return data as { success: boolean; movimientos_eliminados: number }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] })
      qc.invalidateQueries({ queryKey: ['cliente'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

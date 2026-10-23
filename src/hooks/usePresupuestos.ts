import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface PresupuestoItem {
  id?:              number
  producto_id?:     number | null
  variante_id?:     number | null
  nombre_producto:  string
  presentacion?:    string | null
  cantidad:         number
  precio_unitario:  number
  subtotal:         number
}

export interface Presupuesto {
  id:                 number
  numero_presupuesto: number
  usuario_id?:        string | null
  cliente_id?:        number | null
  cliente_nombre:     string
  cliente_telefono?:  string | null
  cliente_email?:     string | null
  cliente_direccion?: string | null
  monto_total:        number
  validez_dias:       number
  notas?:             string | null
  estado:             'pendiente' | 'aprobado' | 'vencido' | 'rechazado'
  fecha_presupuesto:  string
  created_at:         string
  presupuestos_detalle?: PresupuestoItem[]
}

export interface GuardarPresupuestoParams {
  cliente_id?:        number | null
  cliente_nombre:     string
  cliente_telefono?:  string | null
  cliente_email?:     string | null
  cliente_direccion?: string | null
  validez_dias?:      number
  notas?:             string | null
  items:              PresupuestoItem[]
}

// ── Queries ────────────────────────────────────────────────────────────────

/** Obtiene el listado de presupuestos guardados con opción de búsqueda por cliente o número y filtro por estado. */
export function usePresupuestos(search = '', estadoFilter = 'todos') {
  return useQuery({
    queryKey: ['presupuestos', search, estadoFilter],
    queryFn:  async () => {
      let q = supabase
        .from('presupuestos')
        .select(`
          id,
          numero_presupuesto,
          usuario_id,
          cliente_id,
          cliente_nombre,
          cliente_telefono,
          cliente_email,
          cliente_direccion,
          monto_total,
          validez_dias,
          notas,
          estado,
          fecha_presupuesto,
          created_at,
          presupuestos_detalle (
            id,
            producto_id,
            variante_id,
            nombre_producto,
            presentacion,
            cantidad,
            precio_unitario,
            subtotal
          )
        `)
        .order('fecha_presupuesto', { ascending: false })

      if (estadoFilter && estadoFilter !== 'todos') {
        q = q.eq('estado', estadoFilter)
      }

      if (search.trim()) {
        const cleanSearch = search.trim()
        const s = `%${cleanSearch}%`
        const num = parseInt(cleanSearch.replace(/\D/g, ''), 10)
        if (!isNaN(num) && num > 0) {
          q = q.or(`cliente_nombre.ilike.${s},notas.ilike.${s},numero_presupuesto.eq.${num}`)
        } else {
          q = q.or(`cliente_nombre.ilike.${s},notas.ilike.${s}`)
        }
      }

      const { data, error } = await q
      if (error) throw error
      return data as unknown as Presupuesto[]
    },
    staleTime: 1000 * 30,
  })
}

/** Obtiene un presupuesto específico por su ID con todo el detalle de productos. */
export function usePresupuestoDetalle(id: number | null) {
  return useQuery({
    queryKey: ['presupuesto', id],
    enabled:  !!id,
    queryFn:  async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('presupuestos')
        .select(`
          id,
          numero_presupuesto,
          usuario_id,
          cliente_id,
          cliente_nombre,
          cliente_telefono,
          cliente_email,
          cliente_direccion,
          monto_total,
          validez_dias,
          notas,
          estado,
          fecha_presupuesto,
          created_at,
          presupuestos_detalle (
            id,
            producto_id,
            variante_id,
            nombre_producto,
            presentacion,
            cantidad,
            precio_unitario,
            subtotal
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as unknown as Presupuesto
    },
  })
}

// ── Mutations ──────────────────────────────────────────────────────────────

/** Guardar un nuevo presupuesto en Supabase. */
export function useGuardarPresupuesto() {
  const qc       = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (params: GuardarPresupuestoParams) => {
      if (!params.items || params.items.length === 0) {
        throw new Error('El presupuesto debe contener al menos un producto.')
      }

      const monto_total = params.items.reduce((acc, item) => acc + (item.cantidad * item.precio_unitario), 0)

      // 1. Insertar Cabecera de Presupuesto
      const { data: pres, error: errPres } = await supabase
        .from('presupuestos')
        .insert([{
          usuario_id:         user?.id || null,
          cliente_id:         params.cliente_id || null,
          cliente_nombre:     params.cliente_nombre.trim() || 'Cliente Ocasional',
          cliente_telefono:   params.cliente_telefono?.trim() || null,
          cliente_email:      params.cliente_email?.trim() || null,
          cliente_direccion:  params.cliente_direccion?.trim() || null,
          monto_total:        monto_total,
          validez_dias:       params.validez_dias || 15,
          notas:              params.notas?.trim() || null,
          estado:             'pendiente',
        }])
        .select('id, numero_presupuesto, monto_total')
        .single()

      if (errPres) throw errPres

      // 2. Insertar Detalle de Ítems
      const detalleRows = params.items.map(item => ({
        presupuesto_id:  pres.id,
        producto_id:     item.producto_id || null,
        variante_id:     item.variante_id || null,
        nombre_producto: item.nombre_producto,
        presentacion:    item.presentacion || null,
        cantidad:        item.cantidad,
        precio_unitario: item.precio_unitario,
      }))

      const { error: errDet } = await supabase
        .from('presupuestos_detalle')
        .insert(detalleRows)

      if (errDet) throw errDet

      return {
        success:            true,
        presupuesto_id:     pres.id,
        numero_presupuesto: pres.numero_presupuesto,
        monto_total:        pres.monto_total
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['presupuestos'] })
    },
  })
}

/** Cambiar estado de un presupuesto ('aprobado', 'vencido', 'rechazado'). */
export function useCambiarEstadoPresupuesto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, estado }: { id: number; estado: 'pendiente' | 'aprobado' | 'vencido' | 'rechazado' }) => {
      const { data, error } = await supabase
        .from('presupuestos')
        .update({ estado, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['presupuestos'] })
      qc.invalidateQueries({ queryKey: ['presupuesto'] })
    },
  })
}

/** Eliminar un presupuesto guardado. */
export function useEliminarPresupuesto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('presupuestos')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { success: true }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['presupuestos'] })
    },
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

// ── Tipos ──────────────────────────────────────────────────────────────────

export type TipoAplicacion = 'todos' | 'marcas' | 'productos'

export interface Convenio {
  id:              number
  nombre:          string
  descripcion:     string | null
  descuento_pct:   number
  tipo_aplicacion: TipoAplicacion
  activo:          boolean
  created_at:      string
  updated_at:      string
  marcas?:         { marca_id: number; marcas: { nombre: string } }[]
  productos?:      { variante_id: number; variante: string; producto_nombre: string }[]
}

export interface ConvenioDetalle extends Convenio {
  convenios_marcas?:    { marca_id: number }[]
  convenios_productos?: { variante_id: number }[]
}

// ── Queries ────────────────────────────────────────────────────────────────

export function useConvenios() {
  return useQuery({
    queryKey: ['convenios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('convenios')
        .select('*')
        .order('nombre', { ascending: true })
      if (error) throw error
      return data as Convenio[]
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useConvenioDetalle(id: number | null) {
  return useQuery({
    queryKey: ['convenio', id],
    enabled: id !== null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('convenios')
        .select(`
          *,
          convenios_marcas ( marca_id ),
          convenios_productos ( variante_id )
        `)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as ConvenioDetalle
    },
  })
}

/** Devuelve la lista de precios para un convenio dado, con el descuento aplicado. */
export function useListaPrecios(convenioId: number | null) {
  return useQuery({
    queryKey: ['lista_precios', convenioId],
    enabled: convenioId !== null,
    queryFn: async () => {
      // 1. Obtener el convenio con sus relaciones
      const { data: conv, error: convErr } = await supabase
        .from('convenios')
        .select(`
          *,
          convenios_marcas ( marca_id ),
          convenios_productos ( variante_id )
        `)
        .eq('id', convenioId!)
        .single()
      if (convErr) throw convErr

      // 2. Obtener todos los productos
      const { data: variantes, error: varErr } = await supabase
        .from('variantes')
        .select(`
          id,
          variante,
          precio_mostrador,
          stock_actual,
          productos!inner ( nombre, marca_id, marcas ( nombre ) )
        `)
        .gt('stock_actual', 0)
        .order('id')
      if (varErr) throw varErr

      const descuento = conv.descuento_pct / 100

      // 3. Filtrar según tipo_aplicacion
      const filtered = (variantes || []).filter((v: any) => {
        if (conv.tipo_aplicacion === 'todos') return true
        if (conv.tipo_aplicacion === 'marcas') {
          const marcasIds = (conv.convenios_marcas || []).map((m: any) => m.marca_id)
          return marcasIds.includes(v.productos?.marca_id)
        }
        if (conv.tipo_aplicacion === 'productos') {
          const ids = (conv.convenios_productos || []).map((p: any) => p.variante_id)
          return ids.includes(v.id)
        }
        return false
      })

      // 4. Aplicar descuento
      return filtered.map((v: any) => ({
        id:                v.id,
        nombre:            v.productos?.nombre ?? '',
        variante:          v.variante ?? '',
        marca:             v.productos?.marcas?.nombre ?? '',
        precio_original:   v.precio_mostrador,
        precio_convenio:   parseFloat((v.precio_mostrador * (1 - descuento)).toFixed(2)),
        stock_actual:      v.stock_actual,
      }))
    },
  })
}

// ── Mutations ──────────────────────────────────────────────────────────────

interface ConvenioCreatePayload {
  nombre:          string
  descripcion:     string
  descuento_pct:   number
  tipo_aplicacion: TipoAplicacion
  activo:          boolean
  marca_ids:       number[]
  variante_ids:    number[]
}

export function useCreateConvenio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ConvenioCreatePayload) => {
      // 1. Insert convenio base
      const { data: conv, error } = await supabase
        .from('convenios')
        .insert({
          nombre:          payload.nombre,
          descripcion:     payload.descripcion || null,
          descuento_pct:   payload.descuento_pct,
          tipo_aplicacion: payload.tipo_aplicacion,
          activo:          payload.activo,
        })
        .select()
        .single()
      if (error) throw error

      // 2. Insert relaciones según tipo
      if (payload.tipo_aplicacion === 'marcas' && payload.marca_ids.length > 0) {
        const { error: mErr } = await supabase
          .from('convenios_marcas')
          .insert(payload.marca_ids.map(mid => ({ convenio_id: conv.id, marca_id: mid })))
        if (mErr) throw mErr
      }
      if (payload.tipo_aplicacion === 'productos' && payload.variante_ids.length > 0) {
        const { error: pErr } = await supabase
          .from('convenios_productos')
          .insert(payload.variante_ids.map(vid => ({ convenio_id: conv.id, variante_id: vid })))
        if (pErr) throw pErr
      }

      return conv
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['convenios'] }),
  })
}

export function useUpdateConvenio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: ConvenioCreatePayload & { id: number }) => {
      // 1. Update convenio
      const { error } = await supabase
        .from('convenios')
        .update({
          nombre:          payload.nombre,
          descripcion:     payload.descripcion || null,
          descuento_pct:   payload.descuento_pct,
          tipo_aplicacion: payload.tipo_aplicacion,
          activo:          payload.activo,
          updated_at:      new Date().toISOString(),
        })
        .eq('id', id)
      if (error) throw error

      // 2. Borrar relaciones viejas
      await supabase.from('convenios_marcas').delete().eq('convenio_id', id)
      await supabase.from('convenios_productos').delete().eq('convenio_id', id)

      // 3. Insertar nuevas
      if (payload.tipo_aplicacion === 'marcas' && payload.marca_ids.length > 0) {
        await supabase.from('convenios_marcas')
          .insert(payload.marca_ids.map(mid => ({ convenio_id: id, marca_id: mid })))
      }
      if (payload.tipo_aplicacion === 'productos' && payload.variante_ids.length > 0) {
        await supabase.from('convenios_productos')
          .insert(payload.variante_ids.map(vid => ({ convenio_id: id, variante_id: vid })))
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['convenios'] })
      qc.invalidateQueries({ queryKey: ['convenio', vars.id] })
    },
  })
}

export function useDeleteConvenio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('convenios').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['convenios'] }),
  })
}

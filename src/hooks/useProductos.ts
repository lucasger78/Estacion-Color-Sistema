import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface Marca {
  id:         number
  nombre:     string
  creado_at:  string
}

export interface Producto {
  id:                    number
  producto_id:           number
  codigo_barras:         string | null
  nombre:                string
  presentacion:          string | null
  marca_id:              number | null
  precio_costo_sin_iva:  number
  precio_costo_con_iva:  number
  precio_venta:          number
  stock_actual:          number
  stock_minimo:          number
  fecha_vencimiento:     string | null
  activo:                boolean
  creado_at:             string
  actualizado_at:        string
  marcas?:               { nombre: string } | null
}

export type ProductoCreate = Omit<Producto, 'id' | 'producto_id' | 'creado_at' | 'actualizado_at' | 'marcas'>
export type ProductoUpdate = Partial<ProductoCreate> & { id: number }

// ── Queries ────────────────────────────────────────────────────────────────

/** Obtiene todas las variantes y las mapea al formato de Producto para la UI. */
export function useProductos(search = '') {
  return useQuery({
    queryKey: ['productos', search],
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('variantes')
        .select(`
          id,
          producto_id,
          variante,
          precio_sin_iva,
          precio_con_iva,
          precio_mostrador,
          stock_disponible,
          stock_actual,
          fecha_vencimiento,
          created_at,
          updated_at,
          productos (
            nombre,
            marca_id,
            marcas (nombre)
          )
        `)

      if (error) throw error

      // Mapear la variante a la interfaz Producto esperada por la UI
      let mapped: Producto[] = (data || []).map((v: any) => {
        const prod = v.productos || {}
        const nombreBase = prod.nombre || 'Producto Desconocido'
        const nombreFinal = (v.variante && v.variante !== '-' && v.variante !== nombreBase)
          ? `${nombreBase} - ${v.variante}`
          : nombreBase

        return {
          id: v.id, // Usamos variante.id como ID principal para las listas
          producto_id: v.producto_id,
          codigo_barras: null,
          nombre: nombreFinal,
          presentacion: v.variante,
          marca_id: prod.marca_id,
          precio_costo_sin_iva: v.precio_sin_iva || 0,
          precio_costo_con_iva: v.precio_con_iva || 0,
          precio_venta: v.precio_mostrador || 0,
          stock_actual: v.stock_disponible ?? v.stock_actual ?? 0,
          stock_minimo: 0,
          fecha_vencimiento: v.fecha_vencimiento || null,
          activo: true,
          creado_at: v.created_at,
          actualizado_at: v.updated_at,
          marcas: prod.marcas
        }
      })

      // Filtrado en el cliente (ya que mapeamos los nombres compuestos aquí)
      if (search.trim()) {
        const s = search.toLowerCase()
        mapped = mapped.filter(m => 
          m.nombre.toLowerCase().includes(s) || 
          (m.marcas?.nombre || '').toLowerCase().includes(s)
        )
      }

      // Ordenar alfabéticamente
      mapped.sort((a, b) => a.nombre.localeCompare(b.nombre))

      return mapped
    },
    staleTime: 1000 * 60 * 2,
  })
}

/** Obtiene todas las marcas. */
export function useMarcas() {
  return useQuery({
    queryKey: ['marcas'],
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('marcas')
        .select('*')
        .order('nombre', { ascending: true })
      if (error) throw error
      return data as Marca[]
    },
    staleTime: 1000 * 60 * 10,
  })
}

// ── Mutations ──────────────────────────────────────────────────────────────

/** Crea un nuevo producto. */
export function useCreateProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (producto: ProductoCreate) => {
      const { data, error } = await supabase
        .from('productos')
        .insert(producto)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] }),
  })
}

/** Actualiza una variante existente. */
export function useUpdateProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: ProductoUpdate) => {
      // id aquí es variante.id
      const mappedUpdates: any = {
        precio_sin_iva: updates.precio_costo_sin_iva,
        precio_con_iva: updates.precio_costo_con_iva,
        precio_mostrador: updates.precio_venta,
        stock_disponible: updates.stock_actual,
        stock_actual: updates.stock_actual, // Por las dudas actualizamos ambas
        updated_at: new Date().toISOString()
      }
      
      if (updates.fecha_vencimiento !== undefined) {
        mappedUpdates.fecha_vencimiento = updates.fecha_vencimiento
      }
      
      const { data, error } = await supabase
        .from('variantes')
        .update(mappedUpdates)
        .eq('id', id)
        .select()
        .single()
        
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] }),
  })
}

/** Importa múltiples productos de forma masiva (upsert por nombre + presentación). */
export function useImportProductos() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (productos: ProductoCreate[]) => {
      const { data, error } = await supabase
        .from('productos')
        .upsert(productos, { onConflict: 'nombre,presentacion', ignoreDuplicates: false })
        .select()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] }),
  })
}

/** Activa / desactiva un producto (soft delete). */
export function useToggleProductoActivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, activo }: { id: number; activo: boolean }) => {
      const { error } = await supabase
        .from('productos')
        .update({ activo })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] }),
  })
}

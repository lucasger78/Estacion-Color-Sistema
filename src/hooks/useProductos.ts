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

/** Actualiza precios masivamente por lotes. */
export function useBulkUpdatePrecios() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: { id: number, sin_iva: number, con_iva: number, venta: number }[]) => {
      const batchSize = 20
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize)
        await Promise.all(batch.map(u => 
          supabase
            .from('variantes')
            .update({
              precio_sin_iva: u.sin_iva,
              precio_con_iva: u.con_iva,
              precio_mostrador: u.venta,
              updated_at: new Date().toISOString()
            })
            .eq('id', u.id)
        ))
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] }),
  })
}

/** Importa múltiples productos de forma masiva usando lotes para evitar timeouts. */
export function useImportProductos() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (productos: ProductoCreate[]) => {
      const BATCH = 50

      // 1. Obtener mapas en memoria de lo que ya existe
      const { data: dbProds, error: errProds } = await supabase
        .from('productos').select('id, nombre, marca_id')
      if (errProds) throw errProds

      const { data: dbVars, error: errVars } = await supabase
        .from('variantes').select('id, producto_id, variante')
      if (errVars) throw errVars

      const prodMap = new Map<string, number>()
      ;(dbProds || []).forEach((p: any) => {
        prodMap.set(`${p.nombre.toLowerCase().trim()}_${p.marca_id || 0}`, p.id)
      })

      const varMap = new Map<string, number>()
      ;(dbVars || []).forEach((v: any) => {
        varMap.set(`${v.producto_id}_${v.variante.toLowerCase().trim()}`, v.id)
      })

      // 2. Detectar productos base nuevos e insertarlos en lote
      const prodNuevos: { nombre: string; marca_id: number | null }[] = []
      const prodKeys: string[] = []

      for (const p of productos) {
        const key = `${p.nombre.toLowerCase().trim()}_${p.marca_id || 0}`
        if (!prodMap.has(key)) {
          // Solo agregar si no está ya en la lista de nuevos
          if (!prodKeys.includes(key)) {
            prodNuevos.push({ nombre: p.nombre.trim(), marca_id: p.marca_id ?? null })
            prodKeys.push(key)
          }
        }
      }

      // Insertar productos nuevos en lotes
      for (let i = 0; i < prodNuevos.length; i += BATCH) {
        const batch = prodNuevos.slice(i, i + BATCH)
        const { data: inserted, error: insErr } = await supabase
          .from('productos').insert(batch).select('id, nombre, marca_id')
        if (insErr) throw insErr
        ;(inserted || []).forEach((p: any) => {
          prodMap.set(`${p.nombre.toLowerCase().trim()}_${p.marca_id || 0}`, p.id)
        })
      }

      // 3. Preparar listas de variantes a insertar o actualizar
      const varInsertar: any[] = []
      const varActualizar: { id: number; data: any }[] = []

      for (const p of productos) {
        const prodKey = `${p.nombre.toLowerCase().trim()}_${p.marca_id || 0}`
        const prodId = prodMap.get(prodKey)
        if (!prodId) continue

        const varName = p.presentacion?.trim() || p.nombre.trim()
        const varKey  = `${prodId}_${varName.toLowerCase().trim()}`
        const existId = varMap.get(varKey)

        const varData = {
          precio_sin_iva:    Math.round((p.precio_costo_sin_iva || 0) * 100) / 100,
          precio_con_iva:    Math.round((p.precio_costo_con_iva || 0) * 100) / 100,
          precio_mostrador:  Math.round((p.precio_venta || 0) * 100) / 100,
          stock_disponible:  Math.round(p.stock_actual || 0),
          stock_actual:      Math.round(p.stock_actual || 0),
          fecha_vencimiento: p.fecha_vencimiento || null,
        }


        if (existId) {
          varActualizar.push({ id: existId, data: { ...varData, updated_at: new Date().toISOString() } })
        } else {
          varInsertar.push({ producto_id: prodId, variante: varName, ...varData })
        }
      }

      // 4. Insertar variantes nuevas en lotes de 50
      for (let i = 0; i < varInsertar.length; i += BATCH) {
        const batch = varInsertar.slice(i, i + BATCH)
        const { error } = await supabase.from('variantes').insert(batch)
        if (error) throw error
      }

      // 5. Actualizar variantes existentes en paralelo (lotes de 20)
      for (let i = 0; i < varActualizar.length; i += 20) {
        const batch = varActualizar.slice(i, i + 20)
        await Promise.all(batch.map(({ id, data }) =>
          supabase.from('variantes').update(data).eq('id', id)
        ))
      }

      return { success: true }
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

/** Elimina físicamente variantes y productos huérfanos de Supabase.
 *  Requiere que ventas_detalle.variante_id tenga ON DELETE SET NULL
 *  (ver fk_set_null_ventas_detalle.sql) — el historial de ventas se conserva. */
export function useDeleteVariantes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: number[]) => {
      // Paso 1: obtener los producto_id antes de borrar
      const { data: variantesData, error: fetchErr } = await supabase
        .from('variantes')
        .select('id, producto_id')
        .in('id', ids)
      if (fetchErr) throw fetchErr

      const productoIds = [...new Set((variantesData || []).map((v: any) => v.producto_id))]

      // Paso 2: eliminar las variantes
      // (ventas_detalle.variante_id queda en NULL automáticamente por ON DELETE SET NULL)
      const { error: varErr } = await supabase
        .from('variantes')
        .delete()
        .in('id', ids)
      if (varErr) throw varErr

      // Paso 3: eliminar los productos base que ya no tienen variantes
      if (productoIds.length > 0) {
        const { data: remaining } = await supabase
          .from('variantes')
          .select('producto_id')
          .in('producto_id', productoIds)

        const conVariantes = new Set((remaining || []).map((v: any) => v.producto_id))
        const huerfanos = productoIds.filter(pid => !conVariantes.has(pid))

        if (huerfanos.length > 0) {
          await supabase.from('productos').delete().in('id', huerfanos)
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] })
    },
  })
}

/** Limpia el catálogo completo: borra todas las variantes y productos.
 *  Conserva: marcas, convenios, usuarios y ventas (historial).
 *  Requiere que las FK de ventas_detalle sean ON DELETE SET NULL
 *  (ver migracion_historial_dinamico.sql). */
export function useLimpiarCatalogo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      // 1. Liberar referencias en ventas_detalle (NULL out producto_id y variante_id)
      //    Esto funciona solo si las FK son ON DELETE SET NULL (ya migradas)
      const { error: nullErr } = await supabase
        .from('ventas_detalle')
        .update({ variante_id: null, producto_id: null })
        .not('id', 'is', null) // aplica a todos los registros
      if (nullErr) throw nullErr

      // 2. Borrar todas las variantes
      const { error: varErr } = await supabase
        .from('variantes')
        .delete()
        .not('id', 'is', null)
      if (varErr) throw varErr

      // 3. Borrar todos los productos (SIN tocar marcas)
      const { error: prodErr } = await supabase
        .from('productos')
        .delete()
        .not('id', 'is', null)
      if (prodErr) throw prodErr
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] })
    },
  })
}

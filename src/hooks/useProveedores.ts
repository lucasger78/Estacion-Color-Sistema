import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export interface Proveedor {
  id: number
  nombre: string
  telefono: string | null
  direccion: string | null
  email: string | null
  activo: boolean
  creado_at: string
}

export type ProveedorCreate = Omit<Proveedor, 'id' | 'creado_at' | 'activo'>
export type ProveedorUpdate = Partial<ProveedorCreate> & { id: number, activo?: boolean }

export function useProveedores(search = '') {
  return useQuery({
    queryKey: ['proveedores', search],
    queryFn: async () => {
      let query = supabase
        .from('proveedores')
        .select('*')
        .order('nombre')

      if (search) {
        query = query.ilike('nombre', `%${search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Proveedor[]
    }
  })
}

export function useCreateProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (nuevo: ProveedorCreate) => {
      const { data, error } = await supabase
        .from('proveedores')
        .insert([nuevo])
        .select()
        .single()
      if (error) throw error
      return data as Proveedor
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proveedores'] })
  })
}

export function useUpdateProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: ProveedorUpdate) => {
      const { data, error } = await supabase
        .from('proveedores')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Proveedor
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proveedores'] })
  })
}

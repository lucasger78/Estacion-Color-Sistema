/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '[supabaseClient] Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY son requeridas.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken:    true,
    persistSession:      true,
    detectSessionInUrl:  true,
  },
})

// Cliente secundario sin persistencia de sesión para que el Admin cree usuarios sin desloguearse
export const supabaseSignupHelper = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken:    false,
    persistSession:      false,
    detectSessionInUrl:  false,
  },
})

export default supabase

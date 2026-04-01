'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

const SupabaseContext = createContext<SupabaseClient | null>(null)

export function SupabaseProvider({ children }: { children: ReactNode }) {
  // One instance for the entire client-side tree
  const supabase = useMemo(() => createClient(), [])

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase(): SupabaseClient {
  const client = useContext(SupabaseContext)
  if (!client) throw new Error('useSupabase must be used inside <SupabaseProvider>')
  return client
}

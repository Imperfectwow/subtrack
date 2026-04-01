import { createClient } from '@/lib/supabase/server'
import type { Profile, UserRole } from '@/lib/types'

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  return (data as Profile) ?? null
}

export const roleRoutes: Record<UserRole, string> = {
  super_admin: '/dashboard/super-admin',
  admin:       '/dashboard/admin',
  coordinator: '/dashboard/coordinator',
  assistant:   '/dashboard/assistant',
}

import { getCurrentProfile, roleRoutes } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  redirect(roleRoutes[profile.role])
}

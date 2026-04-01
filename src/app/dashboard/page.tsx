import { getCurrentProfile, roleRoutes } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/onboarding')
  redirect(roleRoutes[profile.role])
}

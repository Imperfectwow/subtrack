import { getCurrentProfile } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import SuperAdminDashboard from '@/components/SuperAdminDashboard'

export default async function SuperAdminPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'super_admin') redirect('/dashboard')
  return <SuperAdminDashboard />
}

import { getCurrentProfile } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import CoordinatorDashboard from '@/components/CoordinatorDashboard'

export default async function CoordinatorPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'coordinator') redirect('/dashboard')
  return <CoordinatorDashboard />
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CoordinatorDashboard from '@/components/CoordinatorDashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <CoordinatorDashboard />
}
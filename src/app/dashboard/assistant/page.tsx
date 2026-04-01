import { getCurrentProfile } from '@/lib/supabase/auth'
import { redirect } from 'next/navigation'
import AssistantDashboard from '@/components/AssistantDashboard'

export default async function AssistantPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'assistant') redirect('/dashboard')
  return <AssistantDashboard />
}

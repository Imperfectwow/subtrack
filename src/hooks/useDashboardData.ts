'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Absence, School, Assistant } from '@/lib/types'
import { useSupabase } from '@/components/providers/SupabaseProvider'

export const QUERY_KEYS = {
  absences:   ['absences']   as const,
  schools:    ['schools']    as const,
  assistants: ['assistants'] as const,
}

function now() {
  return new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

export function useDashboardData() {
  const supabase = useSupabase()
  const queryClient = useQueryClient()

  const absencesQuery = useQuery<Absence[]>({
    queryKey: QUERY_KEYS.absences,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('absences')
        .select('*, school:schools(name)')
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw new Error(error.message)
      return (data ?? []) as Absence[]
    },
  })

  const schoolsQuery = useQuery<School[]>({
    queryKey: QUERY_KEYS.schools,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('is_active', true)
      if (error) throw new Error(error.message)
      return (data ?? []) as School[]
    },
  })

  const assistantsQuery = useQuery<Assistant[]>({
    queryKey: QUERY_KEYS.assistants,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assistants')
        .select('*, profile:profiles(full_name, phone, whatsapp_phone)')
        .eq('is_available', true)
      if (error) throw new Error(error.message)
      return (data ?? []) as Assistant[]
    },
  })

  // Surface per-query errors as toasts (fires once per failed query)
  if (absencesQuery.error)   toast.error('שגיאה בטעינת היעדרויות')
  if (schoolsQuery.error)    toast.error('שגיאה בטעינת בתי הספר')
  if (assistantsQuery.error) toast.error('שגיאה בטעינת מסייעות')

  const loading = absencesQuery.isLoading || schoolsQuery.isLoading || assistantsQuery.isLoading

  const fetchAll = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.absences })
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.schools })
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.assistants })
  }

  const fetchAbsences = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.absences })

  const fetchAssistants = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.assistants })

  return {
    absences:   absencesQuery.data   ?? [],
    schools:    schoolsQuery.data    ?? [],
    assistants: assistantsQuery.data ?? [],
    loading,
    lastUpdate: loading ? '' : now(),
    fetchAll,
    fetchAbsences,
    fetchAssistants,
  }
}

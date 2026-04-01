'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'

export function useRealtimeDashboard(
  onAbsenceChange: () => void,
  onAssistantChange: () => void,
) {
  const supabase = useSupabase()
  const [newEvents, setNewEvents] = useState<string[]>([])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absences' }, (payload) => {
        onAbsenceChange()
        const msg = payload.eventType === 'INSERT'
          ? `היעדרות חדשה: ${(payload.new as { teacher_name: string }).teacher_name}`
          : `עדכון היעדרות: ${(payload.new as { teacher_name: string }).teacher_name}`
        setNewEvents(prev => [msg, ...prev.slice(0, 4)])
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assistants' }, () => {
        onAssistantChange()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { newEvents }
}

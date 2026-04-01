'use client'

import { useState, useEffect } from 'react'
import type { Absence, School, Assistant } from '@/lib/types'
import { useSupabase } from '@/components/providers/SupabaseProvider'

export function useDashboardData() {
  const supabase = useSupabase()
  const [absences, setAbsences]     = useState<Absence[]>([])
  const [schools, setSchools]       = useState<School[]>([])
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [loading, setLoading]       = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')

  const now = () => new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })

  const fetchAbsences = async () => {
    const { data } = await supabase
      .from('absences')
      .select(`*, school:schools(name)`)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) {
      setAbsences(data as Absence[])
      setLastUpdate(now())
    }
  }

  const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('*').eq('is_active', true)
    if (data) setSchools(data as School[])
  }

  const fetchAssistants = async () => {
    const { data } = await supabase
      .from('assistants')
      .select(`*, profile:profiles(full_name, phone, whatsapp_phone)`)
      .eq('is_available', true)
    if (data) setAssistants(data as Assistant[])
  }

  const fetchAll = async () => {
    setLoading(true)
    await Promise.all([fetchAbsences(), fetchSchools(), fetchAssistants()])
    setLoading(false)
    setLastUpdate(now())
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll() }, [])

  return { absences, schools, assistants, loading, lastUpdate, fetchAll, fetchAbsences, fetchAssistants }
}

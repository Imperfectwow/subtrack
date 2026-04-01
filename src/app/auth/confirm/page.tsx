'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/providers/SupabaseProvider'

export default function AuthConfirm() {
  const router = useRouter()
  const supabase = useSupabase()

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get('next') ?? '/dashboard'

    // implicit flow: token is in the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push(next)
      }
    })

    // fallback: check if already signed in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push(next)
    })

    return () => subscription.unsubscribe()
  // router and supabase are stable references — omitting them prevents
  // re-subscribing on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#030b15',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#94a3b8',
      fontFamily: 'sans-serif',
      fontSize: 14,
    }}>
      מתחבר...
    </div>
  )
}

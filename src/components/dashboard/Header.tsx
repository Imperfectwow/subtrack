'use client'

import { useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

function PulsingDot({ color = '#10b981' }: { color?: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color, opacity: 0.4, animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
      <span style={{ borderRadius: '50%', width: 10, height: 10, background: color, display: 'block' }} />
    </span>
  )
}

interface HeaderProps {
  lastUpdate: string
  onRefresh: () => void
  notificationSlot: ReactNode
  subtitle?: string
}

export default function Header({ lastUpdate, onRefresh, notificationSlot, subtitle }: HeaderProps) {
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ borderBottom: '1px solid #0f2240', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#f1f5f9' }}>SubTrack</div>
          <div style={{ fontSize: 10, color: '#475569', marginTop: -2 }}>{subtitle ?? 'מרכז פיקוד רכז'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 8, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <PulsingDot color="#10b981" />
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#4ade80', fontWeight: 500 }}>{lastUpdate}</span>
          <span style={{ fontSize: 10, color: '#475569' }}>עדכון אחרון</span>
        </div>
        {notificationSlot}
        <button className="btn" onClick={onRefresh} style={{ background: '#0a1628', border: '1px solid #1e3a5f', color: '#94a3b8', padding: '7px 12px', fontSize: 12 }}>
          ↻ רענן
        </button>
        <button className="btn" onClick={logout} style={{ background: '#0a1628', border: '1px solid #1e3a5f', color: '#64748b', padding: '7px 12px', fontSize: 12 }}>
          יציאה
        </button>
      </div>
    </div>
  )
}

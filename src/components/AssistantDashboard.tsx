'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { FONT, CSS_GLOBALS, statusColors } from '@/lib/constants/dashboardConstants'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import Header from '@/components/dashboard/Header'
import type { Assignment } from '@/lib/types'

export default function AssistantDashboard() {
  const supabase = useSupabase()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [fullName, setFullName]       = useState('')
  const [rating, setRating]           = useState(5)
  const [isAvailable, setIsAvailable] = useState(true)
  const [loading, setLoading]         = useState(true)
  const [lastUpdate, setLastUpdate]   = useState('')

  const now = () => new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })

  const fetchAll = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [profileRes, assignRes] = await Promise.all([
      supabase.from('assistants')
        .select('rating, is_available, profile:profiles(full_name)')
        .eq('id', user.id)
        .single(),
      supabase.from('assignments')
        .select('*, absence:absences(teacher_name, subject, grade, absence_date, start_time, end_time, school:schools(name))')
        .eq('assistant_id', user.id)
        .order('offered_at', { ascending: false })
        .limit(30),
    ])

    if (profileRes.data) {
      const p = profileRes.data as unknown as { rating: number; is_available: boolean; profile: { full_name: string } | { full_name: string }[] | null }
      const prof = Array.isArray(p.profile) ? p.profile[0] : p.profile
      setFullName(prof?.full_name ?? '')
      setRating(p.rating ?? 5)
      setIsAvailable(p.is_available ?? true)
    }
    if (assignRes.data) setAssignments(assignRes.data as Assignment[])
    setLoading(false)
    setLastUpdate(now())
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll() }, [])

  const respond = async (assignmentId: string, status: 'accepted' | 'declined') => {
    const res = await fetch(`/api/assignments/${assignmentId}/respond`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      toast.error(body.error ?? 'שגיאה בעדכון השיבוץ')
      return
    }
    setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, status } : a))
  }

  const toggleAvailability = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const next = !isAvailable
    const res = await fetch(`/api/assistants/${user.id}/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: next }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      toast.error(body.error ?? 'שגיאה בעדכון הזמינות')
      return
    }
    setIsAvailable(next)
  }

  const offered  = assignments.filter(a => a.status === 'offered')
  const upcoming = assignments.filter(a => a.status === 'accepted' || a.status === 'confirmed')
  const history  = assignments.filter(a => ['declined', 'expired', 'cancelled'].includes(a.status))

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#030b15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Heebo, sans-serif', color: '#475569' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #1e3a5f', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        טוען...
      </div>
    </div>
  )

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#030b15', fontFamily: "'Heebo', sans-serif", color: '#e2e8f0' }}>
      <style>{FONT + CSS_GLOBALS}</style>
      <Header
        subtitle={fullName || 'לוח שליחות'}
        lastUpdate={lastUpdate}
        onRefresh={fetchAll}
        notificationSlot={
          <button
            className="btn"
            onClick={toggleAvailability}
            style={{
              background: isAvailable ? 'linear-gradient(135deg, #052e16, #166534)' : '#1f1f1f',
              border: `1px solid ${isAvailable ? '#166534' : '#374151'}`,
              color: isAvailable ? '#4ade80' : '#6b7280',
              padding: '7px 14px', fontSize: 12,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: isAvailable ? '#10b981' : '#475569', boxShadow: isAvailable ? '0 0 6px #10b981' : 'none' }} />
            {isAvailable ? 'זמין/ה' : 'לא זמין/ה'}
          </button>
        }
      />

      {/* Mini stats */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid #0a1f35', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div className="card" style={{ padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>הצעות ממתינות</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#fbbf24', marginTop: 2 }}>{offered.length}</div>
        </div>
        <div className="card" style={{ padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>שיבוצים קרובים</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#10b981', marginTop: 2 }}>{upcoming.length}</div>
        </div>
        <div className="card" style={{ padding: '10px 14px' }}>
          <div style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>דירוג ממוצע</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#818cf8', marginTop: 2 }}>{Number(rating).toFixed(1)}</div>
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Offers */}
        {offered.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              הצעות חדשות ({offered.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {offered.map((a, i) => {
                const abs = a.absence as { teacher_name: string; subject: string; grade: string; absence_date: string; start_time: string; end_time?: string; school?: { name: string } } | undefined
                const timeLeft = Math.max(0, Math.round((new Date(a.expires_at).getTime() - Date.now()) / 60000))
                return (
                  <div key={a.id} style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 10, padding: 14, animation: `fadeSlideIn 0.2s ${i * 0.05}s both` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{abs?.school?.name ?? '—'}</div>
                        <div style={{ fontSize: 12, color: '#7dd3fc', marginTop: 2 }}>{abs?.subject} — כיתה {abs?.grade}</div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 2, fontFamily: 'JetBrains Mono' }}>
                          {abs?.absence_date} • {abs?.start_time}{abs?.end_time ? ` - ${abs.end_time}` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        {a.distance_km && <div style={{ fontSize: 11, color: '#64748b' }}>{Number(a.distance_km).toFixed(1)} ק״מ</div>}
                        <div style={{ fontSize: 10, color: timeLeft < 5 ? '#ef4444' : '#475569', marginTop: 2 }}>{timeLeft} דק׳ נותרו</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn" onClick={() => respond(a.id, 'accepted')} style={{ flex: 1, padding: '8px 0', fontSize: 13, background: 'linear-gradient(135deg, #052e16, #166534)', color: '#4ade80', border: '1px solid #166534' }}>
                        ✓ אקבל
                      </button>
                      <button className="btn" onClick={() => respond(a.id, 'declined')} style={{ flex: 1, padding: '8px 0', fontSize: 13, background: '#1f1f1f', color: '#6b7280', border: '1px solid #374151' }}>
                        ✕ דחה
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              שיבוצים קרובים ({upcoming.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcoming.map((a) => {
                const abs = a.absence as { absence_date?: string; start_time?: string; school?: { name: string } } | undefined
                const sc = statusColors[a.status] ?? statusColors.confirmed
                return (
                  <div key={a.id} className="row-hover" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #0a1f35', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>{abs?.school?.name ?? '—'}</div>
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 2, fontFamily: 'JetBrains Mono' }}>{abs?.absence_date} • {abs?.start_time}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{sc.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              היסטוריה ({history.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.slice(0, 10).map((a) => {
                const abs = a.absence as { absence_date?: string; school?: { name: string } } | undefined
                const sc = statusColors[a.status] ?? statusColors.cancelled
                return (
                  <div key={a.id} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #0a1628', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.6 }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{abs?.school?.name ?? '—'} • {abs?.absence_date}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{sc.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {offered.length === 0 && upcoming.length === 0 && history.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#334155', fontSize: 14 }}>
            אין שיבוצים כרגע ✅
          </div>
        )}
      </div>
    </div>
  )
}

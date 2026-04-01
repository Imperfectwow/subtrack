'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { statusColors } from '@/lib/constants/dashboardConstants'
import type { Absence, Assignment } from '@/lib/types'

interface AbsenceDetailProps {
  absence: Absence | null
  onClose: () => void
}

const assignStatusColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
  offered:   { bg: '#1c1400', text: '#fbbf24', border: '#854d0e', label: 'ממתין לתגובה' },
  accepted:  { bg: '#052e16', text: '#4ade80', border: '#166534', label: 'קיבל' },
  confirmed: { bg: '#0c1f3d', text: '#7dd3fc', border: '#1d4ed8', label: 'מאושר' },
  declined:  { bg: '#1a0606', text: '#f87171', border: '#991b1b', label: 'דחה' },
  expired:   { bg: '#111', text: '#475569', border: '#334155', label: 'פג תוקף' },
  cancelled: { bg: '#111', text: '#475569', border: '#334155', label: 'בוטל' },
}

function InfoCell({ label, value, color = '#e2e8f0' }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 13, color, fontWeight: 600 }}>{value}</div>
    </div>
  )
}

export default function AbsenceDetail({ absence, onClose }: AbsenceDetailProps) {
  const [supabase] = useState(() => createClient())
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!absence) { setAssignments([]); return }
    setLoading(true)
    supabase
      .from('assignments')
      .select('*, assistant:assistants(rating, is_available, profile:profiles(full_name, phone))')
      .eq('absence_id', absence.id)
      .order('offer_rank')
      .then(({ data }) => {
        setAssignments((data ?? []) as Assignment[])
        setLoading(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [absence?.id])

  if (!absence) return null

  const sc = statusColors[absence.status] ?? statusColors.open

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }} onClick={onClose} />
      <div
        dir="rtl"
        style={{
          position: 'fixed', left: 0, top: 0, bottom: 0, width: 440, maxWidth: '100vw',
          background: '#07111e', borderLeft: '1px solid #1e3a5f',
          zIndex: 95, overflowY: 'auto', fontFamily: 'Heebo, sans-serif',
          animation: 'slideInLeft 0.2s ease-out',
        }}
      >
        <style>{`@keyframes slideInLeft { from { transform: translateX(-20px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>

        {/* Sticky header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #0a1f35',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: '#07111e', zIndex: 1,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>{absence.teacher_name}</div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{absence.school?.name ?? '—'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
              {sc.label}
            </span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {/* Absence details */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #0a1f35', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <InfoCell label="מקצוע"   value={absence.subject}     color="#7dd3fc" />
          <InfoCell label="כיתה"    value={absence.grade} />
          <InfoCell label="תאריך"   value={absence.absence_date} />
          <InfoCell label="שעות"    value={`${absence.start_time}${absence.end_time ? ` – ${absence.end_time}` : ''}`} />
          {absence.notes && (
            <div style={{ gridColumn: '1 / -1' }}>
              <InfoCell label="הערות" value={absence.notes} color="#94a3b8" />
            </div>
          )}
        </div>

        {/* Assignments */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            שיבוצים ({assignments.length})
          </div>

          {loading ? (
            <div style={{ color: '#334155', fontSize: 13, textAlign: 'center', padding: 32 }}>טוען...</div>
          ) : assignments.length === 0 ? (
            <div style={{ color: '#334155', fontSize: 13, textAlign: 'center', padding: 32 }}>לא נשלחו הצעות עדיין</div>
          ) : assignments.map((asn, i) => {
            const asc = assignStatusColors[asn.status] ?? assignStatusColors.offered
            const asst = asn.assistant as { rating?: number; profile?: { full_name?: string; phone?: string } | { full_name?: string; phone?: string }[] } | undefined
            const profile = Array.isArray(asst?.profile) ? asst?.profile[0] : asst?.profile

            return (
              <div key={asn.id} style={{
                padding: '12px 14px', borderRadius: 10, border: '1px solid #0a1f35',
                marginBottom: 8, animation: `fadeSlideIn 0.2s ${i * 0.05}s both`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1' }}>{profile?.full_name ?? '—'}</div>
                    {profile?.phone && (
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 2, fontFamily: 'JetBrains Mono' }}>{profile.phone}</div>
                    )}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: asc.bg, color: asc.text, border: `1px solid ${asc.border}`, whiteSpace: 'nowrap' }}>
                    {asc.label}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {asst?.rating != null   && <Stat label="דירוג"  value={`★ ${Number(asst.rating).toFixed(1)}`}      color="#fbbf24" />}
                  {asn.match_score != null && <Stat label="ניקוד"  value={Number(asn.match_score).toFixed(0)}          color="#818cf8" />}
                  {asn.distance_km != null && <Stat label="מרחק"   value={`${Number(asn.distance_km).toFixed(1)} ק״מ`} color="#64748b" />}
                  <Stat label="הצעה" value={`#${asn.offer_rank}`} color="#475569" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 9, color: '#334155', fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 11, color, fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

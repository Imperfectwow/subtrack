'use client'

import { useState, useEffect } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'
import { FONT, CSS_GLOBALS } from '@/lib/constants/dashboardConstants'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import Header from '@/components/dashboard/Header'
import type { Municipality } from '@/lib/types'

interface MunicipalityRow extends Municipality {
  schoolCount: number
  assistantCount: number
}

interface SchoolDetail {
  id: string
  name: string
  address: string | null
  principal_name: string | null
  is_active: boolean
}

interface AssistantDetail {
  id: string
  is_available: boolean
  rating: number
  profile: { full_name: string } | null
}

interface PendingInvite {
  id: string
  token: string
  email: string
  role: string
  expires_at: string
  created_at: string
}

const inviteSchema = z.object({
  email:           z.string().email('כתובת אימייל לא תקינה'),
  role:            z.enum(['assistant', 'coordinator', 'admin'], { message: 'תפקיד לא תקין' }),
  municipality_id: z.string().uuid('מזהה רשות לא תקין — נסה לרענן את הדף'),
})

const roleLabel: Record<string, string> = {
  assistant:   'מסייעת',
  coordinator: 'רכז/ת',
  admin:       'מנהל',
}

export default function SuperAdminDashboard() {
  const supabase = useSupabase()
  const [municipalities, setMunicipalities] = useState<MunicipalityRow[]>([])
  const [totals, setTotals] = useState({ schools: 0, assistants: 0, absences: 0 })
  const [loading, setLoading]       = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail]         = useState<{ schools: SchoolDetail[]; assistants: AssistantDetail[] } | null>(null)
  const [detailLoading, setDetailLoading]   = useState(false)
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)

  // Invite modal state
  const [inviteModal, setInviteModal]   = useState<{ id: string; name: string } | null>(null)
  const [inviteEmail, setInviteEmail]   = useState('')
  const [inviteRole, setInviteRole]     = useState<'assistant' | 'coordinator' | 'admin'>('coordinator')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteResult, setInviteResult]   = useState<{ invite_url: string } | null>(null)
  const [inviteErrors, setInviteErrors]   = useState<string[]>([])

  const now = () => new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })

  const fetchAll = async () => {
    setLoading(true)
    const [munRes, schoolRes, assistRes, absRes] = await Promise.all([
      supabase.from('municipalities').select('*').eq('is_active', true),
      supabase.from('schools').select('municipality_id'),
      supabase.from('assistants').select('municipality_id'),
      supabase.from('absences').select('*', { count: 'exact', head: true }),
    ])

    const munData    = (munRes.data   ?? []) as Municipality[]
    const schoolData = schoolRes.data ?? []
    const assistData = assistRes.data ?? []

    const rows: MunicipalityRow[] = munData.map(m => ({
      ...m,
      schoolCount:    schoolData.filter((s: { municipality_id: string }) => s.municipality_id === m.id).length,
      assistantCount: assistData.filter((a: { municipality_id: string }) => a.municipality_id === m.id).length,
    }))

    setMunicipalities(rows)
    setTotals({
      schools:    schoolData.length,
      assistants: assistData.length,
      absences:   absRes.count ?? 0,
    })
    setLoading(false)
    setLastUpdate(now())
  }

  const fetchDetail = async (municipalityId: string) => {
    setDetailLoading(true)
    const [schoolRes, assistRes] = await Promise.all([
      supabase.from('schools').select('id, name, address, principal_name, is_active').eq('municipality_id', municipalityId).order('name'),
      supabase.from('assistants').select('id, is_available, rating, profile:profiles(full_name)').eq('municipality_id', municipalityId).order('rating', { ascending: false }),
    ])
    setDetail({
      schools:    (schoolRes.data ?? []) as SchoolDetail[],
      assistants: (assistRes.data ?? []) as unknown as AssistantDetail[],
    })
    setDetailLoading(false)
  }

  const fetchPendingInvites = async (municipalityId: string) => {
    setPendingLoading(true)
    const res = await fetch(`/api/invitations?municipality_id=${municipalityId}`)
    if (res.ok) {
      const body = await res.json()
      setPendingInvites(body.invitations ?? [])
    }
    setPendingLoading(false)
  }

  const handleRowClick = (id: string) => {
    if (selectedId === id) {
      setSelectedId(null)
      setDetail(null)
      setPendingInvites([])
    } else {
      setSelectedId(id)
      fetchDetail(id)
      fetchPendingInvites(id)
    }
  }

  const openInviteModal = (e: React.MouseEvent, muni: MunicipalityRow) => {
    e.stopPropagation()
    // Defensive: log the id so UUID issues are visible immediately in DevTools
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[InviteModal] opening for municipality:', { id: muni.id, name: muni.name })
    }
    setInviteModal({ id: muni.id, name: muni.name })
    setInviteEmail('')
    setInviteRole('coordinator')
    setInviteResult(null)
    setInviteErrors([])
  }

  const closeInviteModal = () => {
    setInviteModal(null)
    setInviteResult(null)
  }

  const submitInvite = async () => {
    if (!inviteModal) return

    const payload = {
      email:           inviteEmail.trim(),
      role:            inviteRole,
      municipality_id: inviteModal.id,
    }

    const validation = inviteSchema.safeParse(payload)
    if (!validation.success) {
      // Log each failing field with its path so the bad value is visible in DevTools
      console.error('[POST /api/invitations] client-side validation failed:')
      for (const issue of validation.error.issues) {
        console.error(`  field "${issue.path.join('.')}" = ${JSON.stringify(payload[issue.path[0] as keyof typeof payload])} → ${issue.message}`)
      }
      setInviteErrors(validation.error.issues.map(e => e.message))
      return
    }
    setInviteErrors([])
    setInviteLoading(true)

    const requestBody = {
      email:           inviteEmail.trim().toLowerCase(),
      role:            inviteRole,
      municipality_id: inviteModal.id,
    }
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[POST /api/invitations] sending:', requestBody)
    }

    const res = await fetch('/api/invitations', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    const body = await res.json().catch(() => ({}))
    setInviteLoading(false)

    if (!res.ok) {
      if (res.status === 422 && body.details) {
        const details = body.details as Record<string, string[]>
        // Log each server-side Zod path+message so the exact rejection is visible
        console.error('[POST /api/invitations] server 422 — field errors:')
        for (const [path, messages] of Object.entries(details)) {
          console.error(`  field "${path}": ${messages.join(', ')}`)
        }
        const fieldErrors = Object.values(details).flat()
        setInviteErrors(fieldErrors.length > 0 ? fieldErrors : [body.error ?? 'נתונים לא תקינים'])
      } else {
        toast.error(body.error ?? 'שגיאה ביצירת ההזמנה')
      }
      return
    }

    setInviteResult(body)
    toast.success('קישור הזמנה נוצר בהצלחה')
    if (selectedId === inviteModal.id) {
      fetchPendingInvites(inviteModal.id)
    }
  }

  const copyLink = async () => {
    if (!inviteResult) return
    await navigator.clipboard.writeText(inviteResult.invite_url)
    toast.success('הקישור הועתק ללוח!')
  }

  const revokeInvite = async (inv: PendingInvite) => {
    if (!window.confirm(`לבטל את ההזמנה לכתובת ${inv.email}?`)) return
    setPendingInvites(prev => prev.filter(i => i.id !== inv.id))
    const res = await fetch(`/api/invitations/${inv.token}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 204) {
      const body = await res.json().catch(() => ({}))
      toast.error(body.error ?? 'שגיאה בביטול ההזמנה')
      setPendingInvites(prev => [...prev, inv])
    } else {
      toast.success('ההזמנה בוטלה')
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll() }, [])

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
      <Header subtitle="מערכת מרכזית — סופר אדמין" lastUpdate={lastUpdate} onRefresh={fetchAll} notificationSlot={null} />

      {/* Stats */}
      <div style={{ padding: '12px 24px', borderBottom: '1px solid #0a1f35', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'רשויות מקומיות', value: municipalities.length, color: '#818cf8' },
          { label: 'בתי ספר',        value: totals.schools,        color: '#3b82f6' },
          { label: 'מסייעות',         value: totals.assistants,     color: '#10b981' },
          { label: 'סה״כ היעדרויות', value: totals.absences,       color: '#fb923c' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '10px 14px' }}>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color, marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Municipalities table */}
      <div style={{ padding: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
            רשויות מקומיות — {municipalities.length} סה״כ
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.6fr 0.7fr', gap: 8, padding: '6px 10px', borderBottom: '1px solid #0a1f35', marginBottom: 4 }}>
            {['רשות', 'כתובת URL', 'בתי ספר', 'מסייעות', 'סטטוס', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 700, color: '#334155' }}>{h}</span>
            ))}
          </div>

          {municipalities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#334155', fontSize: 14 }}>אין רשויות</div>
          ) : municipalities.map((m, i) => (
            <div key={m.id}>
              <div
                className="row-hover"
                onClick={() => handleRowClick(m.id)}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.6fr 0.7fr', gap: 8,
                  padding: '10px', borderRadius: selectedId === m.id ? '8px 8px 0 0' : 8,
                  cursor: 'pointer',
                  background: selectedId === m.id ? '#0a1f35' : undefined,
                  animation: `fadeSlideIn 0.2s ${i * 0.05}s both`,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: '#475569', transition: 'transform 0.15s', display: 'inline-block', transform: selectedId === m.id ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                  {m.name}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono', display: 'flex', alignItems: 'center' }}>{m.slug}</div>
                <div style={{ fontSize: 13, color: '#7dd3fc', display: 'flex', alignItems: 'center' }}>{m.schoolCount}</div>
                <div style={{ fontSize: 13, color: '#4ade80', display: 'flex', alignItems: 'center' }}>{m.assistantCount}</div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#052e16', color: '#4ade80', border: '1px solid #166534' }}>
                    פעיל
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    onClick={e => openInviteModal(e, m)}
                    style={{
                      fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                      background: '#0a1f35', border: '1px solid #1e3a5f', color: '#7dd3fc',
                      cursor: 'pointer', fontFamily: 'Heebo, sans-serif',
                    }}
                  >
                    + הזמן
                  </button>
                </div>
              </div>

              {/* Expanded detail panel */}
              {selectedId === m.id && (
                <div style={{ background: '#050f1e', border: '1px solid #0a1f35', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: 16, marginBottom: 4 }}>
                  {detailLoading ? (
                    <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: 16 }}>טוען...</div>
                  ) : detail && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* Schools */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                            בתי ספר ({detail.schools.length})
                          </div>
                          {detail.schools.length === 0 ? (
                            <div style={{ fontSize: 12, color: '#334155' }}>אין בתי ספר</div>
                          ) : detail.schools.map(s => (
                            <div key={s.id} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #0a1f35', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>{s.name}</div>
                                {s.address && <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{s.address}</div>}
                                {s.principal_name && <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>מנהל: {s.principal_name}</div>}
                              </div>
                              <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.is_active ? '#10b981' : '#475569', flexShrink: 0 }} />
                            </div>
                          ))}
                        </div>

                        {/* Assistants */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                            מסייעות ({detail.assistants.length})
                          </div>
                          {detail.assistants.length === 0 ? (
                            <div style={{ fontSize: 12, color: '#334155' }}>אין מסייעות</div>
                          ) : detail.assistants.map(a => (
                            <div key={a.id} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #0a1f35', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>
                                  {Array.isArray(a.profile) ? (a.profile[0] as { full_name: string })?.full_name : a.profile?.full_name ?? '—'}
                                </div>
                                <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>דירוג: {Number(a.rating).toFixed(1)}</div>
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: a.is_available ? '#052e16' : '#1f1f1f', color: a.is_available ? '#4ade80' : '#6b7280', border: `1px solid ${a.is_available ? '#166534' : '#374151'}` }}>
                                {a.is_available ? 'זמין' : 'לא זמין'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pending invitations */}
                      <div style={{ marginTop: 16, borderTop: '1px solid #0a1f35', paddingTop: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>הזמנות ממתינות</span>
                          <button
                            onClick={e => { e.stopPropagation(); openInviteModal(e, m) }}
                            style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: '#0a1f35', border: '1px solid #1e3a5f', color: '#7dd3fc', cursor: 'pointer', fontFamily: 'Heebo, sans-serif' }}
                          >
                            + הזמנה חדשה
                          </button>
                        </div>
                        {pendingLoading ? (
                          <div style={{ fontSize: 12, color: '#475569', textAlign: 'center', padding: 8 }}>טוען...</div>
                        ) : pendingInvites.length === 0 ? (
                          <div style={{ fontSize: 12, color: '#334155', textAlign: 'center', padding: '16px 0', border: '1px dashed #0a1f35', borderRadius: 6 }}>
                            אין הזמנות ממתינות
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                            {pendingInvites.map(inv => (
                              <div key={inv.id} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #1e3a5f', background: '#0a1628', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.email}</div>
                                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'flex', gap: 8 }}>
                                    <span style={{ background: '#0a1f35', borderRadius: 4, padding: '1px 6px', color: '#818cf8' }}>{roleLabel[inv.role] ?? inv.role}</span>
                                    <span>פג תוקף: {new Date(inv.expires_at).toLocaleDateString('he-IL')}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={e => { e.stopPropagation(); revokeInvite(inv) }}
                                  style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: '#2d0a0a', border: '1px solid #7f1d1d', color: '#fca5a5', cursor: 'pointer', fontFamily: 'Heebo, sans-serif' }}
                                >
                                  ביטול
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {inviteModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(3,11,21,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}
          onClick={closeInviteModal}
        >
          <div
            dir="rtl"
            style={{ width: '100%', maxWidth: 440, background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 16, padding: 28 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9' }}>הזמנת משתמש</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{inviteModal.name}</div>
              </div>
              <button
                onClick={closeInviteModal}
                style={{ background: 'none', border: 'none', color: '#475569', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 4 }}
              >
                ✕
              </button>
            </div>

            {inviteResult ? (
              /* Success state */
              <div>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#052e16', border: '1px solid #166534', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22 }}>✓</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#4ade80' }}>קישור הזמנה נוצר!</div>
                </div>
                <div style={{ background: '#030b15', border: '1px solid #1e3a5f', borderRadius: 8, padding: '10px 14px', marginBottom: 12, wordBreak: 'break-all', fontSize: 12, color: '#94a3b8', fontFamily: 'JetBrains Mono' }}>
                  {inviteResult.invite_url}
                </div>
                <button
                  onClick={copyLink}
                  style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Heebo, sans-serif', marginBottom: 10 }}
                >
                  העתק קישור
                </button>
                <button
                  onClick={() => { setInviteResult(null); setInviteEmail(''); }}
                  style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid #1e3a5f', background: 'none', color: '#94a3b8', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Heebo, sans-serif' }}
                >
                  שלח הזמנה נוספת
                </button>
              </div>
            ) : (
              /* Form state */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>כתובת אימייל *</span>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    style={{ background: '#030b15', border: '1px solid #1e3a5f', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#e2e8f0', fontFamily: 'Heebo, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                    onKeyDown={e => e.key === 'Enter' && submitInvite()}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>תפקיד *</span>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as 'assistant' | 'coordinator' | 'admin')}
                    style={{ background: '#030b15', border: '1px solid #1e3a5f', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#e2e8f0', fontFamily: 'Heebo, sans-serif', outline: 'none', width: '100%', cursor: 'pointer' }}
                  >
                    <option value="assistant">מסייעת</option>
                    <option value="coordinator">רכז/ת</option>
                    <option value="admin">מנהל רשות</option>
                  </select>
                </label>

                {/* Identity lock notice */}
                <div style={{ background: '#0a1f35', border: '1px solid #1e3a5f', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>🔒</span>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                    המשתמש <strong style={{ color: '#94a3b8' }}>חייב להתחבר עם כתובת אימייל זו בדיוק</strong> כדי להשלים את ההרשמה.
                  </div>
                </div>

                {/* Validation errors */}
                {inviteErrors.length > 0 && (
                  <div style={{ background: '#2d0a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '8px 12px' }}>
                    {inviteErrors.map((err, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#fca5a5' }}>{err}</div>
                    ))}
                  </div>
                )}

                <button
                  onClick={submitInvite}
                  disabled={inviteLoading || !inviteEmail.trim()}
                  style={{
                    width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', marginTop: 4,
                    background: inviteLoading || !inviteEmail.trim() ? '#1e3a5f' : 'linear-gradient(135deg, #1d4ed8, #0ea5e9)',
                    color: '#fff', fontSize: 14, fontWeight: 800, cursor: inviteLoading ? 'wait' : inviteEmail.trim() ? 'pointer' : 'default',
                    fontFamily: 'Heebo, sans-serif',
                  }}
                >
                  {inviteLoading ? 'יוצר קישור...' : 'צור קישור הזמנה'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

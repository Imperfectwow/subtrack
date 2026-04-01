'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { FONT, CSS_GLOBALS, statusColors } from '@/lib/constants/dashboardConstants'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import Header from '@/components/dashboard/Header'
import AbsencesTable from '@/components/dashboard/AbsencesTable'
import NavSidebar from '@/components/dashboard/NavSidebar'
import AbsenceDetail from '@/components/dashboard/AbsenceDetail'
import type { Absence, School, UserRole } from '@/lib/types'

interface AssistantRow {
  id: string
  is_available: boolean
  rating: number
  total_assignments: number
  subjects: string[]
  profile: { full_name: string; phone?: string } | null
}

const NAV = [
  { key: 'dashboard',   label: 'בקרה',    icon: '📊' },
  { key: 'assistants',  label: 'מסייעות', icon: '👥' },
  { key: 'schools',     label: 'בתי ספר', icon: '🏫' },
  { key: 'invitations', label: 'הזמנות',  icon: '✉️' },
]

interface PendingInvite {
  id: string
  email: string
  role: UserRole
  expires_at: string
  created_at: string
}

export default function AdminDashboard() {
  const supabase = useSupabase()
  const [absences, setAbsences]       = useState<Absence[]>([])
  const [schools, setSchools]         = useState<School[]>([])
  const [assistants, setAssistants]   = useState<AssistantRow[]>([])
  const [loading, setLoading]         = useState(true)
  const [lastUpdate, setLastUpdate]   = useState('')
  const [view, setView]               = useState('dashboard')
  const [sidebarTab, setSidebarTab]   = useState<'schools' | 'assistants'>('schools')
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null)
  const [pendingInvites, setPendingInvites]   = useState<PendingInvite[]>([])
  const [inviteEmail, setInviteEmail]         = useState('')
  const [inviteRole, setInviteRole]           = useState<'assistant' | 'coordinator'>('assistant')
  const [inviteLink, setInviteLink]           = useState('')
  const [inviteLoading, setInviteLoading]     = useState(false)

  const now = () => new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })

  const fetchAll = async () => {
    setLoading(true)
    const [absRes, schoolsRes, assistRes] = await Promise.all([
      supabase.from('absences').select('*, school:schools(name)').order('created_at', { ascending: false }).limit(50),
      supabase.from('schools').select('*').eq('is_active', true),
      supabase.from('assistants').select('id, is_available, rating, total_assignments, subjects, profile:profiles(full_name, phone)').order('rating', { ascending: false }),
    ])
    if (absRes.data)    setAbsences(absRes.data as Absence[])
    if (schoolsRes.data) setSchools(schoolsRes.data as School[])
    if (assistRes.data)  setAssistants(assistRes.data as unknown as AssistantRow[])
    setLoading(false)
    setLastUpdate(now())
  }

  const fetchInvitations = async () => {
    const res = await fetch('/api/invitations')
    if (res.ok) {
      const body = await res.json()
      setPendingInvites(body.invitations ?? [])
    }
  }

  const createInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviteLoading(true)
    setInviteLink('')
    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim().toLowerCase(), role: inviteRole }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(body.error ?? 'שגיאה ביצירת ההזמנה')
    } else {
      setInviteLink(body.invite_url)
      setInviteEmail('')
      fetchInvitations()
    }
    setInviteLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll(); fetchInvitations() }, [])

  const toggleAvailability = async (id: string, current: boolean) => {
    const res = await fetch(`/api/assistants/${id}/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: !current }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      toast.error(body.error ?? 'שגיאה בעדכון הזמינות')
      return
    }
    setAssistants(prev => prev.map(a => a.id === id ? { ...a, is_available: !current } : a))
  }

  const stats = useMemo(() => ({
    open:      absences.filter(a => a.status === 'open' || a.status === 'matching').length,
    pending:   absences.filter(a => a.status === 'pending').length,
    confirmed: absences.filter(a => a.status === 'confirmed').length,
  }), [absences])

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
    <div dir="rtl" style={{ minHeight: '100vh', background: '#030b15', fontFamily: "'Heebo', sans-serif", color: '#e2e8f0', display: 'flex' }}>
      <style>{FONT + CSS_GLOBALS}</style>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Header subtitle="לוח בקרה מנהל" lastUpdate={lastUpdate} onRefresh={fetchAll} notificationSlot={null} />

        {/* Stats bar */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #0a1f35', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[
            { label: 'בתי ספר פעילים',    value: schools.length,    color: '#3b82f6' },
            { label: 'מסייעות',             value: assistants.length, color: '#818cf8' },
            { label: 'היעדרויות פתוחות',  value: stats.open,        color: '#fb923c' },
            { label: 'ממתינות לאישור',    value: stats.pending,     color: '#fbbf24' },
            { label: 'מאושרות',            value: stats.confirmed,   color: '#10b981' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color, marginTop: 2 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Dashboard view */}
        {view === 'dashboard' && (
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>
            <AbsencesTable absences={absences} onRowClick={setSelectedAbsence} />

            {/* Right sidebar with tabs */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #0a1f35' }}>
                {([['schools', '🏫 בתי ספר'], ['assistants', '👥 מסייעות']] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setSidebarTab(key)} style={{
                    padding: '10px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    background: sidebarTab === key ? '#0a1f35' : 'transparent',
                    border: 'none', borderBottom: `2px solid ${sidebarTab === key ? '#3b82f6' : 'transparent'}`,
                    color: sidebarTab === key ? '#7dd3fc' : '#475569',
                    transition: 'all 0.15s', fontFamily: 'Heebo, sans-serif',
                  }}>{label}</button>
                ))}
              </div>

              <div style={{ padding: 12, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sidebarTab === 'schools' && (
                  schools.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 32, color: '#334155', fontSize: 13 }}>אין בתי ספר</div>
                  ) : schools.map((school, i) => (
                    <div key={school.id} className="row-hover" style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid #0a1f35', display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: `fadeSlideIn 0.2s ${i * 0.04}s both`, cursor: 'default' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>{school.name}</div>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                    </div>
                  ))
                )}

                {sidebarTab === 'assistants' && (
                  assistants.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 32, color: '#334155', fontSize: 13 }}>אין מסייעות</div>
                  ) : assistants.slice(0, 15).map((a, i) => {
                    const prof = Array.isArray(a.profile) ? (a.profile as unknown as { full_name: string }[])[0] : a.profile
                    return (
                      <div key={a.id} style={{ padding: '9px 11px', borderRadius: 8, border: '1px solid #0a1f35', animation: `fadeSlideIn 0.2s ${i * 0.04}s both` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>{prof?.full_name ?? '—'}</div>
                          <button onClick={() => toggleAvailability(a.id, a.is_available)} style={{
                            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 12, cursor: 'pointer',
                            background: a.is_available ? '#052e16' : '#1f1f1f',
                            border: `1px solid ${a.is_available ? '#166534' : '#374151'}`,
                            color: a.is_available ? '#4ade80' : '#6b7280',
                          }}>
                            {a.is_available ? 'זמין' : 'לא זמין'}
                          </button>
                        </div>
                        <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>
                          <span style={{ color: '#fbbf24' }}>★</span> {Number(a.rating).toFixed(1)} · {a.total_assignments} שיבוצים
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Assistants full view */}
        {view === 'assistants' && (
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
              כל המסייעות ({assistants.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12 }}>
              {assistants.map((a, i) => {
                const prof = Array.isArray(a.profile) ? (a.profile as unknown as { full_name: string; phone?: string }[])[0] : a.profile
                return (
                  <div key={a.id} className="card" style={{ padding: 14, animation: `fadeSlideIn 0.2s ${i * 0.03}s both` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#0a1f35', border: `2px solid ${a.is_available ? '#166534' : '#374151'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: a.is_available ? '#4ade80' : '#6b7280', flexShrink: 0 }}>
                        {prof?.full_name?.slice(0, 2) ?? 'מס'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{prof?.full_name ?? 'מסייעת'}</div>
                        {prof?.phone && <div style={{ fontSize: 11, color: '#475569', marginTop: 1, fontFamily: 'JetBrains Mono' }}>{prof.phone}</div>}
                      </div>
                      <button onClick={() => toggleAvailability(a.id, a.is_available)} style={{
                        fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 14, cursor: 'pointer',
                        background: a.is_available ? '#052e16' : '#1f1f1f',
                        border: `1px solid ${a.is_available ? '#166534' : '#374151'}`,
                        color: a.is_available ? '#4ade80' : '#6b7280',
                      }}>
                        {a.is_available ? 'זמין' : 'לא זמין'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}><span style={{ color: '#fbbf24' }}>★</span> {Number(a.rating).toFixed(1)}</span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{a.total_assignments} שיבוצים</span>
                    </div>
                    {a.subjects.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {a.subjects.map(s => <span key={s} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: '#0a1f35', color: '#7dd3fc' }}>{s}</span>)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Invitations view */}
        {view === 'invitations' && (
          <div style={{ padding: 16, maxWidth: 680 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>
              הזמנת משתמשים חדשים
            </div>

            {/* Create invite form */}
            <div className="card" style={{ padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 14 }}>יצירת קישור הזמנה</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={{ flex: 1, minWidth: 200, background: '#030b15', border: '1px solid #1e3a5f', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#e2e8f0', fontFamily: 'Heebo, sans-serif', outline: 'none', direction: 'ltr' }}
                />
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as 'assistant' | 'coordinator')}
                  style={{ background: '#030b15', border: '1px solid #1e3a5f', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#e2e8f0', fontFamily: 'Heebo, sans-serif', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="assistant">מסייעת</option>
                  <option value="coordinator">רכז/ת</option>
                </select>
                <button
                  onClick={createInvite}
                  disabled={inviteLoading || !inviteEmail.trim()}
                  className="btn"
                  style={{ background: inviteLoading || !inviteEmail.trim() ? '#1e3a5f' : '#1d4ed8', color: '#fff', padding: '9px 18px', fontSize: 13 }}
                >
                  {inviteLoading ? '...' : '+ צור הזמנה'}
                </button>
              </div>

              {inviteLink && (
                <div style={{ background: '#030b15', border: '1px solid #166534', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 12, color: '#4ade80', fontFamily: 'monospace', wordBreak: 'break-all', direction: 'ltr' }}>{inviteLink}</span>
                  <button
                    className="btn"
                    onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('הקישור הועתק') }}
                    style={{ background: '#052e16', border: '1px solid #166534', color: '#4ade80', padding: '5px 12px', fontSize: 12, flexShrink: 0 }}
                  >
                    העתק
                  </button>
                </div>
              )}
            </div>

            {/* Pending invites list */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 12 }}>
                הזמנות פעילות ({pendingInvites.length})
              </div>
              {pendingInvites.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 13, color: '#334155' }}>אין הזמנות פעילות</div>
              ) : pendingInvites.map(inv => (
                <div key={inv.id} style={{ padding: '10px 0', borderBottom: '1px solid #0a1628', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#cbd5e1', direction: 'ltr' }}>{inv.email}</div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                      {inv.role === 'assistant' ? 'מסייעת' : 'רכז/ת'} · פג בתאריך {new Date(inv.expires_at).toLocaleDateString('he-IL')}
                    </div>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schools full view */}
        {view === 'schools' && (
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
              בתי ספר ({schools.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {schools.map((school, i) => (
                <div key={school.id} className="card" style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 0.6fr', gap: 12, alignItems: 'center', animation: `fadeSlideIn 0.2s ${i * 0.04}s both` }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{school.name}</div>
                    {school.address && <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{school.address}</div>}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {school.principal_name ? `מנהל: ${school.principal_name}` : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono' }}>
                    {school.principal_phone ?? '—'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <span style={{ ...statusBadge, background: '#052e16', color: '#4ade80', border: '1px solid #166534' }}>פעיל</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nav sidebar */}
      <NavSidebar items={NAV} active={view} onChange={setView} />

      {/* Absence detail panel */}
      <AbsenceDetail absence={selectedAbsence} onClose={() => setSelectedAbsence(null)} />
    </div>
  )
}

const statusBadge: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
}

// Suppress unused import warning — statusColors used indirectly via AbsencesTable
void statusColors

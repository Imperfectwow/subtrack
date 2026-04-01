'use client'

import { useState, useEffect } from 'react'
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

export default function SuperAdminDashboard() {
  const supabase = useSupabase()
  const [municipalities, setMunicipalities] = useState<MunicipalityRow[]>([])
  const [totals, setTotals] = useState({ schools: 0, assistants: 0, absences: 0 })
  const [loading, setLoading]    = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ schools: SchoolDetail[]; assistants: AssistantDetail[] } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const now = () => new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })

  const fetchAll = async () => {
    setLoading(true)
    const [munRes, schoolRes, assistRes, absRes] = await Promise.all([
      supabase.from('municipalities').select('*').eq('is_active', true),
      supabase.from('schools').select('municipality_id'),
      supabase.from('assistants').select('municipality_id'),
      supabase.from('absences').select('*', { count: 'exact', head: true }),
    ])

    const munData   = (munRes.data   ?? []) as Municipality[]
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

  const handleRowClick = (id: string) => {
    if (selectedId === id) {
      setSelectedId(null)
      setDetail(null)
    } else {
      setSelectedId(id)
      fetchDetail(id)
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

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.6fr', gap: 8, padding: '6px 10px', borderBottom: '1px solid #0a1f35', marginBottom: 4 }}>
            {['רשות', 'כתובת URL', 'בתי ספר', 'מסייעות', 'סטטוס'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#334155' }}>{h}</span>
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
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.6fr', gap: 8,
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
              </div>

              {/* Expanded detail panel */}
              {selectedId === m.id && (
                <div style={{ background: '#050f1e', border: '1px solid #0a1f35', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: 16, marginBottom: 4 }}>
                  {detailLoading ? (
                    <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: 16 }}>טוען...</div>
                  ) : detail && (
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
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

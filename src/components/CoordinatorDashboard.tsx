'use client'

import { useState, useMemo } from 'react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard'
import { FONT, CSS_GLOBALS } from '@/lib/constants/dashboardConstants'
import Header from '@/components/dashboard/Header'
import NotificationBell from '@/components/dashboard/NotificationBell'
import StatsBar from '@/components/dashboard/StatsBar'
import AbsencesTable from '@/components/dashboard/AbsencesTable'
import AssistantsSidebar from '@/components/dashboard/AssistantsSidebar'
import NavSidebar from '@/components/dashboard/NavSidebar'
import AbsenceForm from '@/components/dashboard/AbsenceForm'
import AbsenceDetail from '@/components/dashboard/AbsenceDetail'
import type { Absence } from '@/lib/types'

const NAV = [
  { key: 'dashboard',  label: 'בקרה',    icon: '📊' },
  { key: 'assistants', label: 'מסייעות', icon: '👥' },
]

export default function CoordinatorDashboard() {
  const { absences, schools, assistants, loading, lastUpdate, fetchAll, fetchAbsences, fetchAssistants } = useDashboardData()
  const [showNotifs, setShowNotifs]       = useState(false)
  const [view, setView]                   = useState('dashboard')
  const [showForm, setShowForm]           = useState(false)
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null)
  const { newEvents } = useRealtimeDashboard(fetchAbsences, fetchAssistants)

  const stats = useMemo(() => ({
    total:     absences.length,
    open:      absences.filter(a => a.status === 'open' || a.status === 'matching').length,
    confirmed: absences.filter(a => a.status === 'confirmed').length,
    pending:   absences.filter(a => a.status === 'pending').length,
  }), [absences])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#030b15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Heebo, sans-serif', color: '#475569' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #1e3a5f', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        טוען נתונים...
      </div>
    </div>
  )

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#030b15', fontFamily: "'Heebo', sans-serif", color: '#e2e8f0', display: 'flex' }}>
      <style>{FONT + CSS_GLOBALS}</style>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Header
          lastUpdate={lastUpdate}
          onRefresh={fetchAll}
          notificationSlot={
            <NotificationBell events={newEvents} show={showNotifs} onToggle={() => setShowNotifs(v => !v)} />
          }
        />

        {view === 'dashboard' && (
          <>
            <StatsBar stats={stats} assistantCount={assistants.length} />
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
              <AbsencesTable
                absences={absences}
                onAddClick={() => setShowForm(true)}
                onRowClick={setSelectedAbsence}
              />
              <AssistantsSidebar assistants={assistants} />
            </div>
          </>
        )}

        {view === 'assistants' && (
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
              מסייעות זמינות ({assistants.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {assistants.length === 0 ? (
                <div style={{ color: '#334155', fontSize: 14, padding: 40 }}>אין מסייעות זמינות</div>
              ) : assistants.map((asst, i) => (
                <div key={asst.id} className="card" style={{ padding: 14, animation: `fadeSlideIn 0.2s ${i * 0.04}s both` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#0a1f35', border: '2px solid #166534', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#4ade80', flexShrink: 0 }}>
                      {asst.profile?.full_name?.slice(0, 2) ?? 'מס'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{asst.profile?.full_name ?? 'מסייעת'}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                        <span style={{ color: '#fbbf24' }}>★</span> {Number(asst.rating).toFixed(1)} · {asst.total_assignments} שיבוצים
                      </div>
                    </div>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', flexShrink: 0 }} />
                  </div>
                  {asst.subjects.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {asst.subjects.map(s => (
                        <span key={s} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: '#0a1f35', color: '#7dd3fc' }}>{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nav sidebar — left in RTL (secondary side) */}
      <NavSidebar items={NAV} active={view} onChange={setView} />

      {/* Modals / panels */}
      {showForm && (
        <AbsenceForm
          schools={schools}
          onClose={() => setShowForm(false)}
          onSaved={fetchAbsences}
        />
      )}
      <AbsenceDetail absence={selectedAbsence} onClose={() => setSelectedAbsence(null)} />
    </div>
  )
}

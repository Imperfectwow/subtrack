'use client'

import { useState } from 'react'
import type { Absence, AbsenceStatus } from '@/lib/types'
import { statusColors } from '@/lib/constants/dashboardConstants'

type FilterKey = 'all' | 'open' | 'pending' | 'confirmed'

const filterTabs: { key: FilterKey; label: string; color: string }[] = [
  { key: 'all',       label: 'הכל',   color: '#94a3b8' },
  { key: 'open',      label: 'פתוח',  color: '#fb923c' },
  { key: 'pending',   label: 'ממתין', color: '#fbbf24' },
  { key: 'confirmed', label: 'מאושר', color: '#10b981' },
]

interface AbsencesTableProps {
  absences: Absence[]
  onAddClick?: () => void
  onRowClick?: (absence: Absence) => void
}

export default function AbsencesTable({ absences, onAddClick, onRowClick }: AbsencesTableProps) {
  const [filter, setFilter] = useState<FilterKey>('all')

  const filtered = filter === 'all'
    ? absences
    : absences.filter(a => {
        if (filter === 'open') return a.status === 'open' || a.status === 'matching'
        return a.status === (filter as AbsenceStatus)
      })

  const count = (key: FilterKey) => {
    if (key === 'all')   return absences.length
    if (key === 'open')  return absences.filter(a => a.status === 'open' || a.status === 'matching').length
    return absences.filter(a => a.status === key).length
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          היעדרויות
        </div>
        {onAddClick && (
          <button className="btn" onClick={onAddClick} style={{ background: '#1d4ed8', color: '#fff', padding: '7px 14px', fontSize: 12 }}>
            + הוסף היעדרות
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #0a1f35' }}>
        {filterTabs.map(tab => {
          const isActive = filter === tab.key
          return (
            <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              background: isActive ? `${tab.color}22` : 'transparent',
              border: `1px solid ${isActive ? tab.color : '#1e3a5f'}`,
              color: isActive ? tab.color : '#475569',
              transition: 'all 0.15s',
            }}>
              {tab.label}&nbsp;<span style={{ fontSize: 10, opacity: 0.75 }}>{count(tab.key)}</span>
            </button>
          )
        })}
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 0.6fr 1.2fr 0.8fr', gap: 8, padding: '6px 10px', borderBottom: '1px solid #0a1f35', marginBottom: 4 }}>
        {['מורה', 'בית ספר', 'מקצוע', 'כיתה', 'תאריך / שעה', 'סטטוס'].map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#334155' }}>{h}</span>
        ))}
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#334155', fontSize: 14 }}>
            {filter === 'all' ? 'אין היעדרויות כרגע ✅' : `אין היעדרויות בסטטוס "${filterTabs.find(t => t.key === filter)?.label}"`}
          </div>
        ) : filtered.map((absence, i) => {
          const sc = statusColors[absence.status] ?? statusColors.open
          return (
            <div
              key={absence.id}
              className="row-hover"
              onClick={() => onRowClick?.(absence)}
              style={{
                display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 0.6fr 1.2fr 0.8fr', gap: 8,
                padding: '10px', borderRadius: 8, cursor: onRowClick ? 'pointer' : 'default',
                animation: `fadeSlideIn 0.25s ${i * 0.04}s both`,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>{absence.teacher_name}</div>
              <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center' }}>{absence.school?.name?.split(' ')[0] ?? '—'}</div>
              <div style={{ fontSize: 12, color: '#7dd3fc', display: 'flex', alignItems: 'center' }}>{absence.subject}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center' }}>{absence.grade}</div>
              <div style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono', display: 'flex', alignItems: 'center' }}>
                {absence.absence_date} {absence.start_time}
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                  {sc.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

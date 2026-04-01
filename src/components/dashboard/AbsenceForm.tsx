'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { School } from '@/lib/types'

interface AbsenceFormProps {
  schools: School[]
  onClose: () => void
  onSaved: () => void
}

const SUBJECTS = ['מתמטיקה', 'אנגלית', 'עברית', 'מדעים', 'היסטוריה', 'גיאוגרפיה', 'אמנות', 'ספורט', 'מוזיקה', 'ערבית', 'אחר']
const GRADES   = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'יא', 'יב']

const inputStyle: React.CSSProperties = {
  background: '#030b15', border: '1px solid #1e3a5f', borderRadius: 8,
  padding: '9px 12px', fontSize: 13, color: '#e2e8f0',
  fontFamily: 'Heebo, sans-serif', outline: 'none', width: '100%',
  boxSizing: 'border-box',
}

export default function AbsenceForm({ schools, onClose, onSaved }: AbsenceFormProps) {
  const [supabase] = useState(() => createClient())
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    school_id:    schools[0]?.id ?? '',
    teacher_name: '',
    subject:      SUBJECTS[0],
    grade:        GRADES[0],
    absence_date: new Date().toISOString().slice(0, 10),
    start_time:   '08:00',
    end_time:     '',
    notes:        '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.school_id || !form.teacher_name.trim()) return
    setSaving(true)
    const school = schools.find(s => s.id === form.school_id)
    await supabase.from('absences').insert({
      school_id:       form.school_id,
      municipality_id: school?.municipality_id,
      teacher_name:    form.teacher_name.trim(),
      subject:         form.subject,
      grade:           form.grade,
      absence_date:    form.absence_date,
      start_time:      form.start_time,
      end_time:        form.end_time || null,
      notes:           form.notes || null,
      status:          'open',
      reported_via:    'app',
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={onClose}
    >
      <div
        dir="rtl"
        style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 16, padding: 28, width: 480, maxWidth: '95vw', fontFamily: 'Heebo, sans-serif' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#f1f5f9' }}>דיווח היעדרות חדשה</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>בית ספר</span>
            <select value={form.school_id} onChange={e => set('school_id', e.target.value)} style={inputStyle}>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>שם המורה הנעדר</span>
            <input
              value={form.teacher_name}
              onChange={e => set('teacher_name', e.target.value)}
              placeholder="שם מלא"
              style={inputStyle}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>מקצוע</span>
              <select value={form.subject} onChange={e => set('subject', e.target.value)} style={inputStyle}>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>כיתה</span>
              <select value={form.grade} onChange={e => set('grade', e.target.value)} style={inputStyle}>
                {GRADES.map(g => <option key={g}>כיתה {g}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>תאריך</span>
              <input type="date" value={form.absence_date} onChange={e => set('absence_date', e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>שעת התחלה</span>
              <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>שעת סיום</span>
              <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} style={inputStyle} />
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>הערות (אופציונלי)</span>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="הערות נוספות..."
              style={{ ...inputStyle, resize: 'none' }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button
            onClick={submit}
            disabled={saving || !form.teacher_name.trim()}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 8, border: 'none',
              background: saving || !form.teacher_name.trim() ? '#1e3a5f' : 'linear-gradient(135deg, #1d4ed8, #0ea5e9)',
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: saving || !form.teacher_name.trim() ? 'default' : 'pointer',
              fontFamily: 'Heebo, sans-serif',
            }}
          >
            {saving ? 'שומר...' : 'דווח היעדרות'}
          </button>
          <button
            onClick={onClose}
            style={{ padding: '11px 20px', borderRadius: 8, border: '1px solid #1e3a5f', background: 'transparent', color: '#64748b', fontSize: 14, cursor: 'pointer', fontFamily: 'Heebo, sans-serif' }}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useSupabase } from '@/components/providers/SupabaseProvider'

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;900&display=swap');`

const inputStyle: React.CSSProperties = {
  background: '#030b15', border: '1px solid #1e3a5f', borderRadius: 10,
  padding: '12px 14px', fontSize: 14, color: '#e2e8f0',
  fontFamily: 'Heebo, sans-serif', outline: 'none', width: '100%',
  boxSizing: 'border-box', transition: 'border-color 0.15s',
}

interface Municipality { id: string; name: string }

export default function OnboardingPage() {
  const supabase = useSupabase()
  const router = useRouter()
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [saving, setSaving] = useState(false)
  const [userName, setUserName] = useState('')
  const [form, setForm] = useState({
    full_name:      '',
    phone:          '',
    whatsapp_phone: '',
    municipality_id: '',
  })

  useEffect(() => {
    const init = async () => {
      // Redirect if already has profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Pre-fill name from Google
      setUserName(user.user_metadata?.full_name ?? '')
      setForm(f => ({ ...f, full_name: user.user_metadata?.full_name ?? '' }))

      // Load municipalities
      const { data } = await supabase.from('municipalities').select('id, name').eq('is_active', true)
      const muns = (data ?? []) as Municipality[]
      setMunicipalities(muns)
      if (muns.length === 1) setForm(f => ({ ...f, municipality_id: muns[0].id }))
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.full_name.trim() || !form.phone.trim() || !form.municipality_id) return
    setSaving(true)

    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name:       form.full_name.trim(),
        phone:           form.phone.trim(),
        whatsapp_phone:  form.whatsapp_phone.trim(),
        municipality_id: form.municipality_id,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      toast.error(body.error ?? 'שגיאה בשמירת הפרטים — נסה שנית')
      setSaving(false)
      return
    }

    toast.success('הפרטים נשמרו בהצלחה')
    router.push('/dashboard')
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#030b15', fontFamily: 'Heebo, sans-serif', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <style>{`${FONT} * { box-sizing: border-box; }`}</style>

      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36, justifyContent: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#f1f5f9' }}>SubTrack</div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: -2 }}>מערכת ניהול מסייעות</div>
          </div>
        </div>

        {/* Card */}
        <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 20, padding: 32 }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#f1f5f9' }}>
              ברוך הבא{userName ? `, ${userName.split(' ')[0]}` : ''}! 👋
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
              כמה פרטים קטנים לפני שנתחיל
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Full name */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>שם מלא *</span>
              <input
                value={form.full_name}
                onChange={e => set('full_name', e.target.value)}
                placeholder="שם פרטי ושם משפחה"
                style={inputStyle}
              />
            </label>

            {/* Phone */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>מספר טלפון *</span>
              <input
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="050-0000000"
                type="tel"
                style={inputStyle}
              />
            </label>

            {/* WhatsApp */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                מספר וואטסאפ
                <span style={{ fontSize: 11, color: '#334155', fontWeight: 400, marginRight: 6 }}>(אם שונה מהטלפון)</span>
              </span>
              <input
                value={form.whatsapp_phone}
                onChange={e => set('whatsapp_phone', e.target.value)}
                placeholder={form.phone || '050-0000000'}
                type="tel"
                style={inputStyle}
              />
            </label>

            {/* Municipality — only show if more than one */}
            {municipalities.length > 1 && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>רשות מקומית *</span>
                <select value={form.municipality_id} onChange={e => set('municipality_id', e.target.value)} style={inputStyle}>
                  <option value="">בחר רשות...</option>
                  {municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
            )}
          </div>

          <button
            onClick={submit}
            disabled={saving || !form.full_name.trim() || !form.phone.trim() || !form.municipality_id}
            style={{
              width: '100%', marginTop: 24, padding: '14px 0', borderRadius: 12, border: 'none',
              background: saving || !form.full_name.trim() || !form.phone.trim() || !form.municipality_id
                ? '#1e3a5f'
                : 'linear-gradient(135deg, #1d4ed8, #0ea5e9)',
              color: '#fff', fontSize: 15, fontWeight: 800,
              cursor: saving ? 'wait' : 'pointer',
              fontFamily: 'Heebo, sans-serif', transition: 'opacity 0.15s',
            }}
          >
            {saving ? 'שומר פרטים...' : 'בואו נתחיל →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#334155', marginTop: 16, marginBottom: 0 }}>
            ניתן לעדכן את הפרטים בהמשך מתוך הפרופיל
          </p>
        </div>
      </div>
    </div>
  )
}

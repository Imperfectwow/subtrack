'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useSupabase } from '@/components/providers/SupabaseProvider'

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;900&display=swap');`

const inputStyle: React.CSSProperties = {
  background: '#030b15', border: '1px solid #1e3a5f', borderRadius: 10,
  padding: '12px 14px', fontSize: 14, color: '#e2e8f0',
  fontFamily: 'Heebo, sans-serif', outline: 'none', width: '100%',
  boxSizing: 'border-box', transition: 'border-color 0.15s',
}

interface InviteDetails {
  email: string
  role: string
  municipality_name: string
  expires_at: string
}

// loading     — fetching invite details
// no_profile  — authenticated but arrived without a token (ghost-user path)
// wrong_session — token is valid but belongs to a different email
// invalid_token — token missing, expired, or already used
// ready       — form is interactive
// saving      — POST /api/profiles in flight
type PageState = 'loading' | 'no_profile' | 'wrong_session' | 'invalid_token' | 'ready' | 'saving'

function OnboardingContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = useSupabase()
  const token        = searchParams.get('token') ?? ''
  const reason       = searchParams.get('reason') ?? ''

  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMsg,  setErrorMsg]  = useState('')
  const [invite,    setInvite]    = useState<InviteDetails | null>(null)
  const [form,      setForm]      = useState({ full_name: '', phone: '', whatsapp_phone: '' })

  useEffect(() => {
    // Ghost-user path: authenticated but no profile, no token
    if (!token && reason === 'no_profile') {
      setPageState('no_profile')
      return
    }

    if (!token) {
      setErrorMsg('לינק ההזמנה חסר — בקש מהמנהל לשלוח לך לינק חדש')
      setPageState('invalid_token')
      return
    }

    const init = async () => {
      // Pre-fill name from Google metadata while the invite fetch is in flight
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.full_name) {
        setForm(f => ({ ...f, full_name: user.user_metadata.full_name as string }))
      }

      const res  = await fetch(`/api/invitations/${token}`)
      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 403) {
          // Token belongs to a different email — offer session switch
          setErrorMsg(body.error ?? 'ההזמנה לא שייכת לחשבון הנוכחי')
          setPageState('wrong_session')
          return
        }
        setErrorMsg(body.error ?? 'ההזמנה לא תקינה')
        setPageState('invalid_token')
        return
      }

      setInvite(body as InviteDetails)
      setPageState('ready')
    }

    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const signOutAndRetry = async () => {
    await supabase.auth.signOut()
    const next = encodeURIComponent(`/onboarding?token=${token}`)
    router.push(`/login?next=${next}`)
  }

  const submit = async () => {
    if (!form.full_name.trim() || !form.phone.trim()) return
    setPageState('saving')

    const res = await fetch('/api/profiles', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        full_name:      form.full_name.trim(),
        phone:          form.phone.trim(),
        whatsapp_phone: form.whatsapp_phone.trim(),
        token,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      toast.error(body.error ?? 'שגיאה בשמירת הפרטים — נסה שנית')
      setPageState('ready')
      return
    }

    toast.success('הפרטים נשמרו בהצלחה')
    router.push('/dashboard')
  }

  const roleLabel: Record<string, string> = {
    assistant:   'מסייעת',
    coordinator: 'רכז/ת',
    admin:       'מנהל',
  }

  // ── Loading spinner ────────────────────────────────────────────────────────
  if (pageState === 'loading') return (
    <div style={{ minHeight: '100vh', background: '#030b15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Heebo, sans-serif', color: '#475569' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #1e3a5f', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        מאמת הזמנה...
      </div>
    </div>
  )

  // ── Ghost user: authenticated, no profile, no token ────────────────────────
  if (pageState === 'no_profile') return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#030b15', fontFamily: 'Heebo, sans-serif', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1c1917', border: '1px solid #78350f', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>⏳</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', marginBottom: 10 }}>ההרשמה לא הושלמה</h1>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 24 }}>
          החשבון שלך קיים אבל הפרופיל לא הוגדר.<br/>
          בקש מהמנהל לשלוח לך קישור הזמנה חדש.
        </p>
        <button
          onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
          style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 10, padding: '10px 24px', color: '#94a3b8', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Heebo, sans-serif' }}
        >
          התנתק
        </button>
      </div>
    </div>
  )

  // ── Wrong session: token belongs to different email ────────────────────────
  if (pageState === 'wrong_session') return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#030b15', fontFamily: 'Heebo, sans-serif', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#2d0a0a', border: '1px solid #7f1d1d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>🔒</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', marginBottom: 10 }}>חשבון שגוי</h1>
        <p style={{ fontSize: 14, color: '#fca5a5', lineHeight: 1.7, marginBottom: 24 }}>{errorMsg}</p>
        <button
          onClick={signOutAndRetry}
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', border: 'none', borderRadius: 10, padding: '12px 28px', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Heebo, sans-serif' }}
        >
          התנתק והתחבר עם החשבון הנכון
        </button>
      </div>
    </div>
  )

  // ── Invalid / missing token ────────────────────────────────────────────────
  if (pageState === 'invalid_token') return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#030b15', fontFamily: 'Heebo, sans-serif', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#2d0a0a', border: '1px solid #7f1d1d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>✕</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', marginBottom: 10 }}>קישור לא תקין</h1>
        <p style={{ fontSize: 14, color: '#fca5a5', lineHeight: 1.6 }}>{errorMsg}</p>
      </div>
    </div>
  )

  // ── Onboarding form ─────────────────────────────────────────────────────
  const canSubmit = pageState === 'ready' && form.full_name.trim().length >= 2 && form.phone.trim().length >= 9

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
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#f1f5f9' }}>ברוך הבא! 👋</h1>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
              כמה פרטים קטנים לפני שנתחיל
            </p>
          </div>

          {/* Invite context badge */}
          {invite && (
            <div style={{ background: '#030b15', border: '1px solid #1e3a5f', borderRadius: 10, padding: '10px 14px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, color: '#64748b' }}>הוזמנת ל</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#7dd3fc' }}>
                  {invite.municipality_name} · {roleLabel[invite.role] ?? invite.role}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Full name — pre-filled from Google metadata */}
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
          </div>

          <button
            onClick={submit}
            disabled={!canSubmit}
            style={{
              width: '100%', marginTop: 24, padding: '14px 0', borderRadius: 12, border: 'none',
              background: !canSubmit ? '#1e3a5f' : 'linear-gradient(135deg, #1d4ed8, #0ea5e9)',
              color: '#fff', fontSize: 15, fontWeight: 800,
              cursor: pageState === 'saving' ? 'wait' : canSubmit ? 'pointer' : 'default',
              fontFamily: 'Heebo, sans-serif', transition: 'opacity 0.15s',
            }}
          >
            {pageState === 'saving' ? 'שומר פרטים...' : 'בואו נתחיל →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#334155', marginTop: 16, marginBottom: 0 }}>
            ניתן לעדכן את הפרטים בהמשך מתוך הפרופיל
          </p>
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  )
}

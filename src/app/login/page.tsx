'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useSupabase } from '@/components/providers/SupabaseProvider'

export default function LoginPage() {
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [isSignUp, setIsSignUp]       = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)

  const router   = useRouter()
  const supabase = useSupabase()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError('שגיאה ביצירת החשבון — נסה שנית')
        setLoading(false)
        return
      }
      setLoading(false)
      setConfirmSent(true)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('אימייל או סיסמה שגויים')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: '#030b15',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Heebo', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px #07111f inset !important;
          -webkit-text-fill-color: #e2e8f0 !important;
        }
      `}</style>

      <div style={{
        width: '100%',
        maxWidth: 400,
        padding: '0 24px',
      }}>

        {/* לוגו */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 32px #1d4ed840',
          }}>
            <svg width="28" height="28" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.5px' }}>
            SubTrack
          </h1>
          <p style={{ fontSize: 14, color: '#475569', marginTop: 4 }}>
            מערכת ניהול מחליפים חכמה
          </p>
        </div>

        {/* כרטיס */}
        <div style={{
          background: '#07111f',
          border: '1px solid #0f2240',
          borderRadius: 16,
          padding: 32,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 24 }}>
            {isSignUp ? 'יצירת חשבון' : 'כניסה למערכת'}
          </h2>

          {confirmSent && (
            <div style={{ background: '#0a2d1a', border: '1px solid #166534', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#86efac', marginBottom: 16 }}>
              נשלח אימייל אימות — בדוק את תיבת הדואר ולחץ על הקישור לאישור החשבון
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* אימייל */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                אימייל
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="name@example.com"
                style={{
                  width: '100%', padding: '10px 14px',
                  background: '#0a1628', border: '1px solid #1e3a5f',
                  borderRadius: 8, color: '#e2e8f0', fontSize: 14,
                  outline: 'none', direction: 'ltr', textAlign: 'right',
                  fontFamily: 'Heebo, sans-serif',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#1e3a5f'}
              />
            </div>

            {/* סיסמה */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                סיסמה
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '10px 14px',
                  background: '#0a1628', border: '1px solid #1e3a5f',
                  borderRadius: 8, color: '#e2e8f0', fontSize: 14,
                  outline: 'none', direction: 'ltr',
                  fontFamily: 'Heebo, sans-serif',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#1e3a5f'}
              />
            </div>

            {/* שגיאה */}
            {error && (
              <div style={{
                background: '#2d0a0a', border: '1px solid #7f1d1d',
                borderRadius: 8, padding: '10px 14px',
                fontSize: 13, color: '#fca5a5',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}
{/* כפתור Google */}
<button
  type="button"
  onClick={async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    })
    if (error) toast.error('שגיאה בהתחברות עם Google')
  }}
  style={{
    width: '100%', padding: '12px 0',
    background: '#fff', color: '#1a1a1a',
    border: '1px solid #e2e8f0', borderRadius: 8,
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Heebo, sans-serif',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginBottom: 4,
  }}
>
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
  התחבר עם Google
</button>

{/* קו מפריד */}
<div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
  <div style={{ flex: 1, height: 1, background: '#1e3a5f' }} />
  <span style={{ fontSize: 12, color: '#475569' }}>או</span>
  <div style={{ flex: 1, height: 1, background: '#1e3a5f' }} />
</div>
            {/* כפתור כניסה / הרשמה */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px 0',
                background: loading ? '#1e3a5f' : 'linear-gradient(135deg, #1d4ed8, #0ea5e9)',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Heebo, sans-serif',
                transition: 'opacity 0.15s',
                opacity: loading ? 0.7 : 1,
                marginTop: 4,
              }}
            >
              {loading ? (isSignUp ? 'יוצר חשבון...' : 'מתחבר...') : (isSignUp ? 'הרשמה' : 'כניסה')}
            </button>

          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#475569', marginTop: 20 }}>
            {isSignUp ? 'כבר יש לך חשבון? ' : 'אין לך חשבון עדיין? '}
            <button
              type="button"
              onClick={() => { setIsSignUp(s => !s); setError(null) }}
              style={{
                background: 'none', border: 'none', color: '#3b82f6',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Heebo, sans-serif', padding: 0,
              }}
            >
              {isSignUp ? 'כניסה' : 'הרשמה'}
            </button>
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#334155', marginTop: 24 }}>
          SubTrack © {new Date().getFullYear()} — כל הזכויות שמורות
        </p>
      </div>
    </div>
  )
}

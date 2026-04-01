import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/invitations/[token] — validate a token and return sanitised invite details.
// Requires authentication so we can verify the email matches.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  if (!token || !/^[0-9a-f]{64}$/.test(token)) {
    return NextResponse.json({ error: 'טוקן לא תקין' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'יש להתחבר תחילה' }, { status: 401 })
  }

  const { data: invite } = await supabase
    .from('invitations')
    .select('email, role, expires_at, used_at, municipality:municipalities(name)')
    .eq('token', token)
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'ההזמנה לא נמצאה' }, { status: 404 })
  }

  if (invite.used_at) {
    return NextResponse.json({ error: 'ההזמנה כבר נוצלה' }, { status: 410 })
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'ההזמנה פגה תוקף' }, { status: 410 })
  }

  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: `ההזמנה שייכת ל-${invite.email} — התחבר עם אותה כתובת אימייל` },
      { status: 403 },
    )
  }

  const municipality = Array.isArray(invite.municipality)
    ? invite.municipality[0]
    : invite.municipality

  return NextResponse.json({
    email:             invite.email,
    role:              invite.role,
    municipality_name: (municipality as { name: string } | null)?.name ?? '',
    expires_at:        invite.expires_at,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/invitations/[token] — revoke a pending invitation (hard delete).
// Super admins can revoke any invitation; admins/coordinators only within their municipality.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  if (!token || !/^[0-9a-f]{64}$/.test(token)) {
    return NextResponse.json({ error: 'טוקן לא תקין' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, municipality_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'coordinator', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'אין הרשאה לבטל הזמנות' }, { status: 403 })
  }

  const { data: invite } = await supabase
    .from('invitations')
    .select('id, municipality_id, used_at')
    .eq('token', token)
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'ההזמנה לא נמצאה' }, { status: 404 })
  }

  if (invite.used_at) {
    return NextResponse.json({ error: 'לא ניתן לבטל הזמנה שכבר נוצלה' }, { status: 409 })
  }

  if (profile.role !== 'super_admin' && invite.municipality_id !== profile.municipality_id) {
    return NextResponse.json({ error: 'אין הרשאה לבטל הזמנה זו' }, { status: 403 })
  }

  const { error: deleteError } = await supabase
    .from('invitations')
    .delete()
    .eq('token', token)

  if (deleteError) {
    console.error('[DELETE /api/invitations/[token]] error:', deleteError.code)
    return NextResponse.json({ error: 'שגיאה בביטול ההזמנה — נסה שנית' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}

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

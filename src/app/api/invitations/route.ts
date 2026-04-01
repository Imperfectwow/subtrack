import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'

const INVITABLE_ROLES: UserRole[] = ['assistant', 'coordinator']

const createSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  role:  z.enum(['assistant', 'coordinator'], { message: 'תפקיד לא תקין' }),
})

// POST /api/invitations — admin / coordinator creates an invite link
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  // Must have a profile with an invite-capable role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, municipality_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'coordinator', 'super_admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'אין הרשאה ליצור הזמנות' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'גוף הבקשה אינו JSON תקין' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'נתונים לא תקינים', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { email, role } = parsed.data

  // Coordinators can only invite assistants
  if (profile.role === 'coordinator' && role !== 'assistant') {
    return NextResponse.json({ error: 'רכז יכול להזמין מסייעות בלבד' }, { status: 403 })
  }

  void INVITABLE_ROLES // suppress lint

  const token = randomBytes(32).toString('hex')
  const municipality_id = profile.municipality_id as string

  const { data: invite, error: insertError } = await supabase
    .from('invitations')
    .insert({ token, email: email.toLowerCase(), municipality_id, role, created_by: user.id })
    .select('id, token, expires_at')
    .single()

  if (insertError) {
    console.error('[POST /api/invitations] insert error:', insertError.code)
    return NextResponse.json({ error: 'שגיאה ביצירת ההזמנה — נסה שנית' }, { status: 500 })
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
    ?? new URL(request.url).origin

  return NextResponse.json({
    id:         invite.id,
    invite_url: `${origin}/onboarding?token=${invite.token}`,
    expires_at: invite.expires_at,
  }, { status: 201 })
}

// GET /api/invitations — list pending invitations for the caller's municipality
export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('invitations')
    .select('id, email, role, expires_at, used_at, created_at')
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'שגיאה בטעינת ההזמנות' }, { status: 500 })
  }

  return NextResponse.json({ invitations: data ?? [] })
}

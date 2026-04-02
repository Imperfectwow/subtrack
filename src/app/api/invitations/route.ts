import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'

const createSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  role:  z.enum(['assistant', 'coordinator'], { message: 'תפקיד לא תקין' }),
})

const superAdminCreateSchema = z.object({
  email:           z.string().email('כתובת אימייל לא תקינה'),
  role:            z.enum(['assistant', 'coordinator', 'admin'], { message: 'תפקיד לא תקין' }),
  municipality_id: z.string().regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    { message: 'מזהה רשות לא תקין' }
  ),
})

// POST /api/invitations — admin / coordinator / super_admin creates an invite link
export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: 'אין הרשאה ליצור הזמנות' }, { status: 403 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'גוף הבקשה אינו JSON תקין' }, { status: 400 })
  }

  let email: string
  let role: UserRole
  let municipality_id: string

  if (profile.role === 'super_admin') {
    const parsed = superAdminCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'נתונים לא תקינים', details: parsed.error.flatten().fieldErrors },
        { status: 422 },
      )
    }
    email           = parsed.data.email
    role            = parsed.data.role as UserRole
    municipality_id = parsed.data.municipality_id
  } else {
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'נתונים לא תקינים', details: parsed.error.flatten().fieldErrors },
        { status: 422 },
      )
    }
    email           = parsed.data.email
    role            = parsed.data.role as UserRole
    municipality_id = profile.municipality_id as string

    if (profile.role === 'coordinator' && role !== 'assistant') {
      return NextResponse.json({ error: 'רכז יכול להזמין מסייעות בלבד' }, { status: 403 })
    }
  }

  const token = randomBytes(32).toString('hex')

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
// Super admin can pass ?municipality_id= to filter by a specific municipality
export async function GET(request: NextRequest) {
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
    return NextResponse.json({ error: 'אין הרשאה לצפות בהזמנות' }, { status: 403 })
  }

  let query = supabase
    .from('invitations')
    .select('id, token, email, role, municipality_id, expires_at, used_at, created_at')
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (profile.role === 'super_admin') {
    const municipalityId = new URL(request.url).searchParams.get('municipality_id')
    if (municipalityId) {
      query = query.eq('municipality_id', municipalityId)
    }
  } else {
    query = query.eq('municipality_id', profile.municipality_id as string)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'שגיאה בטעינת ההזמנות' }, { status: 500 })
  }

  return NextResponse.json({ invitations: data ?? [] })
}

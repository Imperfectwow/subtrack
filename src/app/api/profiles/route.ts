import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const createProfileSchema = z.object({
  full_name:       z.string().min(2, 'השם חייב להכיל לפחות 2 תווים').max(100),
  phone:           z.string().regex(/^0\d{1,2}-?\d{7}$/, 'מספר טלפון לא תקין'),
  whatsapp_phone:  z.string().regex(/^0\d{1,2}-?\d{7}$/, 'מספר וואטסאפ לא תקין').optional().or(z.literal('')),
  municipality_id: z.string().uuid('מזהה רשות מקומית לא תקין'),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Verify authenticated session
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  // Parse and validate request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'גוף הבקשה אינו JSON תקין' }, { status: 400 })
  }

  const parsed = createProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'נתונים לא תקינים', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { full_name, phone, whatsapp_phone, municipality_id } = parsed.data

  // Verify municipality exists and is active
  const { data: municipality } = await supabase
    .from('municipalities')
    .select('id')
    .eq('id', municipality_id)
    .eq('is_active', true)
    .single()

  if (!municipality) {
    return NextResponse.json({ error: 'הרשות המקומית לא נמצאה או אינה פעילה' }, { status: 422 })
  }

  // Prevent duplicate profile creation
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'פרופיל כבר קיים למשתמש זה' }, { status: 409 })
  }

  const { data: profile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id:              user.id,
      municipality_id,
      role:            'assistant',
      full_name:       full_name.trim(),
      phone:           phone.trim(),
      whatsapp_phone:  (whatsapp_phone?.trim() || phone.trim()),
      is_active:       true,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[POST /api/profiles] insert error:', insertError.code)
    return NextResponse.json({ error: 'שגיאה בשמירת הפרטים — נסה שנית' }, { status: 500 })
  }

  return NextResponse.json({ profile }, { status: 201 })
}

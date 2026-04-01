import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const createAbsenceSchema = z.object({
  school_id:    z.string().uuid('מזהה בית ספר לא תקין'),
  teacher_name: z.string().min(2, 'שם המורה חייב להכיל לפחות 2 תווים').max(100),
  subject:      z.string().min(1),
  grade:        z.string().min(1),
  absence_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך לא תקין'),
  start_time:   z.string().regex(/^\d{2}:\d{2}$/, 'שעה לא תקינה'),
  end_time:     z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal('')),
  notes:        z.string().max(500).optional().or(z.literal('')),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'גוף הבקשה אינו JSON תקין' }, { status: 400 })
  }

  const parsed = createAbsenceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'נתונים לא תקינים', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { school_id, teacher_name, subject, grade, absence_date, start_time, end_time, notes } = parsed.data

  // Derive municipality_id server-side — never trust client-supplied value
  const { data: school } = await supabase
    .from('schools')
    .select('id, municipality_id')
    .eq('id', school_id)
    .eq('is_active', true)
    .single()

  if (!school) {
    return NextResponse.json({ error: 'בית הספר לא נמצא או אינו פעיל' }, { status: 422 })
  }

  const { data: absence, error: insertError } = await supabase
    .from('absences')
    .insert({
      school_id,
      municipality_id: school.municipality_id,
      teacher_name:    teacher_name.trim(),
      subject,
      grade,
      absence_date,
      start_time,
      end_time:     end_time || null,
      notes:        notes || null,
      status:       'open',
      reported_via: 'app',
      reported_by:  user.id,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[POST /api/absences] insert error:', insertError.code)
    return NextResponse.json({ error: 'שגיאה בשמירת ההיעדרות — נסה שנית' }, { status: 500 })
  }

  return NextResponse.json({ absence }, { status: 201 })
}

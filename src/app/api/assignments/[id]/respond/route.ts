import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const respondSchema = z.object({
  status: z.enum(['accepted', 'declined']),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'מזהה שיבוץ חסר' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'גוף הבקשה אינו JSON תקין' }, { status: 400 })
  }

  const parsed = respondSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'סטטוס לא תקין — חייב להיות accepted או declined' },
      { status: 422 }
    )
  }

  // Verify the caller is the assigned assistant for this specific assignment
  const { data: existing } = await supabase
    .from('assignments')
    .select('id, status, assistant_id')
    .eq('id', id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'שיבוץ לא נמצא' }, { status: 404 })
  }

  if (existing.assistant_id !== user.id) {
    return NextResponse.json({ error: 'אין הרשאה לשנות שיבוץ זה' }, { status: 403 })
  }

  if (existing.status !== 'offered') {
    return NextResponse.json({ error: 'ניתן להגיב רק על הצעות פתוחות' }, { status: 409 })
  }

  const { data: assignment, error: updateError } = await supabase
    .from('assignments')
    .update({ status: parsed.data.status, responded_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    console.error('[PATCH /api/assignments/[id]/respond] update error:', updateError.code)
    return NextResponse.json({ error: 'שגיאה בעדכון השיבוץ — נסה שנית' }, { status: 500 })
  }

  return NextResponse.json({ assignment })
}

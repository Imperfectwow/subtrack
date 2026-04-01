import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const availabilitySchema = z.object({
  is_available: z.boolean(),
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
    return NextResponse.json({ error: 'מזהה מסייעת חסר' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'גוף הבקשה אינו JSON תקין' }, { status: 400 })
  }

  const parsed = availabilitySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'ערך is_available חייב להיות boolean' }, { status: 422 })
  }

  // An assistant updates their own availability, or an admin/coordinator updates within their municipality
  const isSelf = id === user.id

  if (!isSelf) {
    // Verify the caller has admin/coordinator role AND shares the assistant's municipality
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role, municipality_id')
      .eq('id', user.id)
      .single()

    const allowedRoles = ['super_admin', 'admin', 'coordinator']
    if (!callerProfile || !allowedRoles.includes(callerProfile.role)) {
      return NextResponse.json({ error: 'אין הרשאה לשנות זמינות של מסייעת אחרת' }, { status: 403 })
    }

    // Verify same municipality (super_admin is exempt)
    if (callerProfile.role !== 'super_admin') {
      const { data: targetAssistant } = await supabase
        .from('assistants')
        .select('municipality_id')
        .eq('id', id)
        .single()

      if (!targetAssistant || targetAssistant.municipality_id !== callerProfile.municipality_id) {
        return NextResponse.json({ error: 'המסייעת אינה שייכת לרשות שלך' }, { status: 403 })
      }
    }
  }

  const { data: assistant, error: updateError } = await supabase
    .from('assistants')
    .update({ is_available: parsed.data.is_available })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    console.error('[PATCH /api/assistants/[id]/availability] update error:', updateError.code)
    return NextResponse.json({ error: 'שגיאה בעדכון הזמינות — נסה שנית' }, { status: 500 })
  }

  return NextResponse.json({ assistant })
}

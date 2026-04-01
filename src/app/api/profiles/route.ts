import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const createProfileSchema = z.object({
  full_name:      z.string().min(2, 'השם חייב להכיל לפחות 2 תווים').max(100),
  phone:          z.string().regex(/^0\d{1,2}-?\d{7}$/, 'מספר טלפון לא תקין'),
  whatsapp_phone: z.string().regex(/^0\d{1,2}-?\d{7}$/, 'מספר וואטסאפ לא תקין').optional().or(z.literal('')),
  token:          z.string().regex(/^[0-9a-f]{64}$/, 'טוקן הזמנה לא תקין'),
})

// Maps Postgres exception messages from use_invitation() to HTTP responses
const RPC_ERRORS: Record<string, { status: number; error: string }> = {
  not_authenticated:     { status: 401, error: 'לא מורשה'                                    },
  invitation_not_found:  { status: 422, error: 'טוקן הזמנה לא תקין'                          },
  invitation_already_used: { status: 410, error: 'ההזמנה כבר נוצלה'                          },
  invitation_expired:    { status: 410, error: 'ההזמנה פגה תוקף'                             },
  email_mismatch:        { status: 403, error: 'ההזמנה אינה שייכת לכתובת האימייל הזו'        },
  profile_already_exists:{ status: 409, error: 'פרופיל כבר קיים למשתמש זה'                   },
}

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

  const parsed = createProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'נתונים לא תקינים', details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { full_name, phone, whatsapp_phone, token } = parsed.data

  // Single atomic RPC call: validates token, marks used, inserts profile — all in one transaction
  const { data: profile, error: rpcError } = await supabase.rpc('use_invitation', {
    p_token:          token,
    p_full_name:      full_name,
    p_phone:          phone,
    p_whatsapp_phone: whatsapp_phone ?? '',
  })

  if (rpcError) {
    const mapped = RPC_ERRORS[rpcError.message]
    if (mapped) {
      return NextResponse.json({ error: mapped.error }, { status: mapped.status })
    }
    console.error('[POST /api/profiles] use_invitation rpc error:', rpcError.message)
    return NextResponse.json({ error: 'שגיאה בשמירת הפרטים — נסה שנית' }, { status: 500 })
  }

  return NextResponse.json({ profile }, { status: 201 })
}

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ALLOWED_NEXT_PATHS = new Set(['/dashboard', '/onboarding'])

function safeNext(raw: string | null): string {
  if (!raw) return '/dashboard'
  // Must be a relative path starting with / and no protocol or host
  if (raw.startsWith('/') && !raw.startsWith('//') && !raw.includes(':')) {
    // Only allow known safe destinations
    const base = raw.split('?')[0]
    if (ALLOWED_NEXT_PATHS.has(base) || base.startsWith('/dashboard/')) return raw
  }
  return '/dashboard'
}

// Use NEXT_PUBLIC_SITE_URL so the post-auth redirect always lands on the
// correct origin — regardless of whether Supabase forwarded the code to
// http:// or https:// localhost (which has no SSL cert).
function siteOrigin(requestOrigin: string): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? requestOrigin
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))
  const base = siteOrigin(origin)

  if (code) {
    const response = NextResponse.redirect(`${base}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return response
    }
  }

  return NextResponse.redirect(`${base}/login?error=auth_callback_failed`)
}

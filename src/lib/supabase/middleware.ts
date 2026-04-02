import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // רענן את ה-session — חשוב! אל תמחק את זה
  const { data: { user } } = await supabase.auth.getUser()

  // אם לא מחובר ומנסה לגשת לעמוד מוגן — הפנה ל-login
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
    || request.nextUrl.pathname.startsWith('/auth/')
  const isPublicPage = request.nextUrl.pathname === '/'
  const isApiRoute   = request.nextUrl.pathname.startsWith('/api/')

  if (!user && !isAuthPage && !isPublicPage && !isApiRoute) {
    const url = request.nextUrl.clone()
    const next = request.nextUrl.pathname + request.nextUrl.search
    url.pathname = '/login'
    url.search   = `?next=${encodeURIComponent(next)}`
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

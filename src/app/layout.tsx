import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { SupabaseProvider } from '@/components/providers/SupabaseProvider'

export const metadata: Metadata = {
  title: 'SubTrack',
  description: 'מערכת ניהול מחליפים חכמה',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <ErrorBoundary>
          <SupabaseProvider>
            {children}
          </SupabaseProvider>
        </ErrorBoundary>
        <Toaster
          position="bottom-right"
          dir="rtl"
          toastOptions={{
            style: {
              fontFamily: 'Heebo, sans-serif',
              fontSize: 14,
              background: '#0a1628',
              border: '1px solid #1e3a5f',
              color: '#e2e8f0',
            },
          }}
        />
      </body>
    </html>
  )
}
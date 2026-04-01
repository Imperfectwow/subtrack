'use client'

import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from 'sonner'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,        // treat data as fresh for 30s
            retry: 3,                 // retry failed requests up to 3 times
            retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10_000),
          },
          mutations: {
            onError: (error: unknown) => {
              const message = error instanceof Error ? error.message : 'שגיאה לא צפויה'
              toast.error(message)
            },
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

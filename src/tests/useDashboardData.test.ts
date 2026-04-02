import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useDashboardData, QUERY_KEYS } from '@/hooks/useDashboardData'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

vi.mock('@/components/providers/SupabaseProvider', () => ({
  useSupabase: vi.fn(),
}))

// Builds a chainable Supabase query mock that resolves to { data: [], error: null }
function makeChain() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {}
  for (const m of ['select', 'order', 'limit', 'eq', 'filter']) {
    chain[m] = vi.fn(() => chain)
  }
  chain.then = (resolve: (v: { data: never[]; error: null }) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(resolve)
  return chain
}

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useDashboardData', () => {
  let queryClient: QueryClient

  beforeEach(async () => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    const { useSupabase } = await import('@/components/providers/SupabaseProvider')
    vi.mocked(useSupabase).mockReturnValue({ from: vi.fn(() => makeChain()) } as never)
  })

  it('returns the expected shape on first render', () => {
    const { result } = renderHook(() => useDashboardData(), {
      wrapper: wrapper(queryClient),
    })

    expect(Array.isArray(result.current.absences)).toBe(true)
    expect(Array.isArray(result.current.schools)).toBe(true)
    expect(Array.isArray(result.current.assistants)).toBe(true)
    expect(typeof result.current.loading).toBe('boolean')
    expect(typeof result.current.fetchAll).toBe('function')
    expect(typeof result.current.fetchAbsences).toBe('function')
    expect(typeof result.current.fetchAssistants).toBe('function')
  })

  it('fetchAll invalidates all three query keys', () => {
    const { result } = renderHook(() => useDashboardData(), {
      wrapper: wrapper(queryClient),
    })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    act(() => { result.current.fetchAll() })

    expect(invalidate).toHaveBeenCalledTimes(3)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: QUERY_KEYS.absences })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: QUERY_KEYS.schools })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: QUERY_KEYS.assistants })
  })

  it('fetchAbsences invalidates only absences', () => {
    const { result } = renderHook(() => useDashboardData(), {
      wrapper: wrapper(queryClient),
    })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    act(() => { result.current.fetchAbsences() })

    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: QUERY_KEYS.absences })
  })

  it('fetchAssistants invalidates only assistants', () => {
    const { result } = renderHook(() => useDashboardData(), {
      wrapper: wrapper(queryClient),
    })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    act(() => { result.current.fetchAssistants() })

    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: QUERY_KEYS.assistants })
  })

  it('QUERY_KEYS exports stable array references', () => {
    expect(QUERY_KEYS.absences).toEqual(['absences'])
    expect(QUERY_KEYS.schools).toEqual(['schools'])
    expect(QUERY_KEYS.assistants).toEqual(['assistants'])
  })
})

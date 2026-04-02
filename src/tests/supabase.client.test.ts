import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockClient = { from: vi.fn(), auth: { getUser: vi.fn() } }

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => mockClient),
}))

describe('createClient', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
  })

  it('calls createBrowserClient with the env var URL and key', async () => {
    const { createBrowserClient } = await import('@supabase/ssr')
    const { createClient } = await import('@/lib/supabase/client')

    createClient()

    expect(createBrowserClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
    )
  })

  it('returns the Supabase client object', async () => {
    const { createClient } = await import('@/lib/supabase/client')

    const client = createClient()

    expect(client).toBe(mockClient)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { roleRoutes } from '@/lib/supabase/auth'

// Mock the server Supabase client — cannot run in jsdom (uses next/headers cookies)
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('roleRoutes', () => {
  it('maps super_admin to /dashboard/super-admin', () => {
    expect(roleRoutes.super_admin).toBe('/dashboard/super-admin')
  })

  it('maps admin to /dashboard/admin', () => {
    expect(roleRoutes.admin).toBe('/dashboard/admin')
  })

  it('maps coordinator to /dashboard/coordinator', () => {
    expect(roleRoutes.coordinator).toBe('/dashboard/coordinator')
  })

  it('maps assistant to /dashboard/assistant', () => {
    expect(roleRoutes.assistant).toBe('/dashboard/assistant')
  })

  it('has exactly 4 keys — one per UserRole', () => {
    expect(Object.keys(roleRoutes)).toHaveLength(4)
  })

  it('all routes start with /dashboard/', () => {
    for (const route of Object.values(roleRoutes)) {
      expect(route).toMatch(/^\/dashboard\//)
    }
  })
})

describe('getCurrentProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when getUser returns no user', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    } as never)

    const { getCurrentProfile } = await import('@/lib/supabase/auth')
    const result = await getCurrentProfile()
    expect(result).toBeNull()
  })

  it('returns null when profiles query returns no data', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null })
    const mockEq     = vi.fn(() => ({ single: mockSingle }))
    const mockSelect = vi.fn(() => ({ eq: mockEq }))
    const mockFrom   = vi.fn(() => ({ select: mockSelect }))

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: mockFrom,
    } as never)

    const { getCurrentProfile } = await import('@/lib/supabase/auth')
    const result = await getCurrentProfile()
    expect(result).toBeNull()
  })

  it('returns a Profile when user and profile data exist', async () => {
    const fakeProfile = { id: 'user-1', role: 'coordinator', full_name: 'Test', is_active: true }
    const mockSingle = vi.fn().mockResolvedValue({ data: fakeProfile })
    const mockEq     = vi.fn(() => ({ single: mockSingle }))
    const mockSelect = vi.fn(() => ({ eq: mockEq }))
    const mockFrom   = vi.fn(() => ({ select: mockSelect }))

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: mockFrom,
    } as never)

    const { getCurrentProfile } = await import('@/lib/supabase/auth')
    const result = await getCurrentProfile()
    expect(result).toEqual(fakeProfile)
  })

  it('queries the profiles table with the user id', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: null })
    const mockEq     = vi.fn(() => ({ single: mockSingle }))
    const mockSelect = vi.fn(() => ({ eq: mockEq }))
    const mockFrom   = vi.fn(() => ({ select: mockSelect }))

    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'abc-123' } } }) },
      from: mockFrom,
    } as never)

    const { getCurrentProfile } = await import('@/lib/supabase/auth')
    await getCurrentProfile()

    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(mockEq).toHaveBeenCalledWith('id', 'abc-123')
  })
})

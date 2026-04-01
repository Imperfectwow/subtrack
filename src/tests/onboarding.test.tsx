import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

const VALID_TOKEN = 'a'.repeat(64)

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter:       () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(`token=${VALID_TOKEN}`),
}))

// Mock sonner
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

// Controllable supabase mock — default is "signed in, no prior name"
const mockSignOut = vi.fn().mockResolvedValue({})
const makeSupabaseMock = (overrides: { fullName?: string | null } = {}) => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: {
        user: {
          id:             'user-1',
          email:          'user@example.com',
          user_metadata:  { full_name: overrides.fullName ?? null },
        },
      },
    }),
    signOut: mockSignOut,
  },
})

vi.mock('@/components/providers/SupabaseProvider', () => ({
  SupabaseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSupabase: vi.fn(),
}))

const MOCK_INVITE = {
  email:             'user@example.com',
  role:              'assistant',
  municipality_name: 'עיריית תל אביב',
  expires_at:        new Date(Date.now() + 48 * 3_600_000).toISOString(),
}

function mockFetch(ok: boolean, body: object, status = ok ? 200 : 400) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok, status, json: () => Promise.resolve(body),
  }))
}

async function setupReady(fullName?: string) {
  const { useSupabase } = await import('@/components/providers/SupabaseProvider')
  vi.mocked(useSupabase).mockReturnValue(makeSupabaseMock({ fullName }) as never)
  mockFetch(true, MOCK_INVITE)
}

// ── invalid / error states ───────────────────────────────────────────────────

describe('OnboardingPage — invalid token states', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules() })

  it('shows error when token fetch returns 404', async () => {
    const { useSupabase } = await import('@/components/providers/SupabaseProvider')
    vi.mocked(useSupabase).mockReturnValue(makeSupabaseMock() as never)
    mockFetch(false, { error: 'ההזמנה לא נמצאה' }, 404)

    const { default: Page } = await import('@/app/onboarding/page')
    render(<Page />)

    await waitFor(() => screen.getByText('קישור לא תקין'))
    expect(screen.getByText('ההזמנה לא נמצאה')).toBeInTheDocument()
  })

  it('shows wrong-session screen and sign-out button on 403', async () => {
    const { useSupabase } = await import('@/components/providers/SupabaseProvider')
    vi.mocked(useSupabase).mockReturnValue(makeSupabaseMock() as never)
    mockFetch(false, { error: 'ההזמנה שייכת ל-other@example.com' }, 403)

    const { default: Page } = await import('@/app/onboarding/page')
    render(<Page />)

    await waitFor(() => screen.getByText('חשבון שגוי'))
    expect(screen.getByRole('button', { name: /התנתק והתחבר/ })).toBeInTheDocument()
  })
})

// ── no_profile (ghost user) ──────────────────────────────────────────────────

describe('OnboardingPage — ghost user (no_profile reason)', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules() })

  it('shows no-profile screen when reason=no_profile and no token', async () => {
    // Override useSearchParams for this test only
    vi.doMock('next/navigation', () => ({
      useRouter:       () => ({ push: mockPush }),
      useSearchParams: () => new URLSearchParams('reason=no_profile'),
    }))

    const { useSupabase } = await import('@/components/providers/SupabaseProvider')
    vi.mocked(useSupabase).mockReturnValue(makeSupabaseMock() as never)

    const { default: Page } = await import('@/app/onboarding/page')
    render(<Page />)

    await waitFor(() => screen.getByText('ההרשמה לא הושלמה'))
    expect(screen.getByRole('button', { name: 'התנתק' })).toBeInTheDocument()
  })
})

// ── ready state ──────────────────────────────────────────────────────────────

describe('OnboardingPage — ready state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    // restore default search params (token=aaa...aaa)
    vi.doMock('next/navigation', () => ({
      useRouter:       () => ({ push: mockPush }),
      useSearchParams: () => new URLSearchParams(`token=${VALID_TOKEN}`),
    }))
  })

  it('shows municipality and role from invite', async () => {
    await setupReady()
    const { default: Page } = await import('@/app/onboarding/page')
    render(<Page />)

    await waitFor(() => screen.getByText(/עיריית תל אביב/))
    expect(screen.getByText(/מסייעת/)).toBeInTheDocument()
  })

  it('pre-fills full_name from Google metadata', async () => {
    await setupReady('ישראל ישראלי')
    const { default: Page } = await import('@/app/onboarding/page')
    render(<Page />)

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/שם פרטי/) as HTMLInputElement
      expect(input.value).toBe('ישראל ישראלי')
    })
  })

  it('submit button is disabled when name is empty', async () => {
    await setupReady()
    const { default: Page } = await import('@/app/onboarding/page')
    render(<Page />)

    await waitFor(() => screen.getByRole('button', { name: /בואו נתחיל/ }))
    expect(screen.getByRole('button', { name: /בואו נתחיל/ })).toBeDisabled()
  })

  it('submit button is enabled when name and phone are filled', async () => {
    const user = userEvent.setup()
    await setupReady()
    const { default: Page } = await import('@/app/onboarding/page')
    render(<Page />)

    await waitFor(() => screen.getByPlaceholderText(/שם פרטי/))
    await user.type(screen.getByPlaceholderText(/שם פרטי/), 'ישראל ישראלי')
    await user.type(screen.getAllByPlaceholderText(/050/)[0], '0501234567')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /בואו נתחיל/ })).not.toBeDisabled()
    })
  })

  it('does not show municipality dropdown (locked by invite)', async () => {
    await setupReady()
    const { default: Page } = await import('@/app/onboarding/page')
    render(<Page />)

    await waitFor(() => screen.getByText(/עיריית תל אביב/))
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

const makeSupabaseMock = (overrides: {
  userId?: string | null
  userName?: string
  municipalities?: { id: string; name: string }[]
} = {}) => {
  const {
    userId = 'user-1',
    userName = 'Test User',
    municipalities = [{ id: 'mun-1', name: 'עיריית תל אביב' }],
  } = overrides

  const mockSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: municipalities }),
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: userId ? { id: userId, user_metadata: { full_name: userName } } : null,
        },
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'municipalities') return { select: mockSelect }
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    }),
  }
}

describe('OnboardingPage — redirect behavior', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('redirects to /login when no authenticated user', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    vi.mocked(createClient).mockReturnValue(makeSupabaseMock({ userId: null }) as never)

    const { default: OnboardingPage } = await import('@/app/onboarding/page')
    render(<OnboardingPage />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })
})

describe('OnboardingPage — form validation', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    const { createClient } = await import('@/lib/supabase/client')
    vi.mocked(createClient).mockReturnValue(makeSupabaseMock() as never)
  })

  it('submit button is disabled when full_name is empty', async () => {
    const { default: OnboardingPage } = await import('@/app/onboarding/page')
    render(<OnboardingPage />)
    await waitFor(() => screen.getByRole('button', { name: /בואו נתחיל/ }))
    const btn = screen.getByRole('button', { name: /בואו נתחיל/ })
    expect(btn).toBeDisabled()
  })

  it('submit button is enabled when all required fields are filled', async () => {
    const user = userEvent.setup()
    const { default: OnboardingPage } = await import('@/app/onboarding/page')
    render(<OnboardingPage />)

    await waitFor(() => screen.getByPlaceholderText(/שם פרטי/))

    await user.clear(screen.getByPlaceholderText(/שם פרטי/))
    await user.type(screen.getByPlaceholderText(/שם פרטי/), 'ישראל ישראלי')
    await user.type(screen.getAllByPlaceholderText(/050/)[0], '0501234567')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /בואו נתחיל/ })).not.toBeDisabled()
    })
  })
})

describe('OnboardingPage — municipality select', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('does not show municipality dropdown when only 1 municipality exists', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    vi.mocked(createClient).mockReturnValue(
      makeSupabaseMock({ municipalities: [{ id: 'm1', name: 'תל אביב' }] }) as never
    )

    const { default: OnboardingPage } = await import('@/app/onboarding/page')
    render(<OnboardingPage />)

    await waitFor(() => screen.getByPlaceholderText(/שם פרטי/))
    expect(screen.queryByText('רשות מקומית *')).not.toBeInTheDocument()
  })

  it('shows municipality dropdown when multiple municipalities exist', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    vi.mocked(createClient).mockReturnValue(
      makeSupabaseMock({
        municipalities: [
          { id: 'm1', name: 'תל אביב' },
          { id: 'm2', name: 'חיפה' },
        ],
      }) as never
    )

    const { default: OnboardingPage } = await import('@/app/onboarding/page')
    render(<OnboardingPage />)

    await waitFor(() => screen.getByText(/רשות מקומית/))
    expect(screen.getByText('תל אביב')).toBeInTheDocument()
    expect(screen.getByText('חיפה')).toBeInTheDocument()
  })
})

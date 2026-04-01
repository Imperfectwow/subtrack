import { describe, it, expect } from 'vitest'
import { statusColors } from '@/lib/constants/dashboardConstants'

const ALL_STATUSES = ['open', 'matching', 'pending', 'confirmed', 'cancelled', 'no_show'] as const

describe('statusColors', () => {
  it('has an entry for every AbsenceStatus value', () => {
    for (const status of ALL_STATUSES) {
      expect(statusColors[status], `missing entry for "${status}"`).toBeDefined()
    }
  })

  it('each entry has non-empty bg, text, border, and label', () => {
    for (const status of ALL_STATUSES) {
      const sc = statusColors[status]
      expect(sc.bg,     `${status}.bg is empty`).toBeTruthy()
      expect(sc.text,   `${status}.text is empty`).toBeTruthy()
      expect(sc.border, `${status}.border is empty`).toBeTruthy()
      expect(sc.label,  `${status}.label is empty`).toBeTruthy()
    }
  })

  it('all labels are non-empty strings', () => {
    for (const status of ALL_STATUSES) {
      expect(typeof statusColors[status].label).toBe('string')
      expect(statusColors[status].label.length).toBeGreaterThan(0)
    }
  })

  it('has exactly 6 entries — one per status', () => {
    expect(Object.keys(statusColors)).toHaveLength(6)
  })

  it('confirmed uses a green text color', () => {
    expect(statusColors.confirmed.text).toBe('#4ade80')
  })

  it('cancelled uses a muted text color', () => {
    expect(statusColors.cancelled.text).toBe('#6b7280')
  })

  it('open and matching have distinct visual styles', () => {
    expect(statusColors.open.text).not.toBe(statusColors.matching.text)
  })
})

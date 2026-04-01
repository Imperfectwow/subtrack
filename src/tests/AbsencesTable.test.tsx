import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AbsencesTable from '@/components/dashboard/AbsencesTable'
import type { Absence } from '@/lib/types'

const makeAbsence = (overrides: Partial<Absence> = {}): Absence => ({
  id:              overrides.id ?? '1',
  municipality_id: 'm1',
  school_id:       's1',
  teacher_name:    overrides.teacher_name ?? 'דני לוי',
  subject:         overrides.subject ?? 'מתמטיקה',
  grade:           overrides.grade ?? 'ה',
  absence_date:    '2026-04-01',
  start_time:      '08:00',
  status:          overrides.status ?? 'open',
  reported_via:    'app',
  created_at:      '2026-04-01T08:00:00Z',
  updated_at:      '2026-04-01T08:00:00Z',
  school:          { id: 's1', municipality_id: 'm1', name: 'יסודי הרצל', is_active: true, created_at: '', updated_at: '' },
  ...overrides,
})

const ABSENCES: Absence[] = [
  makeAbsence({ id: '1', status: 'open',      teacher_name: 'מורה פתוח' }),
  makeAbsence({ id: '2', status: 'matching',  teacher_name: 'מורה בהתאמה' }),
  makeAbsence({ id: '3', status: 'pending',   teacher_name: 'מורה ממתין' }),
  makeAbsence({ id: '4', status: 'confirmed', teacher_name: 'מורה מאושר' }),
  makeAbsence({ id: '5', status: 'cancelled', teacher_name: 'מורה בוטל' }),
]

describe('AbsencesTable — filter logic', () => {
  it('renders all rows by default (filter = all)', () => {
    render(<AbsencesTable absences={ABSENCES} />)
    expect(screen.getByText('מורה פתוח')).toBeInTheDocument()
    expect(screen.getByText('מורה בהתאמה')).toBeInTheDocument()
    expect(screen.getByText('מורה ממתין')).toBeInTheDocument()
    expect(screen.getByText('מורה מאושר')).toBeInTheDocument()
    expect(screen.getByText('מורה בוטל')).toBeInTheDocument()
  })

  it('filters to open + matching rows when open tab is clicked', async () => {
    const user = userEvent.setup()
    render(<AbsencesTable absences={ABSENCES} />)
    await user.click(screen.getByRole('button', { name: /פתוח/i }))
    expect(screen.getByText('מורה פתוח')).toBeInTheDocument()
    expect(screen.getByText('מורה בהתאמה')).toBeInTheDocument()
    expect(screen.queryByText('מורה ממתין')).not.toBeInTheDocument()
    expect(screen.queryByText('מורה מאושר')).not.toBeInTheDocument()
  })

  it('filters to pending rows only when pending tab is clicked', async () => {
    const user = userEvent.setup()
    render(<AbsencesTable absences={ABSENCES} />)
    await user.click(screen.getByRole('button', { name: /ממתין/i }))
    expect(screen.getByText('מורה ממתין')).toBeInTheDocument()
    expect(screen.queryByText('מורה פתוח')).not.toBeInTheDocument()
    expect(screen.queryByText('מורה מאושר')).not.toBeInTheDocument()
  })

  it('filters to confirmed rows only when confirmed tab is clicked', async () => {
    const user = userEvent.setup()
    render(<AbsencesTable absences={ABSENCES} />)
    await user.click(screen.getByRole('button', { name: /מאושר/i }))
    expect(screen.getByText('מורה מאושר')).toBeInTheDocument()
    expect(screen.queryByText('מורה פתוח')).not.toBeInTheDocument()
    expect(screen.queryByText('מורה ממתין')).not.toBeInTheDocument()
  })

  it('shows empty state when no rows match the active filter', async () => {
    const user = userEvent.setup()
    render(<AbsencesTable absences={[makeAbsence({ status: 'open' })]} />)
    await user.click(screen.getByRole('button', { name: /מאושר/i }))
    expect(screen.getByText(/אין היעדרויות בסטטוס/)).toBeInTheDocument()
  })

  it('shows empty state text when absences array is empty', () => {
    render(<AbsencesTable absences={[]} />)
    expect(screen.getByText(/אין היעדרויות כרגע/)).toBeInTheDocument()
  })
})

describe('AbsencesTable — tab counts', () => {
  it('all tab shows total count', () => {
    render(<AbsencesTable absences={ABSENCES} />)
    const allBtn = screen.getByRole('button', { name: /הכל/ })
    expect(allBtn).toHaveTextContent('5')
  })

  it('open tab counts open + matching combined', () => {
    render(<AbsencesTable absences={ABSENCES} />)
    const openBtn = screen.getByRole('button', { name: /פתוח/ })
    expect(openBtn).toHaveTextContent('2')
  })

  it('pending tab counts only pending', () => {
    render(<AbsencesTable absences={ABSENCES} />)
    const pendingBtn = screen.getByRole('button', { name: /ממתין/ })
    expect(pendingBtn).toHaveTextContent('1')
  })
})

describe('AbsencesTable — row interaction', () => {
  it('calls onRowClick with the correct absence when a row is clicked', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(<AbsencesTable absences={[makeAbsence({ id: 'abc', teacher_name: 'מורה בדיקה' })]} onRowClick={onRowClick} />)
    await user.click(screen.getByText('מורה בדיקה'))
    expect(onRowClick).toHaveBeenCalledOnce()
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'abc' }))
  })

  it('renders add button when onAddClick is provided', () => {
    render(<AbsencesTable absences={[]} onAddClick={vi.fn()} />)
    expect(screen.getByRole('button', { name: /הוסף היעדרות/ })).toBeInTheDocument()
  })

  it('does not render add button when onAddClick is not provided', () => {
    render(<AbsencesTable absences={[]} />)
    expect(screen.queryByRole('button', { name: /הוסף היעדרות/ })).not.toBeInTheDocument()
  })
})

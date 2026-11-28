import { describe, expect, it } from 'vitest'
import {
  addMonths,
  buildMonthGrid,
  formatFullDate,
  formatMonthYear,
  isSameDay,
  parseDateKey,
  startOfDay,
  toDateKey,
  weekdayLabels,
} from './calendar'

/**
 * The reports range picker and the sales chart both lean on these helpers, and
 * a one-day slip moves a whole month of numbers. The cases below are the edges
 * a calendar actually hits: a month that starts on the last weekday, a leap
 * February, and a 31st that has no twin in the next month.
 */

describe('startOfDay', () => {
  it('drops the time but keeps the same calendar day', () => {
    const date = startOfDay(new Date(2026, 10, 28, 23, 59, 59, 999))
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 10, 28])
    expect([date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()]).toEqual([0, 0, 0, 0])
  })
})

describe('isSameDay', () => {
  it('ignores the time of day', () => {
    expect(isSameDay(new Date(2026, 0, 1, 0, 1), new Date(2026, 0, 1, 23, 59))).toBe(true)
  })

  it('separates neighbouring days, months and years', () => {
    expect(isSameDay(new Date(2026, 0, 1), new Date(2026, 0, 2))).toBe(false)
    expect(isSameDay(new Date(2026, 0, 31), new Date(2026, 1, 1))).toBe(false)
    expect(isSameDay(new Date(2026, 11, 31), new Date(2027, 0, 1))).toBe(false)
  })
})

describe('addMonths', () => {
  it('lands on the first of the target month', () => {
    const next = addMonths(new Date(2026, 0, 31), 1)
    expect(toDateKey(next)).toBe('2026-02-01')
  })

  it('crosses the year in both directions', () => {
    expect(toDateKey(addMonths(new Date(2026, 11, 15), 1))).toBe('2027-01-01')
    expect(toDateKey(addMonths(new Date(2026, 0, 15), -1))).toBe('2025-12-01')
    expect(toDateKey(addMonths(new Date(2026, 5, 10), -18))).toBe('2024-12-01')
  })
})

describe('buildMonthGrid', () => {
  it('always returns six full weeks', () => {
    expect(buildMonthGrid(2026, 10, 0)).toHaveLength(42)
  })

  it('starts on the requested weekday and pads with the previous month', () => {
    // 1 November 2026 is a Sunday.
    const sundayFirst = buildMonthGrid(2026, 10, 0)
    expect(toDateKey(sundayFirst[0])).toBe('2026-11-01')

    const mondayFirst = buildMonthGrid(2026, 10, 1)
    expect(toDateKey(mondayFirst[0])).toBe('2026-10-26')
    expect(toDateKey(mondayFirst[6])).toBe('2026-11-01')
  })

  it('covers every day of the month exactly once', () => {
    const grid = buildMonthGrid(2026, 1, 0).map(toDateKey)
    const february = grid.filter((key) => key.startsWith('2026-02'))
    expect(february).toHaveLength(28)
    expect(new Set(february).size).toBe(28)
    expect(february[0]).toBe('2026-02-01')
    expect(february[february.length - 1]).toBe('2026-02-28')
  })

  it('keeps 29 February in a leap year', () => {
    const february = buildMonthGrid(2028, 1, 0)
      .map(toDateKey)
      .filter((key) => key.startsWith('2028-02'))
    expect(february).toHaveLength(29)
    expect(february[february.length - 1]).toBe('2028-02-29')
  })

  it('pads December into the next year', () => {
    const grid = buildMonthGrid(2026, 11, 0).map(toDateKey)
    expect(grid[grid.length - 1]).toBe('2027-01-09')
  })
})

describe('toDateKey and parseDateKey', () => {
  it('round-trips a date without a timezone shift', () => {
    const date = new Date(2026, 10, 28)
    expect(toDateKey(date)).toBe('2026-11-28')
    const parsed = parseDateKey('2026-11-28')
    expect(parsed).not.toBeNull()
    expect(isSameDay(parsed as Date, date)).toBe(true)
  })

  it('zero-pads single digit months and days', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('rejects anything that is not a real calendar day', () => {
    expect(parseDateKey('2026-02-30')).toBeNull()
    expect(parseDateKey('2026-13-01')).toBeNull()
    expect(parseDateKey('2026-00-10')).toBeNull()
    expect(parseDateKey('2026-11-31')).toBeNull()
    expect(parseDateKey('28-11-2026')).toBeNull()
    expect(parseDateKey('2026-1-5')).toBeNull()
    expect(parseDateKey('')).toBeNull()
  })

  it('accepts 29 February only in a leap year', () => {
    expect(parseDateKey('2028-02-29')).not.toBeNull()
    expect(parseDateKey('2026-02-29')).toBeNull()
  })
})

describe('weekdayLabels', () => {
  it('starts the week on the requested day and names all seven', () => {
    const sunday = weekdayLabels('en-US', 0)
    expect(sunday).toHaveLength(7)
    expect(sunday[0]).toBe('Sun')
    expect(sunday[6]).toBe('Sat')

    const saturday = weekdayLabels('en-US', 6)
    expect(saturday[0]).toBe('Sat')
    expect(saturday[1]).toBe('Sun')
  })

  it('follows the locale', () => {
    expect(weekdayLabels('ar-EG', 6)[0]).not.toBe('Sat')
  })
})

describe('formatting', () => {
  it('writes the full date and the month in the requested locale', () => {
    const date = new Date(2026, 10, 28)
    expect(formatFullDate(date, 'en-GB')).toContain('2026')
    expect(formatFullDate(date, 'en-GB')).toContain('November')
    expect(formatMonthYear(date, 'en-GB')).toBe('November 2026')
  })
})

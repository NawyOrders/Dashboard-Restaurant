import { describe, expect, it } from 'vitest'
import type { BranchDetails, BranchWorkingHour, DayOfWeekName } from '../api/branches'
import { DAYS_OF_WEEK } from '../api/branches'
import { translations } from '../i18n'
import { branchPresence, pickStatusBranch } from './branchHours'
import { describePresence } from './usePresence'

const TZ = 'Africa/Cairo'

function hours(map: Partial<Record<DayOfWeekName, [string, string, boolean?]>>): BranchWorkingHour[] {
  return DAYS_OF_WEEK.map((dayOfWeek) => {
    const entry = map[dayOfWeek]
    return entry
      ? { dayOfWeek, isClosed: false, openTime: entry[0], closeTime: entry[1], closesNextDay: Boolean(entry[2]) }
      : { dayOfWeek, isClosed: true, openTime: null, closeTime: null, closesNextDay: false }
  })
}

function branch(over: Partial<BranchDetails>): BranchDetails {
  return {
    id: 'b1', nameAr: 'فرع', nameEn: 'Branch', address: 'x', latitude: null, longitude: null, phone: null,
    status: 'Open', isActive: true, isPrimary: false, sortOrder: 0, workingHours: [], ...over,
  } as BranchDetails
}

// 2026-11-28 is a Saturday. Cairo is UTC+2 in November.
const at = (iso: string) => new Date(iso)

describe('branchPresence', () => {
  const daily = branch({ workingHours: hours(Object.fromEntries(DAYS_OF_WEEK.map((d) => [d, ['10:00:00', '23:59:00']]))) })

  it('is open inside the window and closed outside it', () => {
    expect(branchPresence(daily, at('2026-11-28T13:00:00Z'), TZ).kind).toBe('open') // 15:00 Cairo
    const closed = branchPresence(daily, at('2026-11-28T05:00:00Z'), TZ) // 07:00 Cairo
    expect(closed).toMatchObject({ kind: 'closed', reopens: { daysAhead: 0, minutes: 600 } })
  })

  it('reads the clock in the restaurant time zone, not the device', () => {
    // 21:30 UTC is 23:30 in Cairo (open) but 21:30 elsewhere is irrelevant.
    expect(branchPresence(daily, at('2026-11-28T21:30:00Z'), TZ).kind).toBe('open')
    expect(branchPresence(daily, at('2026-11-28T22:30:00Z'), TZ).kind).toBe('closed') // 00:30 Cairo, before 10:00
  })

  it('keeps an overnight window open after midnight', () => {
    const night = branch({ workingHours: hours({ Friday: ['18:00:00', '02:00:00', true] }) })
    // Saturday 01:00 Cairo belongs to Friday's window.
    expect(branchPresence(night, at('2026-11-27T23:00:00Z'), TZ).kind).toBe('open')
    expect(branchPresence(night, at('2026-11-28T01:00:00Z'), TZ).kind).toBe('closed') // 03:00
  })

  it('reports the next opening day when today is closed', () => {
    const sundayOnly = branch({ workingHours: hours({ Sunday: ['09:00:00', '17:00:00'] }) })
    expect(branchPresence(sundayOnly, at('2026-11-28T10:00:00Z'), TZ)).toMatchObject({
      kind: 'closed',
      reopens: { daysAhead: 1, minutes: 540, dayIndex: 0 },
    })
  })

  it('is closed all day when the branch is temporarily closed', () => {
    const paused = { ...daily, status: 'TemporarilyClosed' as const }
    expect(branchPresence(paused, at('2026-11-28T13:00:00Z'), TZ)).toEqual({ kind: 'closed', reopens: null })
  })

  it('has no opinion without a schedule or a time zone', () => {
    expect(branchPresence(branch({}), at('2026-11-28T13:00:00Z'), TZ).kind).toBe('unknown')
    expect(branchPresence(daily, at('2026-11-28T13:00:00Z'), null).kind).toBe('unknown')
    expect(branchPresence(null, at('2026-11-28T13:00:00Z'), TZ).kind).toBe('unknown')
  })
})

describe('pickStatusBranch', () => {
  it('prefers the primary active branch, then any active one', () => {
    const a = branch({ id: 'a' })
    const b = branch({ id: 'b', isPrimary: true })
    const c = branch({ id: 'c', isActive: false, isPrimary: true })
    expect(pickStatusBranch([a, c, b])?.id).toBe('b')
    expect(pickStatusBranch([a, c])?.id).toBe('a')
    expect(pickStatusBranch([c])).toBeNull()
  })
})

describe('describePresence', () => {
  const t = translations.ar
  it('open + live socket is green, open + dead socket is amber', () => {
    expect(describePresence({ kind: 'open' }, 'live', t, 'ar')).toEqual({ tone: 'live', label: t.notifications.presenceOpenLive })
    expect(describePresence({ kind: 'open' }, 'offline', t, 'ar').tone).toBe('warn')
    expect(describePresence({ kind: 'open' }, 'reconnecting', t, 'ar').tone).toBe('warn')
  })
  it('closed stays grey even with a live socket, and says when it reopens', () => {
    const result = describePresence({ kind: 'closed', reopens: { daysAhead: 1, minutes: 600, dayIndex: 0 } }, 'live', t, 'ar')
    expect(result.tone).toBe('off')
    expect(result.label).toContain(t.notifications.presenceTomorrow)
  })
  it('falls back to the connection state with no schedule', () => {
    expect(describePresence({ kind: 'unknown' }, 'live', t, 'ar').label).toBe(t.notifications.live)
    expect(describePresence({ kind: 'unknown' }, 'offline', t, 'ar').label).toBe(t.notifications.offline)
  })
})

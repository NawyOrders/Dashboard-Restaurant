import type { BranchDetails, BranchWorkingHour, DayOfWeekName } from '../api/branches'
import { DAYS_OF_WEEK } from '../api/branches'

/**
 * Open / closed from the branch schedule the API already returns. There is no
 * "open now" field on the admin side, so the clock is read here, in the
 * restaurant's own time zone (the notifications feed carries it).
 */

const MINUTES_PER_DAY = 24 * 60

export type LocalClock = { dayIndex: number; minutes: number }

export function localClock(now: Date, timeZone: string): LocalClock | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now)
    const weekday = parts.find((part) => part.type === 'weekday')?.value as DayOfWeekName | undefined
    const hour = Number(parts.find((part) => part.type === 'hour')?.value)
    const minute = Number(parts.find((part) => part.type === 'minute')?.value)
    const dayIndex = weekday ? DAYS_OF_WEEK.indexOf(weekday) : -1
    if (dayIndex < 0 || !Number.isFinite(hour) || !Number.isFinite(minute)) return null
    return { dayIndex, minutes: hour * 60 + minute }
  } catch {
    return null
  }
}

export function toMinutes(time: string | null): number | null {
  if (!time) return null
  const match = /^(\d{1,2}):(\d{2})/.exec(time)
  if (!match) return null
  const value = Number(match[1]) * 60 + Number(match[2])
  return value >= 0 && value <= MINUTES_PER_DAY ? value : null
}

type Window = { start: number; end: number }

/** The window a day opens, in minutes from that day's midnight; end may pass 24h. */
function windowOf(hour: BranchWorkingHour | undefined): Window | null {
  if (!hour || hour.isClosed) return null
  const start = toMinutes(hour.openTime)
  const close = toMinutes(hour.closeTime)
  if (start === null || close === null) return null
  const overnight = hour.closesNextDay || close <= start
  return { start, end: overnight ? close + MINUTES_PER_DAY : close }
}

function hoursFor(branch: BranchDetails, dayIndex: number) {
  const day = DAYS_OF_WEEK[((dayIndex % 7) + 7) % 7]
  return branch.workingHours.find((hour) => hour.dayOfWeek === day)
}

export function hasSchedule(branch: BranchDetails): boolean {
  return branch.workingHours.some((hour) => windowOf(hour) !== null)
}

export function isWithinHours(branch: BranchDetails, clock: LocalClock): boolean {
  const today = windowOf(hoursFor(branch, clock.dayIndex))
  if (today && clock.minutes >= today.start && clock.minutes < today.end) return true
  const yesterday = windowOf(hoursFor(branch, clock.dayIndex - 1))
  return Boolean(yesterday && yesterday.end > MINUTES_PER_DAY && clock.minutes + MINUTES_PER_DAY < yesterday.end)
}

/** Next opening within a week as { daysAhead, minutes }, or null. */
export function nextOpening(branch: BranchDetails, clock: LocalClock): { daysAhead: number; minutes: number; dayIndex: number } | null {
  for (let ahead = 0; ahead <= 7; ahead += 1) {
    const window = windowOf(hoursFor(branch, clock.dayIndex + ahead))
    if (!window) continue
    if (ahead === 0 && window.start <= clock.minutes) continue
    return { daysAhead: ahead, minutes: window.start % MINUTES_PER_DAY, dayIndex: (((clock.dayIndex + ahead) % 7) + 7) % 7 }
  }
  return null
}

/**
 * The branch that drives the dot. A branch-scoped staff member only receives
 * their own branches from the API, so the primary active one, else the first
 * active one, is the right pick for both cases.
 */
export function pickStatusBranch(branches: BranchDetails[]): BranchDetails | null {
  const active = branches.filter((branch) => branch.isActive)
  return active.find((branch) => branch.isPrimary) ?? active[0] ?? null
}

export type BranchPresence =
  | { kind: 'unknown' }
  | { kind: 'open' }
  | { kind: 'closed'; reopens: { daysAhead: number; minutes: number; dayIndex: number } | null }

export function branchPresence(branch: BranchDetails | null, now: Date, timeZone: string | null): BranchPresence {
  if (!branch || !timeZone || !hasSchedule(branch)) return { kind: 'unknown' }
  const clock = localClock(now, timeZone)
  if (!clock) return { kind: 'unknown' }
  if (branch.status === 'Open' && isWithinHours(branch, clock)) return { kind: 'open' }
  return { kind: 'closed', reopens: branch.status === 'Open' ? nextOpening(branch, clock) : null }
}

import { useEffect, useMemo, useState } from 'react'
import type { Api } from '../api'
import type { BranchDetails } from '../api/branches'
import type { Lang, T } from '../i18n'
import { branchPresence, pickStatusBranch, type BranchPresence } from './branchHours'
import type { NotificationsStatus } from './useNotifications'

export type PresenceTone = 'live' | 'warn' | 'off'
export type Presence = { tone: PresenceTone; label: string }

const TICK_MS = 60_000
const REFRESH_MS = 10 * 60_000

type BranchSource = Pick<Api, 'listBranches'>

/** The branch list the dot is computed from; refreshed so schedule edits show up. */
export function useStatusBranch(api: BranchSource | null, enabled: boolean): BranchDetails | null {
  const [branch, setBranch] = useState<BranchDetails | null>(null)
  useEffect(() => {
    if (!api || !enabled) {
      setBranch(null)
      return
    }
    let cancelled = false
    const load = () => {
      api
        .listBranches({ pageSize: 100 })
        .then((result) => {
          if (!cancelled) setBranch(pickStatusBranch(result.items))
        })
        .catch(() => {
          // No schedule: the dot falls back to the live connection state.
        })
    }
    load()
    const timer = window.setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [api, enabled])
  return branch
}

function formatTime(minutes: number, lang: Lang): string {
  const date = new Date(Date.UTC(2024, 0, 7, Math.floor(minutes / 60), minutes % 60))
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit', hour12: true }).format(date)
}

function formatWeekday(dayIndex: number, lang: Lang): string {
  const date = new Date(Date.UTC(2024, 0, 7 + dayIndex))
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { timeZone: 'UTC', weekday: 'long' }).format(date)
}

/**
 * Pure mapping used by the hook and the tests. The sidebar open/closed switch
 * is untouched and does not feed the dot: status comes from the schedule.
 */
export function describePresence(
  presence: BranchPresence,
  socket: NotificationsStatus,
  t: T,
  lang: Lang,
): Presence {
  const labels = t.notifications
  const closed = () => ({ tone: 'off' as const, label: labels.presenceClosed })
  if (presence.kind === 'closed') {
    const next = presence.reopens
    if (!next) return closed()
    const time = formatTime(next.minutes, lang)
    const when = next.daysAhead === 0 ? time : next.daysAhead === 1 ? `${labels.presenceTomorrow} ${time}` : `${formatWeekday(next.dayIndex, lang)} ${time}`
    return { tone: 'off', label: labels.presenceClosedUntil(when) }
  }
  if (presence.kind === 'open') {
    return socket === 'live'
      ? { tone: 'live', label: labels.presenceOpenLive }
      : { tone: 'warn', label: labels.presenceOpenDown }
  }
  // No usable schedule: say what the connection says, as before.
  if (socket === 'live') return { tone: 'live', label: labels.live }
  if (socket === 'reconnecting') return { tone: 'warn', label: labels.reconnecting }
  return { tone: 'off', label: labels.offline }
}

export function usePresence(args: {
  branch: BranchDetails | null
  timeZoneId: string | null
  socket: NotificationsStatus
  t: T
  lang: Lang
}): Presence {
  const { branch, timeZoneId, socket, t, lang } = args
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setNow(new Date())
    const timer = window.setInterval(tick, TICK_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  const presence = useMemo(() => branchPresence(branch, now, timeZoneId), [branch, now, timeZoneId])
  return describePresence(presence, socket, t, lang)
}

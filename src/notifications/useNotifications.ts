import { useCallback, useEffect, useRef, useState } from 'react'
import type { Api } from '../api/Api'
import type { NotificationItem } from '../api/notifications'
import {
  createOrdersHub,
  type OrderAlertResolvedPayload,
  type OrderPaymentProofPayload,
  type OrderPlacedNotificationPayload,
  type OrdersHubConfig,
} from '../realtime/ordersHub'
import { chimeKindFor, playChime } from './chime'
import {
  appendNotifications,
  emptyNotifications,
  hydrateNotifications,
  itemFromLiveEvent,
  markAllNotificationsRead as markAllReadIn,
  markNotificationRead as markReadIn,
  receiveNotifications,
  resolveOrderAlert,
  type NotificationState,
} from './model'

export type NotificationsStatus = 'offline' | 'live' | 'reconnecting'

export type NotificationsApi = Pick<Api, 'listNotifications' | 'markNotificationRead' | 'markAllNotificationsRead'>

export type UseNotificationsOptions = {
  /** Null in mock mode: no inbox, and the bell stays at zero. */
  api: NotificationsApi | null
  /** Hub settings for the live events; null keeps the REST inbox only. */
  hub: OrdersHubConfig | null
  muted: boolean
  /** Called for a live alert that is worth a toast and, unless muted, a chime. */
  onAlert?: (item: NotificationItem) => void
  /** Another terminal accepted or rejected the order: silence its alert. */
  onResolved?: (orderId: string) => void
}

export type UseNotificationsResult = {
  state: NotificationState
  status: NotificationsStatus
  /** Restaurant time zone from the feed; null until the first page loads. */
  timeZoneId: string | null
  loading: boolean
  markRead: (notificationId: string) => void
  markAllRead: () => void
  loadMore: () => void
}

const PAGE_SIZE = 20
const CATCH_UP_SIZE = 50

/**
 * The six steps of the reference lifecycle: hydrate from REST, connect the hub,
 * deduplicate live events, catch up after a reconnect, honour the resolution
 * signal from sibling terminals, and read optimistically. The rules themselves
 * live in model.ts so they can be tested without a browser.
 */
export function useNotifications({ api, hub, muted, onAlert, onResolved }: UseNotificationsOptions): UseNotificationsResult {
  const [state, setState] = useState<NotificationState>(emptyNotifications)
  const [status, setStatus] = useState<NotificationsStatus>('offline')
  const [loading, setLoading] = useState(false)
  const [timeZoneId, setTimeZoneId] = useState<string | null>(null)
  const stateRef = useRef(state)
  const mutedRef = useRef(muted)
  const alertRef = useRef(onAlert)
  const resolvedRef = useRef(onResolved)

  stateRef.current = state
  mutedRef.current = muted
  alertRef.current = onAlert
  resolvedRef.current = onResolved

  const announce = useCallback((added: NotificationItem[]) => {
    if (!added.length) return
    if (!mutedRef.current) playChime(chimeKindFor(added[0].type))
    alertRef.current?.(added[0])
  }, [])

  const apply = useCallback(
    (incoming: NotificationItem[]) => {
      const { state: next, added } = receiveNotifications(stateRef.current, incoming)
      if (added.length) {
        stateRef.current = next
        setState(next)
        announce(added)
      }
    },
    [announce],
  )

  // Step 1: the first page, and the watermark the catch-up will use.
  useEffect(() => {
    if (!api) {
      setState(emptyNotifications())
      return
    }
    let cancelled = false
    setLoading(true)
    api
      .listNotifications({ pageSize: PAGE_SIZE })
      .then((feed) => {
        if (cancelled) return
        const next = hydrateNotifications(feed)
        stateRef.current = next
        setState(next)
        setTimeZoneId(feed.timeZoneId ?? null)
      })
      .catch(() => {
        // An unreachable inbox leaves the bell empty; the hub may still deliver.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [api])

  // Steps 2 to 5: the hub, its reconnect catch-up, and the resolution signal.
  useEffect(() => {
    if (!api || !hub) {
      setStatus('offline')
      return
    }
    // A session refresh rebuilds the hub config, so this effect can run twice.
    // Anything the replaced connection reports afterwards is stale and must not
    // overwrite the status of the live one.
    let cancelled = false
    const connection = createOrdersHub(
      hub.baseUrl,
      hub.getAccessToken,
      (payload: OrderPlacedNotificationPayload) => {
        const item = itemFromLiveEvent(payload, 'OrderPlaced')
        if (item) apply([item])
      },
      {
        onPaymentProof: (payload: OrderPaymentProofPayload) => {
          const item = itemFromLiveEvent(payload, 'PaymentProofSubmitted')
          if (item) apply([item])
        },
        onAlertResolved: (payload: OrderAlertResolvedPayload) => {
          if (!payload?.orderId) return
          setState((current) => {
            const next = resolveOrderAlert(current, payload.orderId)
            stateRef.current = next
            return next
          })
          resolvedRef.current?.(payload.orderId)
        },
        onStateChange: (next) => {
          if (!cancelled) setStatus(next)
        },
        onReconnected: () => {
          if (cancelled) return
          const since = stateRef.current.lastSeenUtc
          api
            .listNotifications({ sinceUtc: since ?? undefined, pageSize: CATCH_UP_SIZE })
            .then((feed) => {
              if (feed.items.length) apply(feed.items)
            })
            .catch(() => {
              // The next reconnect tries again.
            })
        },
      },
    )
    setStatus('reconnecting')
    // A cold start can lose the first handshake (a token refresh mid-flight, a
    // flaky network). Retry a few times before giving up, so the dot only says
    // offline when the browser really cannot reach the hub.
    const retryDelays = [0, 3000, 8000, 20000]
    void (async () => {
      for (const delay of retryDelays) {
        if (cancelled) return
        if (delay) {
          setStatus('reconnecting')
          await new Promise((resolve) => setTimeout(resolve, delay))
          if (cancelled) return
        }
        try {
          await connection.start()
          if (!cancelled) setStatus('live')
          return
        } catch {
          // Fall through to the next attempt.
        }
      }
      if (!cancelled) setStatus('offline')
    })()
    return () => {
      cancelled = true
      void connection.stop()
    }
  }, [api, hub, apply])

  // Step 6: read optimistically, then tell the server.
  const markRead = useCallback(
    (notificationId: string) => {
      setState((current) => {
        const next = markReadIn(current, notificationId)
        stateRef.current = next
        return next
      })
      void api?.markNotificationRead(notificationId).catch(() => {
        // A failed read receipt only means the badge comes back on the next hydrate.
      })
    },
    [api],
  )

  const markAllRead = useCallback(() => {
    setState((current) => {
      const next = markAllReadIn(current)
      stateRef.current = next
      return next
    })
    void api?.markAllNotificationsRead().catch(() => {})
  }, [api])

  const loadMore = useCallback(() => {
    const cursor = stateRef.current.nextCursor
    if (!api || !cursor || loading) return
    setLoading(true)
    api
      .listNotifications({ cursor, pageSize: PAGE_SIZE })
      .then((feed) => {
        setState((current) => {
          const next = appendNotifications(current, feed)
          stateRef.current = next
          return next
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [api, loading])

  return { state, status, timeZoneId, loading, markRead, markAllRead, loadMore }
}

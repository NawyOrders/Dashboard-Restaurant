import type { NotificationFeed, NotificationItem, NotificationType } from '../api/notifications'
import { parseNotificationItem } from '../api/notifications'

/**
 * The inbox as the screens see it. Pure functions only: the hook that talks to
 * the API and the hub feeds these, and the tests drive them directly, so the
 * deduplication and catch-up rules are verifiable without a network.
 */
export type NotificationState = {
  items: NotificationItem[]
  unreadCount: number
  nextCursor: string | null
  hasMore: boolean
  /** Every eventId already in the list; the hub can deliver one twice. */
  seenEventIds: Set<string>
  /** Newest createdAtUtc known, the watermark for the reconnect catch-up. */
  lastSeenUtc: string | null
}

export function emptyNotifications(): NotificationState {
  return { items: [], unreadCount: 0, nextCursor: null, hasMore: false, seenEventIds: new Set(), lastSeenUtc: null }
}

function newestFirst(a: NotificationItem, b: NotificationItem): number {
  if (a.createdAtUtc === b.createdAtUtc) return b.notificationId.localeCompare(a.notificationId)
  return a.createdAtUtc < b.createdAtUtc ? 1 : -1
}

/** Step 1 of the reference lifecycle: the first page replaces everything. */
export function hydrateNotifications(feed: NotificationFeed): NotificationState {
  const items = [...feed.items].sort(newestFirst)
  return {
    items,
    unreadCount: feed.unreadCount,
    nextCursor: feed.nextCursor,
    hasMore: feed.hasMore,
    seenEventIds: new Set(items.map((item) => item.eventId)),
    lastSeenUtc: items[0]?.createdAtUtc ?? null,
  }
}

/** Older page appended to the end; the badge stays what the server said. */
export function appendNotifications(state: NotificationState, feed: NotificationFeed): NotificationState {
  const seen = new Set(state.seenEventIds)
  // Add while filtering: one page can carry the same event twice.
  const added = feed.items.filter((item) => {
    if (seen.has(item.eventId)) return false
    seen.add(item.eventId)
    return true
  })
  const items = [...state.items, ...added].sort(newestFirst)
  return {
    items,
    unreadCount: feed.unreadCount,
    nextCursor: feed.nextCursor,
    hasMore: feed.hasMore,
    seenEventIds: seen,
    lastSeenUtc: items[0]?.createdAtUtc ?? state.lastSeenUtc,
  }
}

/**
 * Steps 3 and 4: a live event or a catch-up page. Returns the same state when
 * the event was already known, so a reconnect that replays the same order does
 * not raise the badge twice.
 */
export function receiveNotifications(
  state: NotificationState,
  incoming: NotificationItem[],
): { state: NotificationState; added: NotificationItem[] } {
  const seen = new Set(state.seenEventIds)
  const added = incoming.filter((item) => {
    if (seen.has(item.eventId)) return false
    seen.add(item.eventId)
    return true
  })
  if (!added.length) return { state, added }
  const items = [...added, ...state.items].sort(newestFirst)
  return {
    state: {
      items,
      unreadCount: state.unreadCount + added.filter((item) => !item.isRead).length,
      nextCursor: state.nextCursor,
      hasMore: state.hasMore,
      seenEventIds: seen,
      lastSeenUtc: items[0]?.createdAtUtc ?? state.lastSeenUtc,
    },
    added,
  }
}

/** Step 5: another terminal accepted or rejected the order; its alert is over. */
export function resolveOrderAlert(state: NotificationState, orderId: string): NotificationState {
  if (!orderId) return state
  return { ...state, items: state.items.map((item) => (item.orderId === orderId ? { ...item, isRead: true } : item)) }
}

/** Step 6: optimistic read, before the POST lands. */
export function markNotificationRead(state: NotificationState, notificationId: string): NotificationState {
  const target = state.items.find((item) => item.notificationId === notificationId)
  if (!target || target.isRead) return state
  return {
    ...state,
    unreadCount: Math.max(0, state.unreadCount - 1),
    items: state.items.map((item) => (item.notificationId === notificationId ? { ...item, isRead: true } : item)),
  }
}

export function markAllNotificationsRead(state: NotificationState): NotificationState {
  if (state.unreadCount === 0) return state
  return { ...state, unreadCount: 0, items: state.items.map((item) => (item.isRead ? item : { ...item, isRead: true })) }
}

/** A live hub event, shaped like an inbox row so one list holds both. */
export type LiveNotificationPayload = {
  notificationId?: string
  eventId: string
  orderId: string
  orderNumber?: string
  displayOrderNumber?: string
  branchId?: string
  branchNameAr?: string
  branchNameEn?: string
  customerName?: string
  fulfilmentType?: string | number
  distinctItemsCount?: number
  itemCount?: number
  totalItemsQuantity?: number
  total?: number
  currency?: string
  paymentMethod?: string
  requiresPaymentProof?: boolean
  placedAtUtc?: string
  placedAtLocal?: string
  submittedAtUtc?: string
  submittedAtLocal?: string
}

export function itemFromLiveEvent(
  payload: LiveNotificationPayload,
  type: NotificationType,
): NotificationItem | null {
  if (!payload || typeof payload.eventId !== 'string' || !payload.eventId) return null
  if (typeof payload.orderId !== 'string' || !payload.orderId) return null
  const at = payload.placedAtUtc ?? payload.submittedAtUtc ?? new Date().toISOString()
  const atLocal = payload.placedAtLocal ?? payload.submittedAtLocal ?? ''
  // The reference sends the enum as a string; older builds sent its index.
  const fulfilment =
    typeof payload.fulfilmentType === 'number'
      ? payload.fulfilmentType === 1
        ? 'Pickup'
        : 'Delivery'
      : (payload.fulfilmentType ?? 'Delivery')
  try {
    return parseNotificationItem({
    // The hub carries the persisted inbox id; older builds send only the event.
    notificationId: payload.notificationId ?? payload.eventId,
    eventId: payload.eventId,
    type,
    isRead: false,
    readAtUtc: null,
    orderId: payload.orderId,
    orderNumber: payload.orderNumber ?? '',
    displayOrderNumber: payload.displayOrderNumber ?? '',
    branchId: payload.branchId ?? '',
    branchNameAr: payload.branchNameAr ?? '',
    branchNameEn: payload.branchNameEn ?? payload.branchNameAr ?? '',
    customerName: payload.customerName ?? '',
    fulfilmentType: fulfilment,
    distinctItemsCount: payload.distinctItemsCount ?? payload.itemCount ?? 0,
    totalItemsQuantity: payload.totalItemsQuantity ?? payload.distinctItemsCount ?? payload.itemCount ?? 0,
    total: payload.total ?? 0,
    currency: payload.currency ?? 'EGP',
    paymentMethod: payload.paymentMethod ?? '',
    requiresPaymentProof: payload.requiresPaymentProof === true,
    createdAtUtc: at,
    createdAtLocal: atLocal,
    })
  } catch {
    // A malformed event is dropped rather than shown as an empty card; the
    // inbox REST feed remains the source of truth on the next hydrate.
    return null
  }
}
